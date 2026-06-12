import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scout-mem-'));
process.env.SCOUT_STATE_DIR = tmp;
const { recordThemes, recentThemes, loadThemes } = await import('../scout/memory.js');

test('recordThemes merges + counts', () => {
  recordThemes([{ theme: 'Agents', url: 'u1' }, { theme: 'agents', url: 'u2' }], '2026-06-11T00:00:00Z');
  const t = loadThemes();
  assert.equal(t['agents'].count, 2);          // case-insensitive merge
  assert.deepEqual(t['agents'].urls, ['u1', 'u2']);
});

test('recentThemes filters by window + sorts by count', () => {
  recordThemes([{ theme: 'Skills' }], '2026-06-11T00:00:00Z');
  recordThemes([{ theme: 'Old' }], '2026-01-01T00:00:00Z');
  const now = new Date('2026-06-11T12:00:00Z').getTime();
  const out = recentThemes(10, 8, now);
  assert.ok(out[0].startsWith('agents (2x)'));  // highest count first
  assert.ok(!out.join(' ').includes('old'));    // outside 10-day window
});

test('recentThemes empty when no memory', () => {
  process.env.SCOUT_STATE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'scout-empty-'));
  assert.deepEqual(recentThemes(10, 8, Date.now()).length === 0 ? [] : ['x'], []);
  process.env.SCOUT_STATE_DIR = tmp;
});
