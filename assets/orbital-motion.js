(() => {
  "use strict";

  const system = document.getElementById("system");
  if (!system) return;

  const orbitals = Array.from(system.querySelectorAll(".pc-flow-visual-orbit, .pc-avatar-symbol"));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!orbitals.length) return;

  if ("IntersectionObserver" in window) {
    const entranceObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-inview");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });

    orbitals.forEach((orbital) => entranceObserver.observe(orbital));
  }

  if (reduceMotion) return;

  const setProgress = (progress) => {
    const value = Math.max(0, Math.min(1, progress));
    orbitals.forEach((orbital) => orbital.style.setProperty("--pc-orbit-progress", value.toFixed(3)));
  };

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.create({
      trigger: system,
      start: "top bottom",
      end: "bottom top",
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => setProgress(self.progress)
    });
    return;
  }

  let scheduled = false;
  const updateFromScroll = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const rect = system.getBoundingClientRect();
      setProgress((window.innerHeight - rect.top) / (window.innerHeight + rect.height));
    });
  };
  window.addEventListener("scroll", updateFromScroll, { passive: true });
  window.addEventListener("resize", updateFromScroll, { passive: true });
  updateFromScroll();
})();
