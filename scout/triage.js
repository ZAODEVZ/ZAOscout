// triage.js - drop already-seen items, rank, return the top N fresh ones.
// Minimal v1: novelty (unseen) + source diversity. Engagement-aware when present.
export function triage(items, seen, topN = 8) {
  const fresh = items.filter((it) => it.id && !seen.has(it.source + ':' + it.id));
  // stable rank: higher engagement first, then keep source variety by round-robin
  fresh.sort((a, b) => (b.engagement || 0) - (a.engagement || 0));
  const bySource = {};
  for (const it of fresh) (bySource[it.source] ||= []).push(it);
  const picked = [];
  let added = true;
  while (picked.length < topN && added) {
    added = false;
    for (const s of Object.keys(bySource)) {
      if (bySource[s].length) { picked.push(bySource[s].shift()); added = true; if (picked.length >= topN) break; }
    }
  }
  return picked;
}
