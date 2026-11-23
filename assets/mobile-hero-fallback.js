/* Cross-browser hero playback controller.
   The real poster remains visible until the browser submits a decoded video frame. */
(function () {
  "use strict";

  var wrap = document.getElementById("heroDeviceWrap");
  var screen = wrap ? wrap.querySelector(".hero-phone-screen") : null;
  var video = screen ? screen.querySelector(".hero-video") : null;
  var poster = screen ? screen.querySelector("[data-hero-mobile-poster]") : null;
  var button = screen ? screen.querySelector("[data-hero-mobile-play]") : null;

  if (!wrap || !screen || !video || !poster || !button) return;

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var saveData = Boolean(connection && connection.saveData);
  var hasFrame = false;
  var playPending = false;
  var observer = null;

  function isVisible() {
    var rect = wrap.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight &&
      rect.right > 0 && rect.left < window.innerWidth;
  }

  function showButton(label) {
    if (video.error) return;
    button.hidden = false;
    button.disabled = false;
    var text = button.querySelector("span");
    if (text && label) text.textContent = label;
  }

  function hideButton() {
    button.hidden = true;
    button.disabled = false;
  }

  function keepPosterVisible() {
    if (hasFrame) return;
    screen.classList.remove("is-video-ready");
    wrap.classList.remove("is-video-ready");
    video.dataset.heroFrameReady = "false";
  }

  function revealFrame() {
    if (hasFrame || video.videoWidth <= 0 || video.videoHeight <= 0) return;
    hasFrame = true;
    screen.classList.add("is-video-ready");
    wrap.classList.add("is-video-ready");
    video.dataset.heroFrameReady = "true";
    if (!video.paused) hideButton();
  }

  function confirmDecodedFrame() {
    if (hasFrame || video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) return;

    if (typeof video.requestVideoFrameCallback === "function") {
      video.requestVideoFrameCallback(function () {
        revealFrame();
      });
      return;
    }

    // Safari versions without requestVideoFrameCallback: allow the compositor
    // two paint cycles after HAVE_CURRENT_DATA before removing the poster.
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        if (video.readyState >= 2 && video.videoWidth > 0) revealFrame();
      });
    });
  }

  function setMutedForAutoplay() {
    // A prior explicit audio gesture is respected. Autoplay starts muted.
    if (video.dataset.userUnmuted === "true") return;
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.setAttribute("muted", "");
  }

  function clearActiveAudio() {
    if (window.__PATO_SOUND_ACTIVE_VIDEO__ === video) {
      window.__PATO_SOUND_ACTIVE_VIDEO__ = null;
    }
    video.dataset.userUnmuted = "false";
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.setAttribute("muted", "");
    video.dispatchEvent(new Event("volumechange"));
  }

  function attemptPlay(fromGesture) {
    if (document.hidden || (!fromGesture && !isVisible())) return;
    if (!fromGesture && video.dataset.userPaused === "true") return;

    if (!fromGesture && (reducedMotion.matches || saveData)) {
      video.preload = "none";
      showButton("Reproducir showreel");
      return;
    }

    if (video.error) {
      keepPosterVisible();
      hideButton();
      return;
    }

    if (playPending) return;

    setMutedForAutoplay();
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.preload = "auto";
    playPending = true;

    var promise;
    try {
      promise = video.play();
    } catch (error) {
      playPending = false;
      showButton("Tocar para reproducir");
      return;
    }

    if (promise && typeof promise.then === "function") {
      promise.then(function () {
        playPending = false;
        confirmDecodedFrame();
      }).catch(function () {
        playPending = false;

        // Retry muted if a previous, explicitly enabled audio stream was
        // rejected after backgrounding or a viewport change.
        if (!video.muted) {
          clearActiveAudio();
          attemptPlay(false);
          return;
        }

        showButton("Tocar para reproducir");
      });
    } else {
      playPending = false;
      confirmDecodedFrame();
    }
  }

  button.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    video.dataset.userPaused = "false";
    button.disabled = false;
    showButton("Cargando showreel…");
    button.disabled = true;
    attemptPlay(true);
  });

  video.addEventListener("loadeddata", confirmDecodedFrame);
  video.addEventListener("canplay", confirmDecodedFrame);
  video.addEventListener("playing", function () {
    confirmDecodedFrame();
    hideButton();
  });

  video.addEventListener("pause", function () {
    if (video.dataset.userPaused === "true" && !document.hidden) {
      showButton("Reproducir showreel");
    } else if (!isVisible() && hasFrame) {
      hasFrame = false;
      keepPosterVisible();
    } else if (!hasFrame && !document.hidden && isVisible() && !reducedMotion.matches) {
      showButton("Tocar para reproducir");
    }
  });

  video.addEventListener("stalled", function () {
    hasFrame = false;
    keepPosterVisible();
    if (!document.hidden && isVisible()) showButton("Reintentar showreel");
  });

  video.addEventListener("error", function () {
    keepPosterVisible();
    // The still is a complete visual fallback. Do not expose dead native
    // controls or a retry action when the resource itself cannot be decoded.
    hideButton();
  });

  video.addEventListener("ended", function () {
    video.dataset.userPaused = "false";
    if (!video.error) showButton("Volver a reproducir");
  });

  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio > 0) {
          if (!reducedMotion.matches && !saveData && video.dataset.userPaused !== "true") {
            attemptPlay(false);
          }
        } else if (!video.paused) {
          try { video.pause(); } catch (error) {}
        }
      });
    }, { rootMargin: "80px 0px 80px 0px", threshold: [0, 0.01, 0.15] });

    observer.observe(wrap);
  }

  window.addEventListener("pageshow", function () {
    if (video.paused && !video.error) {
      hasFrame = false;
      keepPosterVisible();
    }
    if (!document.hidden && isVisible() && video.dataset.userPaused !== "true") {
      attemptPlay(false);
    }
  });

  window.addEventListener("resize", function () {
    if (isVisible() && video.dataset.userPaused !== "true") attemptPlay(false);
  }, { passive: true });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (!video.paused) video.pause();
      hasFrame = false;
      keepPosterVisible();
      showButton("Reproducir showreel");
    } else if (!reducedMotion.matches && !saveData && isVisible() &&
               video.dataset.userPaused !== "true") {
      attemptPlay(false);
    }
  });

  if (typeof reducedMotion.addEventListener === "function") {
    reducedMotion.addEventListener("change", function () {
      if (reducedMotion.matches) {
        if (!video.paused) video.pause();
        if (!hasFrame) keepPosterVisible();
        showButton("Reproducir showreel");
      } else if (!saveData && isVisible() && video.dataset.userPaused !== "true") {
        attemptPlay(false);
      }
    });
  }

  video.controls = false;
  video.removeAttribute("controls");
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  setMutedForAutoplay();

  if (reducedMotion.matches || saveData) {
    video.preload = "none";
    showButton("Reproducir showreel");
  } else if (isVisible()) {
    showButton("Cargando showreel…");
    attemptPlay(false);
  } else {
    video.preload = "metadata";
  }
})();
