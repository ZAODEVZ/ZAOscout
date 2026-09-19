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
  // Parse line-by-line and SKIP unparseable lines. A single torn/partial line
  // (crash mid-append, interleaved write) used to throw and return [] - which
  // made countToday read 0 for everyone, silently disabling all rate limits
  // (fail-open). One bad line must not nuke the whole ledger.
  let text;
  try { text = fs.readFileSync(file(), 'utf8'); } catch { return []; }
  const rows = [];
  for (const line of text.split('\n')) {
    const l = line.trim();
    if (!l) continue;
    try { rows.push(JSON.parse(l)); } catch { /* skip corrupt line */ }
  }
  return rows.slice(-limit);
}
export function leaderboard() {
  const by = {};
  for (const r of readUsage(5000)) { const k = r.who || 'anon'; (by[k] ||= { who: k, tier: r.tier, calls: 0 }).calls++; by[k].tier = r.tier; }
  return Object.values(by).sort((a, b) => b.calls - a.calls).slice(0, 50);
}
export function countToday(who) {
  const day = new Date().toISOString().slice(0, 10);
  return readUsage(5000).filter((r) => r.who === who && typeof r.ts === 'string' && r.ts.startsWith(day)).length;
}
