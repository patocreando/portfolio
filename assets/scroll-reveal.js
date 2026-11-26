/* Progressive scroll choreography, scroll-connected step trackers (Flujo 01-03 & Colaboración 01-03),
   animated capacity meter, platform detection (Android / iOS) & mobile scroll-snap meters.
   GPU-safe: never touches .up-slot, #heroPhone or video hosts, and clears transform on transitionend. */
(function (window, document) {
  "use strict";

  var ua = navigator.userAgent || "";
  var isAndroid = /Android/i.test(ua);
  var isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isAndroid) document.documentElement.classList.add("is-android");
  if (isIOS) document.documentElement.classList.add("is-ios");

  var reducedMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function isVideoUnsafe(el) {
    if (!el) return true;
    if (el.matches("[data-up-slot], #heroPhone, .hero-device-wrap, .editorial-media, .phone-shell, .clean-media-frame, .club-workflow-screen")) {
      return true;
    }
    if (el.closest("[data-up-slot], #heroPhone, .hero-device-wrap, .club-workflow-screen")) {
      return true;
    }
    if (el.querySelector("[data-up-slot]")) {
      return true;
    }
    return false;
  }

  function collectTargets() {
    var selectors = [
      "#projects .editorial-intro",
      "#projects .editorial-content",
      "#projects .project-meet-cta",
      "#caseMyWay .club-case-head",
      "#compare .pc-compare-sticky",
      "#compare .pc-pillar-card",
      "#compare .pc-compare-card",
      "#services .services-intro",
      "#services .service-card",
      "#launchOffer .pricing-packs-head",
      "#launchOffer .pc-capacity-meter",
      "#launchOffer .pricing-preproduction",
      "#launchOffer .pricing-pack",
      "#system .studio-system-head",
      "#system .studio-system-panel",
      "#system .pc-flow-card",
      "#system .pc-avatar-showcase",
      "#method .pc-method-heading",
      "#method .pc-method-track > article",
      "#method .pc-method-bottom",
      "#contact .contact-brief-guide",
      "#contact .contact-socials",
      "#contactForm"
    ];
    var nodes = document.querySelectorAll(selectors.join(","));
    var safe = [];
    for (var i = 0; i < nodes.length; i += 1) {
      if (!isVideoUnsafe(nodes[i])) safe.push(nodes[i]);
    }
    return safe;
  }

  function finalizeElement(el) {
    if (!el || el.classList.contains("sr-done")) return;
    el.classList.add("is-visible");
    el.classList.add("sr-done");
    el.style.removeProperty("--sr-delay");
    el.style.transform = "";
    el.style.webkitTransform = "";
  }

  function initScrollReveal() {
    var targets = collectTargets();
    var capacityMeters = document.querySelectorAll("[data-capacity-meter]");

    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      for (var i = 0; i < targets.length; i += 1) finalizeElement(targets[i]);
      for (var c = 0; c < capacityMeters.length; c += 1) capacityMeters[c].classList.add("is-animated");
      return;
    }

    if (targets.length) {
      document.documentElement.classList.add("sr-ready");
      var parentCounts = new WeakMap();
      for (var j = 0; j < targets.length; j += 1) {
        var el = targets[j];
        el.classList.add("sr-item");
        var parent = el.parentElement;
        var idx = parent ? (parentCounts.get(parent) || 0) : 0;
        if (parent) parentCounts.set(parent, idx + 1);
        var delayMs = Math.min(idx % 4, 3) * 75;
        if (delayMs > 0) el.style.setProperty("--sr-delay", delayMs + "ms");

        el.addEventListener("transitionend", function onEnd(event) {
          if (event.target !== this) return;
          this.removeEventListener("transitionend", onEnd);
          finalizeElement(this);
        });
      }

      var observer = new IntersectionObserver(function (entries) {
        for (var k = 0; k < entries.length; k += 1) {
          var entry = entries[k];
          if (!entry.isIntersecting) continue;
          var item = entry.target;
          observer.unobserve(item);
          item.classList.add("is-visible");
          if (item.hasAttribute("data-capacity-meter")) {
            item.classList.add("is-animated");
          }
          (function (node) {
            window.setTimeout(function () {
              finalizeElement(node);
            }, 920);
          })(item);
        }
      }, { rootMargin: "0px 0px -6% 0px", threshold: 0.08 });

      for (var m = 0; m < targets.length; m += 1) {
        observer.observe(targets[m]);
      }
    }

    if (capacityMeters.length) {
      var capObs = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i += 1) {
          if (entries[i].isIntersecting) {
            entries[i].target.classList.add("is-animated");
            capObs.unobserve(entries[i].target);
          }
        }
      }, { threshold: 0.25 });
      for (var cm = 0; cm < capacityMeters.length; cm += 1) {
        capObs.observe(capacityMeters[cm]);
      }
    }
  }

  /* Scroll-connected step progression for FLUJO PROPIO / 01-03 & COLABORACIÓN / 01-03 + subtle safe orb parallax */
  function initScrollAccompaniment() {
    var bar = document.getElementById("scrollProgress");
    var flowTrack = document.querySelector("[data-flow-track]");
    var flowCards = flowTrack
      ? Array.prototype.slice.call(flowTrack.querySelectorAll("[data-flow-step]"))
      : [];
    var flowStatus = document.querySelector("[data-flow-active-index]");
    var manualFlowIdx = -1;

    var methodTrack = document.querySelector("#method .pc-method-track");
    var methodCards = methodTrack
      ? Array.prototype.slice.call(methodTrack.querySelectorAll("article"))
      : [];

    var decorativeOrbs = (!reducedMotion.matches && !isAndroid)
      ? Array.prototype.slice.call(document.querySelectorAll(".hero-orb-a, .hero-orb-b, .services-orb-a"))
      : [];

    function setFlowActive(idx, progressPct) {
      if (!flowTrack || !flowCards.length) return;
      for (var i = 0; i < flowCards.length; i += 1) {
        flowCards[i].classList.toggle("is-step-active", i === idx);
      }
      if (flowStatus) flowStatus.textContent = "0" + (idx + 1) + " / 03";
      flowTrack.style.setProperty("--track-progress", progressPct.toFixed(1) + "%");
    }

    for (var f = 0; f < flowCards.length; f += 1) {
      (function (idx) {
        flowCards[idx].addEventListener("click", function () {
          manualFlowIdx = idx;
          setFlowActive(idx, ((idx + 1) / flowCards.length) * 100);
        });
        flowCards[idx].addEventListener("mouseenter", function () {
          if (window.innerWidth >= 1024) {
            manualFlowIdx = idx;
            setFlowActive(idx, ((idx + 1) / flowCards.length) * 100);
          }
        });
      })(f);
    }

    var rafPending = false;
    function onFrame() {
      rafPending = false;
      var vh = Math.max(1, window.innerHeight);

      if (bar) {
        var doc = document.documentElement;
        var max = Math.max(1, doc.scrollHeight - vh);
        var pct = clamp((window.scrollY / max) * 100, 0, 100);
        bar.style.width = pct.toFixed(2) + "%";
      }

      /* Scroll-driven step highlight for FLUJO PROPIO / 01-03 */
      if (flowTrack && flowCards.length === 3) {
        var fRect = flowTrack.getBoundingClientRect();
        if (fRect.bottom < 0 || fRect.top > vh) {
          manualFlowIdx = -1;
        } else if (manualFlowIdx < 0) {
          var fRatio = clamp((vh * 0.68 - fRect.top) / Math.max(1, fRect.height * 0.85), 0, 1);
          var fIdx = fRatio < 0.36 ? 0 : (fRatio < 0.72 ? 1 : 2);
          var fPct = clamp(fRatio * 100, 18, 100);
          setFlowActive(fIdx, fPct);
        }
      }

      /* Scroll-driven step highlight & connector line for COLABORACIÓN / 01-03 */
      if (methodTrack && methodCards.length === 3) {
        var mRect = methodTrack.getBoundingClientRect();
        var mRatio = clamp((vh * 0.66 - mRect.top) / Math.max(1, mRect.height * 0.88), 0, 1);
        var mIdx = mRatio < 0.35 ? 0 : (mRatio < 0.70 ? 1 : 2);
        methodTrack.style.setProperty("--method-progress", (mRatio * 100).toFixed(1) + "%");
        for (var m = 0; m < methodCards.length; m += 1) {
          methodCards[m].classList.toggle("is-step-active", m === mIdx);
        }
      }

      /* Subtle parallax ONLY on purely decorative background orbs (desktop/tablet/iOS) */
      if (decorativeOrbs.length && window.innerWidth >= 768) {
        var sy = window.scrollY;
        for (var o = 0; o < decorativeOrbs.length; o += 1) {
          var speed = o % 2 === 0 ? 0.035 : -0.028;
          var dy = clamp(sy * speed, -42, 42);
          decorativeOrbs[o].style.transform = "translate3d(0," + dy.toFixed(1) + "px,0)";
        }
      }
    }

    window.addEventListener("scroll", function () {
      if (!rafPending) {
        rafPending = true;
        window.requestAnimationFrame(onFrame);
      }
    }, { passive: true });
    window.addEventListener("resize", function () {
      if (!rafPending) {
        rafPending = true;
        window.requestAnimationFrame(onFrame);
      }
    }, { passive: true });
    onFrame();

    /* Active nav section highlighting */
    var navLinks = Array.prototype.slice.call(
      document.querySelectorAll(".portfolio-nav-links a[href^='#'], .portfolio-mobile-menu-links a[href^='#']")
    );
    if (!("IntersectionObserver" in window) || !navLinks.length) return;

    var sectionToNav = {
      top: "",
      projects: "#projects",
      caseMyWay: "#projects",
      compare: "#services",
      services: "#services",
      launchOffer: "#launchOffer",
      system: "#system",
      method: "#system",
      contact: "#contact"
    };

    function setActiveHref(href) {
      for (var i = 0; i < navLinks.length; i += 1) {
        var a = navLinks[i];
        var match = Boolean(href) && a.getAttribute("href") === href;
        a.classList.toggle("is-active-nav", match);
        if (match) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      }
    }

    var secObserver = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i += 1) {
        if (entries[i].isIntersecting) {
          var id = entries[i].target.id;
          if (Object.prototype.hasOwnProperty.call(sectionToNav, id)) {
            setActiveHref(sectionToNav[id]);
          }
        }
      }
    }, { rootMargin: "-32% 0px -52% 0px", threshold: 0 });

    var sections = document.querySelectorAll("main > section[id], #launchOffer");
    for (var s = 0; s < sections.length; s += 1) {
      secObserver.observe(sections[s]);
    }
  }

  function bindSnapRail(rail, meter, getItems, onSlideChange) {
    if (!rail || !meter) return null;
    var countEl = meter.querySelector("[data-snap-count]");
    var pills = Array.prototype.slice.call(meter.querySelectorAll("[data-snap-goto]"));

    function sync() {
      var items = getItems();
      if (!items.length) return;
      var railRect = rail.getBoundingClientRect();
      var center = railRect.left + railRect.width / 2;
      var bestIdx = 0;
      var bestDist = Infinity;
      for (var i = 0; i < items.length; i += 1) {
        var r = items[i].getBoundingClientRect();
        var c = r.left + r.width / 2;
        var d = Math.abs(c - center);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      if (countEl) countEl.textContent = (bestIdx + 1) + " / " + items.length;
      for (var p = 0; p < pills.length; p += 1) {
        var active = p === bestIdx;
        pills[p].classList.toggle("is-active", active);
        pills[p].setAttribute("aria-pressed", String(active));
      }
      if (onSlideChange) onSlideChange(bestIdx, items);
    }

    for (var p = 0; p < pills.length; p += 1) {
      (function (idx) {
        pills[idx].addEventListener("click", function () {
          var items = getItems();
          var target = items[idx];
          if (!target) return;
          var left = target.offsetLeft - Math.max(0, (rail.clientWidth - target.offsetWidth) / 2);
          rail.scrollTo({ left: left, behavior: reducedMotion.matches ? "auto" : "smooth" });
        });
      })(p);
    }

    var ticking = false;
    rail.addEventListener("scroll", function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(function () {
          ticking = false;
          sync();
        });
      }
    }, { passive: true });

    window.addEventListener("resize", sync, { passive: true });
    sync();
    return sync;
  }

  var syncProjectsMeter = null;
  var syncPricingMeter = null;

  function initMobileSnapRails() {
    var projectGrid = document.getElementById("projectGrid");
    var projectMeter = document.querySelector("[data-snap-meter='projects']");
    var lastProjectIdx = 0;
    syncProjectsMeter = bindSnapRail(
      projectGrid,
      projectMeter,
      function () {
        return Array.prototype.slice.call(
          projectGrid.querySelectorAll(".project-item:not(.is-hidden)")
        );
      },
      function (idx) {
        if (idx !== lastProjectIdx) {
          lastProjectIdx = idx;
          if (window.UnifiedPlayer && window.innerWidth <= 767) {
            window.UnifiedPlayer.stopAll(null);
          }
        }
      }
    );

    var pricingRail = document.getElementById("pricingPackRail");
    var pricingMeter = document.querySelector("[data-snap-meter='pricing']");
    syncPricingMeter = bindSnapRail(
      pricingRail,
      pricingMeter,
      function () {
        return Array.prototype.slice.call(pricingRail.querySelectorAll(".pricing-pack"));
      },
      null
    );

    if (pricingRail && window.innerWidth <= 767) {
      window.requestAnimationFrame(function () {
        var packs = pricingRail.querySelectorAll(".pricing-pack");
        var best = packs[2] || packs[1];
        if (best) {
          pricingRail.scrollLeft = Math.max(0, best.offsetLeft - (pricingRail.clientWidth - best.offsetWidth) / 2);
          if (syncPricingMeter) syncPricingMeter();
        }
      });
    }
  }

  function boot() {
    initScrollReveal();
    initScrollAccompaniment();
    initMobileSnapRails();
  }

  window.ScrollRevealer = {
    syncSnapMeters: function () {
      var grid = document.getElementById("projectGrid");
      if (grid && window.innerWidth <= 767) grid.scrollLeft = 0;
      if (syncProjectsMeter) syncProjectsMeter();
      if (syncPricingMeter) syncPricingMeter();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window, document);
