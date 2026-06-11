#!/usr/bin/env node
// digest.js - one connected brief across all fresh picks (not per-item lines).
// read watchlist -> triage/dedup -> ground bodies -> BYOK two-pass synthesis -> deliver.
// No LLM key -> falls back to a grouped link digest. Run on a slower cadence than watch.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readWatchlist } from './reader.js';
import { triage } from './triage.js';
import { notifyText } from './notify.js';
import { loadSeen, saveSeen } from './state.js';
import { makeBrain } from './brain.js';
import { groundBody } from './ground.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
try {
  const envText = fs.readFileSync(path.join(dir, '..', '.env'), 'utf8');
  for (const line of envText.split('\n')) {
    if (/^\s*#/.test(line)) continue;
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || (m[1] in process.env)) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
} catch { /* no .env */ }

const wlPath = process.env.SCOUT_WATCHLIST || path.join(dir, '..', 'watchlist.json');
let wl;
try { wl = JSON.parse(fs.readFileSync(wlPath, 'utf8')); }
catch { console.error(`[scout] no watchlist at ${wlPath}. Copy watchlist.example.json -> watchlist.json`); process.exit(1); }

const tag = (p) => p.source === 'reddit' ? `r/${p.sub}` : p.source === 'farcaster' ? `@${p.user}` : p.source;

const items = await readWatchlist(wl);
const seen = loadSeen();
const picks = triage(items, seen, Number(process.env.SCOUT_TOP || 12));
if (!picks.length) { console.error('[scout] nothing new to digest.'); process.exit(0); }

const refs = picks.map((p, i) => `[${i + 1}] (${tag(p)}) ${p.title}\n    ${p.url}`).join('\n');
let body;
const brain = makeBrain();
if (brain) {
  console.error(`[scout] synthesizing digest with ${brain.provider} (${brain.model})`);
  const grounded = [];
  for (const p of picks) { try { grounded.push({ title: p.title, body: await groundBody(p), tag: tag(p), url: p.url }); } catch { grounded.push({ title: p.title, body: '' }); } }
  const brief = await brain.digest(grounded);
  body = brief
    ? `**ZAOscout digest - ${picks.length} items**\n\n${brief}\n\n— sources —\n${refs}`
    : `**ZAOscout digest - ${picks.length} items**\n${refs}`;
} else {
  body = `**ZAOscout digest - ${picks.length} items**\n${refs}`;
}

const res = await notifyText(body);
for (const p of picks) seen.add(p.source + ':' + p.id);
if (!process.env.DRY_RUN) saveSeen(seen);
console.error(`[scout] digest of ${picks.length} delivered via ${res.via}`);
