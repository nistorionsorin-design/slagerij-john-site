// The assistant's conversation in the page (row 11a; loaded by qa.ts on first use). Fetches /assistant-index.json
// once, asks the engine (lib/assistant/engine.js — the same module row 11c's function will import) and draws its
// answer: the bubble with the pig's face (D-60 states: greet on open · read until the answer · answer · miss ·
// serious on every allergen answer and handoff), the product cards, the buttons, the chips. Text only through
// textContent; every link is the engine's own (/producten#…, /wa?src=qa…, tel:). The conversation's state (language,
// the last product, a question back, misses in a row, the draft slot of row 11b) is kept in sessionStorage, wrapped in
// try/catch: it survives a page change in this tab, is gone when the tab closes, and is never sent anywhere.
// Row 11b: the order helper — the draft travels in the same state; the box draws the slip, the card's „Zet in mijn
// bestelling”, the two handover buttons (to the pre-filled bestelbon, or WhatsApp through /wa?src=qa-order) and the
// line under them. One thing is sent, after a second miss in a row only: the question, cut of digits and e-mail
// addresses, to /api/miss (D-58 point 3).
import { ask, newState, prepare } from '../lib/assistant/engine.js';
import { cleanMiss } from '../lib/assistant/misses.js';
import chatCss from '../styles/qa-chat.css?raw';

type Seg = { t: string; href?: string };
type Card = { id: string; name: string; price: string; line: string; th: string | null; href: string; more: string; add?: string };
type Act = { kind: 'wa' | 'tel' | 'link' | 'switch' | 'form'; label: string; href?: string; lang?: string; order?: boolean };
type Chip = { label: string; ask?: string; pick?: string };
type Slip = { title: string; lines: string[]; when: string | null; total: string; notes: string[] };
type Reply = { lang: 'nl' | 'ro'; face: string; lines: Seg[][]; cards: Card[]; chips: Chip[]; acts: Act[]; link: Seg[] | null; slip?: Slip | null; foot?: Seg[][] };
type State = { lang: 'nl' | 'ro'; last: string | null; pend: unknown; miss: number; draft: { items?: unknown[] } | null };

const KEY = 'qa-state';
const read = (): State | null => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
  } catch {
    return null;
  }
};
const write = (s: State) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode, storage off: the conversation still works on this page */
  }
};

let index: Promise<unknown> | null = null;
const ctls = new WeakMap<HTMLElement, ReturnType<typeof make>>();

export async function init(box: HTMLElement) {
  index ??= fetch('/assistant-index.json').then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  });
  let ix: ReturnType<typeof prepare>;
  try {
    ix = prepare(await index);
  } catch (e) {
    // not remembered as failed: the next question fetches again
    index = null;
    throw e;
  }
  if (!document.getElementById('qa-chat-css')) document.head.append(Object.assign(document.createElement('style'), { id: 'qa-chat-css', textContent: chatCss }));
  if (!ctls.has(box)) ctls.set(box, make(box, ix));
  return ctls.get(box)!;
}

function make(box: HTMLElement, ix: any) {
  const lang = (box.dataset.lang === 'ro' ? 'ro' : 'nl') as 'nl' | 'ro';
  const page = box.dataset.page ?? 'home';
  const path = location.pathname.replace(/\.html$/, '').replace(/(.)\/$/, '$1');
  const log = box.querySelector<HTMLElement>('[data-qa-log]')!;
  const start = box.querySelector<HTMLElement>('[data-qa-chips]')!;
  const restartBtn = box.querySelector<HTMLButtonElement>('[data-qa-restart]')!;
  // the faces that move are full copies of the page's one drawing (lib/mascot.ts: the <symbol> of QaSheet.astro)
  const sym = document.getElementById('qa-pig')!;
  const waIcon = document.querySelector('.bar__link--accent svg, .sign__cta svg');
  const slow = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let state: State = { ...newState(lang), ...(read() ?? {}) };
  let busy = false;

  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const drawing = (s: string) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const a of ['viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin']) svg.setAttribute(a, sym.getAttribute(a) ?? '');
    svg.setAttribute('class', 'mascot');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.dataset.s = s;
    for (const n of sym.childNodes) svg.append(n.cloneNode(true));
    return svg;
  };
  const face = (s: string) => {
    const wrap = el('span', 'qa__face');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.append(drawing(s));
    return wrap;
  };
  const setFace = (li: HTMLElement, s: string) => {
    let svg = li.querySelector<SVGElement>('.qa__face svg');
    if (!svg) return;
    // the greeting's face is a <use> copy at rest: it becomes a drawing of its own to move
    if (svg.querySelector('use')) {
      const full = drawing('rest');
      svg.replaceWith(full);
      svg = full;
    }
    svg.dataset.s = s;
    // answer: one nod, then back to rest after 2 s; greet: the ears once (1,2 s); miss and serious stay
    if (s === 'answer' || s === 'greet') setTimeout(() => svg.dataset.s === s && (svg.dataset.s = 'rest'), s === 'answer' ? 2000 : 1300);
  };
  const segs = (p: HTMLElement, line: Seg[]) => {
    for (const s of line) {
      if (!s.href) p.append(s.t);
      else {
        const a = el('a', '', s.t);
        a.href = s.href;
        p.append(a);
      }
    }
    return p;
  };
  const scroll = () => {
    log.scrollTop = log.scrollHeight;
  };
  const me = (text: string) => {
    const li = el('div', 'qa__msg qa__msg--me');
    li.append(el('div', 'qa__bub', text));
    log.append(li);
    start.hidden = true;
    restartBtn.hidden = false;
    scroll();
  };
  const bot = (s = 'read') => {
    const li = el('div', 'qa__msg qa__msg--bot qa__msg--wait');
    li.append(face(s), el('div', 'qa__bub'));
    log.append(li);
    scroll();
    return li;
  };

  const draw = (li: HTMLElement, r: Reply) => {
    li.classList.remove('qa__msg--wait');
    const bub = li.querySelector<HTMLElement>('.qa__bub')!;
    if (r.lang !== lang) bub.lang = r.lang === 'ro' ? 'ro-BE' : 'nl-BE';
    for (const line of r.lines) bub.append(segs(el('p'), line));
    // row 11b: the order so far, as the bestelbon's slip writes it
    if (r.slip) {
      const box = el('div', 'qa__slip');
      box.append(el('b', 'qa__slip-t', r.slip.title));
      if (r.slip.lines.length) {
        const ul = el('ul');
        for (const l of r.slip.lines) ul.append(el('li', '', l));
        box.append(ul);
      }
      if (r.slip.when) box.append(el('p', 'qa__slip-w', r.slip.when));
      box.append(el('p', 'qa__slip-sum', r.slip.total));
      for (const n of r.slip.notes) box.append(el('p', 'qa__slip-n', n));
      bub.append(box);
    }
    if (r.cards.length) {
      const ul = el('ul', 'qa__cards');
      for (const c of r.cards) {
        const a = el('a', 'qa__card');
        a.href = c.href;
        a.dataset.card = c.id;
        if (c.th) {
          const img = el('img');
          Object.assign(img, { src: c.th, alt: '', width: 56, height: 56, loading: 'lazy', decoding: 'async' });
          a.append(img);
        } else {
          const m = el('span', 'qa__card-mono', [...c.name][0]?.toUpperCase() ?? '');
          m.setAttribute('aria-hidden', 'true');
          a.append(m);
        }
        const tx = el('span');
        tx.append(el('b', '', c.name));
        if (c.price) tx.append(el('span', 'qa__card-p', c.price));
        if (c.line) tx.append(el('span', 'qa__card-l', c.line));
        tx.append(el('span', 'qa__card-m', c.more));
        a.append(tx);
        const it = el('li');
        it.append(a);
        // row 11b: „Zet in mijn bestelling” — a tap the engine reads as add:<id> (the quantity is asked next)
        if (c.add) {
          const b = el('button', 'qa__add', c.add);
          b.type = 'button';
          b.dataset.pick = `add:${c.id}`;
          it.append(b);
        }
        ul.append(it);
      }
      bub.append(ul);
    }
    if (r.link) bub.append(segs(el('p', 'qa__link'), r.link));
    if (r.acts.length) {
      const row = el('div', 'qa__acts');
      for (const a of r.acts) {
        // WhatsApp stays the one primary (D-33); „Naar de bestelbon” is the secondary beside it
        const b = el('a', a.kind === 'wa' ? 'btn btn--primary btn--sm' : a.kind === 'link' ? 'link-arrow' : 'btn btn--secondary btn--sm');
        if (a.kind === 'switch') {
          const alt = document.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${a.lang}-BE"]`);
          b.href = alt ? new URL(alt.href).pathname : a.lang === 'ro' ? '/ro' : '/';
          b.dataset.switch = a.lang;
        } else b.href = a.href!;
        if (a.kind === 'wa') {
          b.dataset.wa = '';
          b.rel = 'nofollow';
          if (waIcon) b.append(waIcon.cloneNode(true));
        }
        b.append(el('span', '', a.label));
        row.append(b);
      }
      bub.append(row);
    }
    for (const line of r.foot ?? []) bub.append(segs(el('p', 'qa__foot-l'), line));
    if (r.chips.length) {
      const row = el('div', 'qa__chips');
      for (const c of r.chips) {
        const b = el('button', 'qa__chip', c.label);
        b.type = 'button';
        if (c.pick) b.dataset.pick = c.pick;
        else b.dataset.ask = c.ask ?? c.label;
        row.append(b);
      }
      bub.append(row);
    }
    setFace(li, r.face);
    scroll();
  };

  // the block of the page in view when the question is sent (row 11c reads it; 11a passes it along)
  const section = () => {
    const mid = innerHeight / 2;
    for (const s of document.querySelectorAll<HTMLElement>('[data-qa-section]')) {
      const b = s.getBoundingClientRect();
      if (b.top <= mid && b.bottom >= mid) return s.dataset.qaSection ?? null;
    }
    return null;
  };

  const turn = (input: { text?: string; pick?: string }) => {
    if (busy) return;
    busy = true;
    const li = bot('read');
    const res = ask(ix, state, { ...input, page, pageLang: lang, path, section: section(), now: new Date() });
    state = res.state as State;
    write(state);
    // row 11b (D-58 point 3): a second miss in a row — and only that, never an allergen answer, a hand-off or an order —
    // goes to /api/miss as {lang, page, q}, the text already cut of digits and e-mail addresses (misses.js)
    if ((res.dbg as { intent?: string }).intent === 'miss-2' && input.text) {
      const row = cleanMiss({ lang: (res.reply as Reply).lang, page: path, q: input.text });
      if (row) navigator.sendBeacon?.('/api/miss', JSON.stringify(row));
    }
    // the face reads for a moment, then answers (the engine is instant; the pause lets the bubble be noticed)
    setTimeout(
      () => {
        draw(li, res.reply as Reply);
        busy = false;
      },
      slow ? 0 : 420,
    );
  };

  return {
    ask(text: string) {
      me(text);
      turn({ text });
    },
    pick(id: string, label: string) {
      me(label);
      turn({ pick: id });
    },
    restart() {
      for (const li of [...log.children].slice(1)) li.remove();
      // row 11b: an order in the conversation goes with it (§5.34 „Uw bon is leeg. Wij beginnen opnieuw.”)
      const filled = !!state.draft?.items?.length;
      state = newState(lang);
      write(state);
      const li = bot('greet');
      draw(li, { lang, face: 'greet', lines: [[{ t: filled ? ix.s[lang].o.cleared : ix.s[lang].t.restart }]], cards: [], chips: [], acts: [], link: null });
      start.hidden = false;
      restartBtn.hidden = true;
    },
    /** the sheet opened: the pig greets; from a product sheet, that product is what „this” means next */
    opened(product: string | null) {
      const first = log.querySelector<HTMLElement>('.qa__msg--bot');
      if (first) setFace(first, 'greet');
      if (!product) return;
      const p = ix._byId.get(product);
      if (!p) return;
      state = { ...state, last: product };
      write(state);
      const li = bot('rest');
      draw(li, { lang, face: 'rest', lines: [], cards: [{ id: p.id, name: p.n[lang], price: p.pl?.[lang] ?? '', line: p.line?.[lang] ?? '', th: p.th, href: p.href[lang], more: ix.s[lang].t.more.replace('{product}', p.n[lang]), add: ix.s[lang].o.add }], chips: [], acts: [], link: null });
    },
    act(a: HTMLElement) {
      // after a handover to WhatsApp: the pig's goodbye (§5.33 „Tot aan de toog!”), in the conversation's language
      if (a.dataset.wa !== undefined) {
        const L = state.lang ?? lang;
        const li = bot('rest');
        draw(li, { lang: L, face: 'rest', lines: [[{ t: ix.s[L].t.handover }]], cards: [], chips: [], acts: [], link: null });
      }
    },
  };
}
