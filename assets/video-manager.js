/* One mobile-first media controller for the portfolio. */
(function (window, document) {
  "use strict";

  if (window.VideoManager && window.VideoManager.__patoVideoManager) return;

  var SELECTOR = "video[data-video-managed]";
  var ROOT_MARGIN = "120px 0px";
  var ACTIVE_THRESHOLD = 0.6;
  var mobileViewport = window.matchMedia ? window.matchMedia("(max-width: 719px)") : { matches: false };

  function activationThreshold(video) {
    /* Mobile browser chrome reduces the usable viewport; start project clips
       as soon as a meaningful part of their frame enters the screen. */
    return mobileViewport.matches && video.dataset.videoRole === "content" ? 0.18 : ACTIVE_THRESHOLD;
  }
  var MAX_LOADED = 1;
  var allVideos = [];
  var states = new WeakMap();
  var observer = null;
  var activeVideo = null;
  var audioVideo = null;
  var frameId = 0;
  var sequence = 0;
  var reducedMotion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var saveData = Boolean(connection && connection.saveData);
  var lowMemory = typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 3;
  var disableAmbient = saveData || lowMemory || reducedMotion.matches;

  function stateFor(video) {
    var state = states.get(video);
    if (!state) {
      state = { near: false, loaded: false, ratio: 0, lastUsed: 0, blocked: false, fallback: null, heroButton: null, prompt: null, framePresented: false, framePending: false, frameCallbackId: null };
      states.set(video, state);
    }
    return state;
  }

  function isAmbient(video) {
    return video.dataset.videoRole === "ambient" || video.getAttribute("aria-hidden") === "true";
  }

  function isHero(video) {
    return video.dataset.videoRole === "hero" || video.classList.contains("hero-video");
  }

  function hostFor(video) {
    return video.closest(".hero-phone-screen, .editorial-media, .phone-screen, .clean-media-frame, .club-workflow-screen, .service-card, .pricing-pack, .studio-system-board, .contact-proposal-card") || video.parentElement;
  }

  function isHidden(video) {
    if (!video || !video.isConnected || video.hidden) return true;
    if (video.closest("[hidden]")) return true;
    var item = video.closest(".project-item");
    if (item && item.classList.contains("is-hidden")) return true;
    var style = window.getComputedStyle(video);
    if (style.display === "none" || style.visibility === "hidden") return true;
    var rect = video.getBoundingClientRect();
    return rect.width <= 0 || rect.height <= 0;
  }

  function originalSources(video) {
    return Array.prototype.slice.call(video.querySelectorAll("source"));
  }

  function sourceUrl(video) {
    if (video.getAttribute("data-src")) return video.getAttribute("data-src");
    if (video.dataset.videoSrc) return video.dataset.videoSrc;
    if (video.getAttribute("src")) return video.getAttribute("src");
    var sources = originalSources(video);
    for (var i = 0; i < sources.length; i += 1) {
      var url = sources[i].getAttribute("data-src") || sources[i].getAttribute("src");
      if (url) return url;
    }
    return "";
  }

  /*
   * Use video.src as the single active source instead of relying on dynamically
   * populated <source> children. This is more predictable in Android Chrome
   * and lets releaseSource reliably drop the active resource.
   */
  function loadSource(video) {
    var state = stateFor(video);
    if (state.loaded && video.getAttribute("src")) {
      state.lastUsed = ++sequence;
      return true;
    }

    var sourceElements = originalSources(video);
    var direct = video.getAttribute("data-src") || video.dataset.videoSrc || video.getAttribute("src");
    if (!direct) {
      for (var i = 0; i < sourceElements.length; i += 1) {
        direct = sourceElements[i].getAttribute("data-src") || sourceElements[i].getAttribute("src");
        if (direct) break;
      }
    }
    if (!direct) return false;

    var changed = video.getAttribute("src") !== direct;
    sourceElements.forEach(function (source) {
      var childSrc = source.getAttribute("src");
      if (childSrc) {
        if (!source.getAttribute("data-src")) source.setAttribute("data-src", childSrc);
        source.removeAttribute("src");
      }
    });

    /* Strictly 1 active decoder: release any other loaded video BEFORE assigning src. */
    allVideos.forEach(function (other) {
      if (other !== video && stateFor(other).loaded) releaseSource(other);
    });

    if (changed) video.setAttribute("src", direct);
    if (changed || video.readyState === 0) {
      try { video.load(); } catch (error) {}
    }
    state.loaded = true;
    state.lastUsed = ++sequence;
    maintainMemory();
    return true;
  }

  function pauseElement(video) {
    if (!video) return;
    try { video.pause(); } catch (error) {}
  }

  function setMuted(video, muted) {
    if (!video) return;
    var shouldMute = Boolean(muted) || video.dataset.audioAvailable !== "true";
    video.muted = shouldMute;
    video.defaultMuted = shouldMute;
    video.volume = shouldMute ? 0 : 1;
    if (shouldMute) video.setAttribute("muted", "");
    else video.removeAttribute("muted");
    video.dataset.userUnmuted = String(!shouldMute);
    syncPrompt(video);
  }

  function hideFallback(video) {
    var state = stateFor(video);
    video.classList.remove("is-blocked");
    video.controls = false;
    video.removeAttribute("controls");
    var host = hostFor(video);
    if (host) host.classList.remove("is-blocked");
    if (state.fallback) state.fallback.hidden = true;
    if (state.heroButton) state.heroButton.hidden = true;
  }

  function showFallback(video, label, blocked) {
    var state = stateFor(video);
    if (blocked) {
      video.classList.add("is-blocked");
      video.controls = true;
      var host = hostFor(video);
      if (host) host.classList.add("is-blocked");
    }
    var button = state.heroButton || state.fallback;
    if (!button) return;
    button.hidden = false;
    button.disabled = false;
    button.setAttribute("aria-label", label || "Reproducir video");
    var text = button.querySelector("span");
    if (text) text.textContent = label || "Reproducir video";
    else if (button === state.fallback) button.textContent = label || "Reproducir video";
  }

  function resetFrameState(video) {
    var state = stateFor(video);
    if (state.frameCallbackId !== null && typeof video.cancelVideoFrameCallback === "function") {
      try { video.cancelVideoFrameCallback(state.frameCallbackId); } catch (error) {}
    }
    state.framePresented = false;
    state.framePending = false;
    state.frameCallbackId = null;
  }

  function markFrameReady(video) {
    var state = stateFor(video);
    if (state.framePresented || state.framePending) return;
    if (video.paused || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;

    function revealPresentedFrame() {
      state.framePending = false;
      state.frameCallbackId = null;
      if (video.paused || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;

      state.framePresented = true;
      var host = hostFor(video);
      if (host) host.classList.add("is-video-ready");
      if (video.classList.contains("hero-video")) {
        var screen = video.closest(".hero-phone-screen");
        var wrap = document.getElementById("heroDeviceWrap");
        if (screen) screen.classList.add("is-video-ready");
        if (wrap) wrap.classList.add("is-video-ready");
        video.dataset.heroFrameReady = "true";
      }
      /* The recovery control disappears only after a frame reaches the screen. */
      hideFallback(video);
    }

    state.framePending = true;
    if (typeof video.requestVideoFrameCallback === "function") {
      try {
        state.frameCallbackId = video.requestVideoFrameCallback(function () {
          revealPresentedFrame();
        });
        return;
      } catch (error) {
        state.frameCallbackId = null;
      }
    }

    /* Older Android WebViews may not implement requestVideoFrameCallback. */
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        window.setTimeout(revealPresentedFrame, 140);
      });
    });
  }

  function syncPrompt(video) {
    var state = stateFor(video);
    var active = audioVideo === video && !video.muted && !video.paused;
    if (state.prompt) {
      state.prompt.setAttribute("aria-pressed", String(active));
      var label = state.prompt.querySelector("[data-audio-prompt-label], [data-club-audio-label]");
      if (label) label.textContent = active ? "Pausar audio" : "Escuchar audio";
    }
  }

  function promptFor(video) {
    var root = video.closest("[data-club-viewer]");
    if (root) return root.querySelector("[data-club-audio]");
    var host = video.closest(".hero-audio-stack, .editorial-media-stack, .project-item");
    return host ? host.querySelector("[data-video-audio-prompt]") : null;
  }

  function stopOthers(except) {
    allVideos.forEach(function (video) {
      if (video === except) return;
      pauseElement(video);
      setMuted(video, true);
      syncPrompt(video);
    });
    if (audioVideo !== except) audioVideo = null;
    if (activeVideo !== except) activeVideo = null;
    window.__PATO_SOUND_ACTIVE_VIDEO__ = audioVideo;
  }

  function bindFallbackTap(video) {
    var host = hostFor(video);
    if (!host || host.dataset.vmTapBound === "1") return;
    host.dataset.vmTapBound = "1";
    host.addEventListener("click", function (event) {
      if (event.target && event.target.closest("button, a, summary, [data-video-audio-prompt], [data-club-audio]")) return;
      if (isAmbient(video)) return;
      var state = stateFor(video);
      if (video.paused || !state.loaded) {
        playMuted(video, true);
      }
    });
  }

  function initDebugBanner() {
    if (window.location.search.indexOf("debug=1") === -1) return;
    var box = document.createElement("div");
    box.id = "vmDebugBanner";
    box.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99999;background:rgba(0,0,0,.9);color:#0f0;font:11px/1.35 monospace;padding:6px 8px;pointer-events:none;word-break:break-all;";
    document.body.appendChild(box);
    function update() {
      var hero = document.querySelector(".hero-video");
      var dim = hero ? (hero.offsetWidth + "x" + hero.offsetHeight) : "no-hero";
      var rs = hero ? hero.readyState : "-";
      var err = (hero && hero.error) ? ("err=" + hero.error.code) : "ok";
      box.textContent = "UA:" + navigator.userAgent.slice(0, 65) + " | vids:" + allVideos.length + " | hero:" + dim + " rs=" + rs + " " + err;
    }
    update();
    window.setInterval(update, 1000);
  }

  function releaseSource(video) {
    if (!video || isHero(video) && stateFor(video).near) return;
    var state = stateFor(video);
    if (!state.loaded) return;
    pauseElement(video);

    var direct = video.getAttribute("src");
    if (direct) {
      if (!video.getAttribute("data-src")) video.setAttribute("data-src", direct);
      video.removeAttribute("src");
    }

    originalSources(video).forEach(function (source) {
      var current = source.getAttribute("src");
      if (current) {
        if (!source.getAttribute("data-src")) source.setAttribute("data-src", current);
        source.removeAttribute("src");
      }
    });

    try { video.load(); } catch (error) {}
    state.loaded = false;
    resetFrameState(video);
  }

  function maintainMemory() {
    var loaded = allVideos.filter(function (video) { return stateFor(video).loaded; });
    if (loaded.length <= MAX_LOADED) return;

    /*
     * Never evict media that is currently visible or the active decoder.
     * The previous policy could unload a clip while its IO callback was still
     * arriving, causing repeated blank frames on Android during fast scrolling.
     */
    var releasable = loaded.filter(function (video) {
      var state = stateFor(video);
      return video !== activeVideo && state.ratio < ACTIVE_THRESHOLD && !state.near && !isHero(video);
    }).sort(function (a, b) {
      return stateFor(a).lastUsed - stateFor(b).lastUsed;
    });

    while (loaded.length > MAX_LOADED && releasable.length) {
      var victim = releasable.shift();
      releaseSource(victim);
      loaded = loaded.filter(function (video) { return video !== victim; });
    }
  }

  function mutePauseAll() {
    allVideos.forEach(function (video) {
      pauseElement(video);
      setMuted(video, true);
    });
    activeVideo = null;
    audioVideo = null;
    window.__PATO_SOUND_ACTIVE_VIDEO__ = null;
  }

  function playMuted(video, userGesture) {
    if (!video || isHidden(video)) return null;
    var state = stateFor(video);
    if (!userGesture && state.blocked) return null;
    if (userGesture) state.blocked = false;
    if (!userGesture && isAmbient(video) && disableAmbient) {
      return null;
    }
    if (!userGesture && (document.hidden || reducedMotion.matches || saveData)) {
      showFallback(video, "Reproducir video", true);
      return null;
    }
    /* Stop the previous decoder before assigning a new source. */
    stopOthers(video);
    if (!loadSource(video)) {
      showFallback(video, "Reintentar reproducción");
      return null;
    }

    video.dataset.userPaused = "false";
    setMuted(video, true);
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    activeVideo = video;

    /* Keep a real tap target visible until this source has presented a frame. */
    if (state.framePresented) hideFallback(video);
    else showFallback(video, "Reproducir video");

    var result;
    try {
      result = video.play();
    } catch (error) {
      state.blocked = true;
      showFallback(video, "Reproducir", true);
      return null;
    }

    if (result && typeof result.catch === "function") {
      result.then(function () {
        state.blocked = false;
      }).catch(function (error) {
        if (error && error.name === "AbortError") return;
        state.blocked = true;
        pauseElement(video);
        if (audioVideo === video) audioVideo = null;
        window.__PATO_SOUND_ACTIVE_VIDEO__ = audioVideo;
        showFallback(video, error && error.name === "NotAllowedError" ? "Tocar para reproducir" : "Reintentar reproducción");
      });
    }
    return result;
  }

  function activateAudio(video, event) {
    if (!video || isHidden(video)) return;
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    var alreadyAudible = audioVideo === video && !video.paused && !video.muted;
    if (alreadyAudible) {
      video.dataset.userPaused = "true";
      pauseElement(video);
      setMuted(video, true);
      audioVideo = null;
      if (activeVideo === video) activeVideo = null;
      window.__PATO_SOUND_ACTIVE_VIDEO__ = null;
      syncPrompt(video);
      return;
    }

    stopOthers(video);
    if (!loadSource(video)) {
      showFallback(video, "Reintentar reproducción");
      return;
    }

    video.dataset.userPaused = "false";
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.defaultMuted = false;
    video.muted = false;
    video.volume = 1;
    video.dataset.userUnmuted = "true";
    video.removeAttribute("muted");
    audioVideo = video;
    activeVideo = video;
    stateFor(video).blocked = false;
    window.__PATO_SOUND_ACTIVE_VIDEO__ = video;
    syncPrompt(video);

    /* Keep this call synchronous in the original click/tap event for iOS. */
    var result;
    try {
      result = video.play();
    } catch (error) {
      stateFor(video).blocked = true;
      setMuted(video, true);
      audioVideo = null;
      window.__PATO_SOUND_ACTIVE_VIDEO__ = null;
      showFallback(video, "Tocar para reproducir");
      return;
    }

    if (result && typeof result.catch === "function") {
      result.catch(function () {
        stateFor(video).blocked = true;
        setMuted(video, true);
        audioVideo = null;
        if (activeVideo === video) activeVideo = null;
        window.__PATO_SOUND_ACTIVE_VIDEO__ = null;
        showFallback(video, "Tocar para reproducir");
      });
    }
  }

  function deactivate(video, options) {
    options = options || {};
    if (!video) return;
    video.dataset.userPaused = "true";
    pauseElement(video);
    setMuted(video, true);
    if (activeVideo === video) activeVideo = null;
    if (audioVideo === video) audioVideo = null;
    window.__PATO_SOUND_ACTIVE_VIDEO__ = audioVideo;
    if (options.release) releaseSource(video);
    syncPrompt(video);
  }

  function setSource(video, url) {
    if (!video) return;
    var next = url || "";
    var previous = sourceUrl(video);
    if (previous === next) {
      if (next) stateFor(video).loaded = Boolean(video.getAttribute("src") || originalSources(video).some(function (s) { return s.getAttribute("src"); }));
      refresh();
      return;
    }

    deactivate(video, { release: true });
    video.removeAttribute("src");
    video.removeAttribute("data-src");
    delete video.dataset.videoSrc;
    originalSources(video).forEach(function (source) {
      source.removeAttribute("src");
      source.removeAttribute("data-src");
    });
    if (next) video.setAttribute("data-src", next);

    var state = stateFor(video);
    state.loaded = false;
    state.near = false;
    state.blocked = false;
    resetFrameState(video);
    if (next && !isHidden(video) && nearViewport(video)) loadSource(video);
    refresh();
  }

  function requestPlayback(video) {
    if (!video) return;
    video.dataset.userPaused = "false";
    refresh();
  }

  function actualVisibleRatio(video) {
    var rect = video.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return 0;
    var left = Math.max(0, rect.left);
    var right = Math.min(window.innerWidth, rect.right);
    var top = Math.max(0, rect.top);
    var bottom = Math.min(window.innerHeight, rect.bottom);
    var area = Math.max(0, right - left) * Math.max(0, bottom - top);
    return area / Math.max(rect.width * rect.height, 1);
  }

  function nearViewport(video) {
    var rect = video.getBoundingClientRect();
    return rect.bottom >= -200 && rect.top <= window.innerHeight + 200 &&
      rect.right >= 0 && rect.left <= window.innerWidth;
  }

  function candidateScore(video) {
    if (isHidden(video)) return -1;
    var state = stateFor(video);
    var ratio = actualVisibleRatio(video);
    state.ratio = ratio;
    if (ratio < activationThreshold(video) || video.dataset.userPaused === "true") return -1;

    var rect = video.getBoundingClientRect();
    var centerDistance = Math.abs((rect.top + rect.height / 2) - window.innerHeight / 2);
    var centerScore = 1 - Math.min(centerDistance / Math.max(window.innerHeight, 1), 1);
    var priority = isHero(video) ? 0.12 : (isAmbient(video) ? -0.08 : 0.08);
    return ratio + (centerScore * 0.18) + priority;
  }

  function schedule() {
    if (frameId) return;
    frameId = window.requestAnimationFrame(update);
  }

  function update() {
    frameId = 0;
    if (document.hidden) {
      mutePauseAll();
      return;
    }

    var best = null;
    var bestScore = -1;

    allVideos.forEach(function (video) {
      var state = stateFor(video);
      if (isHidden(video)) {
        state.ratio = 0;
        if (activeVideo === video || audioVideo === video) deactivate(video, { release: true });
        else releaseSource(video);
        return;
      }

      state.ratio = actualVisibleRatio(video);
      if (nearViewport(video) && !state.loaded) loadSource(video);
      var score = candidateScore(video);
      if (score > bestScore) {
        bestScore = score;
        best = video;
      }
    });

    if (best !== activeVideo) {
      if (activeVideo) {
        pauseElement(activeVideo);
        setMuted(activeVideo, true);
      }
      activeVideo = best;
      if (audioVideo && audioVideo !== best) {
        setMuted(audioVideo, true);
        audioVideo = null;
        window.__PATO_SOUND_ACTIVE_VIDEO__ = null;
      }
    }

    if (best && best.paused) {
      if (videoAllowedToAutoplay()) playMuted(best, false);
      else if (!document.hidden) showFallback(best, "Reproducir video");
    }
    maintainMemory();
  }

  function videoAllowedToAutoplay() {
    return !document.hidden && !reducedMotion.matches && !saveData;
  }

  function fallbackButton(video) {
    var state = stateFor(video);
    if (state.fallback) return state.fallback;
    if (isAmbient(video)) return null;

    var host = hostFor(video);
    if (!host) return null;
    host.classList.add("video-manager-host");

    var button = document.createElement("button");
    button.type = "button";
    button.className = "video-manager-play";
    button.hidden = true;
    button.setAttribute("aria-label", "Reproducir video");
    button.innerHTML = '<span class="video-manager-play-icon" aria-hidden="true">▶</span><span>Reproducir video</span>';
    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      video.dataset.userPaused = "false";
      playMuted(video, true);
    });
    host.appendChild(button);
    state.fallback = button;
    return button;
  }

  function configure(video) {
    var state = stateFor(video);
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.removeAttribute("autoplay");
    var mobileContent = mobileViewport.matches && video.dataset.videoRole === "content";
    var mobilePlayback = mobileViewport.matches && (isHero(video) || video.dataset.videoRole === "content");
    video.controls = mobilePlayback;
    if (mobilePlayback) video.setAttribute("controls", "");
    else video.removeAttribute("controls");
    var preloadMode = (isHero(video) || mobileContent) ? "metadata" : "none";
    video.preload = preloadMode;
    video.setAttribute("preload", preloadMode);
    video.disablePictureInPicture = true;
    if (!video.getAttribute("poster")) video.setAttribute("poster", "./assets/images/hero-showreel-poster.svg");

    var heroScreen = video.closest(".hero-phone-screen");
    state.heroButton = heroScreen ? heroScreen.querySelector("[data-hero-mobile-play]") : null;
    state.prompt = promptFor(video);
    /* Club's stage controller already owns its audio button click. */
    if (state.prompt && !video.closest("[data-club-viewer]")) {
      state.prompt.addEventListener("click", function (event) {
        activateAudio(video, event);
      });
    }

    if (state.heroButton) {
      state.heroButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        video.dataset.userPaused = "false";
        playMuted(video, true);
      });
      if (mobileViewport.matches && video.paused) showFallback(video, "Reproducir showreel");
    } else {
      fallbackButton(video);
      if (mobileViewport.matches && video.dataset.videoRole === "content") {
        showFallback(video, "Reproducir video");
      }
    }

    video.addEventListener("click", function (event) {
      if (event.target && event.target.closest && event.target.closest("button")) return;
      if (mobileViewport.matches && video.controls) return;
      if (window.__PATO_INSTAGRAM_BROWSER__ === true) return;
      activateAudio(video, event);
    });

    video.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") activateAudio(video, event);
    });

    ["loadeddata", "canplay", "playing", "timeupdate"].forEach(function (name) {
      video.addEventListener(name, function () { markFrameReady(video); });
    });
    video.addEventListener("playing", function () {
      markFrameReady(video);
      activeVideo = video;
      if (!video.muted) audioVideo = video;
      window.__PATO_SOUND_ACTIVE_VIDEO__ = audioVideo;
      syncPrompt(video);
    });
    video.addEventListener("pause", function () { syncPrompt(video); });
    video.addEventListener("volumechange", function () { syncPrompt(video); });
    ["error", "abort", "stalled"].forEach(function (name) {
      video.addEventListener(name, function () {
        if (video.error || name === "error") {
          state.blocked = true;
          resetFrameState(video);
          var failedScreen = video.closest(".hero-phone-screen");
          var failedWrap = document.getElementById("heroDeviceWrap");
          if (failedScreen) failedScreen.classList.remove("is-video-ready");
          if (failedWrap && isHero(video)) failedWrap.classList.remove("is-video-ready");
          showFallback(video, "Reintentar reproducción");
        }
      });
    });

    state.loaded = Boolean(video.getAttribute("src"));
    if (state.loaded) state.lastUsed = ++sequence;
  }

  function init() {
    allVideos = Array.prototype.slice.call(document.querySelectorAll(SELECTOR));
    allVideos.forEach(configure);

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var video = entry.target;
          var state = stateFor(video);
          state.near = entry.isIntersecting;
          if (entry.isIntersecting && !isHidden(video)) loadSource(video);
          if (!entry.isIntersecting && activeVideo === video) {
            pauseElement(video);
            setMuted(video, true);
            activeVideo = null;
            if (audioVideo === video) audioVideo = null;
            window.__PATO_SOUND_ACTIVE_VIDEO__ = audioVideo;
          }
        });
        schedule();
      }, { rootMargin: ROOT_MARGIN, threshold: [0, 0.15, 0.6, 1] });
      allVideos.forEach(function (video) { observer.observe(video); });
    } else {
      allVideos.forEach(function (video) {
        if (nearViewport(video)) loadSource(video);
      });
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) mutePauseAll();
      else refresh();
    });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", function () {
      allVideos.forEach(function (video) {
        if (isHero(video) || video.dataset.videoRole === "content") {
          var mobilePlayback = mobileViewport.matches;
          video.controls = mobilePlayback;
          if (mobilePlayback) video.setAttribute("controls", "");
          else video.removeAttribute("controls");
          if (mobileViewport.matches && video.paused) {
            showFallback(video, isHero(video) ? "Reproducir showreel" : "Reproducir video");
          } else if (!mobileViewport.matches) {
            hideFallback(video);
          }
        }
      });
      schedule();
    }, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });
    window.addEventListener("pageshow", refresh);

    if (typeof reducedMotion.addEventListener === "function") {
      reducedMotion.addEventListener("change", function () {
        if (reducedMotion.matches) mutePauseAll();
        else refresh();
      });
    }

    refresh();
  }

  function refresh() {
    allVideos.forEach(function (video) {
      var state = stateFor(video);
      if (isHidden(video)) {
        state.ratio = 0;
        if (activeVideo === video || audioVideo === video) deactivate(video, { release: true });
        else releaseSource(video);
        return;
      }
      if (nearViewport(video) && !state.loaded) loadSource(video);
    });
    schedule();
  }

  var api = {
    __patoVideoManager: true,
    activateAudio: activateAudio,
    play: playMuted,
    pause: function (video, options) { pauseElement(video); if (options && options.release) releaseSource(video); },
    deactivate: deactivate,
    setSource: setSource,
    requestPlayback: requestPlayback,
    refresh: refresh,
    stopOthers: stopOthers,
    release: releaseSource
  };

  window.VideoManager = api;
  window.__PATO_ACTIVATE_VIDEO_AUDIO__ = activateAudio;
  window.__PATO_STOP_ACTIVE_VIDEO__ = function (except) {
    stopOthers(except);
    allVideos.forEach(function (video) {
      if (video !== except && isHidden(video)) releaseSource(video);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window, document);
