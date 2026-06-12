// memory.js - give the scout continuity across runs (the gBrain/Bonfire pattern).
// Two stores under ~/.zaoscout/memory/:
//   themes.json  { "<theme>": { count, lastSeen, urls: [recent...] } }
//   log.md       append-only archive of each digest/brief
// No LLM needed for the log; themes are populated when a BYOK key is present.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function dir() {
  const base = process.env.SCOUT_STATE_DIR || path.join(os.homedir(), '.zaoscout');
  const d = path.join(base, 'memory');
  fs.mkdirSync(d, { recursive: true });
  return d;
}
const themesFile = () => path.join(dir(), 'themes.json');

export function loadThemes() {
  try { return JSON.parse(fs.readFileSync(themesFile(), 'utf8')); } catch { return {}; }
}

// Top themes seen within `days`, "theme (Nx)" - context the digest weaves in.
export function recentThemes(days = 10, n = 8, nowMs = Date.now()) {
  const cutoff = nowMs - days * 86400000;
  const t = loadThemes();
  return Object.entries(t)
    .filter(([, v]) => new Date(v.lastSeen).getTime() >= cutoff)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, n)
    .map(([k, v]) => `${k} (${v.count}x)`);
}

// Merge new themes (with the urls they came from) into the store.
export function recordThemes(pairs, nowIso = new Date().toISOString()) {
  const t = loadThemes();
  for (const { theme, url } of pairs) {
    const key = String(theme).toLowerCase().trim();
    if (!key) continue;
    const e = t[key] || { count: 0, lastSeen: nowIso, urls: [] };
    e.count += 1;
    e.lastSeen = nowIso;
    if (url && !e.urls.includes(url)) e.urls = [...e.urls, url].slice(-6);
    t[key] = e;
  }
  fs.writeFileSync(themesFile(), JSON.stringify(t, null, 2));
  return t;
}

export function appendLog(text, nowIso = new Date().toISOString()) {
  fs.appendFileSync(path.join(dir(), 'log.md'), `\n## ${nowIso}\n${text}\n`);
}
