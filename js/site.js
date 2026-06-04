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
    if (window.__renderDaily) window.__renderDaily(lang);
    if (window.__renderMyp) window.__renderMyp(lang);
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

  /* ── domain capsule popover (content comes from data-* attributes) ── */
  var dcBg = document.getElementById("domainCardBg");
  var dc = document.getElementById("domainCard");
  var dcTitle = document.getElementById("domainCardTitle");
  var dcIssue = document.getElementById("domainCardIssue");
  var dcApproach = document.getElementById("domainCardApproach");
  var dcClose = document.getElementById("domainCardClose");
  function closeDomainCard() { if (dc) { dc.classList.remove("visible"); dcBg.classList.remove("visible"); } }
  if (dc && dcBg) {
    document.querySelectorAll(".domain").forEach(function (el) {
      el.addEventListener("click", function () {
        var issue = el.getAttribute("data-issue"), approach = el.getAttribute("data-approach");
        if (!issue && !approach) return;
        dcTitle.textContent = el.textContent.trim();
        dcIssue.textContent = issue || "";
        dcApproach.textContent = approach || "";
        dc.classList.add("visible"); dcBg.classList.add("visible");
      });
    });
    if (dcClose) dcClose.addEventListener("click", closeDomainCard);
    dcBg.addEventListener("click", closeDomainCard);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDomainCard(); });
  }

  /* ── "今日の習慣" band: year grid + countdown + daily quote/plus-10 ── */
  var yearGrid = document.getElementById("yearGrid");
  if (yearGrid && window.DAILY) {
    var now = new Date(), year = now.getFullYear();
    var start = new Date(year, 0, 1), next = new Date(year + 1, 0, 1);
    var DAY = 86400000;
    var doy = Math.floor((now - start) / DAY);            // 0-based day of year
    var total = Math.round((next - start) / DAY);          // 365 or 366
    var remain = total - (doy + 1), pct = Math.round((doy + 1) / total * 100);
    var frag = document.createDocumentFragment();
    for (var d = 0; d < total; d++) {
      var cell = document.createElement("span");
      if (d < doy) cell.className = "yc on";
      else if (d === doy) cell.className = "yc on today";
      else cell.className = "yc";
      frag.appendChild(cell);
    }
    yearGrid.appendChild(frag);
    var q = window.DAILY.quotes[doy % window.DAILY.quotes.length];
    var p = window.DAILY.plus10[doy % window.DAILY.plus10.length];
    window.__renderDaily = function (lang) {
      var en = lang === "en";
      var cd = document.getElementById("yearCountdown");
      if (cd) cd.textContent = en
        ? (year + " — " + remain + " days left (" + pct + "% done)")
        : (year + "年 — のこり " + remain + " 日（" + pct + "% が経過）");
      var dq = document.getElementById("dailyQuote"), ds = document.getElementById("dailyQuoteSrc"), dp = document.getElementById("dailyPlus10");
      if (dq) dq.textContent = "“" + (q[lang] || q.ja) + "”";
      if (ds) ds.textContent = q.src ? "— " + q.src : "";
      if (dp) dp.textContent = p[lang] || p.ja;
    };
    window.__renderDaily(document.documentElement.lang === "en" ? "en" : "ja");
  }

  /* ── #マイプラス10: walking tip (date-rotating + "next" omikuji) ──────── */
  var walkTip = document.getElementById("walkTip");
  if (walkTip && window.DAILY && window.DAILY.walkTips && window.DAILY.walkTips.length) {
    var tips = window.DAILY.walkTips;
    var wnow = new Date();
    var wstart = new Date(wnow.getFullYear(), 0, 1);
    var tipIx = Math.floor((wnow - wstart) / 86400000) % tips.length;
    var showTip = function () { walkTip.textContent = tips[tipIx % tips.length]; };
    showTip();
    var tipNext = document.getElementById("walkTipNext");
    if (tipNext) tipNext.addEventListener("click", function () {
      tipIx = (tipIx + 1) % tips.length;
      walkTip.classList.remove("tip-flip");
      void walkTip.offsetWidth;
      walkTip.classList.add("tip-flip");
      showTip();
    });
  }

  /* ── #マイプラス10: "今日の＋10" streak tracker (localStorage, on-device) ── */
  var trkBtn = document.getElementById("trkBtn");
  var trkWeek = document.getElementById("trkWeek");
  var trkStreak = document.getElementById("trkStreak");
  if (trkBtn && trkWeek && trkStreak) {
    var KEY = "hdl-plus10";
    var dayKey = function (d) {
      return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
    };
    var loadDone = function () {
      try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
    };
    var saveDone = function (a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} };
    // last 7 days, oldest → newest (today rightmost)
    var weekDays = function () {
      var out = [], base = new Date(); base.setHours(0, 0, 0, 0);
      for (var i = 6; i >= 0; i--) { var d = new Date(base); d.setDate(base.getDate() - i); out.push(d); }
      return out;
    };
    // current consecutive streak ending today (or yesterday if today not yet done)
    var streakCount = function (done) {
      var set = {}; for (var i = 0; i < done.length; i++) set[done[i]] = 1;
      var d = new Date(); d.setHours(0, 0, 0, 0);
      if (!set[dayKey(d)]) d.setDate(d.getDate() - 1); // allow streak to count up to yesterday
      var n = 0;
      while (set[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
      return n;
    };
    var dots = trkWeek.querySelectorAll(".trk-dot");
    var dayEls = trkWeek.querySelectorAll(".trk-day");
    var days = weekDays();
    var WD_JA = ["日", "月", "火", "水", "木", "金", "土"];
    var WD_EN = ["S", "M", "T", "W", "T", "F", "S"];
    var render = function () {
      var done = loadDone();
      var set = {}; for (var i = 0; i < done.length; i++) set[done[i]] = 1;
      var todayDone = !!set[dayKey(new Date())];
      var enLbl = document.documentElement.lang === "en";
      for (var j = 0; j < dots.length; j++) {
        var on = !!set[dayKey(days[j])];
        dots[j].classList.toggle("on", on);
        dots[j].classList.toggle("is-today", j === dots.length - 1);
        if (dayEls[j]) dayEls[j].textContent = (enLbl ? WD_EN : WD_JA)[days[j].getDay()];
      }
      var n = streakCount(done);
      var en = document.documentElement.lang === "en";
      if (n > 0) {
        trkStreak.textContent = en ? ("Streak: " + n + (n === 1 ? " day" : " days") + " — keep it up!")
          : ("連続 " + n + " 日 — その調子！");
      } else {
        trkStreak.textContent = en ? "Tap below to start your streak." : "下のボタンで連続記録をスタート。";
      }
      trkBtn.classList.toggle("is-done", todayDone);
      trkBtn.textContent = todayDone
        ? trkBtn.getAttribute(en ? "data-en-done" : "data-ja-done")
        : trkBtn.getAttribute(en ? "data-en-do" : "data-ja-do");
    };
    trkBtn.addEventListener("click", function () {
      var done = loadDone(), k = dayKey(new Date()), i = done.indexOf(k);
      if (i === -1) { done.push(k); } else { done.splice(i, 1); } // tap again to undo
      saveDone(done);
      render();
    });
    render();
    window.__renderMyp = render; // re-render labels on language switch
  }

  /* ── #マイプラス10: IF-THEN plan builder ─────────────────────────────── */
  var bldCue = document.getElementById("bldCue");
  var bldAct = document.getElementById("bldAct");
  var bldOut = document.getElementById("bldOut");
  if (bldCue && bldAct && bldOut) {
    var bldConj = document.querySelector(".bld-conj");
    var bldCopy = document.getElementById("bldCopy");
    var optText = function (sel) {
      var o = sel.options[sel.selectedIndex];
      var en = document.documentElement.lang === "en";
      return o.getAttribute(en ? "data-en" : "data-ja") || o.textContent;
    };
    var planText = function () {
      var en = document.documentElement.lang === "en";
      var c = optText(bldCue), a = optText(bldAct);
      return en ? (c + ", " + a + ".") : ("「" + c + "、" + a + "」");
    };
    var renderPlan = function () {
      if (bldConj) bldConj.textContent = bldConj.getAttribute(document.documentElement.lang === "en" ? "data-en" : "data-ja");
      bldOut.textContent = planText();
    };
    bldCue.addEventListener("change", renderPlan);
    bldAct.addEventListener("change", renderPlan);
    if (bldCopy) bldCopy.addEventListener("click", function () {
      var txt = planText(), en = document.documentElement.lang === "en";
      var done = function () {
        bldCopy.classList.add("is-copied");
        bldCopy.textContent = bldCopy.getAttribute(en ? "data-en-done" : "data-ja-done");
        setTimeout(function () {
          bldCopy.classList.remove("is-copied");
          bldCopy.textContent = bldCopy.getAttribute(en ? "data-en" : "data-ja");
        }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done, done);
      } else {
        try {
          var ta = document.createElement("textarea");
          ta.value = txt; document.body.appendChild(ta); ta.select();
          document.execCommand("copy"); document.body.removeChild(ta); done();
        } catch (e) {}
      }
    });
    renderPlan();
    // chain into language switch alongside the tracker
    var prevMyp = window.__renderMyp;
    window.__renderMyp = function (lang) { if (prevMyp) prevMyp(lang); renderPlan(); };
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
