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

- `NEYNAR_API_KEY` - OPTIONAL. Farcaster follower count is read KEYLESS from Haatz (Neynar-compatible, free). Set a Neynar key only if you want Neynar's proprietary score as an extra signal.
- `RESPECT_URL` - your ZAO Respect ledger endpoint (`GET ?id=<fid|addr> -> {respect}`); without it, respect=0.
- `SCOUT_LOG_URL` - POST every call to your dashboard/Supabase ("the chart" backend) in addition to the local log.
- `OPENROUTER_API_KEY` (or other BYOK) - server-funded synthesis for tiers that unlock it.
- Tunable thresholds: `TIER_FC_BASIC_FOLLOWERS` (50), `TIER_FC_PRO_FOLLOWERS` (1000), `TIER_RESPECT_MIN` (1).


## Deploy (anywhere that runs a container)

The API shells out to the bash/python fetchers, so it needs a container (NOT edge serverless like Vercel/CF Workers). One Dockerfile runs everywhere:

```bash
docker build -t zaoscout . && docker run -p 8799:8799 -v scout_data:/data zaoscout
```

- **Railway / Render**: connect the GitHub repo, it auto-detects the Dockerfile. Done.
- **Fly.io**: `fly launch --no-deploy` then `fly deploy` (fly.toml included).
- **Google Cloud Run**: `gcloud run deploy --source .`
- **Your own VPS**: `docker run ...` or `node api/server.js` (needs node 18+, curl, python3, bash).

No managed VPS required - free tiers on Railway/Render/Fly handle it. The whole platform stays keyless (fetch + Farcaster gating); set `RESPECT_URL` for ZAO Respect tiers and `SCOUT_LOG_URL` to persist the chart.
