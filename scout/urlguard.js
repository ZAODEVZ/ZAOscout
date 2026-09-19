// urlguard.js - SSRF guard for any user-supplied fetch target.
//
// The fetchers shell out to curl, and the public API/MCP accept a `url` from
// untrusted callers. Without a guard, `url=http://169.254.169.254/...` or
// `url=http://localhost:6379` would let a caller probe internal services
// (server-side request forgery). We allow ONLY the known platform hosts ZAOscout
// supports, plus a bare tweet id. Everything else - other hosts, IP literals,
// localhost, internal ranges - is rejected. No DNS lookup: an allowlist of
// public platform hosts is the simplest correct boundary.

const ALLOWED_HOSTS = [
  'reddit.com',
  'redd.it',
  'x.com',
  'twitter.com',
  'fxtwitter.com',
  'farcaster.xyz',
  'warpcast.com',
];

/**
 * @param {string} input a URL or a bare tweet id
 * @returns {{ ok: true, kind: string, host?: string } | { ok: false, reason: string }}
 */
export function isAllowedFetchUrl(input) {
  if (typeof input !== 'string' || !input.trim()) return { ok: false, reason: 'empty' };
  const s = input.trim();

  // A bare numeric tweet id is allowed (scout-x fetches it from FxTwitter).
  if (/^\d{6,25}$/.test(s)) return { ok: true, kind: 'tweet-id' };

  let u;
  try {
    u = new URL(s);
  } catch {
    return { ok: false, reason: 'not a URL or tweet id' };
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, reason: `protocol '${u.protocol}' not allowed` };
  }
  if (u.username || u.password) return { ok: false, reason: 'userinfo not allowed' };

  const host = u.hostname.toLowerCase().replace(/\.$/, '');

  // Reject IP literals (v4/v6), localhost, and .local - no allowed platform is one.
  if (
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
    /^0x|^0\d/.test(host) || // hex / octal-looking IP
    host.includes(':') || // IPv6 literal
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return { ok: false, reason: `host '${host}' not allowed` };
  }

  const allowed = ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  if (!allowed) return { ok: false, reason: `host '${host}' not in the allowlist` };

  return { ok: true, kind: 'url', host };
}

export const ALLOWED_FETCH_HOSTS = ALLOWED_HOSTS;
