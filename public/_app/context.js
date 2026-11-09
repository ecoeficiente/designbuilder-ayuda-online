(() => {
  const status = document.getElementById('context-status');
  const resolve = async () => {
    if (!location.hash.startsWith('#cshid=')) {
      status.hidden = true;
      return;
    }
    const id = location.hash.slice(7);
    try {
      const response = await fetch('aliases.json');
      if (!response.ok) throw new Error('map unavailable');
      const aliases = await response.json();
      if (location.hash !== '#cshid=' + id) return;
      if (!Object.hasOwn(aliases, id)) throw new Error('unknown ID');
      location.replace(new URL(aliases[id], location.href).href);
    } catch (_) {
      if (location.hash !== '#cshid=' + id) return;
      status.hidden = false;
      status.textContent = `No se ha encontrado el identificador de ayuda contextual: ${id}.`;
    }
  };
  window.addEventListener('hashchange', resolve);
  resolve();
})();
