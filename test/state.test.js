import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadSeen, saveSeen } from '../scout/state.js';

beforeEach(() => {
  process.env.SCOUT_STATE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'scout-state-'));
});

test('loadSeen is an empty set when nothing is stored', () => {
  assert.equal(loadSeen().size, 0);
});

test('saveSeen then loadSeen round-trips ids', () => {
  saveSeen(new Set(['reddit:a', 'farcaster:b']));
  const s = loadSeen();
  assert.ok(s.has('reddit:a') && s.has('farcaster:b'));
});

test('namespaces are independent (digest does not see watch/share ids)', () => {
  saveSeen(new Set(['x']), 'digest');
  saveSeen(new Set(['y']), 'share');
  saveSeen(new Set(['z']));                 // default 'seen' (watch)
  assert.deepEqual([...loadSeen('digest')], ['x']);
  assert.deepEqual([...loadSeen('share')], ['y']);
  assert.deepEqual([...loadSeen()], ['z']);
});

test('the legacy default writes seen.json (no re-delivery on upgrade)', () => {
  saveSeen(new Set(['keep']));
  assert.ok(fs.existsSync(path.join(process.env.SCOUT_STATE_DIR, 'seen.json')));
});

test('caps at 5000, keeping the most recent ids', () => {
  const ids = Array.from({ length: 5200 }, (_, i) => `id:${i}`);
  saveSeen(new Set(ids));
  const s = loadSeen();
  assert.equal(s.size, 5000);
  assert.ok(s.has('id:5199'));   // newest kept
  assert.ok(!s.has('id:0'));     // oldest evicted
});

test('a traversal-ish namespace is sanitized to a safe filename', () => {
  saveSeen(new Set(['safe']), '../../etc/x');
  // sanitized name still lands inside the state dir, not outside it
  const files = fs.readdirSync(process.env.SCOUT_STATE_DIR);
  assert.ok(files.every((f) => f.startsWith('seen')));
  assert.ok(files.some((f) => f.includes('etcx')));
});
