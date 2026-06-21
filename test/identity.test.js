import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { farcasterCapital, respectFor } from '../api/identity.js';

const realFetch = globalThis.fetch;
const saveEnv = { ...process.env };
afterEach(() => {
  globalThis.fetch = realFetch;
  process.env = { ...saveEnv };
});

const jsonRes = (obj, status = 200) => new Response(JSON.stringify(obj), { status });

test('farcasterCapital rejects a non-numeric fid without any fetch', async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; return jsonRes({}); };
  const out = await farcasterCapital('not-a-fid');
  assert.deepEqual(out, { exists: false, fcFollowers: 0, fcScore: 0 });
  assert.equal(called, false);
});

test('farcasterCapital parses an existing user and coerces follower_count', async () => {
  globalThis.fetch = async () => jsonRes({ users: [{ fid: 3, follower_count: '500' }] });
  const out = await farcasterCapital(3);
  assert.equal(out.exists, true);
  assert.equal(out.fcFollowers, 500); // coerced to a number
});

test('farcasterCapital fails closed on a non-ok response (does not parse the error body)', async () => {
  globalThis.fetch = async () => jsonRes({ users: [{ fid: 3, follower_count: 9999 }] }, 500);
  const out = await farcasterCapital(3);
  assert.equal(out.exists, false);     // 500 -> treated as not found, anon tier
  assert.equal(out.fcFollowers, 0);
});

test('farcasterCapital fails soft when fetch throws', async () => {
  globalThis.fetch = async () => { throw new Error('network'); };
  const out = await farcasterCapital(3);
  assert.equal(out.exists, false);
});

test('respectFor returns 0 when RESPECT_URL is unset (no fetch)', async () => {
  delete process.env.RESPECT_URL;
  let called = false;
  globalThis.fetch = async () => { called = true; return jsonRes({ respect: 99 }); };
  assert.equal(await respectFor('0xabc'), 0);
  assert.equal(called, false);
});

test('respectFor reads respect/zols/amount and coerces to a number', async () => {
  process.env.RESPECT_URL = 'https://ledger.test/q';
  globalThis.fetch = async () => jsonRes({ zols: '42' });
  assert.equal(await respectFor('fid:3'), 42);
});

test('respectFor fails closed on a non-ok response', async () => {
  process.env.RESPECT_URL = 'https://ledger.test/q';
  globalThis.fetch = async () => jsonRes({ respect: 1000 }, 403);
  assert.equal(await respectFor('fid:3'), 0);
});

test('respectFor never returns a negative balance', async () => {
  process.env.RESPECT_URL = 'https://ledger.test/q';
  globalThis.fetch = async () => jsonRes({ respect: -5 });
  assert.equal(await respectFor('fid:3'), 0);
});
