// Header — „het uithangbord” (design/css/header.css, stage 0b2). External file: the CSP has
// script-src 'self'. Without it the sign stays where the CSS puts it, the burger is a link to
// #menu and the menu is a plain list before the footer.
const sign = document.querySelector<HTMLElement>('[data-sign]');
const menu = document.querySelector<HTMLElement>('[data-menu]');
const link = sign?.querySelector<HTMLAnchorElement>('[data-burger]');

// ── the overlay menu (phone): burger → X, focus to the first link, Esc closes, scroll locked ──
if (sign && menu && link) {
  const label = (open: boolean) => (open ? link.dataset.close : link.dataset.open) ?? 'Menu';
  const burger = document.createElement('button');
  burger.type = 'button';
  burger.className = link.className;
  burger.innerHTML = link.innerHTML;
  burger.setAttribute('aria-controls', menu.id);
  burger.setAttribute('aria-expanded', 'false');
  burger.setAttribute('aria-label', label(false));
  link.replaceWith(burger);
  menu.hidden = true;
  menu.classList.remove('menu--flat');
  sign.after(menu); // tab order: burger → menu links

  const set = (open: boolean, focus = true) => {
    menu.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', label(open));
    sign.classList.toggle('is-open', open);
    document.documentElement.classList.toggle('menu-open', open);
    if (focus) (open ? menu.querySelector<HTMLElement>('a[href]') : burger)?.focus();
  };
  burger.addEventListener('click', () => set(menu.hidden));
  document.addEventListener('keydown', (e) => {
    if (menu.hidden) return;
    if (e.key === 'Escape') return set(false);
    if (e.key !== 'Tab') return;
    // keep focus inside burger + menu while the overlay covers the page
    const ring = [burger, ...menu.querySelectorAll<HTMLElement>('a[href], button')];
    const i = ring.indexOf(document.activeElement as HTMLElement);
    const next = e.shiftKey ? (i <= 0 ? ring.length - 1 : i - 1) : i === ring.length - 1 ? 0 : i + 1;
    e.preventDefault();
    ring[next].focus();
  });
  // turning a tablet to landscape past 960 px hides the overlay by CSS: close it properly too
  matchMedia('(min-width: 960px)').addEventListener('change', (m) => {
    if (m.matches && !menu.hidden) set(false, false);
  });
}

// ── compact after 80 px of scroll, at every width (header.css v2.2: phone 48 px solid ink; desktop 56 px,
// max 1040, place line gone). The sign never hides (D-27). ──
if (sign) {
  const onScroll = () => sign.classList.toggle('sign--compact', scrollY > 80);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
