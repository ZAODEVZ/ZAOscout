// identity.js - measure a claimer's social capital.
// Farcaster: confirm the FID exists via Haatz (keyless), read follower count + score
//   via Neynar IF NEYNAR_API_KEY is set (otherwise followers=0, score=0).
// ZAO Respect: query RESPECT_URL (your Respect ledger) for a fid/address -> number.
// Both lookups fail-soft to 0 so the worst case is the anon tier.
const HUB = process.env.FARCASTER_HUB || 'https://haatz.quilibrium.com';

export async function farcasterCapital(fid) {
  if (!/^[0-9]{1,12}$/.test(String(fid))) return { exists: false, fcFollowers: 0, fcScore: 0 };
  let exists = false;
  try {
    const r = await fetch(`${HUB}/v1/userDataByFid?fid=${fid}`, { signal: AbortSignal.timeout(12000) });
    const d = await r.json();
    exists = Array.isArray(d?.messages) && d.messages.length > 0;
  } catch {}
  let fcFollowers = 0, fcScore = 0;
  const key = process.env.NEYNAR_API_KEY;
  if (exists && key) {
    try {
      const r = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, { headers: { api_key: key, 'x-api-key': key }, signal: AbortSignal.timeout(12000) });
      const d = await r.json();
      const u = d?.users?.[0];
      fcFollowers = u?.follower_count || 0;
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
