// The page-view beacon (row 13b, docs/metrics-spine.md §4), mounted once in Base.astro: after `load`, one
// navigator.sendBeacon to this origin's /api/hit with four fields and nothing else — p the pathname (no query string),
// l the page language, r the referrer's host as a class (the referrer URL itself is dropped), d a width bucket
// (< 600 · < 960 · ≥ 960 css px). No cookie, no storage, no identifier: nothing to consent to (BE-05). Skipped under
// automation (navigator.webdriver: Lighthouse, headless crawlers) and under /admin. The privacy page names exactly these
// columns (lexicon §5.5). A visit from another page of this site counts as `direct` — no outside source.
const CLASSES: [string, RegExp][] = [
  ['google', /(^|\.)google\.(com?\.)?[a-z]{2,3}$|^com\.google\.android\.googlequicksearchbox$/],
  ['bing', /(^|\.)bing\.com$/],
  ['facebook', /(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/],
  ['instagram', /(^|\.)instagram\.com$/],
  ['tiktok', /(^|\.)tiktok\.com$/],
  ['whatsapp', /(^|\.)(whatsapp\.com|wa\.me)$/],
  ['roflandra', /(^|\.)roflandra\.be$/],
];

function refClass(referrer: string): string {
  let host = '';
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return 'direct';
  }
  if (host === location.hostname) return 'direct';
  return CLASSES.find(([, re]) => re.test(host))?.[0] ?? 'other';
}

function send() {
  const d = innerWidth < 600 ? 'sm' : innerWidth < 960 ? 'md' : 'lg';
  const hit = { p: location.pathname, l: document.documentElement.lang.slice(0, 2), r: refClass(document.referrer), d };
  navigator.sendBeacon('/api/hit', JSON.stringify(hit));
}

if (!navigator.webdriver && !/^\/admin(\/|$)/.test(location.pathname)) {
  if (document.readyState === 'complete') send();
  else addEventListener('load', send, { once: true });
}
