// Open chip (stage 2, D-20) — the live states. External file (CSP script-src 'self'); the hours come from
// <script type="application/json" id="hours"> (Base.astro: data, not executed). Every chip on the page
// (hero, menu, footer) and the footer's hours list update together: now, then on every full minute,
// and when the tab becomes visible again. Without this file the chips keep the „still” text.
import { brussels, chipState, weekday, type HoursData, type Moment } from '../lib/open-state';
import { chip, type Locale } from '../i18n/ui';

const data = document.getElementById('hours')?.textContent;
const chips = [...document.querySelectorAll<HTMLAnchorElement>('a.oc[data-oc]')];

if (data && chips.length) {
  const h = JSON.parse(data) as HoursData;

  // dev only: ?oc-now=2026-10-07T17:45 = that Brussels wall-clock time, then running on (Dan's look, D-22)
  let now = (): Moment => brussels(new Date(), h.timeZone);
  if (import.meta.env.DEV) {
    const q = new URLSearchParams(location.search).get('oc-now')?.match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)$/);
    if (q) {
      const t0 = Date.now();
      const base = Date.UTC(+q[1], +q[2] - 1, +q[3]) + (+q[4] * 60 + +q[5]) * 60000;
      now = () => {
        const t = new Date(base + Math.floor((Date.now() - t0) / 60000) * 60000);
        return { day: new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate())), min: t.getUTCHours() * 60 + t.getUTCMinutes() };
      };
    }
  }

  // Motion (open-chip.css v1.2): a text change fades the two texts out, swaps them and fades them in — add `swap`
  // (opacity → 0 over 180 ms), wait for that fade (transitionend on .t, or 180 ms as the fallback: a chip with no box,
  // e.g. inside the closed menu, or reduced motion fires no transition), then rewrite the spans, then remove `swap`.
  // On first paint and on every state change the dot gets `beat` (the halo beats three times, 4,8 s, then rests),
  // removed on animationend. Nothing is written when nothing changed, so the minute tick of an unchanged state
  // neither fades nor beats; a newer change supersedes one still fading out.
  const paint = (el: HTMLAnchorElement, [state, time]: [string, string], kind: string, open: boolean) => {
    const key = `${kind}|${state}|${time}`;
    if (el.dataset.ocKey === key) return;
    el.dataset.ocKey = key;
    const seg = el.firstElementChild as HTMLElement;
    const d = seg.firstElementChild as HTMLElement;
    const label = seg.lastElementChild as HTMLElement;
    const t = el.lastElementChild as HTMLElement;
    let done = false;
    const swapIn = () => {
      if (done) return;
      done = true;
      t.removeEventListener('transitionend', onFaded);
      clearTimeout(fallback);
      if (el.dataset.ocKey !== key) return; // superseded: the newer change finishes the swap
      label.textContent = state;
      t.textContent = time;
      t.hidden = !time;
      el.classList.remove('still');
      el.classList.toggle('open', open);
      el.classList.toggle('closed', !open);
      el.classList.remove('swap');
      if (el.dataset.ocKind !== kind) {
        el.dataset.ocKind = kind;
        d.classList.remove('beat');
        void d.offsetWidth; // restart the animation
        d.classList.add('beat');
      }
    };
    const onFaded = (e: TransitionEvent) => { if (e.target === t && e.propertyName === 'opacity') swapIn(); };
    t.addEventListener('transitionend', onFaded);
    const fallback = window.setTimeout(swapIn, 180);
    el.classList.add('swap');
  };
  for (const el of chips) {
    const d = el.querySelector<HTMLElement>('.d');
    d?.addEventListener('animationend', () => d.classList.remove('beat'));
  }

  const days = [...document.querySelectorAll<HTMLElement>('[data-oc-day]')];
  let shownDay = '';
  const tick = () => {
    const at = now();
    const day = at.day.toISOString();
    if (day !== shownDay) {
      shownDay = day;
      const wd = String(weekday(at.day));
      for (const d of days) d.classList.toggle('is-today', d.dataset.ocDay === wd);
    }
    const s = chipState(h, at);
    const open = s.kind === 'open' || s.kind === 'closing-soon' || s.kind === 'special-open';
    for (const el of chips) paint(el, chip[el.dataset.oc as Locale].text(s), s.kind, open);
  };

  let timer = 0;
  const loop = () => {
    tick();
    clearTimeout(timer);
    timer = window.setTimeout(loop, 60000 - (Date.now() % 60000) + 50); // on the minute
  };
  loop();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });
}
