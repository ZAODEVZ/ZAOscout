// reader.js - pull RECENT items from a watchlist across platforms, keyless.
// Farcaster: recent casts via scout-farcaster (Haatz). Reddit: subreddit listing
// via Redlib. X: timelines are walled (see docs/HOW-IT-WORKS.md) - watch is not
// supported for X; forward individual links instead.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const pexec = promisify(execFile);
const decodeEnt = (t) => t.replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#x27;/g,"'");

const BIN = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36';
const REDLIB = (process.env.REDLIB_INSTANCES || 'redlib.perennialte.ch reddit.rtrace.io redlib.privadency.com redlib.catsarch.com').split(/\s+/);

// --- Reddit: parse a subreddit listing from a working Redlib instance ---
async function redditSub(sub, mode = 'hot', limit = 10) {
  const pathPart = `/r/${sub}/${mode}/`;
  for (const inst of REDLIB) {
    try {
      const r = await fetch(`https://${inst}${pathPart}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(18000) });
      if (!r.ok) continue;
      const html = await r.text();
      if (html.length < 4000 || !html.includes('post_')) continue;
      const items = [];
      const seenIds = new Set();
      // The real title lives inside the <h2 class="post_title"> block, in the anchor
      // whose href points to /comments/ (siblings include flair-search + thumbnail links).
      const blockRe = /<h2[^>]*class="post_title"[^>]*>([\s\S]*?)<\/h2>/g;
      let b;
      while ((b = blockRe.exec(html)) && items.length < limit) {
        const block = b[1];
        const a = block.match(/<a[^>]*href="(\/r\/[A-Za-z0-9_]+\/comments\/([a-z0-9]+)\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/);
        if (!a) continue;
        const id = a[2];
        const title = decodeEnt(a[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
        if (!title || title.length < 4 || seenIds.has(id)) continue;
        seenIds.add(id);
        items.push({ source: 'reddit', sub, id, title, url: `https://www.reddit.com${a[1].split('?')[0]}`, engagement: 0 });
      }
      return items;
    } catch { /* try next instance */ }
  }
  return [];
}

// --- Farcaster: recent casts for a user/FID via scout-farcaster ---
async function farcasterUser(handleOrFid, limit = 8) {
  // scout-farcaster wants a URL or numeric FID; wrap bare handles as a profile URL.
  const arg = /^[0-9]+$/.test(String(handleOrFid)) ? String(handleOrFid) : `https://farcaster.xyz/${handleOrFid}`;
  try {
    const { stdout } = await pexec(path.join(BIN, 'scout-farcaster'), [arg], { timeout: 30000, maxBuffer: 4 * 1024 * 1024 });
    // scout-farcaster profile mode prints "  [0xhash] text" lines under RECENT CASTS
    const items = [];
    for (const line of stdout.split('\n')) {
      const m = line.match(/^\s*\[(0x[0-9a-f]+)\]\s*(.*)$/i);
      if (m && m[2].trim()) {
        items.push({ source: 'farcaster', user: String(handleOrFid), id: m[1], title: m[2].trim().slice(0, 140), url: `https://farcaster.xyz/${handleOrFid}/${m[1]}`, engagement: 0 });
      }
      if (items.length >= limit) break;
    }
    return items;
  } catch { return []; }
}

// watchlist: { reddit: ["LocalLLaMA","ClaudeAI"], farcaster: ["dwr.eth","3"], x: [...] }
export async function readWatchlist(wl) {
  const out = [];
  for (const sub of (wl.reddit || [])) out.push(...await redditSub(sub));
  for (const u of (wl.farcaster || [])) out.push(...await farcasterUser(u));
  // x: timelines walled - skipped on purpose. Forward individual X links instead.
  return out;
}
