#!/usr/bin/env node
// ZAOscout MCP server - zero-dep stdio JSON-RPC. Exposes the keyless scout as
// tools any MCP client (Claude Desktop/Code, Cursor, Cline) can call.
// Tools: scout_fetch (any reddit/x/farcaster URL), scout_digest (watchlist brief).
// Optional usage logging: set SCOUT_LOG_URL to POST each call to your "chart".
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import path from 'node:path';
import { isAllowedFetchUrl } from '../scout/urlguard.js';
const pexec = promisify(execFile);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BIN = path.join(ROOT, 'bin', 'scout');
const MAX_SOURCES = Number(process.env.SCOUT_MCP_MAX_SOURCES || 50);

export const TOOLS = [
  { name: 'scout_fetch', description: 'Fetch a Reddit, X (incl. long-form Articles), or Farcaster post by URL - keyless, full body. Returns clean text.',
    inputSchema: { type: 'object', properties: { url: { type: 'string', description: 'reddit.com / x.com / farcaster.xyz URL (or a tweet id)' } }, required: ['url'] } },
  { name: 'scout_digest', description: 'Read a watchlist of subreddits + Farcaster users, dedupe, and return the top fresh items (a brief if a BYOK LLM key is configured server-side).',
    inputSchema: { type: 'object', properties: { reddit: { type: 'array', items: { type: 'string' } }, farcaster: { type: 'array', items: { type: 'string' } }, top: { type: 'number' } } } },
];

// Unique temp watchlist path per call. A FIXED path raced: two concurrent
// scout_digest calls clobbered each other's watchlist (one reads the other's
// inputs, or one unlinks mid-read). A random suffix isolates each call.
export function tmpWatchlist() {
  return path.join(ROOT, `.mcp-wl-${crypto.randomBytes(6).toString('hex')}.json`);
}

async function logUsage(tool, target) {
  const url = process.env.SCOUT_LOG_URL;
  if (!url) return;
  try { await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tool, target, ts: new Date().toISOString(), who: process.env.SCOUT_USER || 'anon' }), signal: AbortSignal.timeout(8000) }); } catch { /* best-effort */ }
}

export async function runTool(name, args) {
  if (name === 'scout_fetch') {
    if (!args?.url) throw new Error('url required');
    const guard = isAllowedFetchUrl(String(args.url));
    if (!guard.ok) throw new Error(`url not allowed: ${guard.reason} (allowed: reddit/x/twitter/farcaster/warpcast hosts or a tweet id)`);
    await logUsage('scout_fetch', args.url);
    const { stdout } = await pexec(BIN, [String(args.url)], { timeout: 35000, maxBuffer: 6 * 1024 * 1024 });
    return stdout.trim() || '(no content)';
  }
  if (name === 'scout_digest') {
    const reddit = (Array.isArray(args?.reddit) ? args.reddit : []).slice(0, MAX_SOURCES);
    const farcaster = (Array.isArray(args?.farcaster) ? args.farcaster : []).slice(0, MAX_SOURCES);
    await logUsage('scout_digest', JSON.stringify({ reddit, farcaster }));
    const { default: fs } = await import('node:fs');
    const tmp = tmpWatchlist();
    fs.writeFileSync(tmp, JSON.stringify({ reddit, farcaster, x: [] }));
    const env = { ...process.env, DRY_RUN: '1', SCOUT_WATCHLIST: tmp, SCOUT_TOP: String(args?.top || 8) };
    try {
      const { stdout } = await pexec('node', [path.join(ROOT, 'scout', 'digest.js')], { env, timeout: 90000, maxBuffer: 6 * 1024 * 1024 });
      return stdout.replace(/^\[dry-run\]\n/, '').trim() || '(nothing new)';
    } finally {
      try { fs.unlinkSync(tmp); } catch {}
    }
  }
  throw new Error(`unknown tool: ${name}`);
}

// --- minimal MCP stdio JSON-RPC loop (only when run directly, not on import) ---
function send(obj) { process.stdout.write(JSON.stringify(obj) + '\n'); }

function startStdioLoop() {
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
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) startStdioLoop();
