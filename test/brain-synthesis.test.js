import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeBrain } from '../scout/brain.js';

const realFetch = globalThis.fetch;
const saveEnv = { ...process.env };
afterEach(() => {
  globalThis.fetch = realFetch;
  process.env = { ...saveEnv };
});

// Force a single deterministic provider (openrouter) with a fixed model so call()
// does not rotate through fallbacks, then mock the chat-completions endpoint.
function brainWith(responses) {
  for (const k of ['LLM_PROVIDER', 'LLM_API_KEY', 'OPENROUTER_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'OLLAMA_URL', 'OLLAMA_TUNNEL_URL']) delete process.env[k];
  process.env.OPENROUTER_API_KEY = 'sk-test';
  process.env.LLM_MODEL = 'test/model';
  const requests = [];
  const queue = [...responses];
  globalThis.fetch = async (url, opts) => {
    requests.push({ url, body: JSON.parse(opts.body) });
    const content = queue.shift() ?? '';
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
  };
  return { brain: makeBrain(), requests };
}

const longBody = (s) => s.repeat(60); // >= 40 chars so it is groundable

test('digest numbers items by ORIGINAL index even when a middle item is empty', async () => {
  // Regression: refs in digest.js are numbered over ALL picks; the claims pass
  // must use the same indices so [n] in the brief maps to the right source.
  const { brain, requests } = brainWith(['1. claim A\n2. SKIP\n3. claim C', 'Theme.\n- point [1]\n- point [3]']);
  const items = [
    { title: 'A', body: longBody('a'), tag: 'r/x', url: 'urlA' },
    { title: 'B', body: '', tag: 'r/y', url: 'urlB' },          // fails to ground
    { title: 'C', body: longBody('c'), tag: 'r/z', url: 'urlC' },
  ];
  const brief = await brain.digest(items, []);
  const claimsUser = requests[0].body.messages.find((m) => m.role === 'user').content;
  assert.match(claimsUser, /\[2\] B/);   // empty item kept, with its real index
  assert.match(claimsUser, /\[3\] C/);   // C is [3], not renumbered to [2]
  assert.match(brief, /\[3\]/);          // brief can cite [3] and it lines up
});

test('digest returns empty (no LLM call) when nothing is groundable', async () => {
  const { brain, requests } = brainWith(['should-not-be-used']);
  const out = await brain.digest([{ title: 'x', body: '', url: 'u' }], []);
  assert.equal(out, '');
  assert.equal(requests.length, 0);
});

test('whyItMatters: SKIP -> empty, quotes stripped, short body skipped', async () => {
  let r = brainWith(['SKIP']);
  assert.equal(await r.brain.whyItMatters('t', longBody('z')), '');

  r = brainWith(['"It matters because X."']);
  assert.equal(await r.brain.whyItMatters('t', longBody('z')), 'It matters because X.');

  r = brainWith(['unused']);
  assert.equal(await r.brain.whyItMatters('t', 'tiny'), '');   // body < 40 -> no call
  assert.equal(r.requests.length, 0);
});

test('socialPost: appends url, clamps length, SKIP -> empty', async () => {
  let r = brainWith(['SKIP']);
  assert.equal(await r.brain.socialPost('t', longBody('z'), 'http://u'), '');

  r = brainWith(['x'.repeat(400)]);
  const post = await r.brain.socialPost('t', longBody('z'), 'http://u');
  assert.ok(post.endsWith('\n\nhttp://u'));
  assert.ok(post.replace('\n\nhttp://u', '').length <= 260);
});

test('extractThemes: parses numbered lines, filters SKIP, maps url', async () => {
  const { brain } = brainWith(['1. agent memory\n2. SKIP\n3. local llms']);
  const items = [
    { title: 'A', body: longBody('a'), url: 'urlA' },
    { title: 'B', body: longBody('b'), url: 'urlB' },
    { title: 'C', body: longBody('c'), url: 'urlC' },
  ];
  const pairs = await brain.extractThemes(items);
  assert.deepEqual(pairs, [
    { theme: 'agent memory', url: 'urlA' },
    { theme: 'local llms', url: 'urlC' },   // [2] SKIP dropped
  ]);
});
