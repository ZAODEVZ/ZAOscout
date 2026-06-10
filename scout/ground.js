// ground.js - fetch the FULL body of a pick via the keyless fetchers, so the
// (optional) brain synthesizes over real content, never the model's stale memory.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const pexec = promisify(execFile);
const SCOUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'scout');

export async function groundBody(pick) {
  try {
    const { stdout } = await pexec(SCOUT, [pick.url], { timeout: 30000, maxBuffer: 6 * 1024 * 1024 });
    // strip the tool's own header lines; keep the content
    return stdout.split('\n').filter((l) => !/^===|^\[scout\]|^via Redlib/.test(l)).join('\n').trim();
  } catch { return ''; }
}
