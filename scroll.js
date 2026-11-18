/* Scroll choreography: smooth scrolling (Lenis) + scrubbed and triggered effects.
   Scrubbed effects follow the scroll position directly; triggered ones play once with anime.js. */
(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hasAnime = typeof window.anime === 'function';
  const root = document.documentElement;
  root.classList.add('motion');

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (t) => 1 - Math.pow(1 - t, 3); // easeOutCubic for scrubbed values
  const vh = () => window.innerHeight;

  /* ---------- Smooth scrolling ---------- */
  let lenis = null;
  if (typeof window.Lenis === 'function') {
    lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    window.lenis = lenis; // handy for other scripts (e.g. stop/start while a modal is open)
  }
  // in-page links glide with Lenis (respecting each section's scroll-margin-top)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || !lenis) return;
    const id = a.getAttribute('href');
    if (id === '#') return;
    const target = id === '#top' ? 0 : document.querySelector(id);
    if (target === null) return;
    e.preventDefault();
    const offset = target === 0 ? 0 : -(parseFloat(getComputedStyle(target).scrollMarginTop) || 0);
    lenis.scrollTo(target, { offset, duration: 1.6 });
  });

  /* ---------- Progress bar ---------- */
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  /* ---------- Split helpers ---------- */
  // wraps every word in <span class="w"><span class="wi">word</span></span>, keeping inline elements like <em>
  const splitWords = (el) => {
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const wi = document.createElement('span'); wi.className = 'wi'; wi.textContent = part;
            w.appendChild(wi); frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) walk(child);
      });
    };
    walk(el);
    return [...el.querySelectorAll('.wi')];
  };

  /* ---------- Triggered: headings rise word by word ---------- */
  const headings = [...document.querySelectorAll('.h2, .band-title, .hero-step-title')];
  headings.forEach((h) => { h.classList.add('split'); splitWords(h); });
  const playOnce = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      playOnce.unobserve(en.target);
      const words = en.target.querySelectorAll('.wi');
      if (hasAnime) {
        anime({ targets: words, translateY: ['112%', '0%'], rotate: [6, 0], duration: 1300, delay: anime.stagger(55), easing: 'easeOutExpo' });
      } else words.forEach((w) => { w.style.transform = 'none'; });
    });
  }, { threshold: 0.3, rootMargin: '0px 0px -8% 0px' });
  headings.forEach((h) => playOnce.observe(h));

  /* ---------- Triggered: destination cards slide in as a group ---------- */
  const rail = document.getElementById('rail');
  if (rail && hasAnime) {
    const cards = rail.querySelectorAll('.dcard');
    cards.forEach((c) => { c.style.opacity = 0; });
    const railObs = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      railObs.disconnect();
      anime({ targets: cards, opacity: [0, 1], translateX: [120, 0], duration: 1400, delay: anime.stagger(90), easing: 'easeOutExpo' });
    }, { threshold: 0.2 });
    railObs.observe(rail);
  }

  /* ---------- Scrubbed: statement fills in word by word ---------- */
  const statement = document.querySelector('.statement');
  const statementWords = statement ? splitWords(statement) : [];
  if (statement) statement.classList.add('scrub-text');

  /* ---------- Scrubbed: footer wordmark letters rise ---------- */
  const footWord = document.querySelector('.foot-word');
  let footLetters = [];
  if (footWord) {
    footWord.innerHTML = [...footWord.textContent].map((ch) => `<span class="fl">${ch}</span>`).join('');
    footLetters = [...footWord.querySelectorAll('.fl')];
  }

  /* ---------- Element refs for scrubbed effects ---------- */
  const hero = document.querySelector('.hero');
  const heroBgs = document.querySelectorAll('.hero-bg');
  const heroWord = document.querySelector('.hero-word');
  const heroCenter = document.querySelector('.hero-center');
  const clipEls = [...document.querySelectorAll('.intro-img, .pkg-img, .panels, .cta-box')];
  const how = document.querySelector('.how');
  const band = document.querySelector('.band');
  const bandTitle = document.querySelector('.band-title');
  const destSection = document.getElementById('destinations');

  // progress of an element through the viewport: 0 when its top hits `start` (fraction of vh), 1 at `end`
  const through = (el, start = 1, end = 0.4) => {
    const r = el.getBoundingClientRect();
    return clamp((vh() * start - r.top) / (vh() * (start - end)));
  };

  const update = () => {
    const y = window.scrollY;
    const docH = document.documentElement.scrollHeight - vh();
    bar.style.transform = `scaleX(${docH > 0 ? y / docH : 0})`;

    // Hero: background slowly zooms, the word sinks deeper into the landscape, center copy lifts away
    if (hero) {
      const p = clamp(y / (hero.offsetHeight * 0.7));
      heroBgs.forEach((img) => { img.style.scale = String(1 + p * 0.1); });
      if (heroWord) { heroWord.style.translate = `0 ${p * 38}%`; }
      if (heroCenter) { heroCenter.style.translate = `0 ${p * -60}px`; heroCenter.style.opacity = String(1 - clamp(p * 1.6)); }
    }

    // Statement: each word goes from faint to solid as the paragraph moves up the screen
    if (statement) {
      const p = through(statement, 0.85, 0.35);
      const n = statementWords.length;
      statementWords.forEach((w, i) => {
        // word i starts filling at i/n of the way through and is solid shortly after
        const local = clamp((p - (i / n) * 0.85) / 0.15);
        w.style.opacity = String(0.16 + 0.84 * local);
      });
    }

    // Images open up from an inset rounded window
    clipEls.forEach((el) => {
      const p = ease(through(el, 1, 0.55));
      const inset = (1 - p) * 14;
      el.style.clipPath = `inset(${inset}% ${inset * 0.6}% ${inset}% ${inset * 0.6}% round ${28 + (1 - p) * 20}px)`;
    });

    // Dark "how it works" panel grows to full width
    if (how) {
      const p = ease(through(how, 1, 0.5));
      how.style.scale = String(0.92 + 0.08 * p);
    }

    // Destination rail drifts sideways with the page scroll
    if (rail && destSection) {
      const r = destSection.getBoundingClientRect();
      const p = clamp((vh() - r.top) / (vh() + r.height));
      rail.style.translate = `${(0.5 - p) * 120}px 0`;
    }

    // Band headline grows in as the image passes
    if (band && bandTitle) {
      const p = ease(through(band, 1, 0.3));
      bandTitle.style.scale = String(0.86 + 0.14 * p);
      bandTitle.style.transformOrigin = 'left bottom';
    }

    // Footer letters rise one after another
    if (footWord) {
      const p = through(footWord, 1.05, 0.55);
      const n = footLetters.length;
      footLetters.forEach((l, i) => {
        const lp = ease(clamp(p * 1.6 - i / n * 0.6));
        l.style.transform = `translateY(${(1 - lp) * 60}%)`;
        l.style.opacity = String(0.2 + lp * 0.8);
      });
    }
  };

  let queued = false;
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; update(); }); } };
  if (lenis) lenis.on('scroll', onScroll);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
