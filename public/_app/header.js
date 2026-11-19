"use strict";
(() => {
  const menu = document.querySelector(".resource-menu");
  const toggle = menu.querySelector("summary");

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && menu.open && menu.contains(document.activeElement)) {
      menu.open = false;
      toggle.focus();
    }
  });

  document.addEventListener("click", event => {
    if (menu.open && !menu.contains(event.target)) menu.open = false;
  });

  window.matchMedia("(max-width: 700px)").addEventListener("change", () => {
    menu.open = false;
  });
})();
