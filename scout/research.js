// research.js - run one research request: a URL or a free-text topic -> a short
// grounded brief. Reuses the keyless fetchers (bin/scout) for URLs and the
// optional Exa web context for topics, then the BYOK brain for synthesis.
//
// Keyless-first, fail-soft: with no LLM key it returns the raw fetched/searched
// context (still useful); with a key it returns a synthesized brief. Designed to
// be called from the CLI and from the Discord `/research` command alike.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { makeBrain } from './brain.js';
import { webContext } from './search.js';
import { isAllowedFetchUrl } from './urlguard.js';

const pexec = promisify(execFile);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCOUT = path.join(ROOT, 'bin', 'scout');

// Does this input look like a URL we can fetch, vs a topic to search?
export function looksLikeUrl(input) {
  const s = String(input || '').trim();
  if (/\s/.test(s)) return false;                 // has whitespace -> a phrase, not a URL
  if (!/^https?:\/\//i.test(s)) return false;     // require an explicit scheme
  try { const g = isAllowedFetchUrl(s); return !!(g && g.ok); } catch { return false; }
}

// Keyless-fetch a URL's content via the scout CLI. Returns the text body (capped).
async function fetchUrl(url, { timeout = 45000 } = {}) {
  try {
    const { stdout } = await pexec(SCOUT, [url], { timeout, maxBuffer: 6 * 1024 * 1024 });
    return (stdout || '').trim();
  } catch (e) {
    return '';
  }
}

// Run a research request. Returns { kind, query, brief, context, grounded, error }.
//   kind: 'url' | 'topic'
//   brief: synthesized brief (or '' if no LLM key / synthesis failed)
//   context: the raw fetched/searched text used for grounding
//   grounded: true if we actually retrieved some context to ground in
export async function research(input, { brain = makeBrain() } = {}) {
  const query = String(input || '').trim();
  if (!query) return { kind: 'topic', query, brief: '', context: '', grounded: false, error: 'empty query' };

  const kind = looksLikeUrl(query) ? 'url' : 'topic';
  let context = '';

  if (kind === 'url') {
    context = await fetchUrl(query);
  } else {
    // Topic: pull web context (Exa, BYOK). Without EXA_API_KEY this is '' and we
    // lean on the model's own knowledge with an explicit "context is thin" flag.
    context = await webContext(query);
  }

  const grounded = context.length >= 40;
  let brief = '';
  if (brain) {
    try { brief = await brain.research(query, context); } catch { brief = ''; }
  }
  return { kind, query, brief, context, grounded, error: '' };
}

// Format a research result as a Discord-ready message string.
export function formatResult(r) {
  const head = r.kind === 'url' ? `Research: ${r.query}` : `Research: "${r.query}"`;
  if (r.brief) {
    return `**${head}**\n\n${r.brief}`;
  }
  // No synthesis (no LLM key) -> return a trimmed context excerpt, still useful.
  if (r.grounded) {
    const excerpt = r.context.replace(/\n{3,}/g, '\n\n').slice(0, 1500);
    return `**${head}**\n_(no LLM key set - showing fetched content)_\n\n${excerpt}`;
  }
  return `**${head}**\n\nCouldn't gather enough to brief this. ${r.kind === 'topic' ? 'Set EXA_API_KEY for web search on topics, or paste a direct URL.' : 'The URL returned nothing fetchable.'}`;
}
