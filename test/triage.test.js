import { test } from 'node:test';
import assert from 'node:assert/strict';
import { triage } from '../scout/triage.js';

test('drops already-seen items', () => {
  const items = [{ source: 'reddit', id: 'a', engagement: 5 }, { source: 'reddit', id: 'b', engagement: 1 }];
  const seen = new Set(['reddit:a']);
  const out = triage(items, seen, 8);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'b');
});

test('ranks higher engagement first within a source', () => {
  const items = [{ source: 'reddit', id: 'a', engagement: 1 }, { source: 'reddit', id: 'b', engagement: 9 }];
  const out = triage(items, new Set(), 8);
  assert.equal(out[0].id, 'b');
});

test('round-robins across sources for diversity', () => {
  const items = [
    { source: 'reddit', id: 'r1', engagement: 9 }, { source: 'reddit', id: 'r2', engagement: 8 },
    { source: 'farcaster', id: 'f1', engagement: 1 },
  ];
  const out = triage(items, new Set(), 2);
  assert.deepEqual(out.map((x) => x.source), ['reddit', 'farcaster']);
});

test('respects topN', () => {
  const items = Array.from({ length: 20 }, (_, i) => ({ source: 'reddit', id: 'x' + i, engagement: i }));
  assert.equal(triage(items, new Set(), 5).length, 5);
});

test('ignores items without id', () => {
  const items = [{ source: 'reddit', engagement: 5 }, { source: 'reddit', id: 'ok', engagement: 1 }];
  const out = triage(items, new Set(), 8);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'ok');
});
