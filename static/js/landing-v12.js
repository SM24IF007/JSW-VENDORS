(() => {
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  // External JSW image can fail on restricted networks; local CSS image remains as fallback.
  document.querySelectorAll('.vasind-hero-bg,.vasind-facility-bg').forEach(img => {
    img.addEventListener('error', () => { img.style.display = 'none'; }, { once:true });
  });

  if (reduced || !gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  gsap.fromTo('.v12-network-head > *',
    { y:34, opacity:0, filter:'blur(8px)' },
    { y:0, opacity:1, filter:'blur(0px)', stagger:.08, ease:'none',
      scrollTrigger:{ trigger:'.v12-network-head', start:'top 88%', end:'top 58%', scrub:.6 } }
  );

  gsap.utils.toArray('[data-v12-reveal]').forEach((el, i) => {
    gsap.fromTo(el,
      { y:46, opacity:0, rotateX:i % 2 ? -7 : 7, scale:.97, transformOrigin:'50% 100%' },
      { y:0, opacity:1, rotateX:0, scale:1, ease:'none',
        scrollTrigger:{ trigger:el, start:'top 92%', end:'top 68%', scrub:.55 } }
    );
  });

  gsap.utils.toArray('[data-v12-image]').forEach((card, i) => {
    const img = card.querySelector('img');
    gsap.fromTo(card,
      { y:40, opacity:0, clipPath:'inset(12% 5% 12% 5% round 22px)' },
      { y:0, opacity:1, clipPath:'inset(0% 0% 0% 0% round 22px)', ease:'none',
        scrollTrigger:{ trigger:card, start:'top 94%', end:'top 66%', scrub:.55 } }
    );
    if (img) {
      gsap.fromTo(img,{ scale:1.11, yPercent:i % 2 ? -3 : 3 },{
        scale:1.02, yPercent:i % 2 ? 3 : -3, ease:'none',
        scrollTrigger:{ trigger:card, start:'top bottom', end:'bottom top', scrub:.65 }
      });
    }
  });

  gsap.fromTo('.v12-process-meta article',
    { y:26, opacity:0 },
    { y:0, opacity:1, stagger:.06, ease:'none',
      scrollTrigger:{ trigger:'.v12-process-meta', start:'top 90%', end:'top 68%', scrub:.45 } }
  );

  gsap.fromTo('.v12-doc-grid article',
    { x:24, opacity:0 },
    { x:0, opacity:1, stagger:.05, ease:'none',
      scrollTrigger:{ trigger:'.v12-docs', start:'top 88%', end:'top 62%', scrub:.5 } }
  );


  gsap.fromTo('.v14-departments-head > *',
    { y:30, opacity:0, filter:'blur(7px)' },
    { y:0, opacity:1, filter:'blur(0px)', stagger:.08, ease:'none',
      scrollTrigger:{ trigger:'.v14-departments-head', start:'top 90%', end:'top 64%', scrub:.5 } }
  );

  gsap.utils.toArray('[data-v14-department]').forEach((card, i) => {
    gsap.fromTo(card,
      { y:36, x:i % 2 ? 18 : -18, opacity:0, rotateY:i % 2 ? -7 : 7, scale:.97 },
      { y:0, x:0, opacity:1, rotateY:0, scale:1, ease:'none',
        scrollTrigger:{ trigger:card, start:'top 94%', end:'top 72%', scrub:.45 } }
    );
    const line = card.querySelector('i');
    if (line) gsap.fromTo(line,{scaleX:0},{scaleX:1,ease:'none',scrollTrigger:{trigger:card,start:'top 88%',end:'top 70%',scrub:.4}});
  });
})();
