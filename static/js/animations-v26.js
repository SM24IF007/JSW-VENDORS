(() => {
  'use strict';
  const d=document, w=window, reduced=w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const qsa=(s,c=d)=>[...c.querySelectorAll(s)];
  if(reduced){d.documentElement.classList.add('v26-reduced');return;}

  // Thin scroll progress indicator.
  const progress=d.createElement('div');progress.className='v26-scroll-progress';progress.setAttribute('aria-hidden','true');d.body.append(progress);
  let ticking=false;
  const updateScroll=()=>{const max=d.documentElement.scrollHeight-w.innerHeight;const p=max>0?Math.min(1,w.scrollY/max):0;d.documentElement.style.setProperty('--v26-progress',p.toFixed(4));const nav=d.querySelector('.story-nav,.site-nav,.topbar');nav?.classList.toggle('v26-nav-scrolled',w.scrollY>20);ticking=false};
  w.addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(updateScroll);ticking=true}},{passive:true});updateScroll();

  // Reveal meaningful blocks without touching print layout.
  const utility=d.body.matches('.admin-v11,.process-v11,.form-v11,.status-page-v11,.faq-page-v11,.login-v11');
  const selectors=utility
    ? '.panel,.kpi,.process-section,.form-card,.status-v11-card,.faq-v11-item,.login-card'
    : 'main section > .section-shell, main section > .story-shell, .v10-section-head, .contractor-card-v8, .roles-product-card, .v10-step-card, .v10-doc-card, .story-page-card, .v10-faq-item';
  const els=qsa(selectors).filter((el,i,a)=>a.indexOf(el)===i);
  els.forEach(el=>el.classList.add('v26-reveal'));
  if('IntersectionObserver' in w){const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('v26-visible');io.unobserve(e.target)}}),{threshold:.09,rootMargin:'0px 0px -5% 0px'});els.forEach(el=>io.observe(el));}
  else els.forEach(el=>el.classList.add('v26-visible'));

  // Cinematic hero sheen + subtle depth.
  const hero=d.querySelector('.story-hero,.v10-hero');
  if(hero){hero.style.position=hero.style.position||'relative';const sheen=d.createElement('div');sheen.className='v26-hero-sheen';hero.append(sheen);const stage=hero.querySelector('.story-hero-stage,.v10-hero-stage');stage?.classList.add('v26-float');}

  // Hover tilt only for public cards and fine pointers.
  if(w.matchMedia('(hover:hover) and (pointer:fine)').matches){
    qsa('.roles-product-card,.contractor-card-v8,.v10-doc-card,.v10-step-card,.story-page-card').forEach(card=>{
      card.classList.add('v26-tilt');
      card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.rotate=`${(-y*1.4).toFixed(2)}deg ${(x*1.8).toFixed(2)}deg`;card.style.translate=`${(x*2).toFixed(1)}px ${(y*2).toFixed(1)}px`;});
      card.addEventListener('pointerleave',()=>{card.style.rotate='0deg';card.style.translate='0 0'});
    });
    qsa('a.btn,button.btn,.story-hero-actions a').forEach(btn=>{btn.classList.add('v26-magnetic');btn.addEventListener('pointermove',e=>{const r=btn.getBoundingClientRect();btn.style.translate=`${((e.clientX-r.left-r.width/2)*.08).toFixed(1)}px ${((e.clientY-r.top-r.height/2)*.08).toFixed(1)}px`});btn.addEventListener('pointerleave',()=>btn.style.translate='0 0')});
  }
})();
