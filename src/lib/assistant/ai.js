// The assistant's Claude layer — its switches (row 11c; docs/assistant.md §11; D-59 · D-63). Plain JavaScript: read by
// the function api/ask.js, by the privacy page (src/i18n/legal.ts) and by the box (src/scripts/qa-ui.ts asks
// GET /api/ask whether the layer is on).
// AI_LAYER: the layer at all. On: the box asks /api/ask first and shows the AI label of lexicon §5.33 once the function
// says a key is set; /privacy and /ro/confidentialitate carry the §5.33 paragraph (Anthropic as processor). Off (false):
// the function answers „fallback” to every message, the box keeps the 11b label, the privacy pages lose the paragraph
// — the site behaves exactly as after row 11b. Without ANTHROPIC_API_KEY the function also answers „fallback”.
export const AI_LAYER = true;
/** model calls a day for the production site id (§11.7 point 4: „start: 300”), counted in the metrics spine; above it
 *  the local engine answers. Local and preview runs (`slagerij-john-preview`) are never capped (row 11c (b)). */
export const DAILY_CAP = 300;
/** customer messages in one conversation, then Georgiana on WhatsApp (§11.7 point 1) */
export const MAX_MESSAGES = 20;
