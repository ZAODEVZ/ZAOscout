import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Isolate state (usage log / tokens) to a temp dir and set a tiny body cap so a
// small payload trips the 413 guard. Both env reads happen at import time, so
// set them BEFORE the dynamic import of the server.
const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scout-api-'));
process.env.SCOUT_STATE_DIR = stateDir;
process.env.SCOUT_MAX_BODY = '64';

const { server } = await import('../api/server.js');
const base = await new Promise((r) =>
  server.listen(0, () => r(`http://127.0.0.1:${server.address().port}`)),
);

after(() => server.close());

test('/health returns ok', async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
});

test('/fetch rejects an SSRF target (internal IP) with 400', async () => {
  const res = await fetch(`${base}/fetch?url=${encodeURIComponent('http://169.254.169.254/latest/meta-data')}`);
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /not allowed/);
});

test('/fetch without a url is a 400', async () => {
  const res = await fetch(`${base}/fetch`);
  assert.equal(res.status, 400);
});

test('unknown route returns 404 with the route list', async () => {
  const res = await fetch(`${base}/definitely-not-a-route`);
  assert.equal(res.status, 404);
  assert.ok((await res.json()).routes.includes('/fetch'));
});

test('oversized POST body returns 413 (memory-DoS guard)', async () => {
  const res = await fetch(`${base}/claim`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ junk: 'x'.repeat(500) }),
  });
  assert.equal(res.status, 413);
  assert.match((await res.json()).error, /too large/);
});

test('/me is the anon tier with no token', async () => {
  const res = await fetch(`${base}/me`);
  assert.equal((await res.json()).tier, 'anon');
});
