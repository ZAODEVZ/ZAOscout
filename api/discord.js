// discord.js - Discord slash-command (/research) handler, zero-dep.
//
// Flow (Discord Interactions over HTTP):
//   1. Discord POSTs every interaction to our endpoint, signed with Ed25519.
//      We MUST verify the signature (X-Signature-Ed25519 + X-Signature-Timestamp
//      over the raw body) or Discord rejects the endpoint. Bad signature -> 401.
//   2. A PING (type 1) -> reply PONG (type 1). Discord sends this to validate.
//   3. A /research command (type 2) takes longer than Discord's 3s limit, so we
//      reply DEFERRED (type 5) immediately, then do the research and PATCH the
//      original message via the interaction webhook.
//
// No discord.js, no gateway, no always-on socket - it rides the existing HTTP API.
import crypto from 'node:crypto';
import { research, formatResult } from '../scout/research.js';

const API = 'https://discord.com/api/v10';
// SPKI DER prefix for a raw 32-byte Ed25519 public key (so node crypto can load it).
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

const InteractionType = { PING: 1, APPLICATION_COMMAND: 2 };
const InteractionResponseType = { PONG: 1, DEFERRED_CHANNEL_MESSAGE: 5 };

// Discord caps message content at 2000 chars; keep a margin.
const MAX_CONTENT = 1900;

export function publicKeyFromHex(hex) {
  const raw = Buffer.from(String(hex || ''), 'hex');
  if (raw.length !== 32) throw new Error('ed25519 public key must be 32 bytes (64 hex chars)');
  const der = Buffer.concat([ED25519_SPKI_PREFIX, raw]);
  return crypto.createPublicKey({ key: der, format: 'der', type: 'spki' });
}

// Verify the Ed25519 signature Discord attaches to every interaction request.
// `rawBody` MUST be the exact request body string (verification is over
// timestamp + rawBody). Returns true/false, never throws.
export function verifyRequest(rawBody, signatureHex, timestamp, publicKeyHex) {
  try {
    if (!signatureHex || !timestamp || !publicKeyHex) return false;
    const key = publicKeyFromHex(publicKeyHex);
    const msg = Buffer.from(String(timestamp) + String(rawBody));
    const sig = Buffer.from(String(signatureHex), 'hex');
    return crypto.verify(null, msg, key, sig);
  } catch {
    return false;
  }
}

// Pull the `query` option out of a /research command interaction.
export function commandQuery(interaction) {
  const opts = (interaction && interaction.data && interaction.data.options) || [];
  const q = opts.find((o) => o && o.name === 'query');
  return q ? String(q.value || '').trim() : '';
}

// Edit the original deferred reply with the final content (the followup).
async function editOriginal(appId, token, content) {
  const url = `${API}/webhooks/${appId}/${token}/messages/@original`;
  try {
    await fetch(url, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: content.slice(0, MAX_CONTENT) }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    /* the deferred "thinking..." stays if the edit fails - nothing we can do from here */
  }
}

// Do the research and post the result back to the interaction. Runs AFTER we've
// already returned the deferred response, so it has no time limit of its own.
export async function runResearchFollowup(appId, token, query) {
  let content;
  try {
    const result = await research(query);
    content = formatResult(result);
  } catch (e) {
    content = `**Research: "${query}"**\n\nSomething went wrong gathering that. Try again, or paste a direct URL.`;
  }
  await editOriginal(appId, token, content);
}

// Handle a (already signature-verified) interaction body.
// Returns { response, followup } - send `response` as JSON immediately; if
// `followup` is set, run it after responding (it edits the message in place).
export function handleInteraction(interaction, { appId } = {}) {
  const type = interaction && interaction.type;

  if (type === InteractionType.PING) {
    return { response: { type: InteractionResponseType.PONG }, followup: null };
  }

  if (type === InteractionType.APPLICATION_COMMAND) {
    const name = interaction.data && interaction.data.name;
    if (name === 'research') {
      const query = commandQuery(interaction);
      if (!query) {
        return {
          response: { type: 4, data: { content: 'Give me a URL or a topic: `/research <url or topic>`' } },
          followup: null,
        };
      }
      const token = interaction.token;
      return {
        response: { type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE },
        followup: () => runResearchFollowup(appId, token, query),
      };
    }
  }

  // Unknown interaction - acknowledge so Discord doesn't show an error.
  return { response: { type: 4, data: { content: 'Unknown command.' } }, followup: null };
}

// The slash-command definition, used by the register script.
export const RESEARCH_COMMAND = {
  name: 'research',
  type: 1, // CHAT_INPUT
  description: 'Research a URL or topic - ZAOscout fetches it and posts a grounded brief',
  options: [
    {
      name: 'query',
      description: 'A URL (Reddit / X / Farcaster / GitHub / web) or a topic to look into',
      type: 3, // STRING
      required: true,
    },
  ],
};
