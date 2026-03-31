// // SCROLL GAUGE
// window.onscroll = () => {
//   let scrollTop = document.documentElement.scrollTop;
//   let height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
//   let scrolled = (scrollTop / height) * 100;
//   document.getElementById("scrollGauge").style.width = scrolled + "%";
// };

// // CONTACT FORM (EMAILJS READY)
// document.getElementById("contactForm").addEventListener("submit", function(e) {
//   e.preventDefault();

//   let name = document.getElementById("name").value;
//   let email = document.getElementById("email").value;
//   let message = document.getElementById("message").value;

//   // OPTION 1: EmailJS (RECOMMENDED)
//   /*
//   emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", {
//     from_name: name,
//     from_email: email,
//     message: message
//   }).then(() => {
//     alert("Message sent successfully!");
//   }, (err) => {
//     alert("Failed to send message.");
//   });
//   */

//   // TEMPORARY (TEST)
//   alert("Message sent (demo only). Integrate EmailJS or backend.");
// });



// // SCROLL GAUGE
// window.addEventListener("scroll", () => {
//   let scrollTop = document.documentElement.scrollTop;
//   let height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
//   document.getElementById("scrollGauge").style.width =
//     (scrollTop / height) * 100 + "%";
// });

// // SCROLL REVEAL
// const reveals = document.querySelectorAll(".reveal");

// window.addEventListener("scroll", () => {
//   reveals.forEach(el => {
//     let top = el.getBoundingClientRect().top;
//     if (top < window.innerHeight - 100) {
//       el.classList.add("active");
//     }
//   });
// });

// // NAV ACTIVE LINK
// const sections = document.querySelectorAll("section");
// const navLinks = document.querySelectorAll("nav a");

// window.addEventListener("scroll", () => {
//   let current = "";

//   sections.forEach(section => {
//     let sectionTop = section.offsetTop;
//     if (scrollY >= sectionTop - 200) {
//       current = section.getAttribute("id");
//     }
//   });

//   navLinks.forEach(link => {
//     link.classList.remove("active");
//     if (link.getAttribute("href") === "#" + current) {
//       link.classList.add("active");
//     }
//   });
// });

// // CONTACT FORM
// document.getElementById("contactForm").addEventListener("submit", function(e) {
//   e.preventDefault();
//   alert("Integrate EmailJS or backend to send message.");
// });


document.addEventListener("DOMContentLoaded", () => {
  const scrollGauge = document.getElementById("scrollGauge");
  const sections = document.querySelectorAll("main section[id]");
  const navLinks = document.querySelectorAll(".site-nav a");
  const revealEls = document.querySelectorAll(".reveal, .reveal-item");
  const navToggle = document.getElementById("navToggle");
  const siteNav = document.getElementById("siteNav");
  const contactForm = document.getElementById("contactForm");
  const formStatus = document.getElementById("formStatus");

  const updateScrollGauge = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = height > 0 ? (scrollTop / height) * 100 : 0;
    scrollGauge.style.width = `${progress}%`;
  };

  const setActiveNav = () => {
    let currentId = "";

    sections.forEach((section) => {
      const top = section.offsetTop - 120;
      if (window.scrollY >= top) currentId = section.id;
    });

    navLinks.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${currentId}`;
      link.classList.toggle("active", isActive);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("visible");
      });
    },
    { threshold: 0.14 }
  );
  

  revealEls.forEach((el) => observer.observe(el));

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;

      e.preventDefault();
      const offset = 84;
      const top = target.getBoundingClientRect().top + window.pageYOffset - offset;

      window.scrollTo({
        top,
        behavior: "smooth",
      });

      siteNav.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
    });
  });

  navToggle.addEventListener("click", () => {
    const expanded = siteNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(expanded));
    navToggle.innerHTML = expanded
      ? '<i class="fa-solid fa-xmark"></i>'
      : '<i class="fa-solid fa-bars"></i>';
  });

  window.addEventListener("scroll", () => {
    updateScrollGauge();
    setActiveNav();
  });

  window.addEventListener("resize", updateScrollGauge);

  updateScrollGauge();
  setActiveNav();

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
        labels: ["Rig & Spread", "Drilling Services", "Completion Equipment", "Logistics & Marine", "Contingency"],
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
      options: {
        ...chartBaseOptions,
        plugins: {
          ...chartBaseOptions.plugins,
          legend: {
            labels: { color: "#d6e1ea" },
          },
        },
      },
    });
  }

  const costMixCtx = document.getElementById("costMixChart");
  if (costMixCtx) {
    new Chart(costMixCtx, {
      type: "doughnut",
      data: {
        labels: ["Rig & Spread", "Drilling Services", "Completion Equipment", "Logistics & Marine", "Contingency"],
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
        labels: ["DWOP Alignment", "Rig-Site Authority", "Vendor KPIs", "Fishing Readiness", "Sand Control QA/QC"],
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

  const sendContact = async (payload) => {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || "Failed to send message.");
    }

    return response.json().catch(() => ({}));
  };

  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const payload = {
        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim(),
        subject: document.getElementById("subject").value.trim(),
        message: document.getElementById("message").value.trim(),
      };

      if (!payload.name || !payload.email || !payload.subject || !payload.message) {
        formStatus.textContent = "Please complete all fields.";
        formStatus.style.color = "#fca5a5";
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
        formStatus.textContent = "Sending message...";
        formStatus.style.color = "#9eb0c2";

        await sendContact(payload);

        contactForm.reset();
        formStatus.textContent = "Message sent successfully.";
        formStatus.style.color = "#86efac";
      } catch (error) {
        formStatus.textContent =
          "Message could not be sent yet. Connect the /api/contact endpoint or plug in EmailJS.";
        formStatus.style.color = "#fca5a5";
        console.error(error);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Message';
      }
    });
  }
});