// The product sheet (row 22, D-50 (3); design/css/vitrine.css v1 „Behaviour”, ≤ 3 kB): a click on a [data-fiche] link —
// a paper row or an entrance tile (row 22b, v2: `.row` · `.vit__tile`; the name from `.row__name` / `.vit__name`) —
// opens the page's one <dialog class="fiche">, filled from that row: the id from the
// link's ?product=, the name and the category (`data-cat`) from the page, the unit from `data-fiche` (Dan 23.10 17:2x:
// the unit, not the id), the rest from Fiche.astro's JSON when the row has more. The photo's <picture> is built here, so its
// file is fetched on open only; a row without one keeps the frame hidden. The stepper = the bestelbon's D-48 rule and
// reading (src/lib/order-core.js qtyRule / qtyLabel, copied: importing them would ship that 7,6 kB chunk here), from
// the row's minimum; „Op de bestelbon zetten” = the row's own bestelbon link + &q=<quantity> (order.ts sets it there),
// „Liever via WhatsApp” = /wa with the §5.10 message + the name. Closed by × (form method=dialog), Esc and the back
// gesture (native), a click on the backdrop; the focus goes back to the link that opened it. A modified click (a new
// tab) and no script = the plain bestelbon link. Reduced motion: vitrine.css drops the sheet's slide.
type Row = [unit: string, step: number, min: number, price?: string, line?: string, avif?: string, webp?: string, alt?: string];

const d = document.querySelector<HTMLDialogElement>('dialog.fiche');
const dataEl = document.getElementById('fiche-data');
if (d && dataEl && 'showModal' in d) {
  // Fiche.astro: only the rows with more than their unit (a photo, a line, a price, another step); a plain row = the
  // D-48 class of the link's data-fiche (kg 0,1 / 0,1 · stuk 1 / 1)
  const rows = JSON.parse(dataEl.textContent ?? '{}') as Record<string, Row>;
  const ro = document.documentElement.lang.startsWith('ro');
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => d.querySelector<T>(s)!;
  const ph = $('.fiche__ph');
  const line = $('.fiche__line');
  const price = $('.fiche__price-l');
  const input = $<HTMLInputElement>('.qty__in');
  const unit = $('.qty__u');
  const reading = $('.qty__r');
  const label = $('label');
  const [less, more] = d.querySelectorAll<HTMLButtonElement>('.qty__b');
  const primary = $<HTMLAnchorElement>('.fiche__primary');
  const wa = $<HTMLAnchorElement>('.fiche__wa');
  const waBase = wa.getAttribute('href');
  let row: Row = ['kg', 0.1, 0.1];
  let link = '';
  let opener: HTMLElement | null = null;

  // „300 g” · „1,2 kg” · „2 stuks” / „2 buc.” (order-core.js qtyLabel)
  const reads = (q: number) => {
    const n = String(q).replace('.', ',');
    if (row[0] === 'kg') return q < 1 ? `${Math.round(q * 1000)} g` : `${n} kg`;
    return ro ? `${n} buc.` : q === 1 ? '1 stuk' : `${n} stuks`;
  };
  // a wanted quantity snapped to the row's rule, never under its minimum (order-core.js qtyRule / snapQty)
  const snap = (v: number) => +Math.min(row[0] === 'kg' ? 50 : 99, Math.max(row[2], Math.round(v / row[1]) * row[1])).toFixed(3);
  const show = (q: number) => {
    input.value = String(q);
    reading.textContent = reads(q);
    const u = new URL(link, location.href);
    u.searchParams.set('q', String(q));
    primary.href = u.pathname + u.search + u.hash;
  };
  for (const b of [less, more]) b.addEventListener('click', () => show(snap((Number(input.value) || 0) + Number(b.dataset.step) * row[1])));
  input.addEventListener('change', () => show(snap(Number(input.value.replace(',', '.')) || 0)));

  const named = (el: HTMLElement, name: string) => {
    const s = `${el.dataset.label}: ${name}`;
    el instanceof HTMLLabelElement ? (el.textContent = s) : el.setAttribute('aria-label', s);
  };

  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest?.<HTMLAnchorElement>('a[data-fiche]');
    if (!a || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const u = a.dataset.fiche;
    const r: Row | undefined = rows[new URL(a.href).searchParams.get('product') ?? ''] ?? (u === 'kg' ? [u, 0.1, 0.1] : u === 'stuk' ? [u, 1, 1] : undefined);
    if (!r) return;
    e.preventDefault();
    opener = a;
    row = r;
    link = a.getAttribute('href') ?? '';
    const name = (a.querySelector('.vit__name, .row__name') ?? a).textContent?.trim() ?? '';
    $('.fiche__eyebrow').textContent = a.closest<HTMLElement>('[data-cat]')?.dataset.cat ?? '';
    $('.fiche__title').textContent = name;
    line.textContent = r[4] ?? '';
    line.hidden = !r[4];
    price.textContent = r[3] || (r[0] === 'kg' ? price.dataset.kg : price.dataset.stuk) || '';
    price.classList.toggle('fiche__price-l--num', !!r[3]);
    ph.replaceChildren();
    ph.hidden = !r[6];
    if (r[5] && r[6]) {
      const pic = document.createElement('picture');
      pic.append(
        Object.assign(document.createElement('source'), { type: 'image/avif', srcset: r[5] }),
        Object.assign(document.createElement('img'), { src: r[6], alt: r[7] ?? '', width: 720, height: 440 }),
      );
      ph.append(pic);
    }
    unit.hidden = r[0] !== 'kg';
    input.step = String(r[1]);
    input.min = String(r[2]);
    for (const el of [less, more, label]) named(el, name);
    wa.href = `${waBase}&text=${encodeURIComponent(`${wa.dataset.msg} ${name}`)}`;
    show(r[2]);
    d.showModal();
  });

  // the backdrop: a click on the dialog element outside its own box
  d.addEventListener('click', (e) => {
    if (e.target !== d) return;
    const b = d.getBoundingClientRect();
    if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) d.close();
  });
  d.addEventListener('close', () => opener?.focus({ preventScroll: true }));
}
