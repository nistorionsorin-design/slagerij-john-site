// The quote form's live layer (stage 6, QuoteForm.astro on /traiteur). Without it the form is a plain GET to /wa and
// the function fills the message. With it: today (Brussels) as the earliest date · the WhatsApp-bericht preview,
// rewritten on every change (an empty field keeps its [bracket word]) · the lexicon §5.21 error line under each field ·
// the send: /wa?src=traiteur-form&text=<the message>, which logs the click and opens WhatsApp.
import { brussels, iso } from '../lib/order-core.js';
import { fillQuote } from '../lib/quote-core.js';

type Key = 'feest' | 'datum' | 'aantal' | 'plaats' | 'telefoon';
interface Data { locale: 'nl' | 'ro'; src: string; msg: string; errors: Record<Key, string> }

const form = document.querySelector<HTMLFormElement>('[data-quote]');
const dataEl = document.getElementById('quote-data');
if (form && dataEl) init(form, JSON.parse(dataEl.textContent ?? '{}') as Data);

function init(form: HTMLFormElement, d: Data) {
  const keys = Object.keys(d.errors) as Key[];
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement;
  const preview = form.querySelector<HTMLElement>('[data-quote-preview]')!;
  const today = iso(brussels().day);
  // the script checks the fields itself (the §5.21 line under the field); without it the browser's checks stay
  form.noValidate = true;
  (field('datum') as HTMLInputElement).min = today;

  const values = () => Object.fromEntries(keys.map((k) => [k, field(k).value.trim()])) as Record<Key, string>;
  const message = () => fillQuote(d.msg, values(), d.locale);
  const render = () => { preview.textContent = message(); };

  // one rule per field, the same as the server would need: a date from today on, a whole number of persons ≥ 1,
  // a phone with at least 8 digits (the bestelbon's rule, src/lib/order-core.js)
  const invalid = (k: Key, v: string) => {
    if (!v) return true;
    if (k === 'datum') return !/^\d{4}-\d{2}-\d{2}$/.test(v) || v < today;
    if (k === 'aantal') return !/^\d+$/.test(v) || Number(v) < 1;
    if (k === 'telefoon') return (v.match(/\d/g) ?? []).length < 8;
    return false;
  };
  const clear = (f: HTMLElement) => {
    f.removeAttribute('aria-invalid');
    f.removeAttribute('aria-describedby');
    document.getElementById(`qf-err-${f.getAttribute('name')}`)?.remove();
  };
  const mark = (k: Key) => {
    const f = field(k);
    const line = Object.assign(document.createElement('span'), { className: 'field__err', id: `qf-err-${k}`, textContent: d.errors[k] });
    f.setAttribute('aria-invalid', 'true');
    f.setAttribute('aria-describedby', line.id);
    f.after(line);
  };

  form.addEventListener('input', (e) => {
    const f = e.target as HTMLElement;
    if (f.getAttribute('aria-invalid') === 'true') clear(f);
    render();
  });
  form.addEventListener('change', render);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = values();
    for (const k of keys) clear(field(k));
    const bad = keys.filter((k) => invalid(k, v[k]));
    if (bad.length) {
      bad.forEach(mark);
      field(bad[0]).focus();
      return;
    }
    location.assign(`/wa?src=${encodeURIComponent(d.src)}&text=${encodeURIComponent(message())}`);
  });

  render();
}
