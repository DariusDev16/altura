(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasAnime = typeof window.anime === 'function';

  /* ---------- Nav: solid on scroll ---------- */
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile menu ---------- */
  const burger = document.getElementById('burger');
  const menu = document.getElementById('mobileMenu');
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    if (open) nav.classList.add('scrolled'); else onScroll();
  };
  burger.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });

  /* ---------- Hero intro ---------- */
  if (hasAnime && !reduce) {
    anime.timeline({ easing: 'easeOutExpo' })
      .add({ targets: '.nav', opacity: [0, 1], translateY: [-20, 0], duration: 1000 }, 0)
      .add({ targets: '.hero-bg', scale: [1.12, 1], duration: 2400 }, 0)
      .add({ targets: '.hero-word .ch', opacity: [0, 1], translateY: [120, 0], duration: 1600, delay: anime.stagger(70) }, 200)
      .add({ targets: '.hero-center > *', opacity: [0, 1], translateY: [24, 0], duration: 1100, delay: anime.stagger(100) }, 900);
  }

  /* ---------- Scroll reveal + counters ---------- */
  const countUp = (el) => {
    const end = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    if (!hasAnime || reduce) { el.textContent = end.toFixed(dec); return; }
    const obj = { v: 0 };
    anime({ targets: obj, v: end, duration: 2000, easing: 'easeOutExpo', update: () => { el.textContent = obj.v.toFixed(dec); } });
  };

  const revealEls = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      io.unobserve(el);
      // stagger siblings that enter together
      const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
      const i = Math.max(0, siblings.indexOf(el));
      if (hasAnime && !reduce) {
        anime({ targets: el, opacity: [0, 1], translateY: [40, 0], duration: 1200, delay: i * 110, easing: 'easeOutExpo' });
      } else {
        el.style.opacity = 1; el.style.transform = 'none';
      }
      el.querySelectorAll('[data-count]').forEach(countUp);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach((el) => io.observe(el));

  /* ---------- Parallax (hero + band) ---------- */
  if (!reduce) {
    const band = document.querySelector('.band');
    const bandImg = document.querySelector('.band-img');
    let ticking = false;
    const parallax = () => {
      const r = band.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) {
        const p = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
        bandImg.style.transform = `translateY(${p * -12}%)`;
      }
      ticking = false;
    };
    window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(parallax); ticking = true; } }, { passive: true });
    parallax();
  }

  /* ---------- Destination rail ---------- */
  const rail = document.getElementById('rail');
  const step = () => (rail.querySelector('.dcard:not(.is-hidden)')?.offsetWidth || 300) + 20;
  document.getElementById('prev').addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
  document.getElementById('next').addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));

  // drag to scroll (desktop)
  let down = false, startX = 0, startLeft = 0, moved = false;
  rail.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    down = true; moved = false; startX = e.clientX; startLeft = rail.scrollLeft;
    rail.style.scrollSnapType = 'none';
  });
  window.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    rail.scrollLeft = startLeft - dx;
  });
  window.addEventListener('pointerup', () => { if (down) { down = false; rail.style.scrollSnapType = ''; } });
  rail.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  rail.addEventListener('dragstart', (e) => e.preventDefault());

  // filters
  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('is-active', c === chip));
      const f = chip.dataset.filter;
      const cards = [...rail.querySelectorAll('.dcard')];
      cards.forEach((c) => c.classList.toggle('is-hidden', f !== 'all' && c.dataset.cat !== f));
      rail.scrollTo({ left: 0 });
      const shown = cards.filter((c) => !c.classList.contains('is-hidden'));
      if (hasAnime && !reduce) {
        anime({ targets: shown, opacity: [0, 1], translateY: [30, 0], duration: 800, delay: anime.stagger(70), easing: 'easeOutExpo' });
      }
    });
  });

  // save (heart)
  rail.querySelectorAll('.heart').forEach((h) => {
    h.addEventListener('click', () => {
      const on = h.classList.toggle('on');
      h.textContent = on ? '♥' : '♡';
      h.setAttribute('aria-pressed', String(on));
      if (hasAnime && !reduce) anime({ targets: h, scale: [1.35, 1], duration: 600, easing: 'easeOutElastic(1, .5)' });
    });
  });

  /* ---------- Experience panels ---------- */
  const panels = document.querySelectorAll('.panel');
  const openPanel = (p) => panels.forEach((x) => x.classList.toggle('is-open', x === p));
  panels.forEach((p) => {
    p.addEventListener('click', () => openPanel(p));
    p.addEventListener('focus', () => openPanel(p));
    if (window.matchMedia('(hover: hover)').matches) p.addEventListener('mouseenter', () => openPanel(p));
  });
})();
