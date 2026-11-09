// Progressive enhancement: retain original full-image links without JavaScript.
(() => {
  const links = [...document.querySelectorAll('article a[href]')].filter(link => {
    const image = link.querySelector('img');
    const url = new URL(link.href, location.href);
    return image && url.origin === location.origin &&
      /\.(png|jpe?g|gif|webp|avif|svg|bmp)$/i.test(url.pathname);
  });
  if (!links.length) return;

  const preview = document.createElement('div');
  preview.className = 'image-preview';
  preview.hidden = true;
  // The thumbnail already supplies alternative text; this is a visual duplicate.
  preview.setAttribute('aria-hidden', 'true');
  const previewImage = document.createElement('img');
  const hint = document.createElement('span');
  hint.textContent = 'Haz clic en la miniatura para ampliar · Esc para cerrar';
  preview.append(previewImage, hint);
  document.body.append(preview);

  const dialog = document.createElement('dialog');
  dialog.className = 'image-viewer';
  dialog.setAttribute('aria-label', 'Imagen ampliada');
  const toolbar = document.createElement('div');
  toolbar.className = 'image-viewer-tools';
  const original = document.createElement('a');
  original.textContent = 'Abrir imagen original';
  original.target = '_blank';
  original.rel = 'noopener';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Cerrar ×';
  close.autofocus = true;
  const fullImage = document.createElement('img');
  const legend = document.createElement('section');
  legend.className = 'image-translation-legend';
  legend.setAttribute('aria-label', 'Traducción de las anotaciones');
  legend.hidden = true;
  const compare = document.createElement('button');
  compare.type = 'button';
  compare.hidden = true;
  toolbar.append(original, compare, close);
  dialog.append(toolbar, fullImage, legend);
  document.body.append(dialog);

  let active = null;
  let opener = null;
  let timer;
  let suppressFocus = false;
  const cancelHide = () => clearTimeout(timer);
  function hide() {
    cancelHide();
    active = null;
    preview.hidden = true;
  }
  function delayedHide() {
    cancelHide();
    timer = setTimeout(hide, 180);
  }
  function position() {
    if (!active || !previewImage.naturalWidth) return;
    const rect = active.getBoundingClientRect();
    const margin = 16;
    const gap = 12;
    // Choose the largest free side instead of covering the hovered thumbnail.
    const spaces = [
      {side: 'right', width: innerWidth - rect.right - gap - margin, height: innerHeight - 2 * margin},
      {side: 'left', width: rect.left - gap - margin, height: innerHeight - 2 * margin},
      {side: 'below', width: innerWidth - 2 * margin, height: innerHeight - rect.bottom - gap - margin},
      {side: 'above', width: innerWidth - 2 * margin, height: rect.top - gap - margin},
    ].filter(space => space.width >= 280 && space.height >= 100);
    if (!spaces.length) return hide(); // Click/Enter still opens the full viewer.
    for (const space of spaces) {
      space.scale = Math.min(1, (space.width - 24) / previewImage.naturalWidth,
        (Math.min(space.height, innerHeight * 0.7) - 60) / previewImage.naturalHeight);
    }
    const best = spaces.sort((a, b) => b.scale - a.scale)[0];
    const scale = best.scale;
    const width = previewImage.naturalWidth * scale;
    const height = previewImage.naturalHeight * scale;
    previewImage.style.width = `${width}px`;
    previewImage.style.height = `${height}px`;
    const outerWidth = Math.max(Math.min(280, innerWidth - 2 * margin), width + 24);
    preview.style.width = `${outerWidth}px`;
    let left = Math.max(margin, Math.min(rect.left, innerWidth - outerWidth - margin));
    let top = Math.max(margin, Math.min(rect.top, innerHeight - height - 60 - margin));
    if (best.side === 'right') left = rect.right + gap;
    if (best.side === 'left') left = rect.left - gap - outerWidth;
    if (best.side === 'below') top = rect.bottom + gap;
    if (best.side === 'above') top = rect.top - gap - height - 60;
    preview.style.left = `${left}px`;
    preview.style.top = `${top}px`;
    preview.hidden = false;
  }
  function show(link) {
    if (dialog.open || suppressFocus) return;
    cancelHide();
    active = link;
    preview.hidden = true;
    previewImage.alt = link.querySelector('img').alt;
    previewImage.src = link.href;
    if (previewImage.complete) position();
  }
  previewImage.addEventListener('load', position);
  previewImage.addEventListener('error', hide);
  function expand(link) {
    if (link.querySelector('img').dataset.imageTooltips) {
      hide();
      link.querySelector('img').dispatchEvent(new CustomEvent('image-expand'));
      return;
    }
    hide();
    opener = link;
    fullImage.src = link.href;
    fullImage.alt = link.querySelector('img').alt;
    original.href = link.querySelector('img').dataset.imageOriginal || link.href;
    compare.hidden = !link.querySelector('img').dataset.imageOriginal;
    compare.textContent = 'Ver original inglés';
    compare.setAttribute('aria-pressed', 'false');
    legend.replaceChildren();
    const annotations = JSON.parse(link.querySelector('img').dataset.imageAnnotations || '[]');
    legend.hidden = !annotations.length;
    if (annotations.length) {
      const title = document.createElement('p');
      title.textContent = 'Anotaciones en español · imagen original conservada';
      legend.append(title);
      const list = document.createElement('dl');
      for (const pair of annotations) {
        const source = document.createElement('dt');
        source.textContent = pair.source;
        source.lang = 'en';
        const target = document.createElement('dd');
        target.textContent = pair.target;
        target.lang = 'es';
        list.append(source, target);
      }
      legend.append(list);
    }
    dialog.showModal();
  }
  compare.addEventListener('click', () => {
    const showingOriginal = compare.getAttribute('aria-pressed') === 'true';
    fullImage.src = showingOriginal ? opener.href : original.href;
    compare.setAttribute('aria-pressed', String(!showingOriginal));
    compare.textContent = showingOriginal ? 'Ver original inglés' : 'Ver traducción española';
    legend.hidden = !showingOriginal || !legend.children.length;
  });
  for (const link of links) {
    link.classList.add('image-zoom-link');
    link.setAttribute('aria-haspopup', 'dialog');
    link.title = 'Ampliar imagen: pasa el cursor o pulsa para abrir';
    link.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') show(link);
    });
    link.addEventListener('pointerleave', delayedHide);
    link.addEventListener('focus', () => show(link));
    link.addEventListener('blur', delayedHide);
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      if (typeof dialog.showModal !== 'function') return;
      event.preventDefault();
      expand(link);
    });
  }
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    suppressFocus = true;
    hide();
    opener?.focus({preventScroll: true});
    setTimeout(() => { suppressFocus = false; }, 0);
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
  window.addEventListener('resize', hide);
  window.addEventListener('scroll', () => {
    // A scroll-into-view can finish just after pointerenter. Keep the preview
    // anchored when the pointer is still over its thumbnail.
    if (active?.matches(':hover')) position();
    else hide();
  }, true);
})();
