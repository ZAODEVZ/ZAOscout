# ZAOscout

**Read Reddit, X (incl. long-form Articles), and Farcaster from the command line - with no API keys, no OAuth, no login, no browser.** Clone and run.

Most "fetch a social post" tools need an API key, a paid plan, or a logged-in browser session. ZAOscout needs none of that. Each fetcher reads through a free public mirror that the platform serves normally, so a plain `curl` + `python3` gets you the full post body and comments.

```bash
scout https://www.reddit.com/r/ClaudeCode/comments/1typ8fb/   # post + comment tree
scout https://x.com/0xricker/status/2062149859394585061       # tweet + full Article body
scout https://farcaster.xyz/dwr.eth                            # profile + recent casts
```

## Why it works

Platforms block generic scrapers but trust their own first-party clients. ZAOscout reaches each platform through a mirror that looks like that client:

| Source | Mirror | What it returns |
|--------|--------|-----------------|
| **Reddit** | [Redlib](https://github.com/redlib-org/redlib) (emulates the Reddit Android app) | title, author, body, comment tree |
| **X / Twitter** | [FxTwitter](https://github.com/FixTweet/FxTwitter) | tweet text, media, **full long-form Article body** |
| **Farcaster** | [Haatz](https://haatz.quilibrium.com) + Pinata (public Snapchain hub mirrors, with fallback) | cast text + embeds, profile, recent casts |
| **GitHub** | public REST API + the discussions page | recent commits, latest release, open issues, discussions - keyless |

No secrets means it's forkable: a clone works immediately, and it survives any repo reset because there's nothing to configure. After cloning, run `scout doctor` to see what's installed and configured.

See [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md) for the full method (and why the techniques most tutorials show you are already dead). New here, or picking this back up? Start with [STATUS.md](STATUS.md) - it captures what is shipped, what is parked, and how to resume.

## Quickstart

```bash
git clone <this-repo> && cd ZAOscout
./setup.sh                 # chmod + dependency check, optionally adds bin/ to PATH
scout doctor               # preflight: what's installed + configured (offline)
scout https://www.reddit.com/r/LocalLLaMA/comments/...
scout health               # verify the fetchers still work live
```

Requirements: `bash`, `curl`, `python3` (all standard on macOS/Linux). That's it.

## The fetchers

| Command | Source | Notes |
|---------|--------|-------|
| `scout <url>` | auto-routes by host | the one you'll use |
| `scout-reddit <url-or-/s/-link>` | Redlib (multi-instance fallback) | resolves `/s/` share links to canonical |
| `scout-x <url-or-tweet-id>` | FxTwitter | renders draft-js Article blocks to markdown |
| `scout-farcaster <url-or-fid>` | Haatz + Pinata (hub fallback) | resolves `@handle` -> FID, short-hash -> full cast |
| `scout-github <owner/repo-or-url>` | GitHub REST + discussions | commits, latest release, open issues, discussions - keyless |
| `scout doctor` | none (offline) | preflight: deps + what's configured + next steps |
| `scout health` | all fetchers | run weekly (cron) to catch silent breakage |

## `scout watch` - the multi-platform feed

Point a watchlist at subreddits + Farcaster users; `scout watch` reads recent items keyless, dedupes against what it already sent, and delivers the fresh top picks to Discord (a webhook, or a bot-token DM). Run it on a cron for a standing feed.

```bash
cp watchlist.example.json watchlist.json   # edit your sources
cp .env.example .env                        # set DISCORD_WEBHOOK (or DISCORD_BOT_TOKEN + DISCORD_USER_ID)
scout watch            # one cycle
DRY_RUN=1 scout watch  # print picks instead of posting
```

```json
// watchlist.json
{ "reddit": ["LocalLLaMA", "ClaudeAI"], "farcaster": ["dwr.eth", "v"], "x": [] }
```

- **Reddit** (subreddit listings) and **Farcaster** (a user's recent casts) work keyless.
- **X is watch-unsupported** - timelines are walled (see [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md)); forward individual X links instead, or fetch a known tweet with `scout-x`.
- Dedup state lives in `~/.zaoscout/seen.json`.

### Optional BYOK synthesis (a grounded "why it matters")

By default `scout watch` delivers links - fully keyless. Add **your own** LLM key and it grounds each pick in its real body (via the keyless fetchers) and attaches a one-sentence "why it matters" - cite-or-drop, so it never free-associates. Bring any one provider:

```bash
# in .env - pick ONE
LLM_PROVIDER=openrouter   # openrouter | anthropic | openai | ollama
LLM_API_KEY=sk-...        # your key (omit for local ollama)
LLM_MODEL=                # optional - sensible default per provider
```

No key = link-only (still works). Unreachable LLM = fail-soft back to link-only. Your key stays in your `.env`, never in the repo.

**Minimal setup is one line.** No Discord required - with no `DISCORD_WEBHOOK` set, `scout watch` appends the feed to `~/.zaoscout/feed.md`. So the whole thing can be just:

```bash
echo 'OPENROUTER_API_KEY=sk-or-v1-...' > .env   # one line: free OpenRouter model + grounded synthesis
scout watch                                      # feed -> ~/.zaoscout/feed.md
```

Add `DISCORD_WEBHOOK=...` later to push to Discord instead of the file.

### `scout digest` - one connected brief

Where `scout watch` gives you a feed of items, `scout digest` synthesizes **all** fresh picks into a single short brief - it names the cross-cutting theme and the most notable items (each with a `[n]` source ref). Two-pass, cite-or-drop, so it grounds in the real posts, not the model's memory. Needs a BYOK key for the synthesis; with no key it falls back to a grouped link digest.

```bash
scout digest            # brief across all fresh picks
DRY_RUN=1 scout digest  # preview
```

### `scout share` - the distribute half (review-first)

Turns the top picks into social-post drafts queued to `~/.zaoscout/drafts.md`. **It never auto-posts** - drafts are for you to review and send. BYOK key -> punchy grounded posts; no key -> clean templates. This closes the capture -> synthesize -> distribute loop (see [docs/CAPTURE-DISTRIBUTE.md](docs/CAPTURE-DISTRIBUTE.md)).

```bash
scout share             # draft N posts from top picks
DRY_RUN=1 scout share   # preview, queues nothing
```

### Memory: continuity across runs

With a BYOK key, `scout digest` remembers. It extracts a topic tag per item into `~/.zaoscout/memory/themes.json` and archives each brief to `memory/log.md`. The next digest reads the recurring themes back as context, so the brief can say "this continues the agent-memory thread from last week" instead of treating every run as new. No key -> the log still archives the link lists (a searchable history), themes are skipped.

This is the capture engine for the loop in [docs/CAPTURE-DISTRIBUTE.md](docs/CAPTURE-DISTRIBUTE.md) - the proven pattern from [farscout](https://github.com/bettercallzaal/farscout) (a Farcaster-only research scout), generalized across platforms on the keyless fetchers.

## Run it free on a schedule (no server)

You do not need a server to get standing, automated scouting. The included GitHub
Actions workflow ([`.github/workflows/digest.yml`](.github/workflows/digest.yml))
runs `scout digest` on GitHub's hosted runners - a **public** repo gets unlimited
free Actions minutes, so this costs nothing and there is no machine to maintain.

Each run keyless-fetches your `watchlist.ci.json`, synthesizes (if you set a key),
delivers, and commits dedup + theme memory + the feed back to `state/` so
continuity survives. Triggered daily by cron plus a manual button.

```bash
# turn on synthesized briefs (optional) - reads your local .env, uploads encrypted, never printed
grep '^OPENROUTER_API_KEY=' .env | cut -d= -f2- | gh secret set OPENROUTER_API_KEY -R <owner>/<repo>
# fire one now instead of waiting for the cron
gh workflow run "scout digest" -R <owner>/<repo>
```

With no secrets it still runs and commits a grouped link digest to `state/feed.md`.
Add `DISCORD_WEBHOOK` to push to a channel instead. Full guide: [docs/SCHEDULED.md](docs/SCHEDULED.md).

## Roadmap: capture -> synthesize -> distribute

ZAOscout v1 is the **capture** layer. The larger vision is a media-intelligence loop: capture good information from media, synthesize it once, and distribute it everywhere. The mining workflow (`workflows/mine.js`) is the push-discovery half (find signal from known authors). See [docs/CAPTURE-DISTRIBUTE.md](docs/CAPTURE-DISTRIBUTE.md).

## A note on fragility

Public mirrors get rate-limited and occasionally blocked; the techniques platforms allow shift over time. `scout-reddit` tries a list of Redlib instances until one answers; refresh that list from [redlib-instances](https://github.com/redlib-org/redlib-instances) if they all die. Run `scout health` to know the moment something breaks instead of silently fetching nothing.

## Use it from any agent (MCP)

ZAOscout ships a zero-dep MCP server so any MCP client (Claude Desktop/Code, Cursor, Cline) can call it as tools - `scout_fetch` (any post by URL) and `scout_digest` (a watchlist brief). See [docs/MCP.md](docs/MCP.md).

```json
{ "mcpServers": { "zaoscout": { "command": "node", "args": ["/path/to/ZAOscout/mcp/server.js"] } } }
```

## A platform: API + tiers claimed with social capital

> Optional / advanced. This layer needs an always-on server and only matters when
> *other people* hit your instance. For solo use, the CLI + MCP + free scheduled
> digest above cover everything. This is parked by default - see [STATUS.md](STATUS.md).

Beyond the CLI/MCP, ZAOscout runs as an HTTP API anyone can hit - keyless fetch + digest for everyone, with **tiers you claim using Farcaster OR ZAO Respect** (reputation, not dollars), and every call logged to a public chart.

```bash
PORT=8799 node api/server.js     # GET /fetch  POST /digest  POST /claim  GET /chart
```

| Tier | Claim with | Calls/day | Synthesis |
|------|-----------|-----------|-----------|
| anon | nothing | 50 | no |
| fc_basic | Farcaster 50+ followers | 300 | no |
| fc_pro | Farcaster 1000+ followers | 1500 | yes |
| respect | any ZAO Respect / ZOLs | 5000 | yes |

`POST /claim {fid}` or `{respectId}` -> a token carrying your tier. **Fully keyless** - Farcaster follower counts come from Haatz (free, Neynar-compatible), no Neynar bill. Deploy anywhere with a container (Railway/Render/Fly/Cloud Run/own VPS) via the included `Dockerfile`. See [docs/API.md](docs/API.md) + [docs/TIERS.md](docs/TIERS.md). The `/scout` Claude Code skill lives in `skills/scout/`.

## Documentation

| Doc | What |
|-----|------|
| [STATUS.md](STATUS.md) | Current state, what is shipped vs parked, how to resume. Read first. |
| [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md) | The keyless method, per platform, and why common techniques are dead. |
| [docs/SCHEDULED.md](docs/SCHEDULED.md) | Free serverless scheduled runs (GitHub Actions + local cron). |
| [docs/CAPTURE-DISTRIBUTE.md](docs/CAPTURE-DISTRIBUTE.md) | The capture -> synthesize -> distribute loop and mining. |
| [docs/MCP.md](docs/MCP.md) | Use ZAOscout from any AI agent via MCP. |
| [docs/DISCORD.md](docs/DISCORD.md) | `/research <url or topic>` slash command - ask in Discord, get a grounded brief back. |
| [docs/API.md](docs/API.md) | The HTTP API surface. |
| [docs/TIERS.md](docs/TIERS.md) | Social-capital tiers (Farcaster / ZAO Respect). |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Architecture, how to add a source, conventions. |
| [SECURITY.md](SECURITY.md) | Secret hygiene and the keyless guarantee. |

## License

MIT. Built in the [ZAO](https://thezao.com) lab. Fork it freely - it is designed to stand alone.
