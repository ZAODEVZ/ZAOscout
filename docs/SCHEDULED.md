# Scheduled runs - free and serverless

ZAOscout can run on a schedule with **no server and no cost**. The default path
is GitHub Actions; a local-cron alternative is below.

## GitHub Actions (recommended, free)

The workflow at [`.github/workflows/digest.yml`](../.github/workflows/digest.yml)
runs `scout digest` on GitHub's hosted runners. A **public** repo gets unlimited
free Actions minutes, so this costs nothing and needs no machine of your own.

### What one run does

1. Checks out the repo on an `ubuntu-latest` runner.
2. Runs `node scout/digest.js` with:
   - `SCOUT_WATCHLIST=watchlist.ci.json` (the sources to scan)
   - `SCOUT_STATE_DIR=state/` (where dedup + memory + feed live)
3. The engine: keyless-fetches the watchlist (Redlib/FxTwitter/Haatz), triages and
   dedupes against `state/seen.json`, optionally synthesizes a brief (if a BYOK key
   secret is set), and delivers.
4. Commits `state/` back to the repo, so dedup and theme-continuity persist across
   runs. (Each run starts from scratch otherwise - the committed state IS the memory.)

### Triggers

- **Cron:** `'0 13 * * *'` - daily at 13:00 UTC (~9am US Eastern). Edit the cron line to change cadence.
- **Manual:** the **Run workflow** button on the Actions tab, or `gh workflow run "scout digest"`.

### Secrets (all optional, set under repo Settings -> Secrets and variables -> Actions)

| Secret | Effect if set | If absent |
|--------|---------------|-----------|
| `OPENROUTER_API_KEY` | Turns on synthesized briefs (free-tier OpenRouter model). | Digest is a grouped link list - still useful. |
| `DISCORD_WEBHOOK` | Pushes the brief to a Discord channel. | The brief is committed to `state/feed.md` - read it in the repo. |

Add the OpenRouter key without ever printing it (reads your local `.env`, uploads encrypted):

```bash
grep '^OPENROUTER_API_KEY=' .env | cut -d= -f2- | gh secret set OPENROUTER_API_KEY -R <owner>/<repo>
```

### Where the output lands

- **With `DISCORD_WEBHOOK`:** your channel.
- **Without it:** `state/feed.md` (newest appended), readable on GitHub. Theme memory accrues in `state/memory/`.
- **Run logs:** the Actions tab.

### Tuning

- **Cadence:** the `cron` line in `digest.yml`. [crontab.guru](https://crontab.guru) helps.
- **Sources:** `watchlist.ci.json` - `{ "reddit": [...subs], "farcaster": [...handles], "x": [] }`. (X timelines are walled; leave `x` empty - forward individual links instead.)
- **How many picks:** `SCOUT_TOP` env in the workflow (default 12).

### A second cron for distribution (optional)

To also draft social posts, copy `digest.yml` to `share.yml`, swap `scout/digest.js`
for `scout/share.js`, and it will write review-first drafts to `state/drafts.md`.
It never auto-posts.

## Local cron alternative (your machine, also free)

If you would rather it run on your own machine than GitHub:

```bash
# crontab -e  (macOS/Linux)
0 9 * * *  cd /path/to/ZAOscout && /usr/bin/env scout digest >> ~/.zaoscout/cron.log 2>&1
```

On macOS, a `launchd` plist is the more reliable equivalent of a user cron. Either
way, state lives in `~/.zaoscout/` by default (override with `SCOUT_STATE_DIR`).

## Why not a hosted always-on server?

You do not need one for scheduled scouting - a cron-style runner that wakes,
fetches, delivers, and sleeps is enough, and GitHub Actions does that for free. An
always-on server is only required for the **public HTTP API** (so other people /
agents can hit your instance on demand). That layer is parked - see
[STATUS.md](../STATUS.md). If you do want it later, the `Dockerfile` deploys to any
container host.
