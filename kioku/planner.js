/* ============================================================
   今日・計画（旧「国試 Planner」を Kioku に統合したもの）
   - QB の解いた数は「問題演習」の記録（S.qx.out）をそのまま使う
   - 計画・設定・週の目標は S.pl に入れ、Kioku のデータと一緒に同期する
   - 旧 国試 Planner の記録（localStorage / Firestore progress/kokushi_user1）は初回に一度だけ取り込む
   qbank.js の後に読み込む。S・h・today()・qx() などは index.html / qbank.js のものを使う。
   ============================================================ */
"use strict";

const PL_GROUPS = { major: "メジャー（内科・外科）", pedob: "小児・産婦", minor: "マイナー・救急", public: "公衆衛生", hisshu: "必修・総論",
  k_new: "直近5回（116〜120回）", k_mid: "111〜115回", k_101: "101〜110回", k_old: "100回以前" };
const PL_QB_GROUP = { GI: "major", LV: "major", CV: "major", EN: "major", KD: "major", IM: "major", HE: "major", IF: "major", RS: "major", NR: "major",
  TX: "minor", ER: "minor", AN: "minor", GN: "hisshu", PE: "pedob", GY: "pedob", OB: "pedob", OP: "minor", EA: "minor", OR: "minor",
  PS: "minor", DE: "minor", UR: "minor", RA: "minor", PH: "public", HS: "hisshu" };
const PL_COLOR = { qb: "var(--accent)", kai: "var(--good)" };
const PL_BANKS = () => Object.keys(QX_BANKS);

/* ---------- 日付（Kioku の「1日の始まり」に合わせる） ---------- */
const plPad = n => String(n).padStart(2, "0");
const plYmd = d => `${d.getFullYear()}-${plPad(d.getMonth() + 1)}-${plPad(d.getDate())}`;
const plParse = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const plAdd = (s, n) => { const d = plParse(s); d.setDate(d.getDate() + n); return plYmd(d); };
const plDiff = (a, b) => Math.round((plParse(b) - plParse(a)) / 86400000);
const plWeek = s => { const d = plParse(s); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return plYmd(d); };
const PL_DOW = ["日", "月", "火", "水", "木", "金", "土"];
const plMD = s => { const d = plParse(s); return `${d.getMonth() + 1}/${d.getDate()}`; };
const plMDW = s => { const d = plParse(s); return `${d.getMonth() + 1}/${d.getDate()}(${PL_DOW[d.getDay()]})`; };
const plYM = s => { const d = plParse(s); return `${d.getFullYear()}年${d.getMonth() + 1}月`; };
const plToday = () => qxYmd(today());

/* ---------- データ ---------- */
function pl(){
  if (!S.pl || typeof S.pl !== "object") S.pl = {};
  const p = S.pl;
  p.settings = Object.assign({ examDate: "2029-02-03", minDaily: 5, restPerWeek: 1, rot: "", rotUntil: "" }, p.settings || {});
  p.plan ||= {};
  p.plan.qb ||= [{ due: "2028-03-31", wrongOnly: false }, { due: "2028-09-30", wrongOnly: false }, { due: "2028-12-31", wrongOnly: true }];
  p.plan.kai ||= [{ due: "2029-01-15", wrongOnly: false }];
  p.logs ||= []; p.tomb ||= []; p.weekGoals ||= {};
  return p;
}
const plPlan = b => pl().plan[b];
function plChs(b){
  return QX_BANKS[b].ch.map(([id, name, n]) => ({ id, name, n,
    group: b === "qb" ? (PL_QB_GROUP[id] || "major") : (() => { const k = +id.slice(1); return k >= 116 ? "k_new" : k >= 111 ? "k_mid" : k >= 101 ? "k_101" : "k_old"; })() }));
}
const plCh = (b, id) => plChs(b).find(c => c.id === id);
// 問題演習の記録＋旧 Planner から取り込んだ記録。周回は計画の周回数までに丸める
function plLogs(){
  const P = pl(), out = [];
  for (const l of Object.values(qx().out)) if (l && l.n > 0 && QX_BANKS[l.b]) out.push({ ...l, r: clamp(l.r || 1, 1, P.plan[l.b].length), kx: true });
  const tomb = new Set(P.tomb);
  for (const l of P.logs) if (l && QX_BANKS[l.b] && !tomb.has(l.id)) out.push({ ...l, r: clamp(l.r || 1, 1, P.plan[l.b].length) });
  return out;
}

/* ---------- 集計（旧 国試 Planner と同じ考え方） ---------- */
function plIndex(logs, excludeDate){
  const idx = {}; for (const b of PL_BANKS()) idx[b] = {};
  for (const l of logs){
    if (excludeDate && l.d >= excludeDate) continue;
    const R = idx[l.b][l.r] ||= {};
    const C = R[l.c] ||= { n: 0, w: 0, wn: 0, last: "" };
    C.n += l.n; if (l.w != null){ C.w += l.w; C.wn += l.n; }
    if (l.d > C.last) C.last = l.d;
  }
  return idx;
}
function plTarget(idx, b, r, ch){
  const p = plPlan(b)[r - 1];
  if (r === 1 || !p || !p.wrongOnly) return ch.n;
  const prevT = plTarget(idx, b, r - 1, ch), prev = (idx[b][r - 1] || {})[ch.id];
  if (prev && prev.wn > 0) return Math.min(prevT, Math.round(prevT * prev.w / prev.wn));
  return Math.round(prevT * 0.3);
}
const plDone = (idx, b, r, c) => ((idx[b][r] || {})[c] || { n: 0 }).n;
function plRound(idx, b, r){
  let tot = 0, done = 0;
  for (const ch of plChs(b)){ const t = plTarget(idx, b, r, ch); tot += t; done += Math.min(t, plDone(idx, b, r, ch.id)); }
  return { tot, done, rem: Math.max(0, tot - done) };
}
function plCurRoundCh(idx, b, ch){ const P = plPlan(b); for (let r = 1; r <= P.length; r++) if (plDone(idx, b, r, ch.id) < plTarget(idx, b, r, ch)) return r; return P.length; }
function plCurRound(idx, b){ const P = plPlan(b); for (let r = 1; r <= P.length; r++) if (plRound(idx, b, r).rem > 0) return r; return P.length; }
const plEff = days => Math.max(1, days * (7 - pl().settings.restPerWeek) / 7);
function plPace(idx, b, T){
  let cum = 0, need = 0; const rows = [];
  plPlan(b).forEach((p, i) => {
    const st = plRound(idx, b, i + 1); cum += st.rem;
    const days = plDiff(T, p.due) + 1, overdue = days <= 0 && st.rem > 0;
    if (!overdue && days > 0) need = Math.max(need, cum / plEff(days));
    rows.push({ r: i + 1, ...st, days, overdue, cum });
  });
  return { need, rows };
}
const plTotals = logs => { const m = {}; for (const l of logs) m[l.d] = (m[l.d] || 0) + l.n; return m; };
function plStreak(totals, T){
  const { minDaily: min, restPerWeek: rest } = pl().settings;
  const dates = Object.keys(totals).filter(d => totals[d] > 0).sort();
  const status = {};
  if (!dates.length) return { cur: 0, best: 0, status, studyDays: 0, restLeft: rest };
  let cur = 0, best = 0, wk = "", used = 0;
  for (let d = dates[0]; d <= T; d = plAdd(d, 1)){
    const ws = plWeek(d); if (ws !== wk){ wk = ws; used = 0; }
    const t = totals[d] || 0;
    if (t >= min){ cur++; status[d] = "done"; }
    else if (d === T) status[d] = t > 0 ? "part" : "";
    else if (used < rest && cur > 0){ used++; status[d] = t > 0 ? "part" : "rest"; }
    else { cur = 0; status[d] = t > 0 ? "part" : "miss"; }
    best = Math.max(best, cur);
  }
  return { cur, best, status, studyDays: dates.length, first: dates[0], restLeft: Math.max(0, rest - used) };
}
function plPhase(T){
  const m = plDiff(T, pl().settings.examDate) / 30.44;
  const phases = [
    { k: "base", name: "🌱 土台づくり期", from: 99, to: 15, desc: "実習で回っている科をQBで少しずつ。大事なのは量より「毎日ゼロにしない」こと。最低ラインだけの日があってOK。" },
    { k: "r1", name: "🚶 1周目完走期", from: 15, to: 9, desc: "QB分野別の1周目を全科目そろえる時期。苦手科目は後回しにせず、週に1回は触れておく。" },
    { k: "r2", name: "🏃 2周目・模試期", from: 9, to: 4, desc: "分野別の2周目と回数別の通し演習で定着。模試の結果で弱い科目を計画に戻す。" },
    { k: "fin", name: "🎯 仕上げ期", from: 4, to: 1, desc: "誤答の解き直し・必修・公衆衛生を厚めに。新しい問題集には手を広げない。" },
    { k: "last", name: "🔥 直前期", from: 1, to: -99, desc: "必修と誤答の最終確認。生活リズムを本番に合わせる。" },
  ];
  return { phases, cur: phases.find(p => m <= p.from && m > p.to) || phases[phases.length - 1], months: m };
}
function plRot(T){ const s = pl().settings; return s.rot && !(s.rotUntil && s.rotUntil < T) ? s.rot : ""; }

/* ---------- 問題演習へ移動 ---------- */
function plOpenChapter(b, c){
  QXU.bank = b; qxLS("kioku-qx-bank", b); QXU.mode = "home"; QXU.marks = {};
  const r = qxRecState(b); r.c = c; r.from = qxNextNew(b, c); markDirty();
  go("drill"); setTimeout(() => $("#qx-rec")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
}

/* ---------- 見た目 ---------- */
const PL_CSS = `
.pl-hero{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:12px}
.pl-hero h1{margin:0}
.pl-hero .cd{font-size:.9rem;color:var(--ink2)}
.pl-hero .cd b{font-size:1.25rem;color:var(--ink);font-variant-numeric:tabular-nums}
.pl-stack{display:grid;gap:14px}
.pl-big{font-size:2.6rem;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}
.pl-big small{font-size:1rem;font-weight:400;color:var(--ink2);margin-left:4px}
.pl-bar{position:relative;height:10px;border-radius:5px;background:var(--surface2);border:1px solid var(--line);overflow:visible;margin:12px 0 18px}
.pl-bar>i{display:block;height:100%;border-radius:5px;background:var(--accent)}
.pl-bar .mk{position:absolute;top:-4px;width:2px;height:16px;background:var(--ink2)}
.pl-bar .ml{position:absolute;top:14px;transform:translateX(-50%);font-size:.7rem;color:var(--ink2);white-space:nowrap}
.pl-pb{height:7px;border-radius:4px;background:var(--surface2);overflow:hidden;flex:1}
.pl-pb>i{display:block;height:100%;border-radius:4px}
.pl-sug{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:1px solid var(--line);background:var(--surface);border-radius:11px;padding:10px 12px;margin-top:8px;cursor:pointer}
.pl-sug:hover{background:var(--surface2)}
.pl-sug .tag{font-size:.72rem;font-weight:700;border-radius:6px;padding:2px 7px;white-space:nowrap;color:#fff}
.pl-sug .nm{font-weight:700}
.pl-sug .sb{font-size:.8rem;color:var(--ink2)}
.pl-sug .go{margin-left:auto;color:var(--muted)}
.pl-bk{font-size:.72rem;font-weight:700;border-radius:5px;padding:1px 6px;margin-right:4px;white-space:nowrap}
.pl-bk.qb{background:var(--accent-soft);color:var(--accent)}
.pl-bk.kai{background:color-mix(in srgb,var(--good) 16%,transparent);color:var(--good)}
.pl-week{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;text-align:center;margin-top:10px}
.pl-week .dot{width:34px;height:34px;margin:0 auto;border-radius:50%;display:grid;place-items:center;font-size:.8rem;font-weight:700;border:1px solid var(--line);background:var(--surface2);color:var(--ink2)}
.pl-week .dot.done{background:var(--good);border-color:var(--good);color:#fff}
.pl-week .dot.part{background:color-mix(in srgb,var(--good) 25%,var(--surface));}
.pl-week .dot.rest{background:color-mix(in srgb,var(--accent) 15%,var(--surface))}
.pl-week .dot.miss{color:var(--muted)}
.pl-week .dot.today{outline:2px solid var(--accent);outline-offset:2px}
.pl-week .dl{font-size:.72rem;color:var(--muted);margin-top:3px}
.pl-banner{border-radius:11px;padding:10px 12px;font-size:.9rem;border:1px solid var(--line);background:var(--surface2)}
.pl-banner.y{background:color-mix(in srgb,#d98a1e 12%,var(--surface))}
.pl-banner.r{background:color-mix(in srgb,var(--again) 10%,var(--surface))}
.pl-badges{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}
.pl-badges span{font-size:.72rem;border:1px solid var(--line);border-radius:999px;padding:2px 8px;color:var(--muted)}
.pl-badges span.on{background:var(--accent-soft);color:var(--accent);border-color:transparent;font-weight:700}
.pl-phase{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-top:10px}
.pl-phase .b{height:6px;border-radius:3px;background:var(--surface2);border:1px solid var(--line)}
.pl-phase .on .b{background:var(--accent);border-color:var(--accent)}
.pl-phase .past .b{background:var(--muted);border-color:var(--muted)}
.pl-phase .lb{font-size:.68rem;color:var(--muted);margin-top:4px;line-height:1.3}
.pl-phase .on .lb{color:var(--ink);font-weight:700}
.pl-cmp{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px;text-align:center}
.pl-cmp>div{border:1px solid var(--line);border-radius:10px;padding:8px 2px}
.pl-cmp .v{font-size:1.4rem;font-weight:700;font-variant-numeric:tabular-nums}
.pl-cmp .l{font-size:.72rem;color:var(--ink2);line-height:1.3}
.pl-round{border:1px solid var(--line);border-radius:11px;padding:10px 12px;margin-top:8px}
.pl-round .hd{display:flex;align-items:center;gap:8px}
.pl-round .hd input{margin-left:auto}
.pl-round .m{font-size:.82rem;color:var(--ink2);margin-top:6px}
.pl-good{color:var(--good);font-weight:700} .pl-warn{color:#c47a12;font-weight:700} .pl-bad{color:var(--again);font-weight:700}
.pl-hm{display:grid;grid-template-rows:repeat(7,1fr);grid-auto-flow:column;gap:3px;margin-top:8px}
.pl-hm i{display:block;aspect-ratio:1;border-radius:3px;background:var(--surface2);border:1px solid var(--line)}
.pl-hm i.l1{background:color-mix(in srgb,var(--good) 25%,var(--surface))} .pl-hm i.l2{background:color-mix(in srgb,var(--good) 50%,var(--surface))}
.pl-hm i.l3{background:color-mix(in srgb,var(--good) 75%,var(--surface))} .pl-hm i.l4{background:var(--good)}
.pl-hm i.rest{background:color-mix(in srgb,var(--accent) 15%,var(--surface))} .pl-hm i.fut{opacity:.35} .pl-hm i.td{outline:2px solid var(--accent)}
.pl-mb{display:grid;grid-template-columns:repeat(12,1fr);gap:4px;align-items:end;height:110px;margin-top:10px}
.pl-mb .c{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;font-size:.65rem;color:var(--muted)}
.pl-mb .c i{display:block;width:70%;background:var(--accent);border-radius:3px 3px 0 0;min-height:1px}
.pl-entry{display:flex;align-items:center;gap:6px;font-size:.85rem;padding:4px 0;border-bottom:1px dashed var(--line)}
.pl-entry .x{margin-left:auto;border:0;background:none;color:var(--muted);cursor:pointer}
.pl-lday{display:flex;justify-content:space-between;font-weight:700;margin-top:10px;font-size:.9rem}
.pl-set{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line)}
.pl-set:last-child{border-bottom:0}
.pl-set .lab{flex:1} .pl-set .lab small{display:block;color:var(--muted);font-size:.78rem}
`;
(function(){ const st = document.createElement("style"); st.textContent = PL_CSS; document.head.append(st); })();

const plBk = b => h("span", { class: "pl-bk " + b }, QX_BANKS[b].name);
function plCtx(){
  const T = plToday(), logs = plLogs();
  return { T, logs, totals: plTotals(logs), idx: plIndex(logs), idxM: plIndex(logs, T) };
}
const plPaceSum = (idx, T) => PL_BANKS().reduce((a, b) => a + plPace(idx, b, T).need, 0);

/* ============================================================
   今日
   ============================================================ */
function viewToday(main){
  qx(); const P = pl(), s = P.settings, X = plCtx(), { T, logs, totals, idx, idxM } = X;
  const left = plDiff(T, s.examDate), ph = plPhase(T);
  main.append(h("div", { class: "pl-hero" }, h("h1", {}, "今日"),
    h("span", { class: "cd" }, `${plMDW(T)} · 国試まで `, h("b", {}, left >= 0 ? String(left) : "—"), ` 日 · ${ph.cur.name} · 本番 ${plYM(s.examDate)}`)));
  const wrap = h("div", { class: "pl-stack" }); main.append(wrap);

  // バナー
  const st = plStreak(totals, T), y = plAdd(T, -1), yt = totals[y] || 0, tt = totals[T] || 0;
  let banner = null;
  if (!logs.length) banner = h("div", { class: "pl-banner" }, `👋 国試まで約${Math.round(ph.months)}か月。まずは毎日 ${s.minDaily}問だけ。下の「今日なにやる？」から科目を選ぶと、問題演習の記録欄が開きます。`);
  else if (yt < s.minDaily && tt < s.minDaily && st.status[y] === "rest") banner = h("div", { class: "pl-banner y" }, `🛌 昨日は休み券を使いました。休みは2日続けないのが続けるコツ。今日は ${s.minDaily}問だけでもやっておこう。`);
  else if (st.cur === 0 && st.best > 0 && tt < s.minDaily) banner = h("div", { class: "pl-banner r" }, `連続記録が切れてしまいました。気にしなくて大丈夫、今日 ${s.minDaily}問で新しくスタートできます（これまでの最長 ${st.best}日）。`);
  if (banner) wrap.append(banner);

  // 今日の問題数
  const done = tt, min = s.minDaily, pace = Math.ceil(plPaceSum(idxM, T)), goal = Math.max(min, pace);
  const scale = Math.max(goal, done, 1), mp = Math.min(100, min / scale * 100);
  let msg;
  if (done === 0){ const hr = new Date().getHours(); msg = hr < 12 ? `まずは最低ラインの ${min}問だけ。始めてしまえば続きも解けます。` : hr < 20 ? `まだ0問。${min}問だけ解けば今日も連続記録がつながります。` : `今日はあと少し。${min}問だけ解いて連続記録をつなげよう。`; }
  else if (done < min) msg = `あと ${min - done}問で今日の最低ラインです。`;
  else if (done < goal) msg = `✅ 最低ラインクリア！連続記録はつながりました。余裕があれば計画ペースまであと ${goal - done}問。`;
  else msg = "🎉 今日の目安クリア！ここで終わっても十分、続けるなら明日の貯金に。";
  wrap.append(h("div", { class: "panel" },
    h("div", { class: "row" }, h("div", {}, h("div", { class: "muted small" }, "今日解いたQB"), h("div", { class: "pl-big" }, String(done), h("small", {}, "問"))),
      h("div", { class: "spacer" }), h("div", { style: "text-align:right" }, h("div", { class: "muted small" }, "今日の目安"), h("div", { style: "font-size:1.5rem;font-weight:700" }, goal + "問"),
        h("div", { class: "muted small" }, `最低ライン ${min}問 · 計画ペース ${pace}問`))),
    h("div", { class: "pl-bar" }, h("i", { style: `width:${Math.min(100, done / scale * 100)}%` }), h("span", { class: "mk", style: `left:calc(${mp}% - 1px)` }), h("span", { class: "ml", style: `left:${mp}%` }, "最低")),
    h("div", { class: "small" }, msg)));

  // 今日の復習（カード＋QB解き直し）
  const ci = buildIndex(); let cn = 0, cr = 0;
  for (const d of rootDecks()){ const c = deckCounts(d.id, ci); cn += c.n; cr += c.r + c.l; }
  const qd = PL_BANKS().map(b => [b, qxDue(b).length]);
  wrap.append(h("div", { class: "panel" }, h("h2", {}, "今日の復習"),
    h("div", { class: "tiles" },
      h("div", { class: "tile", style: "cursor:pointer", onclick: () => go("decks") }, h("div", { class: "v", style: "color:var(--rev)" }, String(cr)), h("div", { class: "k" }, `カードの復習（新規 ${cn}）→ デッキ`)),
      ...qd.map(([b, n]) => h("div", { class: "tile", style: "cursor:pointer", onclick: () => { QXU.bank = b; qxLS("kioku-qx-bank", b); QXU.mode = "home"; go("drill"); } },
        h("div", { class: "v", style: "color:var(--learn)" }, String(n)), h("div", { class: "k" }, `${QX_BANKS[b].name}の解き直し → 問題演習`))))));

  // 今日なにやる？
  const sug = plSuggest(idx, T);
  wrap.append(h("div", { class: "panel" }, h("h2", {}, "今日なにやる？"),
    h("p", { class: "muted small", style: "margin:-4px 0 0" }, "タップすると問題演習の記録欄がその科目で開きます。"),
    ...(sug.length ? sug : [h("p", { class: "muted" }, "すべての周回が終わっています。計画タブで周回を追加できます。")])));

  // 連続記録
  const ws = plWeek(T);
  const dots = [...Array(7)].map((_, i) => {
    const d = plAdd(ws, i), t = totals[d] || 0;
    const cls = d > T || !st.first || d < st.first ? (t ? "part" : "") : (st.status[d] || (t ? "part" : (d < T ? "miss" : "")));
    const icon = cls === "done" ? "✓" : cls === "rest" ? "🛌" : cls === "miss" ? "·" : t ? String(t) : "";
    return h("div", {}, h("div", { class: "dot " + cls + (d === T ? " today" : "") }, icon), h("div", { class: "dl" }, PL_DOW[plParse(d).getDay()]));
  });
  const doneDays = [...Array(7)].map((_, i) => plAdd(ws, i)).filter(d => d <= T && (totals[d] || 0) >= min).length;
  wrap.append(h("div", { class: "panel" },
    h("div", { class: "row" }, h("h2", { style: "margin:0" }, "連続記録"), h("div", { class: "spacer" }), s.restPerWeek ? h("span", { class: "muted small" }, `今週の休み券 残り${st.restLeft ?? s.restPerWeek}枚`) : null),
    h("div", { class: "tiles", style: "margin-top:10px" },
      h("div", { class: "tile" }, h("div", { class: "v" }, "🔥 " + st.cur), h("div", { class: "k" }, "連続日数")),
      h("div", { class: "tile" }, h("div", { class: "v" }, String(st.best)), h("div", { class: "k" }, "最長")),
      h("div", { class: "tile" }, h("div", { class: "v" }, String(st.studyDays)), h("div", { class: "k" }, "勉強した日"))),
    h("div", { class: "pl-week" }, ...dots),
    h("div", { class: "muted small", style: "margin-top:6px" }, `今週は ${doneDays}日 最低ラインを達成。✓＝達成 🛌＝休み券 数字＝最低ライン未満`)));

  // 今週のひとこと目標
  const ta = h("textarea", { rows: "2", style: "width:100%", placeholder: "例：小児科を毎日10問" }); ta.value = P.weekGoals[ws] || "";
  ta.addEventListener("change", () => { P.weekGoals[ws] = ta.value.trim(); markDirty(); toast("今週の目標を保存しました"); });
  const lw = plAdd(ws, -7); let ltot = 0, ldays = 0, lprev = 0;
  for (let i = 0; i < 7; i++){ const t = totals[plAdd(lw, i)] || 0; ltot += t; if (t >= min) ldays++; lprev += totals[plAdd(lw, i - 7)] || 0; }
  const lg = P.weekGoals[lw];
  const review = ltot || lg ? h("div", { class: "small", style: "margin-top:8px;color:var(--ink2)" },
    `先週のふりかえり：${ltot}問・達成 ${ldays}/7日` + (lprev ? `（先々週より ${ltot >= lprev ? "+" : ""}${ltot - lprev}問）` : "") + (lg ? ` ／ 先週の目標「${lg}」` : "")) : null;
  wrap.append(h("div", { class: "panel" }, h("div", { class: "row" }, h("h2", { style: "margin:0" }, "今週のひとこと目標"), h("div", { class: "spacer" }), h("span", { class: "muted small" }, `${plMD(ws)}〜${plMD(plAdd(ws, 6))}`)),
    h("div", { style: "margin-top:8px" }, ta), review));

  // 全体の進み具合
  const ov = h("div", { class: "panel" }, h("h2", {}, "全体の進み具合"));
  for (const b of PL_BANKS()){
    const cr2 = plCurRound(idx, b);
    ov.append(h("div", { style: "margin-bottom:10px" }, h("div", { class: "small", style: "font-weight:700" }, plBk(b)),
      ...plPlan(b).map((p, i) => { const r = plRound(idx, b, i + 1), on = i + 1 === cr2;
        return h("div", { class: "row small", style: "margin-top:4px;gap:8px" }, h("span", { style: `width:64px;${on ? "" : "color:var(--muted)"}` }, `${i + 1}周目${p.wrongOnly ? "（誤）" : ""}`),
          h("div", { class: "pl-pb" }, h("i", { style: `width:${r.tot ? r.done / r.tot * 100 : 0}%;background:${PL_COLOR[b]};opacity:${on ? 1 : .5}` })),
          h("span", { style: "width:96px;text-align:right;font-variant-numeric:tabular-nums" }, `${r.done.toLocaleString()}/${r.tot.toLocaleString()}`)); })));
  }
  const total = logs.reduce((a, l) => a + l.n, 0), from30 = plAdd(T, -29);
  let w = 0, wn = 0; for (const l of logs) if (l.d >= from30 && l.w != null){ w += l.w; wn += l.n; }
  let s14 = 0; for (let i = 0; i < 14; i++) s14 += totals[plAdd(T, -i)] || 0;
  ov.append(h("div", { class: "tiles" },
    h("div", { class: "tile" }, h("div", { class: "v" }, total.toLocaleString()), h("div", { class: "k" }, "累計の問題数")),
    h("div", { class: "tile" }, h("div", { class: "v" }, wn ? Math.round((1 - w / wn) * 100) + "%" : "—"), h("div", { class: "k" }, "正答率（30日）")),
    h("div", { class: "tile" }, h("div", { class: "v" }, String(Math.round(s14 / 14))), h("div", { class: "k" }, "1日平均（14日）"))));
  wrap.append(ov);

  // 次の目標
  const MS_T = [50, 100, 300, 500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 30000], MS_S = [3, 7, 14, 30, 50, 100, 150, 200, 300, 365, 500, 730];
  const nt = MS_T.find(x => x > total), ns = MS_S.find(x => x > st.cur);
  wrap.append(h("div", { class: "panel" }, h("h2", {}, "次の目標"),
    nt ? h("div", { class: "small", style: "font-weight:700" }, `📘 累計 ${nt.toLocaleString()}問 まで あと ${(nt - total).toLocaleString()}問`) : null,
    nt ? h("div", { class: "pl-pb", style: "margin:6px 0 10px" }, h("i", { style: `width:${total / nt * 100}%;background:var(--accent)` })) : null,
    ns ? h("div", { class: "small", style: "font-weight:700" }, `🔥 ${ns}日連続 まで あと ${ns - st.cur}日`) : null,
    ns ? h("div", { class: "pl-pb", style: "margin-top:6px" }, h("i", { style: `width:${st.cur / ns * 100}%;background:var(--good)` })) : null,
    h("div", { class: "pl-badges" }, ...MS_S.slice(0, 10).map(x => h("span", { class: st.best >= x ? "on" : "" }, `🔥${x}日`)),
      ...MS_T.slice(1, 11).map(x => h("span", { class: total >= x ? "on" : "" }, `📘${x >= 1000 ? x / 1000 + "k" : x}`)))));
}

function plSuggest(idx, T){
  const out = [], seen = new Set();
  const item = (tag, color, b, ch, r, sub) => h("button", { class: "pl-sug", onclick: () => plOpenChapter(b, ch.id) },
    h("span", { class: "tag", style: `background:${color}` }, tag),
    h("div", {}, h("div", { class: "nm" }, plBk(b), ch.name, h("span", { class: "muted small" }, ` ${r}周目`)), h("div", { class: "sb" }, sub)),
    h("span", { class: "go" }, "→"));
  const add = (key, el) => { if (!seen.has(key) && out.length < 4){ seen.add(key); out.push(el); } };
  const rot = plRot(T);
  if (rot) for (const b of PL_BANKS()){
    const ch = plCh(b, rot); if (!ch) continue;
    const r = plCurRoundCh(idx, b, ch), t = plTarget(idx, b, r, ch), d = plDone(idx, b, r, ch.id);
    if (d < t) add(b + ch.id, item("実習中", "#14857a", b, ch, r, `残り ${t - d}問 · 実習と同じ科を解くと記憶に残りやすい`));
  }
  for (const b of PL_BANKS()){
    let best = null;
    for (const ch of plChs(b)){
      const r = plCurRoundCh(idx, b, ch), C = (idx[b][r] || {})[ch.id], t = plTarget(idx, b, r, ch);
      if (C && C.n > 0 && C.n < t && (!best || C.last > best.last)) best = { ch, r, last: C.last, rem: t - C.n };
    }
    if (best) add(b + best.ch.id, item("続きから", "var(--accent)", b, best.ch, best.r, `残り ${best.rem}問 · 最後に解いたのは ${plMD(best.last)}`));
  }
  const rev = [];
  for (const b of PL_BANKS()) for (const ch of plChs(b)){
    let last = "", w = 0, wn = 0, rounds = 0;
    for (const r in idx[b]){ const C = idx[b][r][ch.id]; if (!C) continue; rounds++; if (C.last > last) last = C.last; w += C.w; wn += C.wn; }
    if (!last || wn < 10) continue;
    const acc = 1 - w / wn, gap = plDiff(last, T), interval = [0, 14, 30, 60][Math.min(3, rounds)];
    if (acc < 0.8 && gap >= interval) rev.push({ b, ch, acc, gap, score: (0.8 - acc) * gap });
  }
  rev.sort((a, z) => z.score - a.score);
  for (const v of rev.slice(0, 1)) add(v.b + v.ch.id, item("復習どき", "#c47a12", v.b, v.ch, plCurRoundCh(idx, v.b, v.ch), `正答率 ${Math.round(v.acc * 100)}% · ${v.gap}日あいています`));
  for (const b of PL_BANKS()){
    const r = plCurRound(idx, b); if (plRound(idx, b, r).rem === 0) continue;
    const g = {};
    for (const ch of plChs(b)){ const t = plTarget(idx, b, r, ch), d = Math.min(t, plDone(idx, b, r, ch.id)); const G = g[ch.group] ||= { t: 0, d: 0, list: [] }; G.t += t; G.d += d; if (d < t) G.list.push({ ch, d, t }); }
    const gs = Object.entries(g).filter(([, G]) => G.list.length).sort((a, z) => a[1].d / (a[1].t || 1) - z[1].d / (z[1].t || 1));
    if (!gs.length) continue;
    const [gk, G] = gs[0]; G.list.sort((a, z) => a.d / a.t - z.d / z.t); const it = G.list[0];
    add(b + it.ch.id, item("バランス", "#7a4fc4", b, it.ch, r, `${PL_GROUPS[gk] || gk} がいちばん遅れています（${Math.round(G.d / (G.t || 1) * 100)}%）`));
  }
  return out;
}

/* ============================================================
   計画
   ============================================================ */
function viewPlan(main){
  qx(); const P = pl(), s = P.settings, { T, logs, totals, idx, idxM } = plCtx();
  main.append(h("div", { class: "pl-hero" }, h("h1", {}, "計画")));
  const wrap = h("div", { class: "pl-stack" }); main.append(wrap);

  // いまの時期
  const ph = plPhase(T);
  wrap.append(h("div", { class: "panel" },
    h("div", { class: "row" }, h("h2", { style: "margin:0" }, ph.cur.name), h("div", { class: "spacer" }), h("span", { class: "muted small" }, `本番まで 約${Math.max(0, ph.months).toFixed(1)}か月`)),
    h("p", { class: "small", style: "margin:6px 0 0" }, ph.cur.desc),
    h("div", { class: "pl-phase" }, ...ph.phases.map(p => h("div", { class: p === ph.cur ? "on" : ph.months <= p.to ? "past" : "" }, h("div", { class: "b" }),
      h("div", { class: "lb" }, p.name.split(" ")[1], h("br"), p.k === "base" ? "〜15か月前" : p.k === "last" ? "1か月前〜" : `${p.from}〜${p.to}か月前`))))));

  // 早く始めるほど1日がかるい
  let rem = 0, lastDue = T;
  for (const b of PL_BANKS()){ plPlan(b).forEach((_, i) => rem += plRound(idxM, b, i + 1).rem); const d = plPlan(b).at(-1).due; if (d > lastDue) lastDue = d; }
  const days = plDiff(T, lastDue) + 1;
  wrap.append(h("div", { class: "panel" }, h("h2", {}, "早く始めるほど1日がかるい"),
    h("p", { class: "small", style: "margin:-4px 0 0;color:var(--ink2)" }, `残りの全周回（${rem.toLocaleString()}問）を最後の期限（${plYM(lastDue)}${plParse(lastDue).getDate()}日）までに終える場合の、1日あたりの問題数です。`),
    h("div", { class: "pl-cmp" }, ...[[0, "今日から"], [30, "1か月後から"], [90, "3か月後から"], [180, "半年後から"]].map(([k, l], i) => {
      const dd = days - k; return h("div", {}, h("div", { class: "v", style: i === 0 ? "color:var(--good)" : i === 3 ? "color:var(--again)" : "" }, dd > 0 ? String(Math.ceil(rem / plEff(dd))) : "—"), h("div", { class: "l" }, l, h("br"), "問/日"));
    }))));

  // 周回計画
  const s14 = {}; for (const b of PL_BANKS()) s14[b] = 0;
  for (const l of logs) if (l.d >= plAdd(T, -13)) s14[l.b] += l.n;
  for (const b of PL_BANKS()){
    const pc = plPace(idxM, b, T), now = plPace(idx, b, T), avg = s14[b] / 14, PB = plPlan(b);
    const card = h("div", { class: "panel" }, h("div", { class: "row" }, h("h2", { style: "margin:0" }, `${QX_BANKS[b].name} の周回計画`), h("div", { class: "spacer" }),
      pc.need > 0 ? h("b", { style: `color:${PL_COLOR[b]}` }, `${Math.ceil(pc.need)}問/日`) : null));
    if (b === "kai") card.append(h("p", { class: "muted small", style: "margin:4px 0 0" }, "第80〜120回の全問題。分野別の問題もこの中に入っているので、分野別を終えてからの通し演習向けです。"));
    now.rows.forEach((row, i) => {
      const p = PB[i];
      let m;
      if (row.rem === 0) m = h("span", { class: "pl-good" }, "✓ 完了");
      else if (row.overdue) m = h("span", { class: "pl-bad" }, `期限を過ぎています。日付を先に延ばしてください（残り ${row.rem}問）`);
      else {
        const per = Math.ceil(row.cum / plEff(row.days));
        m = h("span", {}, `残り ${row.rem.toLocaleString()}問 · 期限まで ${row.days}日 → 1日 ${per}問（休みを除く）`);
        if (avg > 0){ const fin = plAdd(T, Math.ceil(row.cum / avg) - 1);
          m.append(h("br"), `いまのペース（${avg.toFixed(1)}問/日）だと ${plYM(fin)}${plParse(fin).getDate()}日ごろ終了 `, h("span", { class: fin <= p.due ? "pl-good" : "pl-warn" }, fin <= p.due ? "→ 間に合う" : "→ 少し足りない")); }
      }
      const due = h("input", { type: "date", value: p.due });
      due.addEventListener("change", () => {
        const v = due.value; if (!v) return;
        if (i > 0 && v < PB[i - 1].due){ toast("前の周回より後の日付にしてください"); route(true); return; }
        if (i < PB.length - 1 && v > PB[i + 1].due){ toast("次の周回より前の日付にしてください"); route(true); return; }
        p.due = v; markDirty(); route(true);
      });
      const opt = i > 0 ? h("div", { class: "row small", style: "margin-top:6px" },
        h("label", {}, (() => { const c = h("input", { type: "checkbox" }); c.checked = !!p.wrongOnly; c.addEventListener("change", () => { p.wrongOnly = c.checked; markDirty(); route(true); }); return c; })(), " 前の周回の誤答だけ"),
        i === PB.length - 1 ? h("button", { class: "btn sm", onclick: () => {
          if (logs.some(l => l.b === b && l.r === i + 1) && !confirm(`${i + 1}周目にはすでに記録があります。周回を削除しても記録は残りますが、計画からは外れます。削除しますか？`)) return;
          PB.splice(i, 1); markDirty(); route(true); } }, "この周回を削除") : null) : null;
      card.append(h("div", { class: "pl-round" },
        h("div", { class: "hd" }, h("b", {}, `${i + 1}周目`), h("span", { class: "muted small" }, `${row.done.toLocaleString()}/${row.tot.toLocaleString()}`), due),
        h("div", { class: "pl-pb", style: "margin-top:8px" }, h("i", { style: `width:${row.tot ? row.done / row.tot * 100 : 0}%;background:${PL_COLOR[b]}` })),
        h("div", { class: "m" }, m), opt));
    });
    card.append(h("button", { class: "btn sm", style: "margin-top:10px", onclick: () => {
      const last = PB.at(-1).due; let d = plAdd(last, 60); if (d > s.examDate) d = plAdd(s.examDate, -7); if (d < last) d = last;
      PB.push({ due: d, wrongOnly: true }); markDirty(); route(true); toast(`${PB.length}周目を追加しました`); } }, "＋ 周回を追加"));
    wrap.append(card);
  }
  wrap.append(h("p", { class: "muted small", style: "margin:0" }, "・「期限」はその周回を終わらせたい日。毎日の目安は、残りの問題を期限までの日数（週の休みを除く）で割って出しています。",
    h("br"), "・周回は「その問題を何回目に解いたか」で数えます（問題演習で1回目＝1周目、解き直し1回目＝2周目…）。",
    h("br"), "・「誤答だけ」の周回は、前の周回でまちがえた数が対象です。"));

  // 記録
  const st = plStreak(totals, T), min = s.minDaily, start = plAdd(plWeek(T), -25 * 7);
  const hm = h("div", { class: "pl-hm" }); let hsum = 0, hdays = 0;
  for (let col = 0, d = start; col < 26 * 7; col++, d = plAdd(d, 1)){
    const t = totals[d] || 0; if (d <= T){ hsum += t; if (t >= min) hdays++; }
    let cls = d > T ? "fut" : t === 0 ? (st.status[d] === "rest" ? "rest" : "") : t < min ? "l1" : t < min * 3 ? "l2" : t < min * 6 ? "l3" : "l4";
    if (d === T) cls += " td";
    hm.append(h("i", { class: cls, title: `${d} ${t}問` }));
  }
  const mt = {}; for (const l of logs){ const k = l.d.slice(0, 7); mt[k] = (mt[k] || 0) + l.n; }
  const nowD = plParse(T), cols = [];
  for (let i = 11; i >= 0; i--){ const d = new Date(nowD.getFullYear(), nowD.getMonth() - i, 1); const k = `${d.getFullYear()}-${plPad(d.getMonth() + 1)}`; cols.push([mt[k] || 0, d.getMonth() + 1]); }
  const mx = Math.max(1, ...cols.map(c => c[0]));
  const byDay = {}; for (const l of logs) if (l.d >= plAdd(T, -29)) (byDay[l.d] ||= []).push(l);
  const list = h("div", {});
  const ds = Object.keys(byDay).sort().reverse();
  if (!ds.length) list.append(h("p", { class: "muted small" }, "まだ記録がありません。問題演習で記録するとここに出ます。"));
  for (const d of ds){
    list.append(h("div", { class: "pl-lday" }, h("span", {}, plMDW(d)), h("span", {}, `${totals[d]}問`)));
    for (const l of byDay[d].sort((a, z) => (z.t || 0) - (a.t || 0))){
      const c = plCh(l.b, l.c);
      list.append(h("div", { class: "pl-entry" }, plBk(l.b), h("span", {}, `${c ? c.name : l.c} `, h("span", { class: "muted" }, `${l.r}周目`), ` ${l.n}問`, l.w != null ? h("span", { class: "muted small" }, ` · 誤${l.w}`) : null, l.kx ? null : h("span", { class: "muted small" }, " · 旧Planner")),
        l.kx ? null : h("button", { class: "x", title: "消す", onclick: () => { if (!confirm(`${plMDW(l.d)} の ${l.n}問 の記録を消しますか？`)) return; P.tomb.push(l.id); P.logs = P.logs.filter(x => x.id !== l.id); markDirty(); route(true); } }, "✕")));
    }
  }
  wrap.append(h("div", { class: "panel" },
    h("div", { class: "row" }, h("h2", { style: "margin:0" }, "記録"), h("div", { class: "spacer" }), h("span", { class: "muted small" }, `26週で ${hdays}日達成 · ${hsum.toLocaleString()}問`)),
    hm,
    h("h3", { style: "margin-top:16px" }, "月ごと"),
    h("div", { class: "pl-mb" }, ...cols.map(([v, m]) => h("div", { class: "c" }, h("span", {}, v ? String(v) : ""), h("i", { style: `height:${v / mx * 75}%` }), h("span", {}, m + "月")))),
    h("h3", { style: "margin-top:16px" }, "最近30日"),
    h("p", { class: "muted small", style: "margin:-6px 0 0" }, "問題演習の記録の取り消しは、問題演習の「直前の記録を取り消す」から。"),
    list));

  // 設定
  const ex = h("input", { type: "date", value: s.examDate }); ex.addEventListener("change", () => { if (ex.value){ s.examDate = ex.value; markDirty(); route(true); } });
  const mn = h("input", { type: "number", min: "1", value: String(s.minDaily), style: "width:80px" }); mn.addEventListener("change", () => { s.minDaily = Math.max(1, parseInt(mn.value) || 1); markDirty(); route(true); });
  const rs = h("select", {}, ...[0, 1, 2].map(v => h("option", { value: String(v), selected: s.restPerWeek === v }, `${v}日`))); rs.addEventListener("change", () => { s.restPerWeek = +rs.value; markDirty(); route(true); });
  const groups = {}; for (const ch of plChs("qb")) (groups[ch.group] ||= []).push(ch);
  const rot = h("select", {}, h("option", { value: "" }, "なし"), ...Object.entries(groups).map(([g, list]) => h("optgroup", { label: PL_GROUPS[g] || g }, ...list.map(c => h("option", { value: c.id, selected: s.rot === c.id }, c.name)))));
  rot.addEventListener("change", () => { s.rot = rot.value; markDirty(); toast(rot.value ? "実習中の科を優先して提案します" : "実習中の科を解除しました"); });
  const ru = h("input", { type: "date", value: s.rotUntil || "" }); ru.addEventListener("change", () => { s.rotUntil = ru.value; markDirty(); });
  const row = (lab, sub, el) => h("div", { class: "pl-set" }, h("div", { class: "lab" }, lab, h("small", {}, sub)), el);
  wrap.append(h("div", { class: "panel" }, h("h2", {}, "計画の設定"),
    row("国試の日", "カウントダウンと時期の区切りに使います", ex),
    row("最低ライン（問/日）", "これだけ解けば連続記録がつながる数", mn),
    row("週の休み券", "この日数までは休んでも連続記録が切れません", rs),
    row("いま回っている科（実習）", "選ぶと、その科のQB分野別の章を「今日なにやる？」で優先して出します", rot),
    row("いつまで", "この日を過ぎたら自動で解除（空欄ならずっと）", ru)));
}

/* ============================================================
   旧 国試 Planner の記録を一度だけ取り込む
   ============================================================ */
function plMergeOld(src){
  if (!src || typeof src !== "object") return 0;
  const P = pl(); let n = 0;
  if (src.settings){ for (const k of ["examDate", "minDaily", "restPerWeek", "rot", "rotUntil"]) if (src.settings[k] != null && src.settings[k] !== "") P.settings[k] = src.settings[k]; }
  if (src.banks) for (const b of PL_BANKS()){ const pp = src.banks[b]?.plan; if (Array.isArray(pp) && pp.length && pp.every(x => x && x.due)) P.plan[b] = pp.map(x => ({ due: x.due, wrongOnly: !!x.wrongOnly })); }
  Object.assign(P.weekGoals, src.weekGoals || {});
  const tomb = new Set([...(src.tomb || []), ...P.tomb]), have = new Set(P.logs.map(l => l.id));
  for (const l of src.logs || []){
    if (!l || typeof l.id !== "string" || l.id.startsWith("kx-") || tomb.has(l.id) || have.has(l.id) || !QX_BANKS[l.b] || !(l.n > 0)) continue;
    P.logs.push({ id: l.id, d: l.d, b: l.b, c: l.c, r: l.r || 1, n: l.n, w: l.w ?? null, t: l.t || 0 }); have.add(l.id); n++;
  }
  return n;
}
async function plImportOld(){
  if (pl().importedOld) return;
  let n = 0, found = false;
  try { const raw = localStorage.getItem("kokushi_state"); if (raw){ found = true; n += plMergeOld(JSON.parse(raw)); } } catch(e){}
  try {
    const db = firestore();
    if (db){ const snap = await db.collection("progress").doc(IS_PROD ? "kokushi_user1" : "kokushi_localtest").get(); if (snap.exists){ found = true; n += plMergeOld(snap.data()); } }
  } catch(e){ console.warn("old planner import failed", e); return; } // 読めなかったら次回また試す
  pl().importedOld = Date.now(); markDirty();
  if (found && (currentView === "today" || currentView === "plan")) route(true);
  if (n) toast(`国試 Planner の記録 ${n}件を取り込みました`);
}
// クラウドの読み込みが終わってから取り込む（先に書くと別端末のデータを上書きしかねない）
(function waitStore(tries = 0){
  if (Store.ready || (tries > 12 && !Store.base)) { plImportOld(); return; }
  if (tries > 40) return;
  setTimeout(() => waitStore(tries + 1), 1000);
})();

/* ---------- 組み込み ---------- */
VIEWS.today = viewToday;
VIEWS.plan = viewPlan;
{ const v = location.hash.slice(1); if (!v || v === "today" || v === "plan") route(true); }
