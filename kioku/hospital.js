/* ============================================================
   病院（育成・アップグレード）
   - 部門（QBの科をまとめたもの）のレベルは「本物の実力」が条件：進み・初見正答率・記憶の残り・2周目。
     条件を満たしたうえで DP（診療ポイント）を払うとアップグレードできる
   - DP は勉強の記録から毎回計算し直す（QB・初見の正解・カード・ノルマ達成×連続記録コンボ）。
     施設を強化するとDPの倍率が上がる。倍率はその日のうちだけ変わり、日が変わると固定（P.hosp.mult）
   - 記憶の残りが70%を切った部門（Lv3以上）は「休診」。休診が1つあるごとにその日のDPが5%減る
   - 病院ランクは部門レベルの合計と、実力タブの予想得点・模試の偏差値で決まる
   - 当直＝QB回数別の1回分。全問を解いて初見正答率75%以上で制覇、報酬のDPを受け取れる
   状態は S.pl.hosp に入れる（今日・計画と一緒に同期）。ability.js の後に読み込む。
   ============================================================ */
"use strict";

const HP_DEPTS = [
  { id: "gi",   name: "消化器センター",       icon: "🫃", chs: ["GI", "LV"] },
  { id: "cv",   name: "循環器センター",       icon: "🫀", chs: ["CV"] },
  { id: "rs",   name: "呼吸器センター",       icon: "🫁", chs: ["RS"] },
  { id: "nr",   name: "脳神経センター",       icon: "🧠", chs: ["NR"] },
  { id: "en",   name: "内分泌・腎臓内科",     icon: "🧪", chs: ["EN", "KD"] },
  { id: "hi",   name: "血液・免疫・感染症科", icon: "🩸", chs: ["HE", "IM", "IF"] },
  { id: "er",   name: "救命救急センター",     icon: "🚑", chs: ["ER", "TX", "AN"] },
  { id: "mc",   name: "周産期・小児センター", icon: "👶", chs: ["PE", "OB", "GY"] },
  { id: "sx",   name: "感覚器・運動器外科",   icon: "🦴", chs: ["OR", "OP", "EA", "UR"] },
  { id: "dp",   name: "皮膚・精神・放射線科", icon: "🩻", chs: ["DE", "PS", "RA"] },
  { id: "gm",   name: "総合診療・公衆衛生",   icon: "🏛️", chs: ["HS", "GN", "PH"] }
];
// 部門レベルの条件（Lv2〜10）。p は 0〜1 の進み、ok は達成
const HP_LV = [
  null,
  { t: "初見で10問解く",                 p: s => s.n / 10 },
  { t: "進み10%",                        p: s => s.cov / 0.10 },
  { t: "進み25%",                        p: s => s.cov / 0.25 },
  { t: "進み50%・初見正答率65%",          p: s => Math.min(s.cov / 0.50, s.acc / 0.65) },
  { t: "進み75%・初見正答率70%",          p: s => Math.min(s.cov / 0.75, s.acc / 0.70) },
  { t: "1周（100%）・初見正答率75%",      p: s => Math.min(s.cov, s.acc / 0.75) },
  { t: "初見正答率80%・記憶の残り80%",    p: s => Math.min(s.acc / 0.80, (s.ret ?? 0) / 0.80) },
  { t: "2周目50%・記憶の残り85%",         p: s => Math.min(s.cov2 / 0.50, (s.ret ?? 0) / 0.85) },
  { t: "2周目100%・最新の正解率90%",      p: s => Math.min(s.cov2, s.lastOK / 0.90) },
  { t: "初見正答率85%・記憶の残り90%（名医）", p: s => Math.min(s.acc / 0.85, (s.ret ?? 0) / 0.90) }
];
const HP_LV_COST = [0, 0, 30, 60, 120, 200, 320, 480, 700, 1000, 1500];
const HP_FAC = [
  { id: "opd",   name: "外来",             icon: "🏥", desc: lv => `QBを解いたDP ×${(1 + 0.2 * lv).toFixed(1)}` },
  { id: "xray",  name: "画像診断センター", icon: "🩻", desc: lv => `初見で正解したDP ×${(1 + 0.5 * lv).toFixed(1)}` },
  { id: "lib",   name: "医学図書室",       icon: "📚", desc: lv => `カードのDP ×${(1 + 0.2 * lv).toFixed(1)}` },
  { id: "duty",  name: "当直室",           icon: "🛏️", desc: lv => `ノルマ達成ボーナス ×${(1 + 0.2 * lv).toFixed(1)}` },
  { id: "train", name: "研修センター",     icon: "🎓", desc: lv => `連続記録コンボの上限 ${30 + 10 * lv}日（最大 ×${(1 + 0.02 * (30 + 10 * lv)).toFixed(1)}）` }
];
const HP_FAC_MAX = 5, HP_FAC_COST = [80, 200, 450, 900, 1600];
const HP_RANKS = [
  { name: "診療所",       icon: "🏠", need: "はじまり" },
  { name: "地域の病院",   icon: "🏘️", need: "部門レベル合計 15",                         ok: (L, A) => L >= 15 },
  { name: "総合病院",     icon: "🏢", need: "部門レベル合計 40・予想 一般臨床70%",        ok: (L, A) => L >= 40 && A.gen.acc >= 0.70 },
  { name: "大学病院",     icon: "🏫", need: "部門レベル合計 70・予想が合格ライン超え（必修80%・一般臨床75%）", ok: (L, A) => L >= 70 && A.hisshu.acc >= 0.80 && A.gen.acc >= 0.75 },
  { name: "特定機能病院", icon: "🏰", need: "部門レベル合計 95・模試の偏差値が目標以上",  ok: (L, A, dev, tg) => L >= 95 && dev != null && dev >= tg }
];
const HP_BOSS_PASS = 0.75, HP_QUOTA_BONUS = 30;

/* ---------- 状態 ---------- */
function hp(){
  const P = pl();
  const H = P.hosp ||= {};
  H.name ||= "わたしの病院"; H.lv ||= {}; H.fac ||= {}; H.spent ||= 0; H.bonus ||= 0; H.mult ||= {}; H.boss ||= {}; H.seen ||= {};
  return H;
}
const hpFac = id => hp().fac[id] || 0;
const hpLv = id => hp().lv[id] || 0;

/* ---------- 部門の実力 ---------- */
function hpDeptStats(){
  const logs = plLogs().filter(l => l.b === "qb" && l.r === 1 && l.w != null), by = {};
  let N = 0, W = 0;
  for (const l of logs){ const C = by[l.c] ||= { n: 0, w: 0 }; C.n += l.n; C.w += l.w; N += l.n; W += l.w; }
  const prior = N ? (N - W) / N : 0.7, day = today(), Q = qx().b.qb || {};
  return HP_DEPTS.map(D => {
    let total = 0, n = 0, w = 0, solved = 0, rsum = 0, two = 0, ok = 0;
    for (const c of D.chs){
      total += qxCh("qb", c)[2]; n += (by[c] || {}).n || 0; w += (by[c] || {}).w || 0;
      for (const e of Object.values(Q[c] || {})){ solved++; rsum += fR(Math.max(0, day - e[2]), e[0]); if (e[4] >= 2) two++; if (e[6] >= 2) ok++; }
    }
    const s = { ...D, total, n, w, solved, cov: solved / total, cov2: two / total, acc: (n - w + 15 * prior) / (n + 15), ret: solved ? rsum / solved : null, lastOK: solved ? ok / solved : 0 };
    s.lv = hpLv(D.id);
    s.closed = s.lv >= 3 && s.ret != null && s.ret < 0.70;
    const nx = HP_LV[s.lv + 1];
    s.next = nx ? { lv: s.lv + 1, t: nx.t, p: clamp(nx.p(s), 0, 1), cost: HP_LV_COST[s.lv + 1] } : null;
    // 練習先：その部門でいちばん進んでいない章
    s.train = D.chs.map(c => ({ c, r: Object.keys(Q[c] || {}).length / qxCh("qb", c)[2] })).sort((a, z) => a.r - z.r)[0].c;
    return s;
  });
}

/* ---------- DP ---------- */
function hpMultNow(closedN){
  return { q: 1 + 0.2 * hpFac("opd"), f: 1 + 0.5 * hpFac("xray"), c: 1 + 0.2 * hpFac("lib"), b: 1 + 0.2 * hpFac("duty"),
    cap: 30 + 10 * hpFac("train"), pen: Math.max(0.5, 1 - 0.05 * (closedN || 0)) };
}
const HP_M1 = { q: 1, f: 1, c: 1, b: 1, cap: 30, pen: 1 };
// 日ごとのDP。返り値 { days: { ymd: { dp, q, f, c, b, combo } }, earned, today }
function hpLedger(X, closedN){
  const H = hp(), T = X.T, base = {};
  const B = d => base[d] ||= { q: 0, f: 0, c: 0 };
  for (const l of X.logs){ const o = B(l.d); o.q += l.n; if (l.r === 1 && l.w != null) o.f += l.n - l.w; }
  for (const [d, c] of Object.entries(X.cards)) B(d).c += c.n + 0.2 * c.r;
  const st = plStreak(X);
  // 今日の倍率は施設の強化に合わせて変わる。日が変わったら固定。変わったときだけ保存する
  const mNow = hpMultNow(closedN);
  if (JSON.stringify(H.mult[T]) !== JSON.stringify(mNow)){ H.mult[T] = mNow; markDirty(); }
  const days = {}; let earned = 0, run = 0, carry = HP_M1;
  const all = Object.keys(base).filter(d => d <= T).sort();
  if (all.length) for (let d = all[0]; d <= T; d = plAdd(d, 1)){
    const s = st.status[d];
    // 今日はまだ途中でもコンボは切らない（達成したら +1）
    if (s === "done") run++; else if (s !== "rest" && d !== T) run = 0;
    if (H.mult[d]) carry = H.mult[d];            // 画面を開かなかった日は、その前に記録した倍率を使う
    const o = base[d]; if (!o) continue;
    const m = H.mult[d] || carry, ok = s === "done";
    const combo = 1 + 0.02 * Math.min(run, m.cap);
    const dp = Math.round(((o.q * m.q) + (o.f * m.f) + (o.c * m.c) + (ok ? HP_QUOTA_BONUS * m.b : 0)) * combo * m.pen);
    days[d] = { dp, ...o, ok, combo, run };
    earned += dp;
  }
  return { days, earned, today: days[T] || { dp: 0, combo: 1 + 0.02 * Math.min(run, H.mult[T].cap), run } };
}

/* ---------- 当直（回数別） ---------- */
function hpBosses(){
  const logs = plLogs().filter(l => l.b === "kai" && l.r === 1 && l.w != null), by = {};
  for (const l of logs){ const C = by[l.c] ||= { n: 0, w: 0 }; C.n += l.n; C.w += l.w; }
  const K = qx().b.kai || {};
  return QX_BANKS.kai.ch.filter(([id]) => +id.slice(1) >= 112).map(([id, name, total]) => {
    const C = by[id] || { n: 0, w: 0 }, solved = Object.keys(K[id] || {}).length;
    const acc = C.n ? (C.n - C.w) / C.n : null, done = solved >= total;
    const state = !solved ? "未着手" : !done ? "進行中" : acc >= HP_BOSS_PASS ? "制覇" : "惜敗";
    const reward = 300 + (acc != null && acc > HP_BOSS_PASS ? Math.round((acc - HP_BOSS_PASS) * 2000) : 0);
    return { id, name, total, solved, acc, state, reward, claimed: !!hp().boss[id] };
  });
}

/* ---------- まとめ ---------- */
function hpCtx(){
  const X = plCtx(), A = typeof abStats === "function" ? abStats() : null, depts = hpDeptStats();
  const closed = depts.filter(d => d.closed), L = depts.reduce((a, d) => a + d.lv, 0);
  const led = hpLedger(X, closed.length), H = hp();
  const balance = Math.floor(led.earned + H.bonus - H.spent);
  const mk = typeof abMocks === "function" ? abMocks().filter(m => m.dev != null).at(-1) : null, tg = typeof abTarget === "function" ? abTarget().lo : 55;
  let rank = 0; for (let i = 1; i < HP_RANKS.length; i++){ if (A && HP_RANKS[i].ok(L, A, mk ? mk.dev : null, tg)) rank = i; else break; }
  const ready = depts.filter(d => d.next && d.next.p >= 1 && balance >= d.next.cost).length;
  return { X, A, depts, closed, L, led, H, balance, rank, ready, dev: mk ? mk.dev : null, tg };
}

/* ---------- 見た目 ---------- */
const HP_CSS = `
.hp-top{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center}
.hp-rk{font-size:2.4rem;line-height:1}
.hp-nm{font-size:1.15rem;font-weight:700;border:0;background:none;color:var(--ink);padding:0;width:100%;font-family:inherit}
.hp-dp{text-align:right}
.hp-dp .v{font-size:1.7rem;font-weight:800;font-variant-numeric:tabular-nums;color:#c8860d}
.hp-dp .v small{font-size:.85rem;font-weight:600;color:var(--ink2);margin-left:2px}
.hp-ranks{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-top:12px;text-align:center}
.hp-ranks>div{border:1px solid var(--line);border-radius:9px;padding:6px 2px;font-size:.68rem;color:var(--muted);background:var(--surface2)}
.hp-ranks>div.on{background:color-mix(in srgb,#c8860d 16%,var(--surface));color:var(--ink);font-weight:700;border-color:#c8860d}
.hp-ranks>div.past{color:var(--ink2);background:var(--surface)}
.hp-ranks .i{font-size:1.3rem}
.hp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px;margin-top:10px}
.hp-d{border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--surface);display:grid;gap:6px}
.hp-d.closed{border-color:var(--again);background:color-mix(in srgb,var(--again) 6%,var(--surface))}
.hp-d.ready{border-color:#c8860d;box-shadow:0 0 0 2px color-mix(in srgb,#c8860d 25%,transparent)}
.hp-d .hd{display:flex;align-items:center;gap:8px}
.hp-d .ic{font-size:1.6rem}
.hp-d .nm{font-weight:700;font-size:.9rem;line-height:1.25}
.hp-d .lv{margin-left:auto;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}
.hp-st{letter-spacing:1px;font-size:.72rem;color:#c8860d}
.hp-st .off{color:var(--line)}
.hp-d .rq{font-size:.75rem;color:var(--ink2)}
.hp-d .row2{display:flex;gap:6px;align-items:center}
.hp-d .row2 .btn{white-space:nowrap}
.hp-tag{font-size:.68rem;font-weight:700;border-radius:6px;padding:1px 6px;color:#fff;background:var(--again)}
.hp-fac{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line)}
.hp-fac:last-child{border-bottom:0}
.hp-fac .ic{font-size:1.5rem;width:34px;text-align:center}
.hp-boss{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px dashed var(--line)}
.hp-boss .st{font-size:.72rem;font-weight:700;border-radius:6px;padding:2px 7px;white-space:nowrap}
.hp-boss .st.s0{background:var(--surface2);color:var(--muted)} .hp-boss .st.s1{background:var(--accent-soft);color:var(--accent)}
.hp-boss .st.s2{background:color-mix(in srgb,var(--good) 18%,transparent);color:var(--good)} .hp-boss .st.s3{background:color-mix(in srgb,var(--again) 14%,transparent);color:var(--again)}
.hp-strip{display:flex;align-items:center;gap:10px;border:1px solid color-mix(in srgb,#c8860d 45%,var(--line));background:color-mix(in srgb,#c8860d 7%,var(--surface));border-radius:12px;padding:10px 12px;cursor:pointer;width:100%;text-align:left;font:inherit;color:var(--ink)}
.hp-strip .big{font-size:1.5rem}
.hp-pop{animation:hpPop .6s ease}
@keyframes hpPop{0%{transform:scale(1)}40%{transform:scale(1.04)}100%{transform:scale(1)}}
`;
(function(){ const st = document.createElement("style"); st.textContent = HP_CSS; document.head.append(st); })();
const hpStars = lv => h("span", { class: "hp-st" }, "★".repeat(lv), h("span", { class: "off" }, "★".repeat(10 - lv)));
const hpDP = n => Math.floor(n).toLocaleString();

/* ============================================================
   病院
   ============================================================ */
function viewHospital(main){
  qx(); const C = hpCtx(), { H, depts, led, balance, rank, A } = C;
  const R = HP_RANKS[rank], N = HP_RANKS[rank + 1];
  main.append(h("div", { class: "pl-hero" }, h("h1", {}, "病院"),
    h("span", { class: "cd" }, "勉強で稼いだDPで病院を大きくする。部門のレベルは本物の実力が条件。")));
  const wrap = h("div", { class: "pl-stack" }); main.append(wrap);

  // 病院の顔
  const nm = h("input", { class: "hp-nm", value: H.name, maxlength: "24", "aria-label": "病院の名前" });
  nm.addEventListener("change", () => { H.name = nm.value.trim() || "わたしの病院"; markDirty(); });
  const td = led.today;
  wrap.append(h("div", { class: "panel" },
    h("div", { class: "hp-top" }, h("div", { class: "hp-rk" }, R.icon),
      h("div", {}, nm, h("div", { class: "muted small" }, `${R.name} · 部門レベル合計 ${C.L}/110`)),
      h("div", { class: "hp-dp" }, h("div", { class: "v" }, hpDP(balance), h("small", {}, "DP")),
        h("div", { class: "muted small" }, `今日 +${hpDP(td.dp)} · コンボ ×${td.combo.toFixed(2)}`))),
    h("div", { class: "hp-ranks" }, ...HP_RANKS.map((r, i) => h("div", { class: i === rank ? "on" : i < rank ? "past" : "" }, h("div", { class: "i" }, r.icon), r.name))),
    N ? h("div", { class: "small", style: "margin-top:10px" }, h("b", {}, `次のランク「${N.name}」：`), N.need,
      !A || !A.n ? h("span", { class: "muted" }, "（予想得点はQBを解くと出ます）") : null) : h("div", { class: "small pl-good", style: "margin-top:10px" }, "🏰 最高ランク到達！この状態で本番を迎えよう"),
    C.closed.length ? h("div", { class: "pl-banner r", style: "margin-top:10px" },
      `🚨 休診中の部門が ${C.closed.length}つ（${C.closed.map(d => d.name).join("・")}）。記憶の残りが70%を切っています。今日のDPが ${Math.round((1 - hpMultNow(C.closed.length).pen) * 100)}% 減っています。解き直しで再開しよう。`) : null));

  // 部門
  const grid = h("div", { class: "hp-grid" });
  for (const d of depts){
    const nx = d.next, canReq = nx && nx.p >= 1, canPay = nx && balance >= nx.cost;
    const up = nx ? h("button", { class: "btn sm" + (canReq && canPay ? " primary" : ""), disabled: !(canReq && canPay), onclick: () => {
      H.lv[d.id] = nx.lv; H.spent += nx.cost; markDirty(); route(true);
      toast(`${d.icon} ${d.name} が Lv${nx.lv} になった！${nx.lv === 10 ? " 名医の部門だ！" : ""}`);
    } }, canReq ? (nx.lv === 1 ? "開設する" : `Lv${nx.lv}へ（${nx.cost}DP）`) : nx.lv === 1 ? "🔒 未開設" : `🔒 ${nx.cost}DP`) : null;
    grid.append(h("div", { class: "hp-d" + (d.closed ? " closed" : "") + (canReq && canPay ? " ready" : "") },
      h("div", { class: "hd" }, h("span", { class: "ic" }, d.icon), h("div", {}, h("div", { class: "nm" }, d.name), hpStars(d.lv)),
        h("span", { class: "lv" }, d.lv ? `Lv${d.lv}` : "未開設")),
      d.closed ? h("div", {}, h("span", { class: "hp-tag" }, "休診中"), h("span", { class: "rq" }, ` 記憶の残り ${Math.round(d.ret * 100)}% → 解き直しで再開`)) : null,
      h("div", { class: "rq" }, `進み ${Math.round(d.cov * 100)}% · 初見正答率 ${d.n ? Math.round((d.n - d.w) / d.n * 100) + "%" : "—"}` + (d.ret != null ? ` · 記憶 ${Math.round(d.ret * 100)}%` : "") + (d.cov2 ? ` · 2周目 ${Math.round(d.cov2 * 100)}%` : "")),
      nx ? h("div", {}, h("div", { class: "rq" }, `次の条件：${nx.t}`),
        h("div", { class: "pl-pb", style: "margin-top:4px" }, h("i", { style: `width:${nx.p * 100}%;background:${nx.p >= 1 ? "var(--good)" : "#c8860d"}` }))) : h("div", { class: "rq pl-good" }, "👑 最大レベル"),
      h("div", { class: "row2" }, up, h("div", { class: "spacer" }),
        h("button", { class: "btn sm", onclick: () => plOpenChapter("qb", d.train) }, "鍛える →"))));
  }
  wrap.append(h("div", { class: "panel" }, h("h2", { style: "margin:0" }, "部門"),
    h("p", { class: "muted small", style: "margin:4px 0 0" }, "条件（実力）を満たして、DPを払うとレベルアップ。「鍛える」でその部門のいちばん進んでいない章を開きます。記憶の残りが70%を切るとLv3以上の部門は休診。"),
    grid));

  // 施設
  const fac = h("div", { class: "panel" }, h("h2", { style: "margin:0" }, "施設"),
    h("p", { class: "muted small", style: "margin:4px 0 0" }, "DPの稼ぎを増やす。強化した日から効きます（過去の日の稼ぎは変わりません）。"));
  for (const f of HP_FAC){
    const lv = hpFac(f.id), cost = HP_FAC_COST[lv], max = lv >= HP_FAC_MAX;
    fac.append(h("div", { class: "hp-fac" }, h("span", { class: "ic" }, f.icon),
      h("div", { style: "flex:1" }, h("div", {}, h("b", {}, f.name), h("span", { class: "muted small" }, ` Lv${lv}/${HP_FAC_MAX}`)),
        h("div", { class: "muted small" }, max ? f.desc(lv) : `${f.desc(lv)} → ${f.desc(lv + 1)}`)),
      max ? h("span", { class: "small pl-good" }, "MAX") : h("button", { class: "btn sm" + (balance >= cost ? " primary" : ""), disabled: balance < cost, onclick: () => {
        H.fac[f.id] = lv + 1; H.spent += cost; markDirty(); route(true); toast(`${f.icon} ${f.name} を Lv${lv + 1} に強化した`); } }, `${cost}DP`)));
  }
  wrap.append(fac);

  // 当直
  const bosses = hpBosses(), bl = h("div", {});
  const sCls = { "未着手": "s0", "進行中": "s1", "制覇": "s2", "惜敗": "s3" };
  for (const b of bosses) bl.append(h("div", { class: "hp-boss" },
    h("span", { class: "st " + sCls[b.state] }, b.state),
    h("div", { style: "flex:1" }, h("b", {}, `${b.name}の当直`), h("div", { class: "muted small" }, `${b.solved}/${b.total}問` + (b.acc != null ? ` · 初見正答率 ${Math.round(b.acc * 100)}%` : "") + ` · 制覇の報酬 ${b.reward}DP`)),
    b.state === "制覇" ? (b.claimed ? h("span", { class: "small pl-good" }, "受取済み") : h("button", { class: "btn sm primary", onclick: () => { H.boss[b.id] = true; H.bonus += b.reward; markDirty(); route(true); toast(`🏆 ${b.name}の当直を制覇！ +${b.reward}DP`); } }, "報酬を受け取る"))
      : h("button", { class: "btn sm", onclick: () => plOpenChapter("kai", b.id) }, b.state === "未着手" ? "挑む →" : "続き →")));
  wrap.append(h("div", { class: "panel" }, h("h2", { style: "margin:0" }, "当直（ボス）"),
    h("p", { class: "muted small", style: "margin:4px 0 0" }, `QB回数別の1回分（400問）が1つの当直。全問を解いて初見正答率${Math.round(HP_BOSS_PASS * 100)}%以上で制覇。正答率が高いほど報酬が増えます。分野別を進めてからの腕試しに。`), bl));

  // DPのしくみ
  const m = hpMultNow(C.closed.length);
  wrap.append(h("div", { class: "panel" }, h("h2", { style: "margin:0" }, "DPのしくみ"),
    h("div", { class: "small", style: "margin-top:6px;line-height:1.8" },
      `QB 1問 ${m.q.toFixed(1)}DP ＋ 初見で正解 ${m.f.toFixed(1)}DP ＋ カード新規 ${m.c.toFixed(1)}DP（復習は ${(0.2 * m.c).toFixed(2)}DP）＋ ノルマ達成 ${Math.round(HP_QUOTA_BONUS * m.b)}DP`, h("br"),
      `これに連続記録コンボ（1日 +2%、上限 ${m.cap}日）を掛けます。休診の部門が1つあるごとに −5%。`, h("br"),
      h("span", { class: "muted" }, "DPは勉強の記録から毎回計算し直すので、記録を取り消すとDPも減ります。"))));
}

/* ---------- 今日画面への導線 ---------- */
function hpStrip(){
  const C = hpCtx(), R = HP_RANKS[C.rank], td = C.led.today;
  return h("button", { class: "hp-strip", onclick: () => go("hospital") },
    h("span", { class: "big" }, R.icon),
    h("div", { style: "flex:1;min-width:0" }, h("div", { style: "font-weight:700" }, `${C.H.name}（${R.name}）`),
      h("div", { class: "muted small" }, `今日 +${hpDP(td.dp)}DP · 残高 ${hpDP(C.balance)}DP` + (C.ready ? ` · ⬆ アップグレードできる部門 ${C.ready}` : "") + (C.closed.length ? ` · 🚨 休診 ${C.closed.length}` : ""))),
    h("span", { class: "muted" }, "→"));
}
{
  const orig = VIEWS.today;
  VIEWS.today = main => {
    orig(main);
    try { const stack = main.querySelector(".pl-stack"); const first = stack && [...stack.children].find(e => e.querySelector?.(".pl-qs")); if (first) first.after(hpStrip()); } catch(e){ console.warn(e); }
  };
}
VIEWS.hospital = viewHospital;
{ const v = location.hash.slice(1); if (v === "hospital" || v === "today" || !v) route(true); }
