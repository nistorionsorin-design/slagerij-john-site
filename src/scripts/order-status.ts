// /bestelling — the customer's status page (row 12; docs/admin.md §3.5; lexicon §5.40 / §6). Asks /api/bestelling with
// the signed link's r · k; draws the three steps and the moment in the order's language. The answer holds the status and
// the moment only (no name, phone, e-mail or address). A link that is not ours, or an order erased (row 12c) →
// „Deze link is niet meer geldig.” / „Linkul nu mai e valabil.”
import { CUSTOMER } from '../lib/order-text.js';

const $ = <T extends Element>(sel: string) => document.querySelector<T>(sel)!;
const q = new URLSearchParams(location.search);
const setLang = (L: 'nl' | 'ro') => {
  if (L !== 'ro') return;
  const t = CUSTOMER.ro;
  document.documentElement.lang = 'ro-BE';
  $('[data-help]').textContent = t.help;
  $('[data-invalid]').textContent = t.invalid;
  $('[data-call]').textContent = t.call;
  $<HTMLAnchorElement>('[data-wa]').href += '&lang=ro';
};

async function open() {
  try {
    const r = await fetch(`/api/bestelling?${new URLSearchParams({ r: q.get('r') ?? '', k: q.get('k') ?? '' })}`, { cache: 'no-store' });
    if (!r.ok) throw new Error(String(r.status));
    const o: { ref: string; locale: 'nl' | 'ro'; method: string; step: number; moment: string } = await r.json();
    const t = CUSTOMER[o.locale] ?? CUSTOMER.nl;
    setLang(o.locale);
    document.title = t.pageTitle(o.ref);
    $('[data-title]').textContent = t.pageTitle(o.ref);
    const labels = o.method === 'delivery' ? t.stepsDelivery : t.steps;
    document.querySelectorAll<HTMLElement>('.ost__step').forEach((li, i) => {
      li.querySelector('[data-step-label]')!.textContent = labels[i];
      if (i <= o.step) li.dataset.on = '';
      if (i === o.step) li.setAttribute('aria-current', 'step');
    });
    $<HTMLElement>('[data-steps]').hidden = false;
    const m = $<HTMLElement>('[data-moment]');
    m.textContent = o.moment;
    m.hidden = false;
  } catch {
    // the invalid line already asks to call or write: the help line under it would say it twice
    $<HTMLElement>('[data-invalid]').hidden = false;
    $<HTMLElement>('[data-help]').hidden = true;
  }
}

open();
