// The assistant's entry (row 11a, QaBox.astro): on every page, small. It wires the box and the „Vraag het ons”
// buttons; the engine (qa-ui.ts → lib/assistant/engine.js) and /assistant-index.json load on the first focus, tap or
// question — never at page load (docs/assistant.md §10.4 budgets). A modified click (a new tab) and no script = the
// buttons' own WhatsApp links. If the engine cannot load, the box says so and offers WhatsApp and the phone.
type Ui = typeof import('./qa-ui');
type Ctl = Awaited<ReturnType<Ui['init']>>;

const box = document.querySelector<HTMLElement>('section.qa');
const sheet = document.querySelector<HTMLDialogElement>('dialog.qa-sheet');
if (box && sheet && 'showModal' in sheet) {
  const slot = sheet.querySelector<HTMLElement>('[data-qa-slot]')!;
  const form = box.querySelector<HTMLFormElement>('[data-qa-form]')!;
  const input = form.querySelector<HTMLInputElement>('input[name="q"]')!;
  const fail = box.querySelector<HTMLElement>('[data-qa-fail]')!;
  let ctl: Promise<Ctl | null> | null = null;
  // a load that fails (no network, the server gone) shows the does-not-load line and is tried again on the next
  // question or tap — it is not remembered as failed
  const load = () =>
    (ctl ??= import('./qa-ui')
      .then((m) => m.init(box))
      .then((c) => {
        fail.hidden = true;
        return c;
      })
      .catch(() => {
        fail.hidden = false;
        ctl = null;
        return null;
      }));
  const run = (f: (c: Ctl) => void) => load().then((c) => c && f(c));

  // the box's own controls: one listener each, the work in qa-ui.ts
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    input.value = '';
    // the question stays in the field when the assistant cannot load, to send again or copy to WhatsApp
    load().then((c) => (c ? c.ask(q) : (input.value ||= q)));
  });
  box.addEventListener('click', (e) => {
    const el = (e.target as Element).closest?.<HTMLElement>('[data-ask],[data-pick],[data-qa-restart],[data-card],[data-switch],[data-wa]');
    if (!el || (el instanceof HTMLAnchorElement && (e.ctrlKey || e.metaKey || e.shiftKey || e.button))) return;
    if (el.dataset.ask !== undefined) run((c) => c.ask(el.dataset.ask!));
    else if (el.dataset.pick) run((c) => c.pick(el.dataset.pick!, el.textContent ?? ''));
    else if (el.dataset.qaRestart !== undefined) run((c) => c.restart());
    else if (el.dataset.card) card(el as HTMLAnchorElement, e);
    else run((c) => c.act(el));
  });

  // a product card: on a page that has that product's sheet (/producten: a row or a tile, ?product=<id>) it opens the
  // sheet; another place on this page (a counter tag, a colli card) is scrolled to; another page is simply followed
  const card = (a: HTMLAnchorElement, e: Event) => {
    const url = new URL(a.href);
    if (url.pathname !== location.pathname) return;
    e.preventDefault();
    const fiche = document.querySelector<HTMLElement>(`a[data-fiche][href*="product=${a.dataset.card}"]`);
    if (sheet.open) sheet.close();
    unlock();
    if (fiche) fiche.click();
    else document.getElementById(url.hash.slice(1))?.scrollIntoView({ block: 'center' });
  };
  for (const ev of ['focusin', 'pointerdown'] as const) box.addEventListener(ev, () => void load(), { once: true, passive: true });

  // the sheet: the box moves in (an inline page keeps a box-high space), and back on close
  let space: HTMLElement | null = null;
  let opener: HTMLElement | null = null;
  const open = (from: HTMLElement) => {
    opener = from;
    // „Vraag over dit product”: the product of the open product sheet (fiche.ts sets ?product= on its bestelbon link)
    const fiche = from.closest<HTMLDialogElement>('dialog.fiche');
    const product = fiche ? new URL(fiche.querySelector<HTMLAnchorElement>('.fiche__primary')!.href).searchParams.get('product') : null;
    fiche?.close();
    if (!slot.contains(box)) {
      space = document.createElement('div');
      space.style.height = `${box.offsetHeight}px`;
      box.before(space);
      slot.append(box);
    }
    document.documentElement.classList.add('qa-lock');
    sheet.showModal();
    if (matchMedia('(hover: hover)').matches) input.focus({ preventScroll: true });
    run((c) => c.opened(product, fiche ? 'sheet' : 'button'));
  };
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest?.<HTMLElement>('[data-qa-open]');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || (e as MouseEvent).button) return;
    e.preventDefault();
    open(a);
  });
  // the box goes back to its place and the page scrolls again — at once, so an anchor can be scrolled to right after
  const unlock = () => {
    document.documentElement.classList.remove('qa-lock');
    if (space) {
      space.replaceWith(box);
      space = null;
    }
  };
  sheet.addEventListener('close', () => {
    const back = !!space || document.documentElement.classList.contains('qa-lock');
    unlock();
    if (back) opener?.focus({ preventScroll: true });
  });
  sheet.addEventListener('click', (e) => {
    if (e.target !== sheet) return;
    const b = sheet.getBoundingClientRect();
    if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) sheet.close();
  });
}
