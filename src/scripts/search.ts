// The search above the pills (row 22, D-50 (3); row 22b, D-51: the paper rows; design/css/vitrine.css v2 „Behaviour”,
// ≤ 2 kB). From 2 characters every row whose name does not hold the query is hidden — case- and accent-insensitive
// (ș = s, é = e) —; on the NL page a row's counter alias counts as part of its name (row 22c, D-52: „kaizer”, „toba”
// find Gerookt buikspek, Roemeense zult); per group the label goes when no row is left and the fold's „Toon alle N”
// counts the rows left; a section of rows with none left goes, so does an entrance tile that does not match and an entrance with none left, and
// a board-only section left empty. Nothing found = the empty state and its WhatsApp link. Under 2 characters everything
// is back. Enter only closes the phone's keyboard. No network, nothing stored. The counter tags and part 2 stay.
const f = document.querySelector<HTMLFormElement>('form.as-search');
if (f) {
  const q = f.querySelector('input')!;
  const empty = f.querySelector<HTMLElement>('.as-search__empty')!;
  const norm = (s: string | null | undefined) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  // what a row or a tile answers to: its name + the lang="ro" alias span of its unit line, when it has one
  const key = (el: Element, name: string) => norm(`${el.querySelector(name)?.textContent ?? ''} ${el.querySelector('[lang]')?.textContent ?? ''}`);
  type Group = { head: HTMLElement | null; fold: HTMLElement | null; count: HTMLElement | null; rows: [HTMLElement, string][] };
  // a section's groups: a .rows__group label starts one; its lists (the first 6, the fold) follow it
  const sections = [...document.querySelectorAll<HTMLElement>('section.rows')].map((s) => {
    const groups: Group[] = [];
    let g: Group | undefined;
    for (const el of s.children as HTMLCollectionOf<HTMLElement>) {
      const head = el.matches('.rows__group');
      if (head || (!g && el.matches('ul'))) groups.push((g = { head: head ? el : null, fold: null, count: null, rows: [] }));
      if (!g || head) continue;
      if (el.matches('details')) (g.fold = el), (g.count = el.querySelector('summary span span'));
      for (const li of el.querySelectorAll('li')) g.rows.push([li, key(li, '.row__name')]);
    }
    return { s, groups };
  });
  const tiles = [...document.querySelectorAll<HTMLElement>('.vit__tile')].map((t) => [t, key(t, '.vit__name')] as const);
  const bare = [...document.querySelectorAll<HTMLElement>('.pp-cat')].filter((s) => !s.querySelector('.pp-cat__tags'));
  for (const { groups } of sections) for (const g of groups) if (g.count) g.count.dataset.n = g.count.textContent ?? '';

  f.hidden = false;
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    q.blur();
  });
  q.addEventListener('input', () => {
    const s = norm(q.value);
    const on = s.length > 1;
    const hit = (name: string) => !on || name.includes(s);
    let found = 0;
    for (const { s: sec, groups } of sections) {
      let left = 0;
      for (const g of groups) {
        let n = 0;
        for (const [li, name] of g.rows) n += +!(li.hidden = !hit(name));
        if (g.head) g.head.hidden = !n;
        if (g.fold) g.fold.hidden = !g.fold.querySelector('li:not([hidden])');
        if (g.count) g.count.textContent = on ? String(n) : g.count.dataset.n!;
        left += n;
      }
      sec.hidden = !left;
      found += left;
    }
    for (const [t, name] of tiles) found += +!(t.hidden = !hit(name));
    for (const v of document.querySelectorAll<HTMLElement>('.vit')) v.hidden = !v.querySelector('.vit__tile:not([hidden])');
    for (const sec of bare) sec.hidden = !sec.querySelector('.rows:not([hidden]), .vit:not([hidden])');
    empty.hidden = !on || found > 0;
  });
}
