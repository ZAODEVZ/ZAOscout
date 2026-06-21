// reader.js - pull RECENT items from a watchlist across platforms, keyless.
// Farcaster: recent casts via scout-farcaster (Haatz). Reddit: subreddit listing
// via Redlib. X: timelines are walled (see docs/HOW-IT-WORKS.md) - watch is not
// supported for X; forward individual links instead.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const pexec = promisify(execFile);
const NAMED = { amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", nbsp:' ', mdash:'—', ndash:'–', hellip:'…', rsquo:'’', lsquo:'‘', ldquo:'“', rdquo:'”' };
const decodeEnt = (t) => t
  .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&([a-zA-Z]+);/g, (m, n) => (n in NAMED ? NAMED[n] : m));

const BIN = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36';
const REDLIB = (process.env.REDLIB_INSTANCES || 'redlib.perennialte.ch reddit.rtrace.io redlib.privadency.com redlib.catsarch.com').split(/\s+/);

// --- Input validation: watchlist entries flow into URLs / fetcher args, so they
//     must be strictly shaped to prevent URL/path injection. Reject anything else.
const SUB_RE = /^[A-Za-z0-9_]{1,40}$/;                 // subreddit name
const FID_RE = /^[0-9]{1,12}$/;                        // numeric Farcaster id
const HANDLE_RE = /^[A-Za-z0-9_.-]{1,40}$/;            // fname or .eth handle
const REPO_RE = /^[A-Za-z0-9_.-]{1,40}\/[A-Za-z0-9_.-]{1,100}$/; // owner/repo
export const validSub = (s) => typeof s === 'string' && SUB_RE.test(s);
export const validFcUser = (u) => typeof u === 'string' && (FID_RE.test(u) || HANDLE_RE.test(u));
export const validRepo = (r) => typeof r === 'string' && REPO_RE.test(r);

// --- Pure parsers (exported for tests; no network) ---

// Parse a Redlib subreddit-listing HTML into items. Skips stickied/pinned posts;
// reads real engagement from the title="N" attrs on post_score + post_comments.
export function parseRedditListing(html, sub, limit = 10) {
  const items = [];
  const seenIds = new Set();
  const chunks = html.split(/<div class="post[" ]/).slice(1);
  for (const chunk of chunks) {
    if (items.length >= limit) break;
    if (chunk.slice(0, 20).includes('stickied')) continue;
    const a = chunk.match(/<h2[^>]*class="post_title"[^>]*>[\s\S]{0,300}?<a[^>]*href="(\/r\/[A-Za-z0-9_]+\/comments\/([a-z0-9]+)\/[^"]*)"[^>]*>([\s\S]{0,400}?)<\/a>/);
    if (!a) continue;
    const id = a[2];
    const title = decodeEnt(a[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
    if (!title || title.length < 4 || seenIds.has(id)) continue;
    const score = Number((chunk.match(/class="post_score"[^>]*title="(\d+)"/) || [])[1] || 0);
    const comments = Number((chunk.match(/class="post_comments"[^>]*title="(\d+)/) || [])[1] || 0);
    seenIds.add(id);
    items.push({ source: 'reddit', sub, id, title, url: `https://www.reddit.com${a[1].split('?')[0]}`, engagement: score + comments * 2 });
  }
  return items;
}

// Parse scout-farcaster profile-mode stdout ("  [0xhash] text" lines) into items.
export function parseFarcasterCasts(stdout, user, limit = 8) {
  const items = [];
  for (const line of stdout.split('\n')) {
    const m = line.match(/^\s*\[(0x[0-9a-f]+)\]\s*(.*)$/i);
    if (m && m[2].trim()) {
      items.push({ source: 'farcaster', user: String(user), id: m[1], title: m[2].trim().slice(0, 140), url: `https://farcaster.xyz/${user}/${m[1]}`, engagement: 0 });
    }
    if (items.length >= limit) break;
  }
  return items;
}

// Parse scout-github stdout into items (recent DISCUSSIONS are the high-signal
// feed item for a repo - FIPs, proposals - each with a stable url).
export function parseGithubActivity(stdout, repo, limit = 6) {
  const items = [];
  for (const line of stdout.split('\n')) {
    const m = line.match(/^- #(\d+) (.+?) \| (https:\/\/github\.com\/\S+\/discussions\/\d+)/);
    if (m) {
      items.push({ source: 'github', repo: String(repo), id: `disc-${m[1]}`, title: `[${repo}] ${m[2].trim()}`.slice(0, 140), url: m[3], engagement: 0 });
      if (items.length >= limit) break;
    }
  }
  return items;
}

// --- Network fetchers (use the validated input + pure parsers) ---

async function githubRepo(repo, limit = 6) {
  if (!validRepo(repo)) { console.error(`[scout] skipping invalid github repo: ${JSON.stringify(repo)}`); return []; }
  try {
    const { stdout } = await pexec(path.join(BIN, 'scout-github'), [repo], { timeout: 30000, maxBuffer: 1024 * 1024 });
    return parseGithubActivity(stdout, repo, limit);
  } catch { return []; }
}

async function redditSub(sub, mode = 'hot', limit = 10) {
  if (!validSub(sub)) { console.error(`[scout] skipping invalid subreddit: ${JSON.stringify(sub)}`); return []; }
  for (const inst of REDLIB) {
    try {
      const r = await fetch(`https://${inst}/r/${sub}/${mode}/`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(18000) });
      if (!r.ok) continue;
      const html = await r.text();
      if (html.length < 4000 || !html.includes('post_')) continue;
      return parseRedditListing(html, sub, limit);
    } catch { /* try next instance */ }
  }
  return [];
}

async function farcasterUser(handleOrFid, limit = 8) {
  if (!validFcUser(String(handleOrFid))) { console.error(`[scout] skipping invalid farcaster user: ${JSON.stringify(handleOrFid)}`); return []; }
  const arg = FID_RE.test(String(handleOrFid)) ? String(handleOrFid) : `https://farcaster.xyz/${handleOrFid}`;
  try {
    const { stdout } = await pexec(path.join(BIN, 'scout-farcaster'), [arg], { timeout: 30000, maxBuffer: 1024 * 1024 });
    return parseFarcasterCasts(stdout, handleOrFid, limit);
  } catch { return []; }
}

// watchlist: { reddit: [...], farcaster: [...], github: ["owner/repo"], x: [...] }
export async function readWatchlist(wl) {
  const out = [];
  for (const sub of (wl.reddit || [])) out.push(...await redditSub(sub));
  for (const u of (wl.farcaster || [])) out.push(...await farcasterUser(u));
  for (const repo of (wl.github || [])) out.push(...await githubRepo(repo));
  // x: timelines walled - skipped on purpose. Forward individual X links instead.
  return out;
}
