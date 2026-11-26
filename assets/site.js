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
        ugc: "Ángulos con diálogo natural frente a cámara pensados para retención y prueba social en pauta.",
        product: "Demostraciones sensoriales con fidelidad de envase, materiales e iluminación de estudio."
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
          var show = selected === "all" || item.getAttribute("data-category") === selected;

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
        if (window.UnifiedPlayer) window.UnifiedPlayer.stopAll(null);
        if (window.ScrollRevealer) window.ScrollRevealer.syncSnapMeters();
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

      // Service cards open the corresponding project tab before native anchor navigation.
      // Keep regular anchor links so keyboard users and browsers without JS still reach the gallery.
      document.querySelectorAll(".service-example-link[data-service-filter]").forEach(function (link) {
        link.addEventListener("click", function () {
          var selected = link.getAttribute("data-service-filter");
          var targetTab = tabButtons.find(function (tab) {
            return tab.getAttribute("data-filter") === selected;
          });
          if (targetTab) targetTab.click();
        });
      });

      showCategory("product");

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
          if (heroPhone.querySelector(".is-playing")) {
            heroPhone.style.transform = "";
            return;
          }
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

        var subjectName = name.replace(/[\r\n\t]/g, " ").replace(/\s+/g, " ").slice(0, 80);
        var subject = "Consulta portfolio — " + (subjectName || "nuevo proyecto");
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

        if (provider === "default") {
          url = "mailto:" + mail.to + "?subject=" + subject + "&body=" + body;
        } else if (provider === "gmail") {
          url = "https://mail.google.com/mail/?view=cm&fs=1&to=" + to + "&su=" + subject + "&body=" + body;
        } else if (provider === "outlook") {
          url = "https://outlook.live.com/mail/0/deeplink/compose?to=" + to + "&subject=" + subject + "&body=" + body;
        } else if (provider === "yahoo") {
          url = "https://compose.mail.yahoo.com/?to=" + to + "&subject=" + subject + "&body=" + body;
        }

        if (url) {
          if (provider === "default") {
            window.location.href = url;
          } else {
            window.open(url, "_blank", "noopener,noreferrer");
          }
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
            credentials: "omit",
            cache: "no-store",
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
          .then(function (data) {
            // FormSubmit can return HTTP 200 with success: "false".
            // Never tell a potential client their enquiry arrived unless accepted.
            if (!data || (data.success !== true && data.success !== "true")) {
              throw new Error("submit_not_accepted");
            }
            showFormStatus(
              "success",
              "Consulta enviada",
              "Recibí tu mensaje. Te respondo al correo que dejaste."
            );

            if (submitLabel) submitLabel.textContent = "Consulta enviada";
            contactForm.reset();
            toggleMailProviderPicker(false);

            window.setTimeout(function () {
              if (submitLabel) submitLabel.textContent = "Enviar consulta";
            }, 2800);
          })
          .catch(function () {
            showFormStatus(
              "error",
              "No pude enviar la consulta",
              "Podés abrir el mensaje en Gmail, Outlook o Yahoo y enviarlo desde tu cuenta."
            );

            if (submitLabel) submitLabel.textContent = "Enviar consulta";
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
          ease: "power3.out",
          clearProps: "transform,opacity,visibility"
        });

        // Coordinated reveal system: delegated to ScrollRevealer when loaded so transforms are strictly cleaned up
        var fastMobile = window.matchMedia("(max-width: 639px)").matches;
        if (!window.ScrollRevealer) {

        var majorTitles = gsap.utils.toArray([
          "#top .hero-lockup-title",
          "#projects h2",
          "#services .services-title",
          "#pricingTitle",
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
          "#projects .project-intro-copy",
          "#projects [role='tablist']",
          "#categoryDescription",
          "#projects .project-meet-cta",
          "#services .services-label",
          "#services .services-copy",
          ".pricing-packs-meta",
          ".pricing-packs-head > p",
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
          "#projects .project-intro-card",
          "#services .service-card",
          ".pricing-pack",
          ".club-workflow",
          ".direction-principle",
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
        }

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

      var video = document.querySelector("#method .method-brief-ambient");
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