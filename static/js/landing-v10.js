(() => {
  const d = document;
  if (!d.body.classList.contains('landing-v10')) return;
  const qs = (s, c = d) => c.querySelector(s);
  const qsa = (s, c = d) => [...c.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 900px)').matches;
  const fine = matchMedia('(pointer:fine)').matches;

  /* ----------------------------------------------------------
     Navigation — transparent on hero, crystallizes after 56px
  ---------------------------------------------------------- */
  const nav = qs('#siteNav');
  const updateNav = () => nav?.classList.toggle('v10-crystal', scrollY > 56);
  addEventListener('scroll', updateNav, {passive:true});
  updateNav();

  /* ----------------------------------------------------------
     Status tracker — mobile only, never exposes Aadhaar lookup
  ---------------------------------------------------------- */
  const trackForm = qs('#trackForm');
  trackForm?.addEventListener('submit', async (e) => {
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
        method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({search_val:mobileNo})
      });
      const type=(response.headers.get('content-type')||'').toLowerCase();
      if(!response.ok||!type.includes('application/json')) throw new Error('Unexpected status response');
      const data = await response.json();
      out.textContent = data.found
        ? `${data.name} · ${data.role || 'Role pending'} · ${data.status}`
        : (data.message || 'No application was found for that mobile number.');
    } catch (err) {
      console.warn('Landing status check failed',err);
      out.innerHTML = 'Status lookup could not load here. <a href="/status" style="color:#8ecbff">Open full status tracker →</a>';
    }
  });

  /* ----------------------------------------------------------
     FAQ — one open at a time, 280ms UI animation
  ---------------------------------------------------------- */
  const faqItems = qsa('.v10-faq-item');
  faqItems.forEach(item => {
    const btn = qs('button', item);
    const answer = qs('.v10-faq-answer', item);
    btn?.addEventListener('click', () => {
      const opening = !item.classList.contains('open');
      faqItems.forEach(other => {
        if (other === item) return;
        other.classList.remove('open');
        qs('button', other)?.setAttribute('aria-expanded','false');
        const otherAnswer = qs('.v10-faq-answer', other);
        if (window.gsap && !reduced) gsap.to(otherAnswer, {height:0,duration:.24,ease:'power2.out',overwrite:true});
        else if (otherAnswer) otherAnswer.style.height = '0px';
      });
      item.classList.toggle('open', opening);
      btn.setAttribute('aria-expanded', String(opening));
      if (!answer) return;
      if (window.gsap && !reduced) {
        gsap.to(answer, {height:opening?'auto':0,duration:.28,ease:'power2.out',overwrite:true});
      } else {
        answer.style.height = opening ? 'auto' : '0px';
      }
    });
  });

  /* ----------------------------------------------------------
     Role filters — GSAP FLIP reflow, 300ms and interruptible
  ---------------------------------------------------------- */
  const filterButtons = qsa('[data-role-filter]');
  const roleCards = qsa('.v10-role-card');
  filterButtons.forEach(btn => btn.addEventListener('click', () => {
    const filter = btn.dataset.roleFilter;
    filterButtons.forEach(b => b.classList.toggle('active', b === btn));
    const state = window.Flip ? Flip.getState(roleCards) : null;
    roleCards.forEach(card => {
      let skill = (card.dataset.skill || '').toLowerCase();
      // Treat Highly Skilled as part of the Skilled filter while preserving the displayed label.
      const normalized = skill === 'highly skilled' ? 'skilled' : skill;
      card.classList.toggle('is-filtered-out', filter !== 'all' && normalized !== filter);
    });
    if (state && !reduced) {
      Flip.from(state, {
        duration:.30,
        ease:'power2.inOut',
        absolute:true,
        stagger:.015,
        onEnter:els => gsap.fromTo(els,{opacity:0,scale:.96},{opacity:1,scale:1,duration:.22,overwrite:true}),
        onLeave:els => gsap.to(els,{opacity:0,scale:.96,duration:.16,overwrite:true})
      });
    }
  }));

  if (!window.gsap || !window.ScrollTrigger || reduced) {
    qsa('.v10-faq-answer').forEach(a => { if (!a.closest('.open')) a.style.height='0px'; });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  if (window.Flip) gsap.registerPlugin(Flip);
  gsap.defaults({overwrite:'auto'});
  d.body.classList.add('motion-v10');

  /* ----------------------------------------------------------
     Hero load: quick, premium, not blocking scroll
  ---------------------------------------------------------- */
  const heroLoad = gsap.timeline({defaults:{ease:'power3.out'}});
  heroLoad
    .from('.v10-hero-label',{y:16,opacity:0,duration:.34})
    .from('.v10-title-word',{y:34,opacity:0,rotateX:-10,transformOrigin:'50% 100%',duration:.46,stagger:.08},'-=.18')
    .from('.v10-hero-sub',{clipPath:'inset(0 100% 0 0)',opacity:1,duration:.42,ease:'power2.out'},'>+.20')
    .from('.v10-hero-actions > *',{y:16,opacity:0,scale:.97,duration:.28,stagger:.055},'-=.20')
    .from('#storyHeroStage',{x:46,opacity:0,scale:.94,duration:.52},'-=.48')
    .from('.v10-hud',{y:16,opacity:0,duration:.28,stagger:.06},'-=.22');

  /* ----------------------------------------------------------
     Desktop hero: scroll itself is the sequence. Mobile stays light.
  ---------------------------------------------------------- */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const heroTL = gsap.timeline({
      scrollTrigger:{
        trigger:'.v10-hero', start:'top top', end:'+=110%', scrub:.22,
        pin:true, anticipatePin:1, invalidateOnRefresh:true
      }
    });
    const words = qsa('.v10-title-word');
    words.forEach((word, i) => {
      const x = [-90, 70, -45, 86][i] || 0;
      const y = [-20, 14, 32, -34][i] || 0;
      heroTL.to(word,{x,y,opacity:i===3?.24:.12,filter:'blur(3px)',ease:'none'},0);
    });
    heroTL
      .to('.v10-hero-sub',{clipPath:'inset(0 0 0 100%)',x:-28,opacity:0,ease:'none',duration:.52},0)
      .to('.v10-hero-actions',{y:36,opacity:0,ease:'none',duration:.44},0)
      .to('#storyHeroStage',{xPercent:-7,y:18,scale:1.34,rotationY:-7,rotationX:2,ease:'none',duration:.58},0)
      .to('.story-hero-grid',{scale:1.18,backgroundPosition:'120px 95px',opacity:.72,ease:'none',duration:.58},0)
      .to('.v10-hud',{opacity:.1,y:i=>i%2?40:-30,ease:'none',duration:.5},0)
      .to('.v10-scroll-cue',{opacity:0,y:18,ease:'none',duration:.34},0)
      .to('#storyHeroStage',{xPercent:0,y:78,scale:.9,opacity:.22,filter:'blur(10px)',rotationY:3,ease:'none',duration:.34},.66)
      .to('.story-hero-grid',{opacity:.2,scale:1.04,ease:'none',duration:.34},.66);
    return () => heroTL.scrollTrigger?.kill();
  });
  mm.add('(max-width: 900px)', () => {
    gsap.to('#storyHeroStage',{y:28,scale:.97,ease:'none',scrollTrigger:{trigger:'.v10-hero',start:'top top',end:'bottom top',scrub:.35}});
  });

  /* ----------------------------------------------------------
     Generic scrub reveal — physically tied to scroll
  ---------------------------------------------------------- */
  const scrubReveal = (el, opts={}) => {
    if (!el) return;
    gsap.fromTo(el,
      {y:opts.y ?? 34, x:opts.x ?? 0, opacity:0, scale:opts.scale ?? .96, rotateY:opts.rotateY ?? 0, rotateX:opts.rotateX ?? 0},
      {y:0,x:0,opacity:1,scale:1,rotateY:0,rotateX:0,ease:'none',
        scrollTrigger:{trigger:el,start:opts.start||'top 92%',end:opts.end||'top 68%',scrub:.28}
      }
    );
  };

  gsap.fromTo('.v10-trust-bar',{y:70,opacity:.35},{y:0,opacity:1,ease:'none',scrollTrigger:{trigger:'.v10-trust-bar',start:'top 98%',end:'top 82%',scrub:.2}});

  /* Trust stats: number tween + underline draw */
  qsa('[data-trust-stat]').forEach((stat, i) => {
    const valueEl = qs('[data-stat-value]', stat);
    const target = parseFloat(valueEl?.dataset.statValue || '0');
    const format = valueEl?.dataset.statFormat || 'int';
    const counter = {v:0};
    const render = () => {
      if (!valueEl) return;
      if (format === 'plus') valueEl.textContent = `${Math.round(counter.v)}+`;
      else if (format === 'mtpa') valueEl.textContent = `${counter.v.toFixed(1)} MTPA`;
      else valueEl.textContent = `${Math.round(counter.v)}`;
    };
    ScrollTrigger.create({trigger:stat,start:'top 88%',once:true,onEnter:()=>{
      gsap.timeline({defaults:{overwrite:true}})
        .to(counter,{v:target,duration:1.2,ease:'power3.out',onUpdate:render},0)
        .fromTo(qs('.v10-stat-line',stat),{scaleX:0},{scaleX:1,duration:.72,ease:'power2.out'},0);
    }});
    gsap.fromTo(stat,{y:18,opacity:.25},{y:0,opacity:1,ease:'none',scrollTrigger:{trigger:stat,start:'top 96%',end:'top 72%',scrub:.24}});
  });

  /* How-it-works: line draw + icons hit as progress reaches them */
  const process = qs('.v10-process');
  if (process) {
    const processTL = gsap.timeline({scrollTrigger:{trigger:process,start:'top 84%',end:'bottom 46%',scrub:.24}});
    processTL.fromTo('#v10ProcessFill',{scaleX:0},{scaleX:1,ease:'none'},0);
    qsa('[data-process-step]').forEach((step, i) => {
      const pos = i / Math.max(1, qsa('[data-process-step]').length - 1);
      processTL.fromTo(step,{y:38,opacity:.12,scale:.96},{y:0,opacity:1,scale:1,ease:'none'},Math.max(0,pos-.13));
      processTL.fromTo(qs('.v10-step-icon',step),{scale:.78,opacity:.45},{scale:1.08,opacity:1,ease:'none'},pos);
      processTL.to(qs('.v10-step-icon',step),{scale:1,ease:'none'},Math.min(.98,pos+.08));
    });
    processTL.fromTo('.v10-verify-icon svg path',{strokeDashoffset:32},{strokeDashoffset:0,ease:'none'},.27);
  }
  qsa('.v10-section-head').forEach(head => scrubReveal(head,{y:28,start:'top 90%',end:'top 67%'}));

  /* Existing statement: strong-to-steady motion */
  if (qs('.story-statement')) {
    const tl = gsap.timeline({scrollTrigger:{trigger:'.story-statement',start:'top 84%',end:'center 48%',scrub:.25}});
    tl.fromTo('.story-statement h2',{y:55,opacity:.2,scale:.94,clipPath:'inset(0 0 100% 0)'},{y:0,opacity:1,scale:1,clipPath:'inset(0 0 0% 0)',ease:'none'},0)
      .fromTo('.story-statement p',{y:28,opacity:0},{y:0,opacity:1,ease:'none'},.24)
      .fromTo('.story-statement-line',{scaleX:0},{scaleX:1,ease:'none'},.12);
  }

  /* Three-page showcase: scrubbed page transitions + active labels */
  const sheets = qsa('[data-sheet]');
  const pageSteps = qsa('[data-page-step]');
  const pageNav = qsa('[data-page-nav]');
  const setPageState = (idx) => {
    pageSteps.forEach((el,i)=>el.classList.toggle('active',i===idx));
    pageNav.forEach((el,i)=>{el.classList.toggle('active',i===idx);el.setAttribute('aria-pressed',String(i===idx));});
  };
  if (sheets.length === 3 && qs('.pages-story')) {
    gsap.set(sheets[0],{x:-10,y:0,z:100,rotationY:-2,rotationZ:-.5,scale:1.04,opacity:1});
    gsap.set(sheets[1],{x:72,y:40,z:-10,rotationY:10,rotationZ:5,scale:.91,opacity:.58});
    gsap.set(sheets[2],{x:124,y:76,z:-85,rotationY:18,rotationZ:9,scale:.82,opacity:.28});
    const pageTL = gsap.timeline({scrollTrigger:{trigger:'.pages-story',start:'top 72%',end:'bottom 34%',scrub:.28,onUpdate:self=>setPageState(self.progress<.34?0:self.progress<.68?1:2)}});
    pageTL
      .to(sheets[0],{x:-230,y:-20,z:-100,rotationY:-36,rotationZ:-13,scale:.72,opacity:.16,ease:'none'},.28)
      .to(sheets[1],{x:0,y:0,z:115,rotationY:0,rotationZ:0,scale:1.06,opacity:1,ease:'none'},.28)
      .to(sheets[2],{x:105,y:65,z:-70,rotationY:17,rotationZ:8,scale:.83,opacity:.32,ease:'none'},.28)
      .to(sheets[0],{x:-265,y:-45,z:-140,rotationY:-42,rotationZ:-16,scale:.65,opacity:.09,ease:'none'},.64)
      .to(sheets[1],{x:-205,y:20,z:-80,rotationY:-30,rotationZ:-10,scale:.76,opacity:.18,ease:'none'},.64)
      .to(sheets[2],{x:0,y:0,z:125,rotationY:0,rotationZ:0,scale:1.07,opacity:1,ease:'none'},.64);
    pageNav.forEach((btn,idx)=>btn.addEventListener('click',()=>pageSteps[idx]?.scrollIntoView({behavior:'smooth',block:'center'})));
  }

  /* Facility: frame reveal + slower image parallax + alternating stat/chip fan */
  if (qs('.story-media-frame')) {
    const facilityTL = gsap.timeline({scrollTrigger:{trigger:'#facility',start:'top 88%',end:'center 44%',scrub:.24}});
    facilityTL.fromTo('.story-media-frame',{clipPath:'inset(12% 9% 12% 9% round 44px)',scale:.94,opacity:.55},{clipPath:'inset(0% 0% 0% 0% round 28px)',scale:1,opacity:1,ease:'none'},0)
      .fromTo('.story-media-copy',{y:55,opacity:0},{y:0,opacity:1,ease:'none'},.18);
    gsap.fromTo('.story-media-frame img',{yPercent:-3,scale:1.12},{yPercent:7,scale:1.02,ease:'none',scrollTrigger:{trigger:'#facility',start:'top bottom',end:'bottom top',scrub:.35}});
  }
  const facilityChips = qsa('.story-facts-grid article, [data-vasind-card], [data-vasind-milestone]');
  if (facilityChips.length) {
    facilityChips.forEach((el,i)=>gsap.set(el,{x:i%2?-38:38,y:18,opacity:0,scale:.97}));
    ScrollTrigger.batch(facilityChips,{start:'top 88%',once:true,onEnter:batch=>gsap.to(batch,{x:0,y:0,opacity:1,scale:1,duration:.42,stagger:.08,ease:'power3.out',overwrite:true})});
  }

  /* Partner cards: 3D fan in, then hover remains a short CSS micro-interaction */
  const partners = qsa('[data-partner-card]');
  partners.forEach((card,i)=>{
    gsap.fromTo(card,
      {x:(i-1)*48,y:42,rotationY:(i-1)*-10,rotationZ:(i-1)*-2.4,opacity:.08,scale:.92,transformPerspective:1100},
      {x:0,y:0,rotationY:0,rotationZ:0,opacity:1,scale:1,ease:'none',scrollTrigger:{trigger:card,start:'top 94%',end:'top 67%',scrub:.28}}
    );
  });

  /* Roles: scroll reveal + desktop pointer depth */
  scrubReveal(qs('.story-roles-head'),{y:34,start:'top 90%',end:'top 66%'});
  roleCards.forEach((card,i)=>{
    gsap.fromTo(card,{y:46,x:(i%3-1)*22,opacity:.1,scale:.94,rotationY:i%2?5:-5},{y:0,x:0,opacity:1,scale:1,rotationY:0,ease:'none',scrollTrigger:{trigger:card,start:'top 95%',end:'top 72%',scrub:.24}});
  });
  if (fine && !mobile) {
    roleCards.forEach(card => {
      const rx = gsap.quickTo(card,'rotationX',{duration:.2,ease:'power2.out'});
      const ry = gsap.quickTo(card,'rotationY',{duration:.2,ease:'power2.out'});
      card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect();rx(-((e.clientY-r.top)/r.height-.5)*3.5);ry(((e.clientX-r.left)/r.width-.5)*5)});
      card.addEventListener('pointerleave',()=>{rx(0);ry(0)});
    });
  }

  /* FAQ items: light, consistent scrub entry */
  qsa('.v10-faq-item').forEach((item,i)=>scrubReveal(item,{x:i%2?-18:18,y:8,scale:.99,start:'top 95%',end:'top 79%'}));

  /* Status card and final CTA: motion calms toward footer */
  scrubReveal(qs('.story-status-card'),{y:28,scale:.98,start:'top 92%',end:'top 68%'});
  if (qs('.v10-final-cta')) {
    const finalTL = gsap.timeline({scrollTrigger:{trigger:'.v10-final-cta',start:'top 86%',end:'center 56%',scrub:.28}});
    finalTL.fromTo('.v10-final-cta h2',{y:60,scale:.82,opacity:.1,filter:'blur(10px)'},{y:0,scale:1,opacity:1,filter:'blur(0px)',ease:'none'},0)
      .fromTo('.v10-final-cta p',{y:24,opacity:0},{y:0,opacity:1,ease:'none'},.25)
      .fromTo('.v10-final-cta .story-final-actions',{y:20,opacity:0,scale:.96},{y:0,opacity:1,scale:1,ease:'none'},.38);
  }

  /* Active nav state */
  ['overview','how-it-works','roles','faq'].forEach(id => {
    const section = d.getElementById(id);
    if (!section) return;
    ScrollTrigger.create({
      trigger:section,start:'top 48%',end:'bottom 48%',
      onEnter:()=>setActive(id),onEnterBack:()=>setActive(id)
    });
  });
  function setActive(id){
    qsa('.v10-main-links a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')===`#${id}`));
  }

  // Recalculate after fonts and deferred WebGL settle.
  if (d.fonts?.ready) d.fonts.ready.then(()=>ScrollTrigger.refresh());
  setTimeout(()=>ScrollTrigger.refresh(), 900);
})();
