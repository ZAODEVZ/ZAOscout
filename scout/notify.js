// notify.js - deliver picks to Discord, zero-dep (raw REST, no discord.js).
// Prefers a webhook (simplest); falls back to a bot-token DM to a user id.
const API = 'https://discord.com/api/v10';

function render(picks) {
  if (!picks.length) return null;
  const lines = picks.map((p) => {
    const tag = p.source === 'reddit' ? `r/${p.sub}` : p.source === 'farcaster' ? `@${p.user}` : p.source;
    const why = p.why ? `\n  ${p.why}` : '';
    return `- [${tag}] ${p.title}${why}\n  ${p.url}`;
  });
  return `**ZAOscout - ${picks.length} new**\n` + lines.join('\n');
}

export async function notify(picks) {
  const text = render(picks);
  if (!text) return { delivered: 0, via: 'none' };
  if (process.env.DRY_RUN) { console.log('[dry-run]\n' + text); return { delivered: picks.length, via: 'dry-run' }; }

  const hook = process.env.DISCORD_WEBHOOK;
  if (hook) {
    for (const chunk of text.match(/[\s\S]{1,1900}/g)) {
      await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: chunk }) });
    }
    return { delivered: picks.length, via: 'webhook' };
  }

  const token = process.env.DISCORD_BOT_TOKEN, uid = process.env.DISCORD_USER_ID;
  if (token && uid) {
    const h = { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' };
    const dm = await (await fetch(`${API}/users/@me/channels`, { method: 'POST', headers: h, body: JSON.stringify({ recipient_id: uid }) })).json();
    for (const chunk of text.match(/[\s\S]{1,1900}/g)) {
      await fetch(`${API}/channels/${dm.id}/messages`, { method: 'POST', headers: h, body: JSON.stringify({ content: chunk }) });
    }
    return { delivered: picks.length, via: 'bot-dm' };
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
