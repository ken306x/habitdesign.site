/* check-drift.js — 再生成ドリフト検知ガード
   目的: HTML（生成物）を直接編集して build.js の正準ソースに反映し忘れると、
   次の `node _src/build.js` で手書き要素（ヒーロー切替・動画・iframe 等）が静かに消える。
   この事故（過去に case-habit-business のヒーロー、case-izumi の動画で発生）を検知する。

   仕組み: 直近コミット(HEAD)の各HTMLと、現在の作業ツリー（＝再生成直後）を比較し、
   リッチ要素の「数が減っている」ファイルを警告する。
   使い方: `node _src/build.js` の末尾から自動実行。単体実行も可（site/ で `node _src/check-drift.js`）。
   前提: クリーンな状態で再生成した直後に実行すると最も正確（未コミットのソース変更があると差分は正常）。 */
const cp = require("child_process");
const fs = require("fs");
const path = require("path");

const SITE = path.resolve(__dirname, "..");
const MARKERS = ["<video", "<iframe", 'class="hero-slide', "matsuri-hero"];

function inventory(html) {
  const o = {};
  for (const m of MARKERS) o[m] = html.split(m).length - 1;
  o["background-image"] = (html.match(/background-image:url/g) || []).length;
  return o;
}
function headVersion(rel) {
  try {
    return cp.execSync(`git show HEAD:"${rel}"`, { cwd: SITE, maxBuffer: 1e8, stdio: ["pipe", "pipe", "ignore"] }).toString();
  } catch (e) { return null; }
}

function run() {
  let files;
  try {
    files = cp.execSync('git ls-files "*.html"', { cwd: SITE, maxBuffer: 1e8 }).toString().trim().split("\n").filter(Boolean);
  } catch (e) {
    console.warn("check-drift: git が使えないためスキップ");
    return 0;
  }
  const warnings = [];
  for (const f of files) {
    let cur;
    try { cur = fs.readFileSync(path.join(SITE, f), "utf8"); } catch (e) { continue; }
    const head = headVersion(f);
    if (head === null) continue; // 未コミット（新規）ファイルは比較対象外
    const ci = inventory(cur), hi = inventory(head);
    const lost = Object.keys(hi).filter((k) => hi[k] > ci[k]);
    if (lost.length) warnings.push({ f, detail: lost.map((k) => `${k}: ${hi[k]}→${ci[k]}`) });
  }
  if (warnings.length) {
    console.warn("\n⚠️  ドリフト検知: 直近コミット(HEAD)にあったリッチ要素が再生成結果から消えています。");
    console.warn("   HTMLを直接編集してソース未反映の可能性。該当機能を _src/ のソース(build.js等)へ反映してください:\n");
    warnings.forEach((w) => console.warn("   ■ " + w.f + "\n      " + w.detail.join(", ")));
    console.warn("");
    return 2;
  }
  console.log("check-drift: OK（HEAD比でリッチ要素の消失なし）");
  return 0;
}

if (require.main === module) process.exitCode = run();
module.exports = { run };
