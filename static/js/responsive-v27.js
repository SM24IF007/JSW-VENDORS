(()=>{
  'use strict';
  const d=document;
  const nav=d.querySelector('.story-main-nav,.site-nav');
  if(!nav) return;
  const inner=nav.querySelector('.story-nav-inner,.v10-nav-inner,.nav-inner');
  const source=nav.querySelector('.story-main-links,.v10-main-links');
  if(!inner||!source||inner.querySelector('.v27-mobile-menu-btn')) return;

  const button=d.createElement('button');
  button.type='button';
  button.className='v27-mobile-menu-btn';
  button.setAttribute('aria-label','Open navigation menu');
  button.setAttribute('aria-expanded','false');
  button.innerHTML='<span></span>';

  const panel=d.createElement('nav');
  panel.className='v27-mobile-panel';
  panel.setAttribute('aria-label','Mobile navigation');
  [...source.querySelectorAll('a')].forEach(a=>panel.appendChild(a.cloneNode(true)));

  const actions=inner.querySelector('.story-main-actions,.v10-nav-actions,.nav-actions');
  // Primary actions must remain reachable when the header has no room for them.
  if(actions){
    [...actions.querySelectorAll('a[href]')].forEach(a=>{
      if(![...panel.querySelectorAll('a[href]')].some(existing=>existing.getAttribute('href')===a.getAttribute('href'))){
        const link=a.cloneNode(true);
        link.classList.add('v27-panel-action');
        panel.appendChild(link);
      }
    });
    const existingLang=actions.querySelector('[data-lang]');
    if(existingLang){
      const languages=d.createElement('div');
      languages.className='v27-mobile-languages';
      languages.setAttribute('aria-label','Language');
      [['en','EN'],['hi','हिं'],['mr','मर']].forEach(([code,label])=>{
        const choice=d.createElement('button');
        choice.type='button'; choice.textContent=label; choice.setAttribute('aria-label',`Switch to ${code}`);
        choice.addEventListener('click',()=>{
          actions.querySelector(`[data-lang="${code}"]`)?.click();
          languages.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===choice));
        });
        languages.appendChild(choice);
      });
      panel.appendChild(languages);
    }
  }
  if(actions) inner.insertBefore(button,actions); else inner.appendChild(button);
  inner.appendChild(panel);

  const close=()=>{button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Open navigation menu');panel.classList.remove('is-open')};
  const toggle=()=>{const open=button.getAttribute('aria-expanded')==='true';if(open){close()}else{button.setAttribute('aria-expanded','true');button.setAttribute('aria-label','Close navigation menu');panel.classList.add('is-open')}};
  button.addEventListener('click',toggle);
  panel.addEventListener('click',e=>{if(e.target.closest('a')) close()});
  d.addEventListener('click',e=>{if(!inner.contains(e.target)) close()});
  d.addEventListener('keydown',e=>{if(e.key==='Escape') close()});
  matchMedia('(min-width:1181px)').addEventListener?.('change',e=>{if(e.matches) close()});
})();
