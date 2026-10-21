// Row 20 (D-49): the characters the site uses, for the Latin font subsets. Run after `npm run build`:
//   node scripts/glyphs.mjs            → the list by code point + the --unicodes string for pyftsubset (fonts.css header)
// Set = the fixed base (ASCII, Latin-1, the typographic punctuation, €, minus) ∪ every code point in dist/**/*.html
// (text, attributes and the inline <style>, so CSS `content:` counts — JSON-LD is never drawn and is left out) ∪ the
// client scripts in dist/_astro/*.js (strings a script writes into the page) ∪ src/data/*.json ∪ src/i18n/*.ts.
// Ă ă Ș ș Ț ț stay in the RO subsets (fonts.css), so they are left out here. A character outside the Latin faces'
// unicode-range as published by @fontsource (OLD below: → ★ in the page text) has always been drawn by the fallback
// font; it stays out, so nothing changes look.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const walk = (dir) =>
  existsSync(dir) ? readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)])) : [];
const read = (p) => readFileSync(p, 'utf8');
const rel = (p) => relative(root, p).replaceAll('\\', '/');

const BASE = [[0x20, 0x7e], [0xa0, 0xff], [0x2013, 0x2014], [0x2018, 0x201a], [0x201c, 0x201e], [0x2022, 0x2022], [0x2026, 0x2026], [0x20ac, 0x20ac], [0x2212, 0x2212]];
const RO = new Set([0x102, 0x103, 0x218, 0x219, 0x21a, 0x21b]);
const OLD = [[0x0, 0xff], [0x131, 0x131], [0x152, 0x153], [0x2bb, 0x2bc], [0x2c6, 0x2c6], [0x2da, 0x2da], [0x2dc, 0x2dc], [0x304, 0x304], [0x308, 0x308], [0x329, 0x329], [0x2000, 0x206f], [0x20ac, 0x20ac], [0x2122, 0x2122], [0x2191, 0x2191], [0x2193, 0x2193], [0x2212, 0x2212], [0x2215, 0x2215], [0xfeff, 0xfeff], [0xfffd, 0xfffd]];
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const entities = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) =>
    e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : (NAMED[e] ?? m),
  );
const escapes = (s) => s.replace(/\\u\{([0-9a-f]+)\}|\\u([0-9a-f]{4})/gi, (_, a, b) => String.fromCodePoint(parseInt(a ?? b, 16)));

const seen = new Map(); // code point → first source
const add = (label, text) => {
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp < 0x20 || (cp >= 0x7f && cp < 0xa0) || RO.has(cp)) continue;
    if (!seen.has(cp)) seen.set(cp, label);
  }
};
const dist = join(root, 'dist');
if (!existsSync(dist)) throw new Error('dist/ missing — run npm run build first');
for (const f of walk(dist).filter((f) => f.endsWith('.html')))
  add(rel(f), entities(read(f).replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, ' ')));
for (const f of walk(join(dist, '_astro')).filter((f) => f.endsWith('.js'))) add(rel(f), escapes(read(f)));
for (const f of walk(join(root, 'src/data')).filter((f) => f.endsWith('.json'))) add(rel(f), escapes(read(f)));
for (const f of walk(join(root, 'src/i18n')).filter((f) => f.endsWith('.ts'))) add(rel(f), escapes(read(f)));

const within = (list) => (cp) => list.some(([a, b]) => cp >= a && cp <= b);
const inBase = within(BASE);
const inOld = within(OLD);
const set = new Set([...BASE.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i)), ...[...seen.keys()].filter(inOld)]);
const cps = [...set].sort((a, b) => a - b);
const hex = (cp) => cp.toString(16).toUpperCase().padStart(4, '0');
const ranges = [];
for (const cp of cps) {
  const last = ranges.at(-1);
  if (last && cp === last[1] + 1) last[1] = cp;
  else ranges.push([cp, cp]);
}
const extra = cps.filter((cp) => !inBase(cp));
console.log(`${cps.length} code points; outside the base set (${extra.length}):`);
for (const cp of extra) console.log(`  U+${hex(cp)}  ${String.fromCodePoint(cp)}  ${seen.get(cp)}`);
const left = [...seen.keys()].filter((cp) => !inOld(cp)).sort((a, b) => a - b);
console.log(`left to the fallback font, outside the published range (${left.length}):`);
for (const cp of left) console.log(`  U+${hex(cp)}  ${String.fromCodePoint(cp)}  ${seen.get(cp)}`);
console.log(`\n--unicodes="${ranges.map(([a, b]) => (a === b ? `U+${hex(a)}` : `U+${hex(a)}-${hex(b)}`)).join(',')}"`);
