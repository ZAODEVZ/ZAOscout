# STATUS - where ZAOscout is, and how to pick it back up

> Last updated: 2026-06-13. This is the resume-here doc. If you (or a fork)
> are coming back to this project cold, read this file first, then the README.

## What this project is, in one paragraph

ZAOscout reads Reddit, X (including long-form Articles), and Farcaster with
**no API keys, no OAuth, no login** - by reaching each platform through a free
public mirror that looks like that platform's own first-party client. On top of
that keyless read layer it adds an optional bring-your-own-key (BYOK) synthesis
layer (a "why it matters" per item, a connected daily brief, social-post drafts)
with memory that compounds across runs. It exposes the same engine three ways:
a CLI, an MCP server (for AI agents), and an HTTP API. It can run on your
machine, or free + serverless on GitHub Actions.

## How it runs today (free, no server)

This is the supported default. Zero dollars, zero always-on infrastructure.

- **Local CLI** - `scout <url>`, `scout watch`, `scout digest`, `scout share`. Runs on your machine.
- **Claude Code skill** (`skills/scout/`) and **MCP server** (`mcp/server.js`) - your AI agent calls the same engine.
- **Scheduled, serverless** - `.github/workflows/digest.yml` runs `scout digest` on GitHub's hosted runners (public repo = free unlimited minutes), daily + on a manual button. State (dedup + theme memory + the feed) is committed back to `state/` so continuity survives. See [docs/SCHEDULED.md](docs/SCHEDULED.md).
- **Synthesis** - BYOK. A free OpenRouter model, or local Ollama, or any of Anthropic/OpenAI. No key = link-only, still useful.

## Shipped (as of v1.13 + the CI digest)

- Keyless fetchers for Reddit (Redlib), X (FxTwitter, full Article bodies), Farcaster (Haatz). `scout health` checks all three.
- `scout watch` (feed), `scout digest` (one connected brief, two-pass cite-or-drop), `scout share` (review-first social drafts).
- Memory/continuity (`state/memory/themes.json` + `log.md`).
- Provider-agnostic BYOK brain (OpenRouter/Anthropic/OpenAI/Ollama auto-detected); OpenRouter free-model rotation with 429-aware retry.
- MCP server (zero-dep stdio): tools `scout_fetch`, `scout_digest`.
- HTTP API (zero-dep): `/fetch /digest /claim /me /chart /health`.
- Social-capital tiers (`api/tiers.js` + `api/identity.js`): anon / fc_basic / fc_pro / respect. Farcaster gating is **keyless** via Haatz (no Neynar bill). Respect outranks raw followers.
- GitHub Actions scheduled digest (free, serverless).
- 26 unit tests (`node --test`), CI on node 18/20/22 + shellcheck.
- Docs: README, HOW-IT-WORKS, CAPTURE-DISTRIBUTE, MCP, API, TIERS, SCHEDULED, SECURITY, CONTRIBUTING.

## Parked (needs a server or money - intentionally deferred)

These are built but not running, because they only matter when *other people* use
your instance over the network. For self-use, the free path above covers everything.

| Parked thing | Why it needs a server/money | Resume when |
|--------------|-----------------------------|-------------|
| Always-on public HTTP API | Needs a container host running 24/7 (shells out to bash/python, so NOT edge serverless). `Dockerfile` + `fly.toml` are ready. | You want outsiders/agents hitting your instance. Deploy to Railway/Render/Fly/Cloud Run/own VPS. |
| ZAO Respect ledger endpoint | A small service returning `{respect}` for a fid/address. Only exists to gate the public API's `respect` tier. | You stand up the public API AND want Respect-based tiers. Point `RESPECT_URL` at it. |
| Exa web grounding | Paid BYOK (`EXA_API_KEY`). The one non-free dependency. | You want web context beyond the fetched post body. Default is off. |
| Discord delivery | Free, but optional. No webhook = the digest commits to `state/feed.md` instead. | You want pushes to a channel. Set `DISCORD_WEBHOOK`. |

## Next steps when you resume (in priority order)

1. **Add your OpenRouter key as a GitHub repo secret** so the scheduled digest produces real briefs instead of link lists. One command (reads your local `.env`, uploads encrypted, never printed):
   ```bash
   grep '^OPENROUTER_API_KEY=' .env | cut -d= -f2- | gh secret set OPENROUTER_API_KEY -R ZAODEVZ/ZAOscout
   ```
   Then fire a run: `gh workflow run "scout digest" -R ZAODEVZ/ZAOscout`.
2. **Tune the watchlist** - edit `watchlist.ci.json` (subreddits / Farcaster handles). Add `ethereumtv.co`-style targets as they come online.
3. **Optional: push to Discord** - `gh secret set DISCORD_WEBHOOK -R ZAODEVZ/ZAOscout`.
4. **Optional: a second cron for `scout share`** - drafts social posts from top picks into `state/drafts.md` (review-first, never auto-posts).
5. **When/if going multi-tenant:** deploy the API (Dockerfile), build the Respect ledger endpoint, point `RESPECT_URL` + `SCOUT_LOG_URL` at it.

## Durable lessons / gotchas (don't relearn these)

- **OpenRouter free-model slugs churn.** `brain.js` rotates a list and retries on 429 (respecting Retry-After). If all are dead, refresh the list from `GET https://openrouter.ai/api/v1/models` filtered to `pricing == 0`.
- **Public mirrors are fragile.** Redlib instances blip; Jina went auth-walled mid-2026. `scout-reddit` tries multiple Redlib instances; refresh from [redlib-instances](https://github.com/redlib-org/redlib-instances) if they all die. `scout health` is your early-warning.
- **X timelines are walled** - only individual known tweets/Articles are fetchable (`scout-x`), not a user's timeline. So `watch` supports Reddit + Farcaster, not X feeds.
- **Haatz gives follower_count keyless** (Neynar-compatible). It does NOT give Neynar's proprietary score - we don't need it. `NEYNAR_API_KEY` is optional, score-only.
- **The API shells out** to the bash fetchers, so it needs a real OS. Deploy as a container, never as an edge/serverless function.
- **No secrets in the repo, ever.** `.env` is gitignored; fetchers are keyless; tier identity is keyless. See [SECURITY.md](SECURITY.md).

## File map (where things live)

```
bin/                  keyless fetchers (scout dispatcher + per-platform + health)
scout/                node engine: reader, triage, state, notify, brain,
                      ground, search, memory, watch, digest, share
mcp/server.js         zero-dep MCP server
api/server.js         zero-dep HTTP API (+ tiers.js, identity.js, usage.js)
skills/scout/         Claude Code skill
workflows/mine.js     push-discovery mining template
.github/workflows/    ci.yml (tests) + digest.yml (free scheduled digest)
test/                 node --test unit tests
docs/                 deep docs (see README "Documentation" section)
watchlist.ci.json     the watchlist the scheduled digest reads
state/                committed run state (dedup + memory + feed) - CI writes here
```

## Relationship to farscout

[farscout](https://github.com/bettercallzaal/farscout) is the Farcaster-only
research scout that inspired this (triage/ground/synthesize/Discord-DM). ZAOscout
generalizes that loop across platforms on the keyless fetchers. farscout's `lib/`
(verify/research) are the next port targets if you want deeper grounding.
