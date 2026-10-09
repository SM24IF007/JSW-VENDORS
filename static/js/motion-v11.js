(() => {
  'use strict';
  const d=document, body=d.body;
  d.documentElement.classList.add('v11-js');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const qs=(s,c=d)=>c.querySelector(s), qsa=(s,c=d)=>[...c.querySelectorAll(s)];

  /* ROLE / CAREERS PAGE -------------------------------------------------- */
  if(body.classList.contains('roles-v11')){
    const buttons=qsa('[data-v11-skill-filter]');
    const cards=qsa('.roles-product-card[data-skill]');
    const normalize=s=>s==='highly skilled'?'skilled':s;
    buttons.forEach(btn=>btn.addEventListener('click',()=>{
      const filter=btn.dataset.v11SkillFilter;
      buttons.forEach(b=>b.classList.toggle('active',b===btn));
      const state=window.Flip?Flip.getState(cards):null;
      cards.forEach(card=>{
        const skill=normalize((card.dataset.skill||'').toLowerCase());
        card.classList.toggle('is-filtered-out',filter!=='all'&&skill!==filter);
      });
      if(state&&window.gsap&&!reduced){
        Flip.from(state,{duration:.32,ease:'power2.inOut',absolute:true,stagger:.012,
          onEnter:els=>gsap.fromTo(els,{opacity:0,scale:.97},{opacity:1,scale:1,duration:.2,overwrite:true}),
          onLeave:els=>gsap.to(els,{opacity:0,scale:.97,duration:.14,overwrite:true})});
      }
    }));
    cards.forEach(card=>{
      if(/container\s*surveyor/i.test(card.dataset.roleTitle||'')) card.classList.add('urgent-hiring');
    });
    if(window.gsap&&window.ScrollTrigger&&!reduced){
      gsap.registerPlugin(ScrollTrigger); if(window.Flip)gsap.registerPlugin(Flip); gsap.defaults({overwrite:'auto'});
      cards.forEach((card,i)=>gsap.fromTo(card,{x:i%2?-30:30,y:34,rotationY:i%2?6:-6,opacity:0,scale:.96},{x:0,y:0,rotationY:0,opacity:1,scale:1,ease:'none',scrollTrigger:{trigger:card,start:'top 94%',end:'top 76%',scrub:.22}}));
    } else cards.forEach(c=>{c.style.opacity='1';c.style.transform='none'});
  }

  /* APPLICATION FORM ---------------------------------------------------- */
  if(body.classList.contains('form-v11')){
    const form=qs('#candidateForm'), card=qs('.form-card'), success=qs('#applicationSuccess'), head=qs('.form-head',card);
    if(form){
      const clearError=field=>{field.closest('.field')?.classList.remove('has-error');field.closest('.field')?.querySelector('.v11-field-error')?.remove()};
      const showError=(field,msg)=>{const wrap=field.closest('.field');if(!wrap)return;clearError(field);wrap.classList.add('has-error');const er=d.createElement('span');er.className='v11-field-error';er.textContent=msg;wrap.append(er)};
      qsa('input,select',form).forEach(f=>{['input','change'].forEach(evt=>f.addEventListener(evt,()=>clearError(f)))});
      form.addEventListener('submit',async e=>{
        e.preventDefault();let ok=true;
        qsa('[required]',form).forEach(f=>{clearError(f);if(!f.checkValidity()){showError(f,f.validity.patternMismatch?'Enter a valid value.':'This field is required.');ok=false}});
        if(!ok){qs('.field.has-error input,.field.has-error select',form)?.focus();return}
        const submit=qs('button[type="submit"]',form);
        const originalLabel=submit?.innerHTML;
        if(submit){submit.disabled=true;submit.innerHTML='<span>Creating application…</span>'}
        try{
          const res=await fetch(form.action,{method:'POST',body:new FormData(form),headers:{'Accept':'application/json','X-Requested-With':'fetch'}});
          const data=await res.json().catch(()=>({ok:false,message:'Unable to submit application.'}));
          if(!res.ok||!data.ok){
            if(data.field){const f=form.elements[data.field];if(f){showError(f,data.message||'Check this field.');f.focus()}}
            else alert(data.message||'Unable to submit application.');
            return;
          }
          if(!reduced){
            [head,form].filter(Boolean).forEach(el=>{el.style.transition='opacity .2s ease,transform .2s ease';el.style.opacity='0';el.style.transform='translateY(-7px)'});
            await new Promise(r=>setTimeout(r,210));
          }
          card?.classList.add('is-complete');
          success?.classList.add('show');
          const msg=qs('[data-success-message]',success);if(msg)msg.textContent=data.message||'Your application has been created.';
          const appId=qs('[data-application-id]',success);if(appId)appId.textContent=data.applicant_id?`#${data.applicant_id}`:(data.existing?'EXISTING APPLICATION':'RECORDED');
          const link=qs('[data-status-link]',success);if(link)link.href=data.status_url||'/status';
          if(!reduced){success?.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:280,easing:'cubic-bezier(.2,.8,.2,1)',fill:'both'})}
          success?.scrollIntoView({block:'center',behavior:reduced?'auto':'smooth'});
        }catch(err){
          console.error('Application submit failed',err);
          alert('Submission service is temporarily unavailable. Please try again.');
        }finally{
          if(submit){submit.disabled=false;if(originalLabel)submit.innerHTML=originalLabel}
        }
      });
    }
  }

  /* STATUS UTILITY ------------------------------------------------------ */
  if(body.classList.contains('status-page-v11')){
    const form=qs('#statusPageForm'),result=qs('#statusPageResult'),stepper=qs('#statusStepper');
    const initialStage=Number(result?.dataset.initialStage??-1);
    if(result?.classList.contains('show')) renderSteps(initialStage);
    form?.addEventListener('submit',async e=>{
      e.preventDefault();const input=qs('#statusPageInput');const mobile=(input?.value||'').replace(/\D/g,'').slice(-10);
      if(mobile.length!==10){input?.setCustomValidity('Enter a valid 10-digit mobile number.');input?.reportValidity();input?.setCustomValidity('');return}
      form.classList.add('loading');
      try{
        const res=await fetch('/api/track_status',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({search_val:mobile})});
        const type=(res.headers.get('content-type')||'').toLowerCase();
        if(!res.ok||!type.includes('application/json')) throw new Error('status-api');
        const data=await res.json();
        let stageIndex=-1;
        if(!data.found){qs('[data-status-person]',result).innerHTML=`<strong>No record found</strong><span>${escapeHtml(data.message||'Check the mobile number used during registration.')}</span>`;stageIndex=-1;}
        else{qs('[data-status-person]',result).innerHTML=`<strong>${escapeHtml(data.name)}</strong><span>${escapeHtml(data.role||'Role pending')} · ${escapeHtml(data.status)}</span>`;stageIndex=Number(data.stage_index??0);}
        result?.classList.add('show');
        if(stepper){stepper.style.setProperty('--progress','0%');requestAnimationFrame(()=>requestAnimationFrame(()=>renderSteps(stageIndex)));}
      }catch(err){
        console.warn('Status API fallback',err);
        // Native POST fallback means the tracker still works even if JS/fetch fails.
        HTMLFormElement.prototype.submit.call(form);
        return;
      }finally{form.classList.remove('loading')}
    });
    function renderSteps(idx){
      const steps=qsa('.status-step',stepper);steps.forEach((s,i)=>{s.classList.toggle('done',idx>=0&&i<idx);s.classList.toggle('current',idx>=0&&i===idx)});
      const max=Math.max(1,steps.length-1);stepper?.style.setProperty('--progress',idx<0?'0%':`${Math.min(100,(idx/max)*84)}%`);
    }
  }

  /* FAQ UTILITY --------------------------------------------------------- */
  if(body.classList.contains('faq-page-v11')){
    const tabs=qsa('[data-faq-tab]'),items=qsa('.faq-v11-item');
    tabs.forEach(t=>t.addEventListener('click',()=>{tabs.forEach(x=>x.classList.toggle('active',x===t));const c=t.dataset.faqTab;items.forEach(i=>i.classList.toggle('hidden',c!=='all'&&i.dataset.category!==c))}));
    items.forEach((item,i)=>{
      const btn=qs('button',item),ans=qs('.faq-v11-answer',item);
      btn?.addEventListener('click',()=>{const opening=!item.classList.contains('open');items.forEach(o=>{if(o===item)return;o.classList.remove('open');qs('button',o)?.setAttribute('aria-expanded','false');const a=qs('.faq-v11-answer',o);if(a)a.style.height='0px'});item.classList.toggle('open',opening);btn.setAttribute('aria-expanded',String(opening));if(ans)ans.style.height=opening?`${ans.scrollHeight}px`:'0px'});
      if(reduced){item.classList.add('visible')} else if('IntersectionObserver'in window){const io=new IntersectionObserver(es=>{if(es[0].isIntersecting){item.classList.add('visible');io.disconnect()}},{threshold:.12});io.observe(item)} else setTimeout(()=>item.classList.add('visible'),i*20);
    });
  }

  /* LOGIN --------------------------------------------------------------- */
  if(body.classList.contains('login-v11')){
    const form=qs('form',body);
    form?.addEventListener('submit',e=>{
      if(reduced)return;
      e.preventDefault();body.classList.add('login-leaving');
      setTimeout(()=>form.submit(),140);
    });
  }

  /* ADMIN DASHBOARD ----------------------------------------------------- */
  if(body.classList.contains('admin-v11')){
    const first=!sessionStorage.getItem('v11AdminCounted');
    qsa('[data-admin-count]').forEach(el=>{const target=Number(el.dataset.adminCount||el.textContent||0);if(!first||reduced){el.textContent=target;return}let start;const dur=650;const tick=t=>{start??=t;const p=Math.min(1,(t-start)/dur);el.textContent=Math.round(target*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(tick)};requestAnimationFrame(tick)});if(first)sessionStorage.setItem('v11AdminCounted','1');
    qsa('.admin-table tbody tr').forEach((row,i)=>setTimeout(()=>row.classList.add('v11-row-in'),reduced?0:Math.min(i*24,240)));
    const inbox=qs('[data-tab="inbox"]'),badge=qs('.v11-notification-badge',inbox);
    if(badge){const count=Number(badge.dataset.messageCount||0),seen=Number(localStorage.getItem('v11InboxSeenCount')||0);if(count>seen)badge.classList.add('is-new');inbox?.addEventListener('click',()=>{localStorage.setItem('v11InboxSeenCount',String(count));badge.classList.remove('is-new')})}
  }

  /* CANDIDATE PROCESSING ------------------------------------------------ */
  if(body.classList.contains('process-v11')){
    const form=qs('#processApplicantForm'),check=qs('#processSaveCheck');
    let submitAction='save';

    const readAdminJson=async(res)=>{
      const type=(res.headers.get('content-type')||'').toLowerCase();
      const raw=await res.text();
      let data=null;
      if(type.includes('application/json')){
        try{data=JSON.parse(raw)}catch{}
      }else if(raw.trim().startsWith('{')){
        try{data=JSON.parse(raw)}catch{}
      }
      if(!data){
        if(res.redirected&&res.url.includes('/login')){
          return {ok:false,sessionExpired:true,message:'Admin session expired. Please sign in again.',login_url:'/login'};
        }
        return {ok:false,message:`Save endpoint returned ${res.status} ${res.statusText || ''}. Open the Flask terminal and copy the red error shown there.`};
      }
      return data;
    };

    qsa('[data-process-action]').forEach(btn=>btn.addEventListener('click',()=>submitAction=btn.dataset.processAction));
    form?.addEventListener('submit',async e=>{
      e.preventDefault();
      const btn=qs(`[data-process-action="${submitAction}"]`);
      btn?.classList.add('is-busy');
      qsa('[data-process-action]').forEach(b=>b.disabled=true);
      const fd=new FormData(form);fd.set('action',submitAction);
      try{
        const saveUrl=form.dataset.saveUrl||form.action;
        const res=await fetch(saveUrl,{method:'POST',body:fd,headers:{'Accept':'application/json','X-Requested-With':'fetch'},credentials:'same-origin'});
        const data=await readAdminJson(res);
        if(data.sessionExpired||res.status===401){alert(data.message||'Admin session expired.');location.href=data.login_url||'/login';return}
        if(!res.ok||!data.ok)throw new Error(data.message||'Save failed');
        if(submitAction==='generate'){location.href=data.print_url;return}
        check?.classList.add('show');
        setTimeout(()=>check?.classList.remove('show'),900);
      }catch(err){
        console.error('Candidate save failed',err);
        alert(err.message||'Unable to save record.');
      }finally{
        btn?.classList.remove('is-busy');
        qsa('[data-process-action]').forEach(b=>b.disabled=false);
      }
    });

    const statusSelect=qs('#processStatus'),statusBtn=qs('#processStatusBtn'),modal=qs('#statusConfirm'),confirmBtn=qs('#confirmStatusChange'),cancelBtn=qs('#cancelStatusChange');let previous=statusSelect?.value;
    statusBtn?.addEventListener('click',()=>{if(!statusSelect||statusSelect.value===previous)return;qs('[data-confirm-status]',modal).textContent=statusSelect.value;modal?.classList.add('open')});
    cancelBtn?.addEventListener('click',()=>{if(statusSelect)statusSelect.value=previous;modal?.classList.remove('open')});
    confirmBtn?.addEventListener('click',async()=>{
      if(!statusSelect)return;confirmBtn.disabled=true;
      try{
        const res=await fetch(`/admin/status/${statusSelect.dataset.appId}/${encodeURIComponent(statusSelect.value)}`,{method:'POST',headers:{'Accept':'application/json','X-Requested-With':'fetch'},credentials:'same-origin'});
        const data=await readAdminJson(res);
        if(data.sessionExpired||res.status===401){alert(data.message||'Admin session expired.');location.href=data.login_url||'/login';return}
        if(!res.ok||!data.ok)throw new Error(data.message||'Status update failed');
        previous=statusSelect.value;modal?.classList.remove('open');check?.classList.add('show');setTimeout(()=>check?.classList.remove('show'),900);
      }catch(err){
        console.error('Status update failed',err);
        alert(err.message||'Status update failed');statusSelect.value=previous;
      }finally{confirmBtn.disabled=false}
    });
  }

  function escapeHtml(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]))}
})();
