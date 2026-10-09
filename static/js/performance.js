(() => {
  const d = document;
  const root = d.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer:coarse)').matches;
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const saveData = !!conn?.saveData;
  const slowNetwork = /(^|-)2g$/.test(conn?.effectiveType || '');
  const lowMemory = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4;
  const lowPower = reduced || saveData || slowNetwork || (coarse && lowMemory);
  if (lowPower) root.classList.add('low-power');

  // Non-blocking loader: disappear after the first useful paint, never wait on WebGL.
  const loader = d.getElementById('storyLoader');
  const finishLoader = () => {
    if (!loader) return;
    requestAnimationFrame(() => {
      loader.classList.add('loaded');
      setTimeout(() => loader.remove(), 220);
    });
  };
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', finishLoader, {once:true});
  else finishLoader();



  // Load WebGL after the document becomes interactive. Slow/save-data devices keep the lightweight fallback.
  const threeHost = d.getElementById('threeHero');
  if (threeHost && !lowPower && !reduced) {
    const loadScript = src => new Promise((resolve,reject) => {
      const script=d.createElement('script');
      script.src=src;
      script.async=true;
      script.onload=resolve;
      script.onerror=reject;
      d.head.appendChild(script);
    });
    const start3D = async () => {
      try {
        if (!window.THREE) await loadScript(threeHost.dataset.threeLib);
        await loadScript(threeHost.dataset.threeApp);
      } catch {
        d.documentElement.classList.add('no-webgl-story');
      }
    };
    if ('requestIdleCallback' in window) requestIdleCallback(start3D,{timeout:550});
    else setTimeout(start3D,120);
  }

  // Pause non-essential looping media/animation work in a background tab.
  d.addEventListener('visibilitychange', () => {
    d.body.classList.toggle('page-hidden', d.hidden);
    if (window.gsap?.globalTimeline) d.hidden ? gsap.globalTimeline.pause() : gsap.globalTimeline.resume();
  });

  // Add descriptive labels to icon-only controls when templates omit them.
  d.querySelectorAll('button').forEach(btn => {
    if (!btn.getAttribute('aria-label') && !btn.textContent.trim()) btn.setAttribute('aria-label','Action');
  });

  // External links opened in a new tab should be isolated.
  d.querySelectorAll('a[target="_blank"]').forEach(a => a.setAttribute('rel','noopener noreferrer'));
})();
