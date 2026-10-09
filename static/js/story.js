(() => {
  const d = document;
  const qs = (s, c = d) => c.querySelector(s);
  const qsa = (s, c = d) => [...c.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer:fine)').matches;
  const mobile = matchMedia('(max-width:900px)').matches;
  const lowPower = d.documentElement.classList.contains('low-power');

  /* ---------------------------------------------------------
     APPLICATION STATUS TRACKER
  --------------------------------------------------------- */
  const trackForm = qs('#trackForm');
  if (trackForm) {
    trackForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = qs('#trackInput');
      const out = qs('#trackResult');
      const mobileNo = (input?.value || '').replace(/\D/g, '').slice(-10);
      if (!out) return;
      if (mobileNo.length !== 10) {
        out.textContent = 'Enter a valid 10-digit mobile number.';
        input?.focus();
        return;
      }
      out.textContent = 'Checking application status…';
      try {
        const response = await fetch('/api/track_status', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({search_val: mobileNo})
        });
        const data = await response.json();
        out.textContent = data.found
          ? `${data.name} · ${data.role || 'Role pending'} · ${data.status}`
          : 'No application was found for that mobile number.';
      } catch {
        out.textContent = 'Status service is temporarily unavailable.';
      }
    });
  }

  // Respect accessibility preference. Content remains fully visible and usable.
  if (!window.gsap || !window.ScrollTrigger || reduced) return;

  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ overwrite: 'auto' });
  d.documentElement.classList.add('motion-v6');

  const DUR = {
    micro: .20,
    ui: .32,
    reveal: .48,
    hero: .72
  };

  /* ---------------------------------------------------------
     HERO LOAD — visibly different from V5
  --------------------------------------------------------- */
  const heroTl = gsap.timeline({defaults: {ease: 'power4.out'}});
  heroTl
    .from('.story-main-nav', {y: -28, opacity: 0, duration: DUR.reveal})
    .from('.story-subnav', {y: -18, opacity: 0, duration: DUR.ui}, '-=.30')
    .from('.story-eyebrow', {x: -34, opacity: 0, duration: DUR.ui}, '-=.12')
    .from('.story-hero h1 span', {
      yPercent: 115,
      rotateX: -18,
      opacity: 0,
      transformOrigin: '50% 100%',
      duration: DUR.hero,
      stagger: .085
    }, '-=.10')
    .from('.story-hero-copy > p', {y: 28, opacity: 0, duration: DUR.reveal}, '-=.42')
    .from('.story-hero-actions > *', {y: 20, opacity: 0, scale: .96, duration: DUR.ui, stagger: .07}, '-=.28')
    .from('#storyHeroStage', {x: 70, scale: .78, rotateY: -10, opacity: 0, duration: .78}, '-=.72')
    .from('.story-hud', {x: i => i ? 26 : -26, y: 12, opacity: 0, duration: DUR.ui, stagger: .08}, '-=.34')
    .from('.story-scroll-cue', {y: 16, opacity: 0, duration: DUR.ui}, '-=.18');

  if (!lowPower && !mobile) {
    gsap.to('.story-orbit-a', {rotate: 360, duration: 34, repeat: -1, ease: 'none'});
    gsap.to('.story-orbit-b', {rotate: -360, duration: 48, repeat: -1, ease: 'none'});
    gsap.to('.story-hud-a', {y: -10, x: 5, duration: 2.7, repeat: -1, yoyo: true, ease: 'sine.inOut'});
    gsap.to('.story-hud-b', {y: 10, x: -5, duration: 3.1, repeat: -1, yoyo: true, ease: 'sine.inOut'});
  }

  /* ---------------------------------------------------------
     CINEMATIC DESKTOP HERO — scroll is the timeline.
     Pinning is only desktop; mobile stays light and direct.
  --------------------------------------------------------- */
  const mm = gsap.matchMedia();

  mm.add('(min-width: 901px)', () => {
    const heroScroll = gsap.timeline({
      scrollTrigger: {
        trigger: '.story-hero',
        start: 'top top',
        end: '+=105%',
        scrub: .18,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });

    heroScroll
      .to('.story-hero-grid', {scale: 1.22, backgroundPosition: '150px 110px', opacity: .75, ease: 'none'}, 0)
      .to('.story-hero h1 span:nth-child(1)', {xPercent: -18, opacity: .28, ease: 'none'}, 0)
      .to('.story-hero h1 span:nth-child(2)', {xPercent: 12, opacity: .42, ease: 'none'}, 0)
      .to('.story-hero h1 span:nth-child(3)', {scale: 1.13, y: -20, letterSpacing: '-3px', ease: 'none'}, 0)
      .to('.story-hero-copy > p', {y: -44, opacity: .12, ease: 'none'}, 0)
      .to('.story-hero-actions', {y: 34, opacity: .1, ease: 'none'}, 0)
      .to('#storyHeroStage', {xPercent: -9, y: 16, scale: 1.32, rotationY: -7, rotationX: 2.5, ease: 'none'}, 0)
      .to('.story-hud-a', {x: 95, y: -40, opacity: .18, ease: 'none'}, 0)
      .to('.story-hud-b', {x: -95, y: 45, opacity: .18, ease: 'none'}, 0)
      .to('.story-scroll-cue', {y: 28, opacity: 0, ease: 'none'}, 0)
      .to('.story-hero-halo', {scale: 1.55, opacity: .38, ease: 'none'}, 0);

    return () => heroScroll.scrollTrigger?.kill();
  });

  mm.add('(max-width: 900px)', () => {
    gsap.to('#storyHeroStage', {
      y: 35,
      scale: .96,
      ease: 'none',
      scrollTrigger: {
        trigger: '.story-hero',
        start: 'top top',
        end: 'bottom top',
        scrub: .35
      }
    });
    gsap.to('.story-hero-copy', {
      y: -18,
      opacity: .55,
      ease: 'none',
      scrollTrigger: {
        trigger: '.story-hero',
        start: '35% top',
        end: 'bottom top',
        scrub: .35
      }
    });
  });

  /* ---------------------------------------------------------
     SPEC CARDS — alternating 3D fan reveal
  --------------------------------------------------------- */
  const specCards = qsa('.story-spec-grid article');
  if (specCards.length) {
    gsap.from(specCards, {
      scrollTrigger: {
        trigger: '.story-spec-grid',
        start: 'top 86%',
        toggleActions: 'play none none reverse'
      },
      x: i => i % 2 === 0 ? -70 : 70,
      y: 30,
      rotateY: i => i % 2 === 0 ? -13 : 13,
      scale: .9,
      opacity: 0,
      transformPerspective: 1000,
      transformOrigin: '50% 50%',
      duration: DUR.reveal,
      stagger: .08,
      ease: 'power3.out'
    });
  }

  /* ---------------------------------------------------------
     STATEMENT — large masked product reveal
  --------------------------------------------------------- */
  if (qs('.story-statement')) {
    const statementTl = gsap.timeline({
      scrollTrigger: {
        trigger: '.story-statement',
        start: 'top 78%',
        end: 'center 48%',
        scrub: .22
      }
    });
    statementTl
      .fromTo('.story-statement .story-section-label',
        {x: -60, opacity: 0},
        {x: 0, opacity: 1, ease: 'none'}, 0)
      .fromTo('.story-statement h2',
        {clipPath: 'inset(0 100% 0 0)', x: -80, scale: .92, opacity: .28},
        {clipPath: 'inset(0 0% 0 0)', x: 0, scale: 1, opacity: 1, ease: 'none'}, 0)
      .fromTo('.story-statement p',
        {y: 50, opacity: 0},
        {y: 0, opacity: 1, ease: 'none'}, .22)
      .fromTo('.story-statement-line',
        {scaleX: 0},
        {scaleX: 1, transformOrigin: '50% 50%', ease: 'none'}, .12);
  }

  /* ---------------------------------------------------------
     3-PAGE STORY — page sheets now visibly fly / rotate / focus
  --------------------------------------------------------- */
  const steps = qsa('[data-page-step]');
  const navs = qsa('[data-page-nav]');
  const sheets = qsa('[data-sheet]');
  let activePage = 0;

  const pageConfigs = [
    [
      {x: -10, y: 0, z: 100, rotationY: -2, rotationX: 0, rotationZ: -.5, scale: 1.05, opacity: 1},
      {x: 70, y: 40, z: -10, rotationY: 10, rotationX: 2, rotationZ: 5, scale: .91, opacity: .58},
      {x: 125, y: 78, z: -85, rotationY: 18, rotationX: 4, rotationZ: 9, scale: .82, opacity: .28}
    ],
    [
      {x: -230, y: -20, z: -100, rotationY: -36, rotationX: 3, rotationZ: -13, scale: .72, opacity: .16},
      {x: 0, y: 0, z: 115, rotationY: 0, rotationX: 0, rotationZ: 0, scale: 1.06, opacity: 1},
      {x: 105, y: 65, z: -70, rotationY: 17, rotationX: 3, rotationZ: 8, scale: .83, opacity: .32}
    ],
    [
      {x: -265, y: -45, z: -140, rotationY: -42, rotationX: 4, rotationZ: -16, scale: .65, opacity: .09},
      {x: -205, y: 20, z: -80, rotationY: -30, rotationX: 2, rotationZ: -10, scale: .76, opacity: .18},
      {x: 0, y: 0, z: 125, rotationY: 0, rotationX: 0, rotationZ: 0, scale: 1.07, opacity: 1}
    ]
  ];

  const setPage = (index, animate = true) => {
    if (index < 0 || index > 2 || !sheets.length) return;
    activePage = index;

    steps.forEach((step, i) => {
      step.classList.toggle('active', i === index);
      if (animate && i === index) {
        gsap.fromTo(step,
          {x: 36, opacity: .18},
          {x: 0, opacity: 1, duration: DUR.ui, ease: 'power3.out'}
        );
      }
    });

    navs.forEach((nav, i) => {
      nav.classList.toggle('active', i === index);
      nav.setAttribute('aria-pressed', String(i === index));
    });

    sheets.forEach((sheet, i) => {
      gsap.killTweensOf(sheet);
      const c = pageConfigs[index][i];
      const props = {
        ...c,
        transformPerspective: 1600,
        ease: 'power3.inOut',
        overwrite: true
      };
      if (animate) gsap.to(sheet, {...props, duration: .38});
      else gsap.set(sheet, props);
    });

    if (animate) {
      gsap.fromTo('.pages-aura',
        {scale: .82, opacity: .35},
        {scale: 1.1, opacity: .9, duration: .34, ease: 'power2.out'}
      );
      gsap.to('.pages-aura', {rotation: index * 28, duration: .38, ease: 'power2.out'});
    }
  };

  setPage(0, false);

  steps.forEach((step, index) => {
    ScrollTrigger.create({
      trigger: step,
      start: 'top 58%',
      end: 'bottom 42%',
      onEnter: () => setPage(index),
      onEnterBack: () => setPage(index)
    });
  });

  navs.forEach((nav, index) => {
    nav.addEventListener('click', () => {
      setPage(index);
      steps[index]?.scrollIntoView({behavior: 'smooth', block: 'center'});
    });

    nav.addEventListener('keydown', (e) => {
      if (!['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      const delta = ['ArrowRight','ArrowDown'].includes(e.key) ? 1 : -1;
      const next = Math.max(0, Math.min(2, activePage + delta));
      navs[next]?.focus();
      setPage(next);
    });
  });

  // The entire page stage rotates subtly with scroll, while selected page stays dominant.
  if (!mobile) {
    gsap.fromTo('#pagesStage',
      {rotationY: -7, rotationX: 3, scale: .92},
      {rotationY: 5, rotationX: -2, scale: 1.02, ease: 'none',
        scrollTrigger: {
          trigger: '.pages-story',
          start: 'top bottom',
          end: 'bottom top',
          scrub: .28
        }
      }
    );
  }

  /* ---------------------------------------------------------
     FACILITY — frame physically opens as you scroll
  --------------------------------------------------------- */
  if (qs('.story-media-frame')) {
    const mediaTl = gsap.timeline({
      scrollTrigger: {
        trigger: '.story-media-section',
        start: 'top 88%',
        end: 'center 48%',
        scrub: .22
      }
    });
    mediaTl
      .fromTo('.story-media-frame',
        {clipPath: 'inset(12% 9% 12% 9% round 48px)', scale: .92, opacity: .55},
        {clipPath: 'inset(0% 0% 0% 0% round 28px)', scale: 1, opacity: 1, ease: 'none'}, 0)
      .fromTo('[data-story-media] img',
        {scale: 1.22, filter: 'saturate(.65) brightness(.72)'},
        {scale: 1, filter: 'saturate(1) brightness(1)', ease: 'none'}, 0)
      .fromTo('.story-media-copy',
        {y: 80, opacity: 0},
        {y: 0, opacity: 1, ease: 'none'}, .2);
  }

  qsa('.story-facts-grid article').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: {trigger: card, start: 'top 92%', toggleActions: 'play none none reverse'},
      x: i % 2 ? 45 : -45,
      y: 24,
      scale: .94,
      opacity: 0,
      duration: DUR.reveal,
      ease: 'power3.out'
    });
  });

  /* ---------------------------------------------------------
     ROLES — more obvious reveal + interactive depth
  --------------------------------------------------------- */
  if (qs('.story-roles-head h2')) {
    gsap.from('.story-roles-head h2', {
      scrollTrigger: {trigger: '.story-roles-head', start: 'top 84%', toggleActions: 'play none none reverse'},
      x: -100,
      skewX: -7,
      opacity: 0,
      duration: .55,
      ease: 'expo.out'
    });
    gsap.from('.story-roles-head p', {
      scrollTrigger: {trigger: '.story-roles-head', start: 'top 84%', toggleActions: 'play none none reverse'},
      x: 70,
      opacity: 0,
      duration: DUR.reveal,
      ease: 'power3.out'
    });
  }

  const roleCards = qsa('[data-role-card-story]');
  if (roleCards.length) {
    gsap.from(roleCards, {
      scrollTrigger: {trigger: '.story-role-grid', start: 'top 88%', toggleActions: 'play none none reverse'},
      y: 75,
      x: i => (i % 3 - 1) * 34,
      rotationY: i => (i % 2 ? 8 : -8),
      scale: .88,
      opacity: 0,
      transformPerspective: 1000,
      duration: .56,
      stagger: .09,
      ease: 'power3.out'
    });
  }

  if (fine && !lowPower) {
    roleCards.forEach(card => {
      const xTo = gsap.quickTo(card, 'rotationY', {duration: .22, ease: 'power2.out'});
      const yTo = gsap.quickTo(card, 'rotationX', {duration: .22, ease: 'power2.out'});
      const zTo = gsap.quickTo(card, 'y', {duration: .22, ease: 'power2.out'});
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5;
        const y = (e.clientY - r.top) / r.height - .5;
        xTo(x * 7);
        yTo(-y * 5);
        zTo(-7);
      });
      card.addEventListener('pointerleave', () => {
        xTo(0); yTo(0); zTo(0);
      });
    });
  }

  /* ---------------------------------------------------------
     GALLERY — clip reveal + image parallax
  --------------------------------------------------------- */
  qsa('[data-gallery-card]').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: {trigger: card, start: 'top 90%', toggleActions: 'play none none reverse'},
      clipPath: i === 0 ? 'inset(0 0 100% 0 round 22px)' : 'inset(0 100% 0 0 round 22px)',
      opacity: .3,
      duration: .6,
      ease: 'power3.inOut'
    });
    const img = qs('img', card);
    if (img && !lowPower) {
      gsap.fromTo(img,
        {scale: 1.16, yPercent: 3},
        {scale: 1.02, yPercent: -4, ease: 'none',
          scrollTrigger: {
            trigger: card,
            start: 'top bottom',
            end: 'bottom top',
            scrub: .25
          }
        }
      );
    }
  });

  /* ---------------------------------------------------------
     FINAL CTA — scale into the final action
  --------------------------------------------------------- */
  if (qs('.story-final-cta')) {
    const finalTl = gsap.timeline({
      scrollTrigger: {
        trigger: '.story-final-cta',
        start: 'top 85%',
        end: 'center 55%',
        scrub: .22
      }
    });
    finalTl
      .fromTo('.story-final-cta h2',
        {scale: .72, y: 90, opacity: .12, filter: 'blur(12px)'},
        {scale: 1, y: 0, opacity: 1, filter: 'blur(0px)', ease: 'none'}, 0)
      .fromTo('.story-final-cta p',
        {y: 38, opacity: 0},
        {y: 0, opacity: 1, ease: 'none'}, .25)
      .fromTo('.story-final-actions',
        {y: 35, opacity: 0, scale: .9},
        {y: 0, opacity: 1, scale: 1, ease: 'none'}, .34);

    if (!lowPower && !mobile) {
      gsap.to('.story-final-orbit', {rotate: 360, scale: 1.08, duration: 44, repeat: -1, ease: 'none'});
    }
  }

  /* ---------------------------------------------------------
     GENERAL REVEALS — sections not covered above
  --------------------------------------------------------- */
  qsa('[data-story-reveal]').forEach(el => {
    // Skip elements with their own stronger timelines.
    if (el.closest('.story-statement') || el.closest('.story-roles-head')) return;
    gsap.from(el, {
      scrollTrigger: {trigger: el, start: 'top 91%', toggleActions: 'play none none reverse'},
      y: 34,
      opacity: 0,
      duration: DUR.reveal,
      ease: 'power3.out'
    });
  });

  /* ---------------------------------------------------------
     POINTER DEPTH — direct / interruptible using quickTo
  --------------------------------------------------------- */
  if (fine && !lowPower && !mobile) {
    const stage = qs('#storyHeroStage');
    if (stage) {
      const xTo = gsap.quickTo(stage, 'x', {duration: .22, ease: 'power2.out'});
      const yTo = gsap.quickTo(stage, 'y', {duration: .22, ease: 'power2.out'});
      const rxTo = gsap.quickTo(stage, 'rotationX', {duration: .22, ease: 'power2.out'});
      const ryTo = gsap.quickTo(stage, 'rotationY', {duration: .22, ease: 'power2.out'});
      addEventListener('pointermove', e => {
        // Disable pointer depth while the pinned hero is heavily transformed by scroll.
        if (scrollY > innerHeight * .9) return;
        const x = e.clientX / innerWidth - .5;
        const y = e.clientY / innerHeight - .5;
        xTo(x * 12);
        yTo(y * 8);
        ryTo(x * 3.2);
        rxTo(-y * 2.2);
      }, {passive: true});
    }
  }

  /* ---------------------------------------------------------
     SUBNAV ACTIVE STATE
  --------------------------------------------------------- */
  const sectionMap = [
    ['Overview', '#overview'],
    ['3 Pages', '#three-pages'],
    ['Roles', '#roles'],
    ['Facility', '#facility']
  ];

  sectionMap.forEach(([label, selector]) => {
    const section = qs(selector);
    if (!section) return;
    ScrollTrigger.create({
      trigger: section,
      start: 'top 48%',
      end: 'bottom 48%',
      onEnter: () => activate(label),
      onEnterBack: () => activate(label)
    });
  });

  function activate(label) {
    qsa('.story-subnav nav a').forEach(a => {
      a.classList.toggle('active', a.textContent.trim() === label);
    });
  }

  // Recalculate pins/layout after delayed fonts and WebGL load.
  if (document.fonts?.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => ScrollTrigger.refresh(), {once: true});
})();
