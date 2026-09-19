import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseDotenv, loadDotenv } from '../scout/env.js';

test('parses KEY=val', () => {
  assert.deepEqual(parseDotenv('FOO=bar'), { FOO: 'bar' });
});

test('parses `export KEY=val` (the bug the inline loaders dropped)', () => {
  assert.deepEqual(parseDotenv('export FOO=bar'), { FOO: 'bar' });
});

test('skips comments and blank lines', () => {
  assert.deepEqual(parseDotenv('# a comment\n\nFOO=bar\n  \n'), { FOO: 'bar' });
});

test('strips balanced quotes, keeps unbalanced', () => {
  assert.deepEqual(parseDotenv(`A="x"\nB='y'\nC="z`), { A: 'x', B: 'y', C: '"z' });
});

test('keeps `=` inside a value (urls, base64)', () => {
  assert.deepEqual(parseDotenv('U=https://x.com/h?a=b&c=d'), { U: 'https://x.com/h?a=b&c=d' });
});

test('tolerates CRLF line endings', () => {
  assert.deepEqual(parseDotenv('FOO=bar\r\nBAZ=qux\r\n'), { FOO: 'bar', BAZ: 'qux' });
});

test('loadDotenv does not override an existing env key (real env wins)', () => {
  const env = { FOO: 'already' };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scout-env-'));
  const file = path.join(dir, '.env');
  fs.writeFileSync(file, 'FOO=fromfile\nNEW=added');
  loadDotenv(file, env);
  assert.equal(env.FOO, 'already'); // not overridden
  assert.equal(env.NEW, 'added');   // new key loaded
});

test('loadDotenv on a missing file is a no-op, not a throw', () => {
  const env = { KEEP: '1' };
  assert.doesNotThrow(() => loadDotenv('/no/such/.env', env));
  assert.deepEqual(env, { KEEP: '1' });
});
