# Contributing / forking ZAOscout

ZAOscout is built to be forked. There are no API keys to provision, no database,
and no build step - a clone runs immediately. This guide covers the architecture,
how to add a source, and the conventions that keep it forkable.

## Run it locally

```bash
git clone <your-fork> && cd ZAOscout
./setup.sh                 # chmod the fetchers, dependency check, optional PATH add
scout https://www.reddit.com/r/LocalLLaMA/comments/...
scout health               # confirm all three fetchers still answer
node --test                # run the unit tests
```

Requirements: `bash`, `curl`, `python3`, `node >= 18`. All standard on macOS/Linux.

## Architecture in one screen

Two layers, cleanly separated:

- **Fetch layer (`bin/`)** - pure bash + `curl` + `python3`. Keyless. Each fetcher
  reads one platform through a free public mirror and prints clean text. No node,
  no dependencies. This is the part that must never need a secret.
- **Engine layer (`scout/`)** - node ESM modules that orchestrate fetch -> triage
  -> optional BYOK synthesis -> deliver, with memory. Zero npm dependencies (Node
  built-ins only). Each module does one thing:

  | Module | Responsibility |
  |--------|----------------|
  | `reader.js` | parse fetcher output into items; input validation |
  | `triage.js` | dedup vs seen + round-robin source diversity |
  | `state.js` | `seen.json` dedup store |
  | `brain.js` | optional BYOK LLM: why-it-matters, digest, themes, social post |
  | `ground.js` | re-fetch full body for a pick (+ optional web context) |
  | `search.js` | optional Exa web context (BYOK) |
  | `memory.js` | themes.json + log.md continuity store |
  | `watch.js` / `digest.js` / `share.js` | the three orchestrators |
  | `notify.js` | deliver to Discord webhook / bot-DM / local file |

- **Surfaces** wrap the engine: `mcp/server.js` (MCP), `api/server.js` (HTTP API),
  `skills/scout/` (Claude Code skill), `.github/workflows/digest.yml` (scheduled).

## Add a new source (the common contribution)

1. Write `bin/scout-<platform>` - take a URL or id, fetch through a keyless mirror
   that emulates the platform's first-party client, print clean text. Validate
   input (see the regex guards in existing fetchers). Fail loudly, never silently.
2. Route it in `bin/scout` - add a host case to the dispatcher.
3. Parse it in `scout/reader.js` - add a `parse<Platform>` exporting `{ id, title,
   url, source, engagement }` items, and a validator.
4. Add it to `scout health` so breakage is visible.
5. Add a unit test in `test/` for the parser (sample fixture in, items out).

The unifying rule: **find the mirror that looks like the platform's own client.**
That is why Redlib (Reddit Android app), FxTwitter (X data path), and Haatz
(Farcaster hub) work without keys. See [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md).

## Conventions (what keeps it forkable)

- **Keyless-first.** The fetch layer must work with zero secrets. Anything that
  needs a key (LLM synthesis, Exa, Discord) is optional and BYOK, read from `.env`,
  and the code fail-softs to the keyless behavior when the key is absent.
- **Fail-soft, never silent.** A dead mirror or an unreachable LLM degrades to a
  simpler result (link-only), and `scout health` surfaces breakage. Do not swallow
  errors into empty output.
- **No npm dependencies in the engine.** Node built-ins only. This is why a clone
  runs with no `npm install`.
- **No secrets in the repo.** `.env` is gitignored. Never log a webhook URL, token,
  or key. See [SECURITY.md](SECURITY.md).
- **Tests:** `node --test`. Cover the parser and any new logic. CI runs node
  18/20/22 + shellcheck on every push.

## Pull requests

- Branch off `main`, keep changes focused, run `node --test` before pushing.
- Describe what mirror/technique a new fetcher uses and why it is keyless.
- Bump the version in `package.json` for user-facing changes.

## Where to start reading

[STATUS.md](STATUS.md) (current state + roadmap) -> [README.md](README.md)
(features) -> [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md) (the method).
