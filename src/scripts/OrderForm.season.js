// Stage 7b — the seasonal menu asked for in the address (/bestellen?menu=eindejaar) is shown while the page is still
// being parsed. A classic script, not a module: OrderForm.astro places it right after the menu sections and before
// the counter's groups, so it runs before those are laid out and the section is there in the first layout that has
// them. Measured 09.10: CSS :target only matches at DOMContentLoaded (after the module scripts), so the section
// appeared under an already painted page and pushed the colli group out of view (CLS 0,139, Lighthouse mobile).
// order.ts still does everything else (closed menu, days, pickup only); this only unhides.
(function () {
  var p = new URLSearchParams(location.search).get('menu');
  if (!p) return;
  var s = document.querySelectorAll('[data-season]');
  for (var i = 0; i < s.length; i++) if (s[i].getAttribute('data-season') === p) s[i].hidden = false;
})();
