# Lo-Fi Visual Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** habitdesign.site の視覚言語を Lo-Fi コンセプト（紙・褪色・静けさ・混成書体）で全ページ横断的に刷新し、同時にフォーカス表示の欠落を解消する。

**Architecture:** スタイルのソースは `css/site.css`（生成物ではない直接編集ファイル）に集約されている。トークンは冒頭 `.app{}` に定義済み。書体切替は `data-font` 属性で既に分岐が焼き込まれており、既定値を `_src/build.js` で切り替える。写真処理・グレイン・focus は CSS で追加する。変更後は `node _src/build.js` で全 `*.html` を再生成する。生成物 HTML は絶対に直接編集しない。

**Tech Stack:** 素の HTML/CSS/JS。ビルドは `node _src/build.js`（依存なし）。テストフレームワークは無いため、検証は「ビルド成功 / check-drift / grep アサーション / コントラスト実測（Node ワンライナー）/ キーボード・モバイル目視」で行う。

## Global Constraints

- **生成物 HTML（ルート直下と `column/` `ohtalab/` の `*.html`）は直接編集しない。** 必ず `_src/` と `css/` を編集し `node _src/build.js` で再生成する。違反すると次回ビルドで巻き戻る（2026-07-13 に実際に発生）。
- 全テキストファイルは UTF-8（BOMなし）。
- 本文コントラストは WCAG AA 4.5:1 を下回らせない。`--muted` は `#6b6456`（bg上 4.84）を使う。仕様書の `#7a7264` は 3.93 で AA 割れのため**採用しない**。
- コミットは Conventional Commits。作業ブランチは `feat/lofi-visual-identity`。
- `_src/data.js`（本文コピー）は変更しない。
- 各タスクの最後で `node _src/build.js` → `node _src/check-drift.js` が両方グリーンであること。
- ロゴ（`logo-mark.svg` / `LABMARK`）は変更しない。

---

### Task 0: 作業ブランチの作成

**Files:**
- なし（git 操作のみ）

- [ ] **Step 1: main が最新か確認しブランチを切る**

```bash
cd ~/Code/habitdesign.site
git status --short           # クリーンであること（未コミットの Lo-Fi 変更が無い）
git checkout -b feat/lofi-visual-identity
git branch --show-current    # → feat/lofi-visual-identity
```

Expected: `feat/lofi-visual-identity` に切り替わる。

---

### Task 1: デザイントークンと角丸

Lo-Fi の芯。純白の全廃とピル型角丸の廃止が「今風テンプレ感」を最も強く消す。

**Files:**
- Modify: `css/site.css:4-14`（`.app{}` トークン定義）
- Modify: `css/site.css` 全体の `border-radius:999px` と大きい角丸（後述の grep で特定）

**Interfaces:**
- Produces: 新トークン値（`--bg:#efe9db` / `--surface:#f6f2e7` / `--text:#33302a` / `--muted:#6b6456` / `--accent:oklch(0.60 0.12 48)` / `--cta-bg:#2a2723`）。後続タスクはこれらを前提にする。

- [ ] **Step 1: 変更前のトークンを確認**

Run: `sed -n '4,14p' css/site.css`
Expected: 現行の `--bg:#f5f4ef; --surface:#ffffff; ...` が見える。

- [ ] **Step 2: `.app{}` のトークンを差し替える**

`css/site.css` の `.app{` ブロック（4行目付近）の該当行を次に置換する。

```css
  --bg:#efe9db; --surface:#f6f2e7; --surface-2:#e5ddc9;
  --border:rgba(51,48,42,.14); --hair:rgba(51,48,42,.08);
  --text:#33302a; --muted:#6b6456; --faint:rgba(51,48,42,.035);
  --cell-off:rgba(51,48,42,.09); --ph-a:rgba(51,48,42,.06); --ph-b:rgba(51,48,42,.025);
  --cta-bg:#2a2723; --nav-bg:rgba(239,233,219,.80);
  --accent:oklch(0.60 0.12 48); --accent-strong:oklch(0.54 0.13 46);
  --on-accent:#f4efe4; --accent-hex:#b5611f;
```

（`--font-jp` / `--font-latin` / `--sec-pad` / `--wrap` の行は Task 2・3 で扱うのでこの Step では触らない。）

- [ ] **Step 3: `--sec-pad` を広げる**

`css/site.css` の `--sec-pad:6.8rem;` を次に変更：

```css
  --sec-pad:8.5rem; --wrap:1140px;
```

- [ ] **Step 4: 角丸を洗い出す**

Run: `grep -n "border-radius:999px\|border-radius:20px\|border-radius:18px\|border-radius:16px\|border-radius:14px" css/site.css | wc -l`
Expected: 数十件ヒットする（置換対象の全体像を把握するため）。

- [ ] **Step 5: 大きい角丸を縮小する（一括置換）**

カード類の大きい角丸を 6px に、ピル（999px）はボタン・ナビ用途では 4px に統一する。ただし `border-radius:50%`（円形ドット・アバター）と `border-radius:2px`/`3px`（既に小さい装飾）は**変更しない**。

```bash
# カード系の大きな角丸 → 6px
sed -i '' -E 's/border-radius:20px/border-radius:6px/g; s/border-radius:18px/border-radius:6px/g; s/border-radius:16px/border-radius:6px/g; s/border-radius:14px/border-radius:6px/g; s/border-radius:12px/border-radius:5px/g; s/border-radius:11px/border-radius:5px/g; s/border-radius:10px/border-radius:5px/g; s/border-radius:8px/border-radius:4px/g' css/site.css
# ピル(999px) → 4px（ボタン・チップ・タブ・ドメイン）
sed -i '' -E 's/border-radius:999px/border-radius:4px/g' css/site.css
```

- [ ] **Step 6: 円形とアバターが壊れていないことを確認**

Run: `grep -n "border-radius:50%\|border-radius:4px\|border-radius:6px" css/site.css | head -30`
Expected: `border-radius:50%` が残存（ドット・アバター）。カード類が 6px、ボタン類が 4px になっている。

- [ ] **Step 7: 角丸のインライン指定（figure）を修正**

`_src/build.js` の `figure()` は img に `border-radius:18px` をインラインで焼き込んでおり CSS より優先される。これを 6px に下げる。

Run: `grep -n "border-radius:18px" _src/build.js`
Expected: `figure()` 内（207行付近）にヒット。

`_src/build.js` の該当2箇所（`ratio ? ... : ...` の両方）の `border-radius:18px` を `border-radius:6px` に変更する。

```js
  const style = ratio ? ` style="aspect-ratio:${ratio};border-radius:6px"` : ` style="border-radius:6px"`;
```

- [ ] **Step 8: ビルドして反映を確認**

```bash
node _src/build.js && node _src/check-drift.js
```
Expected: `Built hub: ...` と `check-drift: OK` の2つ。

- [ ] **Step 9: 純白と大きい角丸が生成物から消えたことを確認**

```bash
grep -rl "#ffffff" *.html ohtalab/*.html 2>/dev/null | head   # 期待: 生成HTMLに直書き白が無い（あってもロゴSVG参照のみ）
grep -o "border-radius:18px" index.html | head                # 期待: 出力なし
```
Expected: figure由来の 18px が index.html から消えている。

- [ ] **Step 10: Commit**

```bash
git add css/site.css _src/build.js *.html ohtalab/*.html column/*.html
git commit -m "feat(brand): Lo-Fi トークン（純白全廃・焦茶インク・褪色アクセント）と角丸縮小"
```

---

### Task 2: 混成書体（明朝見出し＋モノスペースのラベル）

**Files:**
- Modify: `_src/build.js:2356`（`FONTS` 定数）
- Modify: `_src/build.js:2407`（`data-font="zen"` → `"mincho"`）
- Modify: `css/site.css:12`（`--font-jp` と見出しフォント）
- Modify: `css/site.css:34,39`（`data-font="mincho"` 既存分岐の字間）

**Interfaces:**
- Consumes: Task 1 のトークン。
- Produces: 見出しが Zen Old Mincho、`data-font` 既定が `mincho`。

- [ ] **Step 1: フォント読込 URL を差し替える**

`_src/build.js` の `FONTS` 定数（2356行）を次に置換。Schibsted Grotesk を削除し Zen Old Mincho を追加する。

```js
const FONTS ="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Zen+Old+Mincho:wght@400;500;700;900&family=Space+Mono:wght@400;700&display=swap";
```

- [ ] **Step 2: app ルートの既定書体を明朝にする**

`_src/build.js:2407` を確認して変更。

Run: `grep -n 'data-font="zen"' _src/build.js`
Expected: 2407行にヒット。

`data-font="zen"` を `data-font="mincho"` に変更する。

- [ ] **Step 3: CSS の見出しフォントを明朝に、本文/ラテンのフォールバックを整理**

`css/site.css:12` の `--font-latin` は Schibsted を参照しているため、Space Mono ／ system-ui に寄せる。該当行を確認：

Run: `sed -n '12p;22,40p' css/site.css`

`--font-latin:'Schibsted Grotesk';` を削除し、`.app` の `font-family` から Schibsted 依存を外す。`css/site.css` の該当箇所を次のように整える（12行目のトークン行と、`.app{ font-family:... }` の行）：

```css
  --font-jp:'Zen Kaku Gothic New'; --font-mincho:'Zen Old Mincho'; --font-latin:'Space Mono';
```

- [ ] **Step 4: 見出しに明朝を割り当てる**

`css/site.css` の `h1,h2,h3,h4{...}` 規則（38行付近）の直後に、明朝既定時の見出しフォント指定を追加する。既存の `.app[data-font="mincho"] h1,...{font-weight:600;letter-spacing:0}`（39行）を次に拡張：

```css
.app[data-font="mincho"] h1,.app[data-font="mincho"] h2,.app[data-font="mincho"] h3{font-family:var(--font-mincho),serif;font-weight:600;letter-spacing:.04em}
```

（字間を `0` から `.04em` に開く。仕様書 4.2：和文見出しを詰めるのは Hi-Fi の作法。）

- [ ] **Step 5: ビルドして確認**

```bash
node _src/build.js && node _src/check-drift.js
```
Expected: 両方グリーン。

- [ ] **Step 6: フォント指定が生成物に反映されたか確認**

```bash
grep -o "Zen+Old+Mincho" index.html | head -1        # 期待: Zen+Old+Mincho
grep -o "Schibsted" index.html | head -1              # 期待: 出力なし
grep -o 'data-font="mincho"' index.html | head -1     # 期待: data-font="mincho"
```
Expected: 明朝が読み込まれ Schibsted が消え、既定書体が mincho。

- [ ] **Step 7: Commit**

```bash
git add css/site.css _src/build.js *.html ohtalab/*.html column/*.html
git commit -m "feat(brand): 混成書体（Zen Old Mincho 見出し＋Space Mono ラベル）、Schibsted 廃止"
```

---

### Task 3: フォーカス表示・hover ガード・モーション減速

仕様書 5.1〜5.3 と 4.4。**アクセシビリティ修正（focus）を最優先で含める。**

**Files:**
- Modify: `css/site.css`（`.reveal` 20/45行、hero `@keyframes kb` 193行、`.ladder` pulse 101行、hover 3箇所 262/599/650行、新規 focus-visible）

**Interfaces:**
- Consumes: Task 1 のトークン（`--accent`）。

- [ ] **Step 1: 全対話要素に focus-visible を追加**

`css/site.css` の既存 `.domain:focus-visible`（637行付近）の近くに、汎用ルールを追加する。ファイル末尾付近でも良いが、詳細度で負けないよう `.app` スコープで書く。

```css
.app a:focus-visible,.app button:focus-visible,.app select:focus-visible,.app [tabindex]:focus-visible,.app .col-card:focus-visible,.app .domain:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:3px}
```

- [ ] **Step 2: focus-visible が入ったことを確認**

Run: `grep -c "focus-visible" css/site.css`
Expected: 3 以上（既存2＋新規1、既存が同一行に複数含む場合はそれ以上）。

- [ ] **Step 3: hover の translateY を除去（3箇所）**

対象は浮上と枠線を同時に出している3箇所。枠線は残し `transform` のみ抜く。

Run: `grep -n "transform:translateY(-2px)" css/site.css`
Expected: `.domain:hover`（262行）、`.col-card:hover`（599行付近）、`.theme-chip:hover`（650行付近）。

各行の `;transform:translateY(-2px)` を削除する（`box-shadow:inset 0 0 0 1px var(--accent)` は残す）。例：

```css
.domain:hover{box-shadow:inset 0 0 0 1px var(--accent)}
.col-card:hover{box-shadow:inset 0 0 0 1px var(--accent)}
.theme-chip:hover{box-shadow:inset 0 0 0 1px var(--accent)}
```

- [ ] **Step 4: 全 hover をメディアクエリでガード（タッチ端末対策）**

`.col-card` は `transition` に `transform` を含むので、その行の transition から transform を外す。

Run: `grep -n "transition:box-shadow .2s ease,transform .2s ease" css/site.css`
該当（598行付近 `.col-card`）を `transition:box-shadow .2s ease` に変更。

さらに CSS 末尾に、タッチ端末で hover を無効化するガードを追加：

```css
@media (hover:none){
  .domain:hover,.col-card:hover,.theme-chip:hover{box-shadow:inset 0 0 0 1px var(--hair)}
}
```

- [ ] **Step 5: モーションを減速**

以下を順に変更する。

`.reveal`（45行）:
```css
.reveal{opacity:0;transform:translateY(8px);transition:opacity 1.15s cubic-bezier(.2,.7,.2,1),transform 1.15s cubic-bezier(.2,.7,.2,1)}
```

ヒーロー Ken Burns（193行 `@keyframes kb`）:
```css
@keyframes kb{from{transform:scale(1.03)}to{transform:scale(1)}}
```
かつ 192行の `animation:kb 9s` を `animation:kb 15s` に変更。

スライドのフェード（190行 `.hero-slide`）: `transition:opacity 1.6s ease` を `transition:opacity 2.4s ease` に。

ladder pulse（99行）: `animation:pulse 3.4s` を `animation:pulse 5.5s` に。

- [ ] **Step 6: ビルドして確認**

```bash
node _src/build.js && node _src/check-drift.js
```
Expected: 両方グリーン。

- [ ] **Step 7: translateY hover が消えたことを確認**

Run: `grep -c "transform:translateY(-2px)" css/site.css`
Expected: `0`

- [ ] **Step 8: Commit**

```bash
git add css/site.css *.html ohtalab/*.html column/*.html
git commit -m "feat(a11y): 全対話要素に focus-visible／hoverガード／モーション減速（Lo-Fiテンポ）"
```

---

### Task 4: 全面グレイン（紙の粒子）

**Files:**
- Modify: `css/site.css`（`body` 直後に `body::after` を追加）

- [ ] **Step 1: グレインオーバーレイを追加**

`css/site.css` の `body{background:#0e1014}`（23行付近）の直後に追加する。`pointer-events:none` と低 opacity で、意識に上らない強さに留める。

```css
body::after{content:"";position:fixed;inset:0;z-index:9999;pointer-events:none;opacity:.05;mix-blend-mode:multiply;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E")}
@media (prefers-reduced-motion:reduce){body::after{opacity:.035}}
```

- [ ] **Step 2: ビルドして確認**

```bash
node _src/build.js && node _src/check-drift.js
```
Expected: 両方グリーン。

- [ ] **Step 3: ブラウザで目視（グレインが強すぎないか）**

```bash
open index.html
```
Expected: 紙のざらつきが「言われないと気づかない」程度。強すぎたら opacity を .04 に下げる。

- [ ] **Step 4: Commit**

```bash
git add css/site.css
git commit -m "feat(brand): 全面グレイン（紙の粒子）を body::after に敷設"
```

---

### Task 5: 写真の褪色処理（既定＋人物例外）

仕様書 4.3。既定は褪色＋粒子＋にじみ、人物写真（`members-*` / `ohta.png`）のみ褪色のみに弱める。

**Files:**
- Modify: `css/site.css`（`.figure img` 480行付近、`.project-shot`、`.book-cover`、`.hero-slide`、`.pi-photo`、`.roster-photo`、`.profile-photo` に filter を追加、人物用の弱め規則を追加）
- Modify: `_src/build.js`（人物 figure に識別クラス `photo-record` を付与：403/702行の members figure 呼び出し）

**Interfaces:**
- Consumes: Task 1 のトークン。
- Produces: `.photo-record` クラス（人物写真の目印）。

- [ ] **Step 1: 既定の写真フィルタを追加**

`css/site.css` 末尾に、コンテンツ写真への既定処理を追加する。`.figure` はラッパなので、内部 img と背景系（hero-slide）を対象にする。

```css
/* ── Lo-Fi 写真処理：既定（褪色＋わずかなセピア） ── */
.figure img,.project-shot,.book-cover,.roster-photo,.pi-photo,.hero-slide{
  filter:saturate(.74) contrast(.93) brightness(1.04) sepia(.10)}
/* 縁のにじみ（figure と project 枠に周辺光量落ち） */
.figure,.project{position:relative}
.figure::after,.project::after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:6px;box-shadow:inset 0 0 44px rgba(90,72,40,.28)}
```

- [ ] **Step 2: 人物 figure に識別クラスを付与（build.js）**

`_src/build.js` の members 写真呼び出し（403行・702行）の `cls` 引数に `photo-record` を足す。

Run: `grep -n 'members-2024.jpg\|members-2025.jpg' _src/build.js`
Expected: 403行（`"cohort"`）と 702行（`"join-banner"`）。

それぞれ `cls` を `"cohort photo-record"` / `"join-banner photo-record"` に変更する。

```js
// 403行
return figure("/assets/members-2024.jpg", "2024年度 配属生（#HABITUS2025）", jaCap, enCap, "cohort photo-record", "4 / 3", true);
// 702行
const banner = figure("/assets/members-2025.jpg", "2025年度 配属生", "2025年度 配属生 · “You have own secret wings…”", "2025 cohort · “You have own secret wings…”", "join-banner photo-record");
```

- [ ] **Step 3: 人物写真の弱め規則を追加（CSS）**

`css/site.css` の Step 1 で足したブロックの直後に、人物用の上書きを追加する。`.photo-record` 経由の figure と、直接 img の `.pi-photo`/`.profile-photo`（＝太田写真・ロースター）を褪色のみに。

```css
/* ── 人物写真は褪色のみ（記録としての正確さを優先） ── */
.photo-record img,.profile-photo img,.roster-photo{
  filter:saturate(.82) contrast(.95) brightness(1.02)}
.photo-record::after{box-shadow:inset 0 0 30px rgba(90,72,40,.16)}
```

- [ ] **Step 4: ビルドして確認**

```bash
node _src/build.js && node _src/check-drift.js
```
Expected: 両方グリーン。

- [ ] **Step 5: 人物クラスが生成物に付いたか確認**

```bash
grep -o "photo-record" ohtalab/members.html | head -1     # 期待: photo-record
grep -o "photo-record" ohtalab/admissions.html | head -1  # 期待: photo-record（join-banner側）
```
Expected: 両ページに `photo-record` が出力される。

- [ ] **Step 6: モバイル幅で描画負荷を目視**

```bash
open ohtalab/members.html
```
ブラウザを 375px 幅にして、写真の多いページをスクロール。カクつく場合は仕様書リスク欄の通り、人物以外を静的書き出しに切り替える判断（今回は保留可）。

Expected: スクロールが実用的に滑らか。

- [ ] **Step 7: Commit**

```bash
git add css/site.css _src/build.js *.html ohtalab/*.html column/*.html
git commit -m "feat(brand): 写真の褪色処理（既定＋人物写真は記録優先で弱める）"
```

---

### Task 6: 全ページ検証とコントラスト実測ゲート

仕様書 6.2。ここが「薄いへの転落」を止める最終防波堤。

**Files:**
- なし（検証のみ）。不合格なら該当タスクの CSS を修正。

- [ ] **Step 1: コントラストを実測する**

```bash
node -e '
function lin(c){c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)}
function L(h){const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return .2126*lin(r)+.7152*lin(g)+.0722*lin(b)}
function R(a,b){const x=L(a),y=L(b),hi=Math.max(x,y),lo=Math.min(x,y);return((hi+.05)/(lo+.05)).toFixed(2)}
console.log("text on bg :", R("#33302a","#efe9db"));   // 期待 >=4.5（実測 10.86）
console.log("muted on bg:", R("#6b6456","#efe9db"));   // 期待 >=4.5（実測 4.84）
console.log("text on surf:", R("#33302a","#f6f2e7"));  // 期待 >=4.5
'
```
Expected: 3 値すべて 4.5 以上。1つでも割れたら該当色を暗くして Task 1 を修正・再ビルド。

- [ ] **Step 2: 全ページをビルドし drift を確認**

```bash
node _src/build.js && node _src/check-drift.js
```
Expected: `check-drift: OK`。

- [ ] **Step 3: 全ページを目視**

```bash
for f in index profile publications news admissions apps books science work-with-us myplus10 privacy column; do open "$f.html"; done
open ohtalab/index.html ohtalab/members.html ohtalab/publications.html ohtalab/admissions.html ohtalab/news.html
open case-izumi.html case-matsuri.html case-walking-app.html case-habit-business.html
```
Expected: 全ページで純白カードが消え、紙色に統一され、写真が背景と馴染んでいる。破綻（文字潰れ・写真真っ黒・角丸残り）が無い。

- [ ] **Step 4: キーボードのみで回遊**

index.html をブラウザで開き、マウスを使わず Tab キーだけでナビ・カード・ボタン・フッターリンクを辿る。

Expected: フォーカス中の要素に常にオレンジの outline が見える。見えない要素があれば Task 3 Step 1 のセレクタに追加。

- [ ] **Step 5: 生成物に純白と旧書体の残りが無いか最終確認**

```bash
grep -rn "Schibsted" *.html ohtalab/*.html column/*.html | head        # 期待: 空
grep -rn "border-radius:999px\|border-radius:20px" *.html | head       # 期待: 空
grep -rn "#f5f4ef\|#ffffff" *.html | grep -v "svg\|logo" | head        # 期待: 実質空
```
Expected: いずれもほぼ空（ロゴSVG参照を除く）。

- [ ] **Step 6: 最終コミット（検証で微修正した場合のみ）**

```bash
git add -A
git commit -m "fix(brand): 全ページ検証で見つかった Lo-Fi 調整（コントラスト/フォーカス）"
```

- [ ] **Step 7: 差分サマリを確認してから統合判断**

```bash
git log --oneline main..feat/lofi-visual-identity
git diff --stat main..feat/lofi-visual-identity
```
Expected: css/site.css と _src/build.js が変更の中心。生成物 HTML は `?v=` とクラス追加のみ。

デプロイは main への統合（push）で自動公開されるため、この Step では統合しない。ユーザーに完了報告し、main へのマージ可否を仰ぐ。

---

## Self-Review

**Spec coverage:**
- 3章の全決定（B土台＋A骨格 / 混成書体 / 写真二段 / 全ページ）→ Task 1,2,3,5 でカバー
- 4.1 トークン → Task 1 / 4.2 書体 → Task 2 / 4.3 質感 → Task 4,5 / 4.4 モーション → Task 3
- 5.1 focus / 5.2 hover ガード / 5.3 コントラスト → Task 3, Task 6 Step 1
- 6.2 検証 → Task 6 / 7章リスク（巻き戻り・filter負荷・薄い転落）→ Global Constraints, Task 5 Step 6, Task 6 Step 1
- ロゴ除外・data.js 除外 → Global Constraints

**修正した点:**
- 仕様書の `--muted:#7a7264`（実測 3.93 で AA 割れ）を `#6b6456`（4.84）に変更し、Global Constraints に理由を明記
- `figure()` が border-radius をインラインで焼き込む問題（CSS だけでは角丸が下がらない）を Task 1 Step 7 で対処
- 人物写真の切り分けを、build.js に `photo-record` クラスを付与する具体手段として Task 5 Step 2 で明文化

**Placeholder scan:** なし（全 Step に実コード・実コマンド・期待値あり）。

**Type consistency:** `photo-record` クラス名は Task 5 Step 2（付与）と Step 3・5（参照）で一致。トークン名は Task 1 で定義したものを後続で参照。
