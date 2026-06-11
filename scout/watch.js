#!/usr/bin/env node
// watch.js - one scout cycle: read watchlist -> triage/dedup -> deliver to Discord.
// Run on a schedule (cron) for a standing feed. Built on the keyless fetchers.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readWatchlist } from './reader.js';
import { triage } from './triage.js';
import { notify } from './notify.js';
import { loadSeen, saveSeen } from './state.js';
import { makeBrain } from './brain.js';
import { groundBody } from './ground.js';

const dir = path.dirname(fileURLToPath(import.meta.url));

// Zero-dep .env loader: load <repo>/.env into process.env (existing env wins).
try {
  const envText = fs.readFileSync(path.join(dir, '..', '.env'), 'utf8');
  for (const line of envText.split('\n')) {
    if (/^\s*#/.test(line)) continue;                           // skip comments
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);  // trim trailing ws
    if (!m || (m[1] in process.env)) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);  // strip only balanced quotes
    process.env[m[1]] = v;
  }
} catch { /* no .env - fine, env-only or zero-config */ }

const wlPath = process.env.SCOUT_WATCHLIST || path.join(dir, '..', 'watchlist.json');
let wl;
try { wl = JSON.parse(fs.readFileSync(wlPath, 'utf8')); }
catch { console.error(`[scout] no watchlist at ${wlPath}. Copy watchlist.example.json -> watchlist.json`); process.exit(1); }

const items = await readWatchlist(wl);
const seen = loadSeen();
const picks = triage(items, seen, Number(process.env.SCOUT_TOP || 8));

// Optional BYOK synthesis: if an LLM key is configured, ground each pick in its
// real body and attach a one-line "why it matters". No key -> link-only.
const brain = makeBrain();
if (brain) {
  console.error(`[scout] grounding picks with ${brain.provider} (${brain.model})`);
  for (const p of picks) {
    try { p.why = await brain.whyItMatters(p.title, await groundBody(p)); }
    catch { p.why = ''; }   // one bad pick never sinks the cycle
  }
}

const res = await notify(picks);
for (const p of picks) seen.add(p.source + ':' + p.id);
if (!process.env.DRY_RUN) saveSeen(seen);
console.error(`[scout] read ${items.length}, fresh-picked ${picks.length}, delivered via ${res.via}`);
