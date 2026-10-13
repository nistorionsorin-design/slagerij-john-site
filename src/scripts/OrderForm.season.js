// Stage 7b / row 15b — the seasonal menu asked for in the address (/bestellen?menu=eindejaar) is flagged while the page
// is still being parsed. A classic script, not a module: OrderForm.astro places it right before the product pills, so
// it runs before the pills, the menu section and the counter's groups are laid out. Measured 09.10: CSS :target only
// matches at DOMContentLoaded (after the module scripts), so the section appeared under an already painted page and
// pushed the colli group out of view (CLS 0,139, Lighthouse mobile).
// It sets <html data-order-menu="<param>"> for a known menu (data-menus on this script): OrderForm's CSS then shows that
// menu's section and hides the regular groups the menu repeats, with their pills (lexicon §5.22, 13.10).
// order.ts still does everything else (closed menu, days, pickup only).
(function () {
  var p = new URLSearchParams(location.search).get('menu');
  var s = document.currentScript;
  if (!p || !s) return;
  var known = (s.getAttribute('data-menus') || '').split(' ');
  if (known.indexOf(p) !== -1) document.documentElement.setAttribute('data-order-menu', p);
})();
