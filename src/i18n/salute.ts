// The salute and the box's greeting in both languages (rows 11e + 11g; D-66 · D-69; lexicon §5.38 NL / §6 „Mitică,
// salutul la încărcare, 10.11” RO), verbatim. Its own small module so the salute's script (src/scripts/qa-salute.ts)
// ships both languages' four lines without the rest of the assistant's strings: on a Dutch page a browser set to
// Romanian gets the Romanian salute, and a tap opens the box with Mitică's greeting (and the other way round).
// src/i18n/assistant.ts reads its `salute` and `t.greeting` from here — one copy of each line.
export const saluteT = {
  nl: { salute: "Aan wie is 't? Aan u.", greeting: 'Dag! Ik ben Jefke. Zeg het maar.' },
  ro: { salute: 'Cine urmează? Tu.', greeting: 'Bună! Eu sunt Mitică. Ce să fie?' },
} as const;
