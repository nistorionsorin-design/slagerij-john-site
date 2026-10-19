// The showcase hero's loop (PageHero.astro, row 14e): frame 1 is in the HTML at opacity 1 from first paint and zooms
// still until this runs; frames 2…N wait in the hero's <template data-frames>. After `load` and the first LCP paint they
// go in under the scrim, and once frame 2 is decoded `is-live` starts every animation of the hero in one style pass.
// A one-photo hero has no template: its Ken Burns is CSS only and nothing here runs.
// Stays a still with reduced motion or Save-Data (the helpers are src/scripts/frames.ts, shared with the home hero).
import { afterLoadPaint, insertFrames, reducedMotion, saveData, whenDecoded } from './frames';

for (const hero of document.querySelectorAll<HTMLElement>('[data-sh]')) {
  const media = hero.querySelector<HTMLElement>('.sh__media');
  if (!media?.querySelector('template[data-frames]')) continue;
  afterLoadPaint(() => {
    if (reducedMotion() || saveData() || !insertFrames(media, media.querySelector('.sh__scrim'))) return;
    whenDecoded(media.querySelector<HTMLImageElement>('.sh__f:not(.sh__f0) img'), () => hero.classList.add('is-live'));
  });
}
