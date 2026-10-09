(() => {
  'use strict';
  const d=document,w=window;
  const section=d.getElementById('three-pages');
  if(!section || !section.classList.contains('v33-pages')) return;
  const steps=[...section.querySelectorAll('[data-v33-page-step]')];
  const nav=[...section.querySelectorAll('[data-v33-page-nav]')];
  const status=d.getElementById('v33PageStatus');
  const title=d.getElementById('v33PageTitle');
  const titles=['INTERVIEW ASSESSMENT','PERSONAL & EMPLOYMENT','REGISTRATION & DECLARATION'];
  let active=-1,raf=0;
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));

  function setPage(idx,flash=true){
    idx=Math.max(0,Math.min(2,Number(idx)||0));
    if(idx===active && !flash) return;
    active=idx;
    section.dataset.v33Page=String(idx);
    steps.forEach((el,i)=>el.classList.toggle('active',i===idx));
    nav.forEach((el,i)=>{el.classList.toggle('active',i===idx);el.setAttribute('aria-selected',String(i===idx));});
    if(status) status.textContent=`PAGE 0${idx+1}`;
    if(title) title.textContent=titles[idx];
    if(flash){
      section.classList.remove('is-switching');
      void section.offsetWidth;
      section.classList.add('is-switching');
      setTimeout(()=>section.classList.remove('is-switching'),760);
    }
  }
  function update(){
    raf=0;
    const y=w.innerHeight*.46;
    let best=0,dist=Infinity;
    steps.forEach((el,i)=>{const r=el.getBoundingClientRect();const c=r.top+r.height/2;const dd=Math.abs(c-y);if(dd<dist){dist=dd;best=i}});
    if(best!==active) setPage(best,true);
    const r=section.getBoundingClientRect();
    const travel=Math.max(1,r.height-w.innerHeight);
    const p=clamp(-r.top/travel);
    section.style.setProperty('--v33-page-progress',p.toFixed(4));
  }
  function queue(){if(!raf) raf=requestAnimationFrame(update)}
  nav.forEach((btn,i)=>btn.addEventListener('click',()=>{setPage(i,true);steps[i]?.scrollIntoView({behavior:'smooth',block:'center'})}));
  w.addEventListener('scroll',queue,{passive:true});
  w.addEventListener('resize',queue,{passive:true});
  setPage(0,false);update();

  // Pointer depth on stage only on precise pointers.
  const stage=section.querySelector('.v33-page-stage');
  if(stage && matchMedia('(hover:hover) and (pointer:fine)').matches && !matchMedia('(prefers-reduced-motion:reduce)').matches){
    stage.addEventListener('pointermove',e=>{
      const r=stage.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
      stage.style.transform=`perspective(1500px) rotateX(${(-y*1.7).toFixed(2)}deg) rotateY(${(x*2.4).toFixed(2)}deg)`;
    });
    stage.addEventListener('pointerleave',()=>stage.style.transform='');
  }
})();
