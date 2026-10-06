// Hero loop (D-12, design/css/hero-b.css). Frame 1 is in the HTML at opacity 1 from
// first paint and stays a still until this runs. After `load` it inserts frames 2–5,
// the loop frame and the desktop counter tags from their <template>s, waits until
// frame 2 is decoded (so the first wipe never reveals an empty frame), then adds
// `is-live` — every animation of the hero starts in that same style pass, so the
// frames and the tags are in step without any timing code.
// Stays a still when: reduced motion, no CSS mask support, or Save-Data is on.
const hero = document.querySelector<HTMLElement>('[data-hero]');

const maskOk = () =>
  CSS.supports('mask-image', 'linear-gradient(#000, transparent)') ||
  CSS.supports('-webkit-mask-image', 'linear-gradient(#000, transparent)');

function start() {
  if (!hero || hero.dataset.inserted) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !maskOk()) return;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return;

  const frames = hero.querySelector<HTMLTemplateElement>('template[data-frames]');
  const tags = hero.querySelector<HTMLTemplateElement>('template[data-tags]');
  const scrim = hero.querySelector('.hero__scrim');
  const homeTag = hero.querySelector('.ht.home');
  if (!frames || !scrim) return;

  hero.dataset.inserted = '1';
  scrim.before(frames.content.cloneNode(true));
  if (tags && homeTag) homeTag.after(tags.content.cloneNode(true));

  const next = hero.querySelector<HTMLImageElement>('.hb.vi img');
  const live = () => hero.classList.add('is-live');
  if (!next) return live();
  // Go live once frame 2 has arrived; give decode() at most 1 s on top (Chrome defers
  // decode() in hidden tabs, so it alone could keep the hero still for ever).
  const decoded = () => Promise.race([next.decode().catch(() => {}), new Promise((r) => setTimeout(r, 1000))]).then(live);
  if (next.complete) decoded();
  else {
    next.addEventListener('load', decoded, { once: true });
    next.addEventListener('error', live, { once: true });
  }
}

if (document.readyState === 'complete') start();
else addEventListener('load', start, { once: true });
