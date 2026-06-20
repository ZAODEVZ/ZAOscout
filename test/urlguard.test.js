import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedFetchUrl } from '../scout/urlguard.js';

test('allows the supported platform hosts', () => {
  for (const u of [
    'https://www.reddit.com/r/ClaudeAI/comments/abc/',
    'https://x.com/0xricker/status/2062149859394585061',
    'https://twitter.com/foo/status/123456789012',
    'https://farcaster.xyz/dwr.eth',
    'https://warpcast.com/v/0xabc',
    'https://redd.it/abc123',
  ]) {
    assert.equal(isAllowedFetchUrl(u).ok, true, u);
  }
});

test('allows a bare tweet id', () => {
  assert.equal(isAllowedFetchUrl('2062149859394585061').ok, true);
});

test('blocks SSRF to internal / metadata targets', () => {
  for (const u of [
    'http://169.254.169.254/latest/meta-data/',
    'http://localhost:6379/',
    'http://127.0.0.1/',
    'http://10.0.0.5/',
    'http://192.168.1.1/admin',
    'http://[::1]/',
    'http://metadata.internal/',
    'http://db.local/',
  ]) {
    assert.equal(isAllowedFetchUrl(u).ok, false, u);
  }
});

test('blocks non-allowlisted hosts and non-http protocols', () => {
  assert.equal(isAllowedFetchUrl('https://evil.com/x').ok, false);
  assert.equal(isAllowedFetchUrl('https://reddit.com.evil.com/').ok, false);
  assert.equal(isAllowedFetchUrl('file:///etc/passwd').ok, false);
  assert.equal(isAllowedFetchUrl('ftp://x.com/').ok, false);
  assert.equal(isAllowedFetchUrl('https://user:pass@x.com/').ok, false);
});

test('rejects empty / garbage input', () => {
  assert.equal(isAllowedFetchUrl('').ok, false);
  assert.equal(isAllowedFetchUrl('not a url').ok, false);
  assert.equal(isAllowedFetchUrl(null).ok, false);
});
