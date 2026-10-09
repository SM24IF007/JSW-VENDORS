(() => {
  'use strict';
  const d=document,w=window;
  const desktop=()=>w.matchMedia('(min-width:1101px)').matches;
  const reduce=()=>w.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const nav=()=>d.getElementById('siteNav')?.getBoundingClientRect().height || 78;

  const configs=[
    {root:'#motion-story', shell:'.v29-story-shell', stage:'.v29-story-visual', steps:'[data-v29-step]'},
    {root:'#three-pages', shell:'.v33-pages-body', stage:'.v33-page-stage', steps:'[data-v33-page-step]'},
    {root:'#joiningJourney', shell:'.v33-journey-body', stage:'.v33-journey-stage', steps:'[data-v33-job-stage]'}
  ];

  const items=configs.map(c=>{
    const root=d.querySelector(c.root);
    if(!root)return null;
    const shell=root.querySelector(c.shell);
    const stage=root.querySelector(c.stage);
    const steps=[...root.querySelectorAll(c.steps)];
    if(!shell||!stage||!steps.length)return null;
    shell.style.position='relative';
    return {root,shell,stage,steps,state:''};
  }).filter(Boolean);

  let raf=0;
  function setState(item,state){
    if(item.state===state)return;
    item.state=state;
    item.stage.classList.toggle('v35-pin-active',state==='active');
    item.stage.classList.toggle('v35-pin-docked',state==='docked');
    if(state==='before'){
      item.stage.classList.remove('v35-pin-active','v35-pin-docked');
    }
  }

  function update(){
    raf=0;
    const isDesktop=desktop()&&!reduce();
    const top=nav()+10;
    d.documentElement.style.setProperty('--v35-nav-h',`${nav()}px`);
    for(const item of items){
      if(!isDesktop){setState(item,'before');continue;}
      const first=item.steps[0].getBoundingClientRect();
      const last=item.steps[item.steps.length-1].getBoundingClientRect();
      const shell=item.shell.getBoundingClientRect();

      // Start fixing as soon as the first step reaches the usable viewport.
      // Keep it fixed until the last step is almost completely past.
      const hasStarted=first.top<=top+28;
      const hasEnded=last.bottom<=w.innerHeight-26;
      if(!hasStarted){setState(item,'before');}
      else if(!hasEnded){setState(item,'active');}
      else {setState(item,'docked');}

      // If the whole section is outside the viewport, avoid leaving a fixed stage behind.
      const root=item.root.getBoundingClientRect();
      if(root.bottom<0)setState(item,'docked');
      if(root.top>w.innerHeight)setState(item,'before');
    }
  }
  function queue(){if(!raf)raf=requestAnimationFrame(update)}
  w.addEventListener('scroll',queue,{passive:true});
  w.addEventListener('resize',queue,{passive:true});
  w.addEventListener('orientationchange',queue,{passive:true});
  w.addEventListener('load',()=>{queue();setTimeout(queue,250);setTimeout(queue,900)},{once:true});
  queue();
})();
