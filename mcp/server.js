#!/usr/bin/env node
// ZAOscout MCP server - zero-dep stdio JSON-RPC. Exposes the keyless scout as
// tools any MCP client (Claude Desktop/Code, Cursor, Cline) can call.
// Tools: scout_fetch (any reddit/x/farcaster URL), scout_digest (watchlist brief).
// Optional usage logging: set SCOUT_LOG_URL to POST each call to your "chart".
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { isAllowedFetchUrl } from '../scout/urlguard.js';
const pexec = promisify(execFile);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BIN = path.join(ROOT, 'bin', 'scout');

const TOOLS = [
  { name: 'scout_fetch', description: 'Fetch a Reddit, X (incl. long-form Articles), or Farcaster post by URL - keyless, full body. Returns clean text.',
    inputSchema: { type: 'object', properties: { url: { type: 'string', description: 'reddit.com / x.com / farcaster.xyz URL (or a tweet id)' } }, required: ['url'] } },
  { name: 'scout_digest', description: 'Read a watchlist of subreddits + Farcaster users, dedupe, and return the top fresh items (a brief if a BYOK LLM key is configured server-side).',
    inputSchema: { type: 'object', properties: { reddit: { type: 'array', items: { type: 'string' } }, farcaster: { type: 'array', items: { type: 'string' } }, top: { type: 'number' } } } },
];

async function logUsage(tool, target) {
  const url = process.env.SCOUT_LOG_URL;
  if (!url) return;
  try { await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tool, target, ts: new Date().toISOString(), who: process.env.SCOUT_USER || 'anon' }), signal: AbortSignal.timeout(8000) }); } catch { /* best-effort */ }
}

async function runTool(name, args) {
  if (name === 'scout_fetch') {
    if (!args?.url) throw new Error('url required');
    const guard = isAllowedFetchUrl(String(args.url));
    if (!guard.ok) throw new Error(`url not allowed: ${guard.reason} (allowed: reddit/x/twitter/farcaster/warpcast hosts or a tweet id)`);
    await logUsage('scout_fetch', args.url);
    const { stdout } = await pexec(BIN, [String(args.url)], { timeout: 35000, maxBuffer: 6 * 1024 * 1024 });
    return stdout.trim() || '(no content)';
  }
  if (name === 'scout_digest') {
    await logUsage('scout_digest', JSON.stringify({ reddit: args?.reddit, farcaster: args?.farcaster }));
    const wl = JSON.stringify({ reddit: args?.reddit || [], farcaster: args?.farcaster || [], x: [] });
    const env = { ...process.env, DRY_RUN: '1', SCOUT_WATCHLIST: '', SCOUT_TOP: String(args?.top || 8) };
    // pass the watchlist via a temp env file path is overkill; write to a transient file
    const tmp = path.join(ROOT, '.mcp-watchlist.json');
    const { default: fs } = await import('node:fs');
    fs.writeFileSync(tmp, wl);
    env.SCOUT_WATCHLIST = tmp;
    const { stdout } = await pexec('node', [path.join(ROOT, 'scout', 'digest.js')], { env, timeout: 90000, maxBuffer: 6 * 1024 * 1024 });
    try { fs.unlinkSync(tmp); } catch {}
    return stdout.replace(/^\[dry-run\]\n/, '').trim() || '(nothing new)';
  }
  throw new Error(`unknown tool: ${name}`);
}

// --- minimal MCP stdio JSON-RPC loop ---
function send(obj) { process.stdout.write(JSON.stringify(obj) + '\n'); }
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', async (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
    if (!line) continue;
    let msg; try { msg = JSON.parse(line); } catch { continue; }
    const { id, method, params } = msg;
    if (method === 'initialize') {
      send({ jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'zaoscout', version: '1.0.0' } } });
    } else if (method === 'tools/list') {
      send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
    } else if (method === 'tools/call') {
      try {
        const text = await runTool(params?.name, params?.arguments || {});
        send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } });
      } catch (e) {
        send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `error: ${e.message}` }], isError: true } });
      }
    } else if (method === 'notifications/initialized' || method?.startsWith('notifications/')) {
      // no response to notifications
    } else if (id !== undefined) {
      send({ jsonrpc: '2.0', id, error: { code: -32601, message: `method not found: ${method}` } });
    }
  }
});
