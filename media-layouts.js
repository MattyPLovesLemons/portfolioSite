/* Load AFTER script.js:  <script src="media-layouts.js" defer></script> */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function button(className, label, text) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = className;
    el.setAttribute('aria-label', label);
    el.textContent = text;
    return el;
  }

  // Cloned images don't inherit the "missing image" listener from script.js, so add it here.
  function watchMissing(img) {
    const mark = () => img.closest('.media')?.classList.add('is-missing');
    if (img.complete && img.naturalWidth === 0) mark();
    img.addEventListener('error', mark);
  }

  /* ---------- Manual strip: arrows + swipe/scroll ---------- */

  function initManual(strip) {
    const track = strip.querySelector('.strip__track');
    if (!track) return;

    const prev = button('strip__btn strip__btn--prev', 'Previous images', '←');
    const next = button('strip__btn strip__btn--next', 'Next images', '→');
    strip.append(prev, next);

    const scrollByPage = (direction) =>
      track.scrollBy({
        left: direction * track.clientWidth * 0.8,
        behavior: reduceMotion.matches ? 'auto' : 'smooth',
      });

    prev.addEventListener('click', () => scrollByPage(-1));
    next.addEventListener('click', () => scrollByPage(1));

    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      prev.disabled = track.scrollLeft <= 1;
      next.disabled = track.scrollLeft >= max - 1;
    };

    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- Conveyor belt: endless auto-scroll ---------- */

  function initBelt(strip) {
    const track = strip.querySelector('.strip__track');
    if (!track) return;

    const originals = Array.from(track.children);
    if (!originals.length) return;

    const copy = (item) => {
      const clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('img').forEach((img) => {
        img.alt = '';
        watchMissing(img);
      });
      return clone;
    };

    // 1) Make sure one "set" of images is at least as wide as the strip, so there's never a gap.
    let guard = 0;
    while (track.scrollWidth < strip.clientWidth && guard++ < 10) {
      originals.forEach((item) => track.appendChild(copy(item)));
    }
    const setWidth = track.scrollWidth;

    // 2) Duplicate the whole set once; the animation slides exactly one set and loops seamlessly.
    Array.from(track.children).forEach((item) => track.appendChild(copy(item)));

    // 3) Constant speed no matter how many images there are (pixels per second).
    const speed = Number(strip.dataset.speed) || 40;
    track.style.animationDuration = `${setWidth / speed}s`;
    strip.classList.add('is-running');

    // Pause control for anyone who can't hover
    const pause = button('strip__pause', 'Pause the moving images', 'Pause');
    pause.addEventListener('click', () => {
      const paused = strip.classList.toggle('is-paused');
      pause.textContent = paused ? 'Play' : 'Pause';
      pause.setAttribute('aria-label', paused ? 'Play the moving images' : 'Pause the moving images');
    });
    strip.append(pause);
  }

  /* ---------- Start everything ---------- */

  document.querySelectorAll('.strip').forEach((strip) => {
    const wantsBelt = strip.classList.contains('strip--belt');
    if (wantsBelt && !reduceMotion.matches) initBelt(strip);
    else initManual(strip); // reduced-motion visitors get the manual version of a belt
  });
})();
