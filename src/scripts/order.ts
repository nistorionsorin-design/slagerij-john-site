// The bestelbon's live layer (stage 5, OrderForm.astro). Without it the form still posts; with it:
// −/+ steppers per product · day and time chips from hours.json / delivery.json (no closed hours, no past days) · the
// free request list · the slip and the WhatsApp text, recomputed on every change · the delivery quote · the details
// remembered on this device (localStorage, nothing sent anywhere — order-flow §3) · the send as JSON with the same
// reference the WhatsApp text quotes. Every rule is src/lib/order-core.js — the same code the server runs.
import { readOrder, daysFor, dayLabel, money, qtyLabel, waText, newRef, qtyRule, toMin } from '../lib/order-core.js';

type Unit = 'kg' | 'pers' | 'colli' | 'stuk' | 'liter';
interface Item { id: string; category: string; name: Partial<Record<'nl' | 'ro', string>>; unit: Unit; price: number | null; priceFrom?: boolean; min?: number; step?: number }
interface Data {
  locale: 'nl' | 'ro';
  items: Item[];
  delivery: { pickup: { leadDays: number; cutoff: string | null; stepMin: number; horizonDays: number }; [k: string]: unknown };
  qtyUnit: Record<Unit, string>;
  t: {
    slip: { pickup: string; delivery: string; pay: string; payDelivery: string; whenPending: string; total: string; priceTbc: string; empty: string; fee: Record<string, string> };
    when: { none: string };
    send: { sending: string; submit: string };
    done: { error: string; fix: string };
    details: { required: string };
    errors: { name: string; phone: string; email: string; address: string; items: string; when: string };
  };
}

const form = document.querySelector<HTMLFormElement>('[data-order]');
const dataEl = document.getElementById('order-data');
const hoursEl = document.getElementById('hours');
if (form && dataEl && hoursEl) init(form, JSON.parse(dataEl.textContent ?? '{}') as Data, JSON.parse(hoursEl.textContent ?? '{}'));

function init(form: HTMLFormElement, d: Data, hours: unknown) {
  const { locale, t } = d;
  const products = { items: d.items };
  const data = { products, hours, delivery: d.delivery };
  const ref = newRef();
  const $ = <T extends Element = HTMLElement>(s: string, root: ParentNode = form) => root.querySelector<T>(s);
  const $$ = <T extends Element = HTMLElement>(s: string, root: ParentNode = form) => [...root.querySelectorAll<T>(s)];
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | null;
  const byId = new Map(d.items.map((p) => [p.id, p]));
  const state = { date: '', time: '', requests: [] as string[] };
  // the script checks the fields itself (same rules as the server, the lexicon §5.20 error line under the field);
  // without it the browser's own required/pattern checks stay in force
  form.noValidate = true;

  // ── steppers ──
  for (const box of $$('.qty')) {
    const input = $<HTMLInputElement>('.qty__in', box)!;
    const p = byId.get(input.name.slice(2));
    if (!p) continue;
    const r = qtyRule(p);
    box.classList.add('is-live');
    for (const b of $$<HTMLButtonElement>('.qty__b', box)) {
      b.hidden = false;
      b.addEventListener('click', () => {
        const v = Number(input.value) || 0;
        const up = b.dataset.step === '1';
        const next = up ? (v < r.min ? r.min : Math.min(r.max, v + r.step)) : v - r.step < r.min ? 0 : v - r.step;
        input.value = String(+next.toFixed(2));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }
    // a typed amount snaps to the rule when the field is left (1,2 kg → 1 kg; 1 pers. gourmet → 2)
    input.addEventListener('change', () => {
      const v = Number(input.value.replace(',', '.')) || 0;
      input.value = v <= 0 ? '0' : String(Math.min(r.max, Math.max(r.min, Math.round(v / r.step) * r.step)));
      update();
    });
  }

  // ── day and time chips (the no-script date field and time list leave the form) ──
  $('[data-when-fallback]')?.remove();
  const daysBox = $('[data-days]')!;
  const timesBox = $('[data-times]')!;
  daysBox.hidden = false;
  const method = () => (field('method') as unknown as RadioNodeList).value === 'delivery' ? 'delivery' : 'pickup';
  let days: { date: string; times: string[] }[] = [];

  const chip = (name: string, value: string, label: string, sub: string, checked: boolean) => {
    const id = `${name}-${value.replace(/\W/g, '')}`;
    const input = Object.assign(document.createElement('input'), { type: 'radio', name: `${name}-chip`, id, value, checked });
    const l = Object.assign(document.createElement('label'), { htmlFor: id, textContent: label });
    if (sub) {
      const s = document.createElement('span');
      s.textContent = sub;
      s.style.cssText = 'font-size:10px;font-weight:500;opacity:.75';
      l.append(s);
    }
    return [input, l];
  };

  /** „tot 13:00” / „vanaf 13:00” under a pickup day whose hours are short (lexicon §5.4 words) */
  const daySub = (times: string[]) => {
    if (method() === 'delivery' || !times.length) return '';
    const step = d.delivery.pickup.stepMin;
    const close = toMin(times[times.length - 1]) + step;
    if (toMin(times[0]) >= 10 * 60) return locale === 'ro' ? `de la ${times[0]}` : `vanaf ${times[0]}`;
    if (close <= 16 * 60) return `${locale === 'ro' ? 'până la' : 'tot'} ${String(Math.floor(close / 60)).padStart(2, '0')}:${String(close % 60).padStart(2, '0')}`;
    return '';
  };

  function renderDays() {
    days = daysFor(method(), hours, d.delivery);
    if (!days.some((x) => x.date === state.date)) state.date = '';
    daysBox.replaceChildren(...days.flatMap((x) => chip('date', x.date, dayLabel(x.date, locale, 'chip'), daySub(x.times), x.date === state.date)));
    renderTimes();
  }
  function renderTimes() {
    const day = days.find((x) => x.date === state.date);
    if (!day) {
      state.time = '';
      timesBox.hidden = true;
      timesBox.replaceChildren();
      return;
    }
    if (!day.times.includes(state.time)) state.time = '';
    timesBox.hidden = false;
    timesBox.replaceChildren(...day.times.flatMap((x) => chip('time', x, x, '', x === state.time)));
  }
  daysBox.addEventListener('change', (e) => {
    state.date = (e.target as HTMLInputElement).value;
    daysBox.removeAttribute('aria-invalid');
    renderTimes();
    update();
  });
  timesBox.addEventListener('change', (e) => {
    state.time = (e.target as HTMLInputElement).value;
    timesBox.removeAttribute('aria-invalid');
    $('[data-err="when"]')?.remove();
    update();
  });

  // ── pickup or delivery ──
  const addressFields = ['street', 'nr', 'postcode', 'place'];
  const syncMethod = () => {
    for (const n of addressFields) field(n)!.required = method() === 'delivery';
    renderDays();
  };
  for (const r of $$<HTMLInputElement>('input[name="method"]')) r.addEventListener('change', () => { syncMethod(); update(); });

  // ── free requests: one line each, listed under the field (the no-script textarea becomes their carrier) ──
  const reqArea = $<HTMLTextAreaElement>('[data-requests]')!;
  reqArea.closest('label')!.hidden = true;
  const reqAdd = $('[data-request-add]')!;
  const reqInput = $<HTMLInputElement>('[data-request-input]')!;
  const reqList = $('[data-request-list]')!;
  const reqTpl = $<HTMLTemplateElement>('[data-request-tpl]')!;
  reqAdd.hidden = false;
  const renderRequests = () => {
    reqArea.value = state.requests.join('\n');
    reqList.hidden = !state.requests.length;
    reqList.replaceChildren(
      ...state.requests.map((r, i) => {
        const li = reqTpl.content.firstElementChild!.cloneNode(true) as HTMLLIElement;
        li.querySelector('span')!.textContent = r;
        li.querySelector('button')!.addEventListener('click', () => {
          state.requests.splice(i, 1);
          renderRequests();
          update();
          reqInput.focus();
        });
        return li;
      }),
    );
  };
  const addRequest = () => {
    const v = reqInput.value.trim();
    if (!v) return;
    state.requests.push(v.slice(0, 200));
    reqInput.value = '';
    renderRequests();
    update();
  };
  $('[data-request-button]')!.addEventListener('click', addRequest);
  reqInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addRequest();
    }
  });

  // ── details remembered on this device ──
  const KEY = 'sj-bestelbon';
  const remembered = $$<HTMLInputElement>('[data-remember]');
  const rememberBox = $('[data-remember-box]')!;
  const rememberCheck = $<HTMLInputElement>('[data-remember-check]')!;
  rememberBox.hidden = false;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (saved) for (const f of remembered) if (!f.value && typeof saved[f.name] === 'string') f.value = saved[f.name];
  } catch {}
  const remember = () => {
    try {
      if (rememberCheck.checked) localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(remembered.map((f) => [f.name, f.value.trim()]))));
      else localStorage.removeItem(KEY);
    } catch {}
  };

  // ── the order as the script sees it ──
  const input = () => ({
    lang: locale,
    ref,
    method: method(),
    date: state.date,
    time: state.time,
    items: Object.fromEntries($$<HTMLInputElement>('.qty__in').map((f) => [f.name.slice(2), f.value])),
    requests: state.requests,
    name: field('name')!.value,
    phone: field('phone')!.value,
    email: field('email')!.value,
    remarks: (form.elements.namedItem('remarks') as HTMLTextAreaElement).value,
    address: Object.fromEntries(addressFields.map((n) => [n, field(n)!.value])),
    website: field('website')!.value,
  });

  // ── the slip, the WhatsApp text ──
  const slipLines = document.querySelector('[data-slip-lines]')!;
  const slipMethod = document.querySelector('[data-slip-method]')!;
  const slipWhen = document.querySelector('[data-slip-when]')!;
  const slipFeeL = document.querySelector<HTMLElement>('[data-slip-fee-label]')!;
  const slipFee = document.querySelector<HTMLElement>('[data-slip-fee]')!;
  const slipTotal = document.querySelector('[data-slip-total]')!;
  const slipPay = document.querySelector('[data-slip-pay]')!;
  document.querySelector('[data-slip-ref]')!.textContent = ref;
  const wa = document.querySelector<HTMLAnchorElement>('[data-wa]')!;
  const waPreview = document.querySelector('[data-wa-preview]')!;
  const span = (text: string) => Object.assign(document.createElement('span'), { textContent: text });

  function update() {
    const { order } = readOrder(input(), data);
    for (const row of $$('.oi')) {
      const q = Number($<HTMLInputElement>('.qty__in', row)!.value) || 0;
      row.classList.toggle('is-on', q > 0);
    }
    const rows = [
      ...order.lines.flatMap((l: { qty: number; unit: Unit; name: string; sum: number | null }) => [span(`${qtyLabel(l.qty, l.unit)} ${l.name}`), span(l.sum === null ? t.slip.priceTbc : money(l.sum, locale, true))]),
      ...order.requests.flatMap((r: string) => [span(`„${r}”`), span(t.slip.priceTbc)]),
    ];
    if (rows.length) slipLines.replaceChildren(...rows);
    else slipLines.replaceChildren(Object.assign(document.createElement('p'), { className: 'slip__empty', textContent: t.slip.empty }));

    const delivery = order.method === 'delivery';
    slipMethod.textContent = delivery ? t.slip.delivery : t.slip.pickup;
    slipWhen.textContent = order.date && order.time ? `${dayLabel(order.date, locale, 'long')}, ${order.time}` : t.slip.whenPending;
    slipFeeL.hidden = slipFee.hidden = !delivery;
    slipPay.textContent = delivery ? t.slip.payDelivery : t.slip.pay;
    if (delivery) slipFee.textContent = t.slip.fee[order.quote?.status ?? 'unknown'];
    slipTotal.textContent = order.total === null || order.requests.length || !rows.length ? t.slip.priceTbc : money(order.total, locale, true);

    const text = waText({ ...order, date: state.date, time: state.time });
    waPreview.textContent = text;
    wa.href = `/wa?src=bestelbon&text=${encodeURIComponent(text)}`;
  }

  // ── the send ──
  const status = document.querySelector<HTMLElement>('[data-status]')!;
  const submit = document.querySelector<HTMLButtonElement>('[data-submit]')!;
  const clearErrors = () => {
    for (const f of $$('[aria-invalid="true"]')) f.removeAttribute('aria-invalid');
    for (const e of $$('.field__err')) e.remove();
    status.textContent = '';
  };
  // one line per thing to fix: the four address fields share one („Vul het adres volledig in.”), as do day and time
  const errLine = (key: string, text: string, tag = 'span') => {
    const el = Object.assign(document.createElement(tag), { className: 'field__err', textContent: text });
    el.dataset.err = key;
    return el;
  };
  const showErrors = (errors: string[]) => {
    clearErrors();
    let first: HTMLElement | null = null;
    for (const e of errors) {
      if (e === 'date' || e === 'time') {
        const box = e === 'time' && state.date ? timesBox : daysBox;
        box.setAttribute('aria-invalid', 'true');
        if (!$('[data-err="when"]')) timesBox.after(errLine('when', t.errors.when, 'p'));
        first ??= box;
        continue;
      }
      if (e === 'items') {
        const title = document.getElementById('os-products')!;
        title.after(errLine('items', t.errors.items, 'p'));
        first ??= title;
        continue;
      }
      const f = field(e);
      if (!f) continue;
      f.setAttribute('aria-invalid', 'true');
      const address = addressFields.includes(e);
      if (!address || !$('[data-err="address"]')) {
        const key = address ? 'address' : e;
        f.after(errLine(key, (t.errors as Record<string, string>)[key] ?? t.details.required));
      }
      first ??= f;
    }
    status.textContent = t.done.fix;
    first?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    if (first instanceof HTMLInputElement) first.focus({ preventScroll: true });
  };

  form.addEventListener('input', (e) => {
    const f = e.target as HTMLElement;
    if (f.getAttribute('aria-invalid') === 'true') {
      f.removeAttribute('aria-invalid');
      f.nextElementSibling?.classList.contains('field__err') && f.nextElementSibling.remove();
      if (addressFields.some((n) => field(n)?.getAttribute('aria-invalid') === 'true') === false) $('[data-err="address"]')?.remove();
    }
    if (f.matches('.qty__in, [data-requests]')) $('[data-err="items"]')?.remove();
    update();
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submit.getAttribute('aria-busy') === 'true') return;
    const body = input();
    const { errors } = readOrder(body, data);
    if (errors.length) return showErrors(errors);
    clearErrors();
    submit.setAttribute('aria-busy', 'true');
    submit.textContent = t.send.sending;
    try {
      const r = await fetch(form.action, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body) });
      const res = await r.json().catch(() => ({ ok: false, errors: ['send'] }));
      if (res.ok) {
        remember();
        done(res.ref ?? ref, !!res.dryRun);
        return;
      }
      if (r.status === 422 && Array.isArray(res.errors)) showErrors(res.errors);
      else status.textContent = t.done.error;
    } catch {
      status.textContent = t.done.error;
    } finally {
      submit.removeAttribute('aria-busy');
      submit.textContent = t.send.submit;
    }
  });

  function done(r: string, dry: boolean) {
    const panel = document.querySelector<HTMLElement>('[data-done]')!;
    panel.querySelector('[data-done-ref]')!.textContent = r;
    panel.querySelector<HTMLElement>('[data-done-ref-row]')!.hidden = false;
    const dryEl = panel.querySelector<HTMLElement>('[data-done-dry]')!;
    dryEl.hidden = !dry;
    dryEl.textContent = dry ? '(dry run: nothing was sent — see the dev-server terminal)' : '';
    form.hidden = true;
    panel.classList.add('is-on');
    panel.scrollIntoView({ block: 'start' });
    panel.focus();
  }

  // landing back from the no-script send (?ref=… #bedankt)
  const back = new URLSearchParams(location.search).get('ref');
  if (back && location.hash === '#bedankt') {
    const panel = document.querySelector<HTMLElement>('[data-done]')!;
    panel.querySelector('[data-done-ref]')!.textContent = back;
    panel.querySelector<HTMLElement>('[data-done-ref-row]')!.hidden = false;
  }

  syncMethod();
  update();
}
