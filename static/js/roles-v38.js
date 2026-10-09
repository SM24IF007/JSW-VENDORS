
(()=>{"use strict";
const cards=[...document.querySelectorAll(".roles-product-card")];
if(!cards.length)return;
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
if(reduce||!("IntersectionObserver"in window)){cards.forEach(c=>c.classList.add("v38-role-visible"));return;}
cards.forEach(c=>c.classList.add("v38-role-reveal"));
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("v38-role-visible");io.unobserve(e.target)}}),{threshold:.12,rootMargin:"0px 0px -5%"});
cards.forEach(c=>io.observe(c));
})();
