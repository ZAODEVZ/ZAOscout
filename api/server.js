#!/usr/bin/env node
// ZAOscout HTTP API - zero-dep. Keyless fetch + digest for anyone, with tiers you
// claim via Farcaster OR ZAO Respect, and every call logged to the chart.
//   GET  /fetch?url=...            keyless fetch (rate-limited by tier)
//   POST /digest {reddit,farcaster,top}   watchlist brief (sources/synthesis per tier)
//   POST /claim {fid} | {respectId}       prove social capital -> token + tier
//   GET  /me?token=...            your tier
//   GET  /chart                   usage leaderboard (HTML), /chart?json=1 for JSON
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { TIERS, tierFor } from './tiers.js';
import { logUsage, leaderboard, countToday } from './usage.js';
import { farcasterCapital, respectFor } from './identity.js';
import { isAllowedFetchUrl } from '../scout/urlguard.js';
import { verifyRequest, handleInteraction } from './discord.js';

const pexec = promisify(execFile);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BIN = path.join(ROOT, 'bin', 'scout');
const PORT = Number(process.env.PORT || 8799);
const TOK = path.join(process.env.SCOUT_STATE_DIR || path.join(os.homedir(), '.zaoscout'), 'tokens.json');

const loadTokens = () => { try { return JSON.parse(fs.readFileSync(TOK, 'utf8')); } catch { return {}; } };
const saveTokens = (t) => { fs.mkdirSync(path.dirname(TOK), { recursive: true }); fs.writeFileSync(TOK, JSON.stringify(t, null, 2)); };

function whoTier(req, url) {
  const token = url.searchParams.get('token') || (req.headers.authorization || '').replace(/^Bearer /, '');
  if (token) { const t = loadTokens()[token]; if (t) return { who: t.who, tier: TIERS[t.tier] || TIERS.anon, token }; }
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0];
  return { who: `anon:${ip}`, tier: TIERS.anon, token: null };
}
const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); res.end(JSON.stringify(obj)); };

// Cap the request body. This is a public, keyless POST API - without a cap a
// single client can stream an unbounded body and exhaust server memory (a
// trivial DoS). Legitimate /claim and /digest bodies are well under 256KB.
const MAX_BODY = Number(process.env.SCOUT_MAX_BODY || 256 * 1024);
const body = (req) => new Promise((resolve, reject) => {
  let b = '', size = 0, done = false;
  req.on('data', (d) => {
    if (done) return;                 // already over cap - drop further chunks, don't buffer
    size += d.length;
    if (size > MAX_BODY) { done = true; reject(new Error('PAYLOAD_TOO_LARGE')); return; }
    b += d;
  });
  req.on('end', () => { if (done) return; try { resolve(JSON.parse(b || '{}')); } catch { resolve({}); } });
  req.on('error', () => { if (!done) resolve({}); });
});

// Raw body string (same cap), needed where the exact bytes matter - Discord
// signs timestamp + raw body, so we must verify against the untouched string,
// not a re-serialized parse.
const rawBody = (req) => new Promise((resolve, reject) => {
  let b = '', size = 0, done = false;
  req.on('data', (d) => {
    if (done) return;
    size += d.length;
    if (size > MAX_BODY) { done = true; reject(new Error('PAYLOAD_TOO_LARGE')); return; }
    b += d;
  });
  req.on('end', () => { if (!done) resolve(b); });
  req.on('error', () => { if (!done) resolve(''); });
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;
  try {
    if (p === '/health') return json(res, 200, { ok: true });

    // Discord slash-command endpoint (/research). Signature-verified, ungated
    // (Discord has no ZAOscout token). Replies deferred, then edits in the
    // followup once the research is done. See docs/DISCORD.md.
    if (p === '/discord' && req.method === 'POST') {
      const pub = process.env.DISCORD_PUBLIC_KEY;
      if (!pub) return json(res, 503, { error: 'discord not configured (set DISCORD_PUBLIC_KEY)' });
      const raw = await rawBody(req);
      const sig = req.headers['x-signature-ed25519'];
      const ts = req.headers['x-signature-timestamp'];
      if (!verifyRequest(raw, sig, ts, pub)) { res.writeHead(401); return res.end('invalid request signature'); }
      let interaction; try { interaction = JSON.parse(raw || '{}'); } catch { interaction = {}; }
      const { response, followup } = handleInteraction(interaction, { appId: process.env.DISCORD_APP_ID });
      json(res, 200, response);
      if (followup) {
        try { await logUsage({ who: 'discord', tier: 'discord', tool: 'research', target: (interaction.data && interaction.data.options && interaction.data.options[0] && interaction.data.options[0].value) || '' }); } catch {}
        followup();   // fire-and-forget: edits the deferred message when done
      }
      return;
    }

    if (p === '/claim' && req.method === 'POST') {
      const b = await body(req);
      let capital = { fcFollowers: 0, fcScore: 0, respect: 0 }, who = 'anon';
      if (b.fid) { const fc = await farcasterCapital(b.fid); if (!fc.exists) return json(res, 400, { error: 'fid not found' }); capital.fcFollowers = fc.fcFollowers; capital.fcScore = fc.fcScore; who = `fc:${b.fid}`; }
      if (b.respectId) { capital.respect = await respectFor(b.respectId); if (capital.respect > 0) who = `respect:${b.respectId}`; }
      const tier = tierFor(capital);
      const token = crypto.randomBytes(16).toString('hex');
      const tokens = loadTokens(); tokens[token] = { who, tier: tier.name, capital, claimedAt: new Date().toISOString() }; saveTokens(tokens);
      await logUsage({ who, tier: tier.name, tool: 'claim', target: JSON.stringify(capital) });
      return json(res, 200, { token, tier: tier.name, capital, unlocks: tier });
    }

    if (p === '/me') { const { who, tier } = whoTier(req, url); return json(res, 200, { who, tier: tier.name, unlocks: tier }); }

    if (p === '/chart') {
      const board = leaderboard();
      if (url.searchParams.get('json')) return json(res, 200, { leaderboard: board });
      res.writeHead(200, { 'content-type': 'text/html' });
      return res.end(`<!doctype html><meta charset=utf8><title>ZAOscout chart</title><style>body{font:14px system-ui;background:#0a1628;color:#e0ddaa;max-width:640px;margin:40px auto;padding:0 16px}h1{color:#f5a623}td,th{padding:6px 12px;text-align:left;border-bottom:1px solid #1c2a3a}.t{color:#f5a623}</style><h1>ZAOscout - the chart</h1><table><tr><th>#</th><th>who</th><th class=t>tier</th><th>calls</th></tr>${board.map((r, i) => `<tr><td>${i + 1}</td><td>${r.who.replace(/</g, '')}</td><td class=t>${r.tier}</td><td>${r.calls}</td></tr>`).join('')}</table>`);
    }

    // --- gated tools ---
    const { who, tier } = whoTier(req, url);
    const used = countToday(who);
    if (used >= tier.ratePerDay) return json(res, 429, { error: 'daily rate limit for your tier', tier: tier.name, limit: tier.ratePerDay, hint: 'POST /claim with your fid or respectId to upgrade' });

    if (p === '/fetch') {
      const target = url.searchParams.get('url');
      if (!target) return json(res, 400, { error: 'url required' });
      // SSRF guard: only the supported platform hosts (or a bare tweet id).
      const guard = isAllowedFetchUrl(target);
      if (!guard.ok) {
        return json(res, 400, {
          error: `url not allowed: ${guard.reason}`,
          allowed: 'reddit.com, x.com, twitter.com, farcaster.xyz, warpcast.com, redd.it, or a tweet id',
        });
      }
      await logUsage({ who, tier: tier.name, tool: 'fetch', target });
      const { stdout } = await pexec(BIN, [target], { timeout: 35000, maxBuffer: 6 * 1024 * 1024 });
      return json(res, 200, { tier: tier.name, content: stdout.trim() });
    }

    if (p === '/digest' && req.method === 'POST') {
      const b = await body(req);
      const reddit = (b.reddit || []).slice(0, tier.maxSources);
      const farcaster = (b.farcaster || []).slice(0, tier.maxSources);
      await logUsage({ who, tier: tier.name, tool: 'digest', target: JSON.stringify({ reddit, farcaster }) });
      const tmp = path.join(ROOT, `.api-wl-${crypto.randomBytes(4).toString('hex')}.json`);
      fs.writeFileSync(tmp, JSON.stringify({ reddit, farcaster, x: [] }));
      const env = { ...process.env, DRY_RUN: '1', SCOUT_WATCHLIST: tmp, SCOUT_TOP: String(Math.min(b.top || 8, tier.maxSources)) };
      if (!tier.synthesis) { delete env.OPENROUTER_API_KEY; delete env.LLM_API_KEY; delete env.ANTHROPIC_API_KEY; delete env.OPENAI_API_KEY; }  // gate synthesis
      const { stdout } = await pexec('node', [path.join(ROOT, 'scout', 'digest.js')], { env, timeout: 90000, maxBuffer: 6 * 1024 * 1024 });
      try { fs.unlinkSync(tmp); } catch {}
      return json(res, 200, { tier: tier.name, synthesis: tier.synthesis, digest: stdout.replace(/^\[dry-run\]\n/, '').trim() });
    }

    return json(res, 404, { error: 'not found', routes: ['/fetch', '/digest', '/claim', '/me', '/chart', '/health'] });
  } catch (e) {
    if (e.message === 'PAYLOAD_TOO_LARGE') return json(res, 413, { error: 'request body too large', limit: MAX_BODY });
    return json(res, 500, { error: e.message });
  }
});

// Only auto-listen when run directly (node api/server.js). When imported (tests)
// the caller controls listen()/close() and the port.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) server.listen(PORT, () => console.error(`[scout-api] listening on :${PORT} - GET /fetch /chart, POST /digest /claim`));

export { server };
