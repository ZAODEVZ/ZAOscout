// env.js - zero-dep .env loader shared by the CLI entrypoints (watch/digest/share).
// This was copy-pasted into all three and silently dropped `export KEY=val` lines;
// centralizing it fixes that once and makes the parsing testable.
import fs from 'node:fs';

// Parse .env text into a {KEY: value} object. Supports:
//   KEY=val | export KEY=val | # comments | blank lines | CRLF
//   balanced single/double quotes (stripped) | `=` inside the value
export function parseDotenv(text) {
  const out = {};
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '');                 // tolerate CRLF
    if (/^\s*#/.test(line) || !line.trim()) continue;    // comment / blank
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

// Load `file` into `env` (default process.env) WITHOUT overriding existing keys -
// real env always wins. Missing file is fine (env-only / zero-config).
export function loadDotenv(file, env = process.env) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return env; }
  const parsed = parseDotenv(text);
  for (const k of Object.keys(parsed)) if (!(k in env)) env[k] = parsed[k];
  return env;
}
