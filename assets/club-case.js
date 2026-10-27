/* Club del Cóctel — accessible auto-rotating project stages. */
(function () {
  "use strict";
  var root = document.querySelector("[data-club-viewer]");
  if (!root) return;

  var tabs = Array.prototype.slice.call(root.querySelectorAll("[data-club-step]"));
  var stage = root.querySelector(".club-workflow-screen");
  var video = root.querySelector("[data-club-video]");
  var proposal = root.querySelector("[data-club-proposal]");
  var edit = root.querySelector("[data-club-edit]");
  var audioButton = root.querySelector("[data-club-audio]");
  var audioLabel = root.querySelector("[data-club-audio-label]");
  var description = root.querySelector("[data-club-description]");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var intervalMs = 6500;
  var timer = null;
  var isInView = true;
  if (!tabs.length || !stage || !proposal || !edit || !video || !audioButton || !audioLabel || !description) return;

  video.dataset.userPaused = "true";

  function clearTimer() {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
  }

  function audioIsActive() {
    return window.__PATO_SOUND_ACTIVE_VIDEO__ === video && !video.muted && !video.paused;
  }

  function shouldPauseRotation() {
    return reducedMotion.matches || document.hidden || !isInView || root.matches(":hover") || root.contains(document.activeElement) || audioIsActive();
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
      selectStage(next, false);
    }, intervalMs);
  }

  function resetAudioPrompt() {
    audioButton.hidden = true;
    audioButton.setAttribute("aria-pressed", "false");
    audioLabel.textContent = "Escuchar audio";
    root.classList.remove("is-audio-active");
  }

  function syncAudioPrompt() {
    var active = audioIsActive();
    audioButton.setAttribute("aria-pressed", String(active));
    audioLabel.textContent = active ? "Pausar audio" : "Escuchar audio";
    root.classList.toggle("is-audio-active", active);
    scheduleRotation();
  }

  function stopStageVideo() {
    video.pause();
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.setAttribute("muted", "");
    video.dataset.userUnmuted = "false";
    video.dataset.userPaused = "true";
    if (window.__PATO_SOUND_ACTIVE_VIDEO__ === video) window.__PATO_SOUND_ACTIVE_VIDEO__ = null;
    resetAudioPrompt();
  }

  function animateStage() {
    stage.classList.remove("is-entering");
    window.requestAnimationFrame(function () {
      stage.classList.add("is-entering");
    });
  }

  function selectStage(tab, focus) {
    clearTimer();
    if (window.__PATO_STOP_ACTIVE_VIDEO__) window.__PATO_STOP_ACTIVE_VIDEO__(video);
    stopStageVideo();
    tabs.forEach(function (item) {
      var active = item === tab;
      item.classList.remove("is-counting");
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
    });

    var kind = tab.dataset.kind;
    var isVideo = kind === "video";
    description.textContent = tab.dataset.description || "";
    if (isVideo) {
      proposal.hidden = true;
      edit.hidden = true;
      video.hidden = false;
      audioButton.hidden = false;
      var stageName = tab.dataset.alt || (tab.querySelector(".club-workflow-step-copy strong") || {}).textContent || "Video";
      video.setAttribute("aria-label", stageName + ". Presiona para escuchar el audio original; vuelve a presionar para pausar.");
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
    animateStage();
    if (focus) tab.focus();
    syncAudioPrompt();
    scheduleRotation();
  }

  audioButton.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    if (window.__PATO_ACTIVATE_VIDEO_AUDIO__) {
      window.__PATO_ACTIVATE_VIDEO_AUDIO__(video, event);
    } else {
      var wasAudible = !video.muted && !video.paused;
      video.dataset.userPaused = String(wasAudible);
      video.muted = wasAudible;
      video.defaultMuted = wasAudible;
      video.volume = wasAudible ? 0 : 1;
      if (wasAudible) video.pause();
      else {
        var fallbackPlay = video.play();
        if (fallbackPlay && typeof fallbackPlay.catch === "function") fallbackPlay.catch(function () {});
      }
    }
    syncAudioPrompt();
  });

  video.addEventListener("play", syncAudioPrompt);
  video.addEventListener("pause", syncAudioPrompt);
  video.addEventListener("volumechange", syncAudioPrompt);

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

  var initial = tabs.find(function (tab) { return tab.getAttribute("aria-selected") === "true"; }) || tabs[0];
  selectStage(initial, false);
})();
