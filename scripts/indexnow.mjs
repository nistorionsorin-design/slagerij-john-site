// IndexNow (row 13; SEO_GEO_BIBLE: Bing / Yandex / Seznam / Naver pick changed URLs up in minutes instead of waiting
// for a crawl; Google does not read IndexNow — it gets the sitemap through Search Console, row 13c).
// Run by hand after go-live and after a release that changes pages (ops/launch-checklist.md) — never in the build:
//
//   node scripts/indexnow.mjs            POST every URL of the live sitemap
//   node scripts/indexnow.mjs --dry      print what would be sent, send nothing
//   node scripts/indexnow.mjs --dist     take the URLs from the local dist/ sitemap instead of the live one
//
// The key is the 32-hex name of public/<key>.txt (the file holds the key itself; IndexNow fetches it from
// https://slagerij-john.be/<key>.txt to prove the host is ours). Public by design — not a secret (D-26 untouched).
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOST = 'slagerij-john.be';
const ORIGIN = `https://${HOST}`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const DRY = process.argv.includes('--dry');
const DIST = process.argv.includes('--dist');

const keyFile = readdirSync(join(root, 'public')).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) throw new Error('no public/<32-hex>.txt key file');
const key = keyFile.slice(0, -4);
if (readFileSync(join(root, 'public', keyFile), 'utf8').trim() !== key) throw new Error(`${keyFile} does not contain its own key`);

const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
async function sitemapUrls() {
  if (DIST) {
    const dist = join(root, 'dist');
    return locs(readFileSync(join(dist, 'sitemap-index.xml'), 'utf8')).flatMap((u) =>
      locs(readFileSync(join(dist, new URL(u).pathname), 'utf8')),
    );
  }
  const get = async (u) => {
    const r = await fetch(u);
    if (!r.ok) throw new Error(`${u} → ${r.status}`);
    return r.text();
  };
  const maps = locs(await get(`${ORIGIN}/sitemap-index.xml`));
  return (await Promise.all(maps.map(async (m) => locs(await get(m))))).flat();
}

const urlList = [...new Set(await sitemapUrls())].filter((u) => new URL(u).host === HOST);
if (!urlList.length) throw new Error('the sitemap lists no URL on ' + HOST);
const body = { host: HOST, key, keyLocation: `${ORIGIN}/${keyFile}`, urlList };

if (DRY) {
  console.log(JSON.stringify(body, null, 2));
  console.log(`\n--dry: ${urlList.length} URLs, nothing sent`);
} else {
  const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) });
  // 200 OK · 202 Accepted (key check pending) · 400 bad request · 403 key not valid · 422 URLs not on the host · 429 too many
  console.log(`IndexNow ${r.status} ${r.statusText} — ${urlList.length} URLs`);
  if (r.status >= 300) {
    console.log(await r.text());
    process.exit(1);
  }
}
