// The assistant's normaliser (row 11a, docs/assistant.md §10.4): one way to read a customer's words and the shop's own
// words, so „Cârnați”, „carnati” and „CARNAȚII” meet. Plain JavaScript, no DOM, no storage: the browser island
// (src/scripts/qa-ui.ts), the build (lib/assistant/index.ts) and row 11c's Vercel function import the same file.
// fold: lowercase, every combining mark off (ă â î ș ş ț ţ é ë ô … → the bare letter; ș and ş both become s);
// norm: fold + every run of other characters becomes one space („l'ancien”, „12:00”, „bbq-pakket” → words).

const LIG = { ß: 'ss', æ: 'ae', œ: 'oe', ø: 'o', ł: 'l', đ: 'd' };

/** lowercase, no diacritics */
export const fold = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ßæœøłđ]/g, (c) => LIG[c]);

/** fold + only [a-z0-9] words separated by one space */
export const norm = (s) =>
  fold(s)
    .replace(/['’`´]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** the words of a text */
export const words = (s) => {
  const n = norm(s);
  return n ? n.split(' ') : [];
};

/** Damerau–Levenshtein distance, capped: returns cap + 1 as soon as it is certain to exceed `cap`. */
export function distance(a, b, cap = 2) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let prev2 = null;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur.push(v);
      if (v < best) best = v;
    }
    if (best > cap) return cap + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length];
}

/** Two normalised words are the same word for the assistant:
 *  - equal;
 *  - an ending added to a stem of 4+ letters, at most 3 letters long (mici → micii, worst → worsten, carnati → carnatii,
 *    lamskotelet → lamskoteletjes, zondag → zondags);
 *  - one typo (a letter missing, extra, wrong or two swapped) in a word of 5+ letters, two in a word of 9+
 *    (gehakt → gehackt, braadworst → braatworst, kipfilet → kipfillet).
 *  Digits never match fuzzily (11 is not 1). */
export function same(a, b) {
  if (a === b) return true;
  if (/\d/.test(a) || /\d/.test(b)) return false;
  const [s, l] = a.length <= b.length ? [a, b] : [b, a];
  if (s.length >= 4 && l.length - s.length <= 3 && l.startsWith(s)) return true;
  if (s.length < 5) return false;
  return distance(a, b, l.length >= 9 && s.length >= 8 ? 2 : 1) <= (l.length >= 9 && s.length >= 8 ? 2 : 1);
}

/** Where the phrase (normalised words) sits in the text's words: every start index where all its words follow one
 *  another, each `same` as the text's word. Exact = every word equal. */
export function find(text, phrase) {
  const out = [];
  if (!phrase.length || phrase.length > text.length) return out;
  for (let i = 0; i + phrase.length <= text.length; i++) {
    let exact = true;
    let ok = true;
    for (let k = 0; k < phrase.length; k++) {
      const t = text[i + k];
      const p = phrase[k];
      if (t === p) continue;
      if (!same(t, p)) {
        ok = false;
        break;
      }
      exact = false;
    }
    if (ok) out.push({ at: i, len: phrase.length, exact });
  }
  return out;
}
