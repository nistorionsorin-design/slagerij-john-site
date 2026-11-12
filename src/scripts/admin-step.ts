// /admin/pas — one step from the shop's mail (row 12; docs/admin.md §3.2 · §3.4). Reads the signed link (r · s · e · k),
// asks /api/admin for the order's reference and name (a GET: nothing changes), shows one button; the tap is the POST.
// After „E gata” it offers „Scrie-i și pe WhatsApp” with the ready text in the order's language (wa.me, her own phone).
import { SHOP, CUSTOMER } from '../lib/order-text.js';

const $ = <T extends Element>(sel: string) => document.querySelector<T>(sel)!;
const title = $<HTMLElement>('[data-title]');
const go = $<HTMLButtonElement>('[data-go]');
const msg = $<HTMLElement>('[data-msg]');
const wa = $<HTMLAnchorElement>('[data-wa]');
const q = Object.fromEntries(new URLSearchParams(location.search));
const link = { r: q.r ?? '', s: q.s ?? '', e: q.e ?? '', k: q.k ?? '' };
const say = (text: string) => {
  msg.textContent = text;
  msg.hidden = false;
};
const intl = (phone: string) => {
  const d = phone.replace(/\D/g, '');
  return d.startsWith('00') ? d.slice(2) : d.startsWith('0') ? `32${d.slice(1)}` : d;
};
const offerWa = (o: { name: string; ref: string; phone: string; locale: 'nl' | 'ro' }) => {
  wa.href = `https://wa.me/${intl(o.phone)}?text=${encodeURIComponent((CUSTOMER[o.locale] ?? CUSTOMER.nl).waReady(o.name, o.ref))}`;
  wa.hidden = false;
};

async function open() {
  try {
    const r = await fetch(`/api/admin?${new URLSearchParams({ op: 'step', ...link })}`, { cache: 'no-store' });
    if (r.status === 401 || r.status === 404) return say(SHOP.stepInvalid);
    if (!r.ok) throw new Error(String(r.status));
    const o = await r.json();
    title.textContent = SHOP.stepTitle(o.ref, o.name);
    go.textContent = SHOP.next[o.step as keyof typeof SHOP.next];
    go.hidden = false;
    if (o.done && o.step === 'gata') offerWa(o);
  } catch {
    say(SHOP.loadFailed);
  }
}

go.addEventListener('click', async () => {
  go.disabled = true;
  try {
    const r = await fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json', 'x-admin': '1' }, body: JSON.stringify({ op: 'step', ...link }) });
    if (r.status === 401 || r.status === 404) {
      go.hidden = true;
      return say(SHOP.stepInvalid);
    }
    if (!r.ok) throw new Error(String(r.status));
    const o = await r.json();
    go.hidden = true;
    say(o.mailed ? SHOP.savedMailed : SHOP.saved);
    if (link.s === 'gata') offerWa(o);
  } catch {
    go.disabled = false;
    say(SHOP.saveFailed);
  }
});

open();
