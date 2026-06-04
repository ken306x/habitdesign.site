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

  /* ── domain card ─────────────────────────────────────────────────── */
  var DOMAIN_DATA = {
    t45: { issue: "「やる気はあるのに、気づけば1週間サボっている。」", approach: "→ 行動センシングとリマインド設計で、無意識に"続く仕掛け"をつくる研究をしています。" },
    t46: { issue: "「健診でひっかかっても、3か月後には元通り。」", approach: "→ ICTを使った小さな行動変容のきっかけ設計で、継続的な健康行動を支援します。" },
    t47: { issue: "「動画教材を積んでいるが、一度も開いていない。」", approach: "→ 学習ログの分析と習慣化アプリで、"学び続けられる人"を支える仕組みを研究しています。" },
    t48: { issue: "「気づいたら2時間たっていた…」", approach: "→ スマホ利用パターンの可視化とデジタルウェルビーイング設計で、意図した使い方を支援します。" },
    t49: { issue: "「食事記録を3日続けたことがない。」", approach: "→ 記録の摩擦を減らすUIデザインで、無理なく続く食習慣づくりを探っています。" },
    t50: { issue: "「タスク管理アプリが増えるのに、仕事は減らない。」", approach: "→ 行動パターンのデータ化で、個人に合った生産性向上の方法を研究しています。" },
    t51: { issue: "「エコに関心はあるけど、日々の行動に落とし込めない。」", approach: "→ IoTセンシングと小さな目標設定で、省エネ行動の習慣化を支援します。" },
    t52: { issue: "「町内会に入っているが、活動にはなかなか参加できていない。」", approach: "→ デジタルとリアルをつなぐ地域コミュニケーション設計を研究しています。" }
  };
  var dcBg = document.getElementById("domainCardBg");
  var dc = document.getElementById("domainCard");
  var dcTitle = document.getElementById("domainCardTitle");
  var dcIssue = document.getElementById("domainCardIssue");
  var dcApproach = document.getElementById("domainCardApproach");
  var dcClose = document.getElementById("domainCardClose");
  function openDomainCard(key, label) {
    var d = DOMAIN_DATA[key]; if (!d || !dc) return;
    dcTitle.textContent = label;
    dcIssue.textContent = d.issue;
    dcApproach.textContent = d.approach;
    dc.classList.add("visible"); dcBg.classList.add("visible");
  }
  function closeDomainCard() { if (dc) { dc.classList.remove("visible"); dcBg.classList.remove("visible"); } }
  document.querySelectorAll(".domain[data-i18n]").forEach(function (el) {
    el.addEventListener("click", function () { openDomainCard(el.getAttribute("data-i18n"), el.textContent.trim()); });
  });
  if (dcClose) dcClose.addEventListener("click", closeDomainCard);
  if (dcBg) dcBg.addEventListener("click", closeDomainCard);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDomainCard(); });

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
