"use strict";

document.documentElement.classList.add("js");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const coarsePointer = window.matchMedia("(hover: none), (pointer: coarse)");
const gsapReady = Boolean(window.gsap && window.ScrollTrigger);

function prefersLiteVisuals() {
  const memory = navigator.deviceMemory;
  const cores = navigator.hardwareConcurrency;
  return reducedMotion.matches
    || navigator.connection?.saveData === true
    || coarsePointer.matches
    || window.innerWidth <= 850
    || (Number.isFinite(memory) && memory <= 4)
    || (Number.isFinite(cores) && cores <= 4);
}

function syncVisualMode() {
  document.documentElement.classList.toggle("lite-visuals", prefersLiteVisuals());
}

function afterFirstPaint(callback) {
  window.requestAnimationFrame(() => window.requestAnimationFrame(callback));
}

function whenIdle(callback, timeout = 2500) {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(callback, { timeout });
  } else {
    window.setTimeout(callback, 250);
  }
}

syncVisualMode();

if (gsapReady) {
  window.gsap.registerPlugin(window.ScrollTrigger);
  document.documentElement.classList.add("motion-ready");
}

/* Page chrome ------------------------------------------------------------- */
const header = document.getElementById("site-header");
const progressBar = document.getElementById("page-progress-bar");
const desktopNav = document.querySelector(".desktop-nav");
const desktopLinks = [...document.querySelectorAll(".desktop-nav a")];
const navIndicator = document.querySelector(".nav-indicator");
const sections = [...document.querySelectorAll("main section[id]")];
const signalSpineNodes = [...document.querySelectorAll(".signal-spine-node")];
const signalSpineSections = ["work", "lab", "journey", "evidence", "about", "contact"];
let pageChromeFrame = 0;
let activeDesktopLink = null;
let activeChromeSection = "";
let pageScrollable = 0;
let sectionMetrics = [];
const navMetrics = new Map();

function measurePageChrome() {
  pageScrollable = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  sectionMetrics = sections.map((section) => ({ id: section.id, top: section.offsetTop }));
  navMetrics.clear();
  desktopLinks.forEach((link) => {
    navMetrics.set(link, { x: link.offsetLeft - 4, width: link.offsetWidth });
  });
}

function moveNavIndicator(link, immediate = false) {
  if (!navIndicator || !desktopNav) return;
  if (!link || window.innerWidth <= 1120) {
    if (gsapReady && !reducedMotion.matches) {
      window.gsap.to(navIndicator, { opacity: 0, duration: immediate ? 0 : 0.2, overwrite: true });
    } else {
      navIndicator.style.opacity = "0";
    }
    return;
  }

  const metrics = navMetrics.get(link) || { x: link.offsetLeft - 4, width: link.offsetWidth };
  const state = {
    ...metrics,
    opacity: 1,
  };

  if (gsapReady && !reducedMotion.matches) {
    window.gsap.to(navIndicator, {
      ...state,
      duration: immediate ? 0 : 0.42,
      ease: "power3.out",
      overwrite: true,
    });
  } else {
    navIndicator.style.width = `${state.width}px`;
    navIndicator.style.transform = `translateX(${state.x}px)`;
    navIndicator.style.opacity = "1";
  }
}

function updatePageChrome() {
  const scrollTop = window.scrollY;

  header?.classList.toggle("scrolled", scrollTop > 24);
  if (progressBar) {
    const progress = pageScrollable > 0 ? Math.min(1, Math.max(0, scrollTop / pageScrollable)) : 0;
    progressBar.style.transform = `scaleX(${progress})`;
  }

  let current = "home";
  for (const section of sectionMetrics) {
    if (scrollTop >= section.top - window.innerHeight * 0.34) current = section.id;
  }

  if (current !== activeChromeSection) {
    const navCurrent = current === "evidence" ? "journey" : current;
    activeDesktopLink = null;
    desktopLinks.forEach((link) => {
      const isActive = link.hash === `#${navCurrent}`;
      link.classList.toggle("active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
        activeDesktopLink = link;
      } else {
        link.removeAttribute("aria-current");
      }
    });
    const spineIndex = signalSpineSections.indexOf(current);
    signalSpineNodes.forEach((node, index) => {
      node.classList.toggle("is-active", spineIndex < 0 ? index === 0 : index === spineIndex);
    });
    activeChromeSection = current;
    moveNavIndicator(activeDesktopLink);
  }
}

function requestPageChromeUpdate() {
  if (pageChromeFrame) return;
  pageChromeFrame = window.requestAnimationFrame(() => {
    pageChromeFrame = 0;
    updatePageChrome();
  });
}

window.addEventListener("scroll", requestPageChromeUpdate, { passive: true });
window.addEventListener("resize", () => {
  syncVisualMode();
  if (!prefersLiteVisuals()) {
    initMotionSystem();
    armLivingSystem();
  }
  measurePageChrome();
  activeChromeSection = "";
  requestPageChromeUpdate();
}, { passive: true });
desktopLinks.forEach((link) => link.addEventListener("pointerenter", () => moveNavIndicator(link)));
desktopNav?.addEventListener("pointerleave", () => moveNavIndicator(activeDesktopLink));
measurePageChrome();
updatePageChrome();

document.fonts?.ready.then(() => {
  measurePageChrome();
  activeChromeSection = "";
  updatePageChrome();
});

/* Mobile navigation ------------------------------------------------------- */
const menuButton = document.getElementById("menu-button");
const mobileMenu = document.getElementById("mobile-menu");
const pageMain = document.getElementById("main");
const mobileMenuLinks = [...(mobileMenu?.querySelectorAll("a") || [])];

function setMenu(open, restoreFocus = true) {
  if (!menuButton || !mobileMenu) return;
  menuButton.classList.toggle("active", open);
  mobileMenu.classList.toggle("open", open);
  document.body.classList.toggle("menu-open", open);
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  mobileMenu.setAttribute("aria-hidden", String(!open));
  pageMain?.toggleAttribute("inert", open);
  document.querySelector(".site-footer")?.toggleAttribute("inert", open);

  if (!open && restoreFocus && document.activeElement && mobileMenu.contains(document.activeElement)) {
    menuButton.focus({ preventScroll: true });
  }
}

menuButton?.addEventListener("click", () => {
  setMenu(menuButton.getAttribute("aria-expanded") !== "true");
});

mobileMenuLinks.forEach((link) => {
  link.addEventListener("click", () => setMenu(false, false));
});

document.addEventListener("keydown", (event) => {
  const menuIsOpen = menuButton?.getAttribute("aria-expanded") === "true";
  if (event.key === "Escape" && menuIsOpen) {
    event.preventDefault();
    setMenu(false);
    return;
  }

  if (event.key !== "Tab" || !menuIsOpen || !menuButton) return;
  const focusable = [menuButton, ...mobileMenuLinks];
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 1120) setMenu(false);
});

/* Motion system ----------------------------------------------------------- */
const reveals = [...document.querySelectorAll(".reveal")];
reveals.forEach((element) => element.classList.add("is-visible"));
let motionInitialized = false;

function initMotionSystem() {
  if (motionInitialized || !gsapReady || prefersLiteVisuals()) return;
  motionInitialized = true;

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const compactMotion = window.innerWidth <= 850;
  const signalType = document.querySelector("[data-signal-type]");
  const allTypeSlices = signalType
    ? gsap.utils.toArray(".signal-type__slice", signalType)
    : [];
  const typeSlices = compactMotion ? allTypeSlices.slice(0, 3) : allTypeSlices;
  const typeOffsets = [22, -18, 15, -12, 9, -7];
  const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });

  heroTimeline
    .from(".hero-display-title span", { yPercent: 85, autoAlpha: 0, duration: 1.15, stagger: 0.09 }, 0)
    .from(".hero-meta > span", { y: 16, autoAlpha: 0, duration: 0.65, stagger: 0.07 }, 0.16)
    .from(".hero-kicker", { y: 18, autoAlpha: 0, duration: 0.72 }, 0.27)
    .from(".hero-title", { y: 28, autoAlpha: 0, duration: 1.05 }, 0.32)
    .from(".hero-intro", { y: 24, autoAlpha: 0, duration: 0.75 }, 0.62)
    .from(".hero-actions", { y: 20, autoAlpha: 0, duration: 0.7 }, 0.72)
    .from(".system-label, .system-index", { x: 12, autoAlpha: 0, duration: 0.7, stagger: 0.08 }, 0.74)
    .from(".hero-proof > div", { y: 18, autoAlpha: 0, duration: 0.65, stagger: 0.08 }, 0.8)
    .from(".scroll-cue", { y: 12, autoAlpha: 0, duration: 0.55 }, 0.95);

  if (typeSlices.length) {
    heroTimeline.fromTo(typeSlices, {
      x: (index) => typeOffsets[index] * (compactMotion ? 0.35 : 1),
      y: (index) => (index % 2 ? 2 : -2),
      skewX: (index) => (index % 2 ? -6 : 5),
      autoAlpha: (index) => 0.52 - index * 0.035,
    }, {
      x: 0,
      y: 0,
      skewX: 0,
      autoAlpha: 0,
      duration: compactMotion ? 0.54 : 0.82,
      stagger: compactMotion ? 0.025 : 0.035,
      ease: "expo.out",
      clearProps: "transform,opacity,visibility",
    }, 0.4);
  }

  if (!compactMotion && finePointer.matches && signalType && typeSlices.length) {
    let lastTypePulse = 0;

    const pulseSignalType = (direction = 1) => {
      if (reducedMotion.matches || document.hidden) return;

      gsap.killTweensOf(typeSlices);
      gsap.fromTo(typeSlices, {
        x: (index) => typeOffsets[index] * 0.48 * direction,
        y: (index) => (index % 2 ? 1.5 : -1.5),
        skewX: (index) => (index % 2 ? -4 : 4) * direction,
        autoAlpha: 0.3,
      }, {
        x: 0,
        y: 0,
        skewX: 0,
        autoAlpha: 0,
        duration: 0.5,
        stagger: 0.018,
        ease: "power3.out",
        overwrite: true,
        clearProps: "transform,opacity,visibility",
      });
    };

    signalType.addEventListener("pointerenter", () => {
      lastTypePulse = performance.now();
      pulseSignalType(1);
    });

    signalType.addEventListener("pointermove", (event) => {
      const now = performance.now();
      if (now - lastTypePulse < 240) return;
      lastTypePulse = now;
      pulseSignalType(event.movementX < 0 ? -1 : 1);
    }, { passive: true });

    reducedMotion.addEventListener("change", (event) => {
      if (!event.matches) return;
      gsap.killTweensOf(allTypeSlices);
      gsap.set(allTypeSlices, { clearProps: "transform,opacity,visibility" });
    });
  }

  if (compactMotion) heroTimeline.timeScale(1.3);

  document.querySelectorAll(".section-heading, .about-heading, .contact-heading").forEach((heading) => {
    const title = heading.querySelector("h2");
    const supporting = heading.matches(".section-heading") ? heading.querySelector(":scope > p") : heading.querySelector(":scope > p:last-child");
    const labels = heading.querySelectorAll(".section-label");
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: heading,
        start: "top 78%",
        once: true,
      },
    });

    timeline
      .from(labels, { y: 14, autoAlpha: 0, duration: 0.5, ease: "power2.out" })
      .fromTo(title, {
        y: 68,
        autoAlpha: 0,
        clipPath: "inset(0 0 100% 0)",
      }, {
        y: 0,
        autoAlpha: 1,
        clipPath: "inset(0 0 0% 0)",
        duration: compactMotion ? 0.74 : 1.05,
        ease: "power4.out",
      }, 0.08);
    if (supporting) timeline.from(supporting, { y: 20, autoAlpha: 0, duration: compactMotion ? 0.48 : 0.7, ease: "power3.out" }, 0.42);
  });

  document.querySelectorAll(".case-study").forEach((study) => {
    const visual = study.querySelector(".project-visual");
    const details = study.querySelectorAll(".project-number, .project-heading > *, .project-story > *");
    gsap.timeline({
      scrollTrigger: {
        trigger: study,
        start: "top 76%",
        once: true,
      },
    })
      .fromTo(visual, {
        clipPath: "inset(0 0 100% 0 round 18px)",
        autoAlpha: 0.45,
      }, {
        clipPath: "inset(0 0 0% 0 round 18px)",
        autoAlpha: 1,
        duration: compactMotion ? 0.66 : 1.05,
        ease: "power4.inOut",
      })
      .from(details, { y: 28, autoAlpha: 0, duration: compactMotion ? 0.44 : 0.72, stagger: compactMotion ? 0.035 : 0.055, ease: "power3.out" }, compactMotion ? 0.34 : 0.56);
  });

  const aboutTimeline = gsap.timeline({
    scrollTrigger: { trigger: ".about-grid", start: "top 72%", once: true },
  });
  aboutTimeline
    .fromTo(".profile-frame", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1.05, ease: "power4.inOut" })
    .from(".profile-card figcaption", { y: 12, autoAlpha: 0, duration: 0.55 }, 0.62)
    .from(".about-copy > *", { y: 24, autoAlpha: 0, duration: 0.72, stagger: 0.08, ease: "power3.out" }, 0.48);

  [".ioai-panel", ".capabilities", ".project-archive", ".direct-contact"].forEach((selector) => {
    const target = document.querySelector(selector);
    if (!target) return;
    gsap.from(target, {
      y: 36,
      autoAlpha: 0,
      duration: 0.85,
      ease: "power3.out",
      scrollTrigger: { trigger: target, start: "top 82%", once: true },
    });
  });

  const labGrid = document.querySelector(".lab-grid");
  if (labGrid) {
    gsap.timeline({ scrollTrigger: { trigger: labGrid, start: "top 78%", once: true } })
      .fromTo(".lab-console", {
        clipPath: "inset(0 100% 0 0 round 12px)",
        autoAlpha: 0.45,
      }, {
        clipPath: "inset(0 0% 0 0 round 12px)",
        autoAlpha: 1,
        duration: 1,
        ease: "power4.inOut",
      })
      .from(".lab-tabs", { y: 18, autoAlpha: 0, duration: 0.55 }, 0.35)
      .from(".lab-panel.is-active > *", { y: 22, autoAlpha: 0, duration: 0.62, stagger: 0.07 }, 0.48);
  }

  const journeyRoute = document.querySelector(".journey-route");
  if (journeyRoute) {
    gsap.timeline({ scrollTrigger: { trigger: journeyRoute, start: "top 82%", once: true } })
      .from(".journey-route > *", { x: -14, autoAlpha: 0, duration: 0.55, stagger: 0.06, ease: "power3.out" })
      .from(".journey-step", { y: 34, autoAlpha: 0, duration: 0.72, stagger: 0.09, ease: "power3.out" }, 0.28);
  }

  const evidenceLedger = document.querySelector(".evidence-ledger");
  if (evidenceLedger) {
    gsap.from(".evidence-row", {
      y: 30,
      autoAlpha: 0,
      duration: 0.74,
      stagger: 0.08,
      ease: "power3.out",
      scrollTrigger: { trigger: evidenceLedger, start: "top 82%", once: true },
    });
  }

  gsap.from(".contact-form .form-row, .contact-form .form-submit", {
    y: 24,
    autoAlpha: 0,
    duration: 0.7,
    stagger: 0.07,
    ease: "power3.out",
    scrollTrigger: { trigger: ".contact-form", start: "top 80%", once: true },
  });

  const motionMedia = gsap.matchMedia();
  motionMedia.add("(min-width: 851px)", () => {
    const displayNames = document.querySelectorAll(".hero-display-title span");
    if (displayNames.length === 2) {
      gsap.to(displayNames[0], {
        xPercent: -7,
        ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 },
      });
      gsap.to(displayNames[1], {
        xPercent: 7,
        ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 },
      });
      gsap.to(".hero-grid", {
        backgroundPositionY: "8%",
        ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 },
      });
    }

    document.querySelectorAll(".case-study").forEach((study) => {
      const image = study.querySelector(".project-visual img");
      if (!image) return;
      gsap.fromTo(image, { "--scroll-y": "-18px" }, {
        "--scroll-y": "18px",
        ease: "none",
        scrollTrigger: { trigger: study, start: "top bottom", end: "bottom top", scrub: 1 },
      });
    });

    gsap.fromTo(".profile-frame img", { yPercent: -2 }, {
      yPercent: 2,
      ease: "none",
      scrollTrigger: { trigger: ".profile-card", start: "top bottom", end: "bottom top", scrub: 1 },
    });
  });

  initProjectSignal();
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

function initProjectSignal() {
  if (!gsapReady || reducedMotion.matches || window.innerWidth <= 850) return;
  const gsap = window.gsap;
  const signal = document.getElementById("project-signal");
  const fill = document.getElementById("project-signal-fill");
  const number = document.getElementById("project-signal-number");
  const name = document.getElementById("project-signal-name");
  const studies = [...document.querySelectorAll(".case-study")];
  const nodes = [...(signal?.querySelectorAll(".project-signal-track span") || [])];
  if (!signal || !fill || !number || !name || !studies.length) return;

  const names = ["VOXABRIDGE", "CLEANNAIJA", "QUIZ APP", "SHORTN"];
  const projectKeys = ["linguabridge", "cleannaija", "quiz", "shortn"];
  function setSignal(index) {
    number.textContent = String(index + 1).padStart(2, "0");
    name.textContent = names[index];
    signal.classList.toggle("is-burgundy", index % 2 === 1);
    signal.dataset.projectSignal = projectKeys[index];
    document.documentElement.dataset.projectSignal = projectKeys[index];
    nodes.forEach((node, nodeIndex) => node.classList.toggle("active", nodeIndex === index));
    gsap.fromTo([number, name], { y: 6, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.35, stagger: 0.04, ease: "power2.out", overwrite: true });
  }

  window.ScrollTrigger.create({
    trigger: "#work",
    start: "top 55%",
    end: "bottom 45%",
    onEnter: () => gsap.to(signal, { x: 0, autoAlpha: 1, duration: 0.45, ease: "power3.out" }),
    onEnterBack: () => gsap.to(signal, { x: 0, autoAlpha: 1, duration: 0.45, ease: "power3.out" }),
    onLeave: () => gsap.to(signal, { x: 18, autoAlpha: 0, duration: 0.3 }),
    onLeaveBack: () => gsap.to(signal, { x: 18, autoAlpha: 0, duration: 0.3 }),
  });

  window.ScrollTrigger.create({
    trigger: ".case-studies",
    start: "top center",
    end: "bottom center",
    scrub: true,
    onUpdate: (self) => gsap.set(fill, { scaleY: self.progress }),
  });

  studies.forEach((study, index) => {
    window.ScrollTrigger.create({
      trigger: study,
      start: "top center",
      end: "bottom center",
      onEnter: () => setSignal(index),
      onEnterBack: () => setSignal(index),
    });
  });
}

if (document.fonts?.ready) {
  Promise.race([
    document.fonts.ready,
    new Promise((resolve) => window.setTimeout(resolve, 1600)),
  ]).then(initMotionSystem);
} else {
  initMotionSystem();
}

/* Experiment switchboard ------------------------------------------------- */
const labTabs = [...document.querySelectorAll(".lab-tab[role='tab']")];
const labPanels = [...document.querySelectorAll(".lab-panel[role='tabpanel']")];

function activateLabTab(tab, moveFocus = false) {
  if (!tab) return;
  labTabs.forEach((candidate) => {
    const selected = candidate === tab;
    candidate.classList.toggle("is-active", selected);
    candidate.setAttribute("aria-selected", String(selected));
    candidate.tabIndex = selected ? 0 : -1;
  });

  let activePanel = null;
  labPanels.forEach((panel) => {
    const selected = panel.id === tab.getAttribute("aria-controls");
    panel.hidden = !selected;
    panel.classList.toggle("is-active", selected);
    if (selected) activePanel = panel;
  });

  if (moveFocus) tab.focus({ preventScroll: true });
  if (activePanel && gsapReady && !reducedMotion.matches) {
    window.gsap.fromTo(
      activePanel.children,
      { y: 14, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.46, stagger: 0.045, ease: "power3.out", clearProps: "transform,opacity,visibility" },
    );
  }
}

labTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => activateLabTab(tab));
  tab.addEventListener("keydown", (event) => {
    let nextIndex = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % labTabs.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + labTabs.length) % labTabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = labTabs.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    activateLabTab(labTabs[nextIndex], true);
  });
});

/* Subtle project-cover depth, only for precise pointers. */
if (finePointer.matches && !reducedMotion.matches) {
  document.querySelectorAll(".project-visual").forEach((cover) => {
    let bounds = null;
    cover.addEventListener("pointerenter", () => {
      bounds = cover.getBoundingClientRect();
    });
    cover.addEventListener("pointermove", (event) => {
      if (!bounds) return;
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;
      cover.style.setProperty("--spot-x", `${x * 100}%`);
      cover.style.setProperty("--spot-y", `${y * 100}%`);
      cover.style.setProperty("--shift-x", `${(x - 0.5) * -8}px`);
      cover.style.setProperty("--shift-y", `${(y - 0.5) * -6}px`);
    });
    cover.addEventListener("pointerleave", () => {
      bounds = null;
      cover.style.removeProperty("--spot-x");
      cover.style.removeProperty("--spot-y");
      cover.style.removeProperty("--shift-x");
      cover.style.removeProperty("--shift-y");
    });
  });
}

/* Project case studies ---------------------------------------------------- */
const caseStudies = {
  linguabridge: {
    title: "VoxaBridge",
    slug: "voxa",
    theme: "linguabridge",
    status: "Shipped",
    role: "Interface design + frontend",
    audience: "People translating text",
    overline: "Translation utility · Frontend",
    thesis: "A direct path from language choice to translated text.",
    stack: "HTML · CSS · JavaScript",
    image: "src/project-linguabridge.jpg",
    imageAlt: "VoxaBridge translation interface",
    imageWidth: 1265,
    imageHeight: 820,
    code: "VB · 001",
    overview: "VoxaBridge keeps language selection, text input, direction changes, and translated output inside one readable workspace.",
    system: ["Language selection", "Swap interaction", "Text input", "Result flow"],
    challenge: "Make a potentially complex translation task understandable without instructions.",
    approach: "Organize the experience around one primary task, clear controls, and a focused workspace.",
    takeaway: "A utility-first interface where hierarchy and interaction do the explaining.",
    live: "https://codeninja-cni.github.io/VoxaBridge.github.io/",
    source: "https://github.com/CodeNinja-cni/VoxaBridge.github.io",
  },
  cleannaija: {
    title: "CleanNaija",
    slug: "cleannaija",
    theme: "cleannaija",
    status: "Shipped",
    role: "Product interface + frontend",
    audience: "Nigerian communities",
    overline: "Civic reporting · Product interface",
    thesis: "Turn a local waste report into visible community action.",
    stack: "HTML · CSS · JavaScript",
    image: "src/project-cleannaija.jpg",
    imageAlt: "CleanNaija civic waste-reporting dashboard",
    imageWidth: 1265,
    imageHeight: 712,
    code: "CN · 002",
    overview: "CleanNaija helps communities report waste sites, find nearby issues, and follow cleanup status from one dashboard.",
    system: ["Structured report form", "Location search", "Status filters", "Cleanup counters"],
    challenge: "Make environmental reports easy to submit, find, and follow.",
    approach: "Combine reporting, discovery, and cleanup status in one legible product flow.",
    takeaway: "A focused civic tool connecting reporting, discovery, and accountability.",
    live: "https://codeninja-cni.github.io/CleanNaija.github.io/",
    source: "https://github.com/CodeNinja-cni/CleanNaija.github.io",
  },
  quiz: {
    title: "Quiz App",
    slug: "quiz",
    theme: "quiz",
    status: "Shipped",
    role: "Interaction + frontend logic",
    audience: "Learners and players",
    overline: "Interactive learning · JavaScript",
    thesis: "Ten questions. One attempt. A complete JavaScript game loop.",
    stack: "JavaScript · Bootstrap",
    image: "src/project-quiz.jpg",
    imageAlt: "Quiz App start screen and player setup",
    imageWidth: 1280,
    imageHeight: 720,
    code: "QA · 003",
    overview: "A framework-free, ten-question experience with setup, progress, scoring, immediate feedback, and a leaderboard.",
    system: ["Randomized questions", "Progress state", "Scoring and feedback", "Leaderboard"],
    challenge: "Manage question state, scoring, progress, and feedback without a frontend framework.",
    approach: "Structure the experience into clear start, question, result, and leaderboard states.",
    takeaway: "A compact demonstration of JavaScript fundamentals through a stateful interface.",
    live: "https://codeninja-cni.github.io/QuizApp.github.io/",
    source: "https://github.com/CodeNinja-cni/QuizApp.github.io",
  },
  shortn: {
    title: "ShortN",
    slug: "shortn",
    theme: "shortn",
    status: "Shipped",
    role: "Utility UX + frontend",
    audience: "People sharing links",
    overline: "Web utility · Vanilla JavaScript",
    thesis: "Long links, printed short.",
    stack: "HTML · CSS · JavaScript",
    image: "src/project-shortn.jpg",
    imageAlt: "ShortN ticket-inspired URL shortening interface",
    imageWidth: 1280,
    imageHeight: 720,
    code: "SN · 004",
    overview: "ShortN creates a shortened link and scannable QR code in one ticket-inspired flow.",
    system: ["URL input", "Shortened output", "QR rendering", "Process explanation"],
    challenge: "Make a technical utility approachable, memorable, and quick.",
    approach: "Combine shortening, QR sharing, and a simple explanation in one ticket-inspired flow.",
    takeaway: "A single-purpose utility with a distinct visual identity.",
    live: "https://codeninja-cni.github.io/Shortn.github.io/",
    source: "https://github.com/CodeNinja-cni/Shortn.github.io",
  },
};

const caseOrder = ["linguabridge", "cleannaija", "quiz", "shortn"];
const caseDialog = document.getElementById("case-study-dialog");
const caseDialogScroll = document.getElementById("case-dialog-scroll");
const caseDialogContent = caseDialog?.querySelector(".case-dialog-content");
const caseDialogShell = caseDialog?.querySelector(".case-dialog-shell");
const caseProgress = document.getElementById("case-dialog-progress");
const caseClose = document.getElementById("case-close");
const caseNext = document.getElementById("case-next");
let currentCaseKey = caseOrder[0];
let caseDialogOpener = null;
let caseDialogMotion = null;
let caseHashPushed = false;
let caseDialogClosing = false;

function caseKeyFromHash() {
  const slug = window.location.hash.replace("#case-", "");
  return caseOrder.find((key) => caseStudies[key].slug === slug) || null;
}

function renderCaseStudy(key) {
  const data = caseStudies[key];
  if (!data || !caseDialog) return;
  currentCaseKey = key;
  const index = caseOrder.indexOf(key);
  const nextKey = caseOrder[(index + 1) % caseOrder.length];
  const image = document.getElementById("case-image");

  document.getElementById("case-dialog-status").textContent = `CASE ${String(index + 1).padStart(2, "0")} / 04`;
  document.getElementById("case-overline").textContent = data.overline;
  document.getElementById("case-title").textContent = data.title;
  document.getElementById("case-thesis").textContent = data.thesis;
  document.getElementById("case-status").textContent = data.status;
  document.getElementById("case-role").textContent = data.role;
  document.getElementById("case-audience").textContent = data.audience;
  document.getElementById("case-stack").textContent = data.stack;
  document.getElementById("case-shot-code").textContent = data.code;
  document.getElementById("case-overview").textContent = data.overview;
  document.getElementById("case-challenge").textContent = data.challenge;
  document.getElementById("case-approach").textContent = data.approach;
  document.getElementById("case-takeaway").textContent = data.takeaway;
  document.getElementById("case-live-link").href = data.live;
  document.getElementById("case-source-link").href = data.source;
  document.getElementById("case-next-title").textContent = caseStudies[nextKey].title;
  caseDialog.dataset.caseTheme = data.theme;

  image.src = data.image;
  image.alt = data.imageAlt;
  image.width = data.imageWidth;
  image.height = data.imageHeight;

  const list = document.getElementById("case-system-list");
  const items = data.system.map((item, itemIndex) => {
    const listItem = document.createElement("li");
    const number = document.createElement("span");
    const label = document.createElement("b");
    number.textContent = String(itemIndex + 1).padStart(2, "0");
    label.textContent = item;
    listItem.append(number, label);
    return listItem;
  });
  list.replaceChildren(...items);
}

function clearCaseDialogMotion() {
  caseDialogMotion?.revert();
  caseDialogMotion = null;
}

function animateCaseDialog() {
  clearCaseDialogMotion();
  if (!gsapReady || reducedMotion.matches || !caseDialogShell || !caseDialogScroll) return;
  const gsap = window.gsap;
  caseDialogMotion = gsap.context(() => {
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .fromTo(caseDialogShell, { opacity: 0 }, { opacity: 1, duration: 0.3 })
      .from(".case-dialog-header > *", { y: -12, opacity: 0, duration: 0.5, stagger: 0.06 }, 0.05)
      .from(".case-dialog-hero > *", { y: 42, autoAlpha: 0, duration: 0.78, stagger: 0.07 }, 0.12)
      .from(".case-product-shot", { y: 54, autoAlpha: 0, duration: 0.9 }, 0.4);

    document.querySelectorAll(".case-narrative, .case-system-map, .case-decisions article, .case-dialog-footer").forEach((target) => {
      gsap.from(target, {
        y: 38,
        autoAlpha: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: target,
          scroller: caseDialogScroll,
          start: "top 84%",
          once: true,
        },
      });
    });
  }, caseDialogShell);
  window.requestAnimationFrame(() => window.ScrollTrigger.refresh());
}

function openCaseStudy(key, opener = null, pushHash = true) {
  if (!caseDialog || !caseStudies[key]) return;
  caseDialogOpener = opener || caseDialogOpener || document.activeElement;
  renderCaseStudy(key);
  caseDialogScroll.scrollTop = 0;
  if (!caseDialog.open) caseDialog.showModal();
  document.body.classList.add("case-dialog-open");
  caseDialogClosing = false;
  window.requestAnimationFrame(() => caseClose?.focus({ preventScroll: true }));
  if (pushHash && window.location.hash !== `#case-${caseStudies[key].slug}`) {
    window.history.pushState({ caseStudy: key }, "", `#case-${caseStudies[key].slug}`);
    caseHashPushed = true;
  }
  animateCaseDialog();
}

function finishCaseDialogClose(updateHistory) {
  if (!caseDialog?.open) return;
  clearCaseDialogMotion();
  caseDialog.close();
  document.body.classList.remove("case-dialog-open");
  caseDialogClosing = false;
  caseDialogOpener?.focus?.({ preventScroll: true });

  if (!updateHistory || !window.location.hash.startsWith("#case-")) return;
  if (caseHashPushed) {
    caseHashPushed = false;
    window.history.back();
  } else {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#work`);
  }
}

function closeCaseStudy(updateHistory = true) {
  if (!caseDialog?.open || caseDialogClosing) return;
  caseDialogClosing = true;
  if (gsapReady && !reducedMotion.matches && caseDialogShell) {
    window.gsap.to(caseDialogShell, {
      y: 12,
      autoAlpha: 0,
      duration: 0.28,
      ease: "power2.in",
      overwrite: true,
      onComplete: () => finishCaseDialogClose(updateHistory),
    });
  } else {
    finishCaseDialogClose(updateHistory);
  }
}

document.querySelectorAll("[data-case-study]").forEach((button) => {
  button.addEventListener("click", () => openCaseStudy(button.dataset.caseStudy, button));
});

caseClose?.addEventListener("click", () => closeCaseStudy());
caseDialog?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeCaseStudy();
});
caseDialog?.addEventListener("click", (event) => {
  if (event.target === caseDialog) closeCaseStudy();
});
caseDialog?.addEventListener("close", () => {
  document.body.classList.remove("case-dialog-open");
  clearCaseDialogMotion();
});

caseNext?.addEventListener("click", () => {
  const nextKey = caseOrder[(caseOrder.indexOf(currentCaseKey) + 1) % caseOrder.length];
  renderCaseStudy(nextKey);
  caseDialogScroll.scrollTo({ top: 0, behavior: reducedMotion.matches ? "auto" : "smooth" });
  window.history.replaceState({ caseStudy: nextKey }, "", `#case-${caseStudies[nextKey].slug}`);
  if (gsapReady && !reducedMotion.matches && caseDialogContent) {
    window.gsap.fromTo(caseDialogContent, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out", clearProps: "transform,opacity,visibility" });
  }
  document.getElementById("case-title")?.focus({ preventScroll: true });
});

caseDialogScroll?.addEventListener("scroll", () => {
  if (!caseProgress) return;
  const scrollable = caseDialogScroll.scrollHeight - caseDialogScroll.clientHeight;
  const progress = scrollable > 0 ? Math.min(1, Math.max(0, caseDialogScroll.scrollTop / scrollable)) : 0;
  caseProgress.style.transform = `scaleX(${progress})`;
}, { passive: true });

window.addEventListener("popstate", () => {
  const key = caseKeyFromHash();
  caseHashPushed = false;
  if (key) {
    if (caseDialog?.open) renderCaseStudy(key);
    else openCaseStudy(key, null, false);
  } else if (caseDialog?.open) {
    closeCaseStudy(false);
  }
});

const initialCaseKey = caseKeyFromHash();
if (initialCaseKey) window.requestAnimationFrame(() => openCaseStudy(initialCaseKey, null, false));

/* Live details ------------------------------------------------------------ */
const lagosTime = document.getElementById("lagos-time");
const currentYear = document.getElementById("current-year");

function updateLagosTime() {
  if (!lagosTime) return;
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  lagosTime.textContent = `WAT ${time}`;
}

if (currentYear) currentYear.textContent = String(new Date().getFullYear());
updateLagosTime();
window.setInterval(updateLagosTime, 30_000);

/* Living system: scattered signals resolving into a connected field ------- */
let livingSystemStarted = false;

function createLivingSystem() {
  const canvas = document.getElementById("system-canvas");
  const stage = document.querySelector(".system-stage");
  const hero = document.querySelector(".hero");
  if (!canvas || !stage || typeof window.THREE === "undefined" || prefersLiteVisuals() || livingSystemStarted) return;
  livingSystemStarted = true;

  const THREE = window.THREE;
  let renderer;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: window.devicePixelRatio <= 1.5,
      powerPreference: "low-power",
    });
  } catch (error) {
    console.warn("WebGL is unavailable; using the CSS system fallback.", error);
    return;
  }

  renderer.setClearColor(0x000000, 0);
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  camera.position.set(0, 0, 7.05);

  const system = new THREE.Group();
  system.rotation.set(-0.14, -0.28, 0.03);
  scene.add(system);

  const haloGeometry = new THREE.IcosahedronGeometry(1.9, 3);
  const haloMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uEnergy: { value: 0 },
      uColor: { value: new THREE.Color(0x2f5bff) },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vViewDirection;
      void main() {
        vec3 displaced = position + normal * sin(position.y * 4.0 + uTime * 0.7) * 0.018;
        vec4 viewPosition = modelViewMatrix * vec4(displaced, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDirection = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uEnergy;
      uniform vec3 uColor;
      varying vec3 vNormal;
      varying vec3 vViewDirection;
      void main() {
        float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewDirection))), 2.55);
        float pulse = 0.76 + sin(uTime * 1.25) * 0.08 + uEnergy * 0.18;
        gl_FragColor = vec4(uColor * (0.75 + fresnel), fresnel * pulse * 0.42);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const halo = new THREE.Mesh(haloGeometry, haloMaterial);
  system.add(halo);

  const shellGeometry = new THREE.IcosahedronGeometry(1.62, 2);
  const shell = new THREE.Mesh(
    shellGeometry,
    new THREE.MeshStandardMaterial({
      color: 0x2346b8,
      emissive: 0x0b1c58,
      emissiveIntensity: 0.65,
      metalness: 0.08,
      roughness: 0.24,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  system.add(shell);

  const shellLines = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.66, 2)),
    new THREE.LineBasicMaterial({
      color: 0x7893ff,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
    }),
  );
  system.add(shellLines);

  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.67, 0),
    new THREE.MeshStandardMaterial({
      color: 0x2f5bff,
      emissive: 0x183fd0,
      emissiveIntensity: 1.45,
      metalness: 0.18,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9,
    }),
  );
  system.add(core);

  const shardGroup = new THREE.Group();
  const shardGeometry = new THREE.TetrahedronGeometry(0.42, 0);
  const shardEdgesGeometry = new THREE.EdgesGeometry(shardGeometry);
  const shardMaterial = new THREE.MeshStandardMaterial({
    color: 0x210813,
    emissive: 0x861b3d,
    emissiveIntensity: 0.72,
    metalness: 0.22,
    roughness: 0.28,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const shardEdgeMaterial = new THREE.LineBasicMaterial({
    color: 0xd13d68,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
  });

  for (let index = 0; index < 18; index += 1) {
    const vertical = 1 - (index / 17) * 2;
    const radial = Math.sqrt(1 - vertical * vertical);
    const angle = index * Math.PI * (3 - Math.sqrt(5));
    const direction = new THREE.Vector3(
      Math.cos(angle) * radial,
      vertical,
      Math.sin(angle) * radial,
    );
    const shard = new THREE.Mesh(shardGeometry, shardMaterial);
    shard.position.copy(direction).multiplyScalar(1.35 + Math.sin(index * 1.7) * 0.16);
    const resolvedPosition = shard.position.clone();
    const noisePosition = resolvedPosition.clone().multiplyScalar(1.7);
    noisePosition.x += Math.sin(index * 2.31) * 0.72;
    noisePosition.y += Math.cos(index * 1.73) * 0.62;
    noisePosition.z += Math.sin(index * 0.91) * 0.5;
    shard.userData.resolvedPosition = resolvedPosition;
    shard.userData.noisePosition = noisePosition;
    shard.position.copy(noisePosition);
    shard.scale.set(0.62 + (index % 3) * 0.12, 1.35 + (index % 4) * 0.22, 0.7);
    shard.lookAt(0, 0, 0);
    shard.rotateZ(index * 0.47);

    const edges = new THREE.LineSegments(shardEdgesGeometry, shardEdgeMaterial);
    shard.add(edges);
    shardGroup.add(shard);
  }
  system.add(shardGroup);

  const nodeCount = 34;
  const nodePositions = [];
  const nodeBuffer = new Float32Array(nodeCount * 3);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let index = 0; index < nodeCount; index += 1) {
    const y = 1 - (index / (nodeCount - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const angle = goldenAngle * index;
    const radius = 2.48 + Math.sin(index * 2.17) * 0.23;
    const point = new THREE.Vector3(
      Math.cos(angle) * radiusAtY * radius,
      y * radius,
      Math.sin(angle) * radiusAtY * radius,
    );
    nodePositions.push(point);
    nodeBuffer[index * 3] = point.x;
    nodeBuffer[index * 3 + 1] = point.y;
    nodeBuffer[index * 3 + 2] = point.z;
  }

  const nodesGeometry = new THREE.BufferGeometry();
  nodesGeometry.setAttribute("position", new THREE.BufferAttribute(nodeBuffer, 3));
  const nodesMaterial = new THREE.PointsMaterial({
    color: 0x5d7fff,
    size: 0.092,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.62,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const nodes = new THREE.Points(nodesGeometry, nodesMaterial);
  system.add(nodes);

  const connectionVertices = [];
  const connect = (from, to) => {
    connectionVertices.push(
      nodePositions[from].x, nodePositions[from].y, nodePositions[from].z,
      nodePositions[to].x, nodePositions[to].y, nodePositions[to].z,
    );
  };

  for (let index = 0; index < nodeCount; index += 1) {
    connect(index, (index + 1) % nodeCount);
    if (index % 2 === 0) connect(index, (index + 7) % nodeCount);
  }

  const connectionsGeometry = new THREE.BufferGeometry();
  connectionsGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(connectionVertices, 3),
  );
  const connectionsMaterial = new THREE.LineBasicMaterial({
    color: 0x7893ff,
    transparent: true,
    opacity: 0.05,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const connections = new THREE.LineSegments(connectionsGeometry, connectionsMaterial);
  system.add(connections);

  const signalCurves = [
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3.05, 0.15, 0.2),
      new THREE.Vector3(-1.6, 1.65, 0.75),
      new THREE.Vector3(0.15, 2.38, -0.4),
      new THREE.Vector3(1.8, 1.05, 0.65),
      new THREE.Vector3(3.05, -0.3, 0.15),
    ]),
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.8, -0.85, -0.35),
      new THREE.Vector3(-1.25, -2.05, 0.45),
      new THREE.Vector3(0.45, -2.35, -0.55),
      new THREE.Vector3(2.05, -1.2, 0.45),
      new THREE.Vector3(2.85, 0.95, -0.25),
    ]),
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.45, 2.65, -0.55),
      new THREE.Vector3(-2.45, 1.0, 0.35),
      new THREE.Vector3(-2.25, -1.15, -0.45),
      new THREE.Vector3(-0.8, -2.72, 0.3),
    ]),
  ];
  const signalMarkers = [];
  const signalGeometries = [];

  signalCurves.forEach((curve, index) => {
    const geometry = new THREE.TubeGeometry(curve, 72, index === 2 ? 0.009 : 0.014, 5, false);
    const material = new THREE.MeshBasicMaterial({
      color: index === 1 ? 0xd13d68 : 0x2f5bff,
      transparent: true,
      opacity: index === 2 ? 0.2 : 0.31,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const path = new THREE.Mesh(geometry, material);
    system.add(path);
    signalGeometries.push(geometry);

    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(index === 1 ? 0.075 : 0.058, 10, 10),
      new THREE.MeshBasicMaterial({
        color: index === 1 ? 0xd13d68 : 0x7893ff,
        transparent: true,
        opacity: 0.94,
        blending: THREE.AdditiveBlending,
      }),
    );
    marker.userData = { curve, offset: index * 0.31, speed: 0.038 + index * 0.009 };
    signalMarkers.push(marker);
    system.add(marker);
  });

  const dustCount = 120;
  const dustBuffer = new Float32Array(dustCount * 3);
  for (let index = 0; index < dustCount; index += 1) {
    const normalized = index / dustCount;
    const angle = index * goldenAngle;
    const radius = 2.78 + (Math.sin(index * 1.91) + 1) * 0.32;
    const y = (normalized * 2 - 1) * 2.55;
    const radial = Math.sqrt(Math.max(0.08, 1 - (y / 3.15) ** 2)) * radius;
    dustBuffer[index * 3] = Math.cos(angle) * radial;
    dustBuffer[index * 3 + 1] = y;
    dustBuffer[index * 3 + 2] = Math.sin(angle) * radial;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustBuffer, 3));
  const dustMaterial = new THREE.PointsMaterial({
    color: 0x8aa0ff,
    size: 0.024,
    transparent: true,
    opacity: 0.62,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  system.add(dust);

  const membraneSelections = [
    [2, 10, 18],
    [7, 16, 26],
    [12, 23, 31],
  ];

  membraneSelections.forEach((selection, index) => {
    const vertices = selection.flatMap((pointIndex) => nodePositions[pointIndex].toArray());
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex([0, 1, 2]);
    geometry.computeVertexNormals();
    const membrane = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: index === 1 ? 0x861b3d : 0x2f5bff,
        transparent: true,
        opacity: index === 1 ? 0.045 : 0.065,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    system.add(membrane);
  });

  scene.add(new THREE.HemisphereLight(0x8299ff, 0x03050b, 1.2));
  const cobaltLight = new THREE.PointLight(0x2f5bff, 2.8, 14);
  cobaltLight.position.set(2.7, 1.7, 3.8);
  scene.add(cobaltLight);
  const burgundyLight = new THREE.PointLight(0xc12758, 2.35, 13);
  burgundyLight.position.set(-3.4, -2, 2.4);
  scene.add(burgundyLight);

  let targetPointerX = 0;
  let targetPointerY = 0;
  let pointerX = 0;
  let pointerY = 0;
  let pointerEnergy = 0;
  let previousPointerX = 0;
  let previousPointerY = 0;
  let resolveTarget = 0.14;
  let resolveValue = 0.14;
  let lastResolveCss = -1;
  let isVisible = true;
  let frameId = 0;
  let resolveScrollFrame = 0;
  let heroMetrics = null;
  let lastFrameTime = 0;
  const frameInterval = 1000 / 30;
  const clock = new THREE.Clock();
  let elapsed = 0;

  function updateResolveTarget() {
    if (!heroMetrics) return;
    const progress = Math.min(1, Math.max(0,
      (window.scrollY - heroMetrics.top) / heroMetrics.resolveTravel,
    ));
    resolveTarget = 0.14 + progress * 0.86;
  }

  function measureHero() {
    if (!hero) return;
    const bounds = hero.getBoundingClientRect();
    heroMetrics = {
      left: bounds.left + window.scrollX,
      top: bounds.top + window.scrollY,
      width: Math.max(bounds.width, 1),
      height: Math.max(bounds.height, 1),
      resolveTravel: Math.max(bounds.height - window.innerHeight, window.innerHeight * 0.42),
    };
    updateResolveTarget();
  }

  function requestResolveUpdate() {
    if (resolveScrollFrame) return;
    resolveScrollFrame = window.requestAnimationFrame(() => {
      resolveScrollFrame = 0;
      updateResolveTarget();
    });
  }

  function resize() {
    const width = Math.max(stage.clientWidth, 1);
    const height = Math.max(stage.clientHeight, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    measureHero();
    if (prefersLiteVisuals()) {
      stopAnimation();
      return;
    }
    renderFrame();
    if (document.documentElement.classList.contains("webgl-ready")) startAnimation();
  }

  function renderFrame() {
    renderer.render(scene, camera);
  }

  function animate(timestamp) {
    if (!isVisible || document.hidden || prefersLiteVisuals()) {
      frameId = 0;
      return;
    }

    frameId = window.requestAnimationFrame(animate);
    if (timestamp - lastFrameTime < frameInterval) return;
    lastFrameTime = timestamp - ((timestamp - lastFrameTime) % frameInterval);

    elapsed += Math.min(clock.getDelta(), 0.05);
    pointerX += (targetPointerX - pointerX) * 0.035;
    pointerY += (targetPointerY - pointerY) * 0.035;
    pointerEnergy *= 0.94;

    resolveValue += (resolveTarget - resolveValue) * 0.045;
    const resolvedEase = resolveValue * resolveValue * (3 - 2 * resolveValue);

    shardGroup.children.forEach((shard) => {
      shard.position.lerpVectors(
        shard.userData.noisePosition,
        shard.userData.resolvedPosition,
        resolvedEase,
      );
    });
    connectionsMaterial.opacity = THREE.MathUtils.lerp(0.045, 0.28, resolvedEase);
    nodesMaterial.opacity = THREE.MathUtils.lerp(0.58, 0.96, resolvedEase);
    dustMaterial.opacity = THREE.MathUtils.lerp(0.64, 0.2, resolvedEase);
    shellLines.material.opacity = THREE.MathUtils.lerp(0.16, 0.38, resolvedEase);
    haloMaterial.uniforms.uEnergy.value = Math.min(1, pointerEnergy + resolvedEase * 0.35);
    if (Math.abs(resolveValue - lastResolveCss) > 0.005) {
      stage.style.setProperty("--signal-resolution", resolveValue.toFixed(3));
      lastResolveCss = resolveValue;
    }

    system.rotation.y = -0.28 + elapsed * 0.068 + pointerX * 0.22;
    system.rotation.x = -0.14 + Math.sin(elapsed * 0.42) * 0.045 + pointerY * 0.15;
    system.rotation.z = Math.sin(elapsed * 0.24) * 0.025;
    core.rotation.x = elapsed * 0.38;
    core.rotation.y = -elapsed * 0.46;
    core.scale.setScalar(1 + Math.sin(elapsed * 1.25) * 0.045 + pointerEnergy * 0.04);
    shell.rotation.y = -elapsed * 0.028;
    shellLines.rotation.y = -elapsed * 0.028;
    shardGroup.rotation.y = elapsed * -0.055;
    shardGroup.rotation.z = Math.sin(elapsed * 0.3) * 0.04;
    halo.rotation.y = elapsed * 0.024;
    dust.rotation.y = -elapsed * 0.018;
    dust.rotation.z = elapsed * 0.006;
    haloMaterial.uniforms.uTime.value = elapsed;
    signalMarkers.forEach((marker) => {
      const progress = (elapsed * marker.userData.speed + marker.userData.offset) % 1;
      marker.position.copy(marker.userData.curve.getPointAt(progress));
      marker.scale.setScalar(0.85 + Math.sin(elapsed * 2.2 + marker.userData.offset * 8) * 0.18);
    });
    camera.position.x = pointerX * 0.24;
    camera.position.y = -pointerY * 0.17;
    camera.lookAt(0, 0, 0);

    renderFrame();
  }

  function startAnimation() {
    if (frameId || prefersLiteVisuals() || !isVisible || document.hidden) return;
    clock.getDelta();
    lastFrameTime = 0;
    frameId = window.requestAnimationFrame(animate);
  }

  function stopAnimation() {
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = 0;
  }

  hero?.addEventListener("pointermove", (event) => {
    if (!heroMetrics) return;
    const nextX = ((event.clientX + window.scrollX - heroMetrics.left) / heroMetrics.width - 0.5) * 2;
    const nextY = ((event.clientY + window.scrollY - heroMetrics.top) / heroMetrics.height - 0.5) * 2;
    pointerEnergy = Math.min(1, pointerEnergy + Math.hypot(
      nextX - previousPointerX,
      nextY - previousPointerY,
    ) * 1.6);
    previousPointerX = nextX;
    previousPointerY = nextY;
    targetPointerX = nextX;
    targetPointerY = nextY;
  }, { passive: true });

  window.addEventListener("scroll", requestResolveUpdate, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAnimation();
    else startAnimation();
  });

  reducedMotion.addEventListener?.("change", () => {
    if (reducedMotion.matches) {
      stopAnimation();
      system.rotation.set(-0.14, -0.28, 0.03);
      renderFrame();
    } else {
      startAnimation();
    }
  });

  if ("IntersectionObserver" in window) {
    const stageObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) startAnimation();
      else stopAnimation();
    }, { threshold: 0.01 });
    stageObserver.observe(stage);
  }

  const resizeObserver = "ResizeObserver" in window
    ? new ResizeObserver(resize)
    : null;
  resizeObserver?.observe(stage);
  if (!resizeObserver) window.addEventListener("resize", resize, { passive: true });

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    stopAnimation();
    document.documentElement.classList.remove("webgl-ready");
  });
  canvas.addEventListener("webglcontextrestored", () => {
    resize();
    document.documentElement.classList.add("webgl-ready");
    startAnimation();
  });

  resize();
  renderFrame();
  document.documentElement.classList.add("webgl-ready");
  startAnimation();

  window.addEventListener("pagehide", () => {
    stopAnimation();
    window.removeEventListener("scroll", requestResolveUpdate);
    if (resolveScrollFrame) window.cancelAnimationFrame(resolveScrollFrame);
    resizeObserver?.disconnect();
    if (!resizeObserver) window.removeEventListener("resize", resize);
    scene.traverse((object) => {
      object.geometry?.dispose?.();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.filter(Boolean).forEach((material) => material.dispose?.());
    });
    renderer.dispose();
  }, { once: true });
}

let threeLoadPromise = null;

function loadLivingSystem() {
  if (livingSystemStarted || prefersLiteVisuals()) return;
  if (window.THREE) {
    createLivingSystem();
    return;
  }
  if (!threeLoadPromise) {
    threeLoadPromise = new Promise((resolve, reject) => {
      const loader = document.createElement("script");
      loader.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
      loader.crossOrigin = "anonymous";
      loader.onload = resolve;
      loader.onerror = reject;
      document.head.append(loader);
    });
  }
  threeLoadPromise.then(createLivingSystem).catch((error) => {
    console.warn("The 3D signal field could not load; using the lightweight fallback.", error);
  });
}

let livingSystemArmed = false;

function armLivingSystem() {
  if (livingSystemStarted || livingSystemArmed || prefersLiteVisuals()) return;
  const stage = document.querySelector(".system-stage");
  if (!stage) return;
  livingSystemArmed = true;

  const queueLoad = () => {
    window.setTimeout(() => {
      whenIdle(() => {
        livingSystemArmed = false;
        loadLivingSystem();
      }, 3000);
    }, 1800);
  };

  if (!("IntersectionObserver" in window)) {
    queueLoad();
    return;
  }

  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    queueLoad();
  }, { rootMargin: "150px" });
  observer.observe(stage);
}

function scheduleLivingSystem() {
  afterFirstPaint(armLivingSystem);
}

if (document.readyState === "complete") {
  scheduleLivingSystem();
} else {
  window.addEventListener("load", scheduleLivingSystem, { once: true });
}

reducedMotion.addEventListener?.("change", () => {
  syncVisualMode();
  if (!prefersLiteVisuals()) {
    initMotionSystem();
    armLivingSystem();
  }
});

/* Contact ----------------------------------------------------------------- */
const EMAILJS_PUBLIC_KEY = "DeUhZdy9m7MKnYQAb";
const EMAILJS_SERVICE_ID = "service_sg6xc1j";
const EMAILJS_TEMPLATE_ID = "template_b9kbgdb";
const contactForm = document.getElementById("contact-form");
const formStatus = document.getElementById("form-status");
let emailLoadPromise = null;
let emailInitialized = false;

function initializeEmailService() {
  if (!window.emailjs || emailInitialized) return;
  window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  emailInitialized = true;
}

function loadEmailService() {
  if (window.emailjs) {
    initializeEmailService();
    return Promise.resolve(window.emailjs);
  }
  if (!emailLoadPromise) {
    emailLoadPromise = new Promise((resolve, reject) => {
      const loader = document.createElement("script");
      loader.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4.4.1/dist/email.min.js";
      loader.crossOrigin = "anonymous";
      loader.onload = () => {
        initializeEmailService();
        resolve(window.emailjs);
      };
      loader.onerror = reject;
      document.head.append(loader);
    });
  }
  return emailLoadPromise;
}

contactForm?.addEventListener("focusin", () => {
  loadEmailService().catch(() => {});
}, { once: true });

function setFormStatus(message, isError = false) {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.style.color = isError ? "#ff8f8f" : "";
  formStatus.setAttribute("role", isError ? "alert" : "status");
  formStatus.setAttribute("aria-live", isError ? "assertive" : "polite");
}

contactForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = contactForm.querySelector("button[type='submit']");
  const submitLabel = submitButton?.querySelector("span");
  const name = document.getElementById("sender-name")?.value.trim();
  const email = document.getElementById("email")?.value.trim();
  const message = document.getElementById("content")?.value.trim();

  if (!name || !email || !message) {
    setFormStatus("Please complete all three fields.", true);
    return;
  }

  if (submitButton) submitButton.disabled = true;
  if (submitLabel) submitLabel.textContent = "Sending…";
  contactForm.setAttribute("aria-busy", "true");
  setFormStatus("Sending your message…");

  try {
    await loadEmailService();
    await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      from_name: name,
      from_email: email,
      reply_to: email,
      message,
    });
    contactForm.reset();
    setFormStatus(`Message sent. Thanks, ${name} — I’ll get back to you soon.`);
  } catch (error) {
    console.error("EmailJS send failed:", error);
    setFormStatus("That did not send. Please use the direct email link on the left.", true);
  } finally {
    if (submitButton) submitButton.disabled = false;
    if (submitLabel) submitLabel.textContent = "Send message";
    contactForm.setAttribute("aria-busy", "false");
  }
});
