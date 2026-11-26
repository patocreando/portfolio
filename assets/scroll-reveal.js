/* Progressive scroll choreography, reading progress, active nav & mobile scroll-snap meters.
   GPU-safe: never touches .up-slot, #heroPhone or video hosts, and clears transform on transitionend. */
(function (window, document) {
  "use strict";

  var reducedMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

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
      "#launchOffer .pricing-preproduction",
      "#launchOffer .pc-scarcity-banner",
      "#launchOffer .pricing-pack",
      "#system .studio-system-head",
      "#system .studio-system-panel",
      "#system .pc-flow",
      "#system .pc-avatar-brief",
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
    if (!targets.length) return;

    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      for (var i = 0; i < targets.length; i += 1) {
        finalizeElement(targets[i]);
      }
      return;
    }

    document.documentElement.classList.add("sr-ready");

    /* Assign subtle 75ms stagger among sibling cards in the same parent grid. */
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
        /* Guaranteed transform cleanup even if transitionend is skipped in background tab. */
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

  function initProgressAndActiveNav() {
    var bar = document.getElementById("scrollProgress");
    var navLinks = Array.prototype.slice.call(
      document.querySelectorAll(".portfolio-nav-links a[href^='#'], .portfolio-mobile-menu-links a[href^='#']")
    );
    var rafPending = false;

    function updateProgress() {
      rafPending = false;
      if (!bar) return;
      var doc = document.documentElement;
      var max = Math.max(1, doc.scrollHeight - window.innerHeight);
      var pct = Math.min(100, Math.max(0, (window.scrollY / max) * 100));
      bar.style.width = pct.toFixed(2) + "%";
    }

    window.addEventListener("scroll", function () {
      if (!rafPending) {
        rafPending = true;
        window.requestAnimationFrame(updateProgress);
      }
    }, { passive: true });
    updateProgress();

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

    /* Start mobile pricing carousel centered on Campaña (index 2, recommended) or Multiformato?
       Starting on Campaña gives immediate visibility to the highest-ROI pack while letting users swipe left! */
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
    initProgressAndActiveNav();
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
