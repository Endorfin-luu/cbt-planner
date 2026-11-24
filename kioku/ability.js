/* ============================================================
   実力（予想得点メーター・模試の推移・苦手マップ・いま効く章）
   - 本番は初めて見る問題を解くので、QB分野別を「初めて解いたとき」の正答率（初見正答率）で実力を見る
     （問題演習の記録 S.qx.out のうち r=1 の分。旧 国試 Planner の記録も誤答数があれば使う）
   - 問題が少ない科は全体の正答率に寄せて推定する（少ないデータで極端な値が出ないように）
   - 模試の記録は S.pl.mocks に入れる（端末間は id ごとに合わせる。消したものは S.pl.tomb）
   planner.js の後に読み込む。pl()・plLogs()・plOpenChapter() などは planner.js のものを使う。
   ============================================================ */
"use strict";

// 合格基準（厚労省発表）。必修は絶対基準 80%、一般・臨床は相対基準で直近5回は 72〜77%
const AB_PASS = { hisshu: 0.80, gen: 0.75, genLo: 0.72, genHi: 0.77 };
const AB_POINTS = { hisshu: 200, gen: 300 };
const AB_SHRINK = 15;   // 何問ぶん全体の正答率に寄せるか
const AB_MIN_N = 10;    // これ未満の科は「データ不足」として色を付けない

/* ---------- 集計 ---------- */
function abStats(){
  const logs = plLogs().filter(l => l.b === "qb" && l.r === 1 && l.w != null);
  const by = {}; let n = 0, w = 0;
  for (const l of logs){ const C = by[l.c] ||= { n: 0, w: 0 }; C.n += l.n; C.w += l.w; n += l.n; w += l.w; }
  const p0 = n ? (n - w) / n : null, prior = p0 ?? 0.7;
  const day = today(), Q = qx().b.qb || {};
  const chs = QX_BANKS.qb.ch.map(([id, name, total]) => {
    const C = by[id] || { n: 0, w: 0 };
    const acc = (C.n - C.w + AB_SHRINK * prior) / (C.n + AB_SHRINK);
    const qs = Object.values(Q[id] || {}); let rsum = 0;
    for (const e of qs) rsum += fR(Math.max(0, day - e[2]), e[0]);
    return { id, name, total, n: C.n, w: C.w, raw: C.n ? (C.n - C.w) / C.n : null, acc, solved: qs.length, ret: qs.length ? rsum / qs.length : null };
  });
  // 一般・臨床の出題の重み＝必修以外の科の問題数の割合（QBは過去問を科ごとに集めたものなので、出題の多さの目安になる）
  const gen = chs.filter(c => c.id !== "HS"), gw = gen.reduce((a, c) => a + c.total, 0);
  for (const c of chs) c.share = c.id === "HS" ? 1 : c.total / gw;
  const hs = chs.find(c => c.id === "HS");
  const genAcc = gen.reduce((a, c) => a + c.share * c.acc, 0);
  const genN = gen.reduce((a, c) => a + c.n, 0);
  const ci = (p, m) => m ? Math.min(0.2, 1.96 * Math.sqrt(p * (1 - p) / m)) : 0.2;
  // 取りこぼし点（推定）：本番でこの科から落としそうな点数
  for (const c of chs) c.lost = (c.id === "HS" ? AB_POINTS.hisshu : AB_POINTS.gen * c.share) * (1 - c.acc);
  return { chs, n, p0, hisshu: { acc: hs.acc, n: hs.n, ci: ci(hs.acc, hs.n) }, gen: { acc: genAcc, n: genN, ci: ci(genAcc, genN) } };
}

/* ---------- 模試 ---------- */
function abMocks(){ const P = pl(); P.mocks ||= []; const tomb = new Set(P.tomb); return P.mocks.filter(m => !tomb.has(m.id)).sort((a, z) => a.date.localeCompare(z.date)); }
function abTarget(){ const s = pl().settings; return { lo: s.targetDevLo ?? 55, hi: s.targetDevHi ?? 60 }; }

/* ---------- 見た目 ---------- */
const AB_CSS = `
.ab-g{position:relative;height:30px;margin:14px 0 26px}
.ab-g .tr{position:absolute;top:10px;left:0;right:0;height:10px;border-radius:5px;background:var(--surface2);border:1px solid var(--line)}
.ab-g .band{position:absolute;top:10px;height:10px;background:color-mix(in srgb,var(--again) 18%,transparent)}
.ab-g .ci{position:absolute;top:12px;height:6px;border-radius:3px;background:color-mix(in srgb,var(--accent) 30%,transparent)}
.ab-g .pt{position:absolute;top:4px;width:6px;height:22px;margin-left:-3px;border-radius:3px;background:var(--accent)}
.ab-g .pl{position:absolute;top:0;width:2px;height:30px;margin-left:-1px;background:var(--again)}
.ab-g .lb{position:absolute;top:32px;transform:translateX(-50%);font-size:.7rem;white-space:nowrap;color:var(--ink2)}
.ab-g .lb.r{color:var(--again);font-weight:700}
.ab-sec{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.ab-sec .v{font-size:1.9rem;font-weight:700;font-variant-numeric:tabular-nums}
.ab-sec .d{font-weight:700}
.ab-map{display:grid;grid-template-columns:repeat(auto-fill,minmax(108px,1fr));gap:6px;margin-top:10px}
.ab-t{border:1px solid var(--line);border-radius:10px;padding:7px 8px;text-align:left;cursor:pointer;background:var(--surface);color:var(--ink);font:inherit}
.ab-t:hover{filter:brightness(.97)}
.ab-t .nm{font-size:.78rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ab-t .ac{font-size:1.25rem;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.2}
.ab-t .sb{font-size:.68rem;color:var(--ink2)}
.ab-t .pb{height:4px;border-radius:2px;background:color-mix(in srgb,var(--ink) 10%,transparent);margin-top:4px;overflow:hidden}
.ab-t .pb i{display:block;height:100%;background:var(--ink2)}
.ab-c0{background:var(--surface2)} .ab-c1{background:color-mix(in srgb,#d64545 22%,var(--surface))} .ab-c2{background:color-mix(in srgb,#e08a2c 22%,var(--surface))}
.ab-c3{background:color-mix(in srgb,#d9b92a 22%,var(--surface))} .ab-c4{background:color-mix(in srgb,#5aa860 20%,var(--surface))} .ab-c5{background:color-mix(in srgb,#2e8b57 34%,var(--surface))}
.ab-leg{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;font-size:.7rem;color:var(--ink2)}
.ab-leg span{display:inline-flex;align-items:center;gap:4px} .ab-leg i{width:12px;height:12px;border-radius:3px;border:1px solid var(--line);display:inline-block}
.ab-rank{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:1px solid var(--line);background:var(--surface);border-radius:11px;padding:9px 12px;margin-top:8px;cursor:pointer;font:inherit;color:var(--ink)}
.ab-rank:hover{background:var(--surface2)}
.ab-rank .no{width:22px;height:22px;border-radius:50%;background:var(--accent);color:#fff;font-weight:700;font-size:.8rem;display:grid;place-items:center;flex-shrink:0}
.ab-rank .pts{margin-left:auto;font-weight:700;color:var(--again);white-space:nowrap;font-variant-numeric:tabular-nums}
.ab-mock{display:flex;align-items:center;gap:8px;font-size:.85rem;padding:5px 0;border-bottom:1px dashed var(--line)}
.ab-mock .x{margin-left:auto;border:0;background:none;color:var(--muted);cursor:pointer}
.ab-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-top:10px}
.ab-form label{font-size:.75rem;color:var(--ink2);display:grid;gap:3px}
`;
(function(){ const st = document.createElement("style"); st.textContent = AB_CSS; document.head.append(st); })();

const abPct = p => (p * 100).toFixed(1) + "%";
const abCls = c => c.n < AB_MIN_N ? "ab-c0" : c.acc < .6 ? "ab-c1" : c.acc < .7 ? "ab-c2" : c.acc < .8 ? "ab-c3" : c.acc < .9 ? "ab-c4" : "ab-c5";

// 50%〜100% のゲージ。帯＝合格ラインの幅、赤線＝合格ライン、青＝予想（薄い帯は誤差の幅）
function abGauge(acc, ci, pass, band){
  const x = p => `${clamp((p - 0.5) / 0.5, 0, 1) * 100}%`;
  return h("div", { class: "ab-g" },
    h("div", { class: "tr" }),
    band ? h("div", { class: "band", style: `left:${x(band[0])};width:calc(${x(band[1])} - ${x(band[0])})` }) : null,
    h("div", { class: "ci", style: `left:${x(acc - ci)};width:calc(${x(acc + ci)} - ${x(acc - ci)})` }),
    h("div", { class: "pl", style: `left:${x(pass)}` }), h("div", { class: "lb r", style: `left:${x(pass)}` }, `合格 ${Math.round(pass * 100)}%`),
    h("div", { class: "pt", style: `left:${x(acc)}` }),
    h("div", { class: "lb", style: "left:0;transform:none" }, "50%"), h("div", { class: "lb", style: "left:100%;transform:translateX(-100%)" }, "100%"));
}

// 偏差値の推移（SVG）。緑の帯＝目標
function abDevChart(mocks){
  const pts = mocks.filter(m => m.dev != null);
  const W = 520, H = 170, L = 34, R = 12, Tp = 10, B = 28, tg = abTarget();
  const vals = [...pts.map(m => m.dev), tg.lo, tg.hi];
  const lo = Math.floor((Math.min(...vals) - 3) / 5) * 5, hi = Math.ceil((Math.max(...vals) + 3) / 5) * 5;
  const y = v => Tp + (hi - v) / (hi - lo) * (H - Tp - B);
  const xs = i => pts.length < 2 ? (L + W - R) / 2 : L + i * (W - L - R) / (pts.length - 1);
  const NS = "http://www.w3.org/2000/svg", el = (t, a, txt) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; return e; };
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, style: "width:100%;height:auto;margin-top:8px" });
  svg.append(el("rect", { x: L, y: y(tg.hi), width: W - L - R, height: y(tg.lo) - y(tg.hi), fill: "color-mix(in srgb, var(--good) 16%, transparent)" }));
  for (let v = lo; v <= hi; v += 5){ svg.append(el("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: "var(--line)" })); svg.append(el("text", { x: L - 6, y: y(v) + 4, "text-anchor": "end", "font-size": 11, fill: "var(--muted)" }, String(v))); }
  svg.append(el("text", { x: L + 6, y: y(tg.hi) + 13, "text-anchor": "start", "font-size": 11, fill: "var(--good)", "font-weight": 700 }, `目標 ${tg.lo}〜${tg.hi}`));
  if (pts.length > 1) svg.append(el("polyline", { points: pts.map((m, i) => `${xs(i)},${y(m.dev)}`).join(" "), fill: "none", stroke: "var(--accent)", "stroke-width": 2.5 }));
  pts.forEach((m, i) => {
    svg.append(el("circle", { cx: xs(i), cy: y(m.dev), r: 4.5, fill: "var(--accent)" }));
    svg.append(el("text", { x: xs(i), y: y(m.dev) - 9, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: "var(--ink)" }, String(m.dev)));
    svg.append(el("text", { x: xs(i), y: H - 8, "text-anchor": "middle", "font-size": 10, fill: "var(--muted)" }, plMD(m.date)));
  });
  return svg;
}

/* ============================================================
   実力
   ============================================================ */
function viewPower(main){
  qx(); const P = pl(), A = abStats(), T = plToday();
  main.append(h("div", { class: "pl-hero" }, h("h1", {}, "実力"),
    h("span", { class: "cd" }, `QB分野別を初めて解いたときの正答率（初見正答率）から見ています · 初見 ${A.n.toLocaleString()}問`)));
  const wrap = h("div", { class: "pl-stack" }); main.append(wrap);

  // 予想得点メーター
  const sec = (title, S, pass, band, pts, note) => {
    const ok = S.acc >= pass, d = S.acc - pass;
    return h("div", { style: "margin-top:12px" },
      h("div", { class: "ab-sec" }, h("b", {}, title), h("span", { class: "v" }, abPct(S.acc)),
        h("span", { class: "muted small" }, `±${(S.ci * 100).toFixed(0)}% · 約${Math.round(S.acc * pts)}/${pts}点`),
        h("span", { class: "d " + (ok ? "pl-good" : "pl-bad") }, ok ? `合格ライン +${(d * 100).toFixed(1)}` : `合格ラインまで あと${(-d * 100).toFixed(1)}%`)),
      abGauge(S.acc, S.ci, pass, band),
      h("div", { class: "muted small" }, note));
  };
  const meter = h("div", { class: "panel" }, h("h2", { style: "margin:0" }, "予想得点メーター"));
  if (!A.n) meter.append(h("p", { class: "muted small", style: "margin:8px 0 0" }, "まだQB分野別の記録がありません。問題演習で解くと、ここに予想が出ます（初めは幅が広く、解くほど狭くなります）。"));
  meter.append(
    sec("必修", A.hisshu, AB_PASS.hisshu, null, AB_POINTS.hisshu, A.hisshu.n < 30 ? `Z 必修問題の初見はまだ ${A.hisshu.n}問。少ないうちは全体の正答率で補っています。必修は絶対基準（8割）で、ここを落とすと他が満点でも不合格。` : `Z 必修問題の初見 ${A.hisshu.n}問から。必修は絶対基準（8割）。`),
    sec("一般・臨床", A.gen, AB_PASS.gen, [AB_PASS.genLo, AB_PASS.genHi], AB_POINTS.gen, `必修以外の科の初見 ${A.gen.n.toLocaleString()}問から、出題の多さ（QBの問題数）で重みをつけて計算。合格ラインは相対基準で、直近5回は72〜77%（赤い帯）。`),
    h("p", { class: "muted small", style: "margin:10px 0 0" }, "※ 目安です。QBの初見正答率と本番の得点はおおむね近いと考えられますが、同じにはなりません。±は推定の誤差の幅（解いた問題が少ないほど広い）。"));
  wrap.append(meter);

  // 模試の推移
  const mocks = abMocks(), tg = abTarget(), last = mocks.filter(m => m.dev != null).at(-1);
  const mp = h("div", { class: "panel" }, h("div", { class: "row" }, h("h2", { style: "margin:0" }, "模試の偏差値"), h("div", { class: "spacer" }),
    last ? h("span", { class: "small", style: "font-weight:700" }, last.dev >= tg.lo ? h("span", { class: "pl-good" }, `目標圏内（${last.dev}）`) : `目標（${tg.lo}）まで あと +${(tg.lo - last.dev).toFixed(1)}`) : null));
  if (mocks.some(m => m.dev != null)) mp.append(abDevChart(mocks));
  else mp.append(h("p", { class: "muted small", style: "margin:8px 0 0" }, "模試の結果を記録すると、偏差値の推移が目標の帯（緑）と一緒にグラフになります。"));
  const list = h("div", { style: "margin-top:8px" });
  for (const m of mocks.slice().reverse()) list.append(h("div", { class: "ab-mock" },
    h("span", { style: "width:52px" }, plMD(m.date)), h("b", {}, m.name),
    h("span", {}, m.pct != null ? `${m.pct}%` : ""), h("span", {}, m.dev != null ? `偏差値 ${m.dev}` : ""), m.mean != null ? h("span", { class: "muted small" }, `平均 ${m.mean}%`) : null,
    h("button", { class: "x", title: "消す", onclick: () => { if (!confirm(`${m.name} の記録を消しますか？`)) return; P.tomb.push(m.id); P.mocks = P.mocks.filter(x => x.id !== m.id); markDirty(); route(true); } }, "✕")));
  const f = { date: h("input", { type: "date", value: T }), name: h("input", { type: "text", placeholder: "例：TECOM模試 第1回" }),
    pct: h("input", { type: "number", step: "0.1", placeholder: "例：72.5" }), dev: h("input", { type: "number", step: "0.1", placeholder: "例：55.2" }), mean: h("input", { type: "number", step: "0.1", placeholder: "任意" }) };
  const num = v => v === "" ? null : Math.round(parseFloat(v) * 10) / 10;
  const add = h("button", { class: "btn primary sm", onclick: () => {
    const name = f.name.value.trim(); if (!f.date.value || !name){ toast("日付と模試の名前を入れてください"); return; }
    const m = { id: "mk-" + Date.now().toString(36) + "-" + (Store.deviceId || "x"), date: f.date.value, name, pct: num(f.pct.value), dev: num(f.dev.value), mean: num(f.mean.value) };
    if (m.pct == null && m.dev == null){ toast("得点率か偏差値のどちらかを入れてください"); return; }
    (P.mocks ||= []).push(m); markDirty(); route(true); toast("模試の結果を記録しました"); } }, "記録する");
  const tlo = h("input", { type: "number", step: "1", value: String(tg.lo), style: "width:64px" }), thi = h("input", { type: "number", step: "1", value: String(tg.hi), style: "width:64px" });
  const setT = () => { const a = parseFloat(tlo.value), b = parseFloat(thi.value); if (isFinite(a) && isFinite(b) && a <= b){ P.settings.targetDevLo = a; P.settings.targetDevHi = b; markDirty(); route(true); } };
  tlo.addEventListener("change", setT); thi.addEventListener("change", setT);
  mp.append(list,
    h("div", { class: "ab-form" },
      h("label", {}, "日付", f.date), h("label", {}, "模試の名前", f.name), h("label", {}, "得点率（%）", f.pct), h("label", {}, "偏差値", f.dev), h("label", {}, "平均点（%）", f.mean)),
    h("div", { class: "row", style: "margin-top:8px;gap:8px" }, add, h("div", { class: "spacer" }), h("span", { class: "muted small" }, "目標の偏差値"), tlo, h("span", { class: "muted small" }, "〜"), thi));
  wrap.append(mp);

  // いま効く章
  // 必修（Z）は全科目が混ざった別枠で配点も大きく、並べると必ず1位になるので外す（必修はメーターで見る）
  const rank = A.chs.filter(c => c.id !== "HS" && (c.solved < c.total || c.acc < 0.9)).sort((a, z) => z.lost - a.lost).slice(0, 5);
  wrap.append(h("div", { class: "panel" }, h("h2", { style: "margin:0" }, "いま効く章"),
    h("p", { class: "muted small", style: "margin:4px 0 0" }, "一般・臨床（300点）のうち、本番でこの科から落としそうな点（推定）が大きい順。出題の多さ ×（1 − 初見正答率）で計算しています（必修は上のメーターで）。タップで問題演習へ。"),
    ...rank.map((c, i) => h("button", { class: "ab-rank", onclick: () => plOpenChapter("qb", c.id) },
      h("span", { class: "no" }, String(i + 1)),
      h("div", {}, h("div", { style: "font-weight:700" }, c.name),
        h("div", { class: "muted small" }, c.n < AB_MIN_N ? `未着手に近い（初見 ${c.n}問）· 全体の正答率で推定` : `初見正答率 ${Math.round(c.raw * 100)}%（${c.n}問）· 進み ${c.solved}/${c.total}問`)),
      h("span", { class: "pts" }, `−${c.lost.toFixed(1)}点`)))));

  // 苦手マップ
  const map = h("div", { class: "ab-map" }, ...A.chs.map(c => h("button", { class: "ab-t " + abCls(c), onclick: () => plOpenChapter("qb", c.id), title: `${c.name}：初見 ${c.n}問・正答率 ${c.raw == null ? "—" : Math.round(c.raw * 100) + "%"}・進み ${c.solved}/${c.total}問` + (c.ret != null ? `・記憶の残り ${Math.round(c.ret * 100)}%` : "") },
    h("div", { class: "nm" }, c.name),
    h("div", { class: "ac" }, c.n < AB_MIN_N ? "—" : Math.round(c.raw * 100) + "%"),
    h("div", { class: "sb" }, `${c.solved}/${c.total}問` + (c.ret != null ? ` · 記憶${Math.round(c.ret * 100)}%` : "")),
    h("div", { class: "pb" }, h("i", { style: `width:${c.solved / c.total * 100}%` })))));
  wrap.append(h("div", { class: "panel" }, h("h2", { style: "margin:0" }, "苦手マップ"),
    h("p", { class: "muted small", style: "margin:4px 0 0" }, "色＝初見正答率、下の線＝その科の進み、「記憶」＝解いた問題をいま覚えている見込み（忘却曲線から）。"),
    map,
    h("div", { class: "ab-leg" }, ...[["ab-c0", `データ不足（初見${AB_MIN_N}問未満）`], ["ab-c1", "〜60%"], ["ab-c2", "60〜70%"], ["ab-c3", "70〜80%"], ["ab-c4", "80〜90%"], ["ab-c5", "90%〜"]]
      .map(([k, l]) => h("span", {}, h("i", { class: k }), l)))));
}

VIEWS.power = viewPower;
{ const v = location.hash.slice(1); if (v === "power") route(true); }
