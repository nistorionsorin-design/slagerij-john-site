// postinstall — keep Astro's WebAssembly compiler next to the native one on Windows.
//
// Why: Windows Smart App Control blocks the unsigned native compiler
// (@astrojs/compiler-binding-win32-x64-msvc/*.node) on Dan's laptop (STATE.md, 06.10).
// @astrojs/compiler-binding falls back to @astrojs/compiler-binding-wasm32-wasi on its own
// when the native file fails to load. That package is listed in optionalDependencies, but it
// declares cpu: wasm32, so npm skips it (and prunes it) on every install on x64. This script
// puts it back after `npm install` / `npm ci`.
//
// Off Windows (Vercel builds on Linux) it does nothing. It never fails the install: on any
// problem it prints the manual fix and exits 0. Version = the installed compiler-binding's.
import { existsSync, mkdirSync, readFileSync, rmSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = '@astrojs/compiler-binding-wasm32-wasi';
const say = (m) => console.log(`[wasi-compiler] ${m}`);

if (process.platform !== 'win32') process.exit(0);

const bindingPkg = join(root, 'node_modules/@astrojs/compiler-binding/package.json');
if (!existsSync(bindingPkg)) process.exit(0);
const version = JSON.parse(readFileSync(bindingPkg, 'utf8')).version;
const target = join(root, 'node_modules', NAME);
const manual = `npm.cmd install --no-save --force ${NAME}@${version}`;

const installed = () => {
  try { return JSON.parse(readFileSync(join(target, 'package.json'), 'utf8')).version === version; }
  catch { return false; }
};

// Minimal reader for an npm tarball (ustar + pax path records): regular files only, the
// leading "package/" stripped, nothing written outside `dest`. No tar binary needed: Git Bash's
// GNU tar reads "C:" as a remote host, and Windows' tar.exe is not on every PATH.
function untar(buf, dest) {
  const NUL = String.fromCharCode(0);
  let paxPath = null;
  for (let off = 0; off + 512 <= buf.length; ) {
    const h = buf.subarray(off, off + 512);
    if (h.every((b) => b === 0)) break;
    const field = (a, b) => {
      const s = h.subarray(a, b).toString('utf8');
      const end = s.indexOf(NUL);
      return end === -1 ? s : s.slice(0, end);
    };
    const size = parseInt(field(124, 136).trim() || '0', 8);
    const type = h[156] === 0 ? '0' : String.fromCharCode(h[156]);
    const body = buf.subarray(off + 512, off + 512 + size);
    off += 512 + Math.ceil(size / 512) * 512;
    if (type === 'x') {
      const line = body.toString('utf8').split('\n').find((l) => / path=/.test(l));
      paxPath = line ? line.slice(line.indexOf(' path=') + 6) : null;
      continue;
    }
    const prefix = field(345, 500);
    const name = paxPath ?? (prefix ? `${prefix}/${field(0, 100)}` : field(0, 100));
    paxPath = null;
    if (type !== '0') continue;
    const rel = name.replace(/^package\//, '');
    if (!rel || rel.split('/').includes('..')) continue;
    const out = join(dest, rel);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, body);
  }
}

if (!installed()) {
  const tmp = mkdtempSync(join(tmpdir(), 'wasi-compiler-'));
  try {
    const npm = process.env.npm_execpath
      ? [process.execPath, [process.env.npm_execpath]]
      : ['npm.cmd', []];
    const pack = spawnSync(npm[0], [...npm[1], 'pack', `${NAME}@${version}`, '--pack-destination', tmp, '--silent'], {
      cwd: root, encoding: 'utf8', shell: !process.env.npm_execpath,
    });
    const tgz = readdirSync(tmp).find((f) => f.endsWith('.tgz'));
    if (pack.status !== 0 || !tgz) throw new Error(`npm pack failed: ${(pack.stderr || pack.stdout || '').trim()}`);
    rmSync(target, { recursive: true, force: true });
    untar(gunzipSync(readFileSync(join(tmp, tgz))), target);
    if (!installed()) throw new Error('package.json missing after unpacking');
    say(`${NAME}@${version} restored`);
  } catch (err) {
    rmSync(target, { recursive: true, force: true });
    say(`could not restore ${NAME}@${version} (${err.message}). Manual fix in site/: ${manual}`);
    process.exit(0);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// Check that the compiler loads (native or WebAssembly): warn only.
try {
  createRequire(join(root, 'package.json'))('@astrojs/compiler-binding');
} catch (err) {
  say(`Astro compiler does not load: ${String(err.message).split('\n')[0]}. Manual fix in site/: ${manual}`);
}
