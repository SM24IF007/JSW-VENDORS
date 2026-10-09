(() => {
  const host = document.getElementById('threeHero');
  if (!host || !window.THREE || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const coarse = matchMedia('(pointer:coarse)').matches;
  const mobile = innerWidth <= 760 || coarse;
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const saveData = !!conn?.saveData;
  const lowMemory = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4;
  const lowPower = saveData || (mobile && lowMemory);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 100);
  camera.position.set(.15,.9,8.6);

  const renderer = new THREE.WebGLRenderer({
    alpha:true,
    antialias:!mobile && !lowPower,
    powerPreference:'high-performance'
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1 : 1.35));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.xr.enabled = true;
  host.appendChild(renderer.domElement);
  requestAnimationFrame(() => setTimeout(() => host.classList.add('three-ready'), 80));

  const world = new THREE.Group();
  scene.add(world);
  world.rotation.x = -.18;
  world.rotation.y = .14;

  const steel = new THREE.MeshStandardMaterial({color:0x8ea4b5,metalness:.96,roughness:.19});
  const steelDark = new THREE.MeshStandardMaterial({color:0x101b26,metalness:.9,roughness:.28});
  const signalBlue = new THREE.MeshStandardMaterial({color:0x4d9cff,metalness:.9,roughness:.2,emissive:0x061c35,emissiveIntensity:.42});
  const signalRed = new THREE.MeshStandardMaterial({color:0xe44949,metalness:.84,roughness:.24,emissive:0x260606,emissiveIntensity:.28});
  const inner = new THREE.MeshStandardMaterial({color:0x0b0e10,metalness:.76,roughness:.36,side:THREE.DoubleSide});

  const coil = new THREE.Group();
  world.add(coil);
  const layers = lowPower ? 8 : mobile ? 10 : 14;
  const tubularSegments = lowPower ? 56 : mobile ? 84 : 120;
  for (let i=0;i<layers;i++) {
    const radius=2.12-i*.045;
    const mat=i<2?signalBlue:(i%4===0?steelDark:steel);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.105,12,tubularSegments),mat);
    ring.rotation.x=Math.PI/2;
    ring.position.z=(i-(layers-1)/2)*.105;
    coil.add(ring);
  }

  const cylSegments = lowPower ? 32 : mobile ? 48 : 64;
  const core=new THREE.Mesh(new THREE.CylinderGeometry(.62,.62,1.7,cylSegments,1,true),inner);
  core.rotation.x=Math.PI/2;
  coil.add(core);
  const lipGeo = new THREE.TorusGeometry(.635,.055,12,lowPower?40:72);
  const lip1=new THREE.Mesh(lipGeo,signalBlue); lip1.rotation.x=Math.PI/2; lip1.position.z=.86; coil.add(lip1);
  const lip2=lip1.clone(); lip2.position.z=-.86; coil.add(lip2);

  [-.55,0,.55].forEach((a,idx)=>{
    const strap=new THREE.Mesh(new THREE.BoxGeometry(.045,4.25,.095),idx===1?signalRed:steelDark);
    strap.rotation.z=a; strap.position.z=.93; coil.add(strap);
  });

  if (!lowPower) {
    const haloMat=new THREE.MeshBasicMaterial({color:0x4d9cff,transparent:true,opacity:.2});
    const halo1=new THREE.Mesh(new THREE.TorusGeometry(2.7,.015,6,96),haloMat); halo1.rotation.x=Math.PI/2; halo1.position.z=-.8; world.add(halo1);
    const halo2=new THREE.Mesh(new THREE.TorusGeometry(3.2,.009,6,96),new THREE.MeshBasicMaterial({color:0xe44949,transparent:true,opacity:.09})); halo2.rotation.x=Math.PI/2; halo2.position.z=-1.1; world.add(halo2);
    world.userData.halo1=halo1; world.userData.halo2=halo2;
  }

  if (!mobile && !lowPower) {
    const grid=new THREE.GridHelper(18,24,0x1b5a8f,0x101d2b);
    grid.position.y=-2.7; grid.position.z=-1.8; scene.add(grid);
  }

  const particleCount = lowPower ? 0 : mobile ? 70 : 150;
  let dust = null;
  if (particleCount) {
    const pts=[];
    for(let i=0;i<particleCount;i++) pts.push((Math.random()-.5)*15,Math.random()*7-2.4,(Math.random()-.5)*10-2);
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
    dust=new THREE.Points(geo,new THREE.PointsMaterial({color:0xd0d6da,size:mobile?.012:.015,transparent:true,opacity:.28}));
    scene.add(dust);
  }

  scene.add(new THREE.HemisphereLight(0xdceeff,0x07111d,1.1));
  const key=new THREE.DirectionalLight(0xf3f8ff,3.7); key.position.set(3.5,5.5,5); scene.add(key);
  const blueRim=new THREE.PointLight(0x4d9cff,mobile?12:16,18); blueRim.position.set(-4.2,.8,2.4); scene.add(blueRim);
  const redRim=new THREE.PointLight(0xe44949,mobile?4.5:6.5,14); redRim.position.set(4,-.6,-.8); scene.add(redRim);

  let mx=0,my=0,tx=0,ty=0,scroll=scrollY||0;
  let visible=true, tabVisible=!document.hidden, running=true;
  let lastFrame=0, fpsFrames=0, fpsStart=performance.now();
  let xrSession=null, xrActive=false;
  const minFrame = mobile ? 1000/30 : 1000/60;

  if (!mobile && !lowPower) {
    addEventListener('pointermove',e=>{tx=e.clientX/innerWidth-.5;ty=e.clientY/innerHeight-.5},{passive:true});
  }
  addEventListener('scroll',()=>{scroll=scrollY},{passive:true});

  const resize=()=>{
    const r=host.getBoundingClientRect();
    const w=Math.max(1,Math.round(r.width)), h=Math.max(1,Math.round(r.height));
    renderer.setSize(w,h,false);
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize); ro.observe(host); resize();

  if ('IntersectionObserver' in window) {
    const io=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting ?? true;}, {rootMargin:'180px'});
    io.observe(host);
  }
  document.addEventListener('visibilitychange',()=>{tabVisible=!document.hidden;});

  async function supportsXR(mode){
    if (!navigator.xr || !window.isSecureContext) return false;
    try { return await navigator.xr.isSessionSupported(mode); } catch (_) { return false; }
  }

  async function enterXR(mode){
    if (xrSession) return {ok:true, active:true, mode};
    if (!(await supportsXR(mode))) return {ok:false, reason:'unsupported'};
    try {
      xrSession = await navigator.xr.requestSession(mode, {optionalFeatures:['local-floor','bounded-floor']});
      xrActive = true;
      visible = true;
      await renderer.xr.setSession(xrSession);
      xrSession.addEventListener('end',()=>{
        xrSession=null; xrActive=false;
        window.dispatchEvent(new CustomEvent('v29:xrchange',{detail:{active:false}}));
      },{once:true});
      window.dispatchEvent(new CustomEvent('v29:xrchange',{detail:{active:true,mode}}));
      return {ok:true, active:true, mode};
    } catch (err) {
      xrSession=null; xrActive=false;
      return {ok:false, reason:err?.message || 'Unable to start XR session'};
    }
  }

  window.VasindXR = {
    supports: supportsXR,
    enter: enterXR,
    end: async()=>{ if(xrSession) await xrSession.end(); },
    fallback:()=>{ host.classList.add('v29-xr-fallback'); host.scrollIntoView({behavior:'smooth',block:'center'}); setTimeout(()=>host.classList.remove('v29-xr-fallback'),4200); }
  };
  window.dispatchEvent(new CustomEvent('v29:xrready'));

  const clock=new THREE.Clock();
  function frame(now){
    if (!running || (!visible && !xrActive) || !tabVisible) return;
    if (!xrActive && now-lastFrame < minFrame) return;
    lastFrame=now;
    const t=clock.getElapsedTime();
    mx+=(tx-mx)*(mobile?.06:.045); my+=(ty-my)*(mobile?.06:.045);
    const heroProgress=Math.max(0,Math.min(1.15,scroll/Math.max(1,innerHeight)));
    coil.rotation.z=t*(xrActive?.17:(mobile?.075:.115));
    if (xrActive) {
      world.rotation.y=.2+t*.08;
      world.rotation.x=-.12+Math.sin(t*.45)*.06;
      world.position.set(0,.2,-4.6);
      world.scale.setScalar(.58);
    } else {
      world.rotation.y=.14+mx*.28+heroProgress*.22;
      world.rotation.x=-.18-my*.14+heroProgress*.045;
      world.position.y=Math.sin(t*.7)*(mobile?.05:.08)+heroProgress*.08;
      world.position.x=-heroProgress*(mobile?.08:.28);
      world.position.z=0;
      world.scale.setScalar(1+heroProgress*(mobile?.035:.12));
      camera.position.x=mx*.24;
      camera.position.y=.9-my*.12;
      camera.lookAt(0,0,0);
    }
    blueRim.intensity=(mobile?12:16)+(Math.sin(t*1.35)+1)*(mobile?1.2:2.2);
    redRim.intensity=(mobile?4.5:6.5)+(Math.cos(t*1.1)+1)*(mobile?.55:.9);
    if(world.userData.halo1) world.userData.halo1.rotation.z=-t*.025;
    if(world.userData.halo2) world.userData.halo2.rotation.z=t*.018;
    if(dust) dust.rotation.y=t*.006;
    renderer.render(scene,camera);

    fpsFrames++;
    if (now-fpsStart >= 1000) {
      const fps=Math.round(fpsFrames*1000/(now-fpsStart));
      window.dispatchEvent(new CustomEvent('v29:renderfps',{detail:{fps}}));
      fpsFrames=0; fpsStart=now;
    }
  }
  renderer.setAnimationLoop(frame);

  // Release GPU resources cleanly if the page is removed/reloaded by a client router.
  addEventListener('pagehide',()=>{
    running=false;
    renderer.setAnimationLoop(null);
    if (xrSession) { try { xrSession.end(); } catch (_) {} }
    ro.disconnect();
    renderer.dispose();
    scene.traverse(obj=>{
      if(obj.geometry?.dispose) obj.geometry.dispose();
      if(obj.material){
        const mats=Array.isArray(obj.material)?obj.material:[obj.material];
        mats.forEach(m=>m?.dispose?.());
      }
    });
  },{once:true});
})();
