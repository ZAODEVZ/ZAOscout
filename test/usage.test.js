import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { logUsage, readUsage, countToday, leaderboard } from '../api/usage.js';

let dir;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scout-usage-'));
  process.env.SCOUT_STATE_DIR = dir;
  delete process.env.SCOUT_LOG_URL;
});
const ledger = () => path.join(dir, 'usage.jsonl');
const today = () => new Date().toISOString().slice(0, 10);

test('logUsage appends a row and defaults who/tier to anon', async () => {
  await logUsage({ tool: 'fetch' });
  const rows = readUsage();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].who, 'anon');
  assert.equal(rows[0].tier, 'anon');
  assert.equal(rows[0].tool, 'fetch');
});

test('countToday counts only this who on today (ignores others / other days)', () => {
  const day = today();
  fs.writeFileSync(ledger(), [
    JSON.stringify({ who: 'fc:3', tier: 'fc_pro', ts: `${day}T01:00:00Z` }),
    JSON.stringify({ who: 'fc:3', tier: 'fc_pro', ts: `${day}T02:00:00Z` }),
    JSON.stringify({ who: 'fc:99', tier: 'anon', ts: `${day}T03:00:00Z` }),   // other who
    JSON.stringify({ who: 'fc:3', tier: 'fc_pro', ts: '2020-01-01T00:00:00Z' }), // other day
  ].join('\n') + '\n');
  assert.equal(countToday('fc:3'), 2);
  assert.equal(countToday('fc:99'), 1);
  assert.equal(countToday('nobody'), 0);
});

test('readUsage skips a corrupt line instead of nuking the whole ledger (fail-open regression)', () => {
  const day = today();
  fs.writeFileSync(ledger(), [
    JSON.stringify({ who: 'fc:3', tier: 'anon', ts: `${day}T01:00:00Z` }),
    '{ this is a torn half-written line',                                   // corrupt
    JSON.stringify({ who: 'fc:3', tier: 'anon', ts: `${day}T02:00:00Z` }),
  ].join('\n') + '\n');
  assert.equal(readUsage().length, 2);     // two good rows survive
  assert.equal(countToday('fc:3'), 2);     // rate-limit accounting still correct
});

test('countToday tolerates a row missing its ts', () => {
  fs.writeFileSync(ledger(), JSON.stringify({ who: 'fc:3', tier: 'anon' }) + '\n');
  assert.doesNotThrow(() => countToday('fc:3'));
  assert.equal(countToday('fc:3'), 0);
});

test('leaderboard aggregates calls per who, sorted desc, latest tier', () => {
  fs.writeFileSync(ledger(), [
    JSON.stringify({ who: 'a', tier: 'anon', ts: '2026-06-21T01:00:00Z' }),
    JSON.stringify({ who: 'a', tier: 'fc_pro', ts: '2026-06-21T02:00:00Z' }), // upgraded
    JSON.stringify({ who: 'b', tier: 'anon', ts: '2026-06-21T03:00:00Z' }),
  ].join('\n') + '\n');
  const board = leaderboard();
  assert.deepEqual(board[0], { who: 'a', tier: 'fc_pro', calls: 2 });
  assert.equal(board[1].who, 'b');
});
