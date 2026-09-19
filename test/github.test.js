import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const bin = path.join(dir, '..', 'bin', 'scout-github');
const fix = path.join(dir, 'fixtures', 'github');
const run = (arg) =>
  execFileSync(bin, [arg], { env: { ...process.env, SCOUT_GH_FIXTURE_DIR: fix }, encoding: 'utf-8' });

test('renders commits, release, issues, and discussions from offline fixtures', () => {
  const out = run('farcasterxyz/protocol');
  assert.match(out, /GitHub: farcasterxyz\/protocol \(keyless\)/);
  assert.match(out, /RECENT COMMITS:/);
  assert.match(out, /RECENT DISCUSSIONS:/);
  assert.match(out, /\/discussions\/\d+/);
});

test('parses a github.com URL down to owner/repo', () => {
  const out = run('https://github.com/farcasterxyz/protocol/discussions');
  assert.match(out, /farcasterxyz\/protocol/);
});

test('rejects a non-repo argument', () => {
  assert.throws(() => execFileSync(bin, ['not a repo'], { stdio: 'pipe' }));
});
