import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const bin = path.join(dir, '..', 'bin', 'scout-farcaster');
const fix = path.join(dir, 'fixtures', 'farcaster');
const run = (arg, env = {}) =>
  execFileSync(bin, [arg], { env: { ...process.env, SCOUT_FC_FIXTURE_DIR: fix, ...env }, encoding: 'utf-8' });

test('renders a profile + recent casts from offline fixtures (fid mode)', () => {
  const out = run('3');
  assert.match(out, /FARCASTER \(via fixture/);
  assert.match(out, /Dan Romero/);      // USER_DATA_TYPE_DISPLAY for fid 3
  assert.match(out, /FID: 3/);
  assert.match(out, /RECENT CASTS/);
  assert.match(out, /\[0x[0-9a-f]{8}/);  // at least one cast hash rendered
});

test('rejects a non-Farcaster argument', () => {
  assert.throws(() => execFileSync(bin, ['not a farcaster url'], { stdio: 'pipe' }));
});

test('fixture hook is honored even with a junk hub list (no network)', () => {
  // Proves get() reads the fixture before touching any hub - the multi-hub
  // path is exercised live by scout-health; here we keep CI fully offline.
  const out = run('3', { FARCASTER_HUBS: 'https://127.0.0.1:1/dead' });
  assert.match(out, /Dan Romero/);
});
