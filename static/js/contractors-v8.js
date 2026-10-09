(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gs = window.gsap;
  const ST = window.ScrollTrigger;

  if (!gs || reduced) return;
  if (ST) gs.registerPlugin(ST);

  // 400+ workforce count. Short, interruptible, and skipped for reduced motion.
  document.querySelectorAll('[data-count-to]').forEach((el) => {
    const target = Number(el.dataset.countTo || 0);
    if (!target) return;
    const state = { value: 0 };
    gs.to(state, {
      value: target,
      duration: .9,
      ease: 'power3.out',
      overwrite: true,
      onStart: () => { el.textContent = '0+'; },
      onUpdate: () => { el.textContent = `${Math.round(state.value)}+`; },
      onComplete: () => { el.textContent = `${target}+`; }
    });
  });

  if (!ST) return;

  // Homepage contractor cards.
  const miniCards = gs.utils.toArray('[data-contractor-card]');
  if (miniCards.length) {
    gs.from(miniCards, {
      y: 48,
      opacity: 0,
      rotateX: 8,
      transformPerspective: 900,
      duration: .46,
      stagger: .08,
      ease: 'power3.out',
      overwrite: true,
      scrollTrigger: {
        trigger: '.v8-contractor-mini-grid',
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      }
    });
  }

  // Dedicated contractor page: panel enters separately from the headline.
  if (document.querySelector('.contractor-hero-v8')) {
    const intro = gs.timeline({ defaults: { ease: 'power4.out', overwrite: true } });
    intro
      .from('.contractor-hero-copy .story-section-label', { x: -24, opacity: 0, duration: .28 })
      .from('.contractor-hero-copy h1', { y: 52, opacity: 0, duration: .58 }, '-=.12')
      .from('.contractor-hero-copy p', { y: 24, opacity: 0, duration: .38 }, '-=.30')
      .from('.contractor-hero-actions > *', { y: 18, opacity: 0, duration: .30, stagger: .06 }, '-=.20')
      .from('.contractor-number-panel', { x: 70, scale: .92, opacity: 0, duration: .58 }, '-=.45');

    gs.to('.contractor-hero-bg', {
      scale: 1.12,
      yPercent: 5,
      ease: 'none',
      scrollTrigger: {
        trigger: '.contractor-hero-v8',
        start: 'top top',
        end: 'bottom top',
        scrub: .28
      }
    });
  }

  const enterpriseCards = gs.utils.toArray('[data-contractor-page-card]');
  if (enterpriseCards.length) {
    gs.from(enterpriseCards, {
      y: 58,
      opacity: 0,
      scale: .95,
      rotateY: (i) => i % 2 ? 7 : -7,
      transformPerspective: 1000,
      duration: .5,
      stagger: .08,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.contractor-enterprise-grid',
        start: 'top 84%',
        toggleActions: 'play none none reverse'
      }
    });
  }

  const benefitCards = gs.utils.toArray('[data-benefit-card]');
  if (benefitCards.length) {
    gs.from(benefitCards, {
      y: 36,
      opacity: 0,
      scale: .96,
      duration: .4,
      stagger: .07,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.contractor-benefit-grid',
        start: 'top 86%',
        toggleActions: 'play none none reverse'
      }
    });
  }

  const processCards = gs.utils.toArray('.contractor-process-track article');
  if (processCards.length) {
    gs.from(processCards, {
      y: 34,
      opacity: 0,
      duration: .38,
      stagger: .075,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.contractor-process-track',
        start: 'top 87%',
        toggleActions: 'play none none reverse'
      }
    });
  }
})();
