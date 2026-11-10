// The assistant's face (D-60): design/svg/mascot.svg (src/assets/mascot.svg, byte-identical) drawn once per page as a
// <symbol> (QaSheet.astro) and shown at rest by <use> on the „Vraag het ons” buttons and the box — one copy of the
// drawing per page instead of four (≈ 1,9 kB gzip on every page, row 11a). The faces that move (greet · read · answer ·
// miss · serious, design/css/mascot.css) are full copies, built from the symbol by src/scripts/qa-ui.ts when the box
// is first used: the state rules select the drawing's own parts, which a <use> copy does not expose.
import mascot from '../assets/mascot.svg?raw';

const open = mascot.match(/<svg\b[^>]*>/)![0];
const attr = (name: string) => open.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const inner = mascot.slice(mascot.indexOf(open) + open.length, mascot.lastIndexOf('</svg>')).trim();
const paint = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'].map((k) => `${k}="${attr(k)}"`).join(' ');

/** the drawing as a symbol, once per page (hidden; <use> copies it) */
export const pigSymbol = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><symbol id="qa-pig" viewBox="${attr('viewBox')}" ${paint}>${inner}</symbol></svg>`;

/** the face at rest, by reference */
export const pigUse = `<svg class="mascot" viewBox="${attr('viewBox')}" data-s="rest" aria-hidden="true" focusable="false"><use href="#qa-pig"/></svg>`;
