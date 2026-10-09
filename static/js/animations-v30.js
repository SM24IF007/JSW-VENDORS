(() => {
  'use strict';
  const d=document,w=window;
  const reduce=!!w.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const coarse=!!w.matchMedia?.('(pointer:coarse)').matches;
  const lite=d.documentElement.classList.contains('v29-lite')||!!navigator.connection?.saveData||(typeof navigator.deviceMemory==='number'&&navigator.deviceMemory<=3);

  // 25 loading animation
  const boot=d.createElement('div');boot.className='v30-boot-loader';boot.setAttribute('aria-hidden','true');boot.innerHTML='<i></i><span>LOADING EXPERIENCE</span>';d.body.append(boot);
  const finishBoot=()=>{boot.classList.add('is-done');setTimeout(()=>boot.remove(),420)};
  if(d.readyState==='complete')finishBoot();else w.addEventListener('load',finishBoot,{once:true});setTimeout(finishBoot,2400);

  // 24 skeletons
  d.querySelectorAll('.v12-visual-card,.v30-collage-photo').forEach(card=>{const img=card.querySelector('img');if(!img)return;card.classList.add('v30-skeleton');const done=()=>card.classList.add('v30-loaded');if(img.complete&&img.naturalWidth)done();else{img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true})}});

  // 11 animated icons + 12 microinteractions
  d.querySelectorAll('[data-v30-icon-action]').forEach(btn=>btn.addEventListener('click',ev=>{const r=btn.getBoundingClientRect(),rp=d.createElement('span');rp.className='v30-ripple';rp.style.left=`${ev.clientX?ev.clientX-r.left:r.width/2}px`;rp.style.top=`${ev.clientY?ev.clientY-r.top:r.height/2}px`;btn.append(rp);setTimeout(()=>rp.remove(),700);btn.classList.remove('is-confirmed');void btn.offsetWidth;btn.classList.add('is-confirmed');if(navigator.vibrate&&coarse)navigator.vibrate(12);setTimeout(()=>btn.classList.remove('is-confirmed'),1400)}));
  d.querySelectorAll('a.story-primary-btn,button.story-role-apply,.v10-status-btn').forEach(el=>{el.addEventListener('pointerdown',()=>el.style.transform='scale(.975)');['pointerup','pointercancel','pointerleave'].forEach(x=>el.addEventListener(x,()=>el.style.transform=''))});

  // 13 character
  const worker=d.getElementById('v30Worker'),hello=d.getElementById('v30WorkerHello'),bubble=d.getElementById('v30WorkerBubble');const phrases=['Safety first. Documents ready?','Aadhaar, PAN and bank proof.','One entry. Three final pages.','Check your mobile number carefully.'];let phrase=0,timer=0;const speak=()=>{if(!worker||!bubble)return;phrase=(phrase+1)%phrases.length;bubble.textContent=phrases[phrase];worker.classList.add('is-speaking');clearTimeout(timer);timer=setTimeout(()=>worker.classList.remove('is-speaking'),2600)};hello?.addEventListener('click',speak);

  // 14 faux 3D
  d.querySelectorAll('[data-v30-tilt]').forEach(card=>{if(reduce||coarse||lite)return;card.addEventListener('pointermove',ev=>{const r=card.getBoundingClientRect(),x=(ev.clientX-r.left)/r.width-.5,y=(ev.clientY-r.top)/r.height-.5;card.style.transform=`perspective(900px) rotateX(${(-y*5).toFixed(2)}deg) rotateY(${(x*7).toFixed(2)}deg)`});card.addEventListener('pointerleave',()=>card.style.transform='')});

  // 15 vertical-to-horizontal
  const story=d.getElementById('v30ScrollStory'),track=d.getElementById('v30HorizontalTrack');let raf=0;const update=()=>{raf=0;if(!story||!track||reduce||w.innerWidth<=980)return;const r=story.getBoundingClientRect(),travel=Math.max(1,story.offsetHeight-w.innerHeight),p=Math.max(0,Math.min(1,-r.top/travel)),maxX=Math.max(0,track.scrollWidth-track.parentElement.clientWidth);track.style.setProperty('--v30-horizontal-x',`${(-maxX*p).toFixed(1)}px`)};const queue=()=>{if(!raf)raf=requestAnimationFrame(update)};w.addEventListener('scroll',queue,{passive:true});w.addEventListener('resize',queue,{passive:true});update();

  // 17/18 pointer-responsive liquid gradient
  const liquid=d.querySelector('.v30-liquid-card');if(liquid&&!reduce&&!coarse&&!lite){liquid.addEventListener('pointermove',ev=>{const r=liquid.getBoundingClientRect();liquid.style.backgroundPosition=`${(((ev.clientX-r.left)/r.width)*100).toFixed(1)}% ${(((ev.clientY-r.top)/r.height)*100).toFixed(1)}%`});liquid.addEventListener('pointerleave',()=>liquid.style.backgroundPosition='')}

  // 22 page transitions
  const transition=d.createElement('div');transition.className='v30-page-transition';transition.setAttribute('aria-hidden','true');transition.innerHTML='<span class="v30-transition-mark"></span>';d.body.append(transition);const same=a=>{try{const u=new URL(a.href,location.href);return u.origin===location.origin&&!a.hasAttribute('download')&&a.target!=='_blank'}catch(_){return false}};if(!reduce)d.addEventListener('click',ev=>{const a=ev.target.closest('a[href]');if(!a||ev.defaultPrevented||ev.metaKey||ev.ctrlKey||ev.shiftKey||ev.altKey)return;const href=a.getAttribute('href')||'';if(!same(a)||href.startsWith('#')||href.startsWith('javascript:'))return;const u=new URL(a.href,location.href);if(u.pathname===location.pathname&&u.search===location.search)return;ev.preventDefault();transition.classList.add('is-active');setTimeout(()=>location.href=a.href,220)});w.addEventListener('pageshow',()=>transition.classList.remove('is-active'));

  // 27/28/29 tactile material feedback
  d.querySelectorAll('.v30-material').forEach(card=>card.addEventListener('click',()=>card.animate([{transform:'translateY(-4px) scale(1)'},{transform:'translateY(-4px) scale(.97)'},{transform:'translateY(-4px) scale(1.015)'},{transform:'translateY(-4px) scale(1)'}],{duration:420,easing:'cubic-bezier(.2,.75,.22,1)'})));

  // 30 flipbook
  const book=d.getElementById('v30Book'),prev=d.getElementById('v30BookPrev'),next=d.getElementById('v30BookNext'),status=d.getElementById('v30BookStatus');let page=1;const render=()=>{if(!book)return;book.dataset.page=String(page);if(status)status.textContent=`Page ${page} of 3`;if(prev)prev.disabled=page<=1;if(next)next.disabled=page>=3};prev?.addEventListener('click',()=>{page=Math.max(1,page-1);render()});next?.addEventListener('click',()=>{page=Math.min(3,page+1);render()});render();

  // 31 stop-motion frame counter
  const frame=d.getElementById('v30StopFrame');if(frame&&!reduce){let n=1;const id=setInterval(()=>{if(d.hidden)return;n=n%8+1;frame.textContent=String(n).padStart(2,'0')},500);w.addEventListener('pagehide',()=>clearInterval(id),{once:true})}
})();
