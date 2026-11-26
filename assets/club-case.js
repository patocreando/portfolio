/* Club del Cóctel — accessible 4-stage interactive project integrated with UnifiedPlayer. */
(function () {
  "use strict";
  var root = document.querySelector("[data-club-viewer]");
  if (!root) return;

  var tabs = Array.prototype.slice.call(root.querySelectorAll("[data-club-step]"));
  var stage = root.querySelector(".club-workflow-screen");
  var slot = root.querySelector("[data-club-slot]");
  var proposal = root.querySelector("[data-club-proposal]");
  var edit = root.querySelector("[data-club-edit]");
  var description = root.querySelector("[data-club-description]");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var intervalMs = 6500;
  var autoEnabled = false;
  var autoButton = root.querySelector("[data-club-auto]");
  var timer = null;
  var isInView = true;
  if (!tabs.length || !stage || !proposal || !edit || !slot || !description) return;

  function clearTimer() {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
  }

  function shouldPauseRotation() {
    var active = window.UnifiedPlayer && window.UnifiedPlayer.getActiveVideo();
    var playingClub = active && slot.contains(active) && !active.paused;
    return !autoEnabled || (dialog && dialog.open) || reducedMotion.matches || document.hidden || !isInView || root.matches(":hover") || root.contains(document.activeElement) || playingClub;
  }

  function scheduleRotation() {
    clearTimer();
    var paused = shouldPauseRotation();
    root.classList.toggle("is-auto-paused", paused);
    if (paused || tabs.length < 2) return;
    var activeTab = tabs.find(function (tab) { return tab.classList.contains("is-active"); });
    if (activeTab) {
      activeTab.classList.remove("is-counting");
      void activeTab.offsetWidth;
      activeTab.classList.add("is-counting");
    }
    timer = window.setTimeout(function () {
      var current = tabs.findIndex(function (tab) { return tab.classList.contains("is-active"); });
      var next = tabs[(current + 1 + tabs.length) % tabs.length];
      selectStage(next, false, false);
    }, intervalMs);
  }

  function stopStageVideo() {
    if (window.UnifiedPlayer) {
      window.UnifiedPlayer.stopSlot(slot);
    }
  }

  function animateStage() {
    stage.classList.remove("is-entering");
    window.requestAnimationFrame(function () {
      stage.classList.add("is-entering");
    });
  }

  function selectStage(tab, focus, isInitialRender) {
    clearTimer();
    stopStageVideo();
    tabs.forEach(function (item) {
      var active = item === tab;
      item.classList.remove("is-counting");
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
    });

    var kind = tab.dataset.kind;
    var selectedIndex = tabs.indexOf(tab);
    root.dataset.stage = kind;
    stage.setAttribute("aria-labelledby", tab.id);
    root.querySelector("[data-club-stage-title]").textContent = "0" + (selectedIndex + 1) + " / " + tab.querySelector("strong").textContent;
    var insights = [
      ["Definir antes de generar.", "El personaje, su vestuario y la cocina funcionan como referencia común para construir las escenas."],
      ["Dar movimiento a la identidad.", "La generación parte de las anclas visuales para sostener al personaje y su entorno entre tomas."],
      ["Construir el ritmo.", "Selección de planos y mezcla de voz para unir las escenas. Esta vista es un esquema ilustrativo del montaje."],
      ["Ver la pieza completa.", "El resultado reúne las etapas anteriores en un reel vertical de 33,8 segundos, con el audio original preservado."]
    ];
    root.querySelector("[data-club-insight-title]").textContent = insights[selectedIndex][0];
    root.querySelector("[data-club-insight-copy]").textContent = insights[selectedIndex][1];
    description.textContent = tab.dataset.description || "";

    if (kind === "video") {
      proposal.hidden = true;
      edit.hidden = true;
      slot.hidden = false;
      var stageName = tab.dataset.alt || (tab.querySelector(".club-workflow-step-copy strong") || {}).textContent || "Video";
      slot.setAttribute("data-src", tab.dataset.src || "");
      slot.setAttribute("data-video-label", stageName);
      slot.setAttribute("data-video-meta", selectedIndex === 3 ? "9:16 · 0:34 · Audio original" : "9:16 · Escena generada");
      var btnStrong = slot.querySelector(".up-play-copy strong");
      var btnSmall = slot.querySelector(".up-play-copy small");
      if (btnStrong) btnStrong.textContent = stageName;
      if (btnSmall) btnSmall.textContent = slot.getAttribute("data-video-meta");
      if (window.UnifiedPlayer) {
        window.UnifiedPlayer.bindSlot(slot);
        if (!isInitialRender) window.UnifiedPlayer.playSlot(slot);
      }
    } else if (kind === "edit") {
      slot.hidden = true;
      proposal.hidden = true;
      edit.hidden = false;
    } else {
      slot.hidden = true;
      proposal.hidden = false;
      edit.hidden = true;
    }
    animateStage();
    if (focus) tab.focus();
    scheduleRotation();
  }

  tabs.forEach(function (tab, index) {
    tab.id = "club-tab-" + index;
    tab.addEventListener("click", function () { selectStage(tab, false, false); });
    tab.addEventListener("keydown", function (event) {
      var next = null;
      if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (index + 1) % tabs.length;
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      if (next === null) return;
      event.preventDefault();
      selectStage(tabs[next], true, false);
    });
  });

  root.addEventListener("pointerenter", function (event) {
    if (event.pointerType !== "mouse") return;
    clearTimer();
    root.classList.add("is-auto-paused");
  });
  root.addEventListener("pointerleave", function (event) { if (event.pointerType === "mouse") scheduleRotation(); });
  root.addEventListener("focusin", function () { clearTimer(); root.classList.add("is-auto-paused"); });
  root.addEventListener("focusout", function () { window.setTimeout(scheduleRotation, 0); });
  document.addEventListener("visibilitychange", scheduleRotation);
  if (typeof reducedMotion.addEventListener === "function") reducedMotion.addEventListener("change", scheduleRotation);

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      isInView = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.2;
      scheduleRotation();
    }, { threshold: [0, 0.2, 0.5] });
    observer.observe(root);
  }

  autoButton.addEventListener("click", function () {
    autoEnabled = !autoEnabled;
    autoButton.setAttribute("aria-pressed", String(autoEnabled));
    autoButton.textContent = autoEnabled ? "Detener recorrido" : "Recorrido automático";
    scheduleRotation();
  });

  var dialog = document.querySelector(".club-reference-dialog");
  root.querySelectorAll("[data-club-enlarge]").forEach(function (button) {
    button.addEventListener("click", function () {
      var image = button.querySelector("img");
      dialog.querySelector("img").src = image.src;
      dialog.querySelector("img").alt = image.alt;
      dialog.querySelector("p").textContent = image.alt;
      dialog.showModal();
      clearTimer();
    });
  });
  dialog.querySelector("[data-club-close]").addEventListener("click", function () { dialog.close(); });
  dialog.addEventListener("click", function (event) { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener("close", scheduleRotation);

  var initial = tabs.find(function (tab) { return tab.getAttribute("aria-selected") === "true"; }) || tabs[0];
  selectStage(initial, false, true);
})();
