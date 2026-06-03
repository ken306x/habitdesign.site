# 習慣化デザインラボ Web サイト（habitdesign.site）

宮城大学・太田賢研究室の公開Webサイト。GitHub Pages（独自ドメイン `habitdesign.site`）で配信する**純静的サイト**。
ビルド工程なしでそのまま動く（React/Babelは不使用）。Anthropic Design ハンドオフのプロトタイプを、SEO・保守性・ビルド不要を満たすよう素のHTML/CSS/JSへ書き換えたもの。

## 構成

```
site/
├── index.html          # トップ（ヒーロー〜アクセスの1ページ構成）
├── publications.html   # 業績・受賞アーカイブ（カテゴリ絞り込み）
├── admissions.html     # 配属希望の方へ（WHY・進め方・機材・FAQ・CTA）
├── news.html           # ニュースアーカイブ（タグ絞り込み・全53件）
├── css/site.css        # 全スタイル（デザイントークン + コンポーネント）
├── js/
│   ├── i18n.js         # JA/EN 辞書（自動生成。直接編集しない）
│   └── site.js         # ランタイム（言語切替・ナビ・スクロール演出・フィルタ・FAQ）
├── assets/             # 写真・動画・システム画面（Web向けに圧縮済み）
├── CNAME               # GitHub Pages 独自ドメイン設定（habitdesign.site）
├── robots.txt / sitemap.xml
└── _src/               # 生成元（デプロイ不要・編集用）
    ├── build.js        # 静的HTML生成スクリプト
    ├── data.js         # 全テキスト（JA/EN）
    └── news-data.js    # ニュース全件（JA/EN）
```

## デプロイ

`site/` 配下（`_src/` を除く）をリポジトリ `ken306x/habitdesign.site` のルートに置いて push するだけ。
ビルド不要。GitHub Pages が静的配信する。

## 内容の更新方法

2通り。**どちらでもOK**。

1. **HTMLを直接編集**（軽微な修正向け）
   - `index.html` 等を直接書き換える。JAテキストはHTMLに直書きされているのでそのまま編集可能。
   - ただしJA/EN両方を更新したい場合は `js/i18n.js` の対応キーも直す必要がある。

2. **生成元を編集して再生成**（推奨・JA/ENを揃えたいとき）
   - `_src/data.js`（本文）または `_src/news-data.js`（ニュース）を編集。
   - `site/` で `node _src/build.js` を実行 → `index.html` 等と `js/i18n.js` が再生成される。
   - JA/ENの整合が自動で保たれる。

## デザイン仕様（ハンドオフ準拠）

- 配色: Daylight（明るい背景）+ アクセント Ember `#e6863c`（習慣化デザインカラー）
- フォント: Zen Kaku Gothic New（和文）/ Schibsted Grotesk（欧文）/ Space Mono（ラベル・数字）
- ヒーロー: ライフスタイル写真スライドショー ⇄ 幾何アニメーション（hybrid）。`prefers-reduced-motion` 尊重。
- ロゴ: 右肩上がりの3列グリッド（習慣トラッカー × 成長）
- 言語: JA既定 / EN切替（localStorage保持）

プロトタイプにあったテーマ切替の「Tweaks」パネルは、デフォルト値をベイクして除去済み。
再テーマ化は `css/site.css` 冒頭の `.app{ --bg... }` トークンを編集すれば全体に反映される。

## 既知の制約・要確認

- **学部生の氏名はプレースホルダ**（`○○ ○○`）。実名簿に差し替えること（`_src/data.js` の `members.groups`）。
- ヒーロー写真は Adobe Stock（クライアント許諾前提）。本番利用のライセンス継続を要確認。
- スマホ幅（≤1080px）ではナビのセクションリンクが非表示（ハンバーガー未実装）。ブランド・言語切替・配属CTAは表示。
- Google マップは keyless 埋め込み。安定性が必要なら Maps Embed API へ。
- 動画 `habitus2025.mp4`（約4MB）はポスター画像未設定。
