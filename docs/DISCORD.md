# `/research` in Discord

Type `/research <url or topic>` in your Discord server and ZAOscout fetches it (keyless) and posts a grounded brief back in the channel.

```
/research https://www.reddit.com/r/LocalLLaMA/comments/...
/research https://x.com/someone/status/123
/research what are people saying about the CEF creator sprint
```

It reuses the keyless fetchers for URLs (Reddit / X / Farcaster / GitHub / web), Exa for topic search (if `EXA_API_KEY` is set), and your BYOK LLM for synthesis.

There are two ways to run it. **The gateway bot is the recommended one** - it needs no domain, no TLS, no open ports.

---

## Option A (recommended): Gateway bot - no domain, no HTTPS

The bot connects *out* to Discord over a websocket (the same way farscout already runs) and listens for `/research`. Nothing inbound - no public URL, no reverse proxy, no certificate. Runs as a service on any box with the bot token. Zero-dep: uses Node 22's built-in `WebSocket` (no discord.js).

**Requires Node >= 22** (for the global `WebSocket`).

### Setup
1. You already have a Discord app. Grab from the [Developer Portal](https://discord.com/developers/applications):
   - **Application ID** -> `DISCORD_APP_ID`
   - **Bot token** -> `DISCORD_BOT_TOKEN` (the bot's token; `DISCORD_TOKEN` is also accepted)
2. **Leave the app's "Interactions Endpoint URL" BLANK.** If it's set, Discord delivers interactions over HTTP instead of the gateway and the bot won't see them.
3. Put values in `.env` (LLM + Exa keys too):
   ```bash
   DISCORD_BOT_TOKEN=...
   DISCORD_APP_ID=...
   DISCORD_GUILD_ID=...      # your ZABAL server id -> instant command registration (omit = global, ~1h)
   OPENROUTER_API_KEY=...    # or LLM_PROVIDER/LLM_API_KEY, ANTHROPIC_API_KEY, etc.
   EXA_API_KEY=...           # optional - web search for free-text topics
   ```
4. Register the slash command (once): `npm run discord-register` (or `node bin/scout-discord-register`).
5. Invite the bot: Developer Portal -> OAuth2 -> URL Generator -> scopes `applications.commands` (+ `bot`), open the URL, add it to ZABAL.
6. Run the bot:
   ```bash
   npm run discord-bot        # foreground test
   ```
   To run it as a service (systemd), a unit template is at `scripts/zaoscout-discord-bot.service` (edit `WorkingDirectory`/`EnvironmentFile` paths):
   ```bash
   cp scripts/zaoscout-discord-bot.service ~/.config/systemd/user/
   systemctl --user daemon-reload
   systemctl --user enable --now zaoscout-discord-bot.service
   systemctl --user status zaoscout-discord-bot.service
   ```

That's it. `/research` works in any channel the bot can see.

---

## Option B: HTTP interactions endpoint (needs a public HTTPS URL)

If you'd rather run it inside the HTTP API (`api/server.js`) - e.g. you already expose it behind HTTPS - it also handles Discord interactions at `POST /discord`, Ed25519-verified.

1. Same app values, plus the **Public Key** -> `DISCORD_PUBLIC_KEY` (this verifies Discord's signatures).
2. Expose the API over HTTPS (e.g. Caddy auto-TLS in front of `:8799`, or any reverse proxy) at a public domain.
3. Set the app's **Interactions Endpoint URL** = `https://<your-host>/discord` (Discord sends a test PING; it saves only if the signature check passes, so the server must be live with `DISCORD_PUBLIC_KEY` set).
4. Register the command: `npm run discord-register`. Invite the bot as above.

Use this only if you already have HTTPS ingress. Otherwise Option A is simpler.

---

## Notes
- **Keyless-first:** with no LLM key, `/research` still replies with the fetched content (just unsynthesized). Without `EXA_API_KEY`, topic (non-URL) queries lean on the model and flag thin context - paste a direct URL for best results.
- **Security:** Option A holds the bot token + LLM keys server-side and never opens an inbound port. Option B rejects any request whose Ed25519 signature doesn't verify.
- **Cost:** each `/research` is one LLM call (+ one Exa call for topics).
- **One app, two transports:** don't run both A and B for the same app at once - if an Interactions Endpoint URL is set, the gateway bot stops receiving interactions.
