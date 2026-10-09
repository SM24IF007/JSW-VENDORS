(() => {
  const qs=(s,r=document)=>r.querySelector(s), qsa=(s,r=document)=>[...r.querySelectorAll(s)];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const progress=qs('#scrollProgress'), nav=qs('#siteNav'), glow=qs('#cursorGlow');
  const menuBtn=qs('#menuBtn'), mobileMenu=qs('#mobileMenu');

  const update=()=>{
    const max=document.documentElement.scrollHeight-innerHeight;
    if(progress) progress.style.width=`${max>0?(scrollY/max)*100:0}%`;
    nav?.classList.toggle('scrolled',scrollY>24);
  };
  addEventListener('scroll',update,{passive:true}); update();
  if(glow && matchMedia('(pointer:fine)').matches) addEventListener('pointermove',e=>{glow.style.left=e.clientX+'px';glow.style.top=e.clientY+'px'},{passive:true});
  menuBtn?.addEventListener('click',()=>mobileMenu?.classList.toggle('open'));
  qsa('#mobileMenu a').forEach(a=>a.addEventListener('click',()=>mobileMenu?.classList.remove('open')));

  qsa('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const id=a.getAttribute('href');if(id==='#')return;const t=qs(id);if(!t)return;e.preventDefault();t.scrollIntoView({behavior:reduced?'auto':'smooth'})}));

  if(window.gsap && !reduced){
    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({overwrite:'auto'});
    const tl=gsap.timeline({defaults:{ease:'power3.out'}});
    tl.from('.site-nav',{y:-25,opacity:0,duration:.248})
      .from('.hero .eyebrow',{y:15,opacity:0,duration:.242},'-.25')
      .from('.hero h1 .line',{y:90,opacity:0,duration:.248,stagger:.08},'-.25')
      .from('.hero-copy',{y:25,opacity:0,duration:.244},'-.5')
      .from('.hero-actions>*',{y:20,opacity:0,duration:.242,stagger:.08},'-.4')
      .from('.hero-meta>*',{y:14,opacity:0,duration:.24,stagger:.06},'-.3')
      .from('.hero-stage',{scale:.92,opacity:0,duration:.28},'-=.8');

    qsa('[data-reveal]').forEach(el=>gsap.from(el,{scrollTrigger:{trigger:el,start:'top 88%',once:true},y:38,opacity:0,duration:.244,ease:'power3.out'}));
    qsa('[data-stagger]').forEach(group=>gsap.from([...group.children],{scrollTrigger:{trigger:group,start:'top 84%',once:true},y:44,opacity:0,stagger:.1,duration:.2488,ease:'power3.out'}));
    if(qs('#workflowProgress')) gsap.to('#workflowProgress',{height:'100%',ease:'none',scrollTrigger:{trigger:'#workflow',start:'top 58%',end:'bottom 70%',scrub:.5}});
    qsa('.hud-card').forEach((el,i)=>gsap.to(el,{y:i%2?-12:10,x:i===2?8:0,duration:3+i*.4,repeat:-1,yoyo:true,ease:'sine.inOut'}));
    qsa('.gallery-card').forEach(el=>gsap.from(el,{scrollTrigger:{trigger:el,start:'top 92%',once:true},scale:.965,opacity:0,duration:.244,ease:'power2.out'}));
    gsap.to('.hero-grid',{backgroundPosition:'72px 72px',duration:25,repeat:-1,ease:'none'});
    gsap.to('.hero-scan',{xPercent:130,duration:5.2,repeat:-1,repeatDelay:2.5,ease:'power1.inOut'});
    if(qs('#paperScene')) gsap.to('#paperScene',{y:-18,rotateY:4,duration:3.8,repeat:-1,yoyo:true,ease:'sine.inOut'});

    // Giant Roles heading: reveal like heavy machinery entering frame.
    if(qs('.roles-mega')){
      gsap.from('.roles-mega',{scrollTrigger:{trigger:'.roles-showcase',start:'top 75%',once:true},x:-120,skewX:-8,opacity:0,duration:.248,ease:'expo.out'});
      gsap.to('.roles-bg-word',{xPercent:-10,ease:'none',scrollTrigger:{trigger:'.roles-showcase',start:'top bottom',end:'bottom top',scrub:1}});
    }
    if(qs('.roles-title')) gsap.from('.roles-title',{y:70,opacity:0,scale:.96,duration:.246,ease:'expo.out'});

    // V3: stronger scroll storytelling without turning every element into a gimmick.
    qsa('[data-scroll-card]').forEach((el,i)=>gsap.from(el,{
      scrollTrigger:{trigger:el,start:'top 90%',once:true},
      y:56,opacity:0,rotateX:5,duration:.2488,delay:(i%3)*.05,ease:'power3.out'
    }));
    qsa('.section-head .section-title').forEach(el=>gsap.from(el,{
      scrollTrigger:{trigger:el,start:'top 88%',once:true},
      x:-42,opacity:0,duration:.2442,ease:'power3.out'
    }));
    qsa('.workflow-visual').forEach((el,i)=>gsap.from(el,{
      scrollTrigger:{trigger:el,start:'top 88%',once:true},
      x:48,rotateY:-8,opacity:0,duration:.2485,delay:(i%2)*.06,ease:'power3.out'
    }));
    if(qs('.facility-image img')) gsap.fromTo('.facility-image img',{scale:1.1},{scale:1,ease:'none',scrollTrigger:{trigger:'.facility-feature',start:'top bottom',end:'bottom top',scrub:1.1}});
    if(qs('.three-page-section')) gsap.to('.paper-scene',{rotateY:7,rotateX:-2,y:-28,ease:'none',scrollTrigger:{trigger:'.three-page-section',start:'top bottom',end:'bottom top',scrub:1.2}});
    if(qs('.roles-showcase-v3')) gsap.to('.roles-showcase-v3 .roles-bg-word',{xPercent:-12,yPercent:8,ease:'none',scrollTrigger:{trigger:'.roles-showcase-v3',start:'top bottom',end:'bottom top',scrub:1}});
    if(qs('.roles-hero-v3')){
      gsap.to('.roles-orb-a',{x:-70,y:80,ease:'none',scrollTrigger:{trigger:'.roles-hero-v3',start:'top top',end:'bottom top',scrub:1}});
      gsap.to('.roles-orb-b',{x:65,y:-45,ease:'none',scrollTrigger:{trigger:'.roles-hero-v3',start:'top top',end:'bottom top',scrub:1}});
    }
  }

  qsa('[data-tilt]').forEach(card=>{
    if(!matchMedia('(pointer:fine)').matches || reduced)return;
    card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.transform=`perspective(900px) rotateY(${x*5}deg) rotateX(${-y*4}deg) translateY(-5px)`});
    card.addEventListener('pointerleave',()=>card.style.transform='');
  });

  qsa('[data-magnetic]').forEach(btn=>{
    if(!matchMedia('(pointer:fine)').matches || reduced)return;
    btn.addEventListener('pointermove',e=>{const r=btn.getBoundingClientRect();btn.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.12}px,${(e.clientY-r.top-r.height/2)*.12}px)`});
    btn.addEventListener('pointerleave',()=>btn.style.transform='');
  });

  qsa('[data-count]').forEach(el=>{
    const target=Number(el.dataset.count||0); if(!target)return;
    const run=()=>{let start=null;const step=t=>{if(!start)start=t;const p=Math.min(1,(t-start)/1000);el.textContent=String(Math.round(target*(1-Math.pow(1-p,3)))).padStart(2,'0');if(p<1)requestAnimationFrame(step)};requestAnimationFrame(step)};
    if('IntersectionObserver'in window){const io=new IntersectionObserver(es=>{if(es[0].isIntersecting){run();io.disconnect()}},{threshold:.4});io.observe(el)}else run();
  });

  const tracker=qs('#statusForm');
  if(tracker) tracker.addEventListener('submit',async e=>{
    e.preventDefault();const input=qs('#statusInput'),out=qs('#statusResult'),val=input.value.trim();if(!val)return;
    out.classList.add('show');out.textContent='Checking latest application record…';
    try{const res=await fetch('/api/track_status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({search_val:val})});const d=await res.json();out.innerHTML=d.found?`<b>${escapeHtml(d.name)}</b><br>${escapeHtml(d.role||'Role pending')} · <span style="color:var(--copper2)">${escapeHtml(d.status)}</span>`:'No application found for that mobile number.'}catch{out.textContent='Status service is temporarily unavailable.'}
  });

  // Home roles teaser: click animation + detail swap.
  const teaserBtns=qsa('[data-role-teaser]');
  teaserBtns.forEach(btn=>btn.addEventListener('click',()=>{
    teaserBtns.forEach(b=>b.classList.toggle('active',b===btn));
    const panel=qs('#roleDetailPanel'),title=qs('#roleDetailTitle'),desc=qs('#roleDetailDesc'),dept=qs('#roleDetailDept');
    const updateText=()=>{if(title)title.textContent=btn.dataset.role||'';if(desc)desc.textContent=btn.dataset.desc||'';if(dept)dept.textContent=btn.dataset.dept||''};
    if(window.gsap&&!reduced&&panel){gsap.to(panel,{opacity:0,y:12,duration:.16,onComplete:()=>{updateText();gsap.to(panel,{opacity:1,y:0,duration:.242,ease:'power3.out'})}})}else updateText();
    const icon=btn.querySelector('i'); teaserBtns.forEach(b=>{const i=b.querySelector('i');if(i)i.textContent=b===btn?'×':'+'});
  }));

  // Full roles page: click-to-expand with GSAP spring.
  qsa('[data-role-card]').forEach(card=>{
    const toggle=()=>{
      const opening=!card.classList.contains('expanded');
      qsa('[data-role-card].expanded').forEach(other=>{if(other!==card){other.classList.remove('expanded');const ex=other.querySelector('.role-expand');if(window.gsap&&!reduced&&ex)gsap.to(ex,{height:0,opacity:0,duration:.25})}});
      card.classList.toggle('expanded',opening);
      const ex=card.querySelector('.role-expand'),plus=card.querySelector('.role-toggle span'); if(plus)plus.textContent=opening?'×':'+';
      if(ex&&window.gsap&&!reduced){if(opening){gsap.set(ex,{height:'auto'});const h=ex.offsetHeight;gsap.fromTo(ex,{height:0,opacity:0},{height:h,opacity:1,duration:.242,ease:'power3.out',onComplete:()=>gsap.set(ex,{height:'auto'})});gsap.from(card,{scale:.985,duration:.24,ease:'back.out(1.5)'})}else gsap.to(ex,{height:0,opacity:0,duration:.24,ease:'power2.inOut'})}
    };
    card.addEventListener('click',e=>{if(e.target.closest('a'))return;toggle()});
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});
  });

  qsa('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{
    qsa('[data-filter]').forEach(b=>b.classList.toggle('active',b===btn));const f=btn.dataset.filter;
    qsa('.roles-product-card[data-contractor], .role-card-v3[data-contractor], .role-card[data-contractor]').forEach(c=>{const show=f==='all'||c.dataset.contractor===f;if(window.gsap&&!reduced){if(show){c.style.display='flex';gsap.fromTo(c,{opacity:0,y:18},{opacity:1,y:0,duration:.245})}else{gsap.to(c,{opacity:0,y:12,duration:.18,onComplete:()=>c.style.display='none'})}}else c.style.display=show?'flex':'none'});
  }));

  // Apply Now -> show the exact starter requirements before opening the form.
  const roleModal=qs('#roleApplyModal');
  const roleModalTitle=qs('#roleModalTitle');
  const roleModalContractor=qs('#roleModalContractor');
  const roleModalSkill=qs('#roleModalSkill');
  const roleModalDescription=qs('#roleModalDescription');
  const roleModalSalary=qs('#roleModalSalary');
  const roleModalContinue=qs('#roleModalContinue');

  let lastModalTrigger=null;
  const openRoleModal=(btn)=>{
    lastModalTrigger=btn;
    if(!roleModal)return;
    const card=btn.closest('[data-home-role]');
    if(!card)return;
    const title=qs('[data-role-name]',card)?.textContent.trim()||'Selected role';
    const contractor=qs('[data-role-contractor]',card)?.textContent.trim()||'Contractor';
    const skill=qs('[data-role-skill]',card)?.textContent.trim()||'Role';
    const description=qs('[data-role-description]',card)?.textContent.trim()||'';
    const salary=qs('[data-role-salary] strong',card)?.textContent.trim()||'Salary varies by role';
    const roleId=btn.dataset.roleId||'';

    if(roleModalTitle)roleModalTitle.textContent=title;
    if(roleModalContractor)roleModalContractor.textContent=contractor;
    if(roleModalSkill)roleModalSkill.textContent=skill;
    if(roleModalDescription)roleModalDescription.textContent=description;
    if(roleModalSalary)roleModalSalary.textContent=salary;
    if(roleModalContinue)roleModalContinue.href=roleId?`/apply_form?role_id=${encodeURIComponent(roleId)}`:'/apply_form';

    roleModal.classList.add('open');
    roleModal.setAttribute('aria-hidden','false');
    document.body.classList.add('modal-open');
    requestAnimationFrame(()=>roleModal.querySelector('.role-modal-close')?.focus());
    if(window.gsap&&!reduced){
      gsap.fromTo('.role-modal-backdrop',{opacity:0},{opacity:1,duration:.22});
      gsap.fromTo('.role-modal-dialog',{y:34,scale:.965,opacity:0},{y:0,scale:1,opacity:1,duration:.242,ease:'power3.out'});
      gsap.from('.required-grid>div',{y:16,opacity:0,stagger:.055,duration:.28,delay:.12,ease:'power2.out'});
    }
  };

  const closeRoleModal=()=>{
    if(!roleModal)return;
    const finish=()=>{roleModal.classList.remove('open');roleModal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open')};
    if(lastModalTrigger){lastModalTrigger.focus();lastModalTrigger=null;}
    if(window.gsap&&!reduced){gsap.to('.role-modal-dialog',{y:18,scale:.985,opacity:0,duration:.18,ease:'power2.in',onComplete:finish});gsap.to('.role-modal-backdrop',{opacity:0,duration:.18})}else finish();
  };

  qsa('[data-role-apply]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openRoleModal(btn)}));
  qsa('#roleApplyModal [data-modal-close]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();closeRoleModal()}));
  addEventListener('keydown',e=>{
    if(!roleModal?.classList.contains('open'))return;
    if(e.key==='Escape'){closeRoleModal();return;}
    if(e.key==='Tab'){
      const focusables=[...roleModal.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el=>el.offsetParent!==null);
      if(!focusables.length)return;
      const first=focusables[0],last=focusables[focusables.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });

  function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]))}

  qsa('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{const id=btn.dataset.tab;qsa('[data-tab]').forEach(b=>b.classList.toggle('active',b===btn));qsa('.tab-pane').forEach(p=>p.classList.toggle('active',p.id===`pane-${id}`));try{history.replaceState(null,'',`?tab=${id}#${id}`)}catch{}}));
  const initial=new URLSearchParams(location.search).get('tab')||location.hash.replace('#','');if(initial)qs(`[data-tab="${CSS.escape(initial)}"]`)?.click();
  qsa('[data-modal-open]').forEach(b=>b.addEventListener('click',()=>qs(`#${b.dataset.modalOpen}`)?.classList.add('open')));
  qsa('[data-modal-close]').forEach(b=>b.addEventListener('click',()=>b.closest('.modal-backdrop')?.classList.remove('open')));
  qsa('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')}));
})();
