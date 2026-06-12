import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
function file() {
  const d = process.env.SCOUT_STATE_DIR || path.join(os.homedir(), '.zaoscout');
  fs.mkdirSync(d, { recursive: true });
  return path.join(d, 'usage.jsonl');
}
export async function logUsage(rec) {
  const row = { ts: new Date().toISOString(), who: 'anon', tier: 'anon', ...rec };
  try { fs.appendFileSync(file(), JSON.stringify(row) + '\n'); } catch {}
  if (process.env.SCOUT_LOG_URL) {
    try { await fetch(process.env.SCOUT_LOG_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(row), signal: AbortSignal.timeout(8000) }); } catch {}
  }
  return row;
}
export function readUsage(limit = 1000) {
  try { return fs.readFileSync(file(), 'utf8').trim().split('\n').slice(-limit).map((l) => JSON.parse(l)); } catch { return []; }
}
export function leaderboard() {
  const by = {};
  for (const r of readUsage(5000)) { const k = r.who || 'anon'; (by[k] ||= { who: k, tier: r.tier, calls: 0 }).calls++; by[k].tier = r.tier; }
  return Object.values(by).sort((a, b) => b.calls - a.calls).slice(0, 50);
}
export function countToday(who) {
  const day = new Date().toISOString().slice(0, 10);
  return readUsage(5000).filter((r) => r.who === who && r.ts.startsWith(day)).length;
}
