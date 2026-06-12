---
name: scout
description: Read Reddit, X (incl. long-form Articles), and Farcaster with no API keys, and run watchlist digests. Use when asked to "scout", "fetch this reddit/x/farcaster link", "what's new in <subreddits/accounts>", or to pull a social post's full content. Keyless - works clone-and-run.
---

# scout

ZAOscout reads social posts keyless (no API keys) and scouts watchlists. Repo: github.com/ZAODEVZ/ZAOscout

## When to use

- The user shares a Reddit / X / Farcaster URL and wants its real content (not the blocked shell or login wall).
- The user asks "what's new in r/X, r/Y" or wants a brief across sources.
- Any "fetch this post / thread / article / cast" for a social link.

## How (CLI - if the repo is cloned at ~/Desktop/repos/ZAOscout)

```bash
S=~/Desktop/repos/ZAOscout/bin/scout
"$S" "<reddit|x|farcaster url>"      # full body + comments/article, keyless
"$S" health                         # verify the fetchers still work
node ~/Desktop/repos/ZAOscout/scout/digest.js   # brief across watchlist.json
```

Routing is automatic by host: reddit.com -> Redlib, x.com -> FxTwitter (incl. Article bodies), farcaster.xyz -> Haatz. X timelines are walled (forward a specific tweet/URL).

## How (MCP - if the zaoscout MCP server is configured)

Call the tools directly: `scout_fetch({ url })` and `scout_digest({ reddit:[...], farcaster:[...], top })`.

## Optional synthesis

If a BYOK LLM key (e.g. `OPENROUTER_API_KEY`) is in the repo's `.env`, the digest synthesizes a grounded "why it matters" + cross-cutting brief (cite-or-drop). No key -> link-only.

## Note

Public mirrors blip/rotate; if a fetch returns nothing, run `scout health`. Don't synthesize off a title - fetch the full body first.
