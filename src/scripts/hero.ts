// Hero loop (D-12, design/css/hero-b.css). Frame 1 is in the HTML at opacity 1 from
// first paint and stays a still until this runs. After `load` it inserts frames 2–5,
// the loop frame and the desktop counter tags from their <template>s, waits until
// frame 2 is decoded (so the first wipe never reveals an empty frame), then adds
// `is-live` — every animation of the hero starts in that same style pass, so the
// frames and the tags are in step without any timing code.
// Stays a still when: reduced motion, no CSS mask support, or Save-Data is on.
// The start-up (after load · insert · decode · live) is src/scripts/frames.ts, shared with FrameLoop (row 14).
import { afterLoad, insertFrames, reducedMotion, saveData, whenDecoded } from './frames';

const hero = document.querySelector<HTMLElement>('[data-hero]');

const maskOk = () =>
  CSS.supports('mask-image', 'linear-gradient(#000, transparent)') ||
  CSS.supports('-webkit-mask-image', 'linear-gradient(#000, transparent)');

function start() {
  if (!hero || hero.dataset.inserted) return;
  if (reducedMotion() || !maskOk() || saveData()) return;

  const tags = hero.querySelector<HTMLTemplateElement>('template[data-tags]');
  const scrim = hero.querySelector('.hero__scrim');
  const homeTag = hero.querySelector('.ht.home');
  if (!scrim || !insertFrames(hero, scrim)) return;
  if (tags && homeTag) homeTag.after(tags.content.cloneNode(true));

  whenDecoded(hero.querySelector<HTMLImageElement>('.hb.vi img'), () => hero.classList.add('is-live'));
}

afterLoad(start);
