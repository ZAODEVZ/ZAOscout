#!/usr/bin/env node
// digest.js - one connected brief across all fresh picks (not per-item lines).
// read watchlist -> triage/dedup -> ground bodies -> BYOK two-pass synthesis -> deliver.
// No LLM key -> falls back to a grouped link digest. Run on a slower cadence than watch.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDotenv } from './env.js';
import { readWatchlist } from './reader.js';
import { triage } from './triage.js';
import { notifyText } from './notify.js';
import { loadSeen, saveSeen } from './state.js';
import { makeBrain } from './brain.js';
import { groundBody } from './ground.js';
import { recentThemes, recordThemes, appendLog } from './memory.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
loadDotenv(path.join(dir, '..', '.env'));

const wlPath = process.env.SCOUT_WATCHLIST || path.join(dir, '..', 'watchlist.json');
let wl;
try { wl = JSON.parse(fs.readFileSync(wlPath, 'utf8')); }
catch { console.error(`[scout] no watchlist at ${wlPath}. Copy watchlist.example.json -> watchlist.json`); process.exit(1); }

const tag = (p) => p.source === 'reddit' ? `r/${p.sub}` : p.source === 'farcaster' ? `@${p.user}` : p.source;

const items = await readWatchlist(wl);
const seen = loadSeen('digest');   // own dedup namespace - does not cannibalize watch/share
const picks = triage(items, seen, Number(process.env.SCOUT_TOP || 12));
if (!picks.length) { console.error('[scout] nothing new to digest.'); process.exit(0); }

const refs = picks.map((p, i) => `[${i + 1}] (${tag(p)}) ${p.title}\n    ${p.url}`).join('\n');
let body;
const brain = makeBrain();
if (brain) {
  console.error(`[scout] synthesizing digest with ${brain.provider} (${brain.model})`);
  const grounded = [];
  for (const p of picks) { try { grounded.push({ title: p.title, body: await groundBody(p), tag: tag(p), url: p.url }); } catch { grounded.push({ title: p.title, body: '' }); } }
  const prior = recentThemes();                          // memory: what's been recurring
  if (prior.length) console.error(`[scout] continuity: ${prior.join(', ')}`);
  const brief = await brain.digest(grounded, prior);
  body = brief
    ? `**ZAOscout digest - ${picks.length} items**\n\n${brief}\n\n— sources —\n${refs}`
    : `**ZAOscout digest - ${picks.length} items**\n${refs}`;
  // memory: extract + record themes, archive the brief
  try {
    const themes = await brain.extractThemes(grounded);
    if (themes.length && !process.env.DRY_RUN) recordThemes(themes);
    if (brief && !process.env.DRY_RUN) appendLog(brief);
  } catch { /* memory is best-effort */ }
} else {
  body = `**ZAOscout digest - ${picks.length} items**\n${refs}`;
  if (!process.env.DRY_RUN) appendLog(refs);             // no key: archive the link list
}

const res = await notifyText(body);
for (const p of picks) seen.add(p.source + ':' + p.id);
if (!process.env.DRY_RUN) saveSeen(seen, 'digest');
console.error(`[scout] digest of ${picks.length} delivered via ${res.via}`);
