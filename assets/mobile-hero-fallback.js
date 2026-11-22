/* Samsung / low-memory Android hero fallback.
   Keeps the first reel visible even when muted autoplay is rejected. */
(function () {
  "use strict";

  var video = document.querySelector("#heroDeviceWrap .hero-video");
  var button = document.querySelector("[data-hero-mobile-play]");
  if (!video || !button) return;

  var mobile = window.matchMedia("(max-width: 719px)");
  if (!mobile.matches) {
    button.hidden = true;
    return;
  }

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var manualAttempt = false;

  video.muted = true;
  video.defaultMuted = true;
  video.volume = 0;
  video.playsInline = true;
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.setAttribute("preload", "auto");
  video.preload = "auto";

  function showButton(label) {
    button.hidden = false;
    button.disabled = false;
    var text = button.querySelector("span");
    if (text && label) text.textContent = label;
  }

  function hideButton() {
    button.hidden = true;
    button.disabled = false;
  }

  function markReady() {
    video.dataset.heroFrameReady = "true";
    if (!video.paused) hideButton();
  }

  function attemptMutedPlay(fromGesture) {
    if (document.hidden || video.dataset.userPaused === "true" && !fromGesture) {
      showButton("Reproducir showreel");
      return;
    }

    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.setAttribute("muted", "");
    video.playsInline = true;

    var promise;
    try {
      promise = video.play();
    } catch (error) {
      showButton("Tocar para reproducir");
      return;
    }

    if (promise && typeof promise.then === "function") {
      promise.then(function () {
        hideButton();
      }).catch(function () {
        showButton("Tocar para reproducir");
      });
    }
  }

  button.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    manualAttempt = true;
    video.dataset.userPaused = "false";
    button.disabled = true;
    showButton("Cargando video…");
    attemptMutedPlay(true);
  });

  video.addEventListener("playing", function () {
    markReady();
    hideButton();
  });

  video.addEventListener("loadeddata", markReady);
  video.addEventListener("canplay", markReady);

  video.addEventListener("pause", function () {
    if (!document.hidden && !video.ended) showButton("Reproducir showreel");
  });

  video.addEventListener("error", function () {
    showButton("Video no disponible");
  });

  video.addEventListener("ended", function () {
    video.dataset.userPaused = "false";
    showButton("Volver a reproducir");
  });

  // Respect reduced-motion: the poster and manual button remain visible,
  // while autoplay is skipped until the visitor explicitly taps.
  if (reducedMotion.matches) {
    showButton("Reproducir showreel");
  } else {
    attemptMutedPlay(false);
  }

  window.addEventListener("pageshow", function () {
    if (!document.hidden && !reducedMotion.matches && !manualAttempt &&
        video.paused && video.dataset.userPaused !== "true") {
      attemptMutedPlay(false);
    }
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (!video.paused) video.pause();
      showButton("Reproducir showreel");
    } else if (!reducedMotion.matches && !manualAttempt &&
               video.dataset.userPaused !== "true") {
      attemptMutedPlay(false);
    }
  });
})();
