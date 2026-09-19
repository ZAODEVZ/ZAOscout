import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const bin = path.join(dir, '..', 'bin', 'scout-reddit');
const fixture = path.join(dir, 'fixtures', 'redlib-listing.html');

test('scout-reddit renders a subreddit LISTING (not TITLE: ?) from a real fixture', () => {
  const out = execFileSync(bin, ['r/ClaudeAI'], {
    env: { ...process.env, SCOUT_REDDIT_HTML: fixture },
    encoding: 'utf-8',
  });
  assert.match(out, /LISTING: \d+ posts/);
  assert.match(out, /\/comments\//);              // real post permalinks
  assert.ok(!/TITLE: \?/.test(out), 'must not fall back to the thread placeholder');
  // titles are real text, not flair search links
  assert.ok(!/flair_name/.test(out), 'must not list flair links as posts');
});
