import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const dir = path.dirname(fileURLToPath(import.meta.url));
const bin = path.join(dir, '..', 'bin', 'scout-health');
const ghFix = path.join(dir, 'fixtures', 'github');
const logFile = path.join(os.tmpdir(), `scout-health-test-${process.pid}.log`);

// Run only the github sub-check, fed by the offline github fixtures, so this
// stays deterministic and never touches the network (the X/Farcaster/Reddit
// checks are live and intentionally skipped via the per-check filter).
const runGithub = () =>
  execFileSync(bin, ['github'], {
    env: { ...process.env, SCOUT_GH_FIXTURE_DIR: ghFix, SCOUT_LOG: logFile },
    encoding: 'utf-8',
  });

test('github fetcher is covered by the health check (passes on fixtures)', () => {
  const out = runGithub();
  assert.match(out, /PASS\s+github/);
  assert.doesNotMatch(out, /FAIL/);
});

test('per-check filter runs ONLY the named check', () => {
  const out = runGithub();
  // the other sources must not appear when we asked for github alone
  assert.doesNotMatch(out, /x \(FxTwitter\)/);
  assert.doesNotMatch(out, /farcaster/);
  assert.doesNotMatch(out, /reddit/);
});
