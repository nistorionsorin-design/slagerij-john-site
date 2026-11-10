// The assistant's index (row 11a, docs/assistant.md §10.4) as a static file: dist/assistant-index.json, same origin,
// fetched by the box on the first question (never on page load). Built from the site's own data at build time.
import type { APIRoute } from 'astro';
import { assistantIndex } from '../lib/assistant/index';

export const GET: APIRoute = async () =>
  new Response(JSON.stringify(await assistantIndex()), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
