# `/research` - ask ZAOscout in Discord

Drop a URL or a topic in your Discord server with `/research`, and ZAOscout fetches it (keyless) and posts a grounded brief back in the channel.

```
/research https://www.reddit.com/r/LocalLLaMA/comments/...
/research https://x.com/someone/status/123
/research what are people saying about the CEF creator sprint
```

It reuses everything the CLI already does: the keyless fetchers for URLs (Reddit / X / Farcaster / GitHub / web), Exa for topic search (if `EXA_API_KEY` is set), and your BYOK LLM for the synthesis. No `discord.js`, no gateway socket - it rides the existing HTTP API as a signed Interactions endpoint.

## How it works

1. Discord POSTs every interaction to your endpoint, **Ed25519-signed**. The server verifies the signature (`api/discord.js`) or returns 401 - this is what lets Discord trust the endpoint.
2. A `PING` gets a `PONG`. A `/research` command replies **deferred** ("thinking...") within Discord's 3-second limit, then does the research and **edits the message** with the brief.

## Setup (one time, ~5 min)

### 1. Create the Discord app
- Go to <https://discord.com/developers/applications> -> **New Application**.
- **Bot** tab -> add a bot. Copy the **token** -> `DISCORD_BOT_TOKEN`.
- **General Information** -> copy the **Application ID** -> `DISCORD_APP_ID`, and the **Public Key** -> `DISCORD_PUBLIC_KEY`.

### 2. Get your server (guild) id
- In Discord: User Settings -> Advanced -> enable **Developer Mode**.
- Right-click your ZABAL server -> **Copy Server ID** -> `DISCORD_GUILD_ID` (this makes the command register instantly on just that server; omit it for a global command that takes ~1h to appear).

### 3. Put the values in `.env`
```bash
DISCORD_PUBLIC_KEY=...   # required - verifies signatures
DISCORD_APP_ID=...       # required - edits the reply + registers the command
DISCORD_BOT_TOKEN=...    # required to register the command
DISCORD_GUILD_ID=...     # your ZABAL server (instant); omit for global
# and a BYOK LLM key for the brief (and optionally EXA_API_KEY for topic search):
OPENROUTER_API_KEY=...   # or LLM_PROVIDER/LLM_API_KEY, ANTHROPIC_API_KEY, etc.
EXA_API_KEY=...          # optional - enables web search for free-text topics
```

### 4. Deploy the API server somewhere reachable
The endpoint must be a public HTTPS URL. The repo ships a `Dockerfile` + `fly.toml`:
```bash
npm run api            # local test on :8799
# or deploy (always-on):
fly deploy             # uses the included fly.toml
```
Your endpoint URL is `https://<your-host>/discord`.

### 5. Point Discord at it + register the command
- In the Developer Portal -> your app -> **General Information** -> **Interactions Endpoint URL** = `https://<your-host>/discord`. Discord sends a test PING; it saves only if the signature check passes (so the server must be live with `DISCORD_PUBLIC_KEY` set).
- Register the slash command:
  ```bash
  node bin/scout-discord-register
  ```
- **Invite the bot** to your server: Developer Portal -> **OAuth2 -> URL Generator** -> scopes `applications.commands` (+ `bot`), open the URL, add it to ZABAL.

Now type `/research <url or topic>` in any channel the bot can see.

## Notes
- **Keyless-first:** with no LLM key, `/research` still replies with the fetched content (just not synthesized). With `EXA_API_KEY` unset, topic (non-URL) queries lean on the model and flag that context is thin - paste a direct URL for best results.
- **Security:** the endpoint rejects any request whose Ed25519 signature doesn't verify, so only Discord can drive it. The bot token and LLM keys stay server-side.
- **Cost:** each `/research` is one LLM call (+ one Exa call for topics). Usage is logged to the chart like other tools (`who: discord`).
