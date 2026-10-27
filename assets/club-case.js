/* Club del Cóctel — accessible stepper with one media stage at a time. */
(function () {
  "use strict";
  var root = document.querySelector("[data-club-viewer]");
  if (!root) return;

  var tabs = Array.prototype.slice.call(root.querySelectorAll("[data-club-step]"));
  var video = root.querySelector("[data-club-video]");
  var proposal = root.querySelector("[data-club-proposal]");
  var edit = root.querySelector("[data-club-edit]");
  var kicker = root.querySelector("[data-club-kicker]");
  var title = root.querySelector("[data-club-title]");
  var description = root.querySelector("[data-club-description]");
  if (!tabs.length || !proposal || !edit || !video || !kicker || !title || !description) return;

  video.dataset.userPaused = "true";
  function stopStageVideo() {
    video.pause();
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.setAttribute("muted", "");
    video.dataset.userUnmuted = "false";
    video.dataset.userPaused = "true";
    if (window.__PATO_SOUND_ACTIVE_VIDEO__ === video) window.__PATO_SOUND_ACTIVE_VIDEO__ = null;
  }

  function selectStage(tab, focus) {
    if (window.__PATO_STOP_ACTIVE_VIDEO__) window.__PATO_STOP_ACTIVE_VIDEO__(video);
    stopStageVideo();
    tabs.forEach(function (item) {
      var active = item === tab;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
    });

    var kind = tab.dataset.kind;
    var isVideo = kind === "video";
    kicker.textContent = tab.dataset.kicker || "";
    title.textContent = tab.dataset.title || "";
    description.textContent = tab.dataset.description || "";
    if (isVideo) {
      proposal.hidden = true;
      edit.hidden = true;
      video.hidden = false;
      video.setAttribute("aria-label", (tab.dataset.alt || tab.dataset.title || "Video") + ". Toca o presiona Enter para escuchar el audio original; vuelve a tocar para pausar.");
      var nextSrc = tab.dataset.src || "";
      if (video.getAttribute("src") !== nextSrc) {
        video.setAttribute("src", nextSrc);
        video.load();
      }
      try { video.currentTime = 0; } catch (error) {}
      video.dataset.userPaused = "false";
      video.muted = true;
      video.defaultMuted = true;
      video.volume = 0;
      video.setAttribute("muted", "");
      var attempt = video.play();
      if (attempt && typeof attempt.catch === "function") attempt.catch(function () {});
    } else if (kind === "edit") {
      video.hidden = true;
      proposal.hidden = true;
      edit.hidden = false;
    } else {
      video.hidden = true;
      proposal.hidden = false;
      edit.hidden = true;
    }
    if (focus) tab.focus();
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener("click", function () { selectStage(tab, false); });
    tab.addEventListener("keydown", function (event) {
      var next = null;
      if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (index + 1) % tabs.length;
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      if (next === null) return;
      event.preventDefault();
      selectStage(tabs[next], true);
    });
  });

  var initial = tabs.find(function (tab) { return tab.getAttribute("aria-selected") === "true"; }) || tabs[0];
  selectStage(initial, false);
})();
