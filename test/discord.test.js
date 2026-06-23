import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  publicKeyFromHex,
  verifyRequest,
  commandQuery,
  handleInteraction,
  RESEARCH_COMMAND,
} from '../api/discord.js';
import { looksLikeUrl } from '../scout/research.js';
import { parseInteraction } from '../scout/discord-bot.js';

// Make a real Ed25519 keypair and return { publicHex, sign(msg)->sigHex } so the
// signature tests exercise the actual crypto path Discord uses.
function makeKeypair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const spki = publicKey.export({ format: 'der', type: 'spki' }); // 12-byte prefix + 32-byte key
  const publicHex = Buffer.from(spki.subarray(spki.length - 32)).toString('hex');
  const sign = (msg) => crypto.sign(null, Buffer.from(msg), privateKey).toString('hex');
  return { publicHex, sign };
}

test('publicKeyFromHex accepts a 32-byte key, rejects wrong length', () => {
  const { publicHex } = makeKeypair();
  assert.ok(publicKeyFromHex(publicHex));
  assert.throws(() => publicKeyFromHex('abcd'));
});

test('verifyRequest accepts a valid signature over timestamp+body', () => {
  const { publicHex, sign } = makeKeypair();
  const ts = '1700000000';
  const body = JSON.stringify({ type: 1 });
  const sig = sign(ts + body);
  assert.equal(verifyRequest(body, sig, ts, publicHex), true);
});

test('verifyRequest rejects a tampered body, wrong key, and missing parts', () => {
  const { publicHex, sign } = makeKeypair();
  const ts = '1700000000';
  const body = JSON.stringify({ type: 2, data: { name: 'research' } });
  const sig = sign(ts + body);
  assert.equal(verifyRequest('{"type":1}', sig, ts, publicHex), false); // tampered body
  const other = makeKeypair();
  assert.equal(verifyRequest(body, sig, ts, other.publicHex), false);   // wrong key
  assert.equal(verifyRequest(body, '', ts, publicHex), false);          // no signature
  assert.equal(verifyRequest(body, sig, '', publicHex), false);         // no timestamp
});

test('handleInteraction answers a PING with a PONG', () => {
  const { response, followup } = handleInteraction({ type: 1 });
  assert.deepEqual(response, { type: 1 });
  assert.equal(followup, null);
});

test('handleInteraction defers a /research command and queues a followup', () => {
  const interaction = {
    type: 2,
    token: 'interaction-token',
    data: { name: 'research', options: [{ name: 'query', value: 'https://example.com' }] },
  };
  const { response, followup } = handleInteraction(interaction, { appId: 'app123' });
  assert.equal(response.type, 5); // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
  assert.equal(typeof followup, 'function');
});

test('handleInteraction asks for input when /research has no query', () => {
  const { response, followup } = handleInteraction({ type: 2, data: { name: 'research', options: [] } });
  assert.equal(response.type, 4);
  assert.match(response.data.content, /url or topic/i);
  assert.equal(followup, null);
});

test('commandQuery extracts the query option', () => {
  assert.equal(
    commandQuery({ data: { options: [{ name: 'query', value: '  hello  ' }] } }),
    'hello',
  );
  assert.equal(commandQuery({ data: {} }), '');
});

test('RESEARCH_COMMAND is a valid chat-input command with a required string query', () => {
  assert.equal(RESEARCH_COMMAND.name, 'research');
  assert.equal(RESEARCH_COMMAND.type, 1);
  const opt = RESEARCH_COMMAND.options[0];
  assert.equal(opt.name, 'query');
  assert.equal(opt.type, 3);
  assert.equal(opt.required, true);
});

test('parseInteraction extracts a /research gateway interaction', () => {
  const payload = {
    t: 'INTERACTION_CREATE',
    d: {
      id: 'i1',
      token: 'tok',
      type: 2,
      data: { name: 'research', options: [{ name: 'query', value: 'https://x.com/a/status/1' }] },
    },
  };
  const parsed = parseInteraction(payload);
  assert.deepEqual(parsed, { interactionId: 'i1', interactionToken: 'tok', query: 'https://x.com/a/status/1' });
});

test('parseInteraction ignores non-research and non-interaction events', () => {
  assert.equal(parseInteraction({ t: 'MESSAGE_CREATE', d: {} }), null);
  assert.equal(parseInteraction({ t: 'INTERACTION_CREATE', d: { type: 2, data: { name: 'other' } } }), null);
  assert.equal(parseInteraction({ t: 'INTERACTION_CREATE', d: { type: 1 } }), null); // PING
  assert.equal(parseInteraction(null), null);
});

test('looksLikeUrl distinguishes fetchable URLs from topics', () => {
  assert.equal(looksLikeUrl('https://www.reddit.com/r/LocalLLaMA/comments/abc/'), true);
  assert.equal(looksLikeUrl('https://x.com/someone/status/123'), true);
  assert.equal(looksLikeUrl('what are people saying about CEF'), false); // has spaces
  assert.equal(looksLikeUrl('reddit.com/r/foo'), false);                 // no scheme
});
