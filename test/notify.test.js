import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { render, chunkText, notifyText } from '../scout/notify.js';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.DISCORD_WEBHOOK;
  delete process.env.SCOUT_STATE_DIR;
  delete process.env.DRY_RUN;
});

test('render formats reddit/farcaster tags, why, url, and the count header', () => {
  const out = render([
    { source: 'reddit', sub: 'ClaudeAI', title: 'Hi', url: 'https://r/x', why: 'fresh' },
    { source: 'farcaster', user: 'dwr.eth', title: 'Yo', url: 'https://f/y' },
  ]);
  assert.match(out, /ZAOscout - 2 new/);
  assert.match(out, /\[r\/ClaudeAI\] Hi/);
  assert.match(out, /fresh/);
  assert.match(out, /\[@dwr\.eth\] Yo/);
});

test('render returns null when there are no picks', () => {
  assert.equal(render([]), null);
});

test('chunkText splits text over the 1900-char Discord limit', () => {
  const parts = chunkText('a'.repeat(4000));
  assert.equal(parts.length, 3);
  assert.ok(parts.every((p) => p.length <= 1900));
});

test('webhook retries on 429 (honoring retry_after) then delivers', async () => {
  process.env.DISCORD_WEBHOOK = 'https://discord.test/hook';
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    if (calls === 1) return new Response('{"retry_after":0}', { status: 429, headers: { 'retry-after': '0' } });
    return new Response('{}', { status: 200 });
  };
  const res = await notifyText('hello');
  assert.equal(res.via, 'webhook');
  assert.equal(calls, 2); // one 429, one success
});

test('a hard webhook failure falls back to the local feed file', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scout-notify-'));
  process.env.SCOUT_STATE_DIR = dir;
  process.env.DISCORD_WEBHOOK = 'https://discord.test/hook';
  globalThis.fetch = async () => new Response('nope', { status: 500 });
  const res = await notifyText('fallback me');
  assert.equal(res.via, 'file');
  assert.match(fs.readFileSync(path.join(dir, 'feed.md'), 'utf8'), /fallback me/);
});
