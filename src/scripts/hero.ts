// Hero loop (D-12, design/css/hero-b.css). Frame 1 is in the HTML at opacity 1 from
// first paint and stays a still until this runs. After `load` it inserts frames 2–N,
// the loop frame and the desktop counter tags from their <template>s, waits until
// frame 2 is decoded (so the first wipe never reveals an empty frame), then adds
// `is-live` — every animation of the hero starts in that same style pass, so the
// frames and the tags are in step without any timing code.
// Row 14c (D-38, 17.10): ten frames, and each loads just before it shows. The frames go into the page with their
// sources parked (data-srcset / data-src), so nothing is fetched but frame 2 (and the loop copy of frame 1, already in
// the cache); frame n+1's sources come back when frame n starts — a frame's animations iterate exactly when its wipe
// begins (hero-b.css: each cycle starts with the wipe), so `animationiteration` is the cue, and the pause holds it too.
// It starts after `load` and the head's first paint (afterLoadPaint): on this site `load` comes before the first paint,
// and frame 2 fetched before it counted towards the mobile LCP.
// Stays a still when: reduced motion, no CSS mask support, or Save-Data is on.
// The start-up helpers (after load · decode) are src/scripts/frames.ts, shared with /producten (row 14b).
import { afterLoadPaint, reducedMotion, saveData, whenDecoded } from './frames';

const hero = document.querySelector<HTMLElement>('[data-hero]');

const maskOk = () =>
  CSS.supports('mask-image', 'linear-gradient(#000, transparent)') ||
  CSS.supports('-webkit-mask-image', 'linear-gradient(#000, transparent)');

/** take a frame's sources off its <picture>, so the browser fetches nothing for it yet */
function park(frame: Element) {
  for (const el of frame.querySelectorAll<HTMLSourceElement | HTMLImageElement>('source, img')) {
    for (const a of ['srcset', 'src']) {
      const v = el.getAttribute(a);
      if (v === null) continue;
      el.setAttribute(`data-${a}`, v);
      el.removeAttribute(a);
    }
  }
}

/** give a parked frame its sources back (once) */
function wake(frame: Element | undefined) {
  if (!frame) return;
  for (const el of frame.querySelectorAll<HTMLSourceElement | HTMLImageElement>('source, img')) {
    for (const a of ['srcset', 'src']) {
      const v = el.getAttribute(`data-${a}`);
      if (v === null) continue;
      el.setAttribute(a, v);
      el.removeAttribute(`data-${a}`);
    }
  }
}

function start() {
  if (!hero || hero.dataset.inserted) return;
  if (reducedMotion() || !maskOk() || saveData()) return;

  const tpl = hero.querySelector<HTMLTemplateElement>('template[data-frames]');
  const tags = hero.querySelector<HTMLTemplateElement>('template[data-tags]');
  const scrim = hero.querySelector('.hero__scrim');
  const homeTag = hero.querySelector('.ht.home');
  if (!tpl || !scrim) return;
  hero.dataset.inserted = '1';

  // frames 2–N, then the loop copy of frame 1: park 3–N while the clone is still inert
  const content = tpl.content.cloneNode(true) as DocumentFragment;
  const order = [...content.querySelectorAll<HTMLElement>('.hb.vi:not(.hbb)')];
  for (const f of order.slice(1)) park(f);
  scrim.before(content);
  if (tags && homeTag) homeTag.after(tags.content.cloneNode(true));

  // frame n starts → fetch frame n+1 (order[k] is frame k + 2)
  order.forEach((f, k) => f.addEventListener('animationiteration', () => wake(order[k + 1])));

  whenDecoded(order[0]?.querySelector('img') ?? null, () => hero.classList.add('is-live'));
}

afterLoadPaint(start);
