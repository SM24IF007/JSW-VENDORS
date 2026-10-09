(() => {
  const surface = document.getElementById('processZoomSurface');
  const output = document.getElementById('processZoomValue');
  if (!surface || !output) return;
  let level = 100;
  const update = () => {
    surface.style.zoom = `${level}%`;
    output.value = `${level}%`;
    output.textContent = `${level}%`;
  };
  document.querySelectorAll('[data-process-zoom]').forEach(button => {
    button.addEventListener('click', () => {
      const action = button.dataset.processZoom;
      level = action === 'reset' ? 100 : Math.max(75, Math.min(150, level + (action === 'in' ? 10 : -10)));
      update();
    });
  });
})();
