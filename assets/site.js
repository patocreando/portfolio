/* Original inline block 6 */
(function inAppVideoBootstrap() {
      "use strict";

      var ua = navigator.userAgent || "";
      var referrer = document.referrer || "";
      var instagramInApp =
        /Instagram/i.test(ua) ||
        /(^|\.)instagram\.com/i.test(referrer) ||
        /l\.instagram\.com/i.test(referrer);

      var metaInApp =
        instagramInApp ||
        /FBAN|FBAV|FB_IAB|FBIOS|Messenger/i.test(ua);

      window.__PATO_INAPP_BROWSER__ = metaInApp;
      window.__PATO_INSTAGRAM_BROWSER__ = instagramInApp;

      if (!metaInApp) return;

      document.documentElement.classList.add("inapp-browser");
      if (instagramInApp) document.documentElement.classList.add("instagram-inapp");

      var optimizedSources = {
        "c9cd5049-a4d1-47c4-b8c8-b6ccdf4b1d75.mp4":
          "https://d2ol7oe51mr4n9.cloudfront.net/user_3GsQoyBuAJ7X4awqyulGWND0DzD/b3575f54-5147-4252-86d3-0e6ea83014b7.mp4",
        "706208ee-4969-48d1-b61b-0e2cafa95f14.mp4":
          "https://d2ol7oe51mr4n9.cloudfront.net/user_3GsQoyBuAJ7X4awqyulGWND0DzD/5df51310-572d-445b-a6c6-d801b1a89012.mp4",
        "f96e1001-0400-4e61-a09b-8dc2b2a0a2cb.mp4":
          "https://d2ol7oe51mr4n9.cloudfront.net/user_3GsQoyBuAJ7X4awqyulGWND0DzD/23b5775c-e736-4e56-a4c0-f38f4b177b12.mp4",
        "9c4f840c-a00d-47cc-87ec-bf82c4003c86.mp4":
          "https://d2ol7oe51mr4n9.cloudfront.net/user_3GsQoyBuAJ7X4awqyulGWND0DzD/1cf1332f-8bb4-44a0-8d3d-4966f9624cb5.mp4",
        "d5ea268d-4d9f-4c93-9139-439d4b8ace03.mp4":
          "https://d2ol7oe51mr4n9.cloudfront.net/user_3GsQoyBuAJ7X4awqyulGWND0DzD/bd77a436-b7b8-4d3d-a77d-7cc38272365e.mp4",
        "6e08dc87-2a5b-4932-8430-ef21aee2402c.mp4":
          "https://d2ol7oe51mr4n9.cloudfront.net/user_3GsQoyBuAJ7X4awqyulGWND0DzD/26bd951c-c4d1-4178-961e-3743565f593d.mp4",
        "877afd00-4ec0-461d-808b-56fe80729818.mp4":
          "https://d2ol7oe51mr4n9.cloudfront.net/user_3GsQoyBuAJ7X4awqyulGWND0DzD/153a7b6e-8e35-4afc-a90a-992710e472a1.mp4"
      };

      function shellFor(video) {
        return video.closest(".hero-phone-screen, .phone-screen, .clean-media-frame");
      }

      function originalSource(video) {
        var source = video.querySelector("source[src]");
        if (source && source.getAttribute("src")) return source.getAttribute("src");
        return video.getAttribute("src") || "";
      }

      function optimizedSourceFor(video) {
        var original = originalSource(video);

        for (var key in optimizedSources) {
          if (original.indexOf(key) !== -1) return optimizedSources[key];
        }

        return original;
      }

      function ensurePlayButton(video) {
        var shell = shellFor(video);
        if (!shell) return null;

        var button = shell.querySelector(".video-tap-fallback");
        if (!button) {
          button = document.createElement("button");
          button.type = "button";
          button.className = "video-tap-fallback is-visible";
          button.setAttribute("aria-label", "Reproducir video");
          button.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">' +
            '<path d="M8 5v14l11-7z"></path></svg>' +
            '<span>Tocar para reproducir</span>';
          shell.appendChild(button);
        } else {
          button.classList.add("is-visible");
          var label = button.querySelector("span");
          if (label) label.textContent = "Tocar para reproducir";
        }

        return button;
      }

      function prepare(video) {
        if (video.dataset.inappPrepared === "true") return;

        var src = optimizedSourceFor(video);

        video.dataset.inappPrepared = "true";
        video.muted = true;
        video.defaultMuted = true;
        video.volume = 0;
        video.playsInline = true;
        video.setAttribute("muted", "");
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
        video.setAttribute("preload", "metadata");
        video.preload = "metadata";
        video.disablePictureInPicture = true;

        if (video.classList.contains("hero-video")) {
          video.controls = false;
          video.removeAttribute("controls");
        } else {
          video.controls = true;
          video.setAttribute("controls", "");
        }

        if (src) {
          video.src = src;
        }

        Array.prototype.slice.call(video.querySelectorAll("source")).forEach(function (source) {
          source.remove();
        });

        try { video.load(); } catch (e) {}
      }

      function start(video, button) {
        prepare(video);

        var promise;
        try { promise = video.play(); } catch (e) {}

        if (promise && typeof promise.then === "function") {
          promise.then(function () {
            if (button) {
              button.classList.remove("is-visible");
              button.classList.add("is-playing");
            }
          }).catch(function () {
            if (button) {
              button.classList.remove("is-playing");
              button.classList.add("is-visible");
              var label = button.querySelector("span");
              if (label) label.textContent = "Tocar de nuevo";
            }
          });
        }
      }

      var videos = Array.prototype.slice.call(
        document.querySelectorAll(".hero-video, .project-video")
      );

      var heroVideo = document.querySelector(".hero-video");
      var heroSoundToggle = document.getElementById("heroSoundToggle");

      function updateHeroSoundUi(audible) {
        if (!heroSoundToggle) return;

        var label = heroSoundToggle.querySelector(".hero-sound-label");
        var icon = heroSoundToggle.querySelector("[data-lucide]");

        heroSoundToggle.classList.toggle("is-audible", audible);
        heroSoundToggle.setAttribute(
          "aria-label",
          audible ? "Silenciar video" : "Activar audio del video"
        );

        if (label) label.textContent = audible ? "Silenciar" : "Escuchar";

        if (icon) {
          icon.setAttribute("data-lucide", audible ? "volume-2" : "volume-x");
          if (window.lucide && typeof window.lucide.createIcons === "function") {
            window.lucide.createIcons();
          }
        }
      }

      function setHeroAudio(audible) {
        if (!heroVideo) return;

        prepare(heroVideo);

        heroVideo.muted = !audible;
        heroVideo.defaultMuted = !audible;
        heroVideo.volume = audible ? 1 : 0;

        if (audible) {
          heroVideo.removeAttribute("muted");
        } else {
          heroVideo.setAttribute("muted", "");
        }

        var promise;
        try { promise = heroVideo.play(); } catch (e) {}

        if (promise && typeof promise.catch === "function") {
          promise.catch(function () {
            heroVideo.muted = true;
            heroVideo.defaultMuted = true;
            heroVideo.volume = 0;
            heroVideo.setAttribute("muted", "");
            updateHeroSoundUi(false);
          });
        }

        updateHeroSoundUi(audible);
      }

      if (heroSoundToggle && heroVideo) {
        updateHeroSoundUi(false);

        heroSoundToggle.addEventListener("click", function (event) {
          event.preventDefault();
          event.stopPropagation();

          var audible =
            !heroVideo.muted &&
            heroVideo.volume > 0;

          setHeroAudio(!audible);
        });
      }

      videos.forEach(function (video) {
        prepare(video);

        var button = ensurePlayButton(video);
        var shell = shellFor(video);

        if (button) {
          button.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            start(video, button);
          });
        }

        if (shell) {
          shell.addEventListener("click", function (event) {
            if (
              event.target.closest(".hero-sound-toggle") ||
              event.target.closest(".video-tap-fallback")
            ) return;

            if (video.paused) start(video, button);
          });
        }

        video.addEventListener("playing", function () {
          if (button) {
            button.classList.remove("is-visible");
            button.classList.add("is-playing");
          }
        });

        ["pause", "stalled", "error", "abort"].forEach(function (eventName) {
          video.addEventListener(eventName, function () {
            if (button && video.paused) {
              button.classList.remove("is-playing");
              button.classList.add("is-visible");
            }
          });
        });
      });

      function playNearestVisible() {
        var best = null;
        var bestDistance = Infinity;
        var center = window.innerHeight / 2;

        videos.forEach(function (video) {
          var card = video.closest(".project-item");
          if (card && card.classList.contains("is-hidden")) return;

          var rect = video.getBoundingClientRect();
          if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;

          var distance = Math.abs((rect.top + rect.height / 2) - center);
          if (distance < bestDistance) {
            bestDistance = distance;
            best = video;
          }
        });

        if (best) start(best, ensurePlayButton(best));
      }

      document.addEventListener("touchend", playNearestVisible, { passive: true, once: true });
      document.addEventListener("pointerup", playNearestVisible, { passive: true, once: true });
    })();
;

/* Original inline block 7 */
(function () {
      "use strict";

      var videos = Array.prototype.slice.call(
        document.querySelectorAll(".project-video")
      );

      if (!videos.length) return;

      var activeVideo = null;
      var rafId = null;
      var mobileQuery = window.matchMedia("(max-width: 639px)");
      var inAppBrowser = window.__PATO_INAPP_BROWSER__ === true;

      if (inAppBrowser) return;

      function isEligible(video) {
        if (!video || !video.isConnected) return false;

        var card = video.closest(".project-item");
        if (card && card.classList.contains("is-hidden")) return false;

        var rect = video.getBoundingClientRect();
        var style = window.getComputedStyle(video);
        var margin = mobileQuery.matches ? 260 : 80;

        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          rect.width <= 0 ||
          rect.height <= 0
        ) {
          return false;
        }

        return rect.bottom > -margin &&
          rect.top < window.innerHeight + margin &&
          rect.right > 0 &&
          rect.left < window.innerWidth;
      }

      function score(video) {
        if (!isEligible(video)) return -1;

        var rect = video.getBoundingClientRect();
        var vh = Math.max(window.innerHeight, 1);
        var top = Math.max(rect.top, 0);
        var bottom = Math.min(rect.bottom, vh);
        var visibleHeight = Math.max(0, bottom - top);
        var visibleRatio = visibleHeight / Math.max(rect.height, 1);

        var viewportCenter = vh / 2;
        var videoCenter = rect.top + rect.height / 2;
        var centerDistance = Math.abs(videoCenter - viewportCenter);
        var centerScore = 1 - Math.min(centerDistance / vh, 1);

        return (visibleRatio * .8) + (centerScore * .2);
      }

      function prepare(video) {
        var keepAudio = video.dataset.userUnmuted === "true";
        video.muted = !keepAudio;
        video.defaultMuted = !keepAudio;

        if (keepAudio) {
          video.removeAttribute("muted");
        } else {
          video.setAttribute("muted", "");
        }

        video.playsInline = true;
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
        video.disablePictureInPicture = true;

        var preloadMode = inAppBrowser ? "metadata" : (mobileQuery.matches ? "none" : "metadata");
        video.preload = preloadMode;
        video.setAttribute("preload", preloadMode);

        if (inAppBrowser && !video.getAttribute("src")) {
          var directSource = video.querySelector("source[src]");
          if (directSource && directSource.src) video.src = directSource.src;
        }
      }

      function ensureButton(video) {
        var shell = video.closest(".phone-screen, .clean-media-frame, .hero-phone-screen");
        if (!shell) return null;

        var existing = shell.querySelector(".video-tap-fallback");
        if (existing) return existing;

        var button = document.createElement("button");
        button.type = "button";
        button.className = inAppBrowser ? "video-tap-fallback is-visible" : "video-tap-fallback";
        button.setAttribute("aria-label", "Reproducir video");
        button.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">' +
          '<path d="M8 5v14l11-7z"></path></svg>' +
          '<span>Reproducir</span>';

        button.addEventListener("click", function (event) {
          event.preventDefault();
          event.stopPropagation();
          activate(video, true);
        });

        shell.appendChild(button);
        return button;
      }

      function pause(video) {
        if (video && !video.paused) {
          try { video.pause(); } catch (e) {}
        }
      }

      function play(video, userGesture) {
        if (!video) return;

        prepare(video);
        video.preload = "auto";
        video.setAttribute("preload", "auto");
        video.setAttribute("autoplay", "");
        var button = ensureButton(video);

        if (video.readyState < (inAppBrowser ? 2 : 1)) {
          try { video.load(); } catch (e) {}
        }

        var promise;
        try {
          promise = video.play();
        } catch (e) {
          if (button) button.classList.add("is-visible");
          return;
        }

        if (promise && typeof promise.then === "function") {
          promise.then(function () {
            if (button) button.classList.remove("is-visible");
          }).catch(function () {
            if (button) button.classList.add("is-visible");
          });
        } else if (userGesture && button) {
          button.classList.remove("is-visible");
        }
      }

      function activate(next, userGesture) {
        videos.forEach(function (video) {
          if (video !== next) pause(video);
        });

        activeVideo = next || null;

        if (activeVideo) play(activeVideo, userGesture === true);
      }

      function selectBest() {
        rafId = null;

        if (document.hidden) {
          activate(null);
          return;
        }

        var best = null;
        var bestScore = mobileQuery.matches ? .01 : .08;

        videos.forEach(function (video) {
          var current = score(video);
          if (current > bestScore) {
            bestScore = current;
            best = video;
          }
        });

        if (best !== activeVideo) {
          activate(best);
        } else if (best && best.paused) {
          play(best, false);
        }
      }

      function schedule() {
        if (rafId) return;
        rafId = window.requestAnimationFrame(selectBest);
      }

      videos.forEach(function (video) {
        prepare(video);
        var button = ensureButton(video);

        video.addEventListener("playing", function () {
          if (button) button.classList.remove("is-visible");
        });

        video.addEventListener("pause", function () {
          if (video === activeVideo && button) {
            button.classList.add("is-visible");
          }
        });

        video.addEventListener("error", function () {
          if (button) {
            button.classList.add("is-visible");
            var label = button.querySelector("span");
            if (label) label.textContent = "Tocar para abrir";
          }
        });
      });

      if ("IntersectionObserver" in window) {
        var observer = new IntersectionObserver(schedule, {
          rootMargin: mobileQuery.matches ? "260px 0px 260px 0px" : "80px 0px 80px 0px",
          threshold: [0, .1, .25, .5, .75, 1]
        });
        videos.forEach(function (video) { observer.observe(video); });
      }

      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule, { passive: true });
      window.addEventListener("orientationchange", schedule, { passive: true });
      window.addEventListener("pageshow", schedule);

      document.addEventListener("visibilitychange", function () {
        if (document.hidden) activate(null);
        else schedule();
      });

      ["touchstart", "pointerdown"].forEach(function (eventName) {
        document.addEventListener(eventName, function () {
          selectBest();
          if (activeVideo) play(activeVideo, true);
        }, { passive: true, once: true });
      });

      window.setTimeout(schedule, 80);
      window.setTimeout(schedule, 500);
    })();
;

/* Original inline block 8 */
(function mobileHeroTakeover() {
      "use strict";

      var wrap = document.getElementById("heroDeviceWrap");
      var stage = document.getElementById("heroDeviceStage");
      var phone = document.getElementById("heroPhone");
      var video = phone ? phone.querySelector(".hero-video") : null;
      var soundToggle = document.getElementById("heroSoundToggle");

      if (!wrap || !stage || !phone || !video) return;

      var mobileQuery = window.matchMedia("(max-width: 639px)");
      var reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      var inAppBrowser = window.__PATO_INAPP_BROWSER__ === true;
      if (inAppBrowser) return;
      var rafId = null;
      var enabled = false;
      var audioUnlocked = false;
      var userSilenced = false;
      var lastWidth = window.innerWidth;
      var frameReady = false;

      function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
      }

      function smoothstep(value) {
        value = clamp(value, 0, 1);
        return value * value * (3 - (2 * value));
      }

      function updateSoundUi() {
        if (!soundToggle) return;

        var audible =
          video.dataset.userUnmuted === "true" &&
          !video.muted &&
          video.volume > 0;

        var label = soundToggle.querySelector(".hero-sound-label");
        var icon = soundToggle.querySelector("[data-lucide]");

        if (label) label.textContent = audible ? "Silenciar" : "Escuchar";

        soundToggle.setAttribute(
          "aria-label",
          audible ? "Silenciar video" : "Activar audio del video"
        );
        soundToggle.classList.toggle("is-audible", audible);

        if (icon) {
          icon.setAttribute("data-lucide", audible ? "volume-2" : "volume-x");
          if (window.lucide && typeof window.lucide.createIcons === "function") {
            window.lucide.createIcons();
          }
        }
      }

      function setAudio(audible) {
        video.dataset.userUnmuted = audible ? "true" : "false";
        video.volume = audible ? 1 : 0;
        video.muted = !audible;
        video.defaultMuted = !audible;

        if (audible) {
          video.removeAttribute("muted");
        } else {
          video.setAttribute("muted", "");
        }

        updateSoundUi();
      }

      function markFrameReady() {
        if (frameReady) return;
        frameReady = true;
        wrap.classList.add("is-video-ready");
      }

      function playVideo() {
        video.preload = "auto";
        video.setAttribute("autoplay", "");
        var promise;

        try { promise = video.play(); } catch (e) {}

        return promise;
      }

      function ensureMutedPlayback() {
        if (audioUnlocked && !userSilenced) return playVideo();

        setAudio(false);
        var promise = playVideo();

        if (promise && typeof promise.catch === "function") {
          promise.catch(function () {});
        }

        return promise;
      }

      function unlockAudioFromGesture() {
        if (!enabled || userSilenced || audioUnlocked) return;

        setAudio(true);
        var promise = playVideo();

        if (promise && typeof promise.then === "function") {
          promise.then(function () {
            audioUnlocked = true;
            setAudio(true);
          }).catch(function () {
            audioUnlocked = false;
            setAudio(false);
            ensureMutedPlayback();
          });
        } else {
          audioUnlocked = true;
          setAudio(true);
        }
      }

      function toggleAudio(event) {
        if (!mobileQuery.matches) return;

        event.preventDefault();
        event.stopPropagation();

        var audible =
          video.dataset.userUnmuted === "true" &&
          !video.muted &&
          video.volume > 0;

        if (audible) {
          userSilenced = true;
          setAudio(false);
          ensureMutedPlayback();
          return;
        }

        userSilenced = false;
        audioUnlocked = false;
        unlockAudioFromGesture();
      }

      function shouldUnlockFromGesture(event) {
        if (inAppBrowser) return false;
        if (!enabled || userSilenced || audioUnlocked) return false;

        if (
          soundToggle &&
          event &&
          (event.target === soundToggle || soundToggle.contains(event.target))
        ) {
          return false;
        }

        var rect = wrap.getBoundingClientRect();
        var vh = Math.max(window.innerHeight, 1);

        return rect.top < vh * 1.10 && rect.bottom > 0;
      }

      function handleGesture(event) {
        if (shouldUnlockFromGesture(event)) {
          unlockAudioFromGesture();
        }
      }

      function resetMobileState() {
        [
          "--hero-mobile-slide-width",
          "--hero-mobile-slide-height",
          "--hero-mobile-slide-top",
          "--hero-mobile-slide-radius",
          "--hero-mobile-slide-border",
          "--hero-mobile-slide-shadow",
          "--hero-mobile-store-progress"
        ].forEach(function (name) {
          phone.style.removeProperty(name);
        });

        wrap.classList.remove("is-takeover");
        wrap.classList.remove("is-storing");
        wrap.classList.remove("is-revealed");
        document.body.classList.remove("hero-takeover-active");
      }

      function setEnabled(next) {
        enabled = next;
        wrap.classList.toggle("mobile-takeover-enabled", enabled);

        if (!enabled) {
          resetMobileState();
        }
      }

      function render() {
        rafId = null;
        if (!enabled) return;

        var rect = wrap.getBoundingClientRect();
        var vh = Math.max(window.innerHeight, 1);
        var nearViewport = rect.top < vh * 1.20 && rect.bottom > -vh * .20;

        wrap.classList.remove("is-takeover");
        wrap.classList.remove("is-storing");
        wrap.classList.add("is-revealed");
        document.body.classList.remove("hero-takeover-active");

        if (nearViewport) {
          if (audioUnlocked && !userSilenced) {
            setAudio(true);
          }

          if (video.paused) {
            ensureMutedPlayback();
          }
        } else if (!video.paused) {
          try { video.pause(); } catch (e) {}
        }
      }

      function schedule() {
        if (!enabled || rafId) return;
        rafId = window.requestAnimationFrame(render);
      }

      function primeVideo() {
        video.playsInline = true;
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");

        var preloadMode = inAppBrowser ? "metadata" : "auto";
        video.preload = preloadMode;
        video.setAttribute("preload", preloadMode);
        video.setAttribute("autoplay", "");

        if (inAppBrowser && !video.getAttribute("src")) {
          var directSource = video.querySelector("source[src]");
          if (directSource && directSource.src) video.src = directSource.src;
        }

        if (inAppBrowser) {
          try { video.load(); } catch (e) {}
        }

        if (!audioUnlocked || userSilenced) {
          setAudio(false);
        }

        if (video.readyState >= 2) {
          markFrameReady();
        }

        ensureMutedPlayback();
      }

      function refresh() {
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = null;
        }

        var shouldEnable = mobileQuery.matches && !reduceMotionQuery.matches;
        setEnabled(shouldEnable);

        if (shouldEnable) {
          primeVideo();
          window.setTimeout(render, 20);
        }
      }

      if (soundToggle) {
        soundToggle.addEventListener("click", toggleAudio);
      }

      video.addEventListener("loadeddata", markFrameReady);
      video.addEventListener("canplay", markFrameReady);
      video.addEventListener("playing", function () {
        markFrameReady();
        if (mobileQuery.matches) updateSoundUi();
      });

      video.addEventListener("volumechange", function () {
        if (mobileQuery.matches) updateSoundUi();
      });

      video.addEventListener("stalled", function () {
        wrap.classList.remove("is-video-ready");
        frameReady = false;
      });

      // Audio solo desde el botón Escuchar; nunca a partir de gestos de navegación.

      window.addEventListener("scroll", schedule, { passive: true });

      window.addEventListener("resize", function () {
        var nextWidth = window.innerWidth;

        if (Math.abs(nextWidth - lastWidth) > 20) {
          lastWidth = nextWidth;
          refresh();
        } else {
          schedule();
        }
      }, { passive: true });

      window.addEventListener("orientationchange", function () {
        window.setTimeout(refresh, 160);
      }, { passive: true });

      window.addEventListener("pageshow", function () {
        if (enabled) {
          primeVideo();
          schedule();
        }
      });

      document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
          if (!video.paused) {
            try { video.pause(); } catch (e) {}
          }
        } else if (enabled) {
          primeVideo();
          schedule();
        }
      });

      if (typeof mobileQuery.addEventListener === "function") {
        mobileQuery.addEventListener("change", refresh);
        reduceMotionQuery.addEventListener("change", refresh);
      }

      updateSoundUi();
      refresh();
    })();
;

/* Original inline block 11 */
(function () {
      "use strict";

      if (window.lucide && typeof window.lucide.createIcons === "function") { window.lucide.createIcons(); }

      var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.__PATO_INAPP_BROWSER__ === true;
      var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

      // Mobile menu
      var menuToggle = document.getElementById("menuToggle");
      var mobileMenu = document.getElementById("mobileMenu");

      function closeMenu() {
        if (!menuToggle || !mobileMenu) return;
        mobileMenu.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Abrir menú");
      }

      if (menuToggle && mobileMenu) {
        menuToggle.addEventListener("click", function () {
          var nextOpen = !mobileMenu.classList.contains("is-open");
          mobileMenu.classList.toggle("is-open", nextOpen);
          menuToggle.setAttribute("aria-expanded", String(nextOpen));
          menuToggle.setAttribute("aria-label", nextOpen ? "Cerrar menú" : "Abrir menú");
        });

        mobileMenu.querySelectorAll("a").forEach(function (link) {
          link.addEventListener("click", closeMenu);
        });
      }

      // Scroll progress
      var scrollProgress = document.getElementById("scrollProgress");

      function updateScrollProgress() {
        if (!scrollProgress) return;
        var max = document.documentElement.scrollHeight - window.innerHeight;
        var ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
        scrollProgress.style.transform = "scaleX(" + ratio + ")";
      }

      updateScrollProgress();
      window.addEventListener("scroll", updateScrollProgress, { passive: true });


      // Project tabs
      var tabButtons = Array.prototype.slice.call(document.querySelectorAll("[data-filter]"));
      var projectItems = Array.prototype.slice.call(document.querySelectorAll(".project-item"));
      var categoryDescription = document.getElementById("categoryDescription");
      var projectViewport = document.getElementById("projectViewport");
      var projectGrid = document.getElementById("projectGrid");
      var projectCarouselControls = document.getElementById("projectCarouselControls");
      var projectCarouselStatus = document.getElementById("projectCarouselStatus");
      var projectPrev = document.getElementById("projectPrev");
      var projectNext = document.getElementById("projectNext");
      var projectCarouselIndex = 0;
      var activeProjectCategory = "ugc";
      var categoryCopy = {
        ugc: "Avatares y producto en verticales con estética nativa.",
        product: "Campañas de producto con control de forma, escala y materiales.",
        workflow: "My Way: referencia → digitalización → variación → pieza final."
      };

      function getVisibleProjectItems() {
        return projectItems.filter(function (item) {
          return !item.classList.contains("is-hidden");
        });
      }

      function renderProjectCarousel() {
        if (!projectGrid) return;

        var desktopCarousel = window.matchMedia("(min-width: 1024px)").matches;
        var visibleItems = getVisibleProjectItems();
        var maxIndex = Math.max(0, visibleItems.length - 2);

        projectCarouselIndex = Math.min(Math.max(projectCarouselIndex, 0), maxIndex);
        projectGrid.classList.toggle("is-workflow", activeProjectCategory === "workflow");

        if (!desktopCarousel || visibleItems.length <= 2) {
          projectGrid.style.transform = "";
          if (projectCarouselControls) projectCarouselControls.hidden = true;
          return;
        }

        if (projectCarouselControls) projectCarouselControls.hidden = false;

        var styles = window.getComputedStyle(projectGrid);
        var gap = parseFloat(styles.columnGap || styles.gap || "20") || 20;
        var viewportWidth = projectViewport ? projectViewport.clientWidth : projectGrid.clientWidth;
        var cardWidth = (viewportWidth - gap) / 2;
        var offset = projectCarouselIndex * (cardWidth + gap);

        projectGrid.style.transform = "translate3d(-" + offset.toFixed(2) + "px,0,0)";

        if (projectCarouselStatus) {
          var first = projectCarouselIndex + 1;
          var last = Math.min(projectCarouselIndex + 2, visibleItems.length);
          projectCarouselStatus.textContent = first + "–" + last + " / " + visibleItems.length;
        }

        if (projectPrev) projectPrev.disabled = projectCarouselIndex === 0;
        if (projectNext) projectNext.disabled = projectCarouselIndex >= maxIndex;
      }

      function showCategory(selected) {
        activeProjectCategory = selected;
        projectCarouselIndex = 0;

        projectItems.forEach(function (item) {
          var show = item.getAttribute("data-category") === selected;

          if (show) {
            item.classList.remove("is-hidden");
            item.classList.remove("filter-transition");
            void item.offsetWidth;
            item.classList.add("filter-transition");
          } else {
            item.classList.add("is-hidden");
          }
        });

        if (categoryDescription) {
          categoryDescription.textContent = categoryCopy[selected] || "";
        }

        renderProjectCarousel();

        if (window.ScrollTrigger) {
          ScrollTrigger.refresh();
        }
      }

      if (projectPrev) {
        projectPrev.addEventListener("click", function () {
          projectCarouselIndex = Math.max(0, projectCarouselIndex - 1);
          renderProjectCarousel();
        });
      }

      if (projectNext) {
        projectNext.addEventListener("click", function () {
          var visibleItems = getVisibleProjectItems();
          projectCarouselIndex = Math.min(Math.max(0, visibleItems.length - 2), projectCarouselIndex + 1);
          renderProjectCarousel();
        });
      }

      window.addEventListener("resize", function () {
        window.requestAnimationFrame(renderProjectCarousel);
      }, { passive: true });

            tabButtons.forEach(function (button) {
        button.addEventListener("click", function () {
          var selected = button.getAttribute("data-filter");

          tabButtons.forEach(function (item) {
            var active = item === button;
            item.classList.toggle("is-active", active);
            item.setAttribute("aria-selected", String(active));
            item.setAttribute("tabindex", active ? "0" : "-1");
          });

          showCategory(selected);
        });
      });

      // Pestañas accesibles: flechas, Home y End además de click/touch.
      tabButtons.forEach(function (button, index) {
        button.addEventListener("keydown", function (event) {
          var next = index;
          if (event.key === "ArrowRight") next = (index + 1) % tabButtons.length;
          else if (event.key === "ArrowLeft") next = (index - 1 + tabButtons.length) % tabButtons.length;
          else if (event.key === "Home") next = 0;
          else if (event.key === "End") next = tabButtons.length - 1;
          else return;
          event.preventDefault();
          tabButtons[next].focus();
          tabButtons[next].click();
        });
      });

      showCategory("ugc");

      // Methodology carousel
      var methodSlider = document.getElementById("methodSlider");
      var methodTrack = document.getElementById("methodTrack");
      var methodPrev = document.getElementById("methodPrev");
      var methodNext = document.getElementById("methodNext");
      var methodProgress = document.getElementById("methodProgress");
      var methodDots = Array.prototype.slice.call(document.querySelectorAll(".method-dot"));
      var methodSlides = methodTrack ? Array.prototype.slice.call(methodTrack.querySelectorAll(".method-slide")) : [];
      var methodIndex = 0;
      var methodTimer = null;
      var methodDelay = 5500;

      function renderMethodSlide(nextIndex, restart) {
        if (!methodTrack || !methodSlides.length) return;

        methodIndex = (nextIndex + methodSlides.length) % methodSlides.length;
        methodTrack.style.transform = "translate3d(-" + (methodIndex * 100) + "%,0,0)";

        methodSlides.forEach(function (slide, index) {
          slide.classList.remove("is-method-animating");
          slide.classList.toggle("is-method-active", index === methodIndex);
        });

        if (!reduceMotion) {
          var activeMethodSlide = methodSlides[methodIndex];
          if (activeMethodSlide) {
            void activeMethodSlide.offsetWidth;
            activeMethodSlide.classList.add("is-method-animating");
          }
        }

        methodDots.forEach(function (dot, index) {
          dot.classList.toggle("is-active", index === methodIndex);
          dot.setAttribute("aria-current", index === methodIndex ? "true" : "false");
        });

        if (methodProgress) {
          methodProgress.style.transition = "none";
          methodProgress.style.transform = "scaleX(0)";
          void methodProgress.offsetWidth;

          if (!reduceMotion) {
            methodProgress.style.transition = "transform " + methodDelay + "ms linear";
            methodProgress.style.transform = "scaleX(1)";
          }
        }

        if (restart !== false) {
          startMethodAutoplay();
        }
      }

      function stopMethodAutoplay() {
        if (methodTimer) {
          window.clearTimeout(methodTimer);
          methodTimer = null;
        }
      }

      function startMethodAutoplay() {
        stopMethodAutoplay();
        if (reduceMotion || !methodSlides.length) return;

        methodTimer = window.setTimeout(function () {
          renderMethodSlide(methodIndex + 1, true);
        }, methodDelay);
      }

      if (methodSlides.length) {
        if (methodPrev) {
          methodPrev.addEventListener("click", function () {
            renderMethodSlide(methodIndex - 1, true);
          });
        }

        if (methodNext) {
          methodNext.addEventListener("click", function () {
            renderMethodSlide(methodIndex + 1, true);
          });
        }

        methodDots.forEach(function (dot, index) {
          dot.addEventListener("click", function () {
            renderMethodSlide(index, true);
          });
        });

        if (methodSlider) {
          methodSlider.addEventListener("mouseenter", stopMethodAutoplay);
          methodSlider.addEventListener("mouseleave", startMethodAutoplay);
          methodSlider.addEventListener("focusin", stopMethodAutoplay);
          methodSlider.addEventListener("focusout", startMethodAutoplay);
        }

        renderMethodSlide(0, true);
      }

      // Magnetic pointer effect
      if (finePointer && !reduceMotion) {
        document.querySelectorAll(".magnetic").forEach(function (element) {
          element.addEventListener("pointermove", function (event) {
            var rect = element.getBoundingClientRect();
            var x = event.clientX - rect.left;
            var y = event.clientY - rect.top;
            element.style.setProperty("--mx", x + "px");
            element.style.setProperty("--my", y + "px");

            var dx = (x / rect.width - .5) * 7;
            var dy = (y / rect.height - .5) * 5;
            element.style.transform = "translate(" + dx + "px," + dy + "px)";
          });

          element.addEventListener("pointerleave", function () {
            element.style.transform = "";
          });
        });

        document.querySelectorAll(".phone-shell").forEach(function (phone) {
          var stage = phone.closest(".mockup-stage");
          if (!stage) return;

          stage.addEventListener("pointermove", function (event) {
            var rect = stage.getBoundingClientRect();
            var px = (event.clientX - rect.left) / rect.width;
            var py = (event.clientY - rect.top) / rect.height;
            var ry = (px - .5) * 5;
            var rx = (.5 - py) * 5;
            phone.style.transform = "perspective(1000px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg)";
          });

          stage.addEventListener("pointerleave", function () {
            phone.style.transform = "";
          });
        });
      }



      // Hero device micro-interaction
      var heroDeviceStage = document.getElementById("heroDeviceStage");
      var heroPhone = document.getElementById("heroPhone");

      if (heroDeviceStage && heroPhone && finePointer && !reduceMotion) {
        heroDeviceStage.addEventListener("pointermove", function (event) {
          var rect = heroDeviceStage.getBoundingClientRect();
          var px = (event.clientX - rect.left) / rect.width;
          var py = (event.clientY - rect.top) / rect.height;
          var ry = (px - .5) * 5.5;
          var rx = (.5 - py) * 4.5;
          heroPhone.style.transform =
            "perspective(1100px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg) translateY(-3px)";
          heroPhone.style.boxShadow =
            "inset 0 0 0 1px rgba(0,0,0,.74), inset 0 1px 0 rgba(255,255,255,.075), 0 38px 100px rgba(0,0,0,.52), 0 0 82px rgba(175,198,63,.14)";
        });

        heroDeviceStage.addEventListener("pointerleave", function () {
          heroPhone.style.transform = "";
          heroPhone.style.boxShadow = "";
        });
      }




      // Contact social spotlight
      Array.prototype.slice.call(document.querySelectorAll(".contact-social-link")).forEach(function (link) {
        if (!finePointer || reduceMotion) return;

        link.addEventListener("pointermove", function (event) {
          var rect = link.getBoundingClientRect();
          var x = ((event.clientX - rect.left) / rect.width) * 100;
          var y = ((event.clientY - rect.top) / rect.height) * 100;
          link.style.setProperty("--social-x", x.toFixed(1) + "%");
          link.style.setProperty("--social-y", y.toFixed(1) + "%");
        });

        link.addEventListener("pointerleave", function () {
          link.style.setProperty("--social-x", "50%");
          link.style.setProperty("--social-y", "50%");
        });
      });

      // Projects intro card micro-interaction
      var projectIntroCard = document.getElementById("projectIntroCard");

      if (projectIntroCard && finePointer && !reduceMotion) {
        projectIntroCard.addEventListener("pointermove", function (event) {
          var rect = projectIntroCard.getBoundingClientRect();
          var px = (event.clientX - rect.left) / rect.width;
          var py = (event.clientY - rect.top) / rect.height;
          var ry = (px - .5) * 3;
          var rx = (.5 - py) * 3;

          projectIntroCard.style.transform =
            "perspective(900px) translateY(-5px) rotateX(" +
            rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg)";
        });

        projectIntroCard.addEventListener("pointerleave", function () {
          projectIntroCard.style.transform = "";
        });
      }

      // Workflow code — type once per page load, desktop only
      var workflowCodeCanvas = document.getElementById("workflowCodeCanvas");
      var workflowTypingPlayed = false;
      var workflowDesktopQuery = window.matchMedia("(min-width: 768px)");

      function completeWorkflowCode() {
        if (!workflowCodeCanvas) return;
        workflowCodeCanvas.classList.remove("workflow-code-armed");
        workflowCodeCanvas.classList.add("workflow-code-complete");
        Array.prototype.forEach.call(workflowCodeCanvas.querySelectorAll(".code-line"), function (line) {
          var content = line.lastElementChild;
          line.classList.remove("is-typing");
          line.classList.add("is-typed");
          if (content) {
            content.style.maxWidth = "";
            content.style.width = "";
          }
        });
      }

      function runWorkflowTypewriterOnce() {
        if (
          !workflowCodeCanvas ||
          workflowTypingPlayed ||
          !workflowDesktopQuery.matches ||
          reduceMotion
        ) {
          if (workflowCodeCanvas && (!workflowDesktopQuery.matches || reduceMotion)) completeWorkflowCode();
          return;
        }

        workflowTypingPlayed = true;
        var lines = Array.prototype.slice.call(workflowCodeCanvas.querySelectorAll(".code-line"));
        var index = 0;

        function typeNextLine() {
          if (index >= lines.length) {
            window.setTimeout(completeWorkflowCode, 220);
            return;
          }

          var line = lines[index++];
          var content = line.lastElementChild;
          if (!content) {
            typeNextLine();
            return;
          }

          line.classList.add("is-typing");
          content.style.opacity = "1";
          content.style.maxWidth = "none";
          content.style.width = "auto";

          var targetWidth = Math.ceil(content.scrollWidth);
          var chars = Math.max(1, (content.textContent || "").length);
          var duration = Math.max(90, Math.min(390, chars * 10));

          content.style.width = "0px";
          content.style.maxWidth = "0px";

          var animation;
          try {
            animation = content.animate(
              [
                { width: "0px", maxWidth: "0px" },
                { width: targetWidth + "px", maxWidth: targetWidth + "px" }
              ],
              {
                duration: duration,
                easing: "steps(" + chars + ", end)",
                fill: "forwards"
              }
            );
          } catch (e) {}

          var finish = function () {
            line.classList.remove("is-typing");
            line.classList.add("is-typed");
            content.style.width = targetWidth + "px";
            content.style.maxWidth = targetWidth + "px";
            window.setTimeout(typeNextLine, 42);
          };

          if (animation && animation.finished && typeof animation.finished.then === "function") {
            animation.finished.then(finish).catch(finish);
          } else {
            window.setTimeout(finish, duration);
          }
        }

        typeNextLine();
      }

      if (workflowCodeCanvas) {
        if (workflowDesktopQuery.matches && !reduceMotion) {
          workflowCodeCanvas.classList.add("workflow-code-armed");

          if ("IntersectionObserver" in window) {
            var workflowCodeObserver = new IntersectionObserver(function (entries, observer) {
              entries.forEach(function (entry) {
                if (entry.isIntersecting && entry.intersectionRatio > .24) {
                  observer.unobserve(workflowCodeCanvas);
                  runWorkflowTypewriterOnce();
                }
              });
            }, { threshold: [0, .24, .55] });

            workflowCodeObserver.observe(workflowCodeCanvas);
          } else {
            runWorkflowTypewriterOnce();
          }
        } else {
          completeWorkflowCode();
        }
      }

      // Interactive workflow funnel — autoplay + neon state
      var pipelineFunnel = document.getElementById("pipelineFunnel");
      var funnelSteps = Array.prototype.slice.call(document.querySelectorAll(".funnel-step"));
      var funnelDetail = document.getElementById("funnelDetail");
      var funnelDetailIndex = document.getElementById("funnelDetailIndex");
      var funnelDetailTitle = document.getElementById("funnelDetailTitle");
      var funnelDetailCopy = document.getElementById("funnelDetailCopy");
      var funnelDetailOutput = document.getElementById("funnelDetailOutput");
      var funnelAutoCount = document.getElementById("funnelAutoCount");
      var funnelAutoProgress = document.getElementById("funnelAutoProgress");
      var funnelAmbient = pipelineFunnel ? pipelineFunnel.querySelector(".funnel-ambient-media") : null;
      var funnelAutoTimer = null;
      var funnelResumeTimer = null;
      var funnelIndex = 0;
      var funnelVisible = false;
      var pipelineReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

      function restartFunnelProgress() {
        if (!pipelineFunnel || !funnelAutoProgress) return;

        pipelineFunnel.classList.remove("is-auto-running");
        void funnelAutoProgress.offsetWidth;

        if (!pipelineReduceMotion.matches && funnelVisible) {
          pipelineFunnel.classList.add("is-auto-running");
        }
      }

      function animateFunnelDetail() {
        if (!funnelDetail || pipelineReduceMotion.matches) return;
        funnelDetail.classList.remove("is-funnel-animating");
        void funnelDetail.offsetWidth;
        funnelDetail.classList.add("is-funnel-animating");
      }

      function activateFunnelStep(step, options) {
        if (!step) return;
        options = options || {};

        funnelIndex = Math.max(0, funnelSteps.indexOf(step));

        funnelSteps.forEach(function (item) {
          var active = item === step;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-selected", String(active));
        });

        var number = step.querySelector(".funnel-step-number");
        if (funnelDetailIndex && number) funnelDetailIndex.textContent = number.textContent;
        if (funnelDetailTitle) funnelDetailTitle.textContent = step.getAttribute("data-title") || "";
        if (funnelDetailCopy) funnelDetailCopy.textContent = step.getAttribute("data-copy") || "";
        if (funnelDetailOutput) funnelDetailOutput.textContent = step.getAttribute("data-output") || "";
        if (funnelAutoCount) {
          funnelAutoCount.textContent =
            String(funnelIndex + 1).padStart(2, "0") + " / " +
            String(funnelSteps.length).padStart(2, "0");
        }

        animateFunnelDetail();
        restartFunnelProgress();

        if (options.scrollIntoView && window.matchMedia("(max-width: 639px)").matches) {
          try {
            step.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
          } catch (e) {}
        }
      }

      function stopFunnelAuto() {
        if (funnelAutoTimer) {
          window.clearTimeout(funnelAutoTimer);
          funnelAutoTimer = null;
        }
        if (pipelineFunnel) pipelineFunnel.classList.remove("is-auto-running");
      }

      function scheduleFunnelAuto() {
        stopFunnelAuto();
        if (!funnelVisible || pipelineReduceMotion.matches || !funnelSteps.length || document.hidden) return;

        restartFunnelProgress();

        funnelAutoTimer = window.setTimeout(function () {
          funnelIndex = (funnelIndex + 1) % funnelSteps.length;
          activateFunnelStep(funnelSteps[funnelIndex], { scrollIntoView: true });
          scheduleFunnelAuto();
        }, 3400);
      }

      function pauseThenResumeFunnel() {
        stopFunnelAuto();

        if (funnelResumeTimer) window.clearTimeout(funnelResumeTimer);
        funnelResumeTimer = window.setTimeout(function () {
          scheduleFunnelAuto();
        }, 6200);
      }

      funnelSteps.forEach(function (step) {
        step.addEventListener("click", function () {
          activateFunnelStep(step, { scrollIntoView: true });
          pauseThenResumeFunnel();
        });

        if (finePointer) {
          step.addEventListener("mouseenter", function () {
            activateFunnelStep(step);
            pauseThenResumeFunnel();
          });
        }
      });

      if (pipelineFunnel && "IntersectionObserver" in window) {
        var funnelObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            funnelVisible = entry.isIntersecting && entry.intersectionRatio > .28;

            if (funnelAmbient) {
              if (funnelVisible && !document.hidden && !pipelineReduceMotion.matches) {
                var fp;
                try { fp = funnelAmbient.play(); } catch (e) {}
                if (fp && typeof fp.catch === "function") fp.catch(function () {});
              } else {
                try { funnelAmbient.pause(); } catch (e) {}
              }
            }

            if (funnelVisible) scheduleFunnelAuto();
            else stopFunnelAuto();
          });
        }, { threshold: [0, .28, .55] });

        funnelObserver.observe(pipelineFunnel);
      } else {
        funnelVisible = true;
        scheduleFunnelAuto();
      }

      document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
          stopFunnelAuto();
          if (funnelAmbient) {
            try { funnelAmbient.pause(); } catch (e) {}
          }
        } else if (funnelVisible) {
          if (funnelAmbient && !pipelineReduceMotion.matches) {
            var fp;
            try { fp = funnelAmbient.play(); } catch (e) {}
            if (fp && typeof fp.catch === "function") fp.catch(function () {});
          }
          scheduleFunnelAuto();
        }
      });

      if (typeof pipelineReduceMotion.addEventListener === "function") {
        pipelineReduceMotion.addEventListener("change", function () {
          if (pipelineReduceMotion.matches) stopFunnelAuto();
          else if (funnelVisible) scheduleFunnelAuto();
        });
      }

      if (funnelSteps.length) activateFunnelStep(funnelSteps[0]);

      // Contact form -> direct send + mail provider fallback
      var contactForm = document.getElementById("contactForm");
      var submitLabel = document.getElementById("submitLabel");
      var mailProviderPicker = document.getElementById("mailProviderPicker");
      var mailProviderClose = document.getElementById("mailProviderClose");
      var openMailFallback = document.getElementById("openMailFallback");
      var mailProviderButtons = Array.prototype.slice.call(document.querySelectorAll("[data-mail-provider]"));
      var formStatus = document.getElementById("formStatus");
      var formStatusTitle = document.getElementById("formStatusTitle");
      var formStatusCopy = document.getElementById("formStatusCopy");
      var pendingMail = null;
      var destinationEmail = "ulisesjgonzalez2045@gmail.com";
      var formSubmitEndpoint = "https://formsubmit.co/ajax/" + destinationEmail;

      function buildMailPayload() {
        var name = document.getElementById("name").value.trim();
        var email = document.getElementById("email").value.trim();
        var projectType = document.getElementById("projectType").value.trim();
        var message = document.getElementById("message").value.trim();

        var subject = "Consulta portfolio — " + (name || "nuevo proyecto");
        var body =
          "Hola Ulises,\n\n" +
          "Soy " + name + ".\n" +
          "Mi email: " + email + "\n" +
          "Proyecto: " + (projectType || "A definir") + "\n\n" +
          message;

        return {
          to: destinationEmail,
          subject: subject,
          body: body,
          name: name,
          email: email,
          projectType: projectType || "A definir",
          message: message
        };
      }

      var formStatusTimer = null;

      function showFormStatus(type, title, copy) {
        if (!formStatus) return;

        if (formStatusTimer) {
          window.clearTimeout(formStatusTimer);
          formStatusTimer = null;
        }

        formStatus.hidden = false;
        formStatus.classList.toggle("is-error", type === "error");

        if (formStatusTitle) formStatusTitle.textContent = title;
        if (formStatusCopy) formStatusCopy.textContent = copy;

        var icon = formStatus.querySelector("i");
        if (icon) {
          icon.setAttribute("data-lucide", type === "error" ? "triangle-alert" : "check");
          if (window.lucide) lucide.createIcons();
        }

        if (type === "error") {
          formStatusTimer = window.setTimeout(function () {
            formStatus.hidden = true;
            formStatusTimer = null;
          }, 4200);
        }
      }

      function openMailProvider(provider, mail) {
        if (!mail) return;

        var to = encodeURIComponent(mail.to);
        var subject = encodeURIComponent(mail.subject);
        var body = encodeURIComponent(mail.body);
        var url = "";

        if (provider === "gmail") {
          url = "https://mail.google.com/mail/?view=cm&fs=1&to=" + to + "&su=" + subject + "&body=" + body;
        } else if (provider === "outlook") {
          url = "https://outlook.live.com/mail/0/deeplink/compose?to=" + to + "&subject=" + subject + "&body=" + body;
        } else if (provider === "yahoo") {
          url = "https://compose.mail.yahoo.com/?to=" + to + "&subject=" + subject + "&body=" + body;
        }

        if (url) {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      }

      function toggleMailProviderPicker(forceOpen) {
        if (!mailProviderPicker) return;

        var nextOpen = typeof forceOpen === "boolean" ? forceOpen : mailProviderPicker.hidden;
        mailProviderPicker.hidden = !nextOpen;
      }

      if (contactForm) {
        contactForm.addEventListener("submit", function (event) {
          event.preventDefault();

          if (!contactForm.reportValidity()) return;

          pendingMail = buildMailPayload();

          if (submitLabel) submitLabel.textContent = "Enviando…";
          if (formStatus) formStatus.hidden = true;

          fetch(formSubmitEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify({
              name: pendingMail.name,
              email: pendingMail.email,
              project: pendingMail.projectType,
              message: pendingMail.message,
              _subject: pendingMail.subject,
              _template: "table"
            })
          })
          .then(function (response) {
            if (!response.ok) throw new Error("submit_failed");
            return response.json();
          })
          .then(function () {
            showFormStatus(
              "success",
              "Propuesta enviada",
              "Recibí tu mensaje. Te respondo al correo que dejaste."
            );

            if (submitLabel) submitLabel.textContent = "Propuesta enviada";
            contactForm.reset();
            toggleMailProviderPicker(false);

            window.setTimeout(function () {
              if (submitLabel) submitLabel.textContent = "Enviar propuesta";
            }, 2800);
          })
          .catch(function () {
            showFormStatus(
              "error",
              "No pude enviarla directamente",
              "Podés abrir la propuesta en Gmail, Outlook o Yahoo y enviarla desde tu cuenta."
            );

            if (submitLabel) submitLabel.textContent = "Enviar propuesta";
            toggleMailProviderPicker(true);
          });
        });
      }

      if (openMailFallback) {
        openMailFallback.addEventListener("click", function () {
          pendingMail = buildMailPayload();
          toggleMailProviderPicker();
        });
      }

      mailProviderButtons.forEach(function (button) {
        button.addEventListener("click", function () {
          openMailProvider(button.getAttribute("data-mail-provider"), pendingMail || buildMailPayload());
        });
      });

      if (mailProviderClose) {
        mailProviderClose.addEventListener("click", function () {
          toggleMailProviderPicker(false);
        });
      }

      // GSAP motion
      if (!reduceMotion && window.gsap && window.ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);

        gsap.from(".hero-reveal", {
          opacity: 0,
          y: 24,
          duration: .9,
          stagger: .08,
          ease: "power3.out"
        });

        // Coordinated reveal system: title + supporting copy + cards
        var fastMobile = window.matchMedia("(max-width: 639px)").matches;

        var majorTitles = gsap.utils.toArray([
          "#top .hero-lockup-title",
          "#bottleneck .conversion-tension-title",
          "#creativePaths .creative-paths-title",
          "#projects h2",
          "#fit .fit-title",
          "#services .services-title",
          "#pricingTitle",
          "#method .method-intro-title h2",
          "#contact h2"
        ].join(","));

        majorTitles.forEach(function (title) {
          var isHeroTitle = title.matches("#top .hero-lockup-title");

          gsap.fromTo(title,
            fastMobile
              ? { opacity: 0, y: 12 }
              : { opacity: 0, x: -46, clipPath: "inset(0 100% 0 0)" },
            fastMobile
              ? {
                  opacity: 1,
                  y: 0,
                  duration: .34,
                  delay: isHeroTitle ? .05 : 0,
                  ease: "power2.out",
                  clearProps: "transform",
                  scrollTrigger: isHeroTitle ? undefined : {
                    trigger: title,
                    start: "top 92%",
                    once: true
                  }
                }
              : {
                  opacity: 1,
                  x: 0,
                  clipPath: "inset(0 0% 0 0)",
                  duration: .98,
                  delay: isHeroTitle ? .10 : 0,
                  ease: "power4.out",
                  clearProps: "transform",
                  scrollTrigger: isHeroTitle ? undefined : {
                    trigger: title,
                    start: "top 84%",
                    once: true
                  }
                }
          );
        });

        var supportingCopy = gsap.utils.toArray([
          "#top .hero-summary-minimal",
          "#top .hero-desktop-link",
          "#top .hero-mobile-cta",
          "#bottleneck .conversion-kicker",
          "#bottleneck .conversion-tension-copy",
          "#creativePaths .conversion-kicker",
          "#creativePaths .creative-paths-head > p:last-child",
          "#projects .project-intro-copy",
          "#projects [role='tablist']",
          "#categoryDescription",
          "#projects .project-meet-cta",
          "#fit .conversion-kicker",
          "#services .services-label",
          "#services .services-copy",
          ".pricing-packs-meta",
          ".pricing-packs-head > p",
          "#method .method-intro-label",
          "#method .method-intro-copy",
          "#method .method-intro-tools",
          "#contact .section-reveal > p:first-child",
          "#contact .section-reveal > p.mt-7"
        ].join(","));

        supportingCopy.forEach(function (element) {
          gsap.from(element, {
            scrollTrigger: {
              trigger: element,
              start: fastMobile ? "top 99%" : "top 96%",
              once: true
            },
            opacity: fastMobile ? .78 : .62,
            y: fastMobile ? 3 : 8,
            duration: fastMobile ? .20 : .46,
            ease: fastMobile ? "power1.out" : "power2.out",
            clearProps: "transform,opacity"
          });
        });

        var revealCards = gsap.utils.toArray([
          "#creativePaths .creative-path",
          "#projects .project-intro-card",
          "#projectGrid .project-item:not(.is-hidden)",
          "#fit .fit-card",
          "#services .service-card",
          ".pricing-pack",
          ".deliverables-card",
          ".direction-principle",
          "#methodSlider",
          "#contact .contact-social-link",
          "#contact form"
        ].join(","));

        revealCards.forEach(function (element, index) {
          gsap.from(element, {
            scrollTrigger: {
              trigger: element,
              start: fastMobile ? "top 95%" : "top 90%",
              once: true
            },
            opacity: 0,
            y: fastMobile ? 9 : 24,
            scale: fastMobile ? 1 : .988,
            duration: fastMobile ? .30 : .72,
            delay: fastMobile ? 0 : (index % 3) * .045,
            ease: fastMobile ? "power1.out" : "power3.out",
            clearProps: "transform"
          });
        });

        gsap.utils.toArray("[data-orb]").forEach(function (orb, index) {
          gsap.to(orb, {
            x: index % 2 === 0 ? 55 : -45,
            y: index % 2 === 0 ? 35 : -30,
            duration: 9 + index,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
          });
        });

        gsap.to(".gradient-text", {
          backgroundPosition: "100% 50%",
          duration: 7,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });
      }
    })();
;

/* Original inline block 12 */
(function capabilityCardMotion() {
      "use strict";

      var videos = Array.prototype.slice.call(document.querySelectorAll(".service-card-media"));
      if (!videos.length) return;

      function play(video) {
        if (document.hidden) return;
        var p = video.play();
        if (p && typeof p.catch === "function") p.catch(function () {});
      }

      if ("IntersectionObserver" in window) {
        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            var video = entry.target;
            if (entry.isIntersecting && entry.intersectionRatio > .15) {
              play(video);
            } else {
              video.pause();
            }
          });
        }, { threshold: [0, .15, .4] });

        videos.forEach(function (video) {
          video.muted = true;
          observer.observe(video);
        });
      } else {
        videos.forEach(function (video) {
          video.muted = true;
          play(video);
        });
      }

      document.addEventListener("visibilitychange", function () {
        videos.forEach(function (video) {
          if (document.hidden) video.pause();
          else {
            var rect = video.getBoundingClientRect();
            if (rect.bottom > 0 && rect.top < window.innerHeight) play(video);
          }
        });
      });
    })();
;

/* Original inline block 13 */
(function methodAmbientMotion() {
      "use strict";

      var videos = Array.prototype.slice.call(document.querySelectorAll(".method-card-media"));
      if (!videos.length) return;

      function play(video) {
        if (document.hidden) return;
        video.muted = true;
        var p = video.play();
        if (p && typeof p.catch === "function") p.catch(function () {});
      }

      if ("IntersectionObserver" in window) {
        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && entry.intersectionRatio > .18) {
              play(entry.target);
            } else {
              entry.target.pause();
            }
          });
        }, {
          threshold: [0, .18, .5]
        });

        videos.forEach(function (video) {
          video.muted = true;
          observer.observe(video);
        });
      } else {
        videos.forEach(play);
      }

      document.addEventListener("visibilitychange", function () {
        videos.forEach(function (video) {
          if (document.hidden) {
            video.pause();
          } else {
            var rect = video.getBoundingClientRect();
            if (rect.bottom > 0 && rect.top < window.innerHeight) play(video);
          }
        });
      });
    })();
;

/* Original inline block 14 */
(function contactProposalAmbientMotion() {
      "use strict";

      var card = document.querySelector(".contact-proposal-card");
      var video = card ? card.querySelector(".contact-proposal-media") : null;
      if (!card || !video) return;

      function play() {
        if (document.hidden) return;
        video.muted = true;
        var p = video.play();
        if (p && typeof p.catch === "function") p.catch(function () {});
      }

      if ("IntersectionObserver" in window) {
        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && entry.intersectionRatio > .18) {
              card.classList.add("is-contact-ambient-active");
              play();
            } else {
              video.pause();
            }
          });
        }, { threshold: [0, .18, .45] });

        observer.observe(card);
      } else {
        card.classList.add("is-contact-ambient-active");
        play();
      }

      document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
          video.pause();
        } else {
          var rect = card.getBoundingClientRect();
          if (rect.bottom > 0 && rect.top < window.innerHeight) play();
        }
      });
    })();
;

/* Original inline block 15 */
(function desktopHeroSoundCapture() {
      "use strict";

      var desktopQuery = window.matchMedia("(min-width: 640px)");
      var button = document.getElementById("heroSoundToggleDesktop");
      var video = document.querySelector("#heroPhone .hero-video");

      if (!button || !video) return;

      var label = button.querySelector(".hero-sound-label");
      var active = false;
      var handling = false;

      function updateUi(stateText) {
        button.classList.toggle("is-audible", active);
        button.setAttribute(
          "aria-label",
          active ? "Silenciar video" : "Activar audio del video"
        );
        if (label) label.textContent = stateText || (active ? "Silenciar" : "Escuchar");
      }

      function applyState(next) {
        active = next;
        video.dataset.userUnmuted = active ? "true" : "false";
        video.volume = 1;
        video.muted = !active;
        video.defaultMuted = !active;

        if (active) {
          video.removeAttribute("muted");
        } else {
          video.setAttribute("muted", "");
        }
      }

      function toggleFromGesture(event) {
        if (!desktopQuery.matches || handling) return;

        handling = true;
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") {
          event.stopImmediatePropagation();
        }

        var next = !active;
        applyState(next);

        if (!next) {
          updateUi("Escuchar");
          handling = false;
          return;
        }

        updateUi("Activando...");

        var playPromise;
        try { playPromise = video.play(); } catch (e) {
          applyState(false);
          updateUi("Bloqueado");
          handling = false;
          window.setTimeout(function () { updateUi("Escuchar"); }, 1200);
          return;
        }

        if (playPromise && typeof playPromise.then === "function") {
          playPromise.then(function () {
            applyState(true);
            updateUi("Silenciar");
            handling = false;
          }).catch(function () {
            applyState(false);
            updateUi("Bloqueado");
            handling = false;
            window.setTimeout(function () { updateUi("Escuchar"); }, 1200);
          });
        } else {
          applyState(true);
          updateUi("Silenciar");
          handling = false;
        }
      }

      // Capture phase + coordinate hit test: works even if another layer is above the button.
      document.addEventListener("pointerdown", function (event) {
        if (!desktopQuery.matches) return;

        var rect = button.getBoundingClientRect();
        var inside =
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom;

        if (inside) toggleFromGesture(event);
      }, true);

      // Keyboard accessibility.
      button.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          toggleFromGesture(event);
        }
      });

      video.addEventListener("volumechange", function () {
        if (!desktopQuery.matches || handling) return;
        active = video.dataset.userUnmuted === "true" && !video.muted && video.volume > 0;
        updateUi();
      });

      updateUi("Escuchar");
    })();
;

/* Original inline block 16 */
(function pricingAmbientPlayback() {
      "use strict";

      var video = document.querySelector(".pricing-pack-media");
      if (!video) return;

      var desktopQuery = window.matchMedia("(min-width: 640px)");

      function stop() {
        try { video.pause(); } catch (e) {}
        video.preload = "none";
        video.setAttribute("preload", "none");
      }

      function play() {
        if (!desktopQuery.matches || document.hidden) {
          stop();
          return;
        }

        video.muted = true;
        video.preload = "metadata";
        video.setAttribute("preload", "metadata");

        var promise;
        try { promise = video.play(); } catch (e) {}
        if (promise && typeof promise.catch === "function") {
          promise.catch(function () {});
        }
      }

      if ("IntersectionObserver" in window) {
        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && entry.intersectionRatio > .12) play();
            else stop();
          });
        }, { threshold: [0, .12, .4] });

        observer.observe(video);
      }

      desktopQuery.addEventListener && desktopQuery.addEventListener("change", function () {
        if (!desktopQuery.matches) stop();
      });

      if (!desktopQuery.matches) stop();
    })();
;

/* Original inline block 17 */
(function methodMasterAmbientPlayback() {
      "use strict";

      var video = document.querySelector("#method .method-ambient-master");
      if (!video) return;

      var mobile = window.matchMedia("(max-width: 639px)");
      var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

      if (
        window.__PATO_INAPP_BROWSER__ === true ||
        mobile.matches ||
        reduced.matches
      ) {
        video.preload = "none";
        video.setAttribute("preload", "none");
        return;
      }

      var loaded = false;

      function play() {
        if (document.hidden) return;

        if (!loaded) {
          loaded = true;
          video.preload = "auto";
          video.setAttribute("preload", "auto");
          try { video.load(); } catch (e) {}
        }

        video.muted = true;
        var p;
        try { p = video.play(); } catch (e) {}
        if (p && typeof p.catch === "function") p.catch(function () {});
      }

      function pause() {
        try { video.pause(); } catch (e) {}
      }

      if ("IntersectionObserver" in window) {
        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && entry.intersectionRatio > .08) play();
            else pause();
          });
        }, {
          rootMargin: "220px 0px 220px 0px",
          threshold: [0, .08, .25]
        });

        observer.observe(video);
      } else {
        play();
      }

      document.addEventListener("visibilitychange", function () {
        if (document.hidden) pause();
        else {
          var rect = video.getBoundingClientRect();
          if (rect.bottom > -220 && rect.top < window.innerHeight + 220) play();
        }
      });
    })();
;
/* Caso aplicado: carga diferida y reproducción opcional en función de visibilidad. */
(function caseStudyPlayback() {
  "use strict";
  var video = document.querySelector("#caseMyWay .case-study-video");
  if (!video) return;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  function play() {
    if (document.hidden || reduced.matches) return;
    video.preload = "metadata";
    var p = video.play();
    if (p && typeof p.catch === "function") p.catch(function () {});
  }
  function pause() { try { video.pause(); } catch (e) {} }
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.15) play();
        else pause();
      });
    }, { threshold: [0, 0.15, 0.45] });
    observer.observe(video);
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) pause();
    else {
      var rect = video.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) play();
    }
  });
  if (reduced.addEventListener) reduced.addEventListener("change", function () {
    if (reduced.matches) pause();
  });
})();
