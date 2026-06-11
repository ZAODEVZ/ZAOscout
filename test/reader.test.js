import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRedditListing, parseFarcasterCasts, validSub, validFcUser } from '../scout/reader.js';

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
