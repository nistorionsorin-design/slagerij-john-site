// How the assistant says things (row 11a, moved here in row 11b so the order helper — lib/assistant/order.js — builds
// its answers the same way as the engine): a lexicon template filled with slot values, the reply object the box draws,
// a list in words, and the WhatsApp / phone hand-off. Plain JavaScript, no DOM: the island and row 11c's function
// import it through the engine.

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** a template filled: segments of text, a slot may be a link ({ t, href }); the sentence starts with a capital */
export function fill(tpl, slots = {}) {
  const segs = [];
  let rest = tpl;
  const re = /\{(\w+)\}/;
  let m;
  while ((m = re.exec(rest))) {
    if (m.index) segs.push({ t: rest.slice(0, m.index) });
    const v = slots[m[1]];
    if (v && typeof v === 'object') segs.push(v);
    else segs.push({ t: String(v ?? '') });
    rest = rest.slice(m.index + m[0].length);
  }
  if (rest) segs.push({ t: rest });
  if (segs[0]) segs[0] = { ...segs[0], t: cap(segs[0].t) };
  return segs;
}
export const textLine = (t) => [{ t }];
/** a filled template as plain text */
export const plain = (tpl, slots) => fill(tpl, slots).map((s) => s.t).join('');

/** The answer the box draws. Row 11b adds `slip` (the order so far: title, lines, when, total, notes) and `foot`
 *  (lines under the buttons: the bestelbon's name-and-phone line). */
export function reply(lang, extra = {}) {
  return { lang, face: 'answer', lines: [], cards: [], chips: [], acts: [], link: null, slip: null, foot: [], ...extra };
}

/** „a, b of c” / „a, b sau c” */
export const listOf = (ix, L, names) => {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} ${ix.s[L].or} ${names[names.length - 1]}`;
};

export function waHref(ix, L, question) {
  const text = plain(ix.s[L].t.waText, { question: question.trim() });
  return `/wa?src=qa&text=${encodeURIComponent(text)}${L === 'ro' ? '&lang=ro' : ''}`;
}
export function handoff(ix, r, L, question, call = true) {
  const t = ix.s[L].t;
  r.acts.push({ kind: 'wa', label: t.askWa, href: waHref(ix, L, question) });
  if (call) r.acts.push({ kind: 'tel', label: t.call, href: `tel:${ix.tel}` });
}
