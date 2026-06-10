# How ZAOscout works (and why the usual tricks are dead)

The one idea: **platforms block generic scrapers but trust their own first-party clients.** Reach each platform through a mirror that looks like that client, and you get the full content with no key.

## Reddit - via Redlib

The trick most tutorials show you - append `.json` to any Reddit URL - **is dead** (as of ~mid-2026). Reddit now double-gates unauthenticated requests on:

1. **IP reputation** - datacenter IPs (AWS/GCP/etc.) are blocked outright.
2. **TLS / client fingerprint** - even from a residential IP, a plain HTTP client (`curl`, `node-fetch`, `python-requests`) is challenged. A real browser passes; a script does not.

So `curl .../.json` returns a block page even from a home connection. Headless-shell browsers get fingerprinted too.

**Redlib** sidesteps both by emulating the official Reddit **Android app** - same headers, same tokens - so Reddit serves it like its own traffic. `scout-reddit` reads through a list of public Redlib instances (trying each until one answers), resolves `/s/` mobile share links to their canonical `/comments/` URL first, and parses the no-JS HTML into title + body + comments.

Tradeoff: public instances get rate-limited and Reddit periodically blocks them. The instance list needs occasional refreshing (from [redlib-instances](https://github.com/redlib-org/redlib-instances)). `scout health` tells you when it breaks.

## X / Twitter - via FxTwitter

The syndication endpoint (`cdn.syndication.twimg.com`) returns a tweet's text but **not** the body of a long-form X **Article** - only its title + preview. Guest-token GraphQL timelines are gated (an `UserTweets` call returns an empty timeline in 2026). A logged-in cookie works but isn't keyless.

**FxTwitter** (`api.fxtwitter.com/status/<id>`) wraps X's richer internal data and exposes `tweet.article.content.blocks` - the **full Article body** as draft-js blocks, which `scout-x` renders to markdown. Plain tweets, media, and counts come back too. Handle-optional: a bare tweet ID works.

What's still walled: **timelines** (an account's feed) - those need an auth cookie or a paid API. Single tweets/articles by URL or ID are fully open.

## Farcaster - via Haatz

Farcaster is an open protocol, so there's no gate to bypass - you just need a hub. **Haatz** (`haatz.quilibrium.com`) is a free public Snapchain hub read-mirror implementing the standard Farcaster hub HTTP API, no auth.

Share URLs are `farcaster.xyz/<username>/<0xSHORTHASH>` - only a username + an 8-char hash prefix. `scout-farcaster` resolves the username to an FID via `/v1/userNameProofByName` (works for both `.eth`/ENS and fname), then prefix-matches the short hash against recent casts. Falls back to a profile + recent-casts view for a bare handle or FID.

Limit: a very old cast from a prolific account may fall outside the recent window - then you need the full 40-char hash for a direct `/v1/castById`.

## The general principle

When a platform blocks you, don't fight the gate - find the mirror that looks like the platform to itself:

- Reddit -> the thing that looks like the Reddit app (Redlib)
- X -> the thing that wraps X's own data path (FxTwitter)
- Farcaster -> the protocol itself (any hub)

And because these are moving targets, ship a health-check (`scout health`) so a silent break surfaces immediately instead of quietly returning nothing.
