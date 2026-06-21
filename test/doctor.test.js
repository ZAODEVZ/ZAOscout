import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const bin = path.join(dir, '..', 'bin', 'scout-doctor');

// Run offline with a controlled env (clears any inherited config) so the report
// is deterministic. The doctor never hits the network.
const run = (env = {}) => {
  const clean = { ...process.env };
  for (const k of ['DISCORD_WEBHOOK', 'DISCORD_BOT_TOKEN', 'DISCORD_USER_ID', 'LLM_API_KEY', 'OPENROUTER_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'OLLAMA_URL', 'OLLAMA_TUNNEL_URL', 'EXA_API_KEY']) delete clean[k];
  return execFileSync(bin, [], { env: { ...clean, SCOUT_WATCHLIST: '/tmp/does-not-exist.json', ...env }, encoding: 'utf-8' });
};

test('fresh clone (no config) reports the keyless defaults and exits 0', () => {
  const out = run();
  assert.match(out, /ZAOscout doctor/);
  assert.match(out, /Discord\s+not set.*local feed file/);
  assert.match(out, /LLM key\s+not set.*link-only/);
  assert.match(out, /watchlist\.json\s+missing/);
  assert.match(out, /core deps present/);
});

test('a configured webhook is reported as posting to Discord', () => {
  const out = run({ DISCORD_WEBHOOK: 'https://discord.test/hook' });
  assert.match(out, /DISCORD_WEBHOOK\s+set\s+-> posts to Discord/);
});

test('a bot token + user id is reported as bot DM', () => {
  const out = run({ DISCORD_BOT_TOKEN: 'tok', DISCORD_USER_ID: '123' });
  assert.match(out, /DISCORD_BOT_TOKEN\s+set\s+-> posts to Discord via bot DM/);
});

test('any LLM key flips synthesis to ready', () => {
  const out = run({ OPENROUTER_API_KEY: 'sk-x' });
  assert.match(out, /LLM key\s+set\s+-> digests get a synthesized/);
});

test('an existing watchlist path is reported as found', () => {
  const out = run({ SCOUT_WATCHLIST: path.join(dir, '..', 'watchlist.ci.json') });
  assert.match(out, /watchlist\.json\s+found/);
});

test('lists deps and always points to scout health for live checks', () => {
  const out = run();
  assert.match(out, /deps:/);
  assert.match(out, /scout health/);
});
