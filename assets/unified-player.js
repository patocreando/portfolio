/* Unified on-demand video player: max 1 active <video> in the entire DOM. */
(function (window, document) {
  "use strict";

  var activeSlot = null;
  var activeVideo = null;

  function hostFor(slot) {
    return slot.closest(
      ".hero-device-wrap, .editorial-media-stack, .project-item, .club-workflow"
    ) || slot.parentElement;
  }

  function releaseVideo(video) {
    if (!video) return;
    try { video.pause(); } catch (err) {}
    try {
      video.removeAttribute("src");
      video.load();
    } catch (err) {}
    if (video.parentNode) video.parentNode.removeChild(video);
  }

  function stopSlot(slot) {
    if (!slot) return;
    var existing = slot.querySelector("video.up-video");
    if (existing) releaseVideo(existing);
    slot.classList.remove("is-playing");
    var host = hostFor(slot);
    if (host) host.classList.remove("is-playing-host");
    if (activeSlot === slot) {
      activeSlot = null;
      activeVideo = null;
      window.__PATO_SOUND_ACTIVE_VIDEO__ = null;
    }
  }

  function stopAll(exceptSlot) {
    if (activeSlot && activeSlot !== exceptSlot) {
      stopSlot(activeSlot);
    }
    var stray = document.querySelectorAll("video.up-video");
    for (var i = 0; i < stray.length; i += 1) {
      var parent = stray[i].closest("[data-up-slot]");
      if (parent && parent !== exceptSlot) stopSlot(parent);
    }
  }

  function buildButton(slot) {
    if (slot.querySelector(".up-play-btn")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "up-play-btn";
    var label = slot.getAttribute("data-video-label") || "Reproducir";
    var meta = slot.getAttribute("data-video-meta") || "9:16 · Con audio";
    btn.setAttribute("aria-label", label);

    var icon = document.createElement("span");
    icon.className = "up-play-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "\u25B6";

    var copy = document.createElement("span");
    copy.className = "up-play-copy";
    var strong = document.createElement("strong");
    strong.textContent = label;
    var small = document.createElement("small");
    small.textContent = meta;
    copy.appendChild(strong);
    copy.appendChild(small);

    btn.appendChild(icon);
    btn.appendChild(copy);
    slot.appendChild(btn);
  }

  function playSlot(slot) {
    if (!slot) return;
    var src = slot.getAttribute("data-src");
    if (!src) return;

    stopAll(slot);
    if (slot.classList.contains("is-playing") && slot.querySelector("video.up-video")) {
      return;
    }

    var video = document.createElement("video");
    video.className = "up-video";
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.playsInline = true;
    video.controls = true;
    video.preload = "auto";
    video.muted = false;
    video.defaultMuted = false;

    var poster = slot.getAttribute("data-poster") || "";
    if (poster) video.poster = poster;
    var aria = slot.getAttribute("data-video-aria") || slot.getAttribute("data-video-label") || "Video";
    video.setAttribute("aria-label", aria);
    video.src = src;

    slot.classList.add("is-playing");
    var host = hostFor(slot);
    if (host) host.classList.add("is-playing-host");

    slot.appendChild(video);
    activeSlot = slot;
    activeVideo = video;
    window.__PATO_SOUND_ACTIVE_VIDEO__ = video;

    video.addEventListener("ended", function () {
      if (activeSlot === slot) stopSlot(slot);
    });

    try {
      var p = video.play();
      if (p && typeof p.catch === "function") {
        p.catch(function () {
          /* Fallback: if browser blocks unmuted play, start muted with native controls visible. */
          video.muted = true;
          video.defaultMuted = true;
          try {
            var mp = video.play();
            if (mp && typeof mp.catch === "function") mp.catch(function () {});
          } catch (e) {}
        });
      }
    } catch (err) {
      video.muted = true;
    }
  }

  function bindSlot(slot) {
    if (!slot) return;
    buildButton(slot);
    if (slot.dataset.upBound === "1") return;
    slot.dataset.upBound = "1";
    slot.addEventListener("click", function (event) {
      if (slot.classList.contains("is-playing")) return;
      event.preventDefault();
      event.stopPropagation();
      playSlot(slot);
    });
  }

  function init() {
    var slots = document.querySelectorAll("[data-up-slot]");
    for (var i = 0; i < slots.length; i += 1) {
      bindSlot(slots[i]);
    }
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stopAll(null);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.UnifiedPlayer = {
    init: init,
    bindSlot: bindSlot,
    playSlot: playSlot,
    stopSlot: stopSlot,
    stopAll: stopAll,
    getActiveVideo: function () { return activeVideo; }
  };
})(window, document);
