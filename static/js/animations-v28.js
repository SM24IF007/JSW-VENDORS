(() => {
  'use strict';
  const d=document,w=window;
  const reduced=w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse=w.matchMedia('(pointer: coarse)').matches;
  const small=w.matchMedia('(max-width: 760px)').matches;
  const lowPower=(navigator.deviceMemory && navigator.deviceMemory<=4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency<=4);
  const qsa=(s,c=d)=>[...c.querySelectorAll(s)];

  // Short loading indicator; removed on full load or safety timeout.
  const bar=d.createElement('div'); bar.className='v28-loading-bar'; bar.setAttribute('aria-hidden','true'); d.body.append(bar);
  const finish=()=>{bar.style.opacity='0';bar.style.transition='opacity .25s ease';setTimeout(()=>bar.remove(),280);d.body.classList.add('v28-ready')};
  if(d.readyState==='complete') finish(); else w.addEventListener('load',finish,{once:true});
  setTimeout(finish,2200);

  // Skeleton shimmer on real imagery until each image is decoded/loaded.
  qsa('main figure, .v12-visual-card, .roles-product-card').forEach(box=>{
    const img=box.querySelector('img'); if(!img) return;
    box.classList.add('v28-img-loading');
    const done=()=>{box.classList.add('v28-img-ready');box.classList.remove('v28-img-loading')};
    if(img.complete) done(); else {img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true});}
  });

  // Micro-interactions + accessible click/tap confirmation.
  qsa('a.story-primary-btn,a.btn,button,.v10-map-link,.v12-map-link').forEach(el=>{
    el.classList.add('v28-interactive');
    el.addEventListener('pointerdown',e=>{
      if(reduced) return;
      const r=el.getBoundingClientRect(); const s=Math.max(r.width,r.height)*.32;
      const ripple=d.createElement('i'); ripple.className='v28-ripple'; ripple.style.width=ripple.style.height=`${s}px`; ripple.style.left=`${e.clientX-r.left}px`; ripple.style.top=`${e.clientY-r.top}px`; el.append(ripple); setTimeout(()=>ripple.remove(),620);
      const icon=el.querySelector('span:last-child'); if(icon){icon.classList.remove('v28-icon-bounce');void icon.offsetWidth;icon.classList.add('v28-icon-bounce');}
    });
  });

  // Hover lift for cards where hover exists; harmless on touch devices via CSS.
  qsa('.roles-product-card,.contractor-card-v8,.v10-doc-card,.v10-step-card,.v12-lead-card,.v12-visual-card,.story-page-card,.v10-faq-item').forEach(el=>el.classList.add('v28-hover-lift'));

  // Accent motion on primary hiring CTA and festival card.
  d.querySelector('.story-primary-btn')?.classList.add('v28-accent-pulse');

  // Multi-layer parallax: desktop/fine pointer only and disabled on lower-power devices.
  if(!reduced && !coarse && !small && !lowPower){
    const layers=[
      [d.querySelector('.vasind-hero-bg'),.10],
      [d.querySelector('.story-hero-grid'),.055],
      [d.querySelector('.story-hero-vignette'),.028],
      [d.querySelector('.story-hero-stage'),-.045]
    ].filter(([el])=>el);
    layers.forEach(([el])=>el.classList.add('v28-parallax'));
    let raf=0;
    const update=()=>{const y=w.scrollY;layers.forEach(([el,speed])=>el.style.setProperty('--v28-parallax-y',`${Math.max(-60,Math.min(90,y*speed)).toFixed(1)}px`));raf=0};
    w.addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(update)},{passive:true}); update();
  }
})();
