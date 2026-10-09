(() => {
  'use strict';
  const d=document,w=window;
  const reduce=w.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const coarse=w.matchMedia?.('(pointer:coarse)').matches;
  const conn=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  const lowMemory=typeof navigator.deviceMemory==='number'&&navigator.deviceMemory<=4;
  const lite=!!conn?.saveData || (coarse&&lowMemory);
  if(lite)d.documentElement.classList.add('v29-lite');
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));

  // Expressive typography: preserve readable text while animating characters.
  const splitChars=(el)=>{
    if(!el||el.dataset.v29Split)return;
    const text=el.textContent;
    el.dataset.v29Split='1';
    el.setAttribute('aria-label',text.trim());
    el.innerHTML='';
    [...text].forEach((ch,i)=>{
      const s=d.createElement('span');
      s.className=ch===' '?'v29-char v29-char-space':'v29-char';
      s.style.setProperty('--v29-i',i);
      s.setAttribute('aria-hidden','true');
      s.textContent=ch===' '?'\u00A0':ch;
      el.append(s);
    });
  };
  d.querySelectorAll('.v29-kinetic-heading').forEach(splitChars);
  const kinetic=d.querySelector('.v29-kinetic-heading');
  if(kinetic&&'IntersectionObserver'in w){
    const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('is-visible')),{threshold:.35});
    io.observe(kinetic);
  } else kinetic?.classList.add('is-visible');

  // Ambient background motion canvas with bounded work.
  const canvas=d.getElementById('v29AmbientCanvas');
  if(canvas&&!reduce&&!lite){
    const ctx=canvas.getContext('2d',{alpha:true});
    let width=0,height=0,dpr=1,visible=true,running=true,last=0;
    const count=coarse?18:34;
    const particles=Array.from({length:count},(_,i)=>({x:Math.random(),y:Math.random(),vx:(Math.random()-.5)*.00011,vy:(Math.random()-.5)*.00009,r:Math.random()*1.35+.45,p:i%4}));
    const resize=()=>{const r=canvas.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)};
    new ResizeObserver(resize).observe(canvas);resize();
    if('IntersectionObserver'in w)new IntersectionObserver(es=>{visible=es[0]?.isIntersecting??true},{rootMargin:'120px'}).observe(canvas);
    const draw=(now)=>{
      if(!running)return;
      requestAnimationFrame(draw);
      if(!visible||d.hidden||now-last<(coarse?42:28))return;last=now;
      ctx.clearRect(0,0,width,height);
      particles.forEach((p,i)=>{
        p.x=(p.x+p.vx+1)%1;p.y=(p.y+p.vy+1)%1;
        const x=p.x*width,y=p.y*height;
        ctx.beginPath();ctx.arc(x,y,p.r,0,Math.PI*2);ctx.fillStyle=p.p===0?'rgba(127,202,255,.55)':'rgba(205,232,249,.26)';ctx.fill();
        if(i%3===0){const q=particles[(i+5)%particles.length],dx=(q.x-p.x)*width,dy=(q.y-p.y)*height,dist=Math.hypot(dx,dy);if(dist<150){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(q.x*width,q.y*height);ctx.strokeStyle=`rgba(111,188,238,${(1-dist/150)*.09})`;ctx.lineWidth=.7;ctx.stroke()}}
      });
    };
    requestAnimationFrame(draw);addEventListener('pagehide',()=>{running=false},{once:true});
  }

  // Real-time rendering badge gets measured FPS from the WebGL scene.
  const fpsEl=d.getElementById('v29RenderFPS');
  w.addEventListener('v29:renderfps',e=>{if(fpsEl&&e.detail?.fps)fpsEl.textContent=`${e.detail.fps} FPS`});

  // Scrollytelling + self-drawing line.
  const story=d.getElementById('motion-story'),steps=[...d.querySelectorAll('[data-v29-step]')],line=d.getElementById('v29SelfLine'),meter=d.getElementById('v29StoryMeter'),label=d.querySelector('#v29OrbitLabel strong');
  const labels=['APPLICATION','VERIFICATION','PROCESSING','RAMCO + PRINT'];
  let activeStep=0,storyProgress=0,storyVisible=false;
  const activate=(idx)=>{activeStep=clamp(idx,0,steps.length-1);steps.forEach((s,i)=>s.classList.toggle('active',i===activeStep));d.querySelectorAll('.v29-node').forEach((n,i)=>n.classList.toggle('active',i===activeStep));if(label)label.textContent=labels[activeStep]||labels[0]};
  if(steps.length&&'IntersectionObserver'in w){const stepIO=new IntersectionObserver(es=>{es.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio).slice(0,1).forEach(e=>activate(Number(e.target.dataset.v29Step)))},{rootMargin:'-30% 0px -38%',threshold:[.1,.3,.55]});steps.forEach(s=>stepIO.observe(s))}
  if(story&&'IntersectionObserver'in w)new IntersectionObserver(es=>{storyVisible=es[0]?.isIntersecting??false},{rootMargin:'180px'}).observe(story);
  let scrollRAF=0;
  const updateStory=()=>{scrollRAF=0;if(!story)return;const r=story.getBoundingClientRect();const travel=Math.max(1,r.height-w.innerHeight);storyProgress=clamp((-r.top)/travel);story.style.setProperty('--v29-line-progress',storyProgress.toFixed(4));if(line)line.style.strokeDashoffset=(1-storyProgress).toFixed(4);if(meter)meter.style.setProperty('--v29-line-progress',storyProgress.toFixed(4));};
  addEventListener('scroll',()=>{if(!scrollRAF)scrollRAF=requestAnimationFrame(updateStory)},{passive:true});addEventListener('resize',updateStory,{passive:true});updateStory();activate(0);

  // Morphing SVG shape. Same point topology, continuously recalculated for smooth morphing.
  const blob=d.getElementById('v29MorphBlob');
  if(blob&&!reduce&&!lite){let run=true,last=0;const N=12,cx=320,cy=225;
    const pathAt=(t)=>{const pts=[];for(let i=0;i<N;i++){const a=-Math.PI/2+i*Math.PI*2/N;const wave=Math.sin(t*1.1+i*.93+activeStep*.8)*18+Math.cos(t*.72+i*1.37)*10;const rx=126+wave+activeStep*4,ry=112+Math.sin(t*.84+i*.71)*14;pts.push([cx+Math.cos(a)*rx,cy+Math.sin(a)*ry])}let path=`M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;for(let i=0;i<N;i++){const p0=pts[(i-1+N)%N],p1=pts[i],p2=pts[(i+1)%N],p3=pts[(i+2)%N];const c1=[p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6],c2=[p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6];path+=` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`}return path+' Z'};
    const morph=(now)=>{if(!run)return;requestAnimationFrame(morph);if(!storyVisible||d.hidden||now-last<(coarse?50:32))return;last=now;blob.setAttribute('d',pathAt(now/1000))};requestAnimationFrame(morph);addEventListener('pagehide',()=>run=false,{once:true});
  }

  // Real-time collaborative animation using server-sent events.
  const liveCount=d.getElementById('v29LiveCount'),collabStatus=d.getElementById('v29CollabStatus'),collabStage=d.getElementById('v29CollabStage'),pulseBtn=d.getElementById('v29PulseButton');
  let eventSource=null,accentIndex=0;
  const pulse=(accent=0)=>{if(!collabStage)return;const ring=d.createElement('i');ring.className='v29-live-pulse';ring.dataset.accent=String(accent||0);ring.style.transformOrigin='center';collabStage.append(ring);setTimeout(()=>ring.remove(),1250)};
  if(collabStage&&'EventSource'in w){
    eventSource=new EventSource('/api/motion-room/stream');
    eventSource.addEventListener('open',()=>{if(collabStatus)collabStatus.textContent='Live connection active'});
    eventSource.addEventListener('presence',e=>{try{const x=JSON.parse(e.data);if(liveCount)liveCount.textContent=String(Math.max(1,x.count||1))}catch(_){}});
    eventSource.addEventListener('pulse',e=>{try{const x=JSON.parse(e.data);pulse(x.accent)}catch(_){pulse(0)}});
    eventSource.onerror=()=>{if(collabStatus)collabStatus.textContent='Reconnecting…'};
  } else if(collabStatus) collabStatus.textContent='Live sync unavailable in this browser';
  pulseBtn?.addEventListener('click',async()=>{accentIndex=(accentIndex+1)%4;pulseBtn.disabled=true;try{const r=await fetch('/api/motion-room/pulse',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({accent:accentIndex})});if(!r.ok&&r.status!==429)throw new Error('pulse failed');if(r.status===429){pulse(accentIndex);if(collabStatus)collabStatus.textContent='Pulse cooldown — try again shortly'}}catch(_){pulse(accentIndex);if(collabStatus)collabStatus.textContent='Local pulse shown · live sync unavailable'}finally{setTimeout(()=>pulseBtn.disabled=false,600)}});

  // XR capability dialog + actual WebXR sessions when supported.
  const xrLaunch=d.getElementById('v29XRLaunch'),xrModal=d.getElementById('v29XRModal'),xrStatus=d.querySelector('#v29XRStatus span'),xrModeButtons=[...d.querySelectorAll('[data-v29-xr-mode]')];
  const openXR=async()=>{if(!xrModal)return;xrModal.setAttribute('aria-hidden','false');d.body.style.overflow='hidden';if(xrStatus)xrStatus.textContent='Checking WebXR device support…';let vr=false,ar=false;if(w.VasindXR){[vr,ar]=await Promise.all([w.VasindXR.supports('immersive-vr'),w.VasindXR.supports('immersive-ar')])}xrModeButtons.forEach(b=>{const m=b.dataset.v29XrMode;if(m==='immersive-vr')b.disabled=!vr;if(m==='immersive-ar')b.disabled=!ar});if(xrStatus)xrStatus.textContent=(vr||ar)?`WebXR ready${vr?' · VR':''}${ar?' · AR':''}`:'WebXR not available here · interactive GPU 3D remains available'};
  const closeXR=()=>{xrModal?.setAttribute('aria-hidden','true');d.body.style.overflow=''};
  xrLaunch?.addEventListener('click',openXR);d.querySelectorAll('[data-v29-xr-close]').forEach(b=>b.addEventListener('click',closeXR));
  xrModeButtons.forEach(b=>b.addEventListener('click',async()=>{const mode=b.dataset.v29XrMode;if(mode==='fallback'){w.VasindXR?.fallback?.();if(xrStatus)xrStatus.textContent='Interactive 3D preview activated';setTimeout(closeXR,450);return}if(!w.VasindXR)return;xrStatus.textContent='Starting immersive session…';const result=await w.VasindXR.enter(mode);if(result?.ok){xrStatus.textContent=`${mode==='immersive-ar'?'AR':'VR'} session active`;setTimeout(closeXR,300)}else xrStatus.textContent=result?.reason==='unsupported'?'This XR mode is not supported on this device/browser':`Could not start XR: ${result?.reason||'unknown error'}`}));
  w.addEventListener('v29:xrchange',e=>{if(xrStatus)xrStatus.textContent=e.detail?.active?'Immersive session active':'Immersive session ended'});
  w.addEventListener('v29:xrready',()=>{if(xrModal?.getAttribute('aria-hidden')==='false')openXR()});
  d.addEventListener('keydown',e=>{if(e.key==='Escape'&&xrModal?.getAttribute('aria-hidden')==='false')closeXR()});

  addEventListener('pagehide',()=>{eventSource?.close()},{once:true});
})();
