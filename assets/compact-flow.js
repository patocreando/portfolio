/* Compact flow navigator. Three native buttons and panels; no dependencies. */
(function () {
  "use strict";
  var root = document.querySelector("#system .pc-flow");
  if (!root) return;

  var tabs = Array.prototype.slice.call(root.querySelectorAll("[data-pc-flow-tab]"));
  var panels = Array.prototype.slice.call(root.querySelectorAll("[data-pc-flow-panel]"));
  var index = root.querySelector("[data-pc-flow-visual-index]");
  var marks = root.querySelectorAll(".pc-flow-visual-meter span");
  if (tabs.length !== 3 || panels.length !== 3) return;

  function activate(next, moveFocus) {
    if (next < 0 || next >= tabs.length) return;
    tabs.forEach(function (tab, i) {
      var chosen = i === next;
      tab.classList.toggle("is-active", chosen);
      tab.setAttribute("aria-selected", String(chosen));
      tab.tabIndex = chosen ? 0 : -1;
      panels[i].hidden = !chosen;
      if (marks[i]) marks[i].classList.toggle("is-current", chosen);
    });
    if (index) index.textContent = "0" + (next + 1) + " / 03";
    if (moveFocus) tabs[next].focus();
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { activate(i, false); });
    tab.addEventListener("keydown", function (event) {
      var next = i;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (i + 1) % tabs.length;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (i - 1 + tabs.length) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else return;
      event.preventDefault();
      activate(next, true);
    });
  });

  activate(0, false);
})();
