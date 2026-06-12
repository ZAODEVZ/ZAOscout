// identity.js - measure a claimer's social capital. KEYLESS by default.
// Farcaster: Haatz (haatz.quilibrium.com) is a free Neynar-compatible API - its
//   /v2/farcaster/user/bulk returns follower_count with no key, no bill. The only
//   thing it lacks is Neynar's proprietary score, which we don't need. Set
//   NEYNAR_API_KEY only if you want the score as an extra signal.
// ZAO Respect: query RESPECT_URL (your Respect ledger) for a fid/address -> number.
// All lookups fail-soft to 0 so the worst case is the anon tier.
const HAATZ = process.env.FARCASTER_API || 'https://haatz.quilibrium.com';

export async function farcasterCapital(fid) {
  if (!/^[0-9]{1,12}$/.test(String(fid))) return { exists: false, fcFollowers: 0, fcScore: 0 };
  let exists = false, fcFollowers = 0, fcScore = 0;
  try {
    const r = await fetch(`${HAATZ}/v2/farcaster/user/bulk?fids=${fid}`, { signal: AbortSignal.timeout(12000) });
    const u = (await r.json())?.users?.[0];
    if (u?.fid) { exists = true; fcFollowers = u.follower_count || 0; }
  } catch {}
  const key = process.env.NEYNAR_API_KEY;   // optional: proprietary score only
  if (exists && key) {
    try {
      const r = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, { headers: { api_key: key, 'x-api-key': key }, signal: AbortSignal.timeout(12000) });
      const u = (await r.json())?.users?.[0];
      fcScore = u?.experimental?.neynar_user_score ?? u?.score ?? 0;
    } catch {}
  }
  return { exists, fcFollowers, fcScore };
}

export async function respectFor(idOrAddr) {
  const url = process.env.RESPECT_URL;        // e.g. a ZAO Respect ledger endpoint
  if (!url || !idOrAddr) return 0;
  try {
    const r = await fetch(`${url}${url.includes('?') ? '&' : '?'}id=${encodeURIComponent(idOrAddr)}`, { signal: AbortSignal.timeout(12000) });
    const d = await r.json();
    return Number(d?.respect ?? d?.zols ?? d?.amount ?? 0) || 0;
  } catch { return 0; }
}
