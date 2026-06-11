import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeBrain } from '../scout/brain.js';

function withEnv(env, fn) {
  const save = { ...process.env };
  for (const k of ['LLM_PROVIDER','LLM_API_KEY','LLM_MODEL','OPENROUTER_API_KEY','ANTHROPIC_API_KEY','OPENAI_API_KEY','OLLAMA_URL','OLLAMA_TUNNEL_URL']) delete process.env[k];
  Object.assign(process.env, env);
  try { return fn(); } finally { process.env = save; }
}

test('no key -> null (link-only)', () => {
  withEnv({}, () => assert.equal(makeBrain(), null));
});

test('explicit BYOK provider+key', () => {
  withEnv({ LLM_PROVIDER: 'openrouter', LLM_API_KEY: 'sk-x' }, () => {
    const b = makeBrain();
    assert.equal(b.provider, 'openrouter');
    assert.ok(b.model.includes('free'));
  });
});

test('auto-detect from OPENROUTER_API_KEY', () => {
  withEnv({ OPENROUTER_API_KEY: 'sk-x' }, () => {
    assert.equal(makeBrain().provider, 'openrouter');
  });
});

test('auto-detect anthropic', () => {
  withEnv({ ANTHROPIC_API_KEY: 'sk-ant' }, () => {
    const b = makeBrain();
    assert.equal(b.provider, 'anthropic');
    assert.ok(b.model.startsWith('claude'));
  });
});

test('byok provider without key -> null', () => {
  withEnv({ LLM_PROVIDER: 'openai' }, () => assert.equal(makeBrain(), null));
});

test('ollama needs no key', () => {
  withEnv({ LLM_PROVIDER: 'ollama' }, () => assert.equal(makeBrain().provider, 'ollama'));
});
