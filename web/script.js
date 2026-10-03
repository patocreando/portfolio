(() => {
  const header = document.getElementById("siteHeader");
  const progressBar = document.getElementById("progressBar");
  const mobileCta = document.querySelector(".mobile-cta");
  const year = document.getElementById("year");

  if (year) year.textContent = new Date().getFullYear();

  const onScroll = () => {
    const y = window.scrollY || document.documentElement.scrollTop;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(1, y / max) : 0;

    if (header) header.classList.toggle("scrolled", y > 18);
    if (progressBar) progressBar.style.transform = "scaleX(" + progress + ")";
    if (mobileCta) mobileCta.classList.toggle("visible", y > 420);
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const items = document.querySelectorAll("[data-reveal]");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    items.forEach(item => observer.observe(item));
  } else {
    items.forEach(item => item.classList.add("is-visible"));
  }

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", event => {
      const href = link.getAttribute("href");
      const target = href && document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
})();