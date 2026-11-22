/* Samsung / low-memory Android hero fallback.
   Keep a decoded poster visible until the browser produces the first video frame. */
(function () {
  "use strict";

  var screen = document.querySelector("#heroDeviceWrap .hero-phone-screen");
  var video = screen ? screen.querySelector(".hero-video") : null;
  var poster = screen ? screen.querySelector("[data-hero-mobile-poster]") : null;
  var button = document.querySelector("[data-hero-mobile-play]");
  if (!screen || !video || !button) return;

  var mobile = window.matchMedia("(max-width: 719px)");
  if (!mobile.matches) {
    button.hidden = true;
    return;
  }

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var manualAttempt = false;
  var frameRevealed = false;

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

  function revealFirstFrame() {
    if (frameRevealed || video.videoWidth <= 0 || video.videoHeight <= 0) return;
    frameRevealed = true;
    screen.classList.add("is-video-ready");
    video.dataset.heroFrameReady = "true";
    hideButton();
  }

  function confirmDecodedFrame() {
    if (frameRevealed) return;
    if (video.readyState < 2 || video.videoWidth <= 0) return;

    // requestVideoFrameCallback confirms that Chrome actually submitted a
    // decoded frame to the compositor; do not remove the poster before this.
    if (typeof video.requestVideoFrameCallback === "function") {
      video.requestVideoFrameCallback(function () {
        revealFirstFrame();
      });
    } else {
      revealFirstFrame();
    }
  }

  function attemptMutedPlay(fromGesture) {
    if (document.hidden || (video.dataset.userPaused === "true" && !fromGesture)) {
      showButton("Reproducir showreel");
      return;
    }

    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.setAttribute("muted", "");
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

    var promise;
    try {
      promise = video.play();
    } catch (error) {
      showButton("Tocar para reproducir");
      return;
    }

    // A fulfilled play() promise only means playback was accepted. Keep the
    // poster and play button until loadeddata + an actual frame are available.
    if (promise && typeof promise.then === "function") {
      promise.then(function () {
        confirmDecodedFrame();
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
    showButton("Cargando video…");
    button.disabled = true;
    attemptMutedPlay(true);
  });

  video.addEventListener("loadeddata", confirmDecodedFrame);
  video.addEventListener("canplay", confirmDecodedFrame);
  video.addEventListener("playing", confirmDecodedFrame);
  video.addEventListener("timeupdate", confirmDecodedFrame);

  video.addEventListener("pause", function () {
    if (!document.hidden && !video.ended && !frameRevealed) {
      showButton("Reproducir showreel");
    }
  });

  video.addEventListener("error", function () {
    screen.classList.remove("is-video-ready");
    if (poster) poster.style.opacity = "1";
    showButton("Video no disponible");
  });

  video.addEventListener("ended", function () {
    video.dataset.userPaused = "false";
    showButton("Volver a reproducir");
  });

  if (reducedMotion.matches) {
    showButton("Reproducir showreel");
  } else {
    showButton("Cargando video…");
    // This file is the single owner of the initial muted play request.
    attemptMutedPlay(false);
  }

  function resumeWhenVisible() {
    if (document.hidden || reducedMotion.matches || manualAttempt ||
        video.dataset.userPaused === "true" || !video.paused) return;
    var rect = screen.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < window.innerHeight) {
      attemptMutedPlay(false);
    }
  }

  window.addEventListener("scroll", resumeWhenVisible, { passive: true });
  window.addEventListener("resize", resumeWhenVisible, { passive: true });

  window.addEventListener("pageshow", function () {
    if (!document.hidden && !reducedMotion.matches && !manualAttempt &&
        video.paused && video.dataset.userPaused !== "true") {
      attemptMutedPlay(false);
    }
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (!video.paused) video.pause();
      if (!frameRevealed) showButton("Reproducir showreel");
    } else if (!reducedMotion.matches && !manualAttempt &&
               video.dataset.userPaused !== "true") {
      attemptMutedPlay(false);
    }
  });
})();
