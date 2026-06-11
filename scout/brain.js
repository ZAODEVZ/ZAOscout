// brain.js - optional LLM synthesis layer. BYOK: bring your own key, any provider.
//
// Config (all optional - if none set, scout stays link-only and keyless):
//   LLM_PROVIDER  openrouter | anthropic | openai | ollama   (auto-detected if unset)
//   LLM_API_KEY   your key for that provider                 (not needed for ollama)
//   LLM_MODEL     model id                                   (sensible default per provider)
//
// Back-compat: a provider-specific key alone also works -
//   OPENROUTER_API_KEY / ANTHROPIC_API_KEY / OPENAI_API_KEY / OLLAMA_URL
//
// fail-soft: any error returns null and the caller falls back to link-only.

const DEFAULT_MODEL = {
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-4o-mini',
  ollama: 'llama3.1:8b',
};

function resolveConfig() {
  const env = process.env;
  let provider = (env.LLM_PROVIDER || '').toLowerCase();
  let key = env.LLM_API_KEY || '';
  // auto-detect provider from whichever key is present
  if (!provider) {
    if (env.OPENROUTER_API_KEY) { provider = 'openrouter'; key = env.OPENROUTER_API_KEY; }
    else if (env.ANTHROPIC_API_KEY) { provider = 'anthropic'; key = env.ANTHROPIC_API_KEY; }
    else if (env.OPENAI_API_KEY) { provider = 'openai'; key = env.OPENAI_API_KEY; }
    else if (env.OLLAMA_URL || env.OLLAMA_TUNNEL_URL) { provider = 'ollama'; }
  }
  if (!provider) return null;                       // no LLM configured -> link-only
  if (provider !== 'ollama' && !key) return null;   // BYOK provider but no key
  const model = env.LLM_MODEL || DEFAULT_MODEL[provider];
  return { provider, key, model, ollamaUrl: env.OLLAMA_URL || env.OLLAMA_TUNNEL_URL || 'http://localhost:11434' };
}

async function call(cfg, system, user) {
  const t = AbortSignal.timeout(45000);
  if (cfg.provider === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: t,
      headers: { 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: cfg.model, max_tokens: 400, system, messages: [{ role: 'user', content: user }] }),
    });
    const d = await r.json();
    return d?.content?.[0]?.text || null;
  }
  if (cfg.provider === 'ollama') {
    const r = await fetch(`${cfg.ollamaUrl}/api/chat`, {
      method: 'POST', signal: t, headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: cfg.model, stream: false, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    });
    const d = await r.json();
    return d?.message?.content || null;
  }
  // openrouter + openai share the chat-completions shape
  const base = cfg.provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1';
  const r = await fetch(`${base}/chat/completions`, {
    method: 'POST', signal: t,
    headers: { Authorization: `Bearer ${cfg.key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: cfg.model, max_tokens: 400, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  const d = await r.json();
  return d?.choices?.[0]?.message?.content || null;
}

// makeBrain() returns null if no LLM is configured (caller stays link-only).
export function makeBrain() {
  const cfg = resolveConfig();
  if (!cfg) return null;
  return {
    provider: cfg.provider,
    model: cfg.model,
    // synthesize a one-line "why it matters" grounded in the fetched body. cite-or-drop:
    // if the model can't ground it in the provided text, it returns "" and we skip the line.
    async whyItMatters(title, body) {
      if (!body || body.length < 40) return '';
      const system = 'You summarize why a social post matters, in ONE sentence (max 30 words), grounded ONLY in the provided text. If the text is empty or off-topic, reply with exactly "SKIP". No preamble.';
      const user = `TITLE: ${title}\n\nCONTENT:\n${body.slice(0, 4000)}`;
      try {
        const out = (await call(cfg, system, user) || '').trim();
        if (!out || /^skip$/i.test(out)) return '';
        return out.replace(/^["']|["']$/g, '');
      } catch { return ''; }
    },

    // Two-pass digest (farscout pattern): extract one grounded claim per item, then
    // synthesize a connected brief that names the cross-cutting theme. cite-or-drop:
    // every claim carries its item index; the brief references items by [n].
    async digest(items) {
      // items: [{ title, body, tag, url }]
      const grounded = items.filter((it) => it.body && it.body.length >= 40);
      if (!grounded.length) return '';
      const claimsSys = 'For each numbered item, write ONE factual claim (max 20 words) grounded ONLY in its text. Output one line per item as "n. claim". If an item is empty/off-topic, output "n. SKIP". No preamble.';
      const claimsUser = grounded.map((it, i) => `[${i + 1}] ${it.title}\n${it.body.slice(0, 1500)}`).join('\n\n');
      let claims;
      try { claims = (await call(cfg, claimsSys, claimsUser) || '').trim(); } catch { return ''; }
      if (!claims) return '';
      const synthSys = 'You are a research scout. Given a numbered list of claims, write a SHORT brief (max 120 words): one opening sentence naming the single biggest cross-cutting theme, then 2-4 bullet lines on the most notable items, each ending with its [n] reference. Ground only in the claims. No fluff, no preamble.';
      try {
        const brief = (await call(cfg, synthSys, `CLAIMS:\n${claims}`) || '').trim();
        return brief || '';
      } catch { return ''; }
    },
  };
}
