(() => {
  'use strict';
  const d=document,w=window;
  d.body.classList.add('v33-global-depth');
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const coarse=matchMedia('(pointer:coarse)').matches;
  const save=!!navigator.connection?.saveData;
  const low=typeof navigator.deviceMemory==='number'&&navigator.deviceMemory<=3;

  // Ambient projected point field on pages that do not already own a dedicated V33 canvas.
  if(!d.getElementById('v33JobsCanvas') && !d.getElementById('v29AmbientCanvas') && !reduce && !save && !low){
    const c=d.createElement('canvas');c.className='v33-global-canvas';c.setAttribute('aria-hidden','true');d.body.prepend(c);
    const x=c.getContext('2d',{alpha:true});let W=1,H=1,D=1,run=true,last=0;const pts=Array.from({length:32},()=>({x:Math.random(),y:Math.random(),z:Math.random(),v:.00005+Math.random()*.00008}));
    const resize=()=>{W=innerWidth;H=innerHeight;D=Math.min(devicePixelRatio||1,1.35);c.width=Math.round(W*D);c.height=Math.round(H*D);x.setTransform(D,0,0,D,0,0)};resize();addEventListener('resize',resize,{passive:true});
    const draw=now=>{if(!run)return;requestAnimationFrame(draw);if(document.hidden||now-last<34)return;last=now;x.clearRect(0,0,W,H);pts.forEach((p,i)=>{p.y=(p.y+p.v)%1;p.x=(p.x+Math.sin(now*.0001+i)*.000018+1)%1;const px=p.x*W,py=p.y*H,r=.5+(1-p.z)*1.1;x.beginPath();x.arc(px,py,r,0,Math.PI*2);x.fillStyle='rgba(115,199,250,.28)';x.fill();if(i%4===0){x.beginPath();x.moveTo(W*.5,H*.4);x.lineTo(px,py);x.strokeStyle='rgba(105,190,245,.018)';x.stroke()}})};requestAnimationFrame(draw);addEventListener('pagehide',()=>run=false,{once:true});
  }

  const candidates=d.querySelectorAll('.contractor-panel,.faq-item,.status-card,.privacy-card,.form-card,.login-card,.v10-partner-card,.story-facts-grid article');
  if('IntersectionObserver'in w && !reduce){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('v33-in');io.unobserve(e.target)}}),{threshold:.06,rootMargin:'0px 0px -4%'});candidates.forEach(el=>{el.classList.add('v33-global-reveal');io.observe(el)})}
  if(!coarse&&!reduce){candidates.forEach(el=>{el.classList.add('v33-global-tilt');el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect(),px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;el.style.transform=`perspective(1000px) rotateX(${(-py*3).toFixed(2)}deg) rotateY(${(px*4).toFixed(2)}deg) translateY(-2px)`});el.addEventListener('pointerleave',()=>el.style.transform='')})}
})();
