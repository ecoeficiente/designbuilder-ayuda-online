"use strict";
(() => {
  const root = document.body.dataset.root;
  const input = document.querySelector("#search");
  const results = document.querySelector("#search-results");
  const status = document.querySelector("#search-status");
  let indexPromise;
  let revision = 0;
  const tokens = text => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9]+/g) || [];
  input.addEventListener("input", async () => {
    const current = ++revision;
    const words = [...new Set(tokens(input.value))];
    results.replaceChildren();
    results.hidden = !words.length;
    if (!words.length) { status.textContent = ""; return; }
    try {
      if (!indexPromise) indexPromise = fetch(root + "search-index.json").then(response => {
        if (!response.ok) throw new Error("index");
        return response.json();
      }).catch(error => { indexPromise = undefined; throw error; });
      const index = await indexPromise;
      if (current !== revision) return;
      let scores;
      for (const word of words) {
        const matches = new Map();
        for (const [term, postings] of Object.entries(index.postings)) {
          if (term === word || (word.length >= 3 && term.startsWith(word))) {
            for (const [id, score] of postings) matches.set(id, (matches.get(id) || 0) + score);
          }
        }
        scores = scores === undefined ? matches : new Map([...scores].filter(([id]) => matches.has(id)).map(([id, score]) => [id, score + matches.get(id)]));
      }
      const ordered = [...scores].sort((a, b) => b[1] - a[1]);
      status.textContent = `${ordered.length} resultados`;
      for (const [id] of ordered.slice(0, 40)) {
        const doc = index.documents[id];
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = root + doc.path;
        a.textContent = doc.title;
        const note = document.createElement("small");
        note.textContent = doc.status === "pending" ? "Contenido en inglés · traducción pendiente" : doc.status === "fixture" ? "FIXTURE de prueba" : doc.excerpt;
        li.append(a, note);
        results.append(li);
      }
    } catch (_) { status.textContent = "No se ha podido cargar la búsqueda. Vuelve a intentarlo o consulta el índice de contenidos."; }
  });
})();
