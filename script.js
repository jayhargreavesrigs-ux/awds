document.addEventListener("DOMContentLoaded", () => {
  const scrollGauge = document.getElementById("scrollGauge");
  const backToTop = document.getElementById("backToTop");
  const sections = document.querySelectorAll("main section[id]");
  const navLinks = document.querySelectorAll(".site-nav a[href^='#']");
  const revealEls = document.querySelectorAll(".reveal, .reveal-item");
  const navToggle = document.getElementById("navToggle");
  const siteNav = document.getElementById("siteNav");

  const contactForm = document.getElementById("contactForm");
  const formStatus = document.getElementById("formStatus");
  const contactSubmitBtn = document.getElementById("contactSubmitBtn");

  const toast = document.getElementById("toast");
  const toastIcon = document.getElementById("toastIcon");
  const toastMessage = document.getElementById("toastMessage");

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const EMAILJS_SERVICE_ID = "YOUR_SERVICE_ID";
  const EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID";
  const EMAILJS_PUBLIC_KEY = "YOUR_PUBLIC_KEY";

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const animateCountUp = (el, target) => {
    if (!el || el.dataset.counted === "true") return;

    const duration = 1300;
    const start = 0;
    const startTime = performance.now();

    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const value = Math.floor(
        start + (target - start) * easeOutCubic(progress),
      );
      el.textContent = value >= 100 ? `${value}+` : `${value}`;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.dataset.counted = "true";
      }
    };

    requestAnimationFrame(step);
  };

  const updateScrollGauge = () => {
    if (!scrollGauge) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const height =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;
    const progress = height > 0 ? (scrollTop / height) * 100 : 0;
    scrollGauge.style.width = `${progress}%`;
  };

  const setActiveNav = () => {
    const navSectionIds = Array.from(navLinks)
      .map((link) => link.getAttribute("href"))
      .filter((href) => href && href.startsWith("#"))
      .map((href) => href.slice(1));

    let currentId = navSectionIds[0] || "";

    navSectionIds.forEach((id) => {
      const section = document.getElementById(id);
      if (!section) return;

      const top = section.offsetTop - 140;
      if (window.scrollY >= top) {
        currentId = id;
      }
    });

    navLinks.forEach((link) => {
      link.classList.toggle(
        "active",
        link.getAttribute("href") === `#${currentId}`,
      );
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("visible");

        const counters = entry.target.querySelectorAll("[data-count]");
        counters.forEach((counter) => {
          const target = Number(counter.dataset.count || "0");
          animateCountUp(counter, target);
        });
      });
    },
    { threshold: 0.14 },
  );

  revealEls.forEach((el) => observer.observe(el));

  const smoothScrollTo = (target) => {
    const offset = 84;
    const top =
      target.getBoundingClientRect().top + window.pageYOffset - offset;

    window.scrollTo({
      top,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#")) return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      smoothScrollTo(target);

      siteNav?.classList.remove("open");
      navToggle?.setAttribute("aria-expanded", "false");
      if (navToggle) navToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
    });
  });

  navToggle?.addEventListener("click", () => {
    const expanded = siteNav?.classList.toggle("open") ?? false;
    navToggle.setAttribute("aria-expanded", String(expanded));
    navToggle.innerHTML = expanded
      ? '<i class="fa-solid fa-xmark"></i>'
      : '<i class="fa-solid fa-bars"></i>';
  });

  window.addEventListener("scroll", () => {
    updateScrollGauge();
    setActiveNav();

    if (backToTop) {
      backToTop.classList.toggle("show", window.scrollY > 500);
    }
  });

  window.addEventListener("resize", updateScrollGauge);
  updateScrollGauge();
  setActiveNav();

  backToTop?.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  });

  const carouselRoot = document.querySelector("[data-carousel]");
  if (carouselRoot) {
    const track = carouselRoot.querySelector(".carousel-track");
    const slides = Array.from(carouselRoot.querySelectorAll(".carousel-slide"));
    const prevBtn = carouselRoot.querySelector(".carousel-btn.prev");
    const nextBtn = carouselRoot.querySelector(".carousel-btn.next");
    const dotsWrap = carouselRoot.querySelector(".carousel-dots");

    let index = 0;
    let timer = null;

    const updateCarousel = () => {
      if (!track) return;

      track.style.transform = `translateX(-${index * 100}%)`;

      if (dotsWrap) {
        [...dotsWrap.children].forEach((dot, dotIndex) => {
          dot.classList.toggle("active", dotIndex === index);
        });
      }
    };

    const goToSlide = (newIndex) => {
      index = (newIndex + slides.length) % slides.length;
      updateCarousel();
    };

    const nextSlide = () => goToSlide(index + 1);
    const prevSlide = () => goToSlide(index - 1);

    const renderDots = () => {
      if (!dotsWrap) return;

      dotsWrap.innerHTML = "";
      slides.forEach((_, dotIndex) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("aria-label", `Go to slide ${dotIndex + 1}`);
        dot.className = dotIndex === index ? "active" : "";
        dot.addEventListener("click", () => {
          goToSlide(dotIndex);
          restartAutoplay();
        });
        dotsWrap.appendChild(dot);
      });
    };

    const startAutoplay = () => {
      if (prefersReducedMotion || slides.length <= 1) return;
      timer = window.setInterval(nextSlide, 6500);
    };

    const stopAutoplay = () => {
      if (timer) window.clearInterval(timer);
      timer = null;
    };

    const restartAutoplay = () => {
      stopAutoplay();
      startAutoplay();
    };

    renderDots();
    updateCarousel();
    startAutoplay();

    prevBtn?.addEventListener("click", () => {
      prevSlide();
      restartAutoplay();
    });

    nextBtn?.addEventListener("click", () => {
      nextSlide();
      restartAutoplay();
    });

    carouselRoot.addEventListener("mouseenter", stopAutoplay);
    carouselRoot.addEventListener("mouseleave", startAutoplay);
    carouselRoot.addEventListener("focusin", stopAutoplay);
    carouselRoot.addEventListener("focusout", startAutoplay);

    window.addEventListener("keydown", (e) => {
      const isFocusedInsideCarousel =
        document.activeElement?.closest?.("[data-carousel]") != null;
      if (!carouselRoot.matches(":hover") && !isFocusedInsideCarousel) return;

      if (e.key === "ArrowLeft") {
        prevSlide();
        restartAutoplay();
      }

      if (e.key === "ArrowRight") {
        nextSlide();
        restartAutoplay();
      }
    });
  }

  const chartBaseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#d6e1ea",
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      tooltip: {
        backgroundColor: "rgba(6, 12, 18, 0.95)",
        titleColor: "#fff",
        bodyColor: "#dbe6f1",
        borderColor: "rgba(245, 158, 11, 0.35)",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: "#9eb0c2" },
        grid: { color: "rgba(255,255,255,0.06)" },
      },
      y: {
        ticks: { color: "#9eb0c2" },
        grid: { color: "rgba(255,255,255,0.06)" },
      },
    },
  };

  const afeCtx = document.getElementById("afeChart");
  if (afeCtx) {
    new Chart(afeCtx, {
      type: "bar",
      data: {
        labels: [
          "Rig & Spread",
          "Drilling Services",
          "Completion Equipment",
          "Logistics & Marine",
          "Contingency",
        ],
        datasets: [
          {
            label: "AFE Budget",
            data: [2800000, 1500000, 1200000, 600000, 610000],
            backgroundColor: "rgba(245, 158, 11, 0.85)",
            borderRadius: 10,
          },
          {
            label: "Actual",
            data: [2650000, 1420000, 1180000, 580000, 120000],
            backgroundColor: "rgba(59, 130, 246, 0.85)",
            borderRadius: 10,
          },
        ],
      },
      options: chartBaseOptions,
    });
  }

  const costMixCtx = document.getElementById("costMixChart");
  if (costMixCtx) {
    new Chart(costMixCtx, {
      type: "doughnut",
      data: {
        labels: [
          "Rig & Spread",
          "Drilling Services",
          "Completion Equipment",
          "Logistics & Marine",
          "Contingency",
        ],
        datasets: [
          {
            data: [2800000, 1500000, 1200000, 600000, 610000],
            backgroundColor: [
              "rgba(245, 158, 11, 0.9)",
              "rgba(249, 115, 22, 0.9)",
              "rgba(59, 130, 246, 0.9)",
              "rgba(16, 185, 129, 0.9)",
              "rgba(168, 85, 247, 0.9)",
            ],
            borderColor: "#0b1118",
            borderWidth: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#d6e1ea",
              padding: 16,
            },
          },
        },
      },
    });
  }

  const nptCtx = document.getElementById("nptChart");
  if (nptCtx) {
    new Chart(nptCtx, {
      type: "bar",
      data: {
        labels: [
          "DWOP Alignment",
          "Rig-Site Authority",
          "Vendor KPIs",
          "Fishing Readiness",
          "Sand Control QA/QC",
        ],
        datasets: [
          {
            label: "Operational Focus",
            data: [95, 90, 88, 92, 89],
            backgroundColor: "rgba(245, 158, 11, 0.8)",
            borderRadius: 10,
          },
        ],
      },
      options: {
        ...chartBaseOptions,
        scales: {
          x: {
            ticks: { color: "#9eb0c2" },
            grid: { color: "rgba(255,255,255,0.06)" },
          },
          y: {
            min: 0,
            max: 100,
            ticks: {
              color: "#9eb0c2",
              callback: (value) => `${value}%`,
            },
            grid: { color: "rgba(255,255,255,0.06)" },
          },
        },
      },
    });
  }

  const showToast = (message, type = "success") => {
    if (!toast || !toastIcon || !toastMessage) return;

    toastMessage.textContent = message;
    toast.classList.remove("success", "error", "hidden");
    toast.classList.add(type);

    toastIcon.className =
      type === "success"
        ? "fa-solid fa-circle-check"
        : "fa-solid fa-circle-exclamation";

    requestAnimationFrame(() => toast.classList.add("show"));

    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.classList.add("hidden"), 280);
    }, 3500);
  };

  const setContactButtonLoading = (isLoading) => {
    if (!contactSubmitBtn) return;

    const icon = contactSubmitBtn.querySelector("i");
    const text = contactSubmitBtn.querySelector("span");

    contactSubmitBtn.disabled = isLoading;
    contactSubmitBtn.classList.toggle("is-loading", isLoading);
    contactSubmitBtn.setAttribute("aria-busy", String(isLoading));

    if (icon) {
      icon.className = isLoading
        ? "fa-solid fa-spinner fa-spin"
        : "fa-solid fa-paper-plane";
    }

    if (text) {
      text.textContent = isLoading ? "Sending..." : "Send Message";
    }
  };

  if (typeof emailjs === "undefined") {
    console.warn("EmailJS SDK not loaded.");
    if (formStatus) {
      formStatus.textContent = "Email service unavailable.";
      formStatus.style.color = "#fca5a5";
    }
  } else {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  }
  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (typeof emailjs === "undefined") {
        showToast("Email service is not available.", "error");
        return;
      }
      try {
        setContactButtonLoading(true);

        await emailjs.sendForm(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          contactForm,
        );

        contactForm.reset();
        showToast("Message sent successfully.", "success");
      } catch (error) {
        console.error("EmailJS error:", error);
        showToast("Failed to send message. Please try again.", "error");
      } finally {
        setContactButtonLoading(false);
      }
    });
  }
});
