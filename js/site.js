/* site.js — runtime for the static Habit Design Lab site.
   Handles: JA/EN language toggle, sticky-nav state, scroll-spy, scroll-reveal,
   the editorial hero (photo slideshow ⇄ geometric canvas), publication/news
   filters, and the FAQ accordion. No framework, no build step. */
(function () {
  "use strict";
  /* mark JS active so CSS can switch reveal from "always visible" to "animate on scroll" */
  document.documentElement.classList.add("js");
  var REDUCE = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── language toggle ─────────────────────────────────────────────── */
  var I18N = window.I18N || {};
  function applyLang(lang) {
    document.documentElement.lang = lang;
    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i], rec = I18N[el.getAttribute("data-i18n")];
      if (!rec) continue;
      var val = rec[lang];
      if (val == null) continue;
      if (el.hasAttribute("data-i18n-html")) el.innerHTML = val;
      else el.textContent = val;
    }
    try { localStorage.setItem("hdl-lang", lang); } catch (e) {}
  }
  var saved = "ja";
  try { saved = localStorage.getItem("hdl-lang") || "ja"; } catch (e) {}
  if (saved === "en") applyLang("en");
  else document.documentElement.lang = "ja";
  var langBtn = document.getElementById("langToggle");
  if (langBtn) langBtn.addEventListener("click", function () {
    applyLang(document.documentElement.lang === "ja" ? "en" : "ja");
  });

  /* ── sticky nav state ────────────────────────────────────────────── */
  var nav = document.getElementById("siteNav");
  if (nav && !nav.classList.contains("solid")) {
    var onScroll = function () { nav.classList.toggle("solid", window.scrollY > 40); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ── back to top ─────────────────────────────────────────────────── */
  var btt = document.getElementById("backToTop");
  if (btt) {
    window.addEventListener("scroll", function () { btt.classList.toggle("visible", window.scrollY > 300); }, { passive: true });
    btt.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: REDUCE ? "auto" : "smooth" }); });
  }

  /* ── mobile hamburger menu ───────────────────────────────────────── */
  var burger = document.getElementById("navBurger");
  var navLinks = document.getElementById("navLinks");
  if (burger && nav && navLinks) {
    var closeMenu = function () {
      nav.classList.remove("menu-open");
      burger.setAttribute("aria-expanded", "false");
    };
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("menu-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    /* close after tapping a link */
    navLinks.addEventListener("click", function (e) { if (e.target.closest(".nav-link")) closeMenu(); });
    /* close on Escape */
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
    /* close when resized back to desktop width */
    window.addEventListener("resize", function () { if (window.innerWidth > 1080) closeMenu(); }, { passive: true });
  }

  /* ── scroll-spy (home) ───────────────────────────────────────────── */
  var spyLinks = {};
  document.querySelectorAll(".nav-link[data-spy]").forEach(function (a) { spyLinks[a.getAttribute("data-spy")] = a; });
  var spyIds = Object.keys(spyLinks);
  if (spyIds.length && "IntersectionObserver" in window) {
    var spyIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        for (var id in spyLinks) spyLinks[id].classList.remove("on");
        var link = spyLinks[e.target.id];
        if (link) link.classList.add("on");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    spyIds.forEach(function (id) { var el = document.getElementById(id); if (el) spyIO.observe(el); });
  }

  /* ── scroll reveal ───────────────────────────────────────────────── */
  var reveals = document.querySelectorAll(".reveal");
  if (REDUCE || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var revIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); revIO.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    reveals.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < (window.innerHeight || 0) && r.bottom > 0) el.classList.add("is-in");
      else revIO.observe(el);
    });
  }

  /* ── hero: slideshow + geometric canvas ──────────────────────────── */
  var slides = document.querySelectorAll("#heroSlides .hero-slide");
  if (slides.length && !REDUCE) {
    var idx = 0;
    setInterval(function () {
      slides[idx].classList.remove("active");
      idx = (idx + 1) % slides.length;
      slides[idx].classList.add("active");
    }, 5000);
  }

  var canvas = document.getElementById("heroAnim");
  if (canvas) {
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, raf = 0;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var hex = (getComputedStyle(document.documentElement).getPropertyValue("--accent-hex") || "#e6863c").trim();
    function resize() {
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function frame(now) {
      var t = now / 1000;
      ctx.clearRect(0, 0, W, H);
      var gap = Math.max(26, Math.min(40, W / 38));
      for (var x = 0; x <= W + gap; x += gap) for (var y = 0; y <= H + gap; y += gap) {
        var d = (x * 0.6 + y) / Math.max(W, 1);
        var m = (Math.sin(t * 0.55 - d * 6.2) + 1) / 2;
        var r = 1.1 + m * 2.7;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
        if (m > 0.8) { ctx.fillStyle = hex; ctx.globalAlpha = Math.min(0.85, 0.45 + (m - 0.8) * 2.2); }
        else { ctx.fillStyle = "#ffffff"; ctx.globalAlpha = 0.04 + m * 0.12; }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    resize();
    if (REDUCE) { frame(0); }
    else { raf = requestAnimationFrame(frame); }
    if (window.ResizeObserver) { var ro = new ResizeObserver(resize); ro.observe(canvas); }
    else window.addEventListener("resize", resize);

    /* hybrid cycle: photos (22s) ⇄ geometric (9s) */
    var hybrid = document.getElementById("heroHybrid");
    if (hybrid && !REDUCE) {
      var layers = hybrid.querySelectorAll(".hero-layer");
      var mode = "photos";
      var cycle = function () {
        mode = mode === "photos" ? "geometric" : "photos";
        layers.forEach(function (l) { l.classList.toggle("on", l.getAttribute("data-layer") === mode); });
        setTimeout(cycle, mode === "photos" ? 22000 : 9000);
      };
      setTimeout(cycle, 22000);
    }
  }

  /* ── publications filter ─────────────────────────────────────────── */
  var pubFilters = document.getElementById("pubFilters");
  if (pubFilters) {
    var allLabel = pubFilters.getAttribute("data-all");
    var pubItems = document.querySelectorAll("#pubList .pub");
    pubFilters.addEventListener("click", function (ev) {
      var b = ev.target.closest(".filter"); if (!b) return;
      pubFilters.querySelectorAll(".filter").forEach(function (f) { f.classList.remove("on"); });
      b.classList.add("on");
      var want = b.getAttribute("data-filter");
      pubItems.forEach(function (li) {
        var show = want === allLabel || li.getAttribute("data-cat") === want;
        li.style.display = show ? "" : "none";
      });
    });
  }

  /* ── news filter ─────────────────────────────────────────────────── */
  var newsFilters = document.getElementById("newsFilters");
  if (newsFilters) {
    var newsItems = document.querySelectorAll("#newsList .news-item");
    newsFilters.addEventListener("click", function (ev) {
      var b = ev.target.closest(".filter"); if (!b) return;
      newsFilters.querySelectorAll(".filter").forEach(function (f) { f.classList.remove("on"); });
      b.classList.add("on");
      var tag = b.getAttribute("data-tag");
      newsItems.forEach(function (li) {
        var tags = (li.getAttribute("data-tags") || "").split(",");
        var show = !tag || tags.indexOf(tag) !== -1;
        li.style.display = show ? "" : "none";
      });
    });
  }

  /* ── FAQ accordion ───────────────────────────────────────────────── */
  var faq = document.getElementById("faq");
  if (faq) {
    faq.addEventListener("click", function (ev) {
      var q = ev.target.closest(".faq-q"); if (!q) return;
      var item = q.parentElement;
      var open = item.classList.toggle("open");
      var mark = q.querySelector(".faq-mark");
      if (mark) mark.textContent = open ? "−" : "+";
    });
  }
})();
