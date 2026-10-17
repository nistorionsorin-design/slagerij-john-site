// The frame engine's start-up, used by the home hero (hero.ts, D-12) and, since row 14b (D-37 v6), the /producten head's
// frame B and its product tiles; the /producten frame loop (FrameLoop.astro, row 14) used it until D-37 v5: frame 1 is in the HTML at opacity 1 from first paint; the later frames wait in a <template data-frames> and
// are inserted after `load`; the loop goes live once the first inserted frame is decoded (decode() capped at 1 s —
// Chrome defers it in hidden tabs), so a transition never reveals an empty frame.

/** run `fn` once the page's `load` has fired (at once if it already has) */
export function afterLoad(fn: () => void) {
  if (document.readyState === 'complete') fn();
  else addEventListener('load', fn, { once: true });
}

/** run `fn` after `load` and after the page's first largest-contentful-paint entry (one task later), so what it fetches
 *  stays out of the LCP's way. On /producten the head paints ≈ 100 ms after `load` (Lighthouse mobile, 17.10): one
 *  frame after `load` was sometimes still before that paint, and images fetched before it cost ≈ 0,1 s of mobile LCP
 *  each [MEASURED-OURS] local. Without the LCP entry type (older Safari): one painted frame after `load`; and never
 *  later than 3 s after `load`. */
export function afterLoadPaint(fn: () => void) {
  let done = false;
  const run = () => { if (!done) { done = true; setTimeout(fn); } };
  afterLoad(() => {
    if (!PerformanceObserver.supportedEntryTypes?.includes('largest-contentful-paint')) return requestAnimationFrame(run);
    new PerformanceObserver((list, obs) => { if (list.getEntries().length) { obs.disconnect(); run(); } }).observe({ type: 'largest-contentful-paint', buffered: true });
    setTimeout(run, 3000);
  });
}

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const saveData = () => !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

/** clone the root's <template data-frames> in front of `before` (or at the end of the root); once per root */
export function insertFrames(root: HTMLElement, before?: Element | null): boolean {
  if (root.dataset.inserted) return false;
  const tpl = root.querySelector<HTMLTemplateElement>('template[data-frames]');
  if (!tpl) return false;
  root.dataset.inserted = '1';
  const content = tpl.content.cloneNode(true);
  if (before) before.before(content);
  else root.append(content);
  return true;
}

/** call `live` once `img` has arrived and decoded (≤ 1 s on top), or at once without an image */
export function whenDecoded(img: HTMLImageElement | null, live: () => void) {
  if (!img) return live();
  const decoded = () => Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, 1000))]).then(live);
  if (img.complete) decoded();
  else {
    img.addEventListener('load', decoded, { once: true });
    img.addEventListener('error', live, { once: true });
  }
}
