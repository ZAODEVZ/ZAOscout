#!/usr/bin/env node
// share.js - the DISTRIBUTE half: turn top picks into social-post drafts, queued
// to ~/.zaoscout/drafts.md for review. NEVER auto-posts (approval-first by design).
// BYOK key -> punchy grounded drafts; no key -> clean templates.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readWatchlist } from './reader.js';
import { triage } from './triage.js';
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
catch { console.error(`[scout] no watchlist at ${wlPath}.`); process.exit(1); }

const N = Number(process.env.SCOUT_SHARE_N || 3);
const items = await readWatchlist(wl);
const seen = loadSeen();
const picks = triage(items, seen, N);
if (!picks.length) { console.error('[scout] nothing new to draft.'); process.exit(0); }

const brain = makeBrain();
const drafts = [];
for (const p of picks) {
  let post = '';
  if (brain) { try { post = await brain.socialPost(p.title, await groundBody(p), p.url); } catch { post = ''; } }
  if (!post) post = `${p.title}\n\n${p.url}`;   // template fallback
  drafts.push(post);
}

const out = `\n=== drafts ${new Date().toISOString?.() ?? ''} ===\n` +
  drafts.map((d, i) => `\n[draft ${i + 1}]\n${d}\n`).join('');
if (process.env.DRY_RUN) { console.log(out); process.exit(0); }

const dest = process.env.SCOUT_STATE_DIR || path.join(os.homedir(), '.zaoscout');
fs.mkdirSync(dest, { recursive: true });
const file = path.join(dest, 'drafts.md');
fs.appendFileSync(file, out);
for (const p of picks) seen.add(p.source + ':' + p.id);
saveSeen(seen);
console.log(out);
console.error(`[scout] ${drafts.length} drafts queued in ${file} - review + post manually (scout never auto-posts).`);
