import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { runTool, TOOLS, tmpWatchlist } from '../mcp/server.js';

test('exposes scout_fetch and scout_digest with a required url on fetch', () => {
  const names = TOOLS.map((t) => t.name);
  assert.deepEqual(names, ['scout_fetch', 'scout_digest']);
  const fetchTool = TOOLS.find((t) => t.name === 'scout_fetch');
  assert.deepEqual(fetchTool.inputSchema.required, ['url']);
});

test('scout_fetch requires a url', async () => {
  await assert.rejects(() => runTool('scout_fetch', {}), /url required/);
});

test('scout_fetch rejects an SSRF target (internal IP) before shelling out', async () => {
  await assert.rejects(() => runTool('scout_fetch', { url: 'http://169.254.169.254/latest' }), /not allowed/);
});

test('scout_fetch rejects localhost', async () => {
  await assert.rejects(() => runTool('scout_fetch', { url: 'http://localhost:6379' }), /not allowed/);
});

test('unknown tool name throws', async () => {
  await assert.rejects(() => runTool('scout_bogus', {}), /unknown tool/);
});

test('tmpWatchlist returns a unique path per call (no fixed-path clobber)', () => {
  const a = tmpWatchlist();
  const b = tmpWatchlist();
  assert.notEqual(a, b);
  assert.match(path.basename(a), /^\.mcp-wl-[0-9a-f]{12}\.json$/);
});
