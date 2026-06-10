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
| **Farcaster** | [Haatz](https://haatz.quilibrium.com) (public Snapchain hub mirror) | cast text + embeds, profile, recent casts |

No secrets means it's forkable: a clone works immediately, and it survives any repo reset because there's nothing to configure.

See [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md) for the full method (and why the techniques most tutorials show you are already dead).

## Quickstart

```bash
git clone <this-repo> && cd ZAOscout
./setup.sh                 # chmod + dependency check, optionally adds bin/ to PATH
scout https://www.reddit.com/r/LocalLLaMA/comments/...
scout health               # verify all three fetchers still work
```

Requirements: `bash`, `curl`, `python3` (all standard on macOS/Linux). That's it.

## The fetchers

| Command | Source | Notes |
|---------|--------|-------|
| `scout <url>` | auto-routes by host | the one you'll use |
| `scout-reddit <url-or-/s/-link>` | Redlib (multi-instance fallback) | resolves `/s/` share links to canonical |
| `scout-x <url-or-tweet-id>` | FxTwitter | renders draft-js Article blocks to markdown |
| `scout-farcaster <url-or-fid>` | Haatz | resolves `@handle` -> FID, short-hash -> full cast |
| `scout health` | all three | run weekly (cron) to catch silent breakage |

## Roadmap: capture -> synthesize -> distribute

ZAOscout v1 is the **capture** layer. The larger vision is a media-intelligence loop: capture good information from media, synthesize it once, and distribute it everywhere. The mining workflow (`workflows/mine.js`) is the push-discovery half (find signal from known authors). See [docs/CAPTURE-DISTRIBUTE.md](docs/CAPTURE-DISTRIBUTE.md).

## A note on fragility

Public mirrors get rate-limited and occasionally blocked; the techniques platforms allow shift over time. `scout-reddit` tries a list of Redlib instances until one answers; refresh that list from [redlib-instances](https://github.com/redlib-org/redlib-instances) if they all die. Run `scout health` to know the moment something breaks instead of silently fetching nothing.

## License

MIT. Built in the [ZAO](https://thezao.com) lab.
