(() => {
  'use strict';
  const d=document,w=window;
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const coarse=matchMedia('(pointer:coarse)').matches;
  const lowMem=typeof navigator.deviceMemory==='number' && navigator.deviceMemory<=3;
  const saveData=!!navigator.connection?.saveData;
  const lite=reduce||lowMem||saveData;
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));

  // Lightweight projected 3D particle field behind jobs hero.
  const canvas=d.getElementById('v33JobsCanvas');
  if(canvas && !lite){
    const ctx=canvas.getContext('2d',{alpha:true});
    let W=1,H=1,DPR=1,run=true,visible=true,last=0;
    const count=coarse?34:66;
    const pts=Array.from({length:count},()=>({x:(Math.random()-.5)*2,y:(Math.random()-.5)*1.35,z:Math.random()*1.8+.15,s:Math.random()*.8+.35}));
    const resize=()=>{const r=canvas.getBoundingClientRect();W=Math.max(1,r.width);H=Math.max(1,r.height);DPR=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0)};
    new ResizeObserver(resize).observe(canvas);resize();
    if('IntersectionObserver'in w)new IntersectionObserver(e=>visible=e[0]?.isIntersecting??true,{rootMargin:'120px'}).observe(canvas);
    const draw=now=>{if(!run)return;requestAnimationFrame(draw);if(!visible||d.hidden||now-last<30)return;last=now;ctx.clearRect(0,0,W,H);const f=Math.min(W,H)*.68;pts.forEach((p,i)=>{p.z-=.0022;if(p.z<.15){p.z=1.95;p.x=(Math.random()-.5)*2;p.y=(Math.random()-.5)*1.35}const sc=f/(p.z*f+f*.48);const x=W*.5+p.x*f*sc,y=H*.5+p.y*f*sc,r=p.s*(1.2/p.z);ctx.beginPath();ctx.arc(x,y,Math.min(2.2,r),0,Math.PI*2);ctx.fillStyle=`rgba(132,207,252,${Math.min(.5,.13+.32*(1-p.z/2))})`;ctx.fill();if(i%5===0){ctx.beginPath();ctx.moveTo(W*.5,H*.5);ctx.lineTo(x,y);ctx.strokeStyle='rgba(92,174,230,.025)';ctx.stroke()}})};
    requestAnimationFrame(draw);addEventListener('pagehide',()=>run=false,{once:true});
  }

  // Hero 3D pointer motion and scroll depth.
  const hero=d.getElementById('jobsHero'),stage=d.getElementById('v33JobsHeroStage');
  if(stage && !coarse && !reduce){
    stage.addEventListener('pointermove',e=>{const r=stage.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;stage.style.transform=`perspective(1300px) rotateX(${(-y*7).toFixed(2)}deg) rotateY(${(x*9).toFixed(2)}deg)`});
    stage.addEventListener('pointerleave',()=>stage.style.transform='');
  }
  let heroRaf=0;
  const heroScroll=()=>{heroRaf=0;if(!hero||!stage||reduce)return;const r=hero.getBoundingClientRect();const p=clamp(-r.top/Math.max(1,r.height));stage.style.setProperty('translate','0 '+(p*26).toFixed(1)+'px');stage.style.opacity=String(1-p*.38)};
  addEventListener('scroll',()=>{if(!heroRaf)heroRaf=requestAnimationFrame(heroScroll)},{passive:true});heroScroll();

  // Reliable joining scrollytelling — independent of GSAP.
  const journey=d.getElementById('joiningJourney');
  const steps=[...d.querySelectorAll('[data-v33-job-stage]')];
  const coreNo=d.getElementById('v33JourneyNo'),coreKick=d.getElementById('v33JourneyKicker'),coreTitle=d.getElementById('v33JourneyTitle');
  const path=d.getElementById('v33JourneyPath');
  const labels=[
    ['01','APPLICATION','APPLY'],['02','REVIEW','INTERVIEW'],['03','MEDICAL','CLEARANCE'],['04','SAFETY','INDUCTION'],['05','JOINING','READY']
  ];
  let active=-1,raf=0;
  const setStage=i=>{i=Math.max(0,Math.min(4,i));if(i===active)return;active=i;if(journey)journey.dataset.stage=String(i);steps.forEach((s,j)=>s.classList.toggle('active',i===j));const a=labels[i];if(coreNo)coreNo.textContent=a[0];if(coreKick)coreKick.textContent=a[1];if(coreTitle)coreTitle.textContent=a[2];};
  const update=()=>{raf=0;if(!journey||!steps.length)return;const target=innerHeight*.46;let best=0,dist=Infinity;steps.forEach((s,i)=>{const r=s.getBoundingClientRect();const c=r.top+r.height/2,dd=Math.abs(c-target);if(dd<dist){dist=dd;best=i}});setStage(best);const r=journey.getBoundingClientRect(),travel=Math.max(1,r.height-innerHeight),p=clamp(-r.top/travel);journey.style.setProperty('--j33-journey-progress',p.toFixed(4));if(path)path.style.strokeDashoffset=(1-p).toFixed(4)};
  addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(update)},{passive:true});addEventListener('resize',update,{passive:true});setStage(0);update();

  // Strong role-card 3D tilt + glow. Touch devices get scroll reveal only.
  const cards=[...d.querySelectorAll('.roles-product-card')];
  const roleSearch=d.getElementById('roleQuickSearch'), noResults=d.getElementById('roleSearchEmpty');
  if(roleSearch){roleSearch.addEventListener('input',()=>{
    const query=roleSearch.value.trim().toLocaleLowerCase();let matches=0;
    cards.forEach(card=>{const visible=!query||(card.dataset.roleTitle||'').toLocaleLowerCase().includes(query);card.hidden=!visible;card.style.display=visible?'':'none';if(visible)matches++});
    if(noResults)noResults.hidden=!!matches;
  })}
  if('IntersectionObserver'in w && !reduce){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('v33-card-visible');io.unobserve(e.target)}}),{threshold:.08,rootMargin:'0px 0px -6%'});cards.forEach((c,i)=>{c.style.opacity='0';c.style.transform=`translate3d(0,${38+(i%3)*8}px,-40px) rotateX(6deg)`;c.style.transition='opacity .6s ease, transform .72s cubic-bezier(.2,.78,.2,1), border-color .25s ease, box-shadow .25s ease';io.observe(c)});const style=d.createElement('style');style.textContent='.roles-product-card.v33-card-visible{opacity:1!important;transform:translate3d(0,0,0) rotateX(0)!important}';d.head.append(style)}
  if(!coarse && !reduce){cards.forEach(card=>{card.addEventListener('pointermove',e=>{if(!card.classList.contains('v33-card-visible'))return;const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.setProperty('--j33-x',`${((x+.5)*100).toFixed(1)}%`);card.style.setProperty('--j33-y',`${((y+.5)*100).toFixed(1)}%`);card.style.transform=`perspective(1100px) rotateX(${(-y*5).toFixed(2)}deg) rotateY(${(x*7).toFixed(2)}deg) translateY(-5px)`});card.addEventListener('pointerleave',()=>{card.style.transform='translate3d(0,0,0) rotateX(0)'})})}
})();
