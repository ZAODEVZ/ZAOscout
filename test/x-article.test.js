import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const bin = path.join(dir, '..', 'bin', 'scout-x');
const fix = (name) => path.join(dir, 'fixtures', 'x', name);
const run = (fixture) =>
  execFileSync(bin, ['1234567890123456'], { env: { ...process.env, SCOUT_X_FIXTURE: fix(fixture) }, encoding: 'utf-8' });

test('renders a draft-js Article body to markdown (the X long-form value prop)', () => {
  const out = run('article.json');
  assert.match(out, /USER: heynavtoor \/ Nav/);
  assert.match(out, /ARTICLE_DETECTED \(full body via FxTwitter\)/);
  assert.match(out, /ARTICLE_TITLE: The Keyless Web/);
  assert.match(out, /ARTICLE BODY \(5 blocks\)/);
  // block-type -> markdown mapping
  assert.match(out, /^# The Keyless Web$/m);                 // header-one
  assert.match(out, /^## How$/m);                            // header-two
  assert.match(out, /^- Read through a first-party mirror$/m); // unordered-list-item
  assert.match(out, /^> No secrets means it is forkable\.$/m); // blockquote
  assert.match(out, /^Most tools need a key\./m);            // unstyled (no prefix)
});

test('renders a plain tweet with text and media (no article branch)', () => {
  const out = run('tweet.json');
  assert.match(out, /USER: 0xricker \/ Ricker/);
  assert.doesNotMatch(out, /ARTICLE_DETECTED/);
  assert.match(out, /TEXT:\nhello keyless world/);
  assert.match(out, /MEDIA photo: https:\/\/pbs\.twimg\.com\/media\/abc\.jpg/);
});

test('rejects an argument that is not a tweet url or 15-20 digit id', () => {
  assert.throws(() => execFileSync(bin, ['nope'], { stdio: 'pipe' }));
});
