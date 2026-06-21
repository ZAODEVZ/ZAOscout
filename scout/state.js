// state.js - remember which item ids we've already delivered (dedup across runs).
//
// Each feed mode (watch / digest / share) gets its OWN dedup namespace. They used
// to share one seen.json, so running `digest` after `watch` (or both on cron)
// found everything already seen and silently produced an empty feed - the modes
// cannibalized each other. watch keeps the legacy "seen" file (no re-delivery on
// upgrade); digest/share get their own.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Resolved per call (not at import) so SCOUT_STATE_DIR can be set by tests/callers.
const baseDir = () => process.env.SCOUT_STATE_DIR || path.join(os.homedir(), '.zaoscout');
function fileFor(name = 'seen') {
  const safe = String(name).replace(/[^a-z0-9_-]/gi, '') || 'seen';   // no path traversal
  return path.join(baseDir(), safe === 'seen' ? 'seen.json' : `seen-${safe}.json`);
}

export function loadSeen(name) {
  try { return new Set(JSON.parse(fs.readFileSync(fileFor(name), 'utf8'))); } catch { return new Set(); }
}

export function saveSeen(set, name) {
  fs.mkdirSync(baseDir(), { recursive: true });
  // keep most-recent 5000 ids (Set preserves insertion order; newest at the end)
  fs.writeFileSync(fileFor(name), JSON.stringify([...set].slice(-5000)));
}
