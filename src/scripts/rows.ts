// The paper rows' folds (row 22b, D-51 (3); design/css/vitrine.css v2, ≤ 1 kB). The HTML ships every
// <details class="rows__more"> open, so a phone without script and every desktop see all rows (the CSS hides the summary
// from 960); on the phone (< 960) this folds them at load — each group shows its first 6 — and crossing 960 later opens
// or folds them again. A link to a row inside a fold — the ItemList's #<id>, or ?product=<id> — keeps its fold open and,
// for ?product= or a later hash change, brings the row into view.
const folds = [...document.querySelectorAll<HTMLDetailsElement>('details.rows__more')];
if (folds.length) {
  const wide = matchMedia('(min-width: 960px)');
  const asked = new URLSearchParams(location.search).get('product');
  const target = () => {
    const id = asked || decodeURIComponent(location.hash.slice(1));
    return id ? document.getElementById(id) : null;
  };
  const set = () => {
    const t = target();
    for (const d of folds) d.open = wide.matches || d.contains(t);
  };
  set();
  wide.addEventListener('change', set);
  // a pill's #rund is a hash too: only a row in a closed fold is opened and scrolled to (?product= always scrolls)
  const show = (always: boolean) => {
    const t = target();
    const d = t?.closest<HTMLDetailsElement>('details.rows__more');
    if (d && !d.open) d.open = always = true;
    if (always) t?.scrollIntoView({ block: 'center', behavior: 'instant' }); // a landing, not a motion (order.ts too)
  };
  addEventListener('hashchange', () => show(false));
  if (asked) addEventListener('load', () => show(true), { once: true });
}
