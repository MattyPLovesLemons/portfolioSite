(() => {
  'use strict';

  const desktop = window.matchMedia('(min-width: 900px)');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const paneLeft = document.getElementById('pane-left');
  const paneRight = document.getElementById('pane-right');

  // Pair each left-hand link with the section on the right it points to.
  const entries = Array.from(document.querySelectorAll('.nav-item[href^="#"]'))
    .map((link) => ({ link, section: document.getElementById(link.getAttribute('href').slice(1)) }))
    .filter((entry) => entry.section);
  const sections = entries.map((entry) => entry.section);

  const behavior = (smooth = true) => (smooth && !reduceMotion.matches ? 'smooth' : 'auto');

  /* ---------- Scrolling ---------- */

  function goTo(id, { smooth = true, updateHash = true } = {}) {
    const target = document.getElementById(id);
    if (!target) return;

    if (desktop.matches) {
      // Desktop: only the right page moves.
      const offset = target.getBoundingClientRect().top - paneRight.getBoundingClientRect().top;
      paneRight.scrollTo({ top: paneRight.scrollTop + offset, behavior: behavior(smooth) });
    } else {
      // Mobile: pages are stacked, so scroll the whole document.
      target.scrollIntoView({ behavior: behavior(smooth), block: 'start' });
    }

    if (updateHash) history.replaceState(null, '', '#' + id);
    target.focus({ preventScroll: true });
  }

  function goTop() {
    if (desktop.matches) {
      paneRight.scrollTo({ top: 0, behavior: behavior() });
    } else {
      window.scrollTo({ top: 0, behavior: behavior() });
    }
    history.replaceState(null, '', location.pathname + location.search);
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('.nav-item[href^="#"]');
    if (link) {
      event.preventDefault();
      goTo(link.getAttribute('href').slice(1));
      return;
    }

    const next = event.target.closest('[data-next]');
    if (next) {
      const index = sections.indexOf(next.closest('.project'));
      if (index > -1 && sections[index + 1]) goTo(sections[index + 1].id);
      return;
    }

    if (event.target.closest('[data-top]')) goTop();
  });

  /* ---------- Highlight the link for the project in view ---------- */

  let ticking = false;

  function update() {
    ticking = false;
    if (!sections.length) return;

    const isDesktop = desktop.matches;
    const viewportTop = isDesktop ? paneRight.getBoundingClientRect().top : 0;
    const viewportHeight = isDesktop ? paneRight.clientHeight : window.innerHeight;
    const marker = viewportTop + viewportHeight * 0.35;

    let current = isDesktop ? sections[0] : null;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= marker) current = section;
    }

    // At the very bottom, the last section wins even if it's short.
    const atBottom = isDesktop
      ? paneRight.scrollTop + paneRight.clientHeight >= paneRight.scrollHeight - 2
      : window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atBottom) current = sections[sections.length - 1];

    for (const { link, section } of entries) {
      const active = section === current;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  }

  function schedule() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  paneRight.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);

  /* ---------- Desktop vs. mobile ---------- */

  function applyMode() {
    // On desktop each page is its own scroll area, so let keyboard users focus and scroll it.
    [paneLeft, paneRight].forEach((pane) => {
      if (desktop.matches) pane.setAttribute('tabindex', '0');
      else pane.removeAttribute('tabindex');
    });
    update();
  }

  desktop.addEventListener('change', applyMode);
  applyMode();

  /* ---------- Placeholder for images that don't exist yet ---------- */

  document.querySelectorAll('.media img').forEach((img) => {
    const markMissing = () => img.closest('.media').classList.add('is-missing');
    if (img.complete && img.naturalWidth === 0) markMissing();
    img.addEventListener('error', markMissing);
  });

  /* ---------- Deep links: yoursite.com/#project-2 ---------- */

  window.addEventListener('load', () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id && sections.some((section) => section.id === id)) {
      goTo(id, { smooth: false, updateHash: false });
    }
    update();
  });
})();