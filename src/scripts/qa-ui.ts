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
// Row 11c (D-59, docs/assistant.md §11): the Claude layer. On the first use the box asks GET /api/ask whether the layer
// is on; if so the label becomes the AI label of lexicon §5.33 (before the first answer, AI Act art. 50) and the
// personal-data line shows under the input. A typed question then goes to POST /api/ask with the context of §11.4 (the
// page, the block in view, the product sheet it was opened from, how it was opened), the conversation's state and its
// last 12 turns as plain text; the answer streams in as checked sentences and is drawn in the box's own shape. Any
// failure (no layer, the cap, a timeout, an error, a check) answers with the local engine, as before — no error on
// screen. A tap on a chip or a card's button stays local (the order helper's picks). Nothing else is sent or kept.
// Row 11d (D-65, docs/assistant.md §13): under an answer, at most two next-question buttons (the reply's `nq`, labels of
// assistant-paths.json). A tap shows its label as the customer's bubble and is answered by the local engine at once —
// no model call, also with the layer on; the turn joins the history the layer gets with the next typed question. With
// the layer on (and only then), two kinds of numbers-only rows go to /api/ask as a beacon: a tap (the id tapped, the ids
// shown under its answer) and a handover (a click on „Naar de bestelbon” / a WhatsApp button, with the ids tapped so far
// in this conversation — kept in this page's memory, never stored). Opened from a product's sheet, the box opens with
// „Over {product}: wat wilt u weten?” (§13.6). Row 11g (D-69): opened after the salute in the other language, the box
// speaks that language — Mitică's or Jefke's greeting and the offer of the site in it.
import { ask, newState, prepare, opening } from '../lib/assistant/engine.js';
import { cleanMiss } from '../lib/assistant/misses.js';
import chatCss from '../styles/qa-chat.css?raw';

type Seg = { t: string; href?: string };
type Card = { id: string; name: string; price: string; line: string; th: string | null; href: string; more: string; add?: string };
type Act = { kind: 'wa' | 'tel' | 'link' | 'switch' | 'form'; label: string; href?: string; lang?: string; order?: boolean };
type Chip = { label: string; ask?: string; pick?: string };
type Slip = { title: string; lines: string[]; when: string | null; total: string; notes: string[] };
type Reply = { lang: 'nl' | 'ro' | 'en' | 'fr'; face: string; lines: Seg[][]; cards: Card[]; chips: Chip[]; acts: Act[]; link: Seg[] | null; slip?: Slip | null; foot?: Seg[][]; nq?: { id: string; label: string; p?: string }[]; cardsLabel?: string };
type Hist = { r: 'u' | 'a'; t: string };
type State = { lang: 'nl' | 'ro'; last: string | null; pend: unknown; miss: number; draft: { items?: unknown[] } | null; off?: string[]; no?: boolean; n?: number; nq?: unknown };
type Ev = { t: 'wait' | 'delta' | 'reset' | 'done' | 'local' | 'fallback'; d?: string; reply?: Reply; st?: Partial<State>; why?: string; unanswered?: boolean };

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
/** row 11e (4): a deadline for a request that works in every browser — an AbortController with a timer (not
 *  AbortSignal.timeout); `stop` once the answer is read */
const timer = (ms: number) => {
  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), ms);
  return { signal: ac.signal, stop: () => clearTimeout(id) };
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
  // row 11c: the last 12 turns as plain text, for the Claude layer — in memory only, never in sessionStorage, so nothing
  // a customer typed (a name, an address) stays on the device; a page change starts the history afresh (the state with
  // the draft and the last product goes on, as since row 11a)
  let hist: Hist[] = [];
  // the context of the next question — how the box was opened, and the product sheet it was opened from
  let openedFrom: 'inline' | 'button' | 'sheet' = 'inline';
  let sheetProduct: string | null = null;
  // the Claude layer: asked on the first use; the label switches before the first answer. Row 11e (4) — the live fault of
  // 10.11 15:17 (docs/data/measurements/2026-11-10/assistant-hang-repro.json): a check that never answered held every
  // typed question for good. Now it gives up after 2,5 s and counts as „off” for that question (the local engine answers
  // at once); a check that timed out or failed is asked again on the next typed question, so the layer can still come
  // on in this visit (the label switches then). A plain „off” from the server stays off.
  let aiCheck: Promise<boolean> | null = null;
  // row 11d: whether the layer said „on” — the counts are sent only then; the ids tapped in this conversation (memory only)
  let aiOn = false;
  let tapped: string[] = [];
  const layer = (): Promise<boolean> =>
    (aiCheck ??= (() => {
      const t = timer(2500);
      return fetch('/api/ask', { headers: { accept: 'application/json' }, signal: t.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { on?: boolean } | null) => (j && typeof j === 'object' ? !!j.on : null))
        .catch(() => null)
        .then((on) => {
          t.stop();
          if (on === null) {
            aiCheck = null;
            return false;
          }
          if (on) {
            aiOn = true;
            const auto = box.querySelector<HTMLElement>('.qa__auto');
            if (auto) auto.textContent = ix.s[lang].ai.label;
            const np = box.querySelector<HTMLElement>('[data-qa-nopersonal]');
            if (np) np.hidden = false;
          }
          return on;
        });
    })());
  void layer();

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
        // row 11c (D-64): the credit's link to dg-advisory.net under the „who made this” answer — a plain outbound link
        if (/^https?:/.test(s.href)) a.rel = 'noopener';
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
    // row 11c: an answer in another language (English) is marked as such for screen readers
    if (r.lang !== lang) bub.lang = r.lang === 'ro' ? 'ro-BE' : r.lang === 'en' || r.lang === 'fr' ? r.lang : 'nl-BE';
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
    // row 11d: „Past erbij” / „Merge cu” over the cards of „what goes with it”
    if (r.cards.length && r.cardsLabel) bub.append(el('span', 'qa__cards-t', r.cardsLabel));
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
        // row 11d: „Naar de bestelbon” — its click is a handover (counted with the layer on)
        if (a.kind === 'form') b.dataset.form = '';
        if (a.kind === 'wa' && a.order) b.dataset.order = '';
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
    // row 11d: the next question — at most two buttons, the file's labels, after the whole answer
    if (r.nq?.length) {
      const row = el('div', 'qa__chips');
      for (const c of r.nq) {
        const b = el('button', 'qa__chip', c.label);
        b.type = 'button';
        // a pick like the order helper's (qa.ts reads data-pick): nq:<id>@<the product it was drawn for>
        b.dataset.pick = `nq:${c.id}${c.p ? `@${c.p}` : ''}`;
        b.dataset.nq = c.id;
        row.append(b);
      }
      bub.append(row);
    }
    setFace(li, r.face);
    scroll();
  };

  // the block of the page in view when the question is sent (row 11c reads it; 11a passes it along)
  // row 11c: of the blocks across the middle line, the one nearest the screen's centre — two cards side by side on a
  // desktop row (the colli) are told apart; the outer section that holds them loses to the card itself
  const section = () => {
    const mid = innerHeight / 2;
    const cx = innerWidth / 2;
    let best: { id: string | null; d: number; area: number } | null = null;
    for (const s of document.querySelectorAll<HTMLElement>('[data-qa-section]')) {
      const b = s.getBoundingClientRect();
      if (!(b.top <= mid && b.bottom >= mid) || !b.width) continue;
      const d = Math.hypot((b.left + b.right) / 2 - cx, (b.top + b.bottom) / 2 - mid);
      const area = b.width * b.height;
      if (!best || area < best.area * 0.8 || (Math.abs(area - best.area) <= best.area * 0.2 && d < best.d)) best = { id: s.dataset.qaSection ?? null, d, area };
    }
    return best?.id ?? null;
  };

  const plainOf = (r: Reply) => r.lines.map((l) => l.map((x) => x.t).join('')).join(' ').slice(0, 1200);
  /** row 11d: one numbers-only row (§13.5) — with the layer on only; never a text, never an identifier */
  const count = (row: { ev: 'tap' | 'handover'; id?: string; shown?: string[]; tapped?: string[]; kind?: 'order' | 'handoff' }) => {
    if (!aiOn) return;
    try {
      navigator.sendBeacon?.('/api/ask', JSON.stringify({ ...row, lang, page: path }));
    } catch {
      /* not counted */
    }
  };
  /** the conversation after a typed question's answer: the state it left, one more message, the last 12 turns as text */
  const settle = (next: State, text: string, r: Reply) => {
    hist = [...hist, { r: 'u' as const, t: text.slice(0, 500) }, { r: 'a' as const, t: plainOf(r) }].slice(-24);
    state = { ...next, n: (state.n ?? 0) + 1 };
    write(state);
  };

  /** the local engine's answer (rows 11a/11b) — also the Claude layer's fallback */
  const local = (li: HTMLElement, input: { text?: string; pick?: string; label?: string }, pause: boolean) => {
    const res = ask(ix, state, { text: input.text, pick: input.pick, page, pageLang: lang, path, section: section(), product: sheetProduct, now: new Date() });
    if (input.text) settle(res.state as State, input.text, res.reply as Reply);
    else {
      state = res.state as State;
      write(state);
    }
    // row 11d: a next-question button — the turn joins the layer's history; the tap is counted (layer on)
    if (input.pick?.startsWith('nq:')) {
      const id = input.pick.slice(3).split('@')[0];
      tapped = [...tapped, id].slice(-40);
      hist = [...hist, { r: 'u' as const, t: (input.label ?? id).slice(0, 500) }, { r: 'a' as const, t: plainOf(res.reply as Reply) }].slice(-24);
      count({ ev: 'tap', id, shown: ((res.reply as Reply).nq ?? []).map((c) => c.id) });
    }
    // row 11b (D-58 point 3): a second miss in a row — and only that, never an allergen answer, a hand-off or an order —
    // goes to /api/miss as {lang, page, q}, the text already cut of digits and e-mail addresses (misses.js)
    if ((res.dbg as { intent?: string }).intent === 'miss-2' && input.text) {
      const row = cleanMiss({ lang: (res.reply as Reply).lang, page: path, q: input.text });
      if (row) navigator.sendBeacon?.('/api/miss', JSON.stringify(row));
    }
    // the face reads for a moment, then answers (the engine is instant; the pause lets the bubble be noticed)
    setTimeout(
      () => {
        try {
          draw(li, res.reply as Reply);
        } finally {
          busy = false;
        }
      },
      slow || !pause ? 0 : 420,
    );
  };

  /** row 11c: the question to /api/ask; the stream drawn as it comes; any failure → the local engine, silently */
  const remote = async (li: HTMLElement, text: string) => {
    const bub = li.querySelector<HTMLElement>('.qa__bub')!;
    const back = () => {
      bub.replaceChildren();
      local(li, { text }, false);
    };
    // row 11e (4): 12 s for the whole answer, the stream included — an AbortController with a timer (AbortSignal.timeout
    // is missing in older browsers: there it threw and the layer never answered)
    const t = timer(12000);
    try {
      const quiet = el('p', 'qa__writing', ix.s[lang].ai.writing);
      bub.append(quiet);
      const live = el('p');
      let shown = '';
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ q: text, lang, page, ctx: { page: path, section: section(), sheet: sheetProduct, opened_from: openedFrom }, st: state, hist }),
        signal: t.signal,
      });
      if (!res.ok || !res.body) return back();
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let at;
        while ((at = buf.indexOf('\n')) >= 0) {
          const ev = JSON.parse(buf.slice(0, at)) as Ev;
          buf = buf.slice(at + 1);
          if (ev.t === 'delta' && ev.d) {
            if (!shown) bub.replaceChildren(live);
            shown += ev.d;
            live.textContent = shown;
            scroll();
          } else if (ev.t === 'reset') {
            shown = '';
            bub.replaceChildren(quiet);
          } else if (ev.t === 'done' && ev.reply) {
            bub.replaceChildren();
            settle({ ...state, miss: 0, ...(ev.st ?? {}), pend: null } as State, text, ev.reply);
            // a question the Claude layer could not answer: to the weekly mail, as the local engine's second miss (D-58 point 3)
            if (ev.unanswered) {
              const row = cleanMiss({ lang: ev.reply.lang, page: path, q: text });
              if (row) navigator.sendBeacon?.('/api/miss', JSON.stringify(row));
            }
            draw(li, ev.reply);
            busy = false;
            return;
          } else if (ev.t === 'local' || ev.t === 'fallback') return back();
        }
      }
      back();
    } catch {
      back();
    } finally {
      t.stop();
    }
  };

  const turn = (input: { text?: string; pick?: string; label?: string }) => {
    if (busy) return;
    busy = true;
    let li: HTMLElement | undefined;
    // row 11e (4): one guard — whatever throws in turn / remote / local, the local engine answers and the box is free
    // again; if the engine itself fails, the empty bubble goes and the box still takes the next question
    const rescue = () => {
      try {
        if (!li) throw new Error('no bubble');
        li.querySelector('.qa__bub')?.replaceChildren();
        local(li, input, false);
      } catch {
        li?.remove();
        busy = false;
      }
    };
    try {
      li = bot('read');
      const at = li;
      // a typed question goes to the Claude layer when it is on; a tap (the order helper's picks) stays local
      const text = input.text;
      if (text) layer().then((on) => (on ? remote(at, text) : local(at, input, true))).catch(rescue);
      else local(at, input, true);
    } catch {
      rescue();
    }
  };

  return {
    ask(text: string) {
      me(text);
      turn({ text });
    },
    /** a chip or a button tapped: its label is the customer's bubble (row 11d: and, for a next-question button, the
     *  turn the layer's history gets) */
    pick(id: string, label: string) {
      me(label);
      turn({ pick: id, label });
    },
    restart() {
      for (const li of [...log.children].slice(1)) li.remove();
      // row 11b: an order in the conversation goes with it (§5.34 „Uw bon is leeg. Wij beginnen opnieuw.”)
      const filled = !!state.draft?.items?.length;
      state = newState(lang);
      sheetProduct = null;
      hist = [];
      tapped = [];
      write(state);
      const li = bot('greet');
      draw(li, { lang, face: 'greet', lines: [[{ t: filled ? ix.s[lang].o.cleared : ix.s[lang].t.restart }]], cards: [], chips: [], acts: [], link: null });
      start.hidden = false;
      restartBtn.hidden = true;
    },
    /** the sheet opened: the pig greets; from a product sheet, the opening line names that product (row 11d, §13.6) and
     *  it is what „this” means next; after the salute in the other language (row 11g), the box speaks that language */
    opened(product: string | null, from: 'button' | 'sheet' = 'button') {
      // row 11g: the floating button carries the salute's language when it was the other one (qa-salute.ts)
      const other = from === 'button' ? (document.querySelector<HTMLElement>('.qa-fab')?.dataset.qaLang ?? null) : null;
      const first = log.querySelector<HTMLElement>('.qa__msg--bot');
      if (first) setFace(first, 'greet');
      openedFrom = from;
      sheetProduct = product;
      // nothing asked yet in this box: its first bubble is still the greeting, and the opening line takes its place
      const fresh = !log.querySelector('.qa__msg--me') && log.children.length === 1;
      const greet = first?.querySelector<HTMLElement>('.qa__bub > p') ?? null;
      if (other !== lang && (other === 'nl' || other === 'ro') && !product) {
        // Mitică on a Dutch page, Jefke on a Romanian one (the salute set the greeting's text before the box opened), and
        // the box's own line that offers the site in that language — a box already in use keeps its conversation
        if (fresh && greet) {
          state = { ...state, lang: other };
          write(state);
          greet.textContent = ix.s[other].t.greeting;
          greet.parentElement!.lang = other === 'ro' ? 'ro-BE' : 'nl-BE';
          draw(bot('rest'), { lang: other, face: 'rest', lines: [[{ t: ix.s[other].t.switchAsk }]], cards: [], chips: [], acts: [{ kind: 'switch', label: ix.s[other].t.switchBtn, lang: other }], link: null });
        }
        return;
      }
      if (!product) return;
      const o = opening(ix, state, { product, pageLang: lang });
      if (!o) return;
      state = o.state as State;
      write(state);
      const r = o.reply as Reply;
      if (fresh && greet) {
        // the opening line instead of the greeting, then the card as before
        greet.textContent = r.lines[0].map((x) => x.t).join('');
        draw(bot('rest'), { ...r, face: 'rest', lines: [] });
      } else draw(bot('rest'), { ...r, face: 'rest' });
    },
    act(a: HTMLElement) {
      // row 11d: a handover — „Naar de bestelbon” or a WhatsApp button — with the ids tapped so far (layer on only)
      if (a.dataset.wa !== undefined || a.dataset.form !== undefined) count({ ev: 'handover', kind: a.dataset.form !== undefined || a.dataset.order !== undefined ? 'order' : 'handoff', tapped });
      // after a handover to WhatsApp: the pig's goodbye (§5.33 „Tot aan de toog!”), in the conversation's language
      if (a.dataset.wa !== undefined) {
        const L = state.lang ?? lang;
        const li = bot('rest');
        draw(li, { lang: L, face: 'rest', lines: [[{ t: ix.s[L].t.handover }]], cards: [], chips: [], acts: [], link: null });
      }
    },
  };
}
