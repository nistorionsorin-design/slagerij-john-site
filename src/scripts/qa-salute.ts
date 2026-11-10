// The salute on load (row 11e; D-66; lexicon §5.38 / §6; docs/assistant.md §12 „10.11 — the salute”): the bubble beside
// the floating „Vraag het ons” / „Întreabă-ne” button (QaSheet.astro) — „Aan wie is 't? Aan u.” / „Cine urmează? Tu.” —
// with the button's pig in state `greet` (the ears once). Once per visit (a sessionStorage flag, try/catch; without
// storage: once per page load), ≈ 1,5 s after `load`, ≈ 5 s on screen, then gone by itself. Never while the box is open,
// nor once it was opened or used in this visit; not on the order form (no bubble there, QaSheet's `salute`). A tap on it
// opens the box exactly as the button does; the box still opens on tap only. Fixed, opacity + transform: no layout shift;
// reduced motion: still (CSS). Nothing is fetched. Decorative (aria-hidden): the button keeps its own name.
const bubble = document.querySelector<HTMLElement>('[data-qa-salute]');
const fab = document.querySelector<HTMLElement>('.qa-fab');
const KEY = 'qa-salute';
const stored = (k: string) => {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
};
const mark = () => {
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    /* no storage: once per page load */
  }
};
// shown before in this visit, or the box was used (its conversation state exists)
if (bubble && fab && !stored(KEY) && !stored('qa-state')) {
  let done = false;
  const hide = () => {
    done = true;
    bubble.classList.remove('is-on');
    setTimeout(() => (bubble.hidden = true), 300);
  };
  // the box opened (any „Vraag het ons” door) or the inline box used: no salute for the rest of the visit
  const off = () => {
    mark();
    if (!bubble.hidden) hide();
    done = true;
  };
  document.addEventListener('click', (e) => (e.target as Element).closest?.('[data-qa-open]') && e.target !== bubble && off(), true);
  document.querySelector('section.qa')?.addEventListener('focusin', off, { once: true });
  bubble.addEventListener('click', () => {
    off();
    fab.click();
  });
  const show = () => {
    if (done || document.documentElement.classList.contains('qa-lock') || document.querySelector('dialog[open]')) return;
    mark();
    bubble.hidden = false;
    // left of the button, level with it (the button's own box: its width differs per language); never past a 12 px gutter
    const r = fab.getBoundingClientRect();
    bubble.style.right = `${document.documentElement.clientWidth - r.left + 8}px`;
    bubble.style.maxWidth = `${Math.min(220, r.left - 20)}px`;
    bubble.style.bottom = `${innerHeight - r.bottom + (r.height - bubble.offsetHeight) / 2}px`;
    requestAnimationFrame(() => bubble.classList.add('is-on'));
    // the pig greets: its <use> copy becomes a full drawing (the ear rules need the drawing's own parts, lib/mascot.ts)
    const sym = document.getElementById('qa-pig');
    const old = fab.querySelector('svg');
    if (sym && old) {
      // the <use> face's own box (class, aria-hidden), with the symbol's viewBox and paint and a copy of its parts
      const svg = old.cloneNode() as SVGElement;
      for (const a of sym.attributes) a.name != 'id' && svg.setAttribute(a.name, a.value);
      for (const n of sym.childNodes) svg.append(n.cloneNode(true));
      svg.dataset.s = 'greet';
      old.replaceWith(svg);
      setTimeout(() => (svg.dataset.s = 'rest'), 1300);
    }
    setTimeout(() => !done && hide(), 5000);
  };
  const start = () => setTimeout(show, 1500);
  if (document.readyState === 'complete') start();
  else addEventListener('load', start, { once: true });
}
