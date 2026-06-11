# Security

ZAOscout is a **local, single-user CLI**. The trust boundary is your own machine: you control your `.env`, your watchlist, and the env vars you set. Findings of the form "an attacker who controls `REDLIB_INSTANCES` / `OLLAMA_URL` / `SCOUT_STATE_DIR` could redirect traffic" are **by design** - those are *your* configuration knobs, not remote input. If you run ZAOscout in a context where untrusted parties can set your environment, that's the thing to lock down at the host level.

What ZAOscout does guard:

- **No secrets in the repo or logs.** The BYOK LLM key and any Discord token live only in your gitignored `.env`. Delivery code never logs the webhook URL or `Authorization` header, even on failure (errors are sanitized to a status code).
- **Watchlist input is validated.** Subreddit names, Farcaster handles, and FIDs flowing into fetcher URLs/args are strictly shaped (`[A-Za-z0-9_]`, numeric FID, handle charset) - malformed entries are skipped, not executed. The bash fetchers use `execFile`-style array calls (no shell `eval`).
- **Fail-soft everywhere.** A bad fetch, an LLM timeout, or a Discord error degrades the cycle (skip that item / fall back to the local feed file) rather than crashing.
- **Keyless core.** The fetchers themselves require no credentials, so there's nothing to leak in the default path.

## Reporting

Found something? Open an issue (omit any secret values) or reach the ZAO team. Don't paste keys or tokens into issues.
