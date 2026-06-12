# ZAOscout API

Zero-dep HTTP service (`api/server.js`). Keyless fetch + digest for anyone, with tiers claimed via Farcaster OR ZAO Respect, every call logged to the chart.

```bash
PORT=8799 node api/server.js
```

## Routes

| Route | Tier-gated | What |
|-------|-----------|------|
| `GET /fetch?url=` | yes (rate) | keyless fetch a reddit/x/farcaster URL |
| `POST /digest {reddit,farcaster,top}` | yes (sources + synthesis) | watchlist brief |
| `POST /claim {fid}` and/or `{respectId}` | - | prove social capital -> `{token, tier}` |
| `GET /me?token=` | - | your tier + unlocks |
| `GET /chart` | - | usage leaderboard (HTML; `?json=1` for JSON) |
| `GET /health` | - | liveness |

Pass your token as `?token=` or `Authorization: Bearer <token>`. No token = anon tier (IP-rate-limited).

## Wiring (to activate gating + the chart)

- `NEYNAR_API_KEY` - required to read Farcaster follower count / score for tier calc (without it, fc claims land anon).
- `RESPECT_URL` - your ZAO Respect ledger endpoint (`GET ?id=<fid|addr> -> {respect}`); without it, respect=0.
- `SCOUT_LOG_URL` - POST every call to your dashboard/Supabase ("the chart" backend) in addition to the local log.
- `OPENROUTER_API_KEY` (or other BYOK) - server-funded synthesis for tiers that unlock it.
- Tunable thresholds: `TIER_FC_BASIC_FOLLOWERS` (50), `TIER_FC_PRO_FOLLOWERS` (1000), `TIER_RESPECT_MIN` (1).
