/* build.js — generate the pure-static Habit Design Lab site from bilingual data.
   Output: index.html, publications.html, admissions.html, news.html (no React, no build at runtime).
   JA copy is baked into the HTML for SEO; an embedded I18N dictionary drives the EN toggle.
   Run: node _src/build.js   (from the site/ directory) */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/* ---- load bilingual data (data.js / news-data.js attach to window) ---- */
const SITE = path.resolve(__dirname, "..");
/* cache-busting version: short hash of everything that affects the output,
   appended as ?v=… to css/js so browsers always fetch fresh assets after a deploy. */
const ASSET_VER = (function () {
  const parts = [
    path.join(SITE, "css", "site.css"),
    path.join(SITE, "js", "site.js"),
    path.join(__dirname, "data.js"),
    path.join(__dirname, "news-data.js"),
    path.join(__dirname, "daily.js"),
    path.join(__dirname, "build.js"),
  ].map((p) => { try { return fs.readFileSync(p, "utf8"); } catch (e) { return ""; } }).join(" ");
  return crypto.createHash("md5").update(parts).digest("hex").slice(0, 8);
})();
const win = {};
global.window = win;
new Function("window", fs.readFileSync(path.join(__dirname, "data.js"), "utf8"))(win);
new Function("window", fs.readFileSync(path.join(__dirname, "news-data.js"), "utf8"))(win);
new Function("window", fs.readFileSync(path.join(__dirname, "resources.js"), "utf8"))(win);
const JA = win.LAB_DATA.ja, EN = win.LAB_DATA.en;
const NEWS = win.NEWS_ALL, NEWS_LABELS = win.NEWS_TAG_LABELS;
const RESOURCES = win.RESOURCES || { books: [], apps: [] };

/* ---- i18n registry: every translatable node gets a key ---- */
const I18N = {};
let _id = 0;
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
/* field(jaText, enText) -> {attr, v}; place v as element content, attr on the element */
function field(ja, en, html = false) {
  const k = "t" + (_id++);
  I18N[k] = { ja, en };
  return { attr: ` data-i18n="${k}"` + (html ? " data-i18n-html" : ""), v: html ? ja : esc(ja) };
}
/* nl2br for multi-line statements */
function brLines(s) { return esc(s).replace(/\n/g, "<br>"); }

/* phraseJa — insert <wbr> break opportunities at Japanese phrase boundaries.
   Combined with `word-break:keep-all` in CSS, the browser then breaks ONLY at
   these phrase points (never mid-word) — and works in every browser, unlike
   the Chrome-only `word-break:auto-phrase`. Heuristic: break before opening
   brackets, after closing brackets / punctuation, and after common particles. */
/* Manual phrase breaks for prominent display titles (where auto-heuristics
   over- or under-segment). Keys are matched after stripping zero-width spaces. */
var WBR_OVERRIDES = {
  "あなたが創りあげたいものはなんですか？": "あなたが<wbr>創りあげたい<wbr>ものは<wbr>なんですか？",
  "興味がある方、まずお話ししましょう。": "興味がある方、<wbr>まず<wbr>お話ししましょう。",
};
function phraseJa(s) {
  var key = s.replace(/​/g, "");
  if (WBR_OVERRIDES[key]) return WBR_OVERRIDES[key];
  var t = esc(s);
  t = t.replace(/([「『（【〔])/g, "<wbr>$1");                         // before opening brackets
  t = t.replace(/([、。，．・…！？」』）】〕])/g, "$1<wbr>");           // after punctuation / closing brackets
  // only particles that rarely occur word-internally (avoids splitting 「もの」「なんです」 etc.)
  t = t.replace(/(を|へ|から|まで|より|ながら)(?=[぀-ヿ一-龯])/g, "$1<wbr>");
  t = t.replace(/​/g, "<wbr>");                                  // existing zero-width spaces
  t = t.replace(/(<wbr>)+/g, "<wbr>");                                // collapse duplicates
  t = t.replace(/^<wbr>|<wbr>$/g, "");                                // trim ends
  return t;
}
/* Japanese-phrased html field: JA gets <wbr> phrase breaks, EN stays plain (escaped). */
function fieldJ(ja, en) { return field(phraseJa(ja), esc(en), true); }
const YT_ICON = `<svg class="yt-icon" aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="vertical-align:middle;margin-right:.2em"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>`;

/* ---- shared chrome ---------------------------------------------------- */
const NAV = [
  { id: "about", type: "section" },
  { id: "research", type: "section" },
  { id: "works", type: "section" },
  { id: "members", type: "section" },
  { id: "publications", type: "page", href: "publications.html" },
  { id: "news", type: "section" },
  { id: "teaching", type: "section" },
  { id: "join", type: "page", href: "admissions.html" },
];
/* LABMARK — 習慣化デザインラボのシンボル（吹き出し型ループマーク。ロゴキット mark-black / mark-white と同形）。
   currentColor で塗れないラスタ入りSVGのため、暗い背景（hero の eyebrow-light）では white:true で白版を使う。
   ここが全HTMLの唯一の正準ソース。ロゴを変える時は生成物のHTMLではなく必ずこの定義を直すこと。 */
const LABMARK = (size = 30, white = false) => `<span class="labmark" style="width:${size}px;height:${size}px" aria-hidden="true"><img src="/logo-mark${white ? "-white" : ""}.svg" alt="" style="display:block;width:100%;height:100%;object-fit:contain"></span>`;

function nav(mode /* "home" | "sub" */, current) {
  const lab = field(JA.brand.lab, EN.brand.lab);
  const sub = field(JA.brand.sub, EN.brand.sub);
  const brandInner = `${LABMARK(30)}<span class="brand-tx"><span class="brand-lab"${lab.attr}>${lab.v}</span><span class="brand-sub"${sub.attr}>${sub.v}</span></span>`;
  const brand = mode === "home"
    ? `<a class="brand" href="#top">${brandInner}</a>`
    : `<a class="brand" href="index.html">${brandInner}</a>`;
  const links = NAV.map((it) => {
    const navItem = JA.nav.find((n) => n.id === it.id);
    const lbl = field(navItem.label, EN.nav.find((n) => n.id === it.id).label);
    if (it.type === "section") {
      const href = mode === "home" ? `#${it.id}` : `index.html#${it.id}`;
      return `<a class="nav-link" href="${href}"${lbl.attr} data-spy="${it.id}">${lbl.v}</a>`;
    }
    const on = current === it.id ? " on" : "";
    return `<a class="nav-link${on}" href="${it.href}"${lbl.attr}>${lbl.v}</a>`;
  }).join("");
  const cta = field(JA.cta, EN.cta);
  const langLabel = field(JA.langLabel, EN.langLabel);
  const portal = field("習慣化デザイン トップ", "Habit Design home");
  const portalLink = `<a class="nav-link nav-portal" href="/"${portal.attr}>${portal.v}</a>`;
  return `<header class="nav${mode === "home" ? "" : " solid"}" id="siteNav">
  <div class="nav-in">
    ${brand}
    <nav class="nav-links" id="navLinks">${portalLink}${links}</nav>
    <div class="nav-right">
      <button class="lang" id="langToggle" type="button"><span class="lang-dot" aria-hidden="true"></span><span id="langLabel"${langLabel.attr}>${langLabel.v}</span></button>
      <a class="btn btn-accent btn-sm nav-cta" href="admissions.html"${cta.attr}>${cta.v}</a>
      <button class="nav-burger" id="navBurger" type="button" aria-label="メニュー" aria-expanded="false" aria-controls="navLinks"><span></span><span></span><span></span></button>
    </div>
  </div>
</header>`;
}

/* footer sitemap nav — internal links to every main page (crawlability + secondary nav).
   Uses stable custom i18n keys (fn*) instead of the field() counter, so adding it does
   NOT renumber the sequential t-keys of page content. */
/* note 連載「続く仕組みの実験ノート」。ハブ・研究室トップの noteBand と、フッターのサイトマップから導線を張る。
   個別記事へのリンクは COLUMN の noteUrl（各コラム末尾）が持つ。ここはマガジン（連載トップ）。 */
const NOTE_URL = "https://note.com/ohta_ken";

const FOOTER_NAV = [
  { key: "fnhLearn", ja: "習慣化を知る", en: "Learn", links: [
    { href: "/science.html", key: "fnScience", ja: "習慣化の科学", en: "The Science" },
    { href: "/books.html", key: "fnBooks", ja: "習慣化の本", en: "Books" },
    { href: "/apps.html", key: "fnApps", ja: "習慣化アプリ", en: "Apps" },
    { href: "/column.html", key: "fnColumn", ja: "コラム", en: "Column" },
    { href: NOTE_URL, key: "fnNote", ja: "note連載", en: "note (series)", ext: true },
  ] },
  { key: "fnhWork", ja: "活動・事例", en: "Work & Cases", links: [
    { href: "/myplus10.html", key: "fnMyplus10", ja: "#マイプラス10", en: "#MyPlus10" },
    { href: "/case-walking-app.html", key: "fnCaseWalk", ja: "運動習慣化アプリ共同研究", en: "Exercise-habit app (R&D)" },
    { href: "/case-izumi.html", key: "fnCaseIzumi", ja: "泉パークタウン共創", en: "Izumi Park Town" },
    { href: "/case-matsuri.html", key: "fnCaseMatsuri", ja: "祭りデザインラボ", en: "Matsuri Design Lab" },
    { href: "/case-habit-business.html", key: "fnCaseBiz", ja: "習慣化事業支援", en: "Habit business support" },
  ] },
  { key: "fnhLab", ja: "研究室・連携", en: "Lab & Contact", links: [
    { href: "/ohtalab/", key: "fnLab", ja: "太田賢研究室", en: "Ohta Lab" },
    { href: "/ohtalab/members.html", key: "fnMembers", ja: "配属生と卒業研究", en: "Students & Theses" },
    { href: "/profile.html", key: "fnProfile", ja: "太田 賢 プロフィール", en: "Ken Ohta — Profile" },
    { href: "/work-with-us.html", key: "fnWork", ja: "依頼・連携", en: "Work with us" },
    { href: "/ohtalab/publications.html", key: "fnPubs", ja: "業績・受賞", en: "Publications & Awards" },
  ] },
];

function footerNav() {
  const cols = FOOTER_NAV.map((g) => {
    I18N[g.key] = { ja: g.ja, en: g.en };
    const items = g.links.map((l) => {
      I18N[l.key] = { ja: l.ja, en: l.en };
      const ext = l.ext ? ` target="_blank" rel="noopener"` : "";
      return `<li><a href="${l.href}"${ext} data-i18n="${l.key}">${esc(l.ja)}</a></li>`;
    }).join("");
    return `<div class="footer-nav-col"><h4 data-i18n="${g.key}">${esc(g.ja)}</h4><ul>${items}</ul></div>`;
  }).join("");
  return `<nav class="footer-nav" aria-label="サイトマップ">${cols}</nav>`;
}

function footer() {
  const lab = field(JA.brand.lab, EN.brand.lab);
  const uni = field(JA.brand.uni, EN.brand.uni);
  const cp = field(JA.footer.copyright, EN.footer.copyright);
  const portal = field("習慣化デザインラボ ポータルトップ →", "Habit Design Lab portal →");
  const privLink = field("プライバシーポリシー", "Privacy");
  const colLink = field("コラム", "Column");
  return `<footer class="footer footer-block">
  <div class="wrap">
    ${footerNav()}
    <div class="footer-in">
    <div class="footer-brand">${LABMARK(28)}<div><div class="f-lab"${lab.attr}>${lab.v}</div><div class="f-uni"${uni.attr}>${uni.v}</div></div></div>
    <div class="footer-meta"><div${cp.attr}>${cp.v}</div><div class="footer-links"><a class="more-link" href="/"${portal.attr}>${portal.v}</a><a class="more-link" href="/column.html"${colLink.attr}>${colLink.v}</a><a class="more-link" href="/privacy.html"${privLink.attr}>${privLink.v}</a></div></div>
    </div>
  </div>
</footer>`;
}

/* section header */
function secHead(node, opts = {}) {
  const enNode = opts.en;
  const title = opts.titleHtml ? field(node.title, enNode.title, true) : fieldJ(node.title, enNode.title);
  const lead = node.lead ? fieldJ(node.lead, enNode.lead) : null;
  const kicker = field(node.kicker, enNode.kicker);
  const cls = opts.titleClass ? " " + opts.titleClass : "";
  return `<header class="sec-head${opts.center ? " is-center" : ""}">
    <div class="sec-eyebrow"><span class="sec-num">${esc(node.num)}</span><span class="sec-kicker"${kicker.attr}>${kicker.v}</span></div>
    <h2 class="sec-title${cls} reveal"${title.attr}>${title.v}</h2>
    ${lead ? `<p class="sec-lead reveal"${lead.attr}>${lead.v}</p>` : ""}
  </header>`;
}
function blockLabel(ja, en, extra = "") {
  const f = field(ja, en);
  return `<div class="block-label${extra}"${f.attr}>${f.v}</div>`;
}
function tag(ja, en, tone = "soft") {
  const f = field(ja, en);
  return `<span class="tag tag-${tone}"${f.attr}>${f.v}</span>`;
}
function figure(src, alt, jaCap, enCap, cls = "", ratio = "", capHtml = false) {
  const cap = jaCap ? field(jaCap, enCap, capHtml) : null;
  const style = ratio ? ` style="aspect-ratio:${ratio};border-radius:6px"` : ` style="border-radius:6px"`;
  return `<figure class="figure reveal ${cls}"><img src="${src}" alt="${esc(alt || "")}" loading="lazy"${style}>${cap ? `<figcaption class="figure-cap"${cap.attr}>${cap.v}</figcaption>` : ""}</figure>`;
}

/* ---- HERO (editorial + hybrid) --------------------------------------- */
function heroLinesHtml(lines) {
  return lines.map((ln) => `<span class="hero-line${ln.accent ? " accent" : ""}">` +
    ln.units.map((u, j) => (j > 0 ? "<wbr>" : "") + `<span class="u">${esc(u)}</span>`).join("") +
    `</span>`).join("");
}
function hero() {
  const h = JA.hero, he = EN.hero;
  const eyebrow = field(h.eyebrow, he.eyebrow);
  const titleField = field(heroLinesHtml(h.lines), heroLinesHtml(he.lines), true);
  const lead = fieldJ(h.lead, he.lead);
  const cta = field(JA.cta + " →", EN.cta + " →");
  const scroll = field(h.scroll, he.scroll);
  const HERO_IMAGES = ["/assets/hero-walk.jpg", "/assets/hero-phones.jpg", "/assets/hero-study.jpg", "/assets/hero-sleep.jpg", "/assets/hero-food.jpg", "/assets/hero-plan.jpg"];
  const slides = HERO_IMAGES.map((src, i) => `<div class="hero-slide${i === 0 ? " active" : ""}" style="background-image:url(${src})"></div>`).join("");
  return `<section class="hero hero-editorial">
  <div class="hero-hybrid" id="heroHybrid">
    <div class="hero-layer on" data-layer="photos"><div class="hero-slides" id="heroSlides" aria-hidden="true">${slides}</div></div>
    <div class="hero-layer" data-layer="geometric"><canvas class="hero-anim" id="heroAnim" aria-hidden="true"></canvas></div>
  </div>
  <div class="hero-ed-overlay">
    <div class="hero-inner">
      <div class="eyebrow eyebrow-light">${LABMARK(18, true)} <span${eyebrow.attr}>${eyebrow.v}</span></div>
      <h1 class="hero-h reveal"${titleField.attr}>${titleField.v}</h1>
      <p class="hero-lead reveal"${lead.attr}>${lead.v}</p>
      <div class="hero-cta reveal">
        <a class="btn btn-accent" href="#join"${cta.attr}>${cta.v}</a>
        <a class="btn btn-ghost" href="#research"${scroll.attr}>${scroll.v}</a>
      </div>
    </div>
  </div>
</section>`;
}

/* ---- ABOUT ----------------------------------------------------------- */
function about() {
  const a = JA.about, e = EN.about;
  const vLabel = field(a.visionLabel, e.visionLabel);
  const vH = fieldJ(a.vision, e.vision);
  const vBody = fieldJ(a.visionBody, e.visionBody);
  const apLabel = field(a.approachLabel, e.approachLabel);
  const apH = fieldJ(a.approachTitle, e.approachTitle);
  const apBody = fieldJ(a.approachBody, e.approachBody);
  const sides = a.sides.map((s, i) => {
    const es = e.sides[i];
    const t = field(s.title, es.title);
    const items = s.items.map((it, j) => { const f = field(it, es.items[j]); return `<li${f.attr}>${f.v}</li>`; }).join("");
    return `<div class="ha-side ha-${s.tag.toLowerCase()}"><div class="ha-tag">${esc(s.tag)}</div><div class="ha-title"${t.attr}>${t.v}</div><ul>${items}</ul></div>`;
  }).join("");
  return `<section id="about" class="section">
  <div class="wrap">
    ${secHead(a, { en: e, titleClass: "nowrap" })}
    ${figure("/assets/lab-atmosphere.jpg", "研究室で発表・議論する学生", '<a href="https://www.myu.ac.jp/academics/news/folder002/2024/7788/" target="_blank" rel="noopener">プロトタイプを持ち寄って磨き込む。</a>', '<a href="https://www.myu.ac.jp/academics/news/folder002/2024/7788/" target="_blank" rel="noopener">Bringing prototypes together and refining them.</a>', "about-figure", "16 / 8", true)}
    <div class="about-grid">
      <div class="vision-card reveal">
        <div class="card-label"${vLabel.attr}>${vLabel.v}</div>
        <h3 class="vision-h"${vH.attr}>${vH.v}</h3>
        <p class="vision-body"${vBody.attr}>${vBody.v}</p>
      </div>
      <div class="approach-card reveal">
        <div class="card-label"${apLabel.attr}>${apLabel.v}</div>
        <h3 class="approach-h"${apH.attr}>${apH.v}</h3>
        <p class="approach-body"${apBody.attr}>${apBody.v}</p>
        <div class="ha-grid">${sides}<div class="ha-amp" aria-hidden="true">×</div></div>
      </div>
    </div>
  </div>
</section>`;
}

/* ---- RESEARCH -------------------------------------------------------- */
function research() {
  const r = JA.research, e = EN.research;
  const levels = r.levels.map((lv, i) => {
    const elv = e.levels[i];
    const t = field(lv.tag, elv.tag);
    const body = field(lv.body, elv.body);
    const bars = [0, 1, 2].map((k) => `<span class="${k <= i ? "on" : ""}"></span>`).join("");
    return `<div class="level reveal"><div class="level-bar" aria-hidden="true">${bars}</div><div class="level-tag"${t.attr}>${t.v}</div><div class="level-en">${esc(lv.title)}</div><p${body.attr}>${body.v}</p></div>`;
  }).join("");
  const loopLabel = field(r.loopLabel, e.loopLabel);
  const cyberLabel = r.loop[1].side, physLabel = r.loop[0].side;
  const cyberF = field(cyberLabel, e.loop[1].side), physF = field(physLabel, e.loop[0].side);
  const steps = r.loop.map((s, i) => {
    const es = e.loop[i];
    const side = field(s.side, es.side);
    const step = field(s.step, es.step);
    const body = field(s.body, es.body);
    const isCyber = s.side === cyberLabel;
    return `<div class="loop-step side-${isCyber ? "cyber" : "phys"} reveal"><span class="loop-idx">${String(i + 1).padStart(2, "0")}</span><span class="loop-side"${side.attr}>${side.v}</span><h4${step.attr}>${step.v}</h4><p${body.attr}>${body.v}</p>${i < r.loop.length - 1 ? `<span class="loop-arrow" aria-hidden="true">→</span>` : ""}</div>`;
  }).join("");
  const domainsLabel = field(r.domainsLabel, e.domainsLabel);
  /* per-domain "あるある課題 → 研究アプローチ" shown in a popover on click (aligned with r.domains order) */
  const DOMAIN_DETAIL = [
    { issue: "「やる気はあるのに、気づけば1週間サボっている。」", approach: "行動センシングとリマインド設計で、無意識に「続く仕掛け」をつくる研究をしています。" },
    { issue: "「健診でひっかかっても、3か月後には元通り。」", approach: "ICTを使った小さな行動変容のきっかけ設計で、継続的な健康行動を支援します。" },
    { issue: "「動画教材を積んでいるが、一度も開いていない。」", approach: "学習ログの分析と習慣化アプリで、「学び続けられる人」を支える仕組みを研究しています。" },
    { issue: "「気づいたら2時間たっていた…」", approach: "スマホ利用パターンの可視化とデジタルウェルビーイング設計で、意図した使い方を支援します。" },
    { issue: "「食事記録を3日続けたことがない。」", approach: "記録の摩擦を減らすUIデザインで、無理なく続く食習慣づくりを探っています。" },
    { issue: "「タスク管理アプリが増えるのに、仕事は減らない。」", approach: "行動パターンのデータ化で、個人に合った生産性向上の方法を研究しています。" },
    { issue: "「エコに関心はあるけど、日々の行動に落とし込めない。」", approach: "IoTセンシングと小さな目標設定で、省エネ行動の習慣化を支援します。" },
    { issue: "「町内会に入っているが、活動にはなかなか参加できていない。」", approach: "デジタルとリアルをつなぐ地域コミュニケーション設計を研究しています。" },
  ];
  const domains = r.domains.map((dm, i) => {
    const f = field(dm, e.domains[i]);
    const d = DOMAIN_DETAIL[i] || { issue: "", approach: "" };
    return `<button type="button" class="domain reveal" data-issue="${esc(d.issue)}" data-approach="${esc("→ " + d.approach)}"${f.attr}>${f.v}</button>`;
  }).join("");
  const dcClose = field("閉じる", "Close");
  const domainCard = `<div class="domain-card-bg" id="domainCardBg" aria-hidden="true"></div>
    <div class="domain-card" id="domainCard" role="dialog" aria-modal="true" aria-labelledby="domainCardTitle">
      <button class="domain-card-close" id="domainCardClose" type="button" aria-label="${dcClose.v}">×</button>
      <div class="domain-card-title" id="domainCardTitle"></div>
      <p class="domain-card-issue" id="domainCardIssue"></p>
      <p class="domain-card-approach" id="domainCardApproach"></p>
    </div>`;
  const projectsLabel = field(r.projectsLabel, e.projectsLabel);
  const shots = ["/assets/project-hikari.jpg", "/assets/project-chatbot.jpg"];
  const projects = r.projects.map((p, i) => {
    const ep = e.projects[i];
    const tg = field(p.tag, ep.tag, "accent");
    const sub = field(p.sub, ep.sub);
    const body = field(p.body, ep.body);
    return `<div class="project reveal"><span class="tag tag-accent"${tg.attr}>${tg.v}</span><h3>${esc(p.title)}</h3><div class="project-sub"${sub.attr}>${sub.v}</div><p${body.attr}>${body.v}</p><img class="project-shot" src="${shots[i]}" alt="${esc(p.title)}" loading="lazy"></div>`;
  }).join("");
  return `<section id="research" class="section section-alt">
  <div class="wrap">
    ${secHead(r, { en: e })}
    ${figure("/assets/people-crossing.jpg", "", "人の行動を、社会のスケールで見る。", "Seeing human behavior at the scale of society.", "research-band", "2 / 1")}
    <div class="levels">${levels}</div>
    <div class="block-label"${loopLabel.attr}>${loopLabel.v}</div>
    <div class="loop">
      <div class="loop-rail loop-cyber"><span${cyberF.attr}>${cyberF.v}</span></div>
      <div class="loop-steps">${steps}</div>
      <div class="loop-rail loop-phys"><span${physF.attr}>${physF.v}</span></div>
    </div>
    <div class="block-label"${domainsLabel.attr}>${domainsLabel.v}</div>
    <div class="domains">${domains}</div>
    ${domainCard}
    <div class="block-label"${projectsLabel.attr}>${projectsLabel.v}</div>
    <div class="projects">${projects}</div>
  </div>
</section>`;
}

/* ---- WORKS ----------------------------------------------------------- */
function works() {
  const w = JA.works, e = EN.works;
  const groups = w.groups.map((g, i) => {
    const eg = e.groups[i];
    const tg = field(g.tag, eg.tag, "accent");
    const items = g.items.map((it, j) => { const f = field(it, eg.items[j]); return `<li><span class="work-play" aria-hidden="true">▶</span><span${f.attr}>${f.v}</span></li>`; }).join("");
    return `<div class="work-group reveal"><div class="work-head"><span class="tag tag-accent"${tg.attr}>${tg.v}</span></div><ul class="work-list">${items}</ul></div>`;
  }).join("");
  const cap = field("2025年度卒業研究・制作展＠せんだいメディアテーク", "Graduation exhibition 2025 @ Sendai Mediatheque");
  const link = field(w.link + " →", e.link + " →");
  return `<section id="works" class="section">
  <div class="wrap">
    ${secHead(w, { en: e, titleClass: "qwrap" })}
    <div class="video-frame works-video reveal">
      <video src="/assets/habitus2025.mp4" autoplay muted loop playsinline preload="metadata"></video>
      <div class="video-cap"><a class="video-cap-tx" href="https://www.myu.ac.jp/news/news/8982/" target="_blank" rel="noopener"${cap.attr}>${cap.v}</a></div>
    </div>
    <div class="works-grid">${groups}</div>
  </div>
</section>`;
}

/* ---- MEMBERS --------------------------------------------------------- */
function members() {
  const m = JA.members, e = EN.members;
  const role = field(m.pi.role, e.pi.role);
  const body = field(m.pi.body, e.pi.body);
  const piName = field(m.pi.name, e.pi.name);
  const piReading = field(m.pi.reading, e.pi.reading);
  const piProfileLink = field("プロフィール・実績を見る →", "Profile & experience →");
  const piTags = m.pi.tags.map((tg, i) => { const f = field(tg, e.pi.tags[i]); return `<span class="tag tag-line"${f.attr}>${f.v}</span>`; }).join("");
  const gradLabel = field(m.groups[0].label, e.groups[0].label);
  const grad = m.groups[0].people.map((p, i) => {
    const ep = e.groups[0].people[i];
    const name = field(p.name, ep.name);
    return `<div class="mem-card reveal"><div class="mem-name"${name.attr}>${name.v}</div><div class="mem-role">${esc(p.role)}</div></div>`;
  }).join("");
  const cohortsLabel = field(m.cohortsLabel, e.cohortsLabel);
  const rosterLink = field(m.rosterLink, e.rosterLink);
  const YT_COHORT = "https://www.youtube.com/watch?v=m2w2z6OWzWc&list=PL-nkSu8lcYNIOwtkxR-JukGe7BJTISdum";
  const cohorts = ["2025", "2024", "2023"].map((y) => {
    if (y === "2024") {
      const jaCap = `2024${esc(m.cohortSuffix)}（<a href="${YT_COHORT}" target="_blank" rel="noopener">${YT_ICON}#HABITUS2025</a>）`;
      const enCap = `2024${esc(e.cohortSuffix)}（<a href="${YT_COHORT}" target="_blank" rel="noopener">${YT_ICON}#HABITUS2025</a>）`;
      return figure("/assets/members-2024.jpg", "2024年度 配属生（#HABITUS2025）", jaCap, enCap, "cohort", "4 / 3", true);
    }
    return figure(`/assets/members-${y}.jpg`, y + m.cohortSuffix, y + m.cohortSuffix, y + e.cohortSuffix, "cohort", "4 / 3");
  }).join("");
  return `<section id="members" class="section section-alt">
  <div class="wrap">
    ${secHead(m, { en: e })}
    <div class="pi reveal">
      <img class="pi-photo" src="/assets/ohta.png" alt="${esc(m.pi.name)}" loading="lazy">
      <div class="pi-info">
        <div class="pi-role"${role.attr}>${role.v}</div>
        <h3 class="pi-name"${piName.attr}>${piName.v}</h3>
        <div class="pi-reading"${piReading.attr}>${piReading.v}</div>
        <p class="pi-body"${body.attr}>${body.v}</p>
        <div class="pi-tags">${piTags}</div>
        <div class="more-row" style="margin-top:1.1rem"><a class="more-link" href="/profile.html"${piProfileLink.attr}>${piProfileLink.v}</a></div>
      </div>
    </div>
    <div class="block-label"${gradLabel.attr}>${gradLabel.v}</div>
    <div class="mem-grid mem-grid-grad">${grad}</div>
    <div class="block-label"${cohortsLabel.attr}>${cohortsLabel.v}</div>
    <div class="cohorts">${cohorts}</div>
    <div class="more-row reveal"><a class="more-link" href="/ohtalab/members.html"${rosterLink.attr}>${rosterLink.v} →</a></div>
  </div>
</section>`;
}

/* ---- MEMBERS PAGE (/ohtalab/members.html) ----------------------------
   配属生の氏名と卒業研究テーマの一覧。正準ソースは data.js の membersPage。
   現4年はテーマ検討中のため領域キーワードのみを出す（current: true）。 */
function roster(people, enPeople) {
  return people.map((p, i) => {
    const ep = enPeople[i];
    const name = field(p.name, ep.name);
    const theme = fieldJ(p.theme, ep.theme);
    const role = p.role ? field(p.role, ep.role) : null;
    const roleHtml = role ? `<span class="roster-role"${role.attr}>${role.v}</span>` : "";
    return `<li class="roster-item reveal">
      <div class="roster-name"${name.attr}>${name.v}</div>${roleHtml}
      <p class="roster-theme"${theme.attr}>${theme.v}</p>
    </li>`;
  }).join("");
}

function membersPageBody() {
  const m = JA.membersPage, e = EN.membersPage;
  const gradLabel = field(m.gradLabel, e.gradLabel);
  const currentNote = fieldJ(m.currentNote, e.currentNote);
  const alumniLabel = field(m.alumniLabel, e.alumniLabel);
  const joinLead = fieldJ(m.joinLead, e.joinLead);
  const joinLink = field(m.joinLink, e.joinLink);

  const grads = roster(m.grads, e.grads);
  const current = m.cohorts.find((c) => c.current);
  const enCurrent = e.cohorts.find((c) => c.current);
  const alumni = m.cohorts.filter((c) => !c.current);

  const cohortBlock = (c, ec) => {
    const label = field(c.label, ec.label);
    return `<div class="roster-cohort reveal">
      <div class="roster-head">
        <h3 class="roster-year"${label.attr}>${label.v}</h3>
        <img class="roster-photo" src="/assets/${c.photo}?v=${ASSET_VER}" alt="${esc(c.label)}" loading="lazy">
      </div>
      <ul class="roster">${roster(c.people, ec.people)}</ul>
    </div>`;
  };
  const currentLabel = field(m.currentLabel, e.currentLabel);

  return `<section class="section" style="padding-top:2rem">
  <div class="wrap">
    <div class="block-label"${gradLabel.attr}>${gradLabel.v}</div>
    <ul class="roster">${grads}</ul>

    <div class="block-label"${currentLabel.attr}>${currentLabel.v}</div>
    <p class="roster-note"${currentNote.attr}>${currentNote.v}</p>
    ${cohortBlock(current, enCurrent)}

    <div class="block-label"${alumniLabel.attr}>${alumniLabel.v}</div>
    ${alumni.map((c, i) => cohortBlock(c, e.cohorts.filter((x) => !x.current)[i])).join("\n")}

    <div class="more-row" style="margin-top:2.4rem">
      <span${joinLead.attr}>${joinLead.v}</span>
      <a class="more-link" href="/ohtalab/admissions.html"${joinLink.attr}>${joinLink.v} →</a>
    </div>
  </div>
</section>`;
}

/* ---- PUBLICATIONS (list builder, used by home highlights + archive) -- */
function pubList(items) {
  const p = JA.publications, e = EN.publications;
  return items.map((idx) => {
    const it = p.items[idx], eit = e.items[idx];
    let title;
    if (it.url) {
      const aOpen = `<a href="${esc(it.url)}" target="_blank" rel="noopener">`;
      title = field(`${aOpen}${phraseJa(it.title)}</a>`, `${aOpen}${esc(eit.title)}</a>`, true);
    } else {
      title = fieldJ(it.title, eit.title);
    }
    const sub = field(`${it.venue} · ${it.authors}`, `${eit.venue} · ${eit.authors}`);
    const catF = field(it.cat, eit.cat, it.cat === p.filters[2] ? "accent" : "soft");
    const tone = it.cat === p.filters[2] ? "accent" : "soft";
    return `<li class="pub reveal" data-cat="${esc(it.cat)}"><div class="pub-meta"><span class="pub-year">${esc(it.year)}</span><span class="tag tag-${tone}"${catF.attr}>${catF.v}</span></div><div class="pub-main"><h4 class="pub-title"${title.attr}>${title.v}</h4><div class="pub-sub"${sub.attr}>${sub.v}</div></div></li>`;
  }).join("");
}
function pubHighlights() {
  const p = JA.publications, e = EN.publications;
  const more = field(p.moreLabel + " →", e.moreLabel + " →");
  return `<section id="publications" class="section">
  <div class="wrap">
    ${secHead(p, { en: e })}
    <ul class="pubs">${pubList([0, 1, 2, 3])}</ul>
    <div class="more-row reveal"><a class="more-link" href="publications.html"${more.attr}>${more.v}</a></div>
  </div>
</section>`;
}

/* ---- NEWS (home, latest n) ------------------------------------------- */
function newsItem(it, lang0 = "ja") {
  const body = fieldJ(it.ja, it.en);
  const tags = it.tags.map((tg) => { const f = field(NEWS_LABELS.ja[tg] || tg, NEWS_LABELS.en[tg] || tg); return `<span class="tag tag-line"${f.attr}>${f.v}</span>`; }).join("");
  const tagAttr = it.tags.join(",");
  const linksHtml = (it.links || []).map((lk) => { const f = field(lk.ja, lk.en); return `<a class="more-link" href="${esc(lk.href)}" target="_blank" rel="noopener"${f.attr}>${lk.yt ? YT_ICON : ""}${f.v}</a>`; }).join("");
  const linksSection = linksHtml ? `<div style="margin-top:.5rem;display:flex;gap:.6rem;flex-wrap:wrap">${linksHtml}</div>` : "";
  return `<li class="news-item reveal" data-tags="${esc(tagAttr)}"><time class="news-date">${esc(it.date)}</time><div class="news-body"><div class="news-tags">${tags}</div><p${body.attr}>${body.v}</p>${linksSection}</div></li>`;
}
function newsHome() {
  const n = JA.news, e = EN.news;
  const items = NEWS.slice(0, 8).map((it) => newsItem(it)).join("");
  const more = field(n.moreLabel + " →", e.moreLabel + " →");
  return `<section id="news" class="section section-alt">
  <div class="wrap">
    ${secHead(n, { en: e })}
    <ul class="news">${items}</ul>
    <div class="more-row reveal"><a class="more-link" href="news.html"${more.attr}>${more.v}</a></div>
  </div>
</section>`;
}

/* ---- TEACHING -------------------------------------------------------- */
function teaching() {
  const t = JA.teaching, e = EN.teaching;
  const coursesLabel = field(t.coursesLabel, e.coursesLabel);
  const courses = t.courses.map((c, i) => { const f = field(c, e.courses[i]); return `<li class="reveal"><span class="dot" aria-hidden="true"></span><span${f.attr}>${f.v}</span></li>`; }).join("");
  const booksLabel = field(t.booksLabel, e.booksLabel);
  const covers = ["/assets/book-network-intro.jpg", "/assets/book-network-6.jpg"];
  const books = t.books.map((b, i) => { const f = field(b, e.books[i]); return `<div class="book reveal"><img class="book-cover" src="${covers[i]}" alt="${esc(b)}" loading="lazy"><div class="book-title"${f.attr}>${f.v}</div></div>`; }).join("");
  const recurrentLabel = field(t.recurrentLabel, e.recurrentLabel);
  const recurrent = fieldJ(t.recurrent, e.recurrent);
  const recurrentLink = field(t.recurrentLink + " →", e.recurrentLink + " →");
  return `<section id="teaching" class="section">
  <div class="wrap">
    ${secHead(t, { en: e })}
    <div class="teach-grid">
      <div><div class="block-label"${coursesLabel.attr}>${coursesLabel.v}</div><ul class="courses">${courses}</ul></div>
      <div><div class="block-label"${booksLabel.attr}>${booksLabel.v}</div><div class="books">${books}</div></div>
    </div>
    <div class="block-label"${recurrentLabel.attr}>${recurrentLabel.v}</div>
    <p class="students-note reveal"${recurrent.attr}>${recurrent.v}</p>
    <div class="more-row reveal"><a class="more-link" href="${esc(t.recurrentUrl)}" target="_blank" rel="noopener"${recurrentLink.attr}>${recurrentLink.v}</a></div>
  </div>
</section>`;
}

/* ---- ASPIRE BAND ----------------------------------------------------- */
function aspireBand() {
  const a = fieldJ(JA.about.aspire, EN.about.aspire);
  return `<section class="aspire-band">
  <div class="wrap">
    <div class="aspire-kicker reveal">Vision</div>
    <p class="aspire-line reveal"${a.attr}>${a.v}</p>
  </div>
</section>`;
}

/* ---- NOTE BAND (ハブ・研究室トップ共通の note 連載導線) -------------- */
function noteBand() {
  const n = JA.note, e = EN.note;
  const title = fieldJ(n.title, e.title);
  const lead = fieldJ(n.lead, e.lead);
  const cta = field(n.cta + " →", e.cta + " →");
  const account = field(n.account, e.account);
  return `<section class="note-band">
  <div class="wrap note-band-in">
    <div class="note-band-text">
      <div class="sec-eyebrow"><span class="sec-kicker">${esc(n.kicker)}</span><span class="note-account"${account.attr}>${account.v}</span></div>
      <h2 class="note-title reveal"${title.attr}>${title.v}</h2>
      <p class="note-lead reveal"${lead.attr}>${lead.v}</p>
    </div>
    <div class="note-band-cta reveal">
      <a class="btn btn-accent" href="${NOTE_URL}" target="_blank" rel="noopener"${cta.attr}>${cta.v}</a>
    </div>
  </div>
</section>`;
}

/* ---- JOIN CTA (home) ------------------------------------------------- */
function joinCTA() {
  const j = JA.join, e = EN.join;
  const title = fieldJ(j.title, e.title);
  const short = fieldJ(j.ctaShort, e.ctaShort);
  const detail = field(j.detailAction + " →", e.detailAction + " →");
  const audLabel = field(j.audienceLabel, e.audienceLabel);
  const auds = j.audiences.map((a, i) => { const f = field(a.for, e.audiences[i].for); return `<span class="chip"${f.attr}>${f.v}</span>`; }).join("");
  return `<section id="join" class="section section-cta">
  <div class="wrap join-cta-in">
    <div class="join-cta-text">
      <div class="sec-eyebrow"><span class="sec-num">${esc(j.num)}</span><span class="sec-kicker"${field(j.kicker, e.kicker).attr}>${esc(j.kicker)}</span></div>
      <h2 class="sec-title reveal"${title.attr}>${title.v}</h2>
      <p class="sec-lead reveal"${short.attr}>${short.v}</p>
      <div class="hero-cta reveal"><a class="btn btn-accent" href="admissions.html"${detail.attr}>${detail.v}</a></div>
    </div>
    <div class="join-cta-card reveal">
      <span class="jd-label"${audLabel.attr}>${audLabel.v}</span>
      <div class="join-cta-aud">${auds}</div>
    </div>
  </div>
</section>`;
}

/* ---- ACCESS ---------------------------------------------------------- */
function access() {
  const a = JA.access, e = EN.access;
  const addrLabel = field(a.addrLabel, e.addrLabel);
  const addr = field(brLines(a.addr), brLines(e.addr), true);
  const mailLabel = field(a.mailLabel, e.mailLabel);
  const phoneLabel = field(a.phoneLabel, e.phoneLabel);
  const mapOpen = field(a.mapOpen + " →", e.mapOpen + " →");
  return `<section id="access" class="section">
  <div class="wrap">
    ${secHead(a, { en: e })}
    <div class="access-grid">
      <div class="access-info reveal">
        <div class="ai-row"><span class="ai-label"${addrLabel.attr}>${addrLabel.v}</span><span class="ai-val"${addr.attr}>${addr.v}</span></div>
        <div class="ai-row"><span class="ai-label"${mailLabel.attr}>${mailLabel.v}</span><a class="ai-val ai-link" href="mailto:${esc(a.mail)}">${esc(a.mail)}</a></div>
        <div class="ai-row"><span class="ai-label"${phoneLabel.attr}>${phoneLabel.v}</span><a class="ai-val ai-link" href="tel:${esc(a.phone.replace(/-/g, ""))}">${esc(a.phone)}</a></div>
      </div>
      <div class="access-map reveal">
        <div class="map-embed"><iframe title="campus map" src="${esc(a.mapEmbed)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
        <a class="map-open" href="${esc(a.mapUrl)}" target="_blank" rel="noopener"${mapOpen.attr}>${mapOpen.v}</a>
      </div>
    </div>
  </div>
</section>`;
}

/* ---- page hero (sub-pages) ------------------------------------------- */
function pageHero(node, enNode, leadKey) {
  const back = field("← " + JA.brand.lab, "← " + EN.brand.lab);
  const title = fieldJ(node.title, enNode.title);
  const lead = fieldJ(node[leadKey], enNode[leadKey]);
  const kicker = field(node.kicker, enNode.kicker);
  return `<section class="page-hero">
  <div class="wrap">
    <a class="crumb" href="index.html"${back.attr}>${back.v}</a>
    <div class="sec-eyebrow"><span class="sec-num">${esc(node.num)}</span><span class="sec-kicker"${kicker.attr}>${kicker.v}</span></div>
    <h1 class="page-h"${title.attr}>${title.v}</h1>
    <p class="page-lead"${lead.attr}>${lead.v}</p>
  </div>
</section>`;
}

/* ---- ARCHIVE: publications ------------------------------------------- */
function publicationsPage() {
  const p = JA.publications, e = EN.publications;
  const filters = p.filters.map((ff, i) => { const f = field(ff, e.filters[i]); return `<button class="filter${i === 0 ? " on" : ""}" type="button" data-filter="${esc(ff)}" data-filter-i="${i}"${f.attr}>${f.v}</button>`; }).join("");
  const all = p.items.map((_, i) => i);
  const rmap = field(p.researchmapLabel + " →", e.researchmapLabel + " →");
  const catchFig = figure("/assets/ichbiz-award-2025.jpg?v=" + ASSET_VER, "イチBizアワード2025 授賞式", "イチBizアワード2025 協賛企業賞受賞（太田研究室 B チーム）", "Ichi-Biz Award 2025 — partner-company awards (Ohta Lab Team B)", "pub-catch", "16 / 7");
  return `<section id="publications" class="section" style="padding-top:2rem">
  <div class="wrap">
    ${catchFig}
    <div class="filters" id="pubFilters" data-all="${esc(p.filters[0])}">${filters}</div>
    <ul class="pubs" id="pubList">${pubList(all)}</ul>
    <div class="more-row"><a class="more-link" href="${esc(p.researchmapUrl)}" target="_blank" rel="noopener"${rmap.attr}>${rmap.v}</a></div>
  </div>
</section>`;
}

/* ---- ARCHIVE: news --------------------------------------------------- */
function newsArchivePage() {
  const order = ["研究", "研究室", "表彰", "教育", "地域課題解決", "DDX", "Web", "書籍"];
  const allF = field("すべて", "All");
  const filters = `<button class="filter on" type="button" data-tag=""${allF.attr}>${allF.v}</button>` +
    order.map((tg) => { const f = field(NEWS_LABELS.ja[tg], NEWS_LABELS.en[tg]); return `<button class="filter" type="button" data-tag="${esc(tg)}"${f.attr}>${f.v}</button>`; }).join("");
  const items = NEWS.map((it) => newsItem(it)).join("");
  return `<section id="news" class="section">
  <div class="wrap">
    <div class="filters" id="newsFilters">${filters}</div>
    <ul class="news" id="newsList">${items}</ul>
  </div>
</section>`;
}

/* ---- ADMISSIONS (配属案内) ------------------------------------------- */
function admissionsBody() {
  const j = JA.join, e = EN.join, te = JA.teaching, tee = EN.teaching, w = JA.works, we = EN.works;
  const banner = figure("/assets/members-2025.jpg", "2025年度 配属生", "2025年度 配属生 · “You have own secret wings…”", "2025 cohort · “You have own secret wings…”", "join-banner");
  // WHY
  const whyH = fieldJ(j.why, e.why);
  const whyBody = fieldJ(j.whyBody, e.whyBody);
  const msg = fieldJ(j.message, e.message);
  // process
  const procLabel = field(j.processLabel, e.processLabel);
  const proc = j.process.map((s, i) => {
    const es = e.process[i];
    const t = fieldJ(s.title, es.title), b = fieldJ(s.body, es.body);
    return `<div class="proc-step reveal"><span class="proc-n">${esc(s.n)}</span><h4${t.attr}>${t.v}</h4><p${b.attr}>${b.v}</p>${i < j.process.length - 1 ? `<span class="proc-arrow" aria-hidden="true">→</span>` : ""}</div>`;
  }).join("");
  const procNote = field(j.processNote, e.processNote);
  const craftLabel = field(j.craftLabel, e.craftLabel);
  const craft = fieldJ(j.craft, e.craft);
  const equipLabel = field(j.equipLabel, e.equipLabel);
  const equip = j.equip.map((eq, i) => { const f = field(eq, e.equip[i]); return `<span class="chip"${f.attr}>${f.v}</span>`; }).join("");
  // careers
  const careersLabel = field(te.careersLabel, tee.careersLabel);
  const careers = te.careers.map((c, i) => {
    const ec = tee.careers[i];
    const t = field(c.title, ec.title), b = field(c.body, ec.body);
    return `<div class="career reveal"><span class="career-code">${esc(c.code)}</span><div class="career-tx"><div class="career-title"${t.attr}>${t.v}</div><div class="career-body"${b.attr}>${b.v}</div></div></div>`;
  }).join("");
  const studentsLabel = field(j.studentsLabel, e.studentsLabel);
  const studentsNote = fieldJ(j.studentsNote, e.studentsNote);
  const worksLink = field(w.link + " →", we.link + " →");
  const vcap = field("2025年度卒業研究・制作展＠せんだいメディアテーク", "Graduation exhibition 2025 @ Sendai Mediatheque");
  // student achievements (real, contest awards)
  const awardsLabel = field("学生の活躍（受賞・コンテスト）", "Student achievements");
  const awardsNote = fieldJ("学生がコンテストや学外の場で成果を出しています。手を動かして社会に出していく経験を、研究室として後押しします。", "Our students earn recognition in contests and beyond. We support hands-on work that reaches the real world.");
  const awards = [
    ["内閣官房主催 イチBizアワード2025 協賛企業賞（国際航業・ゼンリン）／「Otoneマップ」", "Ichi-Biz Award 2025 (Cabinet Secretariat) — Sponsor Awards (Kokusai Kogyo, Zenrin), “Otone Map”"],
    ["「生成AI×教育」妄想アイデアオーディション 部門別優秀賞", "“Generative AI × Education” idea audition — Category Excellence Award"],
    ["アーバンデータチャレンジ2023 学生奨励賞／「読み聞かせナビ」", "Urban Data Challenge 2023 — Student Encouragement Award, “Yomikikase Navi”"],
    ["学都「仙台・宮城」サイエンス・デイ 役に立つ地学賞2025", "Sendai/Miyagi Science Day — Useful Earth Science Award 2025"],
  ];
  const awardItems = awards.map((a) => { const f = fieldJ(a[0], a[1]); return `<li${f.attr}>${f.v}</li>`; }).join("");
  // faq
  const faqLabel = field(j.faqLabel, e.faqLabel);
  const faq = j.faq.map((it, i) => {
    const eit = e.faq[i];
    const q = fieldJ(it.q, eit.q), a = fieldJ(it.a, eit.a);
    return `<div class="faq-item${i === 0 ? " open" : ""}"><button class="faq-q" type="button"><span${q.attr}>${q.v}</span><span class="faq-mark" aria-hidden="true">${i === 0 ? "−" : "+"}</span></button><p class="faq-a"${a.attr}>${a.v}</p></div>`;
  }).join("");
  // final cta
  const finalTitle = fieldJ(j.title, e.title);
  const finalLead = fieldJ(j.lead, e.lead);
  const audLabel = field(j.audienceLabel, e.audienceLabel);
  const auds = j.audiences.map((a, i) => { const f = field(a.for, e.audiences[i].for); return `<span class="chip"${f.attr}>${f.v}</span>`; }).join("");
  const action = field(j.action + " →", e.action + " →");
  return `
  <section class="join-banner-sec"><div class="wrap">${banner}</div></section>
  <section class="section"><div class="wrap join-why">
    <div><div class="block-label">Why this lab</div><h2 class="why-h reveal"${whyH.attr}>${whyH.v}</h2><p class="why-body reveal"${whyBody.attr}>${whyBody.v}</p></div>
    <div class="why-quote reveal"><span class="why-q-mark" aria-hidden="true">43%</span><p${msg.attr}>${msg.v}</p></div>
  </div></section>
  <section class="section section-cta"><div class="wrap">
    <div class="block-label on-dark"${procLabel.attr}>${procLabel.v}</div>
    <div class="process">${proc}</div>
    <p class="proc-note"${procNote.attr}>${procNote.v}</p>
    <div class="join-cd">
      <div><div class="block-label on-dark"${craftLabel.attr}>${craftLabel.v}</div><p class="craft"${craft.attr}>${craft.v}</p></div>
      <div><div class="block-label on-dark"${equipLabel.attr}>${equipLabel.v}</div><div class="equip">${equip}</div></div>
    </div>
  </div></section>
  <section class="section"><div class="wrap">
    <div class="block-label"${careersLabel.attr}>${careersLabel.v}</div>
    <div class="careers careers-grid">${careers}</div>
    <div class="block-label"${studentsLabel.attr}>${studentsLabel.v}</div>
    <p class="students-note reveal"${studentsNote.attr}>${studentsNote.v}</p>
    <div class="video-frame works-video reveal"><video src="/assets/habitus2025.mp4" autoplay muted loop playsinline preload="metadata"></video><div class="video-cap"><span class="video-cap-tx"${vcap.attr}>${vcap.v}</span></div></div>
  </div></section>
  <section class="section section-alt"><div class="wrap wrap-narrow">
    <div class="block-label"${awardsLabel.attr}>${awardsLabel.v}</div>
    <p class="sec-lead reveal" style="margin-top:.6rem"${awardsNote.attr}>${awardsNote.v}</p>
    <ul class="ref-list" style="margin-top:1.2rem">${awardItems}</ul>
  </div></section>
  <section class="section"><div class="wrap wrap-narrow">
    <div class="block-label"${faqLabel.attr}>${faqLabel.v}</div>
    <div class="faq" id="faq">${faq}</div>
  </div></section>
  <section class="section section-cta"><div class="wrap join-final">
    <div><h2 class="sec-title reveal"${finalTitle.attr}>${finalTitle.v}</h2><p class="sec-lead reveal"${finalLead.attr}>${finalLead.v}</p></div>
    <div class="join-cta-card reveal">
      <span class="jd-label"${audLabel.attr}>${audLabel.v}</span>
      <div class="join-cta-aud">${auds}</div>
      <a class="btn btn-accent btn-block" href="mailto:${esc(JA.access.mail)}" style="margin-top:1.2rem"${action.attr}>${action.v}</a>
    </div>
  </div></section>`;
}

/* ====================================================================== */
/* HUB (root) — general-audience 習慣化デザイン portal                      */
/* ====================================================================== */
function hubNav(onHub = false) {
  const brandName = field("習慣化デザインラボ", "Habit Design Lab");
  const items = [
    { id: "about", ja: "習慣化デザインとは", en: "What it is" },
    { id: "science", ja: "科学と技術", en: "Science" },
    { id: "activities", ja: "活動", en: "Activities" },
    { id: "news", ja: "ニュース", en: "News" },
    { id: "contact", ja: "依頼・連携", en: "Work with us" },
  ];
  // on the hub, in-page anchors with scroll-spy; on sub-pages, jump back to the hub section
  const links = items.map((it) => { const l = field(it.ja, it.en); const href = onHub ? `#${it.id}` : `/#${it.id}`; const spy = onHub ? ` data-spy="${it.id}"` : ""; return `<a class="nav-link" href="${href}"${l.attr}${spy}>${l.v}</a>`; }).join("");
  const labLink = field("研究室", "Ohta Lab");
  const labCta = field("依頼・連携のご相談", "Work with us");
  const ctaHref = onHub ? "#contact" : "/#contact";
  const langLabel = field(JA.langLabel, EN.langLabel);
  return `<header class="nav" id="siteNav">
  <div class="nav-in">
    <a class="brand" href="${onHub ? "#top" : "/"}">${LABMARK(30)}<span class="brand-tx"><span class="brand-lab"${brandName.attr}>${brandName.v}</span><span class="brand-sub">HABIT DESIGN</span></span></a>
    <nav class="nav-links" id="navLinks">${links}<a class="nav-link" href="/ohtalab/"${labLink.attr}>${labLink.v}</a></nav>
    <div class="nav-right">
      <button class="lang" id="langToggle" type="button"><span class="lang-dot" aria-hidden="true"></span><span id="langLabel"${langLabel.attr}>${langLabel.v}</span></button>
      <a class="btn btn-accent btn-sm nav-cta" href="${ctaHref}"${labCta.attr}>${labCta.v}</a>
      <button class="nav-burger" id="navBurger" type="button" aria-label="メニュー" aria-expanded="false" aria-controls="navLinks"><span></span><span></span><span></span></button>
    </div>
  </div>
</header>`;
}

function hubFooter() {
  const brandName = field("習慣化デザインラボ", "Habit Design Lab");
  const uni = field("宮城大学 事業構想学群 太田賢研究室", "Ohta Lab, School of Project Design, Miyagi University");
  const cp = field("© 2026 習慣化デザインラボ（宮城大学 太田賢研究室）", "© 2026 Habit Design Lab / Ohta Lab, Miyagi University");
  const labLink = field("太田賢研究室サイト →", "Ohta Lab site →");
  const privLink = field("プライバシーポリシー", "Privacy");
  const colLink = field("コラム", "Column");
  return `<footer class="footer footer-block">
  <div class="wrap">
    ${footerNav()}
    <div class="footer-in">
    <div class="footer-brand">${LABMARK(28)}<div><div class="f-lab"${brandName.attr}>${brandName.v}</div><div class="f-uni"${uni.attr}>${uni.v}</div></div></div>
    <div class="footer-meta"><div${cp.attr}>${cp.v}</div><div class="footer-links"><a class="more-link" href="/column.html"${colLink.attr}>${colLink.v}</a><a class="more-link" href="/ohtalab/"${labLink.attr}>${labLink.v}</a><a class="more-link" href="/privacy.html"${privLink.attr}>${privLink.v}</a></div></div>
    </div>
  </div>
</footer>`;
}

function hubHero() {
  const eyebrow = field("HABIT DESIGN LAB — 習慣化デザインラボ", "HABIT DESIGN LAB");
  const titleHtml = `<span class="hero-line"><span class="u">小さな習慣から、</span></span><span class="hero-line accent"><span class="u">未来を変える。</span></span>`;
  const titleEn = `<span class="hero-line"><span class="u">From small habits,</span></span><span class="hero-line accent"><span class="u">we change the future.</span></span>`;
  const title = field(titleHtml, titleEn, true);
  const lead = fieldJ(
    "「やりたい」「やめたい」を、AI・データ・行動科学で“続く仕組み”に変える。それが習慣化デザインです。宮城大学 太田賢研究室を中心に、研究・教育から、企業・自治体との社会実装までをつなぐポータルです。共同研究や査読論文の成果を、暮らしや現場で役立つ形にしていきます。",
    "Turning what you want to start or stop into systems that last, with AI, data and behavioral science. That's habit design. Centered on Ohta Lab (Miyagi University), this portal connects research and education with real-world work for companies and local governments, turning joint research and peer-reviewed findings into things that help in everyday life and on the ground.");
  const cta1 = field("依頼・連携のご相談 →", "Work with us →");
  const cta2 = field("活動・実績を見る →", "See our work →");
  const imgs = ["/assets/hero-walk.jpg", "/assets/hero-study.jpg", "/assets/hero-food.jpg", "/assets/hero-sleep.jpg", "/assets/hero-phones.jpg", "/assets/hero-plan.jpg"];
  const slides = imgs.map((src, i) => `<div class="hero-slide${i === 0 ? " active" : ""}" style="background-image:url(${src})"></div>`).join("");
  return `<section class="hero hero-editorial">
  <div class="hero-hybrid" id="heroHybrid">
    <div class="hero-layer on" data-layer="photos"><div class="hero-slides" id="heroSlides" aria-hidden="true">${slides}</div></div>
    <div class="hero-layer" data-layer="geometric"><canvas class="hero-anim" id="heroAnim" aria-hidden="true"></canvas></div>
  </div>
  <div class="hero-ed-overlay"><div class="hero-inner">
    <div class="eyebrow eyebrow-light">${LABMARK(18, true)} <span${eyebrow.attr}>${eyebrow.v}</span></div>
    <h1 class="hero-h reveal"${title.attr}>${title.v}</h1>
    <p class="hero-lead reveal"${lead.attr}>${lead.v}</p>
    <div class="hero-cta reveal">
      <a class="btn btn-accent" href="#contact"${cta1.attr}>${cta1.v}</a>
      <a class="btn btn-ghost" href="#activities"${cta2.attr}>${cta2.v}</a>
    </div>
  </div></div>
</section>`;
}

/* proof bar — early, text-only credibility signals for decision-makers (facts only) */
function hubProofBar() {
  const label = field("これまでの取り組み", "Our work so far");
  const items = [
    ["学会での受賞・招待講演", "Awards & invited talks"],
    ["査読付き論文の発表", "Peer-reviewed publications"],
    ["習慣化を専門とする企業との共同研究", "Joint research with a habit-focused company"],
    ["企業・自治体との社会実装", "Real-world work with companies & local governments"],
  ];
  const chips = items.map((it) => { const f = field(it[0], it[1]); return `<li class="proof-chip"${f.attr}>${f.v}</li>`; }).join("");
  return `<section class="proof-band" aria-label="${esc(label.v)}">
  <div class="wrap proof-in">
    <span class="proof-label"${label.attr}>${label.v}</span>
    <ul class="proof-items">${chips}</ul>
  </div>
</section>`;
}

/* latest news on the hub — newest 3, reusing the ohtalab news markup */
function hubNews() {
  const kicker = field("News", "News");
  const title = fieldJ("最新ニュース", "Latest news");
  const items = NEWS.slice(0, 3).map((it) => newsItem(it)).join("");
  const more = field("ニュース一覧 →", "All news →");
  return `<section id="news" class="section section-alt">
  <div class="wrap">
    <div class="sec-eyebrow"><span class="sec-num">—</span><span class="sec-kicker"${kicker.attr}>${kicker.v}</span></div>
    <h2 class="sec-title reveal"${title.attr}>${title.v}</h2>
    <ul class="news">${items}</ul>
    <div class="more-row reveal"><a class="more-link" href="/ohtalab/news.html"${more.attr}>${more.v}</a></div>
  </div>
</section>`;
}

function hubAbout() {
  const kicker = field("About", "About");
  const title = fieldJ("習慣化デザインとは", "What is habit design?");
  const lead = fieldJ(
    "習慣化デザインは、AI やデータ、行動科学を使って、自分や他の人の行動パターンを意識的に作り変える方法です。意志や根性ではなく、デジタルとデータ、デザインの力で人を動かします。",
    "Habit design is a way to consciously reshape your own and others' behavior using AI, data and behavioral science — moving people with digital tools, data and design rather than willpower.");
  const pillars = [
    { en: "Science", tag: "科学的基盤", tagEn: "Science", body: "AI・データ分析と行動科学に基づき、続く仕組みを設計する。", bodyEn: "Designs that last, grounded in AI, data analysis and behavioral science." },
    { en: "Personal", tag: "個人に寄り添う", tagEn: "Personal", body: "一人ひとりに合わせ、無理なく続けられるよう支援する。", bodyEn: "Help each person keep going, without strain." },
    { en: "Open", tag: "多角的に学ぶ", tagEn: "Open", body: "世界の研究・アプリ・書籍・社会実装の知見を集約・紹介する。", bodyEn: "Curating research, apps, books and real-world practice from around the world." },
  ];
  const cards = pillars.map((p, i) => {
    const tg = fieldJ(p.tag, p.tagEn), bd = fieldJ(p.body, p.bodyEn);
    const bars = [0, 1, 2].map((k) => `<span class="${k <= i ? "on" : ""}"></span>`).join("");
    return `<div class="level reveal"><div class="level-bar" aria-hidden="true">${bars}</div><div class="level-tag"${tg.attr}>${tg.v}</div><div class="level-en">${esc(p.en)}</div><p${bd.attr}>${bd.v}</p></div>`;
  }).join("");
  return `<section id="about" class="section">
  <div class="wrap">
    <header class="sec-head"><div class="sec-eyebrow"><span class="sec-num">01</span><span class="sec-kicker"${kicker.attr}>${kicker.v}</span></div>
      <h2 class="sec-title reveal"${title.attr}>${title.v}</h2>
      <p class="sec-lead reveal"${lead.attr}>${lead.v}</p></header>
    <div class="levels">${cards}</div>
  </div>
</section>`;
}

/* shared by the hub science section (short `b`) and the /science.html detail page (long `dt`) */
const SCIENCE_TOPICS = [
  { t: "なぜ「習慣」なのか", tEn: "Why habits",
    b: "人の行動の約43%は習慣。意識せず繰り返す行動を整えることが、ウェルビーイングと成果の両方を支えます。",
    bEn: "About 43% of behavior is habit — shaping what we repeat unconsciously supports both well-being and results.",
    dt: "現代社会は、睡眠不足・運動不足・不健康な食事など不健全な習慣に陥りやすく、ウェルビーイングのための「整える習慣」が大切です。また仕事・勉強・スポーツで成果を上げるには、持続的な行動が欠かせません。人の行動の約43%は習慣だと言われ、無意識の繰り返しをどう設計するかが、すべての出発点になります。",
    dtEn: "Modern life makes it easy to fall into unhealthy patterns — too little sleep or exercise, poor diet — so habits that keep us well matter. Lasting results at work, study and sport also depend on consistent action. About 43% of behavior is habit, so designing what we repeat unconsciously is where everything begins.",
    pts: [["行動の43%は習慣", "43% is habit"], ["やりたい・やめたい習慣", "Wanted & unwanted"], ["ウェルビーイングと成果", "Well-being & results"]] },
  { t: "習慣の科学", tEn: "The science of habits",
    b: "習慣はどう作られ、なぜ続くのか。「きっかけ→行動→報酬」のループや、環境・動機づけ・心理など定着のメカニズムを扱います。",
    bEn: "How habits form and why they last — the cue→routine→reward loop, environment, motivation and the psychology behind sticking.",
    dt: "習慣は意志の強さではなく、仕組みで決まると言われています。「きっかけ→行動→報酬」の習慣のループ、行動を自動的に引き出す文脈キュー（context cue）、既存の習慣に重ねる積み上げ（habit stacking）、環境や動機づけ、心理的要因——個人から組織まで、行動が定着する科学的メカニズムが数多く研究されています。同じ文脈で行動を繰り返すほど、その行動は自動化していきます（Wood & Rünger, 2016）。",
    dtEn: "Habits are governed by mechanisms, not willpower. The cue→routine→reward loop, context cues that trigger behavior automatically, habit stacking, environment, motivation and psychology — from individuals to organizations, we unpack the science of why behavior sticks. The more we repeat an action in the same context, the more automatic it becomes (Wood & Rünger, 2016).",
    pts: [["習慣のループ", "Habit loop"], ["文脈キュー", "Context cues"], ["積み上げアプローチ", "Habit stacking"], ["心理・動機づけ", "Motivation & psychology"]] },
  { t: "習慣化デザイン", tEn: "Designing habits",
    b: "意志ではなく「仕組み」と「環境」。望ましい行動が自然に起きやすい条件を、体系的に設計します。",
    bEn: "Systems and environment over willpower — designing conditions where good behavior happens naturally.",
    dt: "習慣化デザインは、人間の行動パターンと環境の相互作用を理解し、望ましい習慣を形成しやすい条件を整える体系的なアプローチです。行動を単発の意志ではなく「システム」として捉え、環境を最適化し、行動変容のステージに合わせて設計します。たとえば、能力・機会・動機づけの3要素から行動をとらえるCOM-Bモデル（行動変容ホイール）や、選択肢の並べ方で行動をそっと後押しするナッジ（選択アーキテクチャ）など、確立された枠組みを活用します。下の「続けるための手法」で、具体的な工夫を紹介します。",
    dtEn: "Habit design is a systematic approach: understand how behavior and environment interact, then arrange conditions that make good habits easy. Treating behavior as a system, we use established frameworks such as the COM-B model (Capability, Opportunity, Motivation — the Behaviour Change Wheel) and nudges / choice architecture that gently steer behavior.",
    pts: [["環境の最適化", "Environment design"], ["COM-Bモデル", "COM-B model"], ["ナッジ・選択アーキテクチャ", "Nudge"], ["行動変容ステージ", "Stages of change"]] },
  { t: "続ける技術", tEn: "Keeping it up",
    b: "続ける過程でぶつかる壁への対処。モチベーション維持、後戻り（リバウンド）、忙しさや誘惑のなかで続ける方法を扱います。",
    bEn: "Handling the walls you hit — sustaining motivation, recovering from relapse, and staying consistent under pressure.",
    dt: "習慣形成の過程では、多くの人が共通の壁に直面します。モチベーションの維持、時間管理、環境からの誘惑、そして一度くずれたときの後戻り（リバウンド）。こうした障壁には、「〇〇したら△△する」と前もって決めておく実行意図（IF-THENプラン）が有効で、忙しさや誘惑のなかでも行動を後押しします。下の「続けるための手法」や書籍・アプリも参考になります。",
    dtEn: "Most people hit the same walls when building habits: sustaining motivation, managing time, resisting temptation, and recovering after a relapse. Implementation intentions (“if X, then Y” plans) help carry you through busy or tempting moments. See the methods below, plus books and apps.",
    pts: [["実行意図（IF-THEN）", "Implementation intentions"], ["モチベーション維持", "Motivation"], ["後戻りへの対処", "Relapse recovery"], ["困難な状況での継続", "Staying consistent"]] },
  { t: "テクノロジーと研究", tEn: "Technology & research",
    b: "AI・データ・デバイスで習慣を支える。eコーチング、習慣計測（SRHI）、個人から地域までの社会実装の研究を紹介します。",
    bEn: "Supporting habits with AI, data and devices — e-coaching, habit measurement (SRHI), and deployment from individuals to communities.",
    dt: "近年は、デジタル技術と行動科学を組み合わせた新しい習慣形成アプローチが広がっています。スマホアプリやウェアラブルによる習慣トラッキング、人とAIが協働するeコーチング、自分のデータで自分を知るパーソナルインフォマティクス、習慣の強さを測る自己報告式習慣指標（SRHI）。個人から組織・地域コミュニティへと広げる社会実装の研究も進んでいます。下の「アプリで実践」では、実際に使えるアプリを紹介します。",
    dtEn: "Recent research combines digital technology with behavioral science: habit tracking via smartphone apps and wearables, human–AI e-coaching, personal informatics (knowing yourself through your data), and the Self-Report Habit Index (SRHI). We also work on real-world deployment — from individuals to organizations and communities.",
    pts: [["eコーチング", "e-coaching"], ["パーソナルインフォマティクス", "Personal informatics"], ["SRHI（習慣指標）", "SRHI index"], ["地域への社会実装", "Community deployment"]] },
];
function sciChips(pts) { return pts.map((pp) => { const f = field(pp[0], pp[1]); return `<span class="sci-tag"${f.attr}>${f.v}</span>`; }).join(""); }

/* relatable "that's me" hooks per theme (JA/EN), aligned with SCIENCE_TOPICS order */
const SCI_HOOKS = [
  ["気づけば、今日もスマホ。なりたい自分には、まだなれていない。", "Another day lost to the phone — still not who I want to be."],
  ["三日坊主。「やる気が足りない」せいだと思っていませんか？", "Quit after three days? Maybe it isn't about willpower."],
  ["続く人は、意志ではなく「仕組み」と「環境」を変えている。", "People who last change their systems and environment — not just willpower."],
  ["順調だったのに、一度休んだら戻れなくなった。", "It was going well — then one break, and you couldn't get back."],
  ["あなたの行動データは、続けるための味方になる。", "Your own behavior data can become your ally."],
];
/* simple, on-brand line/icon SVGs (language-neutral) per theme */
function sciFig(i) {
  const S = (inner) => `<svg viewBox="0 0 200 150" class="fig-svg" role="img" aria-hidden="true">${inner}</svg>`;
  switch (i) {
    case 0: return S(`<circle cx="100" cy="75" r="54" fill="none" stroke="var(--hair)" stroke-width="13"/>
      <circle cx="100" cy="75" r="54" fill="none" stroke="var(--accent)" stroke-width="13" stroke-linecap="round" stroke-dasharray="146 340" transform="rotate(-90 100 75)"/>
      <text x="100" y="73" text-anchor="middle" font-family="var(--font-latin)" font-size="40" font-weight="800" fill="var(--text)">43<tspan font-size="20">%</tspan></text>
      <text x="100" y="95" text-anchor="middle" font-family="var(--font-mono)" font-size="8" letter-spacing="3" fill="var(--muted)">HABIT</text>`);
    case 1: return S(`<g fill="none" stroke="var(--muted)" stroke-width="2.5">
      <path d="M100 28 a47 47 0 0 1 40 70" stroke="var(--accent)" stroke-linecap="round"/>
      <path d="M132 96 a47 47 0 0 1-78-6" stroke-linecap="round"/>
      <path d="M58 70 a47 47 0 0 1 38-42" stroke-linecap="round"/></g>
      <path d="M138 92 l4 8 -9 1z" fill="var(--accent)"/>
      <circle cx="100" cy="28" r="8" fill="var(--accent)"/><circle cx="142" cy="98" r="8" fill="var(--surface)" stroke="var(--muted)" stroke-width="2.5"/><circle cx="58" cy="98" r="8" fill="var(--surface)" stroke="var(--muted)" stroke-width="2.5"/>
      <text x="100" y="78" text-anchor="middle" font-family="var(--font-mono)" font-size="9" letter-spacing="2" fill="var(--muted)">LOOP</text>`);
    case 2: return S(`<path d="M28 46 C 84 46, 96 108, 162 108" fill="none" stroke="var(--hair)" stroke-width="9" stroke-linecap="round"/>
      <path d="M28 46 C 84 46, 96 108, 162 108" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="1.5 8" stroke-linecap="round"/>
      <circle cx="44" cy="46" r="9" fill="var(--accent)"/>
      <line x1="162" y1="110" x2="162" y2="74" stroke="var(--muted)" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M162 75 L182 81 L162 88 Z" fill="var(--accent)"/>`);
    case 3: {
      const cw = 17, gap = 7, n = 8, startX = (200 - (n * cw + (n - 1) * gap)) / 2, y = 62;
      const filled = [1, 1, 1, 0, 1, 1, 1, 1]; // index 3 = the "missed" day
      let cells = "";
      for (let k = 0; k < n; k++) {
        const x = startX + k * (cw + gap);
        cells += filled[k]
          ? `<rect x="${x}" y="${y}" width="${cw}" height="${cw}" rx="4.5" fill="${k === 4 ? "var(--accent)" : "color-mix(in oklab,var(--accent) 60%,transparent)"}"/>`
          : `<rect x="${x}" y="${y}" width="${cw}" height="${cw}" rx="4.5" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="3 3"/>`;
      }
      const mx = startX + 3 * (cw + gap) + cw / 2, rx = startX + 4 * (cw + gap) + cw / 2;
      cells += `<path d="M${mx} ${y - 8} Q ${(mx + rx) / 2} ${y - 30} ${rx} ${y - 9}" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round"/>`;
      cells += `<path d="M${rx} ${y - 6} l-5 -7 l10 0z" fill="var(--accent)"/>`;
      return S(cells);
    }
    case 4: return S(`<rect x="86" y="14" width="28" height="22" rx="8" fill="color-mix(in oklab,var(--muted) 28%,transparent)"/>
      <rect x="86" y="114" width="28" height="22" rx="8" fill="color-mix(in oklab,var(--muted) 28%,transparent)"/>
      <rect x="66" y="34" width="68" height="82" rx="19" fill="var(--surface)" stroke="var(--muted)" stroke-width="2.5"/>
      <rect x="134" y="66" width="5" height="13" rx="2.5" fill="var(--muted)"/>
      <polyline points="76,80 92,80 98,80 102,58 107,100 113,72 119,80 124,80" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="102" cy="58" r="3.8" fill="var(--accent)"/>
      <path d="M150 40 a18 18 0 0 1 16 16 M150 30 a28 28 0 0 1 24 24" fill="none" stroke="color-mix(in oklab,var(--accent) 60%,transparent)" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="148" cy="52" r="2.6" fill="var(--accent)"/>`);
    default: return S(`<circle cx="100" cy="75" r="50" fill="none" stroke="var(--hair)" stroke-width="2.5"/><circle cx="100" cy="75" r="9" fill="var(--accent)"/>`);
  }
}

function hubScience() {
  const kicker = field("Science & Technology", "Science & Technology");
  const title = fieldJ("習慣化の科学と技術", "The science & technology of habits");
  const lead = fieldJ("習慣化を支える理論から、行動科学×デジタルの実践・研究まで。5つのテーマで体系的に紹介します。", "From the theory behind habits to practice and research where behavioral science meets digital — across five themes.");
  const chips = SCIENCE_TOPICS.map((p, i) => { const f = field(p.t, p.tEn); return `<a class="theme-chip reveal" href="/science.html#sci-${i + 1}"><span class="theme-chip-n">${String(i + 1).padStart(2, "0")}</span><span${f.attr}>${f.v}</span></a>`; }).join("");
  const more = field("科学と手法をくわしく見る →", "Science & methods →");
  const moreBooks = field("習慣化の本 →", "Books →");
  const moreApps = field("習慣化アプリ →", "Apps →");
  return `<section id="science" class="section section-alt">
  <div class="wrap">
    <header class="sec-head"><div class="sec-eyebrow"><span class="sec-num">02</span><span class="sec-kicker"${kicker.attr}>${kicker.v}</span></div>
      <h2 class="sec-title reveal"${title.attr}>${title.v}</h2>
      <p class="sec-lead reveal"${lead.attr}>${lead.v}</p></header>
    <div class="theme-chips">${chips}</div>
    <div class="more-row reveal sci-more-row"><a class="more-link" href="/science.html"${more.attr}>${more.v}</a><a class="more-link" href="/books.html"${moreBooks.attr}>${moreBooks.v}</a><a class="more-link" href="/apps.html"${moreApps.attr}>${moreApps.v}</a></div>
  </div>
</section>`;
}

/* /science.html — engaging detail page: stat band + alternating hook + figure blocks */
function hubSciencePageBody() {
  const blocks = SCIENCE_TOPICS.map((p, i) => {
    const t = fieldJ(p.t, p.tEn), dt = fieldJ(p.dt, p.dtEn);
    const hook = fieldJ(SCI_HOOKS[i][0], SCI_HOOKS[i][1]);
    const alt = i % 2 === 1 ? " alt" : "";
    return `<section class="sci-detail reveal${alt}" id="sci-${i + 1}">
      <div class="sci-text">
        <div class="sci-detail-head"><span class="sci-n">${String(i + 1).padStart(2, "0")}</span><span class="sci-en">${esc(p.tEn)}</span></div>
        <p class="sci-hook"${hook.attr}>${hook.v}</p>
        <h2${t.attr}>${t.v}</h2>
        <p class="sci-body"${dt.attr}>${dt.v}</p>
        <div class="sci-tags">${sciChips(p.pts)}</div>
      </div>
      <div class="sci-fig" aria-hidden="true">${sciFig(i)}</div>
    </section>`;
  }).join("");
  const back = field("← 習慣化デザインラボ", "← Habit Design Lab");
  const kicker = field("Science & Technology", "Science & Technology");
  const title = fieldJ("習慣化の科学と技術", "The science & technology of habits");
  const lead = fieldJ("「続かない」のはなぜ？ どうすれば変えられる？ 習慣化を支える理論と、行動科学×デジタルの実践・研究を、5つのテーマでやさしく紹介します。", "Why can't we keep it up — and how can we change that? Five themes that make the science and digital practice of habits easy to follow.");
  const stats = [
    { n: "43", u: "%", l: "行動は習慣でできている", lEn: "of behavior is habit" },
    { n: "3", u: "", l: "個人・組織・地域のレベル", lEn: "levels: self · org · region" },
    { n: "5", u: "", l: "学べるテーマ", lEn: "themes to explore" },
  ];
  const statBand = stats.map((s) => { const l = fieldJ(s.l, s.lEn); return `<div class="sci-stat"><div class="sci-stat-n">${esc(s.n)}<span class="sci-stat-u">${esc(s.u)}</span></div><div class="sci-stat-l"${l.attr}>${l.v}</div></div>`; }).join("");
  return `<section class="page-hero">
  <div class="wrap">
    <a class="crumb" href="/"${back.attr}>${back.v}</a>
    <div class="sec-eyebrow"><span class="sec-num">02</span><span class="sec-kicker"${kicker.attr}>${kicker.v}</span></div>
    <h1 class="page-h"${title.attr}>${title.v}</h1>
    <p class="page-lead"${lead.attr}>${lead.v}</p>
    <div class="sci-stats reveal">${statBand}</div>
  </div>
</section>
<section class="section"><div class="wrap sci-detail-list">${blocks}</div></section>
${sciMethods()}
${sciReferences()}
${resourceLinks("science")}`;
}

/* references — academic grounding for the science page (curated, E-E-A-T) */
function sciReferences() {
  const label = field("参考文献", "References");
  const lead = fieldJ("本ページの内容は、習慣・行動科学の主要な研究に基づいています。さらに学びたい方へ、代表的な文献を紹介します。", "This page draws on key research in habit and behavioral science. For further reading, here are some representative works.");
  const refs = [
    ["Wood, W., & Rünger, D. (2016). Psychology of habit. Annual Review of Psychology, 67, 289–314.", "https://doi.org/10.1146/annurev-psych-122414-033417"],
    ["Lally, P., van Jaarsveld, C. H. M., Potts, H. W. W., & Wardle, J. (2010). How are habits formed: Modelling habit formation in the real world. European Journal of Social Psychology, 40, 998–1009.", "https://doi.org/10.1002/ejsp.674"],
    ["Buyalskaya, A., et al. (2023). What can machine learning teach us about habit formation? PNAS, 120(17).", "https://doi.org/10.1073/pnas.2216115120"],
    ["Gollwitzer, P. M. (1999). Implementation intentions: Strong effects of simple plans. American Psychologist, 54(7), 493–503.", "https://doi.org/10.1037/0003-066X.54.7.493"],
    ["Michie, S., van Stralen, M. M., & West, R. (2011). The behaviour change wheel (COM-B). Implementation Science, 6, 42.", "https://doi.org/10.1186/1748-5908-6-42"],
    ["Hollands, G. J., et al. (2017). The TIPPME intervention typology for changing environments to change behaviour. Nature Human Behaviour, 1, 0140.", "https://doi.org/10.1038/s41562-017-0140"],
    ["Forberger, S., et al. (2019). Nudging to move: choice architecture interventions to promote physical activity. Int. J. Behavioral Nutrition and Physical Activity, 16, 77.", "https://doi.org/10.1186/s12966-019-0844-z"],
    ["Stawarz, K., Cox, A. L., & Blandford, A. (2015). Beyond self-tracking and reminders: Designing smartphone apps that support habit formation. CHI 2015, 2653–2662.", "https://doi.org/10.1145/2702123.2702230"],
    ["Fogg, B. J. (2009). A behavior model for persuasive design. Persuasive '09.", "https://doi.org/10.1145/1541948.1541999"],
    ["太田賢, 岩間参伸 (2025). 個人の行動プラン最適化による運動習慣化サポート. 情報処理学会論文誌CDS, 15(2), 1–10.", "https://ipsj.ixsq.nii.ac.jp/records/2002189"],
  ];
  const items = refs.map((r) => `<li><a class="ai-link" href="${esc(r[1])}" target="_blank" rel="noopener">${esc(r[0])}</a></li>`).join("");
  return `<section class="section section-alt"><div class="wrap wrap-narrow">
    <div class="block-label"${label.attr}>${label.v}</div>
    <p class="sec-lead reveal" style="margin-top:.6rem"${lead.attr}>${lead.v}</p>
    <ul class="ref-list" style="margin-top:1.2rem">${items}</ul>
  </div></section>`;
}

/* small line icons for each method (24x24, currentColor) */
function methodIcon(i) {
  const W = (inner) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const icons = [
    `<path d="M12 5v14M5 12h14"/>`, // start small / plus
    `<circle cx="10" cy="8.5" r="3.2"/><path d="M4.5 19a5.5 5.5 0 0 1 11 0"/><path d="M18.6 3.7l1 2 2.2.3-1.6 1.6.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.6 2.2-.3z" fill="currentColor" stroke="none"/>`, // identity (person + star)
    `<circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><path d="M6.5 12H12"/><path d="M12 12c0-3.2 1-4.5 4-4.5M12 12c0 3.2 1 4.5 4 4.5"/><path d="M18.5 5.5l2 2-2 2"/><path d="M18.5 13.5l2 2-2 2"/>`, // if-then branch
    `<rect x="4.5" y="14.4" width="15" height="4.4" rx="1.3"/><rect x="6" y="9.3" width="12" height="4.4" rx="1.3"/><rect x="7.5" y="4.2" width="9" height="4.4" rx="1.3"/>`, // habit stacking
    `<rect x="3.5" y="5" width="17" height="14" rx="2.6"/><path d="M3.5 9.2h17"/><circle cx="12" cy="14.2" r="2.1"/>`, // environment / frame
    `<path d="M4 20h16"/><rect x="6" y="11" width="3" height="7" rx="1"/><rect x="10.5" y="7.5" width="3" height="10.5" rx="1"/><rect x="15" y="4.5" width="3" height="13.5" rx="1"/>`, // track / bars
    `<path d="M12 3.6l2.5 5.1 5.6.8-4.05 3.95.96 5.55L12 16.3 6.93 19l.96-5.55L3.84 9.5l5.6-.8z"/>`, // reward / star
    `<circle cx="8.6" cy="9" r="3"/><path d="M3.6 19a5 5 0 0 1 10 0"/><circle cx="16.2" cy="10" r="2.4"/><path d="M14.2 19a4.2 4.2 0 0 1 6.6-2.6"/>`, // social / people
    `<path d="M19.5 12a7.5 7.5 0 1 1-2.3-5.4"/><path d="M19.6 4v3.4h-3.4"/>`, // reflect / refresh
  ];
  return W(icons[i] || icons[0]);
}

/* cross-links between the science / books / apps pages */
function resourceLinks(current) {
  const all = [
    { key: "science", href: "/science.html", t: "習慣化の科学と技術", tEn: "Science & methods", d: "なぜ続くのか、どう続けるか。理論と続けるための手法。", dEn: "Why habits work and how to keep them — theory and methods." },
    { key: "books", href: "/books.html", t: "習慣化の本", tEn: "Books", d: "テーマ別に選んだ、習慣化に役立つ書籍。", dEn: "Curated books on habits, by theme." },
    { key: "apps", href: "/apps.html", t: "習慣化アプリ", tEn: "Apps", d: "目的別のアプリと、活用の5ステップ。", dEn: "Apps by purpose and a 5-step guide." },
  ].filter((x) => x.key !== current);
  const label = field("あわせて見る", "Explore more");
  const cards = all.map((x) => { const t = fieldJ(x.t, x.tEn), d = fieldJ(x.d, x.dEn); return `<a class="res-next-card reveal" href="${x.href}"><div><h3${t.attr}>${t.v}</h3><p${d.attr}>${d.v}</p></div><span class="res-next-go" aria-hidden="true">→</span></a>`; }).join("");
  return `<section class="section"><div class="wrap"><div class="block-label"${label.attr}>${label.v}</div><div class="res-next">${cards}</div></div></section>`;
}

/* 続けるための手法 — named, practical methods */
function sciMethods() {
  const kicker = field("Methods", "Methods");
  const title = fieldJ("続けるための手法", "Practical methods");
  const lead = fieldJ("研究や実践から知られている、習慣を続けるための代表的な工夫です。気になるものから試してみてください。", "Well-known techniques from research and practice for making habits stick — try whichever resonates.");
  const methods = [
    ["小さく始める（プラス10）", "「腕立て1回」「プラス10分・10歩」。ハードルを下げ、まず始められる大きさにする。", "Start tiny (plus 10)", "Lower the bar — “one push-up,” “+10 min.” Make it small enough to actually begin."],
    ["なりたい自分とつなげる", "「やせたい」より「健康的な人になる」。望む自分像と結びつけると続きやすい。", "Tie it to who you want to be", "“Become a healthy person” beats “lose weight” — habits stick when tied to identity."],
    ["IF-THENプラン", "「〇〇したら△△する」と、きっかけと行動をあらかじめ結びつける。", "IF-THEN plans", "Pre-link a cue and an action: “if X, then Y.”"],
    ["習慣の積み上げ", "既存の習慣の直後に新しい行動を重ねる（habit stacking）。", "Habit stacking", "Attach a new action right after an existing habit."],
    ["環境をデザインする", "やりたい行動は易しく、やめたい行動は面倒に。環境の側から後押しする。", "Design the environment", "Make good actions easy and bad ones inconvenient."],
    ["記録・可視化する", "カレンダーやアプリで進捗を見える化し、連続（ストリーク）を育てる。", "Track & visualize", "See progress and grow a streak with a calendar or app."],
    ["ごほうび設計", "達成にバッジ・ポイントなどの小さな報酬を結びつけ、達成感を高める。", "Design rewards", "Tie small rewards to wins to boost the sense of achievement."],
    ["仲間の力", "宣言・共有・チームで励まし合い、続ける力にする（ソーシャルサポート）。", "Social support", "Declare, share and cheer each other on as a team."],
    ["振り返る", "うまくいった/いかない要因を見直し、やり方を更新する。", "Reflect", "Review what worked and update your approach."],
  ];
  const cards = methods.map((m, i) => { const t = fieldJ(m[0], m[2]), b = fieldJ(m[1], m[3]); return `<div class="method-card reveal"><span class="method-ic" aria-hidden="true">${methodIcon(i)}</span><h3${t.attr}>${t.v}</h3><p${b.attr}>${b.v}</p></div>`; }).join("");
  return `<section id="methods" class="section section-alt">
  <div class="wrap">
    <header class="sec-head"><div class="sec-eyebrow"><span class="sec-num">06</span><span class="sec-kicker"${kicker.attr}>${kicker.v}</span></div>
      <h2 class="sec-title reveal"${title.attr}>${title.v}</h2>
      <p class="sec-lead reveal"${lead.attr}>${lead.v}</p></header>
    <div class="method-grid">${cards}</div>
  </div>
</section>`;
}

/* one-line description per book category (JA/EN) */
const BOOK_CAT_DESC = {
  "習慣化術": ["習慣の作り方・続け方の王道。", "The core of how to build and keep habits."],
  "行動変容": ["行動が変わる仕組みをデザインから学ぶ。", "How behavior changes — by design."],
  "モチベーション": ["やる気の科学と、引き出し方。", "The science of motivation and how to spark it."],
  "目標達成": ["目標を成果に変える考え方。", "Turning goals into results."],
  "集中力": ["集中を保つための科学。", "The science of staying focused."],
  "思考の習慣": ["考え方そのものを習慣にする。", "Making better thinking a habit."],
  "書く習慣": ["書くことを続ける技術。", "Keeping a writing habit."],
  "人間関係の習慣": ["人とのかかわりを良くする習慣。", "Habits for better relationships."],
  "働き方": ["仕事のパフォーマンスと習慣。", "Habits behind work performance."],
  "組織": ["チーム・組織の行動を変える。", "Changing behavior across teams."],
  "ウェルビーイング": ["心身の幸福と、整える習慣。", "Well-being and habits that sustain it."],
  "学び直し": ["変化の時代に学び続ける。", "Keep learning in a changing world."],
  "パーソナル・インフォマティクス": ["自分のデータで自分を知る。", "Knowing yourself through your data."],
  "その他": ["習慣を多面的に捉える本。", "Other perspectives on habits."],
};
function amzn(title) { return "https://www.amazon.co.jp/s?k=" + encodeURIComponent(title); }

/* /books.html — curated book list: featured picks + category nav + grouped list */
function booksPageBody() {
  const back = field("← 習慣化デザインラボ", "← Habit Design Lab");
  const kicker = field("Books", "Books");
  const title = fieldJ("習慣化の本", "Books on habits");
  const lead = fieldJ("習慣・行動変容・モチベーション・ウェルビーイングなど、習慣化に役立つ書籍をテーマ別に紹介します。", "Curated books on habits, behavior change, motivation and well-being — grouped by theme.");
  const note = fieldJ("国立国会図書館で「習慣」を検索すると、2010〜2025年で約4,767冊が見つかります。その中から、習慣化に役立つ書籍を選びました。", "A search for “habit” in Japan's National Diet Library returns ~4,767 books (2010–2025); these are a selected few.");

  // featured "まず読むなら"
  const picks = [
    ["ジェームズ・クリアー式 複利で伸びる1つの習慣", "世界的ベストセラー。小さな習慣が「複利」で人生を変える仕組みを解説。", "Global bestseller — how tiny habits compound into big change."],
    ["小さな習慣", "「腕立て1回」から。挫折しない“小さく始める”入門書。", "Start with “one push-up” — the anti-failure way to begin."],
    ["習慣超大全――スタンフォード行動デザイン研究所の自分を変える方法", "行動デザインの体系。きっかけ・行動・祝福で習慣をつくる。", "A systematic behavior-design method from Stanford."],
  ];
  const pickLabel = field("まず読むなら", "Start here");
  const pickCards = picks.map((p) => { const why = fieldJ(p[1], p[2]); return `<a class="book-pick reveal" href="${amzn(p[0])}" target="_blank" rel="noopener"><h3>${esc(p[0])}</h3><p${why.attr}>${why.v}</p><span class="res-next-go" aria-hidden="true">→</span></a>`; }).join("");

  const order = [];
  const groups = {};
  RESOURCES.books.forEach((b) => { if (!groups[b.cat]) { groups[b.cat] = []; order.push(b.cat); } groups[b.cat].push(b); });
  // category jump chips with counts
  const navChips = order.map((cat, i) => `<a class="cat-chip" href="#bkcat-${i}">${esc(cat)}<span class="cat-chip-n">${groups[cat].length}</span></a>`).join("");
  const blocks = order.map((cat, i) => {
    const desc = BOOK_CAT_DESC[cat]; const d = desc ? fieldJ(desc[0], desc[1]) : null;
    const items = groups[cat].map((b) => {
      const meta = [b.pub, b.year].filter(Boolean).join(" · ");
      return `<li class="res-item"><a class="res-title" href="${amzn(b.title)}" target="_blank" rel="noopener">${esc(b.title)}</a>${meta ? `<span class="res-meta">${esc(meta)}</span>` : ""}</li>`;
    }).join("");
    return `<div class="res-group reveal" id="bkcat-${i}"><div class="res-cat">${esc(cat)}<span class="res-cat-n">${groups[cat].length}</span></div>${d ? `<p class="res-cat-desc"${d.attr}>${d.v}</p>` : ""}<ul class="res-list">${items}</ul></div>`;
  }).join("");
  const navLabel = field("テーマから探す", "Browse by theme");
  return `<section class="page-hero"><div class="wrap">
    <a class="crumb" href="/"${back.attr}>${back.v}</a>
    <div class="sec-eyebrow"><span class="sec-num">02</span><span class="sec-kicker"${kicker.attr}>${kicker.v}</span></div>
    <h1 class="page-h"${title.attr}>${title.v}</h1>
    <p class="page-lead"${lead.attr}>${lead.v}</p>
  </div></section>
  <section class="section"><div class="wrap">
    <div class="block-label"${pickLabel.attr}>${pickLabel.v}</div>
    <div class="book-picks">${pickCards}</div>
    <div class="block-label" style="margin-top:3rem"${navLabel.attr}>${navLabel.v}</div>
    <div class="cat-nav">${navChips}</div>
    <div class="res-groups" style="margin-top:2rem">${blocks}</div>
    <p class="fineprint reveal"${note.attr}>${note.v}</p>
  </div></section>
  ${resourceLinks("books")}`;
}

/* one-line description per app category (JA/EN) */
const APP_CAT_DESC = {
  "習慣化一般": ["あらゆる習慣づくりに使える定番。", "All-purpose habit trackers."],
  "運動": ["運動・ランニングを続ける。", "Keep moving — exercise and running."],
  "食事": ["食習慣・水分・ダイエット。", "Diet, hydration and eating habits."],
  "学習": ["勉強・読書の記録と継続。", "Track and sustain study and reading."],
  "お金": ["家計・貯蓄の習慣。", "Money and saving habits."],
  "時間管理": ["時間の使い方を整える。", "Manage how you spend your time."],
  "マインドフルネス": ["瞑想・心を整える。", "Meditation and calming the mind."],
  "睡眠": ["睡眠リズムを整える。", "Build a healthy sleep rhythm."],
  "目標達成": ["目標管理と達成を支援。", "Manage goals and reach them."],
};

/* /apps.html — featured picks + usage steps + category nav + grouped catalog */
function appsPageBody() {
  const back = field("← 習慣化デザインラボ", "← Habit Design Lab");
  const kicker = field("Apps", "Apps");
  const title = fieldJ("習慣化アプリ", "Habit apps");
  const lead = fieldJ("目標設定・記録・リマインダーで継続を助けるアプリを、目的別に紹介します。自分に合うものを見つけてみてください。", "Apps that support habits through goals, tracking and reminders — grouped by purpose. Find one that fits you.");

  const icGame = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="9.5" rx="4.7"/><path d="M7 11v3.4M5.3 12.7h3.4"/><circle cx="16.2" cy="12" r="1.15" fill="currentColor" stroke="none"/><circle cx="18.4" cy="14" r="1.15" fill="currentColor" stroke="none"/></svg>`;
  const icPeople = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8.6" cy="9" r="3"/><path d="M3.6 19a5 5 0 0 1 10 0"/><circle cx="16.2" cy="10" r="2.4"/><path d="M14.2 19a4.2 4.2 0 0 1 6.6-2.6"/></svg>`;
  const icBars = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h16"/><rect x="6" y="11" width="3" height="7" rx="1"/><rect x="10.5" y="7.5" width="3" height="10.5" rx="1"/><rect x="15" y="4.5" width="3" height="13.5" rx="1"/></svg>`;
  const picks = [
    ["Habitica", "https://habitica.com/static/home", "ゲーム感覚で。習慣をクエスト化して楽しく続ける。", "Gamified — turn habits into quests and level up.", icGame],
    ["みんチャレ", "https://minchalle.com/", "仲間の力で。5人チームで励まし合い、三日坊主を防ぐ。", "A team of five cheering each other on.", icPeople],
    ["Habitify", "https://www.habitify.me/", "記録と可視化。データで習慣を客観的に管理する。", "Data-driven tracking and visualization.", icBars],
  ];
  const pickLabel = field("まず試すなら", "Start here");
  const pickCards = picks.map((p) => { const why = fieldJ(p[2], p[3]); return `<a class="book-pick reveal" href="${esc(p[1])}" target="_blank" rel="noopener"><span class="method-ic" aria-hidden="true">${p[4]}</span><h3>${esc(p[0])}</h3><p${why.attr}>${why.v}</p><span class="res-next-go" aria-hidden="true">→</span></a>`; }).join("");

  const order = [];
  const groups = {};
  RESOURCES.apps.forEach((a) => { if (!groups[a.cat]) { groups[a.cat] = []; order.push(a.cat); } groups[a.cat].push(a); });
  const navChips = order.map((cat, i) => `<a class="cat-chip" href="#apcat-${i}">${esc(cat)}<span class="cat-chip-n">${groups[cat].length}</span></a>`).join("");
  const blocks = order.map((cat, i) => {
    const desc = APP_CAT_DESC[cat]; const d = desc ? fieldJ(desc[0], desc[1]) : null;
    const items = groups[cat].map((a) => a.url
      ? `<li class="res-item"><a class="res-title" href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.name)}</a></li>`
      : `<li class="res-item"><span class="res-title res-title-plain">${esc(a.name)}</span></li>`).join("");
    return `<div class="res-group reveal" id="apcat-${i}"><div class="res-cat">${esc(cat)}<span class="res-cat-n">${groups[cat].length}</span></div>${d ? `<p class="res-cat-desc"${d.attr}>${d.v}</p>` : ""}<ul class="res-list">${items}</ul></div>`;
  }).join("");
  const steps = [
    ["目標設定", "Set a goal", "「何を・どれくらい」続けたいかを具体的に決める。", "Decide clearly what you want to keep, and how much."],
    ["プラン作り", "Make a plan", "いつ・どこでやるか、無理のない計画に落とす。", "Plan when and where — keep it realistic."],
    ["環境を整える", "Set the environment", "リマインダーやきっかけを用意し、続けやすくする。", "Add reminders and cues to make it easy."],
    ["実践と記録", "Act & record", "まず実行し、アプリで記録して見える化する。", "Do it, then log it in the app to see progress."],
    ["振り返り", "Reflect", "続いた要因やつまずきを見直し、次に活かす。", "Review what worked and what didn't, then adjust."],
  ];
  const stepHtml = steps.map((s, i) => { const t = fieldJ(s[0], s[1]), d = fieldJ(s[2], s[3]); return `<div class="step-card reveal"><span class="step-n">${i + 1}</span><h4${t.attr}>${t.v}</h4><p${d.attr}>${d.v}</p></div>`; }).join("");
  const stepsLabel = field("アプリ活用 5ステップ", "5 steps to use an app");
  const navLabel = field("目的から探す", "Browse by purpose");
  return `<section class="page-hero"><div class="wrap">
    <a class="crumb" href="/"${back.attr}>${back.v}</a>
    <div class="sec-eyebrow"><span class="sec-num">03</span><span class="sec-kicker"${kicker.attr}>${kicker.v}</span></div>
    <h1 class="page-h"${title.attr}>${title.v}</h1>
    <p class="page-lead"${lead.attr}>${lead.v}</p>
  </div></section>
  <section id="apps" class="section"><div class="wrap">
    <div class="block-label"${pickLabel.attr}>${pickLabel.v}</div>
    <div class="book-picks">${pickCards}</div>
    <div class="block-label" style="margin-top:3rem"${stepsLabel.attr}>${stepsLabel.v}</div>
    <div class="step-cards">${stepHtml}</div>
    <div class="block-label" style="margin-top:3rem"${navLabel.attr}>${navLabel.v}</div>
    <div class="cat-nav">${navChips}</div>
    <div class="res-groups" style="margin-top:2rem">${blocks}</div>
  </div></section>
  ${resourceLinks("apps")}`;
}

/* /myplus10.html — the #マイプラス10 walking program (厚労省 +10 based) */
function myplus10PageBody() {
  const back = field("← 習慣化デザインラボ", "← Habit Design Lab");
  const kicker = field("My Plus 10", "My Plus 10");
  const title = fieldJ("#マイプラス10", "#MyPlus10");
  const lead = fieldJ("「今より10分多く動く」から始める、歩く習慣づくり。厚生労働省の＋10（プラス・テン）をベースに、無理なく続けるコツを紹介します。", "Build a walking habit by simply moving “10 minutes more” — based on Japan's MHLW “+10” guidance.");

  // ＋10 + benefits
  const whatLabel = field("＋10（プラス・テン）とは", "What is “+10”?");
  const whatBody = fieldJ("今より10分（約1,000歩）多く体を動かそう、という厚生労働省の呼びかけです。同じ状況で同じ行動を繰り返すことで、自然と習慣になります。", "MHLW encourages moving 10 minutes (about 1,000 steps) more than today. Repeating the same action in the same context turns it into a habit.");
  const benefits = [["生活習慣病予防", "Lifestyle-disease prevention"], ["がんリスク低下", "Lower cancer risk"], ["ロコモ予防", "Locomotive-syndrome prevention"], ["認知症リスク低下", "Lower dementia risk"], ["ダイエット", "Weight management"], ["ストレス発散", "Stress relief"]];
  const benefitChips = benefits.map((b) => { const f = field(b[0], b[1]); return `<span class="sci-tag"${f.attr}>${f.v}</span>`; }).join("");
  const tipLabel = field("今日のウォーキングのヒント", "Today's walking tip");

  // 5 steps (walking-specific)
  const stepsLabel = field("はじめかた（5ステップ）", "How to start (5 steps)");
  const steps = [
    ["プラン例から広げる", "Get ideas", "IF-THENの具体例から、自分に合う形を見つける。", "Find what fits you from IF-THEN examples."],
    ["目標とプランを決める", "Set a plan", "期限（30日・年末など）を決め、生活に合うプランに。", "Set a deadline and a plan that fits your life."],
    ["見える所に貼る", "Make it visible", "手帳・冷蔵庫・スマホ壁紙・リマインダーに。", "On your planner, fridge, phone wallpaper or reminders."],
    ["実行する", "Do it", "1分でもOK。かんたん/きほん/やるきの3段階で。", "Even 1 minute counts — use easy / basic / ambitious tiers."],
    ["振り返る", "Reflect", "週末に確認。楽しめているか、時間帯は合っているか。", "Review weekly — is it enjoyable? Is the timing right?"],
  ];
  const stepHtml = steps.map((s, i) => { const t = fieldJ(s[0], s[1]), d = fieldJ(s[2], s[3]); return `<div class="step-card reveal"><span class="step-n">${i + 1}</span><h4${t.attr}>${t.v}</h4><p${d.attr}>${d.v}</p></div>`; }).join("");

  // IF-THEN examples
  const ifLabel = field("IF-THEN プラン例", "IF-THEN plan examples");
  const ifThen = [
    "朝に顔を洗ったら、10分公園ウォーキングに出かける",
    "建物内を移動する時は、エレベーターより階段を選ぶ",
    "クルマで出かけるときは、駐車場で遠くに停める",
    "休憩でコーヒーを飲んだら、遠くのトイレを使う",
    "近所のスーパーへ行くとき、10分遠回りして歩く",
    "仕事が18時に終わったら、一駅歩いて電車に乗る",
    "夕食の30分〜1時間後に、15分ウォーキングする",
    "動画やテレビを見ながら、ステッパーで10分足踏み",
    "ストレスを感じたら、周りを10分ウォーキングする",
    "雨の日だったら、ウォーキング動画で歩き方を学ぶ",
  ];
  const ifEn = [
    "After washing your face in the morning, head out for a 10-min park walk",
    "Take the stairs instead of the elevator indoors",
    "When you drive, park farther away",
    "After coffee on a break, use a restroom farther away",
    "Take a 10-min detour walking to the local store",
    "When work ends at 6pm, walk one stop before the train",
    "30–60 min after dinner, take a 15-min walk",
    "While watching videos/TV, do 10 min on a stepper",
    "When stressed, walk around the block for 10 min",
    "On rainy days, learn walking form from a video",
  ];
  const ifItems = ifThen.map((t, i) => { const f = fieldJ(t, ifEn[i]); return `<li class="ifthen-item"><span class="ifthen-dot" aria-hidden="true"></span><span${f.attr}>${f.v}</span></li>`; }).join("");

  // 3-tier plans
  const planLabel = field("3段階のプランで続けやすく", "Three tiers to keep going");
  const tierIcon = (n) => { const bars = [[5, 14, 6], [11, 10, 10], [17, 6, 14]].map((b, k) => `<rect x="${b[0]}" y="${b[1]}" width="4" height="${b[2]}" rx="1.2" fill="currentColor"${k < n ? "" : ' opacity="0.28"'}/>`).join(""); return `<svg viewBox="0 0 24 24" aria-hidden="true">${bars}</svg>`; };
  const plans = [
    ["かんたんプラン", "Easy", "やる気が出ない・時間がない日に。例：家の周りを5分。", "For low-energy days. e.g. 5 min around the house.", 1],
    ["きほんプラン", "Basic", "毎日続けられるレベル。例：10分ウォーキング。", "Your daily baseline. e.g. a 10-min walk.", 2],
    ["やるきプラン", "Ambitious", "余裕がある日に。例：20分＋階段。", "For days with extra energy. e.g. 20 min + stairs.", 3],
  ];
  const planCards = plans.map((p) => { const t = fieldJ(p[0], p[1]), d = fieldJ(p[2], p[3]); return `<div class="method-card reveal"><span class="method-ic" aria-hidden="true">${tierIcon(p[4])}</span><h3${t.attr}>${t.v}</h3><p${d.attr}>${d.v}</p></div>`; }).join("");

  // fun ideas
  const funLabel = field("楽しく続けるアイデア", "Make it fun");
  const SV = (inner) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const fun = [
    ["音楽", "Music", "好きな曲やポッドキャストを聴く", "Listen to music or a podcast", SV(`<path d="M9 17V5l11-2v12"/><circle cx="6" cy="17" r="3"/><circle cx="17" cy="15" r="3"/>`)],
    ["道具", "Gear", "新しいシューズやウェアを買う", "Buy new shoes or wear", SV(`<path d="M5 7h14l-1.2 12.2a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9z"/><path d="M9 7a3 3 0 0 1 6 0"/>`)],
    ["ごほうび", "Reward", "カフェやデザートでごほうび", "Treat yourself with a café or dessert", SV(`<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M12 8v12"/><path d="M19 12v6.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18.5V12"/><path d="M12 8S10.5 3.5 8 4.2 7 8 7 8z"/><path d="M12 8s1.5-4.5 4-3.8S17 8 17 8z"/>`)],
    ["写真", "Photos", "花や鳥、空の写真を撮る", "Snap photos of flowers, birds, the sky", SV(`<path d="M14.5 5h-5L7.5 7.5h-3A1.5 1.5 0 0 0 3 9v9a1.5 1.5 0 0 0 1.5 1.5h15A1.5 1.5 0 0 0 21 18V9a1.5 1.5 0 0 0-1.5-1.5h-3z"/><circle cx="12" cy="13" r="3.2"/>`)],
  ];
  const funCards = fun.map((f) => { const t = field(f[0], f[1]), d = fieldJ(f[2], f[3]); return `<div class="fun-card reveal"><span class="method-ic" aria-hidden="true">${f[4]}</span><span class="fun-t"${t.attr}>${t.v}</span><span class="fun-d"${d.attr}>${d.v}</span></div>`; }).join("");

  // chatbot + contact
  const coachLabel = field("AIコーチに相談", "Ask the AI coach");
  const coachBody = fieldJ("目標設定やプランづくりは、ウォーキングAIコーチ（チャットボット）にも相談できます。", "You can also consult the walking AI coach (chatbot) for goals and plans.");
  const coachBtn = field("AIコーチを開く（外部）→", "Open the AI coach (external) →");
  const mailBtn = field("メールで問い合わせる →", "Email us →");

  // references
  const refLabel = field("参考文献", "References");
  const refs = [
    ["厚生労働省「アクティブガイド ― 健康づくりのための身体活動指針」", "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/undou/index.html"],
    ["厚生労働省「健康づくりのための身体活動・運動ガイド2023」", "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/undou/index.html"],
    ["厚生労働省 スマート・ライフ・プロジェクト", "https://www.smartlife.mhlw.go.jp/event/disease/exercise/"],
    ["スポーツ庁 FUN+WALK PROJECT", "https://www.mext.go.jp/sports/funpluswalk/project.html"],
    ["Gollwitzer & Sheeran (2006) Implementation Intentions and Goal Achievement.", ""],
    ["Lally et al. (2010) How are habits formed. Eur. J. Soc. Psychol.", ""],
  ];
  const refItems = refs.map((r) => r[1]
    ? `<li><a class="ai-link" href="${esc(r[1])}" target="_blank" rel="noopener">${esc(r[0])}</a></li>`
    : `<li>${esc(r[0])}</li>`).join("");

  // photo hero
  const heroCta = field("今日も＋10する →", "Do my +10 today →");
  const nextTip = field("次のヒント →", "Next tip →");

  // 「今日の＋10」streak tracker
  const trkLabel = field("今日の＋10", "Today's +10");
  const trkLead = fieldJ("「できた」を1日1回タップするだけ。7日間の連続記録が、続けるはずみになります。", "Just tap “done” once a day. A 7-day streak gives you momentum to keep going.");
  const trkBtn = field("今日、＋10できた！", "I did my +10 today!");
  const trkDone = field("今日はクリア！おつかれさまでした", "Done for today — nice work!");
  const trkNote = field("記録はこの端末にのみ保存されます（サーバー送信なし）", "Saved only on this device — nothing is sent to a server.");
  const dayLabels = ["月", "火", "水", "木", "金", "土", "日"];
  const dayLabelsEn = ["M", "T", "W", "T", "F", "S", "S"];
  const trkCells = dayLabels.map((d, i) => `<div class="trk-cell"><span class="trk-dot" data-i="${i}" aria-hidden="true"></span><span class="trk-day" data-i-ja="${d}" data-i-en="${dayLabelsEn[i]}">${d}</span></div>`).join("");

  // IF-THEN plan builder
  const bldLabel = field("自分のIF-THENプランをつくる", "Build your own IF-THEN plan");
  const bldLead = fieldJ("「いつ・どこで」と「何をするか」を組み合わせるだけ。具体的に決めるほど、行動に移りやすくなります（実行意図）。", "Pair a “when / where” with a “what to do.” The more specific, the easier to act — that's an implementation intention.");
  const cueOpts = [
    ["朝、顔を洗ったら", "After washing my face in the morning"],
    ["昼休みになったら", "When my lunch break starts"],
    ["仕事・授業が終わったら", "When work or class ends"],
    ["夕食を食べ終えたら", "After I finish dinner"],
    ["コーヒーで休憩したら", "After a coffee break"],
    ["買い物に出かけるとき", "When I go shopping"],
    ["エレベーターの前に来たら", "When I reach the elevator"],
    ["ストレスを感じたら", "When I feel stressed"],
    ["テレビ・動画を見るとき", "While watching TV or videos"],
    ["雨が降っていたら", "When it's raining"],
  ];
  const actOpts = [
    ["10分、近所を歩く", "walk around the neighborhood for 10 min"],
    ["一駅手前で降りて歩く", "get off one stop early and walk"],
    ["階段を使う", "take the stairs"],
    ["駐車場の遠くに停めて歩く", "park farther away and walk"],
    ["遠回りして歩く", "take a longer way on foot"],
    ["15分ウォーキングする", "go for a 15-min walk"],
    ["ステッパーで10分足踏みする", "do 10 min on a stepper"],
    ["公園まで散歩する", "stroll to the park"],
    ["遠くのトイレを使う", "use a restroom farther away"],
    ["歩き方の動画を見る", "watch a walking-form video"],
  ];
  const cueOptHtml = cueOpts.map((o, i) => `<option value="${i}" data-ja="${esc(o[0])}" data-en="${esc(o[1])}">${esc(o[0])}</option>`).join("");
  const actOptHtml = actOpts.map((o, i) => `<option value="${i}" data-ja="${esc(o[0])}" data-en="${esc(o[1])}">${esc(o[0])}</option>`).join("");
  const bldCue = field("きっかけ（いつ・どこで）", "Cue (when / where)");
  const bldAct = field("行動（何をする）", "Action (what to do)");
  const bldCopy = field("プランをコピー", "Copy plan");

  return `<section class="myp-hero" style="--myp-img:url('/assets/hero-walk.jpg?v=${ASSET_VER}')">
    <div class="myp-hero-scrim"></div>
    <div class="wrap myp-hero-inner">
      <a class="crumb crumb-light" href="/"${back.attr}>${back.v}</a>
      <div class="sec-eyebrow"><span class="sec-num">04</span><span class="sec-kicker"${kicker.attr}>${kicker.v}</span></div>
      <h1 class="myp-hero-h"${title.attr}>${title.v}</h1>
      <p class="myp-hero-lead"${lead.attr}>${lead.v}</p>
      <div class="hero-cta"><a class="btn btn-accent" href="#tracker"${heroCta.attr}>${heroCta.v}</a></div>
    </div>
  </section>
  <section class="section"><div class="wrap myp-grid">
    <div class="myp-what">
      <div class="block-label"${whatLabel.attr}>${whatLabel.v}</div>
      <p class="sci-body"${whatBody.attr}>${whatBody.v}</p>
      <div class="sci-tags" style="margin-top:1rem">${benefitChips}</div>
    </div>
    <div class="today-card walk-tip">
      <div class="block-label"${tipLabel.attr}>${tipLabel.v}</div>
      <p id="walkTip" class="walk-tip-text"></p>
      <button type="button" id="walkTipNext" class="tip-next"${nextTip.attr}>${nextTip.v}</button>
    </div>
  </div></section>
  <section id="tracker" class="section section-alt"><div class="wrap wrap-narrow">
    <div class="block-label"${trkLabel.attr}>${trkLabel.v}</div>
    <p class="sec-lead"${trkLead.attr}>${trkLead.v}</p>
    <div class="trk-card">
      <div class="trk-week" id="trkWeek">${trkCells}</div>
      <p class="trk-streak" id="trkStreak" aria-live="polite"></p>
      <button type="button" id="trkBtn" class="btn btn-accent trk-btn" data-ja-do="${esc(trkBtn.v)}" data-en-do="${esc("I did my +10 today!")}" data-ja-done="${esc(trkDone.v)}" data-en-done="${esc("Done for today — nice work!")}"${trkBtn.attr}>${trkBtn.v}</button>
      <p class="trk-note"${trkNote.attr}>${trkNote.v}</p>
    </div>
  </div></section>
  <section class="section"><div class="wrap">
    <div class="block-label"${stepsLabel.attr}>${stepsLabel.v}</div>
    <div class="step-cards">${stepHtml}</div>
  </div></section>
  <section class="section section-alt"><div class="wrap">
    <div class="block-label"${ifLabel.attr}>${ifLabel.v}</div>
    <ul class="ifthen-list">${ifItems}</ul>
    <div class="block-label" style="margin-top:2.8rem"${bldLabel.attr}>${bldLabel.v}</div>
    <p class="sec-lead"${bldLead.attr}>${bldLead.v}</p>
    <div class="bld-card">
      <div class="bld-row">
        <label class="bld-field"><span class="bld-tag"${bldCue.attr}>${bldCue.v}</span>
          <select id="bldCue" class="bld-select">${cueOptHtml}</select></label>
        <span class="bld-conj" data-ja="→" data-en="→">→</span>
        <label class="bld-field"><span class="bld-tag"${bldAct.attr}>${bldAct.v}</span>
          <select id="bldAct" class="bld-select">${actOptHtml}</select></label>
      </div>
      <p class="bld-out" id="bldOut" aria-live="polite"></p>
      <button type="button" id="bldCopy" class="btn btn-ghost bld-copy" data-ja="${esc(bldCopy.v)}" data-en="${esc("Copy plan")}" data-ja-done="コピーしました" data-en-done="Copied"${bldCopy.attr}>${bldCopy.v}</button>
    </div>
    <div class="block-label" style="margin-top:2.8rem"${planLabel.attr}>${planLabel.v}</div>
    <div class="method-grid">${planCards}</div>
  </div></section>
  <section class="section"><div class="wrap">
    <div class="block-label"${funLabel.attr}>${funLabel.v}</div>
    <div class="fun-grid">${funCards}</div>
  </div></section>
  <section class="section section-cta"><div class="wrap">
    <div class="block-label on-dark"${coachLabel.attr}>${coachLabel.v}</div>
    <p class="sec-lead"${coachBody.attr}>${coachBody.v}</p>
    <div class="hero-cta" style="margin-top:1.4rem">
      <a class="btn btn-accent" href="https://udify.app/chatbot/c6gRgj2Hwiy2M22U" target="_blank" rel="noopener"${coachBtn.attr}>${coachBtn.v}</a>
      <a class="btn btn-ghost" href="mailto:${esc(JA.access.mail)}"${mailBtn.attr}>${mailBtn.v}</a>
    </div>
  </div></section>
  <section class="section"><div class="wrap wrap-narrow">
    <div class="block-label"${refLabel.attr}>${refLabel.v}</div>
    <ul class="ref-list">${refItems}</ul>
  </div></section>
  ${resourceLinks("")}`;
}

/* speaking themes with icons — shared by work-with-us and profile */
const SVI = (inner) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const SPEAK_THEMES = [
  ["人とAIの協働による行動変容支援", "Human–AI collaboration for behavior change", SVI('<circle cx="8" cy="9" r="2.6"/><path d="M3.5 19a4.5 4.5 0 0 1 9 0"/><rect x="14.5" y="7" width="6.5" height="6" rx="1.3"/><path d="M16.3 13v1.6M19.2 13v1.6M16.3 5.4V7M19.2 5.4V7"/>')],
  ["習慣化デザイン：続く仕組みのつくり方", "Habit design: systems that last", SVI('<path d="M4 12a8 8 0 0 1 13.7-5.7L20 8"/><path d="M20 3.5V8h-4.5"/><path d="M20 12a8 8 0 0 1-13.7 5.7L4 16"/><path d="M4 20.5V16h4.5"/>')],
  ["AI・データで支える健康と運動の習慣", "AI & data for health and exercise", SVI('<path d="M3 12h3.5l2-5.5 3.5 11 2.5-7 1.5 3H21"/>')],
  ["DX時代のリスキリングと学びの習慣", "Reskilling & study habits in the DX era", SVI('<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H11v14H4.5A1.5 1.5 0 0 0 3 20.5z"/><path d="M21 6.5A1.5 1.5 0 0 0 19.5 5H13v14h6.5a1.5 1.5 0 0 1 1.5 1.5z"/>')],
  ["地域・自治体のためのデジタル行動変容", "Digital behavior change for communities", SVI('<path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/>')],
];
function speakThemeCards() {
  return SPEAK_THEMES.map((t) => { const f = field(t[0], t[1]); return `<div class="theme-card reveal"><span class="method-ic" aria-hidden="true">${t[2]}</span><h3${f.attr}>${f.v}</h3></div>`; }).join("");
}

/* /work-with-us.html — engagement intake: press, talks, joint research, advisory */
function workWithUsPageBody() {
  const mail = JA.access.mail;
  const back = field("← 習慣化デザインラボ", "← Habit Design Lab");
  const kicker = field("Work with us", "Work with us");
  const title = fieldJ("依頼・連携", "Work with us");
  const lead = fieldJ("取材・登壇・共同研究・監修など、習慣化デザインに関するご相談をお受けしています。研究の知見と、企業・自治体での実装経験をもとにお力になります。", "We welcome inquiries about press, talks, joint research and advisory work in habit design, drawing on our research and real-world implementation with companies and local governments.");

  // 4 inquiry types
  const typesLabel = field("ご依頼内容", "What we can help with");
  const types = [
    { t: "取材・コメント・寄稿", tEn: "Press & writing", b: "メディア取材、専門家コメント、記事の寄稿・監修。習慣化・行動変容・AIと健康/学びなどのテーマに対応します。", bEn: "Press interviews, expert comments, articles and editorial supervision on habits, behavior change, and AI for health and learning.", subj: "取材・寄稿のご相談" },
    { t: "登壇・講演", tEn: "Talks & lectures", b: "企業・自治体・学会・イベント向けの講演。習慣化デザイン、AIと行動変容、DX・リスキリングなどをわかりやすくお話しします。", bEn: "Talks for companies, governments, academia and events — habit design, AI and behavior change, DX and reskilling, explained accessibly.", subj: "講演・登壇のご相談" },
    { t: "共同研究・産学連携", tEn: "Joint research", b: "行動変容・ヘルスケア・地域連携などの共同研究や実証実験。アプリ・システムの設計から評価までご一緒します。", bEn: "Joint research and field trials in behavior change, healthcare and community work — from designing apps and systems to evaluation.", subj: "共同研究・連携のご相談" },
    { t: "監修・アドバイザリー・執筆", tEn: "Advisory & authoring", b: "サービス・事業の監修、アドバイザリー、書籍・記事の執筆のご相談。", bEn: "Advisory and supervision for services and projects, and authoring of books and articles.", subj: "監修・執筆のご相談" },
  ];
  const typeCards = types.map((c) => {
    const t = fieldJ(c.t, c.tEn), b = fieldJ(c.b, c.bEn), lk = field("メールで相談 →", "Email us →");
    const href = `mailto:${mail}?subject=${encodeURIComponent("【" + c.subj + "】")}`;
    return `<div class="join-card reveal"><div class="aud-for"${t.attr}>${t.v}</div><p class="wwu-card-body"${b.attr}>${b.v}</p><a class="more-link" href="${esc(href)}"${lk.attr}>${lk.v}</a></div>`;
  }).join("");

  // process
  const flowLabel = field("進め方", "How it works");
  const steps = [
    ["お問い合わせ", "Get in touch", "メールでご相談内容・目的・希望時期をお知らせください。", "Email us your topic, goal and preferred timing."],
    ["打ち合わせ", "Discuss", "目的に合わせて、内容・進め方・スケジュールをすり合わせます。", "We align on scope, approach and schedule."],
    ["実施", "Deliver", "講演・取材・共同研究などを実施し、必要に応じて振り返ります。", "We deliver the talk, interview or research, and review as needed."],
  ];
  const stepHtml = steps.map((s, i) => { const t = fieldJ(s[0], s[1]), d = fieldJ(s[2], s[3]); return `<div class="step-card reveal"><span class="step-n">${i + 1}</span><h4${t.attr}>${t.v}</h4><p${d.attr}>${d.v}</p></div>`; }).join("");

  // talk themes (icon cards, shared)
  const themeLabel = field("講演テーマ例", "Talk themes");

  // track record
  const trackLabel = field("これまでの実績", "Selected experience");
  const profLink = field("太田賢のプロフィール →", "About Ken Ohta →");
  const groups = [
    { h: "登壇", hEn: "Talks", items: ["情報処理学会DICOMO2025シンポジウム 招待講演", "NTTドコモ東北支社 ドコモmeetup", "仙台金融経済懇話会", "東北IT産業推進機構"] },
    { h: "受賞・査読論文", hEn: "Awards & papers", items: ["情報処理学会DICOMO2025シンポジウム 優秀論文賞", "情報処理学会論文誌（CDS, 2025）査読付き論文"] },
    { h: "メディア・審査", hEn: "Media & judging", items: ["日本経済新聞（DX人材育成事業）", "探究教材GATEWAY", "モバイル空間統計 分析事例", "生成AI×教育コンテスト 審査員"] },
    { h: "連携", hEn: "Partners", items: ["三菱地所グループ（泉パークタウン）", "NTT東日本", "NTTドコモ", "インテック", "福井県（はぴウォーク）", "習慣化コンサルティング"] },
  ];
  const trackHtml = groups.map((g) => {
    const h = field(g.h, g.hEn);
    const lis = g.items.map((it) => `<li>${esc(it)}</li>`).join("");
    return `<div class="track-col reveal"><div class="block-label"${h.attr}>${h.v}</div><ul class="ref-list">${lis}</ul></div>`;
  }).join("");

  // contact
  const ctaLabel = field("お問い合わせ", "Contact");
  const ctaLead = fieldJ("下のご依頼内容を選ぶと、件名入りのメールが開きます。まずはお気軽にご相談ください。", "Pick a topic above to open a pre-filled email, or write to us directly.");
  const mailBtn = field("メールで問い合わせる →", "Email us →");
  const studentBtn = field("学生の方（配属案内）→", "For students (admissions) →");

  return `<section class="page-hero"><div class="wrap">
    <a class="crumb" href="/"${back.attr}>${back.v}</a>
    <div class="sec-eyebrow"><span class="sec-num">—</span><span class="sec-kicker"${kicker.attr}>${kicker.v}</span></div>
    <h1 class="page-h"${title.attr}>${title.v}</h1>
    <p class="page-lead"${lead.attr}>${lead.v}</p>
  </div></section>
  <section class="section"><div class="wrap">
    <div class="block-label"${typesLabel.attr}>${typesLabel.v}</div>
    <div class="hub-join-grid" style="margin-top:1rem">${typeCards}</div>
  </div></section>
  <section class="section section-alt"><div class="wrap">
    <div class="block-label"${flowLabel.attr}>${flowLabel.v}</div>
    <div class="step-cards">${stepHtml}</div>
  </div></section>
  <section class="section"><div class="wrap">
    <div class="block-label"${themeLabel.attr}>${themeLabel.v}</div>
    <div class="theme-grid" style="margin-top:1rem">${speakThemeCards()}</div>
  </div></section>
  <section class="section section-alt"><div class="wrap">
    <div class="block-label"${trackLabel.attr}>${trackLabel.v}</div>
    <div class="track-grid">${trackHtml}</div>
    <div class="more-row reveal" style="margin-top:1.6rem"><a class="more-link" href="/profile.html"${profLink.attr}>${profLink.v}</a></div>
  </div></section>
  <section class="section section-cta"><div class="wrap">
    <div class="block-label on-dark"${ctaLabel.attr}>${ctaLabel.v}</div>
    <p class="sec-lead"${ctaLead.attr}>${ctaLead.v}</p>
    <div class="hero-cta" style="margin-top:1.4rem">
      <a class="btn btn-accent" href="mailto:${esc(mail)}"${mailBtn.attr}>${mailBtn.v}</a>
      <a class="btn btn-ghost" href="/ohtalab/admissions.html"${studentBtn.attr}>${studentBtn.v}</a>
    </div>
  </div></section>`;
}

/* /profile.html — Prof. Ken Ohta profile (for press, talks, partnerships) */
function profilePageBody() {
  const mail = JA.access.mail;
  const back = field("← 習慣化デザインラボ", "← Habit Design Lab");
  const kicker = field("Profile", "Profile");
  const name = fieldJ("太田 賢", "Ken Ohta");
  const role = fieldJ("宮城大学 事業構想学群 教授 / 博士（工学）", "Professor, School of Project Design, Miyagi University / Ph.D. in Engineering");
  const lead = fieldJ("AI・データ・行動科学で「続く仕組み」をつくる、習慣化デザインの研究者。モバイル・AIの研究開発と、企業・自治体での社会実装の経験をもとに、研究から実装までを橋渡しします。", "A researcher in habit design, building systems that last with AI, data and behavioral science. Bridging research and implementation, drawing on R&D in mobile and AI and real-world work with companies and local governments.");
  const rmTop = field("researchmap で詳しく →", "View on researchmap →");

  // career / specialties / books
  const groups = [
    { label: "専門分野", labelEn: "Fields", items: [
      ["サイバーフィジカルシステム", "Cyber-physical systems"],
      ["モバイルコンピューティング", "Mobile computing"],
      ["行動変容支援システム", "Behavior change support systems"],
      ["行動・習慣デザイン", "Behavior & habit design"],
    ] },
    { label: "経歴", labelEn: "Career", items: [
      ["静岡大学にて博士（工学）を取得", "Ph.D. in Engineering, Shizuoka University"],
      ["1999年 NTT移動通信網（株）入社", "Joined NTT Mobile Communications (1999)"],
      ["（株）NTTドコモ研究開発部門にて、モバイル端末プラットフォームの研究、AI・ビッグデータを活用したサービス開発、データ活用人材育成、DX推進に従事", "At NTT DOCOMO R&D: mobile device platforms, AI/big-data services, data-talent development and DX promotion"],
      ["現在、宮城大学 事業構想学群 教授", "Currently Professor, School of Project Design, Miyagi University"],
    ] },
    { label: "外部資金（競争的研究費）", labelEn: "Competitive research funding", items: [
      ["JSPS科研費 25K15355 習慣化事業支援システムの研究（研究代表者）", "JSPS KAKENHI 25K15355 — Habit-program support system (Principal Investigator)", "https://kaken.nii.ac.jp/ja/grant/KAKENHI-PROJECT-25K15355/"],
      ["JSPS科研費 26K06165 学習支援システム（DDX）の研究（研究分担者）", "JSPS KAKENHI 26K06165 — Learning support system, DDX (Co-Investigator)", "https://kaken.nii.ac.jp/ja/grant/KAKENHI-PROJECT-26K06165/"],
    ] },
    { label: "受賞", labelEn: "Awards", items: [
      ["情報処理学会DICOMO2025シンポジウム 優秀論文賞（2025）", "Best Paper Award, IPSJ DICOMO 2025 Symposium (2025)"],
      ["DICOMOシンポジウム 活動功労賞（2024）", "Service Award, DICOMO Symposium (2024)"],
      ["情報処理学会 2020年度 研究会活動貢献賞", "Research Group Contribution Award, IPSJ (FY2020)"],
      ["役に立つ地学賞2025（学都「仙台・宮城」サイエンス・デイ）", "Useful Earth Science Award 2025 (Sendai/Miyagi Science Day)"],
    ] },
    { label: "委員歴・所属学会", labelEn: "Committees & memberships", items: [
      ["情報処理学会 情報環境領域委員会 財務委員（2025年6月〜）", "IPSJ Information Environment Area Committee, Finance (2025–)"],
      ["情報処理学会論文誌CDSトランザクション 編集委員（2024年4月〜）", "Editorial Board, IPSJ TCDS (2024–)"],
      ["電子情報通信学会 企画理事（2022年6月〜2024年5月）", "Director of Planning, IEICE (2022–2024)"],
      ["情報処理学会 モバイルコンピューティングとパーベイシブシステム研究会 主査（2019〜2021）", "Chair, IPSJ SIG Mobile Computing and Pervasive Systems (2019–2021)"],
      ["所属学会：情報処理学会、電子情報通信学会、IEEE", "Member: IPSJ, IEICE, IEEE"],
    ] },
    { label: "著書・訳書", labelEn: "Books", items: [
      ["『モバイルネットワーク』（共立出版、共著）", "Mobile Networks (Kyoritsu Shuppan, co-author)"],
      ["訳書『コンピュータネットワーク 第6版』（日経BP、共訳）", "Computer Networks, 6th ed. (Nikkei BP, co-translator)"],
    ] },
  ];
  const groupHtml = groups.map((g) => {
    const lab = field(g.label, g.labelEn);
    const lis = g.items.map((it) => { const f = fieldJ(it[0], it[1]); return it[2] ? `<li><a class="ref-link" href="${it[2]}" target="_blank" rel="noopener"${f.attr}>${f.v}</a></li>` : `<li${f.attr}>${f.v}</li>`; }).join("");
    return `<div class="prof-block reveal"><div class="block-label"${lab.attr}>${lab.v}</div><ul class="ref-list">${lis}</ul></div>`;
  }).join("");

  // themes (icon cards, shared)
  const themeLabel = field("お話しできるテーマ", "Topics I can speak on");

  // related links
  const linksLabel = field("リンク", "Links");
  const rmLink = field("researchmap（業績・委員歴の詳細）→", "researchmap (full record) →");
  const wwuLink2 = field("依頼・連携について →", "Work with us →");
  const labLink2 = field("太田研究室サイト →", "Ohta Lab site →");

  // cta
  const ctaLabel = field("ご連絡", "Contact");
  const ctaLead = fieldJ("取材・登壇・共同研究・監修などのご相談をお受けしています。", "Inquiries about press, talks, joint research and advisory work are welcome.");
  const mailBtn = field("メールで問い合わせる →", "Email me →");
  const wwuBtn = field("依頼・連携について →", "Work with us →");

  return `<section class="page-hero"><div class="wrap">
    <a class="crumb" href="/"${back.attr}>${back.v}</a>
    <div class="sec-eyebrow"><span class="sec-num">—</span><span class="sec-kicker"${kicker.attr}>${kicker.v}</span></div>
    <div class="profile-head">
      <div class="profile-photo"><img src="/assets/ohta.png?v=${ASSET_VER}" alt="${esc(name.v)}" width="320" height="320" loading="lazy"></div>
      <div class="profile-intro">
        <h1 class="page-h"${name.attr}>${name.v}</h1>
        <p class="profile-role"${role.attr}>${role.v}</p>
        <p class="page-lead"${lead.attr}>${lead.v}</p>
        <a class="more-link" href="https://researchmap.jp/kenohta" target="_blank" rel="noopener"${rmTop.attr}>${rmTop.v}</a>
      </div>
    </div>
  </div></section>
  <section class="section"><div class="wrap wrap-narrow prof-blocks">${groupHtml}</div></section>
  <section class="section section-alt"><div class="wrap wrap-narrow">
    <div class="block-label"${themeLabel.attr}>${themeLabel.v}</div>
    <div class="theme-grid" style="margin-top:1rem">${speakThemeCards()}</div>
  </div></section>
  <section class="section"><div class="wrap wrap-narrow">
    <div class="block-label"${linksLabel.attr}>${linksLabel.v}</div>
    <div class="more-row reveal" style="margin-top:.8rem;display:flex;flex-wrap:wrap;gap:1rem 1.6rem">
      <a class="more-link" href="https://researchmap.jp/kenohta" target="_blank" rel="noopener"${rmLink.attr}>${rmLink.v}</a>
      <a class="more-link" href="/work-with-us.html"${wwuLink2.attr}>${wwuLink2.v}</a>
      <a class="more-link" href="/ohtalab/"${labLink2.attr}>${labLink2.v}</a>
    </div>
  </div></section>
  <section class="section section-cta"><div class="wrap">
    <div class="block-label on-dark"${ctaLabel.attr}>${ctaLabel.v}</div>
    <p class="sec-lead"${ctaLead.attr}>${ctaLead.v}</p>
    <div class="hero-cta" style="margin-top:1.4rem">
      <a class="btn btn-accent" href="mailto:${esc(mail)}"${mailBtn.attr}>${mailBtn.v}</a>
      <a class="btn btn-ghost" href="/work-with-us.html"${wwuBtn.attr}>${wwuBtn.v}</a>
    </div>
  </div></section>`;
}

/* /case-walking-app.html — flagship case study: joint research -> paper -> #MyPlus10 */
function caseWalkingAppPageBody() {
  const mail = JA.access.mail;
  const back = field("← 習慣化デザインラボ", "← Habit Design Lab");
  const kicker = field("Case study", "Case study");
  const title = fieldJ("運動習慣化アプリの共同研究", "Joint research on an exercise-habit app");
  const lead = fieldJ("習慣化を専門とする習慣化コンサルティング株式会社との共同研究。一人ひとりの生活に合う運動プランづくりを支援するアプリを設計・実装し、評価実験を経て査読付き論文として発表しました。その手法は #マイプラス10 として公開しています。", "A joint study with Shukanka Consulting (a habit-focused company). We designed and built an app that helps people craft exercise plans fitting their own lives, evaluated it, and published the results in a peer-reviewed paper. The method is now public as #MyPlus10.");

  // overview: 課題 / アプローチ / 連携
  const ovLabel = field("概要", "Overview");
  const ov = [
    ["課題", "Challenge", "運動を始めても続かない。個人の多様なライフスタイルに合う運動プランを、どうつくり、どう調整するか。", "People start exercising but stop. How can we create and adjust exercise plans that fit each person's lifestyle?"],
    ["アプローチ", "Approach", "実践と調整を繰り返す「自己行動実験」の考え方に基づき、AIが計画と振り返りを支援する習慣化アプリを設計・実装。アプリ設計で習慣化コンサルティング株式会社の支援を受けました。", "Based on a self-experimentation approach, we designed and built a habit app in which AI supports planning and reflection. The app design was supported by Shukanka Consulting."],
    ["連携", "Partner", "習慣化コンサルティング株式会社との共同研究。", "Joint research with Shukanka Consulting."],
  ];
  const ovHtml = ov.map((o) => { const t = fieldJ(o[0], o[1]), b = fieldJ(o[2], o[3]); return `<div class="join-card reveal"><div class="aud-for"${t.attr}>${t.v}</div><p class="wwu-card-body"${b.attr}>${b.v}</p></div>`; }).join("");

  // method: 3 features
  const mLabel = field("アプリの3つの機能", "Three core features");
  const feats = [
    ["IF-THENプラン推薦", "IF-THEN plan recommendation", "日常行動に紐づけて「〇〇したら△△する」という運動プランを提案。", "Suggests “if X, then Y” exercise plans tied to daily routines."],
    ["調整のきっかけを提示", "Cues for adjustment", "ユーザーの状況スコアをもとに、プランを見直すタイミングを知らせる。", "Uses a situation score to prompt when to revisit a plan."],
    ["相談に基づく調整提案", "Consultation-based tuning", "うまくいかない状況を相談すると、対処プランや変更案を提案。", "When you consult about problems, it proposes coping plans and changes."],
  ];
  const featHtml = feats.map((f, i) => { const t = fieldJ(f[0], f[1]), d = fieldJ(f[2], f[3]); return `<div class="step-card reveal"><span class="step-n">${i + 1}</span><h4${t.attr}>${t.v}</h4><p${d.attr}>${d.v}</p></div>`; }).join("");

  // results
  const rLabel = field("成果", "Results");
  const rBody = fieldJ("15名の参加者による評価実験で、活動・入浴・移動などの日常行動に紐づく行動プランが作成され、運動種別やタイミングの変更といったプラン最適化が行われたことを確認しました。成果は情報処理学会論文誌（コンシューマ・デバイス＆システム, 2025）に査読付き論文として掲載されています。", "In a study with 15 participants, plans were created around daily activities (work, bathing, commuting) and were optimized — e.g., changing exercise type and timing. The results appear in a peer-reviewed paper in IPSJ TCDS (2025).");
  const paperBtn = field("査読論文を見る（情報処理学会）→", "Read the paper (IPSJ) →");
  const paperUrl = "https://ipsj.ixsq.nii.ac.jp/records/2002189";

  // implementation link
  const impLabel = field("研究から実装へ", "From research to practice");
  const impBody = fieldJ("この研究のIF-THENプランづくりは、誰でも試せる形で #マイプラス10 に実装しています。ページ内の「IF-THENプラン・ビルダー」で、自分のプランをその場で作れます。", "The IF-THEN planning from this research is implemented in #MyPlus10 so anyone can try it. Use the in-page “IF-THEN plan builder” to create your own plan.");
  const impBtn = field("#マイプラス10で試す →", "Try it in #MyPlus10 →");

  // cta
  const ctaLabel = field("共同研究・連携のご相談", "Joint research & partnerships");
  const ctaLead = fieldJ("行動変容・ヘルスケア・地域連携などの共同研究や実証実験のご相談をお受けしています。", "We take on joint research and field trials in behavior change, healthcare and community work.");
  const ctaBtn = field("依頼・連携について →", "Work with us →");
  const mailBtn = field("メールで相談 →", "Email us →");

  return `<section class="page-hero"><div class="wrap">
    <a class="crumb" href="/"${back.attr}>${back.v}</a>
    <div class="sec-eyebrow"><span class="sec-num">—</span><span class="sec-kicker"${kicker.attr}>${kicker.v}</span></div>
    <h1 class="page-h"${title.attr}>${title.v}</h1>
    <p class="page-lead"${lead.attr}>${lead.v}</p>
  </div></section>
  <section class="section"><div class="wrap">
    <div class="block-label"${ovLabel.attr}>${ovLabel.v}</div>
    <div class="hub-join-grid" style="margin-top:1rem">${ovHtml}</div>
  </div></section>
  <section class="section section-alt"><div class="wrap">
    <div class="block-label"${mLabel.attr}>${mLabel.v}</div>
    <div class="step-cards">${featHtml}</div>
  </div></section>
  <section class="section"><div class="wrap wrap-narrow">
    <div class="block-label"${rLabel.attr}>${rLabel.v}</div>
    <p class="sci-body" style="margin-top:.8rem"${rBody.attr}>${rBody.v}</p>
    <div class="more-row reveal" style="margin-top:1.2rem"><a class="more-link" href="${paperUrl}" target="_blank" rel="noopener"${paperBtn.attr}>${paperBtn.v}</a></div>
  </div></section>
  <section class="section section-alt"><div class="wrap wrap-narrow">
    <div class="block-label"${impLabel.attr}>${impLabel.v}</div>
    <p class="sci-body" style="margin-top:.8rem"${impBody.attr}>${impBody.v}</p>
    <div class="hero-cta" style="margin-top:1.2rem"><a class="btn btn-accent" href="/myplus10.html#tracker"${impBtn.attr}>${impBtn.v}</a></div>
  </div></section>
  <section class="section"><div class="wrap wrap-narrow">
    <div class="block-label">参考文献</div>
    <ul class="ref-list" style="margin-top:.8rem">
      <li><a class="ai-link" href="https://ipsj.ixsq.nii.ac.jp/records/2002189" target="_blank" rel="noopener">太田 賢, 岩間 参伸. 個人の行動プラン最適化による運動習慣化サポート. 情報処理学会論文誌コンシューマ・デバイス＆システム（CDS）, Vol.15, No.2, pp.1–10, 2025年5月.</a></li>
      <li><a class="ai-link" href="https://ieeexplore.ieee.org/document/10760347" target="_blank" rel="noopener">Ken Ohta, Sanshin Iwama. An Interaction Model for E-Coaching Systems Harmonizing Human and Digital Habit Coaches. 2024 IEEE 13th Global Conference on Consumer Electronics (GCCE 2024), 2024年11月.</a></li>
    </ul>
  </div></section>
  <section class="section section-cta"><div class="wrap">
    <div class="block-label on-dark"${ctaLabel.attr}>${ctaLabel.v}</div>
    <p class="sec-lead"${ctaLead.attr}>${ctaLead.v}</p>
    <div class="hero-cta" style="margin-top:1.4rem">
      <a class="btn btn-accent" href="/work-with-us.html"${ctaBtn.attr}>${ctaBtn.v}</a>
      <a class="btn btn-ghost" href="mailto:${esc(mail)}?subject=${encodeURIComponent("【共同研究・連携のご相談】")}"${mailBtn.attr}>${mailBtn.v}</a>
    </div>
  </div></section>`;
}

/* /case-izumi.html — community case study: Izumi Park Town (Mitsubishi Estate Group) */
function caseIzumiPageBody() {
  const mail = JA.access.mail;
  const back = field("← 習慣化デザインラボ", "← Habit Design Lab");
  const kicker = field("Case study", "Case study");
  const title = fieldJ("泉パークタウン共創", "Izumi Park Town co-creation");
  const lead = fieldJ("三菱地所グループ（泉パークタウンサービス）と宮城大学による地域連携。地域コミュニティの活性化や住民の行動・習慣づくりを、データとデジタルの力で支援しています。", "A regional partnership between Mitsubishi Estate Group (Izumi Park Town Service) and Miyagi University, supporting community vitality and residents' habits with data and digital tools.");

  // overview
  const ovLabel = field("概要", "Overview");
  const ov = [
    ["連携先", "Partner", "三菱地所グループ 泉パークタウンサービス／宮城大学 太田研究室。", "Izumi Park Town Service (Mitsubishi Estate Group) and Ohta Lab, Miyagi University."],
    ["ねらい", "Aim", "住民・企業・大学が一体となり、地域の課題解決と新しい習慣・行動のデザインに取り組む。", "Residents, companies and the university working together to solve local issues and design new habits and behaviors."],
    ["役割", "Our role", "太田がファシリテーションを担い、学生とともにデータ分析・アプリ開発・現場での実践を進める。", "Prof. Ohta facilitates; with students we run data analysis, app development and on-the-ground practice."],
  ];
  const ovHtml = ov.map((o) => { const t = fieldJ(o[0], o[1]), b = fieldJ(o[2], o[3]); return `<div class="join-card reveal"><div class="aud-for"${t.attr}>${t.v}</div><p class="wwu-card-body"${b.attr}>${b.v}</p></div>`; }).join("");

  // initiatives
  const iLabel = field("取り組み", "Initiatives");
  const inits = [
    { t: "泉パークタウン共創ミーティング", tEn: "Co-creation meetings", b: "住民・企業・大学が地域の課題解決を話し合う場。太田がファシリテーターを務め、学生もメンバーとして参加しています。", bEn: "A forum where residents, companies and the university discuss local issues. Prof. Ohta facilitates and students take part.", href: "https://www.myu.ac.jp/download_file/e5540987-f276-4991-a3ce-2051671e5dd1/1/", lk: "共同リリース（PDF）", lkEn: "Joint release (PDF)", ext: true },
    { t: "デジタル回覧板アプリ「まちひろば」", tEn: "“Machihiroba” app", b: "回覧板をAI-OCRで位置情報付きデータに変換し、地域の賑わいを地図で発見できるアプリ。泉パークタウン公式LINEで配信した振り返りコンテンツは、約86%が好評でした。", bEn: "Turns bulletin-board notices into geo-tagged data with AI-OCR, mapping community activity. A year-in-review delivered on the official LINE was rated positively by ~86%.", href: "", lk: "", lkEn: "", ext: false },
    { t: "スマホ教室＠寺岡Knots", tEn: "Smartphone class @ Teraoka Knots", b: "多世代交流拠点で、学生が開発したLINEボット「チョッピー」を使い、スマホの使い方をサポートしました。", bEn: "At a multi-generation community hub, students supported smartphone use with their LINE bot “Choppy.”", href: "https://www.myu.ac.jp/campus/news/8756/", lk: "大学ニュース", lkEn: "University news", ext: true },
  ];
  const initHtml = inits.map((c) => {
    const t = fieldJ(c.t, c.tEn), b = fieldJ(c.b, c.bEn);
    const linkHtml = c.href ? (() => { const lk = field(c.lk + " →", c.lkEn + " →"); return `<a class="more-link" href="${esc(c.href)}"${c.ext ? ' target="_blank" rel="noopener"' : ""}${lk.attr}>${lk.v}</a>`; })() : "";
    return `<div class="join-card reveal"><div class="aud-for"${t.attr}>${t.v}</div><p class="wwu-card-body"${b.attr}>${b.v}</p>${linkHtml}</div>`;
  }).join("");

  // videos (student-built apps)
  const vidLabel = field("動画で見る", "Watch the videos");
  const v1Cap = fieldJ("デジタル回覧板アプリ「まちひろば」", "“Machihiroba” digital bulletin-board app");
  const v2Cap = fieldJ("LINEボット「チョッピー」", "“Choppy” LINE bot");
  const ytFig = (id, ttl, cap) => `<figure class="reveal" style="margin:0"><div style="position:relative;aspect-ratio:16/9;border-radius:18px;overflow:hidden;box-shadow:inset 0 0 0 1px var(--hair);background:#000"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="${esc(ttl)}" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;border:0;display:block" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div><figcaption class="figure-cap"${cap.attr}>${cap.v}</figcaption></figure>`;
  const vidsHtml = ytFig("UNg82yhyloU", "まちひろば", v1Cap) + ytFig("Spp5mOSV4js", "チョッピー", v2Cap);

  // cta
  const ctaLabel = field("地域連携のご相談", "Community partnerships");
  const ctaLead = fieldJ("自治体・地域企業との連携や、地域でのデジタル行動変容の取り組みについて、お気軽にご相談ください。", "Feel free to reach out about partnerships with local governments and businesses, or digital behavior-change work in communities.");
  const ctaBtn = field("依頼・連携について →", "Work with us →");
  const mailBtn = field("メールで相談 →", "Email us →");

  return `<section class="page-hero"><div class="wrap">
    <a class="crumb" href="/"${back.attr}>${back.v}</a>
    <div class="sec-eyebrow"><span class="sec-num">—</span><span class="sec-kicker"${kicker.attr}>${kicker.v}</span></div>
    <h1 class="page-h"${title.attr}>${title.v}</h1>
    <p class="page-lead"${lead.attr}>${lead.v}</p>
  </div></section>
  <section class="section"><div class="wrap">
    <div class="block-label"${ovLabel.attr}>${ovLabel.v}</div>
    <div class="hub-join-grid" style="margin-top:1rem">${ovHtml}</div>
  </div></section>
  <section class="section section-alt"><div class="wrap">
    <div class="block-label"${iLabel.attr}>${iLabel.v}</div>
    <div class="hub-join-grid" style="margin-top:1rem">${initHtml}</div>
  </div></section>
  <section class="section"><div class="wrap">
    <div class="block-label"${vidLabel.attr}>${vidLabel.v}</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.4rem;margin-top:1rem">${vidsHtml}</div>
  </div></section>
  <section class="section section-cta"><div class="wrap">
    <div class="block-label on-dark"${ctaLabel.attr}>${ctaLabel.v}</div>
    <p class="sec-lead"${ctaLead.attr}>${ctaLead.v}</p>
    <div class="hero-cta" style="margin-top:1.4rem">
      <a class="btn btn-accent" href="/work-with-us.html"${ctaBtn.attr}>${ctaBtn.v}</a>
      <a class="btn btn-ghost" href="mailto:${esc(mail)}?subject=${encodeURIComponent("【地域連携のご相談】")}"${mailBtn.attr}>${mailBtn.v}</a>
    </div>
  </div></section>`;
}

/* /case-matsuri.html — Festival Design Lab (祭りデザインラボ) */
function caseMatsuriPageBody() {
  const mail = JA.access.mail;
  const back = field("← 習慣化デザインラボ", "← Habit Design Lab");
  const kicker = field("Case study", "Case study");
  const title = fieldJ("祭りデザインラボ", "Festival Design Lab");
  const lead = fieldJ("地域のお祭りを人流ビッグデータ（モバイル空間統計）で分析し、課題解決と価値創造を考える取り組み。デジタル技術でお祭りの魅力を読み解き、高校生向けの探究・アントレプレナーシップ教育の教材としても活用しています。", "Analyzing local festivals with population big data (Mobile Spatial Statistics) to explore problem-solving and value creation — reading festivals through digital tools, and used as teaching material for high-school inquiry and entrepreneurship programs.");

  // overview
  const ovLabel = field("概要", "Overview");
  const ov = [
    ["コンセプト", "Concept", "「デジタル技術で祭りの課題を解決し、新しい価値を創造しよう！」。地域のお祭りに関する課題解決と価値創造を学ぶ教材キットを提供しています。", "“Let's solve festival challenges and create new value with digital technology.” We provide a teaching kit for learning problem-solving and value creation around local festivals."],
    ["手法", "Method", "来場者の人流ビッグデータ（モバイル空間統計）を活用し、エリアごとの特徴や混雑パターン、来場者の属性をデータ駆動で読み解きます。", "Using visitors' population big data (Mobile Spatial Statistics), we read area characteristics, crowd patterns and visitor attributes in a data-driven way."],
    ["活用", "Use", "高校生・中高生向けの探究／アントレプレナーシップ教育や、サイエンス・デイなどの体験型出展の教材として活用されています。", "Used as material for high-school inquiry and entrepreneurship education, and for hands-on exhibits such as Science Day."],
  ];
  const ovHtml = ov.map((o) => { const t = fieldJ(o[0], o[1]), b = fieldJ(o[2], o[3]); return `<div class="join-card reveal"><div class="aud-for"${t.attr}>${t.v}</div><p class="wwu-card-body"${b.attr}>${b.v}</p></div>`; }).join("");

  // video
  const vidLabel = field("お祭り体験の動画", "Festival experience video");
  const vidLead = fieldJ("地域のお祭りの魅力と、データで読み解く取り組みの様子を動画で紹介します。", "A short video introducing the appeal of local festivals and how we read them through data.");
  const vidCap = field("▶ お祭り体験の動画を見る（YouTube） →", "▶ Watch the festival experience video (YouTube) →");

  // data figures (population big-data visualizations)
  const figLabel = field("データで読み解く", "Reading festivals through data");
  const figLead = fieldJ("スマートフォンの人流ビッグデータ（モバイル空間統計）を使うと、お祭りに「いつ・どこから・どんな人が」訪れているのかを可視化できます。", "With smartphone population big data (Mobile Spatial Statistics), we can visualize when, from where and who visits each festival.");
  const fig1Cap = fieldJ("東北各地のお祭りに、どこから来場者が訪れているかを可視化した人流分析の例。", "A flow-analysis example visualizing where visitors travel from to festivals across Tohoku.");
  const fig2Cap = fieldJ("「仙台・東北のお祭りをビッグデータでみよう！」。スマホのデータからお祭りの来場者像を読み解く教材スライド。", "“See Tohoku's festivals through big data” — a teaching slide that reads visitor profiles from smartphone data.");
  const figsHtml = `<figure class="figure reveal"><img src="/assets/matsuri-hero-1.jpg?v=${ASSET_VER}" alt="東北のお祭りへの来場者の人流をモバイル空間統計で可視化した地図" loading="lazy"><figcaption class="figure-cap"${fig1Cap.attr}>${fig1Cap.v}</figcaption></figure>` +
    `<figure class="figure reveal"><img src="/assets/matsuri-hero-2.jpg?v=${ASSET_VER}" alt="仙台・東北のお祭りをビッグデータで見てみようの教材マップ" loading="lazy"><figcaption class="figure-cap"${fig2Cap.attr}>${fig2Cap.v}</figcaption></figure>`;

  // initiatives
  const iLabel = field("取り組み", "Initiatives");
  const inits = [
    { t: "教材キット「祭りデザインラボ」", tEn: "“Festival Design Lab” teaching kit", b: "お祭りの課題解決と価値創造を学ぶための教材キット。モバイル空間統計でエリアごとの特徴を分析するツールを取り入れています。", bEn: "A teaching kit for learning festival problem-solving and value creation, incorporating tools that analyze area characteristics with Mobile Spatial Statistics.", href: "https://matsuri-design.notion.site/", lk: "祭りデザインラボを見る", lkEn: "Visit the lab site", ext: true },
    { t: "サイエンス・デイ出展「仙台・東北のお祭りをビッグデータでみよう！」", tEn: "Science Day exhibit “See Tohoku's festivals through big data”", b: "学都「仙台・宮城」サイエンス・デイに出展。「未来のデータサイエンティスト体験」をテーマに、小学校4年生〜おとなを対象に、スマートフォンの通信の仕組みから来場者の属性・混雑の把握までを解説し、お祭りクイズやアイデア発見に取り組みました。役に立つ地学賞2025を受賞しています。", bEn: "Exhibited at Sendai-Miyagi Science Day. Under the theme “Become a future data scientist,” participants (4th graders to adults) learned how smartphone communication reveals visitor attributes and congestion, and worked on a festival quiz and idea discovery. Awarded the 2025 “Useful Earth Science” prize.", href: "https://www.myu.ac.jp/research/news/2025/8630/", lk: "大学ニュース", lkEn: "University news", ext: true },
    { t: "アントレプレナーシップ教育ワークショップ", tEn: "Entrepreneurship education workshop", b: "未来志向型アントレプレナーシップ教育プログラム2024にて、仙台・東北の祭りをテーマに、地域ビッグデータによる価値創造のワークショップを行いました。", bEn: "In the 2024 forward-looking entrepreneurship education program, we ran a value-creation workshop on regional big data themed around Sendai/Tohoku festivals.", href: "https://www.myu.ac.jp/academics/news/folder002/2024/8063/", lk: "大学ニュース", lkEn: "University news", ext: true },
    { t: "分析事例としての紹介", tEn: "Featured as an analysis case", b: "NTT docomo InsightMarketing により、モバイル空間統計の分析事例として「祭りデザインラボ」を紹介いただきました。", bEn: "“Festival Design Lab” was featured by NTT docomo InsightMarketing as a case of Mobile Spatial Statistics analysis.", href: "https://mobaku.jp/analysis/2024/1011_1061.html", lk: "紹介記事", lkEn: "Article", ext: true },
  ];
  const initHtml = inits.map((c) => {
    const t = fieldJ(c.t, c.tEn), b = fieldJ(c.b, c.bEn);
    const linkHtml = c.href ? (() => { const lk = field(c.lk + " →", c.lkEn + " →"); return `<a class="more-link" href="${esc(c.href)}"${c.ext ? ' target="_blank" rel="noopener"' : ""}${lk.attr}>${lk.v}</a>`; })() : "";
    return `<div class="join-card reveal"><div class="aud-for"${t.attr}>${t.v}</div><p class="wwu-card-body"${b.attr}>${b.v}</p>${linkHtml}</div>`;
  }).join("");

  // cta
  const ctaLabel = field("教育・地域連携のご相談", "Education & community partnerships");
  const ctaLead = fieldJ("地域ビッグデータを活用した探究・アントレプレナーシップ教育や、お祭り・地域イベントのデータ分析について、お気軽にご相談ください。", "Feel free to reach out about inquiry and entrepreneurship education using regional big data, or data analysis of festivals and local events.");
  const ctaBtn = field("依頼・連携について →", "Work with us →");
  const mailBtn = field("メールで相談 →", "Email us →");

  return `<section class="matsuri-hero">
    <div class="hero-slides" id="heroSlides" aria-hidden="true">
      <div class="hero-slide active" style="background-image:url('/assets/matsuri-nebuta.jpg?v=${ASSET_VER}')"></div>
      <div class="hero-slide" style="background-image:url('/assets/matsuri-kanto.jpg?v=${ASSET_VER}')"></div>
      <div class="hero-slide" style="background-image:url('/assets/matsuri-sansa.jpg?v=${ASSET_VER}')"></div>
      <div class="hero-slide" style="background-image:url('/assets/matsuri-hanagasa.jpg?v=${ASSET_VER}')"></div>
      <div class="hero-slide" style="background-image:url('/assets/matsuri-tanabata.jpg?v=${ASSET_VER}')"></div>
      <div class="hero-slide" style="background-image:url('/assets/matsuri-waraji.jpg?v=${ASSET_VER}')"></div>
    </div>
    <div class="matsuri-hero-scrim"></div>
    <div class="wrap matsuri-hero-inner">
      <a class="crumb crumb-light" href="/"${back.attr}>${back.v}</a>
      <div class="sec-eyebrow"><span class="sec-num">—</span><span class="sec-kicker"${kicker.attr}>${kicker.v}</span></div>
      <h1 class="matsuri-hero-h"${title.attr}>${title.v}</h1>
      <p class="matsuri-hero-lead"${lead.attr}>${lead.v}</p>
    </div>
  </section>
  <section class="section"><div class="wrap">
    <div class="block-label"${ovLabel.attr}>${ovLabel.v}</div>
    <div class="hub-join-grid" style="margin-top:1rem">${ovHtml}</div>
  </div></section>
  <section class="section section-alt"><div class="wrap">
    <div class="block-label"${figLabel.attr}>${figLabel.v}</div>
    <p class="sec-lead reveal"${figLead.attr}>${figLead.v}</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.6rem;margin-top:1.2rem">${figsHtml}</div>
  </div></section>
  <section class="section"><div class="wrap">
    <div class="block-label"${vidLabel.attr}>${vidLabel.v}</div>
    <p class="sec-lead reveal"${vidLead.attr}>${vidLead.v}</p>
    <div class="video-frame reveal" style="margin-top:1.2rem">
      <div style="aspect-ratio:16/9;width:100%">
        <iframe style="display:block;width:100%;height:100%;border:0" src="https://www.youtube-nocookie.com/embed/GTa5T9xdcd8?rel=0" title="お祭り体験の動画" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
      </div>
      <div class="video-cap"><a class="video-cap-tx" href="https://youtu.be/GTa5T9xdcd8" target="_blank" rel="noopener"${vidCap.attr}>${vidCap.v}</a></div>
    </div>
  </div></section>
  <section class="section section-alt"><div class="wrap">
    <div class="block-label"${iLabel.attr}>${iLabel.v}</div>
    <div class="hub-join-grid" style="margin-top:1rem">${initHtml}</div>
  </div></section>
  <section class="section section-cta"><div class="wrap">
    <div class="block-label on-dark"${ctaLabel.attr}>${ctaLabel.v}</div>
    <p class="sec-lead"${ctaLead.attr}>${ctaLead.v}</p>
    <div class="hero-cta" style="margin-top:1.4rem">
      <a class="btn btn-accent" href="/work-with-us.html"${ctaBtn.attr}>${ctaBtn.v}</a>
      <a class="btn btn-ghost" href="mailto:${esc(mail)}?subject=${encodeURIComponent("【教育・地域連携のご相談】")}"${mailBtn.attr}>${mailBtn.v}</a>
    </div>
  </div></section>`;
}

/* /case-habit-business.html — habit-program support system (HIKARI) */
function caseHabitBusinessPageBody() {
  const mail = JA.access.mail;
  const back = field("← 習慣化デザインラボ", "← Habit Design Lab");
  const kicker = field("Case study", "Case study");
  const title = fieldJ("習慣化事業支援システム", "Habit-program support system");
  const lead = fieldJ("全国で展開される運動・健康増進の習慣化事業を対象に、AIで事例を分析し、地域の特性に合った事業デザインを支援するシステムを研究・開発しています。関連研究は情報処理学会DICOMO2025シンポジウムで優秀論文賞を受賞しました。", "A system, in research and development, that uses AI to analyze health-promotion habit programs nationwide and supports designing programs suited to each region. The related study won the Best Paper Award at the IPSJ DICOMO 2025 Symposium.");

  // overview
  const ovLabel = field("概要", "Overview");
  const ov = [
    ["課題", "Challenge", "自治体や企業が運動・健康増進の習慣化事業を企画・運営する際、地域の特性や各地の事例の知見を十分に活かしきれず、何が効くのかを見極めにくい。", "When local governments and companies run health-promotion habit programs, it's hard to apply regional characteristics and lessons from cases elsewhere, and to judge what actually works."],
    ["アプローチ", "Approach", "全国の習慣化事業の事例をAIで横断的に分析し、地域の特性に応じて事業をデザインするための示唆を提供するシステムを設計・開発。", "We design and build a system that uses AI to analyze habit-program cases across the country and offer guidance for designing programs suited to each region."],
    ["状態", "Status", "研究・開発中（プロトタイプ）。今後の実証を通じて有効性を検証していきます。", "In research and development (prototype). We will validate effectiveness through field studies."],
  ];
  const ovHtml = ov.map((o) => { const t = fieldJ(o[0], o[1]), b = fieldJ(o[2], o[3]); return `<div class="join-card reveal"><div class="aud-for"${t.attr}>${t.v}</div><p class="wwu-card-body"${b.attr}>${b.v}</p></div>`; }).join("");

  // features
  const fLabel = field("システムの特徴", "What the system does");
  const feats = [
    ["事例のAI分析", "AI case analysis", "各地の運動・健康増進事業を横断的に分析し、効果につながる要素や工夫を見える化。", "Analyzes programs across regions and surfaces what contributes to results."],
    ["地域特性に応じた提案", "Region-aware suggestions", "人口や環境などの地域特性をふまえ、その地域に合った事業の形を示す。", "Reflects regional characteristics to suggest a program that fits the area."],
    ["事業デザインの支援", "Program design support", "企画から運営までの設計を支援し、習慣化の視点を事業に組み込む。", "Supports design from planning to operation, embedding a habit-design perspective."],
  ];
  const featHtml = feats.map((f, i) => { const t = fieldJ(f[0], f[1]), d = fieldJ(f[2], f[3]); return `<div class="step-card reveal"><span class="step-n">${i + 1}</span><h4${t.attr}>${t.v}</h4><p${d.attr}>${d.v}</p></div>`; }).join("");

  // results + audiences
  const rLabel = field("成果", "Results");
  const rBody = fieldJ("関連研究「地域の運動・健康増進事例を活用した習慣化事業支援システム」は、情報処理学会DICOMO2025シンポジウムで優秀論文賞を受賞しました。", "The related study, “A habit-program support system using regional health-promotion cases,” won the Best Paper Award at the IPSJ DICOMO 2025 Symposium.");
  // peer-reviewed publication
  const pubLabel = field("関連論文", "Publication");
  const pubBody = fieldJ("太田 賢「大規模言語モデルを用いた健康習慣化事業の事例データ管理フレームワークの構築」情報処理学会論文誌, 67(1), pp.2–11, 2026年1月.", "Ken Ohta, “An LLM-based case-data management framework for health-habit programs,” IPSJ Journal, 67(1), pp.2–11, Jan. 2026.");
  const pubLink = field("論文情報を見る（researchmap）→", "View the paper (researchmap) →");
  // funding (JSPS KAKENHI)
  const fundLabel = field("助成", "Funding");
  const fundBody = fieldJ("本研究は JSPS 科研費 25K15355 の助成を受けたものです（研究代表者：太田 賢）。", "This work was supported by JSPS KAKENHI Grant Number 25K15355 (Principal Investigator: Ken Ohta).");
  const fundLink = field("KAKEN データベースで見る →", "View on the KAKEN database →");
  const audLabel = field("想定する活用先", "Who it's for");
  const auds = [["自治体の健康づくり事業", "Local-government health programs"], ["スポーツジム・フィットネス", "Gyms & fitness"], ["健康保険組合", "Health insurance unions"]];
  const audChips = auds.map((a) => { const f = field(a[0], a[1]); return `<span class="sci-tag"${f.attr}>${f.v}</span>`; }).join("");

  // cta
  const ctaLabel = field("共同研究・連携のご相談", "Joint research & partnerships");
  const ctaLead = fieldJ("習慣化事業の設計・運営や、地域の健康づくりに関する共同研究・実証のご相談をお受けしています。", "We take on joint research and field trials on designing and running habit programs and community health promotion.");
  const ctaBtn = field("依頼・連携について →", "Work with us →");
  const mailBtn = field("メールで相談 →", "Email us →");

  return `<section class="matsuri-hero">
    <div class="hero-slides" id="heroSlides" aria-hidden="true">
      <div class="hero-slide active" style="background-image:url('/assets/hikari-senior-exercise.jpg?v=${ASSET_VER}')"></div>
      <div class="hero-slide" style="background-image:url('/assets/hikari-gym.jpg?v=${ASSET_VER}')"></div>
      <div class="hero-slide" style="background-image:url('/assets/habit-business-system.png?v=${ASSET_VER}')"></div>
    </div>
    <div class="matsuri-hero-scrim"></div>
    <div class="wrap matsuri-hero-inner">
      <a class="crumb crumb-light" href="/"${back.attr}>${back.v}</a>
      <div class="sec-eyebrow"><span class="sec-num">—</span><span class="sec-kicker"${kicker.attr}>${kicker.v}</span></div>
      <h1 class="matsuri-hero-h"${title.attr}>${title.v}</h1>
      <p class="matsuri-hero-lead"${lead.attr}>${lead.v}</p>
    </div>
  </section>
  <section class="section"><div class="wrap">
    <div class="block-label"${ovLabel.attr}>${ovLabel.v}</div>
    <div class="hub-join-grid" style="margin-top:1rem">${ovHtml}</div>
  </div></section>
  <section class="section section-alt"><div class="wrap">
    <div class="block-label"${fLabel.attr}>${fLabel.v}</div>
    <div class="step-cards">${featHtml}</div>
  </div></section>
  <section class="section"><div class="wrap wrap-narrow">
    <div class="block-label"${rLabel.attr}>${rLabel.v}</div>
    <p class="sci-body" style="margin-top:.8rem"${rBody.attr}>${rBody.v}</p>
    <div class="block-label" style="margin-top:2.4rem"${pubLabel.attr}>${pubLabel.v}</div>
    <p class="sci-body" style="margin-top:.8rem"${pubBody.attr}>${pubBody.v}</p>
    <div class="more-row reveal" style="margin-top:.6rem"><a class="more-link" href="https://researchmap.jp/kenohta/published_papers/52129220" target="_blank" rel="noopener"${pubLink.attr}>${pubLink.v}</a></div>
    <div class="block-label" style="margin-top:2.4rem"${fundLabel.attr}>${fundLabel.v}</div>
    <p class="sci-body" style="margin-top:.8rem"${fundBody.attr}>${fundBody.v}</p>
    <div class="more-row reveal" style="margin-top:.6rem"><a class="more-link" href="https://kaken.nii.ac.jp/ja/grant/KAKENHI-PROJECT-25K15355/" target="_blank" rel="noopener"${fundLink.attr}>${fundLink.v}</a></div>
    <div class="block-label" style="margin-top:2.4rem"${audLabel.attr}>${audLabel.v}</div>
    <div class="sci-tags" style="margin-top:1rem">${audChips}</div>
  </div></section>
  <section class="section section-cta"><div class="wrap">
    <div class="block-label on-dark"${ctaLabel.attr}>${ctaLabel.v}</div>
    <p class="sec-lead"${ctaLead.attr}>${ctaLead.v}</p>
    <div class="hero-cta" style="margin-top:1.4rem">
      <a class="btn btn-accent" href="/work-with-us.html"${ctaBtn.attr}>${ctaBtn.v}</a>
      <a class="btn btn-ghost" href="mailto:${esc(mail)}?subject=${encodeURIComponent("【共同研究・連携のご相談】")}"${mailBtn.attr}>${mailBtn.v}</a>
    </div>
  </div></section>`;
}

/* ---- COLUMN (コラム) — short, public-facing habit essays ----------------
   コラムの唯一の正準ソースはこの COLUMN 配列。HTML（column/*.html）は再生成物なので
   直接編集・直接追加しないこと（再生成で消えて孤立する）。

   ■ 追加手順（1記事）
     1) 下の配列に1エントリ追加（JA/EN両方を必ず埋める。EN欠落はEN切替で日本語が残る）:
          {
            slug: "english-kebab-case",   // = 公開URL /column/<slug>.html。後から変えない
            date: "YYYY-MM-DD",           // 公開日。配列の並び順が索引の表示順（新しい順推奨）
            title: ["和文タイトル", "English title"],
            lead:  ["和文リード1文", "English lead"],
            tags:  [["和文タグ", "EN tag"], ["和文タグ", "EN tag"]],
            paras: [ ["和文段落", "EN paragraph"], ... ],   // 段落数は自由
            noteUrl: "https://note.com/ohta_ken/n/xxxx",   // 任意。note連載記事の要約コラムのとき
          }
     ※ noteUrl を入れると記事末尾に「noteで全文を読む →」が出る。媒体分担の原則は
        「noteに全文、サイトは要約＋リンク」（Projects/ASOBI の note戦略）。二重執筆はしない。
     2) site/ で `node _src/build.js` を実行 → column.html・column/<slug>.html・sitemap を自動再生成
     3) git add -A && commit && push（mainへpush＝公開）
   ■ 編集: 該当エントリを書き換えて 2)→3)。 ■ 削除: エントリを消し、column/<slug>.html も削除して 2)→3)。
   ※ ビルド末尾の「孤立コラム検知ガード」が、配列に無い column/*.html を警告する。 */
const COLUMN = [
  {
    slug: "three-day-monk", date: "2026-07-14",
    noteUrl: "https://note.com/ohta_ken/n/nde62833c7406",
    title: ["習慣の研究者なのに、三日坊主です", "A habit researcher who keeps quitting"],
    lead: ["noteで連載「続く仕組みの実験ノート」を始めました。第1回は、私自身の失敗の話です。", "I've started a note series, “Field notes on what makes habits stick.” The first piece is about my own failures."],
    tags: [["note連載", "note series"], ["習慣の科学", "Science"]],
    paras: [
      ["白状すると、習慣化を研究していながら、ダイエットには何度も挫折しています。その一方で、ウォーキングは3年間ほぼ毎日続いています。同じ人間なのに、なぜこれほど差が出るのでしょうか。", "I'll confess: I study habits for a living, yet I've failed at dieting again and again. Meanwhile, I've walked nearly every day for three years. Same person — so why the gap?"],
      ["違いは意志ではなく、状況との結びつきでした。歩くことには、きっかけも、ごほうびも、続けた証拠も生活に埋め込まれています。一方でダイエットは二重に不利でした。始めたい行動（自炊、間食を替える）には引き金がなく、やめたい行動（深夜のラーメン）にはすでに引き金がある。私は、引き金のない行動を毎回わざわざ起こしながら、引き金のある行動を意識で止めようとしていたのです。", "The difference wasn't willpower — it was how each behavior is tied to a situation. Walking has its cue, its reward, and its record built into my day. Dieting was doubly disadvantaged: the behaviors I wanted to start (cooking, swapping snacks) had no cue, while the ones I wanted to stop (late-night ramen) already had one. I was manually starting cue-less behaviors while trying to consciously stop cued ones."],
      ["この連載では、巷の習慣術を研究で確かめ、自分と学生の実践を記録し、今日から使える仕組みを設計していきます。効かなかった方法も、続かなかった話も、そのまま書きます。全文はnoteでどうぞ。", "In this series I'll test popular habit advice against research, log what my students and I actually try, and design systems you can use today. I'll write up the methods that didn't work and the streaks that broke, too. The full piece is on note."],
    ],
  },
  {
    slug: "design-your-environment", date: "2026-06-23",
    title: ["環境を変えれば、行動は変わる", "Change your environment, and behavior follows"],
    lead: ["頑張るより、頑張らなくてすむ仕組みをつくる。", "Instead of trying harder, build a setup where you don't have to."],
    tags: [["環境デザイン", "Environment design"], ["行動変容", "Behavior change"]],
    paras: [
      ["同じ人でも、置かれた環境が変われば行動は変わります。机の上にお菓子があれば食べ、見えない場所にしまえば手が伸びにくくなる。私たちは思っているより、環境に動かされています。", "The same person behaves differently as their surroundings change. Sweets on the desk get eaten; tucked out of sight, they're harder to reach. We're moved by our environment more than we think."],
      ["だから習慣を変えたいときは、まず環境を整えます。やりたい行動は「摩擦」を減らす。運動するなら、前の晩にウェアを出しておく。やめたい行動は「摩擦」を増やす。スマホを別の部屋で充電する。たったこれだけで、必要な意志の量が変わります。", "So when you want to change a habit, start with the environment. For actions you want, cut the friction — lay out your workout clothes the night before. For actions you want to drop, add friction — charge your phone in another room. That alone changes how much willpower you need."],
      ["この考え方は、選択をそっと後押しする「選択アーキテクチャ（ナッジ）」として、自治体や企業の健康づくりにも使われています。階段に一言そえる、申し込みを初期設定にする。強制ではなく、自然と良い方へ進む流れをつくる工夫です。", "This idea — gently steering choices, known as choice architecture (nudges) — is used in health promotion by governments and companies: a word posted on the stairs, making enrollment the default. Not coercion, but designing a flow that naturally leads the better way."],
      ["自分を変えようとして続かないときは、いっそ環境のせいにしてみてください。意志を責めるより、明日の自分が動きやすいように、今日の環境をひとつ変える。それが習慣化デザインの出発点です。", "When changing yourself won't stick, try blaming the environment instead. Rather than faulting your willpower, change one thing in today's environment so tomorrow's self can act more easily. That's the starting point of habit design."],
    ],
  },
  {
    slug: "bounce-back", date: "2026-06-06",
    title: ["つまずいた日が、習慣の分かれ道", "A missed day is where habits are decided"],
    lead: ["一度の失敗でやめてしまうのは、もったいない。", "Quitting after a single slip is a waste."],
    tags: [["継続のコツ", "Staying consistent"], ["セルフケア", "Self-care"]],
    paras: [
      ["順調に続いていた習慣も、出張や体調不良、忙しさで途切れる日が必ず来ます。大事なのはその一日ではなく、その次にどうするかです。", "Even a habit that's going well will break someday — a work trip, getting sick, a busy stretch. What matters isn't that one day, but what you do next."],
      ["研究では、一度サボったこと自体は長期の継続にほとんど影響しないことがわかっています。続かなくなる本当の原因は、「もうダメだ」と自分を責めて、二日、三日と離れてしまうことです。完璧主義が、かえって習慣を遠ざけます。", "Research shows a single missed day has almost no effect on long-term consistency. What really derails people is blaming themselves — “I've blown it” — and drifting away for two days, then three. Perfectionism is what pushes the habit away."],
      ["役に立つのは、失敗を前提に「戻り方」を先に決めておくことです。「できなかった翌日は、半分の量だけやる」。ハードルを下げた再開ルールがあると、罪悪感に立ち止まらずに復帰できます。", "What helps is deciding your way back in advance, assuming you'll slip. “The day after I miss, I do just half.” A low-bar restart rule lets you return without getting stuck in guilt."],
      ["もうひとつは、自分にやさしくする姿勢（セルフコンパッション）です。できなかった日を責めるより、「また始めればいい」と扱える人ほど、結果として長く続きます。つまずきは失敗ではなく、習慣の一部です。", "The other piece is treating yourself kindly (self-compassion). People who can say “I'll just start again,” rather than punishing a missed day, last longer in the end. A stumble isn't failure — it's part of the habit."],
    ],
  },
  {
    slug: "habit-is-a-system", date: "2026-06-05",
    title: ["習慣は意志ではなく「仕組み」でつくる", "Habits are built with systems, not willpower"],
    lead: ["続かないのは、意志が弱いからではありません。続く人は、続く仕組みを持っています。", "It isn't weak willpower. People who keep going have systems that keep them going."],
    tags: [["習慣の科学", "Science"], ["仕組み", "Systems"]],
    paras: [
      ["新しい習慣を始めても続かないとき、私たちはつい「自分の意志が弱いせいだ」と考えがちです。でも行動科学が示すのは、少し違う見方です。続く人は強い意志を持っているのではなく、続く「仕組み」を持っています。", "When a new habit doesn't stick, we tend to blame weak willpower. Behavioral science suggests another view: people who keep going don't have stronger willpower — they have better systems."],
      ["習慣は「きっかけ→行動→報酬」というループでできています。そして、その行動を自動的に引き出すのが、時間・場所・直前の行動といった文脈（context cue）です。同じ文脈で同じ行動を繰り返すほど、行動は意識しなくても起きるようになります。", "Habits run on a cue→routine→reward loop. What triggers the action automatically is context — time, place, the preceding action. Repeat the same action in the same context, and it starts to happen without conscious effort."],
      ["だから、意志を鍛えるより環境と段取りを整える方が効きます。すでにある習慣に新しい行動を重ねる（朝コーヒーを淹れたらストレッチ）、「〇〇したら△△する」と前もって決めておく（実行意図・IF-THEN）、誘惑は遠ざけ、やりたい行動はやりやすくする。小さな設計の積み重ねが、続ける力になります。", "So shaping your environment and plans beats trying to muscle through. Stack a new action onto an existing one, decide “if X, then Y” in advance (implementation intentions), keep temptations away and make the good action easy. Small design choices add up to staying power."],
      ["「マイプラス10」のIF-THENプラン・ビルダーは、この考え方をそのまま使えるようにしたものです。まずは小さな仕組みを一つ、試してみてください。", "The IF-THEN plan builder in #MyPlus10 puts this into practice. Try setting up one small system to start."],
    ],
  },
  {
    slug: "start-small", date: "2026-06-05",
    title: ["小さく始めるほど、続く", "The smaller you start, the longer you last"],
    lead: ["ハードルを下げることは、妥協ではなく戦略です。", "Lowering the bar isn't compromise — it's strategy."],
    tags: [["はじめ方", "Getting started"], ["#マイプラス10", "#MyPlus10"]],
    paras: [
      ["習慣化でよくある失敗は、最初から高い目標を立てて、数日で息切れすることです。やる気が高いときほど、私たちは無理な計画を立ててしまいます。", "A common failure is setting a big goal and burning out in days. The more motivated we feel, the more we tend to overcommit."],
      ["続けるコツは逆です。「これなら必ずできる」というくらい小さくする。厚生労働省も、今より10分多く体を動かす「＋10（プラス・テン）」を勧めています。10分の散歩でも、ひと駅手前で降りて歩くのでも構いません。それで十分なスタートです。", "The trick is the opposite: make it so small you can't fail. Japan's MHLW recommends “+10” — moving 10 minutes more than today. A 10-minute walk, or getting off one stop early, is a fine start."],
      ["小さく始める利点は、実行のハードルが低いことだけではありません。「できた」という小さな成功が積み重なり、自分は続けられるという感覚（自己効力感）が育ちます。これが次の一歩を後押しします。", "Starting small isn't just easier. Small wins build a sense that you can keep going (self-efficacy), and that pushes the next step."],
      ["「マイプラス10」は、この「小さく始めて、続ける」を支えるために作りました。今日の＋10から、気軽に始めてみてください。", "We built #MyPlus10 to support exactly this — start small, then keep going. Begin with today's +10."],
    ],
  },
  {
    slug: "if-then-planning", date: "2026-05-22",
    title: ["「いつ・どこで」を決めると、習慣は続く", "Decide when and where, and the habit sticks"],
    lead: ["やる気よりも、きっかけを先に決めておく。", "Set the cue before the motivation."],
    tags: [["きっかけ設計", "Cue design"], ["行動変容", "Behavior change"]],
    paras: [
      ["「時間ができたら運動しよう」と思っていても、その時間はなかなか訪れません。私たちの一日は、小さな判断の連続です。「いつやるか」をその場で考えているうちは、たいてい後回しになります。", "“I'll exercise when I have time” — but that time rarely comes. Our days are a chain of small decisions, and as long as you decide “when” on the spot, it usually gets put off."],
      ["心理学では、「Xになったら、Yをする」という形であらかじめ決めておく方法を実行意図（if-thenプランニング）と呼びます。たとえば「朝、歯をみがいたら、その場で1分間スクワットをする」。きっかけ（いつ・どこで）と行動をセットにしておくと、迷う前に体が動きます。", "In psychology, deciding in advance in the form “when X happens, I'll do Y” is called an implementation intention (if-then planning). For example, “after I brush my teeth in the morning, I do one minute of squats right there.” Pair a cue (when and where) with the action, and your body moves before you hesitate."],
      ["コツは、すでにある習慣を「きっかけ」に使うことです。歯みがき、コーヒー、通勤の電車。毎日必ず起きていることに新しい行動を接ぎ木すると、思い出すための努力がいりません。意志の力ではなく、日常の流れに乗せる発想です。", "The trick is to use an existing habit as the cue. Brushing your teeth, coffee, the commuter train. Graft a new action onto something that happens every day, and you need no effort to remember it. It rides the flow of daily life rather than relying on willpower."],
      ["まずはひとつだけ、「いつ・どこで・何を」を紙に書き出してみてください。あいまいな目標を具体的な場面に変えるだけで、続く確率は大きく変わります。", "Start by writing down just one “when, where, what.” Simply turning a vague goal into a concrete situation changes the odds it sticks dramatically."],
    ],
  },
];
function columnCard(a) {
  const t = fieldJ(a.title[0], a.title[1]), l = fieldJ(a.lead[0], a.lead[1]);
  return `<a class="col-card reveal" href="/column/${a.slug}.html">
    <div class="col-date">${esc(a.date)}</div>
    <h3${t.attr}>${t.v}</h3>
    <p${l.attr}>${l.v}</p>
    <span class="col-go" aria-hidden="true">読む →</span>
  </a>`;
}
function columnIndexPageBody() {
  const back = field("← 習慣化デザインラボ", "← Habit Design Lab");
  const kicker = field("Column", "Column");
  const title = fieldJ("コラム", "Column");
  const lead = fieldJ("習慣化や行動変容について、研究の知見をやさしくお伝えします。日々の実践のヒントにどうぞ。", "Easy-to-read notes on habits and behavior change, grounded in research — for your everyday practice.");
  const cards = COLUMN.map(columnCard).join("");
  return `<section class="page-hero"><div class="wrap wrap-narrow">
    <a class="crumb" href="/"${back.attr}>${back.v}</a>
    <div class="sec-eyebrow"><span class="sec-num">—</span><span class="sec-kicker"${kicker.attr}>${kicker.v}</span></div>
    <h1 class="page-h"${title.attr}>${title.v}</h1>
    <p class="page-lead"${lead.attr}>${lead.v}</p>
  </div></section>
  <section class="section"><div class="wrap wrap-narrow"><div class="col-list">${cards}</div></div></section>`;
}
function columnArticleBody(a) {
  const back = field("← コラム一覧", "← All columns");
  const kicker = field("Column", "Column");
  const t = fieldJ(a.title[0], a.title[1]), l = fieldJ(a.lead[0], a.lead[1]);
  const tagHtml = a.tags.map((tg) => { const f = field(tg[0], tg[1]); return `<span class="sci-tag"${f.attr}>${f.v}</span>`; }).join("");
  const paras = a.paras.map((p) => { const f = fieldJ(p[0], p[1]); return `<p class="sci-body"${f.attr}>${f.v}</p>`; }).join("");
  const tryLabel = field("#マイプラス10で実践する →", "Try it in #MyPlus10 →");
  const sciLabel = field("習慣化の科学を読む →", "Read the science →");
  /* note連載の要約コラムは、全文へ送るリンクを先頭に置く（noteに全文、サイトは要約＋リンク） */
  let noteHtml = "";
  if (a.noteUrl) {
    const noteLabel = field("noteで全文を読む →", "Read the full piece on note →");
    noteHtml = `<a class="more-link" href="${esc(a.noteUrl)}" target="_blank" rel="noopener"${noteLabel.attr}>${noteLabel.v}</a>`;
  }
  return `<section class="page-hero"><div class="wrap wrap-narrow">
    <a class="crumb" href="/column.html"${back.attr}>${back.v}</a>
    <div class="sec-eyebrow"><span class="sec-num">—</span><span class="sec-kicker"${kicker.attr}>${kicker.v}</span></div>
    <div class="col-date">${esc(a.date)}</div>
    <h1 class="page-h"${t.attr}>${t.v}</h1>
    <p class="page-lead"${l.attr}>${l.v}</p>
    <div class="sci-tags" style="margin-top:1rem">${tagHtml}</div>
  </div></section>
  <section class="section"><div class="wrap wrap-narrow col-body">${paras}
    <div class="more-row reveal" style="margin-top:2rem;display:flex;flex-wrap:wrap;gap:1rem 1.6rem">
      ${noteHtml}
      <a class="more-link" href="/myplus10.html#tracker"${tryLabel.attr}>${tryLabel.v}</a>
      <a class="more-link" href="/science.html"${sciLabel.attr}>${sciLabel.v}</a>
    </div>
  </div></section>`;
}

/* /privacy.html — privacy policy incl. analytics & external-transmission disclosure */
function privacyPageBody() {
  const mail = JA.access.mail;
  const back = field("← 習慣化デザインラボ", "← Habit Design Lab");
  const kicker = field("Privacy", "Privacy");
  const title = fieldJ("プライバシーポリシー", "Privacy policy");
  const lead = fieldJ("習慣化デザインラボ（宮城大学 太田賢研究室）が運営する本サイト（habitdesign.site）における、アクセス情報の取り扱いについて説明します。", "How this site (habitdesign.site), operated by the Habit Design Lab (Ohta Lab, Miyagi University), handles access information.");
  const groups = [
    { h: "アクセス解析について", hEn: "Analytics", items: [
      ["本サイトは、利用状況の把握とサイト改善のため、Google LLC が提供するアクセス解析ツール「Google アナリティクス（GA4）」を使用しています。", "We use Google Analytics (GA4) by Google LLC to understand usage and improve the site."],
      ["GA4 は Cookie 等を用いて、閲覧ページ・リンク元・デバイスやブラウザの種類・おおよその地域などの情報を収集します。これらは統計的に処理され、個人を特定する情報は含みません。IP アドレスの匿名化を有効にしています。", "GA4 uses cookies to collect pages viewed, referrer, device/browser type and approximate region. Data is aggregated and does not identify individuals; IP anonymization is enabled."],
    ] },
    { h: "外部送信について", hEn: "External transmission", items: [
      ["上記の情報は、解析のため Google LLC のサーバーへ送信されます。Google における取り扱いは、Google のプライバシーポリシーおよび利用規約に従います。", "The above information is sent to Google LLC for analysis, handled per Google's privacy policy and terms."],
    ] },
    { h: "オプトアウト（収集の停止）", hEn: "Opt-out", items: [
      ["「Google アナリティクス オプトアウト アドオン」の利用や、ブラウザの設定で Cookie を無効にすることで、収集を停止できます。", "You can opt out via the Google Analytics Opt-out Browser Add-on or by disabling cookies in your browser."],
    ] },
  ];
  const groupHtml = groups.map((g) => {
    const lab = field(g.h, g.hEn);
    const lis = g.items.map((it) => { const f = fieldJ(it[0], it[1]); return `<li${f.attr}>${f.v}</li>`; }).join("");
    return `<div class="prof-block reveal"><div class="block-label"${lab.attr}>${lab.v}</div><ul class="ref-list">${lis}</ul></div>`;
  }).join("");
  const linksLabel = field("関連リンク", "Links");
  const l1 = field("Google プライバシーポリシー →", "Google Privacy Policy →");
  const l2 = field("Google アナリティクス オプトアウト アドオン →", "GA Opt-out Add-on →");
  const contactLabel = field("お問い合わせ", "Contact");
  const contactBody = fieldJ("本ポリシーに関するお問い合わせは、メールにてお願いします。", "For questions about this policy, please email us.");
  const upd = fieldJ("制定日：2026-06-05", "Effective: 2026-06-05");
  return `<section class="page-hero"><div class="wrap wrap-narrow">
    <a class="crumb" href="/"${back.attr}>${back.v}</a>
    <div class="sec-eyebrow"><span class="sec-num">—</span><span class="sec-kicker"${kicker.attr}>${kicker.v}</span></div>
    <h1 class="page-h"${title.attr}>${title.v}</h1>
    <p class="page-lead"${lead.attr}>${lead.v}</p>
  </div></section>
  <section class="section"><div class="wrap wrap-narrow prof-blocks">${groupHtml}
    <div class="prof-block reveal">
      <div class="block-label"${linksLabel.attr}>${linksLabel.v}</div>
      <ul class="ref-list">
        <li><a class="ai-link" href="https://policies.google.com/privacy" target="_blank" rel="noopener"${l1.attr}>${l1.v}</a></li>
        <li><a class="ai-link" href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener"${l2.attr}>${l2.v}</a></li>
      </ul>
    </div>
    <div class="prof-block reveal">
      <div class="block-label"${contactLabel.attr}>${contactLabel.v}</div>
      <p class="sci-body"${contactBody.attr}>${contactBody.v}</p>
      <p class="fineprint"><a class="ai-link" href="mailto:${esc(mail)}">${esc(mail)}</a></p>
      <p class="fineprint"${upd.attr}>${upd.v}</p>
    </div>
  </div></section>`;
}

function hubActivities() {
  const kicker = field("Activities", "Activities");
  const title = fieldJ("習慣化デザインの活動", "Our activities");
  const lead = fieldJ("研究室での研究・教育から、地域・社会人向けの実践まで。習慣化デザインに関わる取り組みを紹介します。", "From lab research and education to community and adult-learning practice — the activities behind habit design.");
  const acts = [
    { tag: "研究・教育", tagEn: "Research / Edu", title: "太田賢研究室", body: "AI とデザインで習慣を研究する宮城大学の研究室。研究テーマ・学生の研究・配属案内はこちら。", bodyEn: "The Miyagi University lab researching habits with AI and design. Themes, student work and admissions.", href: "/ohtalab/", link: "研究室サイトへ", linkEn: "Visit the lab site", ext: false },
    { tag: "事業支援 / AI", tagEn: "Business support / AI", title: "習慣化事業支援システム", body: "全国で展開される運動・健康増進の習慣化事業を対象に、AIで事例を分析し、地域の特性に合った事業デザインを支援するシステムを研究・開発しています。関連研究は情報処理学会DICOMO2025シンポジウムで優秀論文賞を受賞しました。", bodyEn: "A system, in research and development, that uses AI to analyze health-promotion habit programs nationwide and supports designing programs suited to each region. The related study won the Best Paper Award at the IPSJ DICOMO 2025 Symposium.", href: "/case-habit-business.html", link: "くわしく見る", linkEn: "Learn more", ext: false },
    { tag: "リカレント教育 / 自治体連携", tagEn: "Recurrent edu / Gov", title: "DDX学習支援システム", body: "宮城大学（宮城県受託事業）による社会人向け DX 人材育成プログラム「Downstream から学ぶ DX」に、科目推薦チャットボットを含む学習支援システムを構築・提供。学びの習慣化を支援しています。", bodyEn: "For “Learning DX from Downstream,” a DX reskilling program for working adults run by Miyagi University (commissioned by Miyagi Prefecture), we built and provided a learning-support system including a course-recommendation chatbot, supporting study habits.", href: "https://myuddx.jp", link: "MYU DDX へ", linkEn: "Go to MYU DDX", ext: true },
    { tag: "地域・まちづくり", tagEn: "Community", title: "泉パークタウン共創", body: "三菱地所グループ（泉パークタウンサービス）と連携し、地域コミュニティの活性化や住民の行動・習慣づくりをデータとデジタルで支援。共創ミーティングや、デジタル回覧板アプリ「まちひろば」などに取り組んでいます。", bodyEn: "With Mitsubishi Estate Group (Izumi Park Town Service), supporting community vitality and residents' habits through data and digital tools — co-creation meetings and the “Machihiroba” digital bulletin app.", href: "/case-izumi.html", link: "くわしく見る", linkEn: "Learn more", ext: false },
    { tag: "実践 / 自治体連携", tagEn: "Practice / Gov", title: "#マイプラス10", body: "ウォーキングなど「プラス10」の小さな行動から始める習慣づくり。AIチャットボットが目標設定とプラン作りを支援します。福井県のウォーキング事業「はぴウォーク2024」でも活用されました。", bodyEn: "Habit-building from a small “plus 10” — walking and more, with an AI chatbot that helps set goals and plans. Used in Fukui Prefecture's “Happy Walk 2024” program.", href: "/myplus10.html", link: "くわしく見る", linkEn: "Learn more", ext: false },
    { tag: "共同研究", tagEn: "Joint research", title: "運動習慣化アプリの共同研究", body: "習慣化を専門とする習慣化コンサルティング株式会社と、運動習慣化を支援するアプリを共同研究。IF-THENプラン最適化の手法を開発し、情報処理学会論文誌（CDS, 2025）に査読付き論文として発表しました。", bodyEn: "Joint research with Shukanka Consulting (a habit-focused company) on an app supporting exercise habits. We developed an IF-THEN plan-optimization method, published as a peer-reviewed paper (IPSJ TCDS, 2025).", href: "/case-walking-app.html", link: "くわしく見る", linkEn: "Learn more", ext: false },
    { tag: "地域・データ活用", tagEn: "Data / Community", title: "祭りデザインラボ", body: "地域のお祭りを人流ビッグデータ（モバイル空間統計）で分析し、課題解決と価値創造を考える取り組み。高校生向けの探究・アントレプレナーシップ教育の教材としても活用されています。", bodyEn: "Analyzing local festivals with population big data (Mobile Spatial Statistics) to explore problem-solving and value creation — also used as teaching material for high-school inquiry and entrepreneurship programs.", href: "/case-matsuri.html", link: "くわしく見る", linkEn: "Learn more", ext: false },
  ];
  const cards = acts.map((a) => {
    const tg = field(a.tag, a.tagEn), bd = fieldJ(a.body, a.bodyEn);
    let linkHtml = "";
    if (a.href) { const lk = field(a.link + " →", a.linkEn + " →"); linkHtml = `<a class="more-link" href="${esc(a.href)}"${a.ext ? ' target="_blank" rel="noopener"' : ""}${lk.attr}>${lk.v}</a>`; }
    else if (a.link) { const lk = field(a.link, a.linkEn); linkHtml = `<span class="more-link more-link-muted"${lk.attr}>${lk.v}</span>`; }
    return `<div class="project reveal"><span class="tag tag-accent"${tg.attr}>${tg.v}</span><h3>${esc(a.title)}</h3><p${bd.attr}>${bd.v}</p>${linkHtml}</div>`;
  }).join("");
  return `<section id="activities" class="section">
  <div class="wrap">
    <header class="sec-head"><div class="sec-eyebrow"><span class="sec-num">03</span><span class="sec-kicker"${kicker.attr}>${kicker.v}</span></div>
      <h2 class="sec-title reveal"${title.attr}>${title.v}</h2>
      <p class="sec-lead reveal"${lead.attr}>${lead.v}</p></header>
    <div class="projects">${cards}</div>
  </div>
</section>`;
}

function hubContact() {
  const mail = JA.access.mail;
  const kicker = field("Work with us", "Work with us");
  const title = fieldJ("依頼・連携のご相談", "Work with us");
  const lead = fieldJ("取材・登壇・共同研究・監修など、習慣化デザインに関するご相談をお受けしています。下のご依頼内容を選ぶと、件名入りのメールが開きます。学生の見学・配属のご相談もどうぞ。", "We welcome inquiries about press, talks, joint research and advisory work in habit design. Pick a topic below to open a pre-filled email. Student visits and admissions are welcome too.");
  const cards = [
    { t: "取材・コメント・寄稿", tEn: "Press & writing", b: "メディア取材、専門家コメント、記事の寄稿・監修。", bEn: "Press interviews, expert comments, articles and editorial supervision.", subj: "取材・寄稿のご相談", lk: "メールで相談", lkEn: "Email us" },
    { t: "登壇・講演", tEn: "Talks & lectures", b: "企業・自治体・学会向けの講演（習慣化／AIと行動変容／DX・リスキリング）。", bEn: "Talks for companies, governments and academia (habits / AI & behavior change / DX & reskilling).", subj: "講演・登壇のご相談", lk: "メールで相談", lkEn: "Email us" },
    { t: "共同研究・産学連携", tEn: "Joint research", b: "行動変容・ヘルスケア・地域連携の共同研究や実証実験。", bEn: "Joint research and field trials in behavior change, healthcare and community work.", subj: "共同研究・連携のご相談", lk: "メールで相談", lkEn: "Email us" },
    { t: "監修・アドバイザリー・執筆", tEn: "Advisory & authoring", b: "サービス・事業の監修、アドバイザリー、執筆のご相談。", bEn: "Advisory, supervision and authoring for services and projects.", subj: "監修・執筆のご相談", lk: "メールで相談", lkEn: "Email us" },
    { t: "学生の方へ", tEn: "For students", b: "研究室の見学・配属など、お気軽にご相談ください。", bEn: "Feel free to ask about visiting the lab and admissions.", href: "/ohtalab/admissions.html", lk: "配属案内を見る", lkEn: "See admissions" },
  ];
  const items = cards.map((c) => {
    const t = fieldJ(c.t, c.tEn), b = fieldJ(c.b, c.bEn), lk = field(c.lk + " →", c.lkEn + " →");
    const href = c.href ? c.href : `mailto:${mail}?subject=${encodeURIComponent("【" + c.subj + "】")}`;
    return `<div class="join-card reveal"><div class="aud-for"${t.attr}>${t.v}</div><p style="color:var(--muted);font-size:.9rem;line-height:1.7;margin:.5rem 0 1.1rem"${b.attr}>${b.v}</p><a class="more-link" href="${esc(href)}"${lk.attr}>${lk.v}</a></div>`;
  }).join("");
  const proof = fieldJ("登壇実績：情報処理学会DICOMO2025シンポジウム 招待講演、NTTドコモ東北支社、仙台金融経済懇話会 ほか／連携：三菱地所グループ・NTT東日本・NTTドコモ・インテック・福井県。", "Talks: invited lecture at IPSJ DICOMO 2025 Symposium, NTT Docomo Tohoku, and more. Partners: Mitsubishi Estate Group, NTT East, NTT Docomo, INTEC, Fukui Prefecture.");
  const wwuLink = field("依頼・連携の詳細と進め方を見る →", "See how to work with us →");
  const mailRow = field("メール：", "Email: ");
  return `<section id="contact" class="section section-alt">
  <div class="wrap">
    <header class="sec-head"><div class="sec-eyebrow"><span class="sec-num">05</span><span class="sec-kicker"${kicker.attr}>${kicker.v}</span></div>
      <h2 class="sec-title reveal"${title.attr}>${title.v}</h2>
      <p class="sec-lead reveal"${lead.attr}>${lead.v}</p></header>
    <div class="hub-join-grid">${items}</div>
    <div class="more-row reveal" style="margin-top:1.4rem"><a class="more-link" href="/work-with-us.html"${wwuLink.attr}>${wwuLink.v}</a></div>
    <p class="contact-proof reveal"${proof.attr}>${proof.v}</p>
    <p class="fineprint reveal"><span${mailRow.attr}>${mailRow.v}</span><a class="ai-link" href="mailto:${esc(mail)}">${esc(mail)}</a></p>
  </div>
</section>`;
}

/* "今日の習慣" band — year progress grid + countdown + daily quote + daily plus-10 (all client-side, date-driven) */
function todayBand() {
  const labYear = field("今年の歩み", "This year");
  const labToday = field("今日のひとこと", "Today");
  const labP10 = field("今日のプラス10", "Today's plus 10");
  return `<section class="section today-band">
  <div class="wrap today-grid">
    <div class="today-card">
      <div class="block-label"${labYear.attr}>${labYear.v}</div>
      <div class="year-grid" id="yearGrid" aria-hidden="true"></div>
      <p class="year-count" id="yearCountdown"></p>
    </div>
    <div class="today-card">
      <div class="block-label"${labToday.attr}>${labToday.v}</div>
      <blockquote class="daily-quote"><p id="dailyQuote"></p><cite id="dailyQuoteSrc"></cite></blockquote>
      <div class="daily-plus10"><span class="dp-label"${labP10.attr}>${labP10.v}</span><p id="dailyPlus10"></p></div>
    </div>
  </div>
</section>`;
}

function hubBody() {
  return [hubHero(), hubProofBar(), hubNews(), noteBand(), todayBand(), hubAbout(), hubScience(), hubActivities(), hubContact()].join("\n");
}

/* ---- page wrapper ---------------------------------------------------- */
const FONTS ="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700;900&family=Schibsted+Grotesk:wght@400..900&family=Space+Mono:wght@400;700&display=swap";

/* GA4 measurement ID — set to "G-XXXXXXXXXX" to enable analytics (empty = off) */
const GA_ID = "G-S73V4YS9JN";
function gaSnippet() {
  if (!GA_ID) return "";
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}',{anonymize_ip:true});</script>`;
}
function page({ title, desc, bodyHtml, navHtml, footerHtml, canonical = "https://habitdesign.site/", ogImage = "https://habitdesign.site/assets/lab-atmosphere.jpg", jsonld = null, crumbName = null }) {
  const ROOT = "https://habitdesign.site/";
  const ORG_ID = ROOT + "#org";
  const lds = [];
  if (canonical === ROOT) {
    lds.push({ "@context": "https://schema.org", "@type": "Organization", "@id": ORG_ID, name: "習慣化デザインラボ（宮城大学 太田賢研究室）", alternateName: "Habit Design Lab", url: ROOT, logo: ROOT + "favicon.svg", parentOrganization: { "@type": "CollegeOrUniversity", name: "宮城大学" }, founder: { "@type": "Person", name: "太田 賢" }, sameAs: ["https://researchmap.jp/kenohta"] });
    lds.push({ "@context": "https://schema.org", "@type": "WebSite", url: ROOT, name: "習慣化デザインラボ", inLanguage: "ja", publisher: { "@id": ORG_ID } });
  } else {
    lds.push({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "習慣化デザインラボ", item: ROOT },
      { "@type": "ListItem", position: 2, name: crumbName || title, item: canonical },
    ] });
  }
  if (jsonld) { Array.isArray(jsonld) ? lds.push(...jsonld) : lds.push(jsonld); }
  const ldHtml = lds.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`).join("\n");
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="google-site-verification" content="FWq47sLbMTvmD9tqSY7UFsn8VSDOClo7nM-zlh6tIaE">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${gaSnippet()}
${ldHtml}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="ja_JP">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${esc(canonical)}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg?v=${ASSET_VER}">
<link rel="alternate icon" href="/favicon.ico?v=${ASSET_VER}" sizes="any">
<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=${ASSET_VER}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet">
<link rel="stylesheet" href="/css/site.css?v=${ASSET_VER}">
</head>
<body>
<div class="app" id="top" data-scheme="light" data-font="zen">
${navHtml}
<main>
${bodyHtml}
</main>
${footerHtml}
<button class="back-to-top" id="backToTop" type="button" aria-label="ページの先頭へ戻る"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 14l6-6 6 6"/></svg></button>
</div>
<script src="/js/i18n.js?v=${ASSET_VER}"></script>
<script src="/js/daily.js?v=${ASSET_VER}"></script>
<script src="/js/site.js?v=${ASSET_VER}"></script>
</body>
</html>`;
}

/* ---- build ----------------------------------------------------------- */
/* Hub (root) — general-audience 習慣化デザイン portal */
const labFooter = footer();
const home = page({
  title: "太田賢研究室 — 習慣化デザインラボ",
  desc: "宮城大学 事業構想学群 太田賢研究室。AIとデザインで人の習慣を変える研究室。ICT行動変容支援、行動センシング、ゲーミフィケーション、地域の社会実装を研究。",
  canonical: "https://habitdesign.site/ohtalab/",
  navHtml: nav("home"), footerHtml: labFooter,
  bodyHtml: [hero(), about(), research(), works(), members(), pubHighlights(), newsHome(), noteBand(), teaching(), aspireBand(), joinCTA(), access()].join("\n"),
});
const membersPage = page({
  title: "配属生と卒業研究 — 太田賢研究室",
  desc: "宮城大学 太田賢研究室に配属された学生と、その卒業研究テーマの一覧。習慣化・行動変容・AI・地域をテーマにした卒業研究の実績。",
  canonical: "https://habitdesign.site/ohtalab/members.html",
  navHtml: nav("sub", "members"), footerHtml: labFooter,
  bodyHtml: pageHero(JA.membersPage, EN.membersPage, "pageLead") + membersPageBody(),
});
const pubs = page({
  title: "業績・受賞 — 太田賢研究室",
  desc: "太田賢研究室の論文・招待講演・受賞の一覧。",
  canonical: "https://habitdesign.site/ohtalab/publications.html",
  navHtml: nav("sub", "publications"), footerHtml: labFooter,
  bodyHtml: pageHero(JA.publications, EN.publications, "pageLead") + publicationsPage(),
});
const admissions = page({
  title: "配属希望の方へ — 太田賢研究室",
  desc: "太田賢研究室への配属案内。卒業研究の進め方、機材、キャリア、よくある質問。情報系・空間系どちらも歓迎します。",
  canonical: "https://habitdesign.site/ohtalab/admissions.html",
  navHtml: nav("sub", "join"), footerHtml: labFooter,
  bodyHtml: pageHero(JA.join, EN.join, "lead") + admissionsBody(),
});
const newsPage = page({
  title: "ニュース — 太田賢研究室",
  desc: "太田賢研究室の受賞・発表・地域連携などの最新情報。",
  canonical: "https://habitdesign.site/ohtalab/news.html",
  navHtml: nav("sub", null), footerHtml: labFooter,
  bodyHtml: pageHero(JA.news, EN.news, "pageLead") + newsArchivePage(),
});
const hubPage = page({
  title: "習慣化デザインラボ — 小さな習慣から、未来を変える。",
  desc: "習慣化デザインラボ（宮城大学 太田賢研究室）。AI・データ・行動科学で、運動・学習・生活の「続けたくなる」をデザイン。研究室、#マイプラス10、リカレント教育など習慣化デザインの活動ポータル。",
  canonical: "https://habitdesign.site/",
  ogImage: "https://habitdesign.site/assets/people-crossing.jpg",
  navHtml: hubNav(true), footerHtml: hubFooter(),
  bodyHtml: hubBody(),
});
const sciencePage = page({
  title: "習慣化の科学と技術 — 習慣化デザインラボ",
  desc: "習慣化を支える理論と続けるための手法。習慣の目的・科学・デザイン・続ける技術・テクノロジーの5テーマと、9つの実践手法を紹介します。",
  canonical: "https://habitdesign.site/science.html",
  ogImage: "https://habitdesign.site/assets/people-crossing.jpg",
  navHtml: hubNav(), footerHtml: hubFooter(),
  bodyHtml: hubSciencePageBody(),
  crumbName: "習慣化の科学と技術",
  jsonld: { "@context": "https://schema.org", "@type": "Article", headline: "習慣化の科学と技術", description: "習慣化を支える理論と続けるための手法。習慣の科学、習慣化デザイン（COM-B・ナッジ）、実行意図、テクノロジーと研究を紹介します。", inLanguage: "ja", datePublished: "2026-06-05", author: { "@type": "Organization", name: "習慣化デザインラボ（宮城大学 太田賢研究室）" }, publisher: { "@type": "Organization", name: "習慣化デザインラボ（宮城大学 太田賢研究室）", logo: { "@type": "ImageObject", url: "https://habitdesign.site/favicon.svg" } }, image: "https://habitdesign.site/assets/people-crossing.jpg", mainEntityOfPage: "https://habitdesign.site/science.html" },
});
const booksPage = page({
  title: "習慣化の本 — 習慣化デザインラボ",
  desc: "習慣・行動変容・モチベーション・ウェルビーイングなど、習慣化に役立つ書籍をテーマ別に紹介。国立国会図書館の約4,767冊から選んだおすすめ書籍リスト。",
  canonical: "https://habitdesign.site/books.html",
  ogImage: "https://habitdesign.site/assets/people-crossing.jpg",
  navHtml: hubNav(), footerHtml: hubFooter(),
  bodyHtml: booksPageBody(),
});
const appsPage = page({
  title: "習慣化アプリ — 習慣化デザインラボ",
  desc: "目標設定・記録・リマインダーで継続を助ける習慣化アプリを目的別に紹介。運動・学習・睡眠・お金などのカテゴリ別カタログと、アプリ活用の5ステップ。",
  canonical: "https://habitdesign.site/apps.html",
  ogImage: "https://habitdesign.site/assets/people-crossing.jpg",
  navHtml: hubNav(), footerHtml: hubFooter(),
  bodyHtml: appsPageBody(),
});
const myplus10Page = page({
  title: "#マイプラス10 — 歩く習慣づくり｜習慣化デザインラボ",
  desc: "「今より10分多く動く」から始める歩く習慣づくり。厚生労働省の＋10をベースに、はじめ方の5ステップ、IF-THENプラン例、3段階プラン、楽しく続けるアイデア、今日のウォーキングのヒントを紹介します。",
  canonical: "https://habitdesign.site/myplus10.html",
  ogImage: "https://habitdesign.site/assets/hero-walk.jpg",
  navHtml: hubNav(), footerHtml: hubFooter(),
  bodyHtml: myplus10PageBody(),
});
const workWithUsPage = page({
  title: "依頼・連携 — 取材・登壇・共同研究・監修｜習慣化デザインラボ",
  desc: "宮城大学 太田賢研究室への取材・登壇・共同研究・監修などのご相談。習慣化デザイン／AIと行動変容／DX・リスキリングの講演テーマ例、進め方、これまでの実績を掲載しています。",
  canonical: "https://habitdesign.site/work-with-us.html",
  ogImage: "https://habitdesign.site/assets/people-crossing.jpg",
  navHtml: hubNav(), footerHtml: hubFooter(),
  bodyHtml: workWithUsPageBody(),
  crumbName: "依頼・連携",
});
const caseWalkingAppPage = page({
  title: "運動習慣化アプリの共同研究 — ケーススタディ｜習慣化デザインラボ",
  desc: "習慣化コンサルティング株式会社との共同研究。自己行動実験に基づくIF-THENプラン推薦アプリを設計・実装し、15名の評価実験を経て情報処理学会論文誌（CDS, 2025）に査読付き論文として発表。手法は #マイプラス10 で公開。",
  canonical: "https://habitdesign.site/case-walking-app.html",
  ogImage: "https://habitdesign.site/assets/hero-walk.jpg",
  navHtml: hubNav(), footerHtml: hubFooter(),
  bodyHtml: caseWalkingAppPageBody(),
  crumbName: "運動習慣化アプリの共同研究",
});
const privacyPage = page({
  title: "プライバシーポリシー — 習慣化デザインラボ",
  desc: "習慣化デザインラボ（habitdesign.site）のプライバシーポリシー。Google アナリティクス（GA4）によるアクセス解析、外部送信、オプトアウトについて説明します。",
  canonical: "https://habitdesign.site/privacy.html",
  navHtml: hubNav(), footerHtml: hubFooter(),
  bodyHtml: privacyPageBody(),
  crumbName: "プライバシーポリシー",
});
const caseHabitBusinessPage = page({
  title: "習慣化事業支援システム — ケーススタディ｜習慣化デザインラボ",
  desc: "全国の運動・健康増進の習慣化事業をAIで分析し、地域特性に応じた事業デザインを支援するシステム。情報処理学会DICOMO2025シンポジウム優秀論文賞の関連研究。自治体・スポーツジム・健康保険組合向け。",
  canonical: "https://habitdesign.site/case-habit-business.html",
  ogImage: "https://habitdesign.site/assets/people-crossing.jpg",
  navHtml: hubNav(), footerHtml: hubFooter(),
  bodyHtml: caseHabitBusinessPageBody(),
  crumbName: "習慣化事業支援システム",
});
const caseIzumiPage = page({
  title: "泉パークタウン共創（三菱地所グループ）— ケーススタディ｜習慣化デザインラボ",
  desc: "三菱地所グループ（泉パークタウンサービス）と宮城大学 太田研究室の地域連携。共創ミーティング、デジタル回覧板アプリ「まちひろば」、寺岡Knotsのスマホ教室など、データとデジタルで地域の習慣・行動づくりを支援。",
  canonical: "https://habitdesign.site/case-izumi.html",
  ogImage: "https://habitdesign.site/assets/people-crossing.jpg",
  navHtml: hubNav(), footerHtml: hubFooter(),
  bodyHtml: caseIzumiPageBody(),
  crumbName: "泉パークタウン共創",
});
const caseMatsuriPage = page({
  title: "祭りデザインラボ — ケーススタディ｜習慣化デザインラボ",
  desc: "地域のお祭りを人流ビッグデータ（モバイル空間統計）で分析し、課題解決と価値創造を考える「祭りデザインラボ」。デジタル技術で祭りの魅力を読み解く教材キットや、サイエンス・デイ出展（役に立つ地学賞2025）、高校生向けアントレプレナーシップ教育での活用を紹介。",
  canonical: "https://habitdesign.site/case-matsuri.html",
  ogImage: "https://habitdesign.site/assets/people-crossing.jpg",
  navHtml: hubNav(), footerHtml: hubFooter(),
  bodyHtml: caseMatsuriPageBody(),
  crumbName: "祭りデザインラボ",
});
const profilePage = page({
  title: "太田 賢 プロフィール — 習慣化デザインラボ",
  desc: "宮城大学 事業構想学群 教授 太田賢のプロフィール。専門（サイバーフィジカルシステム、行動変容支援システム、習慣化デザイン）、経歴、著書・訳書、講演テーマ、主な実績。取材・登壇・共同研究のご相談はこちら。",
  canonical: "https://habitdesign.site/profile.html",
  ogImage: "https://habitdesign.site/assets/ohta.png",
  navHtml: hubNav(), footerHtml: hubFooter(),
  bodyHtml: profilePageBody(),
  crumbName: "太田 賢 プロフィール",
  jsonld: { "@context": "https://schema.org", "@type": "Person", name: "太田 賢", alternateName: "Ken Ohta", jobTitle: "教授", affiliation: { "@type": "CollegeOrUniversity", name: "宮城大学 事業構想学群" }, url: "https://habitdesign.site/profile.html", image: "https://habitdesign.site/assets/ohta.png", sameAs: ["https://researchmap.jp/kenohta"], knowsAbout: ["習慣化デザイン", "行動変容支援システム", "サイバーフィジカルシステム", "モバイルコンピューティング", "AI"] },
});

/* redirect stubs at root for the old (pre-hub) lab URLs */
function redirectStub(to) {
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0; url=${to}"><link rel="canonical" href="https://habitdesign.site${to}"><title>移動中…</title></head><body>このページは <a href="${to}">${to}</a> に移動しました。</body></html>`;
}

/* 覚えやすい入口を自ドメインに持つための外部転送ページ。
   note のマガジンURL（/m/<英数字>）は変更できず名刺・口頭で渡しにくいので、
   habitdesign.site/note を安定した入口にし、実体の note へ即転送する。
   将来 note をやめても、この定数を差し替えるだけで入口を保てる（URLが自分の資産になる）。
   転送専用ページなので noindex にして検索インデックスから外す。 */
const NOTE_MAGAZINE_URL = "https://note.com/ohta_ken/m/m6852abf56197";
function externalRedirect(to) {
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=${to}"><title>note連載「続く仕組みの実験ノート」へ移動中…</title></head><body>note連載「続く仕組みの実験ノート」に移動します。<br>自動で移動しない場合は <a href="${to}">こちら</a>。</body></html>`;
}

const labDir = path.join(SITE, "ohtalab");
fs.mkdirSync(labDir, { recursive: true });
fs.writeFileSync(path.join(SITE, "js", "i18n.js"), "window.I18N=" + JSON.stringify(I18N) + ";\n");
fs.writeFileSync(path.join(SITE, "js", "daily.js"), fs.readFileSync(path.join(__dirname, "daily.js"), "utf8"));
/* hub at root */
fs.writeFileSync(path.join(SITE, "index.html"), hubPage);
fs.writeFileSync(path.join(SITE, "science.html"), sciencePage);
fs.writeFileSync(path.join(SITE, "books.html"), booksPage);
fs.writeFileSync(path.join(SITE, "apps.html"), appsPage);
fs.writeFileSync(path.join(SITE, "myplus10.html"), myplus10Page);
fs.writeFileSync(path.join(SITE, "work-with-us.html"), workWithUsPage);
fs.writeFileSync(path.join(SITE, "profile.html"), profilePage);
fs.writeFileSync(path.join(SITE, "case-walking-app.html"), caseWalkingAppPage);
fs.writeFileSync(path.join(SITE, "case-izumi.html"), caseIzumiPage);
fs.writeFileSync(path.join(SITE, "case-matsuri.html"), caseMatsuriPage);
fs.writeFileSync(path.join(SITE, "case-habit-business.html"), caseHabitBusinessPage);
fs.writeFileSync(path.join(SITE, "privacy.html"), privacyPage);
/* column (コラム) — index + article pages under /column/ */
const columnIndexPage = page({
  title: "コラム — 習慣化デザインラボ",
  desc: "習慣化や行動変容を、研究の知見にもとづいてやさしく解説するコラム。続けるための仕組みづくり、小さく始めるコツなど、日々の実践のヒント。",
  canonical: "https://habitdesign.site/column.html",
  navHtml: hubNav(), footerHtml: hubFooter(),
  bodyHtml: columnIndexPageBody(),
  crumbName: "コラム",
});
fs.writeFileSync(path.join(SITE, "column.html"), columnIndexPage);
const columnDir = path.join(SITE, "column");
fs.mkdirSync(columnDir, { recursive: true });
COLUMN.forEach((a) => {
  fs.writeFileSync(path.join(columnDir, a.slug + ".html"), page({
    title: `${a.title[0]} — コラム｜習慣化デザインラボ`,
    desc: a.lead[0],
    canonical: `https://habitdesign.site/column/${a.slug}.html`,
    ogImage: "https://habitdesign.site/assets/people-crossing.jpg",
    navHtml: hubNav(), footerHtml: hubFooter(),
    bodyHtml: columnArticleBody(a),
    crumbName: a.title[0],
    jsonld: { "@context": "https://schema.org", "@type": "Article", headline: a.title[0], description: a.lead[0], inLanguage: "ja", datePublished: a.date, author: { "@type": "Person", name: "太田 賢" }, publisher: { "@type": "Organization", name: "習慣化デザインラボ（宮城大学 太田賢研究室）", logo: { "@type": "ImageObject", url: "https://habitdesign.site/favicon.svg" } }, mainEntityOfPage: `https://habitdesign.site/column/${a.slug}.html` },
  }));
});
/* 孤立コラム検知ガード — COLUMN 配列に無い column/*.html を警告。
   過去に HTML を直接追加したことで build.js（正準ソース）と乖離し、再生成で索引から
   消えて孤立した事故の再発防止。コラムは必ず COLUMN 配列で管理すること。 */
{
  const known = new Set(COLUMN.map((a) => a.slug + ".html"));
  const orphans = fs.readdirSync(columnDir).filter((f) => f.endsWith(".html") && !known.has(f));
  if (orphans.length) {
    console.warn("\n⚠️  孤立コラムHTML（COLUMN配列に未登録）: " + orphans.join(", "));
    console.warn("   → _src/build.js の COLUMN に追加するか、不要なら column/ から削除してください。\n");
  }
}
/* lab under /ohtalab/ */
fs.writeFileSync(path.join(labDir, "index.html"), home);
fs.writeFileSync(path.join(labDir, "members.html"), membersPage);
fs.writeFileSync(path.join(labDir, "publications.html"), pubs);
fs.writeFileSync(path.join(labDir, "admissions.html"), admissions);
fs.writeFileSync(path.join(labDir, "news.html"), newsPage);
/* root redirect stubs for old lab paths */
fs.writeFileSync(path.join(SITE, "publications.html"), redirectStub("/ohtalab/publications.html"));
fs.writeFileSync(path.join(SITE, "admissions.html"), redirectStub("/ohtalab/admissions.html"));
fs.writeFileSync(path.join(SITE, "news.html"), redirectStub("/ohtalab/news.html"));

/* habitdesign.site/note → note連載へ即転送（拡張子なしURLにするため note/index.html に置く） */
const noteDir = path.join(SITE, "note");
fs.mkdirSync(noteDir, { recursive: true });
fs.writeFileSync(path.join(noteDir, "index.html"), externalRedirect(NOTE_MAGAZINE_URL));

/* sitemap */
const SITEMAP_URLS = [
  ["https://habitdesign.site/", "weekly", "1.0"],
  ["https://habitdesign.site/science.html", "monthly", "0.7"],
  ["https://habitdesign.site/books.html", "monthly", "0.6"],
  ["https://habitdesign.site/apps.html", "monthly", "0.6"],
  ["https://habitdesign.site/myplus10.html", "monthly", "0.6"],
  ["https://habitdesign.site/work-with-us.html", "monthly", "0.8"],
  ["https://habitdesign.site/profile.html", "monthly", "0.7"],
  ["https://habitdesign.site/case-walking-app.html", "monthly", "0.7"],
  ["https://habitdesign.site/case-izumi.html", "monthly", "0.7"],
  ["https://habitdesign.site/case-matsuri.html", "monthly", "0.7"],
  ["https://habitdesign.site/case-habit-business.html", "monthly", "0.7"],
  ["https://habitdesign.site/privacy.html", "yearly", "0.2"],
  ["https://habitdesign.site/column.html", "weekly", "0.6"],
  ...COLUMN.map((a) => [`https://habitdesign.site/column/${a.slug}.html`, "monthly", "0.5"]),
  ["https://habitdesign.site/ohtalab/", "monthly", "0.9"],
  ["https://habitdesign.site/ohtalab/members.html", "monthly", "0.7"],
  ["https://habitdesign.site/ohtalab/publications.html", "monthly", "0.6"],
  ["https://habitdesign.site/ohtalab/admissions.html", "monthly", "0.7"],
  ["https://habitdesign.site/ohtalab/news.html", "weekly", "0.5"],
];
const SITEMAP_LASTMOD = "2026-07-14";
fs.writeFileSync(path.join(SITE, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  SITEMAP_URLS.map(([u, f, p]) => `  <url><loc>${u}</loc><lastmod>${SITEMAP_LASTMOD}</lastmod><changefreq>${f}</changefreq><priority>${p}</priority></url>`).join("\n") +
  `\n</urlset>\n`);

console.log("Built hub: index.html  +  lab: ohtalab/{index,members,publications,admissions,news}.html  +  redirect stubs + sitemap");
console.log("i18n keys:", Object.keys(I18N).length);

/* 再生成ドリフト検知（HTML直接編集の取りこぼしを警告）。git不在でも build は壊さない。 */
try { require("./check-drift.js").run(); } catch (e) { /* noop */ }
