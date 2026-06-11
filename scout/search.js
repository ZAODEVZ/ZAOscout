// search.js - OPTIONAL web context for grounding, BYOK via Exa. No EXA_API_KEY ->
// returns '' and grounding stays body-only. Keeps the keyless default intact.
export async function webContext(query) {
  const key = process.env.EXA_API_KEY;
  if (!key || !query) return '';
  try {
    const r = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: { 'x-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({ query: query.slice(0, 200), numResults: 2, contents: { text: { maxCharacters: 500 } } }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return '';
    const d = await r.json();
    return (d.results || []).map((x) => `- ${x.title}: ${(x.text || '').replace(/\s+/g, ' ').slice(0, 400)}`).join('\n');
  } catch { return ''; }
}
