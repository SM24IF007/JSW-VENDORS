(() => {
  'use strict';
  const d=document,w=window;
  // Header visibility failsafe after older animation libraries finish mutating inline styles.
  const nav=d.getElementById('siteNav');
  const repairNav=()=>{if(!nav)return;nav.style.setProperty('opacity','1','important');nav.style.setProperty('visibility','visible','important');nav.style.setProperty('transform','none','important');nav.style.setProperty('z-index','20000','important')};
  repairNav();setTimeout(repairNav,100);setTimeout(repairNav,800);

  // Force a recalculation after fonts/layout load so sticky regions use their true height.
  let raf=0;
  const refresh=()=>{if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{raf=0;d.documentElement.style.setProperty('--v34-vh',`${w.innerHeight}px`);w.dispatchEvent(new Event('scroll'))})};
  w.addEventListener('load',refresh,{once:true});w.addEventListener('resize',refresh,{passive:true});w.addEventListener('orientationchange',refresh,{passive:true});refresh();

  // Prevent old scroll libraries from leaving translated story containers. Sticky only works when ancestors stay untransformed.
  ['motion-story','three-pages','joiningJourney'].forEach(id=>{
    const el=d.getElementById(id);if(!el)return;
    el.style.setProperty('transform','none','important');
    el.style.setProperty('overflow','visible','important');
  });
})();