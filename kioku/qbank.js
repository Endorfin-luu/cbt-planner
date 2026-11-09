/* ============================================================
   問題演習（QB分野別・QB回数別）
   - 1問ずつ FSRS（忘却曲線）で「次に解き直す日」を決める
   - 解いた数・誤答数は 国試 Planner（../kokushi/）に自動で入る
     （Firestore の progress/kokushi_kioku_user1 に書き出し、国試 Planner が読み込む）
   index.html の後に読み込む。S・h・today() などは index.html のものを使う。
   ============================================================ */
"use strict";

// 科目IDは国試 Planner と共通。[id, 名前, 問題数]
const QX_BANKS = {
  qb: { name: "QB分野別", ch: [
    ["GI", "A 消化管", 291], ["LV", "B 肝・胆・膵", 195], ["CV", "C 循環器", 378], ["EN", "D 代謝・内分泌", 298],
    ["KD", "E 腎・泌尿器", 186], ["IM", "F 免疫・膠原病", 157], ["HE", "G 血液", 202], ["IF", "H 感染症", 239],
    ["RS", "I 呼吸器", 295], ["NR", "J 神経", 361], ["TX", "K 中毒", 63], ["ER", "L 救急", 136],
    ["AN", "M 麻酔科", 32], ["GN", "N 医学総論", 147], ["PE", "O 小児科", 423], ["GY", "P 婦人科", 204],
    ["OB", "Q 産科", 337], ["OP", "R 眼科", 151], ["EA", "S 耳鼻咽喉科", 151], ["OR", "T 整形外科", 152],
    ["PS", "U 精神科", 205], ["DE", "V 皮膚科", 150], ["UR", "W 泌尿器科", 150], ["RA", "X 放射線科", 53],
    ["PH", "Y 公衆衛生", 605], ["HS", "Z 必修問題", 1418]
  ] },
  // QB「回数別」＝国試の過去問ぜんぶ（第80〜120回）。番号はその回の何問目か
  kai: { name: "QB回数別", ch: (() => {
    const N = { 120: 400, 119: 400, 118: 400, 117: 400, 116: 400, 115: 400, 114: 400, 113: 400, 112: 400,
      111: 500, 110: 500, 109: 500, 108: 500, 107: 500, 106: 500, 105: 500, 104: 500, 103: 500, 102: 500, 101: 500,
      100: 530, 99: 530, 98: 530, 97: 550, 96: 550, 95: 550 };
    const out = []; for (let k = 120; k >= 80; k--) out.push(["K" + k, `第${k}回`, N[k] || 320]); return out;
  })() }
};
const QX_GRADE = { 1: "✗", 2: "△", 3: "○", 4: "◎" };
const QX_GRADE_LABEL = { 1: "まちがえた", 2: "迷った", 3: "正解", 4: "余裕" };

/* ---------- データ ----------
   S.qx.b[bank][chId][番号] = [安定度S, 難しさD, 最後に解いた日, 次に解く日, 解いた回数, 誤答回数, 最後の評価, メモ]
   S.qx.out[logId]          = 国試 Planner へ渡す記録 { id, d, b, c, r(何回目), n, w, t }  */
function qx(){
  if (!S.qx || typeof S.qx !== "object") S.qx = {};
  const x = S.qx;
  x.v ||= 1; x.ret ||= 0.85; x.maxIvl ||= 180; x.newGoal ??= 30;
  x.b ||= {}; for (const b in QX_BANKS) x.b[b] ||= {};
  x.out ||= {};
  x.rec ||= {};
  return x;
}
const qxChs = b => QX_BANKS[b].ch;
// 以前のモントレの記録は使わない（国試 Planner も v3 で外した）
const qxOutOk = l => l && QX_BANKS[l.b];
const qxCh = (b, id) => QX_BANKS[b].ch.find(c => c[0] === id);
const qxQs = (b, c) => (qx().b[b][c] ||= {});
function qxYmd(day){ const d = new Date(dayStartTs(day)); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

/** 評価 g（1〜4）で解いたあとの状態（元の e は変えない） */
function qxNext(e, g, day){
  const X = qx();
  let s, d, reps, lapses;
  if (!e){ s = FSRS_W[g - 1]; d = fD0(g); reps = 1; lapses = g === 1 ? 1 : 0; }
  else {
    const el = Math.max(0, day - e[2]);
    if (el < 1) s = fShortS(e[0], g);
    else { const r = fR(el, e[0]); s = g === 1 ? fForgetS(e[1], e[0], r) : fRecallS(e[1], e[0], r, g); }
    d = fNextD(e[1], g); reps = e[4] + 1; lapses = e[5] + (g === 1 ? 1 : 0);
  }
  s = clamp(s, 0.01, 36500);
  // まちがえた問題は翌日に解き直す。それ以外は想起確率が目標まで下がる日
  let ivl = g === 1 ? 1 : clamp(Math.round(fIvlRaw(s, X.ret)), 1, X.maxIvl);
  const out = [+s.toFixed(3), +d.toFixed(3), day, day + ivl, reps, lapses, g];
  if (e && e[7]) out[7] = e[7];
  return out;
}
function qxPreview(e, day){ const o = {}; for (const g of [1,2,3,4]) o[g] = qxNext(e, g, day)[3] - day; return o; }
const qxRecall = (e, day) => e ? fR(Math.max(0, day - e[2]), e[0]) : null;

/** 1問を記録して、取り消し用の情報を返す */
function qxGrade(b, c, num, g){
  const X = qx(), day = today(), qs = qxQs(b, c);
  const prev = qs[num] ? qs[num].slice() : null;
  const e = qxNext(prev, g, day);
  qs[num] = e;
  const id = `kx-${qxYmd(day)}-${b}-${c}-${Math.min(e[4], 9)}`;
  const log = X.out[id] ||= { id, d: qxYmd(day), b, c, r: Math.min(e[4], 9), n: 0, w: 0, t: Date.now() };
  log.n++; if (g === 1) log.w++; log.t = Date.now();
  X.hist ||= {}; const hd = X.hist[day] ||= [0, 0]; hd[0]++; if (g === 1) hd[1]++;
  return { b, c, num, prev, id, wrong: g === 1, day };
}
function qxUndo(items){
  const X = qx();
  for (const u of items.slice().reverse()){
    const qs = qxQs(u.b, u.c);
    if (u.prev) qs[u.num] = u.prev; else delete qs[u.num];
    const log = X.out[u.id]; if (log){ log.n = Math.max(0, log.n - 1); if (u.wrong) log.w = Math.max(0, log.w - 1); log.t = Date.now(); }
    const hd = X.hist?.[u.day]; if (hd){ hd[0] = Math.max(0, hd[0] - 1); if (u.wrong) hd[1] = Math.max(0, hd[1] - 1); }
  }
}
function qxChanged(){ markDirty(); qxScheduleExport(); }

/* ---------- 国試 Planner への書き出し ---------- */
let qxExportTimer = null;
function qxExportDoc(){
  const db = typeof firestore === "function" ? firestore() : null; if (!db) return null;
  return db.collection("progress").doc(IS_PROD ? "kokushi_kioku_user1" : "kokushi_kioku_localtest");
}
function qxScheduleExport(){ clearTimeout(qxExportTimer); qxExportTimer = setTimeout(qxExport, 1500); }
async function qxExport(){
  clearTimeout(qxExportTimer); qxExportTimer = null;
  const doc = qxExportDoc(); if (!doc) return;
  const logs = Object.values(qx().out).filter(l => l.n > 0 && qxOutOk(l));
  try { await doc.set({ v: 1, logs, updatedAt: new Date().toISOString() }); }
  catch(e){ console.warn("kokushi export failed", e); }
}
window.addEventListener("pagehide", () => { if (qxExportTimer) qxExport(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && qxExportTimer) qxExport(); });

/* ---------- 集計 ---------- */
function qxDue(b, day = today()){
  const out = [], order = {}; qxChs(b).forEach((c, i) => order[c[0]] = i);
  for (const [c, qs] of Object.entries(qx().b[b])) for (const [num, e] of Object.entries(qs)) if (e[3] <= day) out.push({ b, c, num: +num, due: e[3] });
  out.sort((a, z) => a.due - z.due || (order[a.c] ?? 99) - (order[z.c] ?? 99) || a.num - z.num);
  return out;
}
function qxChStats(b, c, day = today()){
  const qs = qx().b[b][c] || {}; let solved = 0, due = 0, ok = 0, rsum = 0;
  for (const e of Object.values(qs)){ solved++; if (e[3] <= day) due++; if (e[6] > 1) ok++; rsum += qxRecall(e, day); }
  return { solved, due, acc: solved ? ok / solved : null, rec: solved ? rsum / solved : null };
}
function qxNextNew(b, c){ const qs = qxQs(b, c); let k = 1; while (qs[k]) k++; return k; }
function qxToday(b){
  const t = qxYmd(today()); let n = 0, w = 0, nw = 0;
  for (const l of Object.values(qx().out)) if (l.d === t && (!b || l.b === b)){ n += l.n; w += l.w; if (l.r === 1) nw += l.n; }
  return { n, w, nw };
}

/* ---------- 画面 ---------- */
const QX_CSS = `
.qx-seg{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden}
.qx-seg button{border:0;background:var(--surface);padding:7px 16px;cursor:pointer;color:var(--ink2)}
.qx-seg button.on{background:var(--accent);color:var(--accent-ink);font-weight:700}
.qx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(54px,1fr));gap:6px;margin-top:10px}
.qx-q{position:relative;border:1px solid var(--line);background:var(--surface);border-radius:9px;padding:9px 0 7px;cursor:pointer;font-variant-numeric:tabular-nums;line-height:1.2;user-select:none;-webkit-user-select:none;touch-action:manipulation}
.qx-q b{display:block;font-size:1.05rem}
.qx-q small{display:block;font-size:.7rem;color:var(--muted)}
.qx-q.g1{background:var(--again);border-color:var(--again);color:#fff} .qx-q.g2{background:var(--hard);border-color:var(--hard);color:#fff} .qx-q.g4{background:var(--easy);border-color:var(--easy);color:#fff}
.qx-q.g1 small,.qx-q.g2 small,.qx-q.g4 small{color:#fff;opacity:.85}
[data-theme="dark"] .qx-q.g1,[data-theme="dark"] .qx-q.g2,[data-theme="dark"] .qx-q.g4,[data-theme="dark"] .qx-q.g1 small,[data-theme="dark"] .qx-q.g2 small,[data-theme="dark"] .qx-q.g4 small{color:#111}
.qx-q.seen::after{content:"";position:absolute;top:5px;right:5px;width:6px;height:6px;border-radius:50%;background:var(--rev)}
.qx-chrow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 10px;padding:9px 2px;border-bottom:1px solid var(--line);cursor:pointer}
.qx-chrow:last-child{border-bottom:0}
.qx-chrow .nm{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.qx-chrow .meta{font-size:.8rem;color:var(--ink2);text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.qx-bar{grid-column:1/-1;height:6px;border-radius:3px;background:var(--surface2);overflow:hidden;display:flex}
.qx-bar i{display:block;height:100%}
.qx-big{font-size:3.2rem;font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums;margin:6px 0}
.qx-stepper{display:inline-flex;align-items:center;gap:4px}
.qx-stepper input{width:76px;text-align:center}
.qx-legend{font-size:.8rem;color:var(--ink2)}
.qx-legend span{display:inline-block;min-width:22px;text-align:center;border-radius:5px;padding:0 4px;margin:0 2px}
`;
(function(){ const st = document.createElement("style"); st.textContent = QX_CSS; document.head.append(st); })();

const QXU = { bank: null, mode: "home", marks: {}, undo: null, queue: [], qi: 0, done: 0, shownAt: 0 };
function qxLS(k, v){ try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch(e){ return null; } }
function qxBank(){ if (!QXU.bank) QXU.bank = QX_BANKS[qxLS("kioku-qx-bank")] ? qxLS("kioku-qx-bank") : "qb"; return QXU.bank; }
function qxRecState(b){
  const X = qx(); const r = X.rec[b] ||= {};
  if (!qxCh(b, r.c)) r.c = qxChs(b)[0][0];
  r.count = clamp(parseInt(r.count) || 10, 1, 100);
  if (!(r.from >= 1)) r.from = qxNextNew(b, r.c);
  return r;
}

function viewDrill(main){
  qx();
  if (QXU.mode === "review") return viewDrillReview(main);
  const b = qxBank(), day = today(), X = qx();
  const due = qxDue(b, day), td = qxToday(b);
  let solved = 0, total = 0;
  for (const [c, , n] of qxChs(b)){ total += n; solved += Object.keys(X.b[b][c] || {}).length; }

  // 見出し
  const seg = h("div", { class: "qx-seg" }, ...Object.entries(QX_BANKS).map(([k, v]) =>
    h("button", { class: k === b ? "on" : "", onclick: () => { QXU.bank = k; qxLS("kioku-qx-bank", k); QXU.marks = {}; route(true); } }, v.name)));
  main.append(h("div", { class: "row", style: "margin-bottom:12px" }, h("h1", { style: "margin:0" }, "問題演習"), h("div", { class: "spacer" }), seg));

  // 今日
  const tiles = h("div", { class: "tiles" },
    h("div", { class: "tile" }, h("div", { class: "v r" }, String(due.length)), h("div", { class: "k" }, "今日の解き直し")),
    h("div", { class: "tile" }, h("div", { class: "v" }, String(td.n)), h("div", { class: "k" }, `今日解いた（新規 ${td.nw}・誤答 ${td.w}）`)),
    h("div", { class: "tile" }, h("div", { class: "v" }, `${Math.round(solved / Math.max(1, total) * 100)}%`), h("div", { class: "k" }, `1周目 ${solved.toLocaleString()} / ${total.toLocaleString()}問`)));
  const startBtn = h("button", { class: "btn primary", style: "width:100%;margin-top:12px;padding:12px", disabled: !due.length, onclick: () => qxStartReview(b) },
    due.length ? `解き直しをはじめる（${due.length}問）` : "今日の解き直しはありません");
  const dueByCh = {}; for (const q of due) (dueByCh[q.c] ||= []).push(q.num);
  const dueList = Object.keys(dueByCh).length ? h("div", { class: "small", style: "margin-top:10px;color:var(--ink2)" },
    ...Object.entries(dueByCh).map(([c, nums]) => h("div", {}, h("b", {}, qxCh(b, c)?.[1] || c), "：", nums.slice(0, 30).map(n => "#" + n).join(" ") + (nums.length > 30 ? ` ほか${nums.length - 30}問` : "")))) : null;
  main.append(h("div", { class: "panel" }, tiles, startBtn, dueList,
    h("p", { class: "muted small", style: "margin:10px 0 0" }, `記録した数は国試 Planner に自動で入ります（${QX_BANKS[b].name}・科目・何回目かごと）。`,
      h("a", { href: "../kokushi/" }, "国試 Planner を開く"))));

  main.append(qxRecordPanel(b));
  main.append(qxChapterPanel(b, day));
  main.append(qxSettingsPanel());
}

/* 解いた問題をまとめて記録 */
function qxRecordPanel(b){
  const r = qxRecState(b), qs = qxQs(b, r.c), ch = qxCh(b, r.c);
  const panel = h("div", { class: "panel", id: "qx-rec", style: "margin-top:14px" });
  const chSel = h("select", { style: "flex:1;min-width:0" }, ...qxChs(b).map(([id, name, n]) => {
    const st = qxChStats(b, id); return h("option", { value: id, selected: id === r.c }, `${name}（${st.solved}/${n}）`);
  }));
  chSel.addEventListener("change", () => { r.c = chSel.value; r.from = qxNextNew(b, r.c); QXU.marks = {}; markDirty(); route(true); });
  const fromIn = h("input", { type: "number", min: "1", inputmode: "numeric", value: String(r.from) });
  fromIn.addEventListener("change", () => { r.from = Math.max(1, parseInt(fromIn.value) || 1); QXU.marks = {}; markDirty(); route(true); });
  const cntIn = h("input", { type: "number", min: "1", max: "100", inputmode: "numeric", value: String(r.count) });
  const setCount = v => { r.count = clamp(v, 1, 100); QXU.marks = {}; markDirty(); route(true); };
  cntIn.addEventListener("change", () => setCount(parseInt(cntIn.value) || 10));
  const last = Math.min(ch[2], r.from + r.count - 1);
  const grid = h("div", { class: "qx-grid" });
  const nums = []; for (let k = r.from; k <= last; k++) nums.push(k);
  const recBtn = h("button", { class: "btn primary", style: "width:100%;margin-top:12px;padding:12px" });
  const updBtn = () => {
    const c = { 1: 0, 2: 0, 4: 0 }; for (const k of nums) { const g = QXU.marks[k] || 3; if (c[g] != null) c[g]++; }
    recBtn.textContent = nums.length ? `${nums.length}問を記録（✗${c[1]}・△${c[2]}・◎${c[4]}）` : "この科目は最後まで記録済みです";
    recBtn.disabled = !nums.length;
  };
  for (const k of nums){
    const e = qs[k];
    const btn = h("div", { class: "qx-q", role: "button" }, h("b", {}, String(k)), h("small", {}, "○"));
    const paint = () => { const g = QXU.marks[k] || 3; btn.className = "qx-q g" + g + (e ? " seen" : ""); btn.lastChild.textContent = QX_GRADE[g]; };
    btn.addEventListener("click", () => { const cyc = { 3: 1, 1: 2, 2: 4, 4: 3 }; QXU.marks[k] = cyc[QXU.marks[k] || 3]; paint(); updBtn(); });
    paint(); grid.append(btn);
  }
  recBtn.addEventListener("click", () => {
    const items = nums.map(k => qxGrade(b, r.c, k, QXU.marks[k] || 3));
    const wrong = items.filter(i => i.wrong).length;
    QXU.undo = { items, label: `${ch[1]} #${r.from}〜#${last}` };
    QXU.marks = {}; r.from = qxNextNew(b, r.c);
    qxChanged(); route(true); toast(`${items.length}問を記録しました（誤答 ${wrong}）`);
  });
  updBtn();
  const undoBtn = QXU.undo ? h("button", { class: "btn sm", onclick: () => { qxUndo(QXU.undo.items); toast(`取り消しました：${QXU.undo.label}`); QXU.undo = null; qxChanged(); route(true); } }, `直前の記録を取り消す（${QXU.undo.label}）`) : null;
  panel.append(
    h("h2", {}, "解いた問題を記録"),
    h("p", { class: "muted small", style: "margin-top:-4px" }, `${QX_BANKS[b].name}で解いた範囲を選び、まちがえた問題だけタップ。タップするたびに `,
      h("span", { class: "qx-legend" }, h("span", {}, "○正解"), "→", h("span", { style: "background:var(--again);color:#fff" }, "✗"), "→", h("span", { style: "background:var(--hard);color:#fff" }, "△迷った"), "→", h("span", { style: "background:var(--easy);color:#fff" }, "◎余裕")),
      " と変わります。緑の点は前にも解いた問題です。"),
    h("div", { class: "row" }, chSel),
    h("div", { class: "row", style: "margin-top:8px" },
      h("label", { class: "small" }, "開始 #"), fromIn,
      h("span", { class: "spacer" }),
      h("label", { class: "small" }, "問題数"),
      h("span", { class: "qx-stepper" }, h("button", { class: "btn sm", onclick: () => setCount(r.count - 5) }, "−5"), cntIn, h("button", { class: "btn sm", onclick: () => setCount(r.count + 5) }, "+5"))),
    h("div", { class: "muted small", style: "margin-top:6px" }, nums.length ? `#${r.from} 〜 #${last}（全${ch[2]}問）` : `全${ch[2]}問`),
    grid, recBtn, undoBtn ? h("div", { style: "margin-top:8px;text-align:center" }, undoBtn) : null);
  return panel;
}

/* 科目ごとの進み具合 */
function qxChapterPanel(b, day){
  const panel = h("div", { class: "panel", style: "margin-top:14px" }, h("h2", {}, "科目ごと"),
    h("p", { class: "muted small", style: "margin-top:-4px" }, "バー：緑＝いま思い出せそう（想起確率70%以上）・橙＝忘れかけ・灰＝まだ解いていない。タップで記録する科目を切り替えます。"));
  for (const [c, name, n] of qxChs(b)){
    const qs = qx().b[b][c] || {}; let good = 0, weak = 0;
    for (const e of Object.values(qs)) (qxRecall(e, day) >= 0.7 ? good++ : weak++);
    const st = qxChStats(b, c, day);
    const meta = [`${st.solved}/${n}`];
    if (st.due) meta.push(`解き直し ${st.due}`);
    if (st.acc != null) meta.push(`正答 ${Math.round(st.acc * 100)}%`);
    const row = h("div", { class: "qx-chrow", onclick: () => { const r = qxRecState(b); r.c = c; r.from = qxNextNew(b, c); QXU.marks = {}; markDirty(); route(true); setTimeout(() => $("#qx-rec")?.scrollIntoView({ behavior: "smooth" }), 30); } },
      h("div", { class: "nm" }, name), h("div", { class: "meta" }, meta.join(" · ")),
      h("div", { class: "qx-bar" }, h("i", { style: `width:${good / n * 100}%;background:var(--good)` }), h("i", { style: `width:${weak / n * 100}%;background:#d98a1e` })));
    panel.append(row);
  }
  return panel;
}

function qxSettingsPanel(){
  const X = qx();
  const ret = h("select", {}, ...[0.8, 0.85, 0.9, 0.95].map(v => h("option", { value: String(v), selected: Math.abs(X.ret - v) < 1e-6 }, `${Math.round(v * 100)}%`)));
  ret.addEventListener("change", () => { X.ret = parseFloat(ret.value); markDirty(); toast("保存しました（次に記録した問題から反映）"); });
  const mx = h("input", { type: "number", min: "7", max: "3650", value: String(X.maxIvl), style: "width:90px" });
  mx.addEventListener("change", () => { X.maxIvl = clamp(parseInt(mx.value) || 180, 7, 3650); markDirty(); toast("保存しました"); });
  return h("details", { class: "panel", style: "margin-top:14px" }, h("summary", { style: "cursor:pointer;font-weight:700" }, "問題演習の設定としくみ"),
    h("div", { class: "row", style: "margin-top:10px" }, h("label", {}, "目標の正答率"), ret, h("span", { class: "muted small" }, "この確率まで下がる日に解き直しを入れます。上げると解き直しが増えます")),
    h("div", { class: "row", style: "margin-top:8px" }, h("label", {}, "最大の間隔（日）"), mx, h("span", { class: "muted small" }, "どんなに簡単な問題でもこの日数以内にもう一度出します")),
    h("p", { class: "small", style: "margin-bottom:0" }, "1問ずつ忘却曲線（FSRS）で「いつ忘れそうか」を推定します。✗ は翌日、△ は短め、○ は数日後、◎ は2週間ほど後に最初の解き直しが来て、正解を重ねるほど間隔が延びます。",
      "国試 Planner には「何回目に解いたか」を周回として記録します（1回目＝1周目、解き直し1回目＝2周目…。計画の周回数を超える分は最後の周回に数えます）。"));
}

/* ---------- 解き直し（1問ずつ） ---------- */
function qxStartReview(b){
  QXU.queue = qxDue(b); QXU.qi = 0; QXU.done = 0; QXU.mode = "review"; QXU.reviewUndo = [];
  route(true);
}
function viewDrillReview(main){
  const b = qxBank(), day = today();
  // 途中で別の端末の変更が入っても、もう期日でない問題は飛ばす
  while (QXU.qi < QXU.queue.length){ const q = QXU.queue[QXU.qi]; const e = qx().b[b][q.c]?.[q.num]; if (e && e[3] <= day) break; QXU.qi++; }
  const back = () => { QXU.mode = "home"; route(true); };
  if (QXU.qi >= QXU.queue.length){
    main.append(h("div", { class: "panel empty" }, h("h2", {}, "今日の解き直しはおわりです"),
      h("p", { class: "muted" }, `${QXU.done}問を解き直しました。`),
      h("button", { class: "btn primary", onclick: back }, "問題演習にもどる")));
    return;
  }
  const q = QXU.queue[QXU.qi], qs = qxQs(b, q.c), e = qs[q.num], ch = qxCh(b, q.c);
  const pv = qxPreview(e, day), rec = qxRecall(e, day);
  const memo = h("input", { type: "text", value: e?.[7] || "", placeholder: "問題IDメモ（例：117A12）", style: "width:min(100%,260px);text-align:center;margin-top:10px" });
  memo.addEventListener("change", () => { const cur = qs[q.num]; if (!cur) return; const v = memo.value.trim().slice(0, 40); if (v) cur[7] = v; else cur.length = 7; markDirty(); });
  const answer = g => {
    if (memo.value.trim() !== (e?.[7] || "")) { const v = memo.value.trim().slice(0, 40); if (v) qs[q.num][7] = v; }
    QXU.reviewUndo.push({ item: qxGrade(b, q.c, q.num, g), qi: QXU.qi, done: QXU.done });
    QXU.done++; QXU.qi++;
    // ✗ でもこのセッションには戻さない（翌日にまわる）
    qxChanged(); route(true);
  };
  const info = e ? `前回 ${QX_GRADE[e[6]]}（${day - e[2] === 0 ? "今日" : (day - e[2]) + "日前"}）・${e[4]}回解いた・誤答 ${e[5]}回・いまの想起確率 ${Math.round(rec * 100)}%` : "まだ解いていない問題";
  main.append(h("div", { class: "study" },
    h("div", { class: "counts" }, h("span", { class: "r cur" }, `${QXU.qi + 1} / ${QXU.queue.length}`)),
    h("div", { class: "cardbox" },
      h("div", { class: "muted small" }, QX_BANKS[b].name),
      h("div", { style: "font-size:1.25rem;font-weight:700;margin-top:4px" }, ch?.[1] || q.c),
      h("div", { class: "qx-big" }, "#" + q.num),
      memo,
      h("div", { class: "muted small", style: "margin-top:14px" }, info),
      h("div", { class: "muted small", style: "margin-top:4px" }, `${QX_BANKS[b].name}アプリでこの問題を解いてから、結果を押してください`)),
    h("div", { class: "answerbar" },
      ...[1, 2, 3, 4].map(g => h("button", { class: "ease e" + g, onclick: () => answer(g) }, `${QX_GRADE[g]} ${QX_GRADE_LABEL[g]}`, h("small", {}, fmtDays(pv[g]) + "後")))),
    h("div", { class: "studytools" },
      h("button", { class: "btn sm", onclick: () => { QXU.queue.push(QXU.queue.splice(QXU.qi, 1)[0]); route(true); } }, "あとで"),
      QXU.reviewUndo.length ? h("button", { class: "btn sm", onclick: () => { const u = QXU.reviewUndo.pop(); qxUndo([u.item]); QXU.qi = u.qi; QXU.done = u.done; qxChanged(); route(true); } }, "元に戻す") : null,
      h("button", { class: "btn sm", onclick: back }, "終了"))));
}
document.addEventListener("keydown", e => {
  if (currentView !== "drill" || QXU.mode !== "review" || e.target.closest("input,textarea,select") || e.metaKey || e.ctrlKey || e.altKey) return;
  const g = { "1": 1, "2": 2, "3": 3, "4": 4 }[e.key]; if (!g) return;
  const btn = document.querySelector(".answerbar .ease.e" + g); if (btn){ e.preventDefault(); btn.click(); }
});

/* ---------- 組み込み ---------- */
VIEWS.drill = viewDrill;
// 別の画面へ移ったら解き直しモードを抜ける
window.addEventListener("hashchange", () => { if (location.hash.slice(1) !== "drill") QXU.mode = "home"; });
if (location.hash.slice(1) === "drill") route(true);
// 起動時に一度、国試 Planner へ書き出す（クラウドの読み込みを待ってから）
setTimeout(() => { if (Object.keys(qx().out).length) qxExport(); }, 6000);
