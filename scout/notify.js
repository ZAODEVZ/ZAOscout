// notify.js - deliver picks to Discord, zero-dep (raw REST, no discord.js).
// Prefers a webhook (simplest); falls back to a bot-token DM to a user id, then
// to a local feed file so a digest is never silently lost.
const API = 'https://discord.com/api/v10';
const MAX_RETRIES = Number(process.env.SCOUT_DISCORD_RETRIES || 3);

export function render(picks) {
  if (!picks.length) return null;
  const lines = picks.map((p) => {
    const tag = p.source === 'reddit' ? `r/${p.sub}` : p.source === 'farcaster' ? `@${p.user}` : p.source;
    const why = p.why ? `\n  ${p.why}` : '';
    return `- [${tag}] ${p.title}${why}\n  ${p.url}`;
  });
  return `**ZAOscout - ${picks.length} new**\n` + lines.join('\n');
}

// Discord rejects messages over 2000 chars, so split into <=1900-char chunks.
export function chunkText(text) {
  return text.match(/[\s\S]{1,1900}/g) || [];
}

// POST JSON to Discord, honoring its 429 rate-limit. Discord 429s routinely when
// posting several chunks in quick succession; treating that as a hard failure
// abandoned Discord and dumped the digest to a file. Now we wait out retry_after
// and retry, so a transient rate limit no longer downgrades delivery.
async function postJson(url, payload, headers) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
    if (r.status === 429 && attempt < MAX_RETRIES) {
      let wait = Number(r.headers.get('retry-after')) || 0; // seconds (may be fractional)
      if (!wait) { try { wait = Number((await r.clone().json()).retry_after) || 0; } catch {} }
      await new Promise((res) => setTimeout(res, Math.min(Math.max(wait, 0) * 1000, 15000)));
      continue;
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r;
  }
}

export async function notify(picks) {
  return deliver(render(picks), picks.length);
}

// Deliver an arbitrary string through the same surfaces (used by `scout digest`).
export async function notifyText(text) {
  return deliver(text, 1);
}

async function deliver(text, count) {
  if (!text) return { delivered: 0, via: 'none' };
  if (process.env.DRY_RUN) { console.log('[dry-run]\n' + text); return { delivered: count, via: 'dry-run' }; }

  const picks = { length: count };
  const chunks = chunkText(text);

  const hook = process.env.DISCORD_WEBHOOK;
  if (hook) {
    try {
      for (const chunk of chunks) await postJson(hook, { content: chunk }, { 'Content-Type': 'application/json' });
      return { delivered: picks.length, via: 'webhook' };
    } catch (e) {
      // Never surface the webhook URL (it's a credential). Fall through to file.
      console.error(`[scout] webhook delivery failed (${e.message}); falling back to file.`);
    }
  }

  const token = process.env.DISCORD_BOT_TOKEN, uid = process.env.DISCORD_USER_ID;
  if (token && uid) {
    try {
      const h = { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' };
      const dmRes = await postJson(`${API}/users/@me/channels`, { recipient_id: uid }, h);
      const dm = await dmRes.json();
      if (!dm?.id) throw new Error('no DM channel id');
      for (const chunk of chunks) await postJson(`${API}/channels/${dm.id}/messages`, { content: chunk }, h);
      return { delivered: picks.length, via: 'bot-dm' };
    } catch (e) {
      // Sanitized error only - never log headers/token. Fall through to file.
      console.error(`[scout] bot-DM delivery failed (${e.message}); falling back to file.`);
    }
  }
  // Default (no Discord configured): append to a local markdown feed file. Zero env.
  const { default: fs } = await import('node:fs');
  const { default: os } = await import('node:os');
  const { default: path } = await import('node:path');
  const dir = process.env.SCOUT_STATE_DIR || path.join(os.homedir(), '.zaoscout');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'feed.md');
  fs.appendFileSync(file, `\n---\n${text}\n`);
  console.log(text);
  console.error(`[scout] appended to ${file} (set DISCORD_WEBHOOK to push to Discord instead).`);
  return { delivered: picks.length, via: 'file' };
}
