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

const dir = path.dirname(fileURLToPath(import.meta.url));
const wlPath = process.env.SCOUT_WATCHLIST || path.join(dir, '..', 'watchlist.json');
let wl;
try { wl = JSON.parse(fs.readFileSync(wlPath, 'utf8')); }
catch { console.error(`[scout] no watchlist at ${wlPath}. Copy watchlist.example.json -> watchlist.json`); process.exit(1); }

const items = await readWatchlist(wl);
const seen = loadSeen();
const picks = triage(items, seen, Number(process.env.SCOUT_TOP || 8));
const res = await notify(picks);
for (const p of picks) seen.add(p.source + ':' + p.id);
if (!process.env.DRY_RUN) saveSeen(seen);
console.error(`[scout] read ${items.length}, fresh-picked ${picks.length}, delivered via ${res.via}`);
