(() => {
  const d = document;

  // Custom dark role picker for Windows/Chrome where native <select> popup can render white.
  const native = d.getElementById('roleSelect');
  const picker = d.querySelector('[data-role-picker]');
  if (native && picker) {
    const button = picker.querySelector('#rolePickerButton');
    const label = picker.querySelector('[data-role-picker-label]');
    const menu = picker.querySelector('#rolePickerMenu');
    const closeMenu = () => {
      picker.classList.remove('open');
      button?.setAttribute('aria-expanded', 'false');
      if (menu && menu.parentElement !== picker) picker.appendChild(menu);
      if (menu) { menu.style.display = ''; menu.style.removeProperty('left'); menu.style.removeProperty('top'); menu.style.removeProperty('width'); menu.style.removeProperty('max-height'); }
    };
    const placeMenu = () => {
      if (!menu || !button) return;
      const box = button.getBoundingClientRect();
      const below = window.innerHeight - box.bottom - 12;
      const above = box.top - 12;
      const openAbove = below < 230 && above > below;
      const height = Math.max(120, Math.min(440, openAbove ? above : below));
      menu.style.position = 'fixed';
      menu.style.left = Math.max(8, box.left) + 'px';
      menu.style.width = Math.min(box.width, window.innerWidth - 16) + 'px';
      menu.style.maxHeight = height + 'px';
      menu.style.top = (openAbove ? box.top - height - 7 : box.bottom + 7) + 'px';
      menu.style.display = 'block';
    };

    const sync = () => {
      const selected = native.options[native.selectedIndex];
      if (label) label.textContent = selected?.textContent?.trim() || 'Choose a role';
      menu?.querySelectorAll('[data-role-value]').forEach(item => {
        item.classList.toggle('active', item.dataset.roleValue === native.value);
        item.setAttribute('aria-selected', String(item.dataset.roleValue === native.value));
      });
    };

    if (menu) {
      [...native.children].forEach(child => {
        if (child.tagName === 'OPTGROUP') {
          const heading = d.createElement('div');
          heading.className = 'v18-role-group-label';
          heading.textContent = child.label;
          menu.appendChild(heading);
          [...child.children].forEach(opt => {
            const item = d.createElement('button');
            item.type = 'button';
            item.className = 'v18-role-option';
            item.dataset.roleValue = opt.value;
            item.setAttribute('role', 'option');
            item.textContent = opt.textContent;
            item.addEventListener('click', () => {
              native.value = opt.value;
              native.dispatchEvent(new Event('change', { bubbles: true }));
              closeMenu();
              button?.focus();
            });
            menu.appendChild(item);
          });
        } else if (child.tagName === 'OPTION') {
          const item = d.createElement('button');
          item.type = 'button';
          item.className = 'v18-role-option';
          item.dataset.roleValue = child.value;
          item.setAttribute('role', 'option');
          item.textContent = child.textContent;
          item.addEventListener('click', () => {
            native.value = child.value;
            native.dispatchEvent(new Event('change', { bubbles: true }));
            closeMenu();
          });
          menu.appendChild(item);
        }
      });
    }

    button?.addEventListener('click', () => {
      const open = !picker.classList.contains('open');
      if (!open) { closeMenu(); return; }
      picker.classList.add('open');
      button.setAttribute('aria-expanded', 'true');
      document.body.appendChild(menu);
      placeMenu();
      menu?.querySelector('.v18-role-option.active')?.scrollIntoView({ block:'nearest', inline:'nearest' });
    });
    window.addEventListener('resize', () => { if (picker.classList.contains('open')) placeMenu(); });
    window.addEventListener('scroll', () => { if (picker.classList.contains('open')) placeMenu(); }, { passive:true });
    native.addEventListener('change', sync);
    d.addEventListener('click', e => {
      if (!picker.contains(e.target) && !menu.contains(e.target)) closeMenu();
    });
    d.addEventListener('keydown', e => {
      if (e.key === 'Escape' && picker.classList.contains('open')) {
        closeMenu();
        button?.focus();
      }
    });
    sync();
  }

  // Keep filled candidate-processing controls visually dark and distinct.
  if (d.body.classList.contains('process-v11')) {
    const controls = [...d.querySelectorAll('.input-dark')];
    const updateFilled = el => {
      const hasValue = String(el.value ?? '').trim().length > 0;
      el.classList.toggle('is-filled', hasValue);
    };
    controls.forEach(el => {
      updateFilled(el);
      el.addEventListener('input', () => updateFilled(el));
      el.addEventListener('change', () => updateFilled(el));
    });
  }
})();
