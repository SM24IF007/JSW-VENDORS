(() => {
  'use strict';
  const d = document;

  // Strengthen the V29 step state logic so each large step is visibly active.
  const motionStory = d.getElementById('motion-story');
  const motionSteps = [...d.querySelectorAll('[data-v29-step]')];
  const motionNodes = [...d.querySelectorAll('.v29-node')];
  const motionLabel = d.querySelector('#v29OrbitLabel strong');
  const motionLabels = ['APPLICATION','VERIFICATION','PROCESSING','RAMCO + PRINT'];
  let storyRaf = 0;
  const updateMotionStep = () => {
    storyRaf = 0;
    if (!motionSteps.length) return;
    const targetY = innerHeight * .46;
    let best = 0, bestDist = Infinity;
    motionSteps.forEach((step,i) => {
      const r = step.getBoundingClientRect();
      const center = r.top + r.height/2;
      const dist = Math.abs(center-targetY);
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    motionSteps.forEach((s,i)=>s.classList.toggle('active',i===best));
    motionNodes.forEach((n,i)=>n.classList.toggle('active',i===best));
    if (motionLabel) motionLabel.textContent = motionLabels[best] || motionLabels[0];
  };
  addEventListener('scroll',()=>{if(!storyRaf)storyRaf=requestAnimationFrame(updateMotionStep)},{passive:true});
  addEventListener('resize',updateMotionStep,{passive:true});
  updateMotionStep();

  // Reliable 3-page scroll controller, independent of GSAP.
  const section = d.getElementById('three-pages');
  const steps = [...d.querySelectorAll('#three-pages [data-page-step]')];
  const nav = [...d.querySelectorAll('#three-pages [data-page-nav]')];
  const status = d.getElementById('v32PageStatus');
  if (!section || steps.length !== 3) return;

  let active = -1;
  const setPage = (idx, flash=true) => {
    idx = Math.max(0, Math.min(2, Number(idx)||0));
    if (idx === active && !flash) return;
    active = idx;
    section.classList.remove('v32-page-0','v32-page-1','v32-page-2');
    section.classList.add(`v32-page-${idx}`);
    steps.forEach((s,i)=>s.classList.toggle('active',i===idx));
    nav.forEach((b,i)=>{
      b.classList.toggle('active',i===idx);
      b.setAttribute('aria-pressed',String(i===idx));
    });
    if (status) status.textContent = `PAGE 0${idx+1}`;
    if (flash) {
      section.classList.remove('v32-is-changing');
      void section.offsetWidth;
      section.classList.add('v32-is-changing');
      setTimeout(()=>section.classList.remove('v32-is-changing'),720);
    }
  };

  let pageRaf = 0;
  const updatePageFromScroll = () => {
    pageRaf = 0;
    const targetY = innerHeight * .48;
    let best = 0, bestDist = Infinity;
    steps.forEach((step,i)=>{
      const r = step.getBoundingClientRect();
      const center = r.top + r.height/2;
      const dist = Math.abs(center-targetY);
      if (dist < bestDist) { bestDist=dist; best=i; }
    });
    if (best !== active) setPage(best,true);
  };

  nav.forEach((btn,idx)=>btn.addEventListener('click',()=>{
    setPage(idx,true);
    steps[idx].scrollIntoView({behavior:'smooth',block:'center'});
  }));

  addEventListener('scroll',()=>{if(!pageRaf)pageRaf=requestAnimationFrame(updatePageFromScroll)},{passive:true});
  addEventListener('resize',updatePageFromScroll,{passive:true});
  setPage(0,false);
  updatePageFromScroll();
})();
