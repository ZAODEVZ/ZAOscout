# ZAOscout MCP server

Expose the keyless scout to any MCP client (Claude Desktop, Claude Code, Cursor, Cline). Zero dependencies - it's a stdio JSON-RPC server in `mcp/server.js`.

## Tools

- `scout_fetch({ url })` - fetch a Reddit / X (incl. Articles) / Farcaster post by URL, keyless, full body.
- `scout_digest({ reddit, farcaster, top })` - read a watchlist, dedupe, return the top fresh items (a synthesized brief if a BYOK LLM key is set on the server).

## Install (Claude Desktop / Claude Code)

Add to your MCP config (`claude_desktop_config.json` or `.mcp.json`):

```json
{
  "mcpServers": {
    "zaoscout": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/ZAOscout/mcp/server.js"]
    }
  }
}
```

Optional env on the server entry:
- `OPENROUTER_API_KEY` (or any BYOK provider) - turns on synthesis in `scout_digest`.
- `SCOUT_LOG_URL` - POST each tool call to your usage endpoint (the "chart").
- `SCOUT_USER` - an identifier attributed in the usage log.

Then ask your agent: *"use scout_fetch to read this reddit thread"* or *"run scout_digest on r/LocalLLaMA + r/ClaudeAI"*.

## How it works

The MCP server shells out to the same keyless fetchers (`bin/scout`) and the digest pipeline (`scout/digest.js`), so it inherits everything: Redlib/FxTwitter/Haatz, dedup, BYOK synthesis, and (server-side) the memory layer.
