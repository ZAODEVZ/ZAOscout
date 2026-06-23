#!/usr/bin/env node
// discord-bot.js - ZAOscout /research as a Discord GATEWAY bot. Zero-dep:
// uses Node 22's built-in global WebSocket (no discord.js, no ws).
//
// Why a gateway bot instead of an HTTP interactions endpoint: the bot connects
// OUT to Discord over a websocket, so it needs NO public HTTPS URL, no domain,
// no reverse proxy, no open inbound port. It runs as a worker (like farscout) on
// any box with the bot token. Slash-command interactions are delivered over the
// gateway as long as the app has NO Interactions Endpoint URL set in the portal.
//
// Env: DISCORD_BOT_TOKEN (or DISCORD_TOKEN), DISCORD_APP_ID, plus the BYOK LLM key
// (OPENROUTER_API_KEY / LLM_API_KEY / ...) and optional EXA_API_KEY for topics.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDotenv } from './env.js';
import { commandQuery, runResearchFollowup } from '../api/discord.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
loadDotenv(path.join(dir, '..', '.env'));

const API = 'https://discord.com/api/v10';
const GATEWAY = 'wss://gateway.discord.gg/?v=10&encoding=json';
const Op = { DISPATCH: 0, HEARTBEAT: 1, IDENTIFY: 2, RECONNECT: 7, INVALID_SESSION: 9, HELLO: 10, HEARTBEAT_ACK: 11 };

const token = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
const appId = process.env.DISCORD_APP_ID;

// Pull a /research interaction out of a raw gateway payload, or null if it isn't one.
// Pure + exported so it can be unit-tested without a live socket.
export function parseInteraction(payload) {
  if (!payload || payload.t !== 'INTERACTION_CREATE') return null;
  const d = payload.d || {};
  if (d.type !== 2) return null;                       // APPLICATION_COMMAND
  if (!d.data || d.data.name !== 'research') return null;
  const query = commandQuery(d);
  return { interactionId: d.id, interactionToken: d.token, query };
}

// ACK an interaction with a deferred reply (type 5) so the user sees "thinking..."
// within Discord's 3s window. The brief is edited in afterwards via runResearchFollowup.
async function ackDeferred(interactionId, interactionToken) {
  const url = `${API}/interactions/${interactionId}/${interactionToken}/callback`;
  await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 5 }),
    signal: AbortSignal.timeout(10000),
  });
}

async function handleInteraction(parsed) {
  if (!parsed.query) {
    // Respond directly (type 4) asking for input, no deferral.
    try {
      await fetch(`${API}/interactions/${parsed.interactionId}/${parsed.interactionToken}/callback`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 4, data: { content: 'Give me a URL or a topic: `/research <url or topic>`' } }),
        signal: AbortSignal.timeout(10000),
      });
    } catch {}
    return;
  }
  try {
    await ackDeferred(parsed.interactionId, parsed.interactionToken);
    await runResearchFollowup(appId, parsed.interactionToken, parsed.query);
  } catch (e) {
    console.error('[discord-bot] interaction failed:', e && e.message);
  }
}

// --- gateway connection with heartbeat + reconnect ---
function connect() {
  let hb = null;          // heartbeat timer
  let lastSeq = null;     // last sequence number (for heartbeat + resume)
  let acked = true;       // did the last heartbeat get ACKed?

  const ws = new WebSocket(GATEWAY);

  const send = (obj) => { try { ws.send(JSON.stringify(obj)); } catch {} };
  const stopHb = () => { if (hb) { clearInterval(hb); hb = null; } };

  ws.addEventListener('open', () => console.error('[discord-bot] gateway connected'));

  ws.addEventListener('message', (ev) => {
    let payload;
    try { payload = JSON.parse(ev.data); } catch { return; }
    if (payload.s != null) lastSeq = payload.s;

    switch (payload.op) {
      case Op.HELLO: {
        const interval = payload.d.heartbeat_interval;
        // first beat after a jitter, then on the interval (Discord's required dance)
        setTimeout(() => { if (ws.readyState === WebSocket.OPEN) { acked = false; send({ op: Op.HEARTBEAT, d: lastSeq }); } }, Math.floor(interval * Math.random()));
        hb = setInterval(() => {
          if (!acked) { try { ws.close(4000); } catch {} return; }  // missed ACK -> reconnect
          acked = false; send({ op: Op.HEARTBEAT, d: lastSeq });
        }, interval);
        // identify - intents 0: slash-command interactions arrive regardless of intents
        send({ op: Op.IDENTIFY, d: { token, intents: 0, properties: { os: 'linux', browser: 'zaoscout', device: 'zaoscout' } } });
        break;
      }
      case Op.HEARTBEAT:        send({ op: Op.HEARTBEAT, d: lastSeq }); break;   // server asked for one now
      case Op.HEARTBEAT_ACK:    acked = true; break;
      case Op.RECONNECT:        try { ws.close(4001); } catch {} break;
      case Op.INVALID_SESSION:  try { ws.close(4002); } catch {} break;
      case Op.DISPATCH: {
        if (payload.t === 'READY') console.error(`[discord-bot] ready as ${payload.d?.user?.username || 'bot'}`);
        const parsed = parseInteraction(payload);
        if (parsed) handleInteraction(parsed);
        break;
      }
    }
  });

  const reconnect = () => { stopHb(); setTimeout(connect, 3000); };
  ws.addEventListener('close', (e) => { console.error(`[discord-bot] gateway closed (${e.code}); reconnecting in 3s`); reconnect(); });
  ws.addEventListener('error', (e) => { console.error('[discord-bot] gateway error:', e && e.message); });
}

// Only run the bot when executed directly (not when imported by tests).
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (!token || !appId) {
    console.error('Missing DISCORD_BOT_TOKEN (or DISCORD_TOKEN) and/or DISCORD_APP_ID. See docs/DISCORD.md.');
    process.exit(1);
  }
  console.error('[discord-bot] starting ZAOscout /research gateway bot');
  connect();
}
