// state.js - remember which item ids we've already delivered (dedup across runs).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const DIR = process.env.SCOUT_STATE_DIR || path.join(os.homedir(), '.zaoscout');
const FILE = path.join(DIR, 'seen.json');
export function loadSeen() {
  try { return new Set(JSON.parse(fs.readFileSync(FILE, 'utf8'))); } catch { return new Set(); }
}
export function saveSeen(set) {
  fs.mkdirSync(DIR, { recursive: true });
  // keep most-recent 5000 ids
  fs.writeFileSync(FILE, JSON.stringify([...set].slice(-5000)));
}
