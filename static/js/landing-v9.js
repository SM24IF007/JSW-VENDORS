(() => {
  const d = document;
  const qs = (s, c=d) => c.querySelector(s);
  const qsa = (s, c=d) => [...c.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Accessible FAQ: one item open at a time, snappy and interruptible.
  qsa('.v9-faq-item').forEach(item => {
    const btn = qs('button', item);
    btn?.addEventListener('click', () => {
      const willOpen = !item.classList.contains('open');
      qsa('.v9-faq-item.open').forEach(other => {
        if (other !== item) {
          other.classList.remove('open');
          qs('button', other)?.setAttribute('aria-expanded', 'false');
        }
      });
      item.classList.toggle('open', willOpen);
      btn.setAttribute('aria-expanded', String(willOpen));
    });
  });

  if (!window.gsap || !window.ScrollTrigger || reduced) return;
  gsap.registerPlugin(ScrollTrigger);

  const reveal = (targets, trigger, from={}) => {
    const els = qsa(targets);
    if (!els.length) return;
    gsap.from(els, {
      ...{y:28, opacity:0, duration:.42, ease:'power3.out', stagger:.06, overwrite:'auto'},
      ...from,
      scrollTrigger:{trigger, start:'top 84%', toggleActions:'play none none reverse'}
    });
  };

  reveal('.v9-trust-item', '.v9-trust-bar', {y:18, duration:.34, stagger:.05});
  reveal('[data-v9-step]', '.v9-how-track', {y:34, rotateX:5, transformPerspective:900, duration:.46});
  reveal('[data-v9-partner]', '.v9-partner-grid', {y:38, scale:.97, duration:.46});
  reveal('.v9-faq-item', '.v9-faq-list', {x:-24, y:0, duration:.38, stagger:.045});

  // Draw a subtle progress line across the four-step process as the section scrolls.
  const how = qs('.v9-how-track');
  if (how) {
    gsap.fromTo(how, {'--v9-progress':'0%'}, {
      '--v9-progress':'100%', ease:'none',
      scrollTrigger:{trigger:how,start:'top 78%',end:'bottom 42%',scrub:.25}
    });
  }
})();
