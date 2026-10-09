(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 900px)').matches;
  const gs = window.gsap;
  const ST = window.ScrollTrigger;

  // Image failure should never break the interface. Existing local imagery and
  // color layers remain underneath as graceful fallback.
  document.querySelectorAll('.vasind-hero-bg,.vasind-facility-bg,.vasind-tech-media img').forEach((img) => {
    img.addEventListener('error', () => img.classList.add('image-failed'), { once: true });
  });

  if (!gs || !ST || reduced) return;
  gs.registerPlugin(ST);

  // Slow photographic drift, while the Three.js object remains controlled by V6.
  if (document.querySelector('.vasind-hero-bg')) {
    gs.fromTo('.vasind-hero-bg',
      { scale: 1.045, yPercent: 0, opacity: .55 },
      { scale: mobile ? 1.08 : 1.16, yPercent: mobile ? 2 : 7, opacity: .36, ease: 'none',
        scrollTrigger: { trigger: '.story-hero', start: 'top top', end: 'bottom top', scrub: .28 }
      }
    );
  }

  const cards = gs.utils.toArray('[data-vasind-card]');
  if (cards.length) {
    gs.from(cards, {
      y: 46,
      opacity: 0,
      scale: .96,
      duration: .46,
      stagger: .07,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.vasind-intel-grid', start: 'top 84%', toggleActions: 'play none none reverse' }
    });
  }

  if (document.querySelector('[data-vasind-media]')) {
    const tl = gs.timeline({
      scrollTrigger: { trigger: '.vasind-tech-band', start: 'top 84%', end: 'center 55%', scrub: .24 }
    });
    tl.fromTo('[data-vasind-media]',
      { clipPath: 'inset(8% 12% 8% 12% round 28px)', scale: .95 },
      { clipPath: 'inset(0% 0% 0% 0% round 0px)', scale: 1, ease: 'none' }, 0)
      .fromTo('.vasind-tech-copy', { x: 54, opacity: .25 }, { x: 0, opacity: 1, ease: 'none' }, .1);
  }

  const milestones = gs.utils.toArray('[data-vasind-milestone]');
  if (milestones.length) {
    gs.from(milestones, {
      y: 34,
      opacity: 0,
      duration: .42,
      stagger: .09,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.vasind-milestone-track', start: 'top 86%', toggleActions: 'play none none reverse' }
    });
  }
})();
