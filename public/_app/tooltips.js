// Reviewed image coordinates only. No OCR or network requests in the browser.
(() => {
  let sequence = 0;
  function button(text, action) {
    const node = document.createElement('button');
    node.type = 'button'; node.textContent = text;
    node.addEventListener('click', action);
    return node;
  }
  function annotations(image, data, host) {
    const layer = document.createElement('span');
    layer.className = 'annotation-layer';
    const tip = document.createElement('div');
    tip.className = 'annotation-tooltip'; tip.hidden = true;
    tip.id = `annotation-tip-${++sequence}`;
    tip.setAttribute('role', 'tooltip'); tip.lang = 'es';
    host.append(tip);
    let current = null, timer, dismissed = false;
    const hide = () => {
      clearTimeout(timer); tip.hidden = true;
      current?.removeAttribute('aria-describedby'); current = null;
    };
    const later = () => { clearTimeout(timer); timer = setTimeout(hide, 180); };
    tip.addEventListener('pointerenter', () => clearTimeout(timer));
    tip.addEventListener('pointerleave', later);
    for (const region of data.regions) {
      const pair = data.annotations[region.annotation];
      const zone = button('', () => show());
      zone.className = 'annotation-zone';
      zone.setAttribute('aria-label', pair.source);
      zone.lang = 'en';
      const [x, y, right, bottom] = region.box;
      Object.assign(zone.style, {left: `${100*x/data.width}%`, top: `${100*y/data.height}%`,
        width: `${100*(right-x)/data.width}%`, height: `${100*(bottom-y)/data.height}%`});
      function show() {
        dismissed = false;
        hide(); current = zone; tip.textContent = pair.target;
        zone.setAttribute('aria-describedby', tip.id); tip.hidden = false;
        const rect = zone.getBoundingClientRect();
        const bounds = tip.getBoundingClientRect();
        tip.style.left = `${Math.max(8, Math.min(rect.left, innerWidth-bounds.width-8))}px`;
        tip.style.top = `${Math.max(8, Math.min(rect.bottom+8,
          innerHeight-bounds.height-8))}px`;
      }
      zone.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') show(); });
      zone.addEventListener('pointerleave', later);
      zone.addEventListener('focus', show);
      zone.addEventListener('blur', later);
      layer.append(zone);
    }
    const stage = document.createElement('span'); stage.className = 'annotation-stage';
    image.before(stage); stage.append(image, layer);
    const resize = new ResizeObserver(() => {
      layer.style.width = `${image.clientWidth}px`; layer.style.height = `${image.clientHeight}px`;
      layer.style.left = `${image.offsetLeft}px`; layer.style.top = `${image.offsetTop}px`;
      hide();
      if (!dismissed && layer.contains(document.activeElement)) document.activeElement.dispatchEvent(new Event('focus'));
    });
    resize.observe(image);
    const escape = event => {
      if (event.key === 'Escape' && !tip.hidden) {
        event.preventDefault(); event.stopImmediatePropagation(); dismissed = true; hide();
      }
    };
    const outside = event => { if (!layer.contains(event.target) && !tip.contains(event.target)) hide(); };
    const scroll = () => {
      const hovered = layer.querySelector('.annotation-zone:hover');
      if (!dismissed && hovered) hovered.dispatchEvent(new PointerEvent('pointerenter', {pointerType: 'mouse'}));
      else hide();
    };
    document.addEventListener('keydown', escape, true);
    document.addEventListener('pointerdown', outside);
    window.addEventListener('scroll', scroll, true);
    return {layer, hide, destroy() {
      resize.disconnect(); document.removeEventListener('keydown', escape, true);
      document.removeEventListener('pointerdown', outside); window.removeEventListener('scroll', scroll, true);
      tip.remove();
    }};
  }
  function list(data) {
    const details = document.createElement('details'); details.className = 'annotation-list';
    const summary = document.createElement('summary'); summary.textContent = 'Ver todas las traducciones';
    const dl = document.createElement('dl');
    for (const pair of data.annotations) {
      const dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = pair.source; dt.lang = 'en'; dd.textContent = pair.target; dd.lang = 'es';
      dl.append(dt, dd);
    }
    details.append(summary, dl); return details;
  }
  for (const image of document.querySelectorAll('article img[data-image-tooltips]')) {
    const data = JSON.parse(image.dataset.imageTooltips);
    const hintText = 'Pasa el cursor o toca una anotación para ver su traducción';
    const link = image.closest('a');
    function expand() {
      const opener = document.activeElement;
      const dialog = document.createElement('dialog');
      dialog.className = 'image-viewer annotation-viewer'; dialog.setAttribute('aria-label', 'Imagen ampliada');
      const toolbar = document.createElement('div'); toolbar.className = 'image-viewer-tools';
      const viewport = document.createElement('div'); viewport.className = 'annotation-viewport';
      const full = document.createElement('img'); full.src = image.dataset.imageOriginal || image.src;
      full.alt = image.alt; viewport.append(full);
      const hint = document.createElement('p'); hint.className = 'annotation-hint'; hint.textContent = hintText;
      const details = list(data);
      const original = document.createElement('a'); original.href = full.src;
      original.textContent = 'Abrir imagen original'; original.target = '_blank'; original.rel = 'noopener';
      const close = button('Cerrar ×', () => dialog.close()); close.autofocus = true;
      dialog.append(toolbar, viewport, hint, details); document.body.append(dialog);
      const overlay = annotations(full, data, dialog);
      const toggle = button('Ocultar traducciones', () => {
        overlay.layer.hidden = !overlay.layer.hidden; overlay.hide();
        hint.hidden = details.hidden = overlay.layer.hidden;
        toggle.textContent = overlay.layer.hidden ? 'Mostrar traducciones' : 'Ocultar traducciones';
        toggle.setAttribute('aria-pressed', String(overlay.layer.hidden));
      });
      const size = button('Tamaño original', () => {
        const native = viewport.classList.toggle('native-size');
        size.textContent = native ? 'Ajustar a ventana' : 'Tamaño original'; overlay.hide();
      });
      toolbar.append(original, toggle, size, close);
      dialog.addEventListener('close', () => { overlay.destroy(); dialog.remove(); opener?.focus(); });
      dialog.showModal();
    }
    image.addEventListener('image-expand', expand);
    // Existing thumbnail links remain owned by images.js. Never nest controls in links.
    if (link) continue;
    const controls = document.createElement('span'); controls.className = 'annotation-controls';
    image.after(controls);
    const enlarge = button('Ampliar para ver traducciones', expand);
    const hint = document.createElement('span'); hint.textContent = hintText; hint.className = 'annotation-hint';
    const details = list(data); controls.append(enlarge, hint, details);
    const overlay = annotations(image, data, document.body);
    const update = () => {
      const legible = image.naturalWidth === data.width && image.naturalHeight === data.height &&
        data.regions.every(r => r.line_height * image.clientWidth / data.width >= 12);
      overlay.layer.hidden = !legible; hint.hidden = details.hidden = !legible;
      enlarge.textContent = legible ? 'Ampliar imagen' : 'Ampliar para ver traducciones';
    };
    new ResizeObserver(update).observe(image); image.addEventListener('load', update); update();
  }
})();
