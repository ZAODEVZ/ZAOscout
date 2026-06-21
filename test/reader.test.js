import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseRedditListing, parseFarcasterCasts, validSub, validFcUser, validRepo, parseGithubActivity, getRedlibInstances } from '../scout/reader.js';

const FIXTURE = `
<div class="post stickied" id="pin1"><h2 class="post_title"><a href="/r/Test/comments/pin1/megathread/">Megathread (pinned)</a></h2><div class="post_score" title="999">999</div><div class="post_comments" title="10 comments">10</div></div>
<div class="post" id="real1"><h2 class="post_title"><a href="/r/Test/search?q=flair">flair</a> <a href="/r/Test/comments/real1/cool_thing/">Cool Thing Happened</a></h2><div class="post_score" title="1068">1k</div><div class="post_comments" title="410 comments">410</div></div>
<div class="post" id="real2"><h2 class="post_title"><a href="/r/Test/comments/real2/another/">Another &amp; Better</a></h2><div class="post_score" title="50">50</div><div class="post_comments" title="3 comments">3</div></div>
`;

test('parseRedditListing skips stickied + parses real posts', () => {
  const items = parseRedditListing(FIXTURE, 'Test', 10);
  assert.equal(items.length, 2);
  assert.ok(!items.find((i) => i.id === 'pin1'), 'stickied dropped');
});

test('parseRedditListing extracts real title (not flair) + decodes entities', () => {
  const items = parseRedditListing(FIXTURE, 'Test', 10);
  assert.equal(items[0].title, 'Cool Thing Happened');
  assert.equal(items[1].title, 'Another & Better');
});

test('parseRedditListing computes engagement = score + 2*comments', () => {
  const items = parseRedditListing(FIXTURE, 'Test', 10);
  assert.equal(items[0].engagement, 1068 + 410 * 2);
});

test('parseRedditListing canonical reddit url', () => {
  const items = parseRedditListing(FIXTURE, 'Test', 10);
  assert.equal(items[0].url, 'https://www.reddit.com/r/Test/comments/real1/cool_thing/');
});

test('parseFarcasterCasts parses cast lines', () => {
  const out = '=== FARCASTER ===\n--- RECENT CASTS ---\n  [0xabc123] hello world\n  [0xdef456] second cast\n';
  const items = parseFarcasterCasts(out, 'dwr.eth', 8);
  assert.equal(items.length, 2);
  assert.equal(items[0].id, '0xabc123');
  assert.equal(items[0].url, 'https://farcaster.xyz/dwr.eth/0xabc123');
});

test('input validation rejects injection', () => {
  assert.ok(validSub('LocalLLaMA'));
  assert.ok(!validSub('../../etc/passwd'));
  assert.ok(!validSub('a b'));
  assert.ok(validFcUser('dwr.eth'));
  assert.ok(validFcUser('3'));
  assert.ok(!validFcUser('../evil'));
  assert.ok(!validFcUser('a/b'));
});

test('validRepo accepts owner/repo and rejects junk', () => {
  assert.equal(validRepo('farcasterxyz/protocol'), true);
  assert.equal(validRepo('owner'), false);
  assert.equal(validRepo('a/b/c'), false);
  assert.equal(validRepo('bad space/repo'), false);
});

test('parseGithubActivity turns discussion lines into items', () => {
  const stdout = [
    '=== GitHub: farcasterxyz/protocol (keyless) ===',
    'RECENT DISCUSSIONS:',
    '- #273 FIP: Ungate Message Variants | https://github.com/farcasterxyz/protocol/discussions/273',
    '- #207 FIP: Snapchain | https://github.com/farcasterxyz/protocol/discussions/207',
  ].join('\n');
  const items = parseGithubActivity(stdout, 'farcasterxyz/protocol');
  assert.equal(items.length, 2);
  assert.equal(items[0].source, 'github');
  assert.match(items[0].title, /\[farcasterxyz\/protocol\] FIP: Ungate/);
  assert.match(items[0].url, /discussions\/273/);
  assert.equal(items[0].id, 'disc-273');
});

test('getRedlibInstances: env override wins', () => {
  const prev = process.env.REDLIB_INSTANCES;
  process.env.REDLIB_INSTANCES = 'a.com b.com';
  try { assert.deepEqual(getRedlibInstances('/nope'), ['a.com', 'b.com']); }
  finally { if (prev === undefined) delete process.env.REDLIB_INSTANCES; else process.env.REDLIB_INSTANCES = prev; }
});

test('getRedlibInstances: reads the self-heal cache, merges fallback, dedupes', () => {
  const prev = process.env.REDLIB_INSTANCES; delete process.env.REDLIB_INSTANCES;
  const tmp = path.join(os.tmpdir(), `redlib-test-${Date.now()}.txt`);
  fs.writeFileSync(tmp, 'live1.example\nredlib.perennialte.ch\nlive2.example\n');
  try {
    const list = getRedlibInstances(tmp);
    assert.equal(list[0], 'live1.example');               // cache first
    assert.ok(list.includes('reddit.rtrace.io'));         // fallback appended
    assert.equal(new Set(list).size, list.length);        // deduped (perennialte not doubled)
  } finally { fs.unlinkSync(tmp); if (prev !== undefined) process.env.REDLIB_INSTANCES = prev; }
});

test('getRedlibInstances: no cache -> fallback only', () => {
  const prev = process.env.REDLIB_INSTANCES; delete process.env.REDLIB_INSTANCES;
  try { assert.deepEqual(getRedlibInstances('/definitely/missing'), ['redlib.perennialte.ch', 'reddit.rtrace.io', 'redlib.privadency.com', 'redlib.catsarch.com']); }
  finally { if (prev !== undefined) process.env.REDLIB_INSTANCES = prev; }
});
