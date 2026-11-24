/* ============================================================
   ゲーム（アーケード）— 画面
   - 勉強には手を入れない。記録した QB の問題数（＋カード5枚で1枚）が「🎟 プレイ券」として貯まるだけ
   - スロット（1回まわす＝券2枚）を完済するとポーカー（1戦＝券10枚）が開く。クリアするたび難しさ Lv が上がる
   - ルールは arcade-core.js。状態は S.pl.arc（今日・計画と一緒に同期）
   hospital.js の後に読み込む。
   ============================================================ */
"use strict";

const ARC_COST = { spin: 2, round: 10 }, ARC_CARD = 5, ARC_BONUS = 30;
const ARCU = { tab: null, sel: [], sort: "r", busy: false, pick: null, picks: [], replace: false, flash: null };

function arc(){
  const P = pl(), A = P.arc ||= {};
  if (!A.start){ A.start = plToday(); A.startDay = today(); }
  A.spent ||= 0; A.clear ||= { slot: 0, poker: 0 };
  A.stats ||= {}; A.stats.slot ||= { runs: 0, wins: 0, best: 0 }; A.stats.poker ||= { runs: 0, wins: 0, best: 0, hand: 0 };
  return A;
}
/** プレイ券：はじめた日からの QB の記録数 ＋ カードの回答5回で1枚 ＋ はじめの30枚 */
function arcTickets(){
  const A = arc(), T = plToday(), t0 = dayStartTs(A.startDay ?? today()), t1 = dayStartTs(today());
  let q = 0, qt = 0, c = 0, ct = 0;
  for (const l of Object.values(qx().out)) if (l && l.d >= A.start){ q += l.n || 0; if (l.d === T) qt += l.n || 0; }
  for (const r of S.revlog) if (r.id >= t0){ c++; if (r.id >= t1) ct++; }
  const earned = ARC_BONUS + q + Math.floor(c / ARC_CARD);
  return { earned, left: Math.max(0, earned - A.spent), today: qt + Math.floor(ct / ARC_CARD) };
}
function arcPay(n){ const t = arcTickets(); if (t.left < n) return false; arc().spent += n; return true; }
const sfx = (k, ...a) => { try { window.Game?.SFX?.[k]?.(...a); } catch(e){} };

/* ---------- 見た目 ---------- */
const ARC_CSS = `
#ar-body>*{min-width:0}
.ar-top{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.ar-tk{font-size:1.5rem;font-weight:800;font-variant-numeric:tabular-nums;line-height:1}
.ar-tk small{font-size:.8rem;font-weight:600;color:var(--ink2);margin-left:4px}
.ar-seg{display:flex;gap:6px;margin:12px 0}
.ar-seg button{flex:1;border:1px solid var(--line);background:var(--surface);border-radius:12px;padding:10px;font:inherit;font-weight:700;cursor:pointer;color:var(--ink)}
.ar-seg button.on{background:var(--ink);color:var(--surface);border-color:var(--ink)}
.ar-seg button:disabled{opacity:.5;cursor:default}
.ar-stat{display:flex;gap:14px;flex-wrap:wrap;align-items:baseline}
.ar-stat b{font-size:1.3rem;font-variant-numeric:tabular-nums}
.ar-pips{display:inline-flex;gap:3px;vertical-align:middle}
.ar-pips i{width:9px;height:9px;border-radius:50%;background:var(--line);display:block}
.ar-pips i.on{background:#e0a21b}
.ar-bar{height:12px;border-radius:6px;background:var(--surface2);border:1px solid var(--line);overflow:hidden;margin-top:8px}
.ar-bar>i{display:block;height:100%;background:linear-gradient(90deg,#f0b429,#e8590c);transition:width .6s ease}
.ar-btn{width:100%;padding:14px;font-size:1.05rem;margin-top:12px}
.ar-help{font-size:.85rem;line-height:1.7;color:var(--ink2)}
.ar-help summary{cursor:pointer;font-weight:700;color:var(--ink)}
.ar-ov{position:fixed;inset:0;background:rgba(10,10,14,.55);z-index:300;display:flex;align-items:center;justify-content:center;padding:16px;animation:arFade .2s}
.ar-ov .box{background:var(--surface);border-radius:18px;padding:22px;max-width:420px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.35);animation:arPop .35s cubic-bezier(.2,1.4,.4,1)}
.ar-ov .big{font-size:3rem;line-height:1.1}
@keyframes arFade{from{opacity:0}to{opacity:1}}
@keyframes arPop{from{transform:scale(.7);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes arBump{0%{transform:scale(1)}40%{transform:scale(1.25)}100%{transform:scale(1)}}
@keyframes arShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
.ar-bump{animation:arBump .3s ease}
.ar-shake{animation:arShake .3s ease 2}

/* スロット */
.sl-machine{background:linear-gradient(160deg,#3b2a6b,#1f1640);border-radius:18px;padding:12px;border:3px solid #e0a21b;box-shadow:inset 0 0 0 2px rgba(255,255,255,.08)}
.sl-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
.sl-c{min-width:0;aspect-ratio:1;background:rgba(255,255,255,.93);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:clamp(22px,7vw,38px);position:relative;line-height:1}
.sl-c.sl-e0{background:rgba(255,255,255,.12)}
.sl-c.dead{opacity:.35}
.sl-c.dead::after{content:"";position:absolute;inset:18%;border-top:3px solid #c2352c;transform:rotate(-35deg)}
.sl-c .v{position:absolute;right:3px;bottom:2px;font-size:.78rem;font-weight:800;color:#1d7f47;background:#fff;border-radius:6px;padding:0 4px;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.sl-c .v.z{color:#999}
.sl-c .v.hi{color:#fff;background:#e8590c}
.sl-c .g{position:absolute;left:3px;top:2px;font-size:.75rem}
.sl-c.in{animation:slIn .35s cubic-bezier(.2,1.5,.4,1) both}
@keyframes slIn{from{transform:scale(.3) rotate(-20deg);opacity:0}to{transform:none;opacity:1}}
.sl-c .v.in{animation:arPop .3s both}
.sl-sum{color:#fff;display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-weight:700}
.sl-sum .gain{font-size:1.6rem;color:#ffd447;font-variant-numeric:tabular-nums}
.sl-offer{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}
.sl-card{min-width:0;border:2px solid var(--line);border-radius:14px;padding:10px 8px;background:var(--surface);cursor:pointer;text-align:center;font:inherit;color:var(--ink);display:flex;flex-direction:column;align-items:center;gap:4px}
.sl-card:hover{transform:translateY(-2px)}
.sl-card .e{font-size:2.1rem;line-height:1.1}
.sl-card .nm{font-weight:800;font-size:.9rem}
.sl-card .d{font-size:.72rem;color:var(--ink2);line-height:1.35}
.sl-card.U{border-color:#3d8bfd} .sl-card.R{border-color:#e0a21b;background:color-mix(in srgb,#e0a21b 10%,var(--surface))}
.sl-r{font-size:.65rem;font-weight:800;border-radius:5px;padding:0 5px;color:#fff;background:#888}
.sl-r.U{background:#3d8bfd} .sl-r.R{background:#e0a21b}
.sl-bag{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.sl-bag button{border:1px solid var(--line);background:var(--surface2);border-radius:10px;padding:4px 8px;font-size:1.25rem;cursor:pointer;font-family:inherit;color:var(--ink)}
.sl-bag button small{font-size:.75rem;font-weight:700;margin-left:2px;color:var(--ink2)}
.sl-bag.rm button{border-color:var(--again);border-style:dashed}
.sl-dex{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:4px 14px;margin-top:8px}

/* ポーカー */
.pk-table{background:radial-gradient(ellipse at top,#1f7a4d,#0f4a2e);border-radius:18px;padding:12px;color:#fff;border:3px solid #0b3621}
.pk-hud{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.pk-hud .b{background:rgba(0,0,0,.25);border-radius:10px;padding:8px 10px}
.pk-hud .k{font-size:.72rem;opacity:.8}
.pk-hud .v{font-size:1.25rem;font-weight:800;font-variant-numeric:tabular-nums}
.pk-calc{display:flex;align-items:center;justify-content:center;gap:8px;margin:10px 0 4px;font-weight:800;min-height:46px}
.pk-calc .ch,.pk-calc .mu{min-width:76px;text-align:center;border-radius:10px;padding:6px 10px;font-size:1.35rem;font-variant-numeric:tabular-nums}
.pk-calc .ch{background:#1c6fd1} .pk-calc .mu{background:#d63a2f}
.pk-calc .ty{font-size:.85rem;opacity:.95;text-align:center;margin-top:2px}
.pk-jk{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;margin:8px 0}
.pk-j{background:#fff8e6;color:#3a2a00;border-radius:9px;padding:5px 3px;text-align:center;min-height:62px;font-size:.62rem;line-height:1.2;border:2px solid #e0a21b;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:1px;position:relative}
.pk-j .e{font-size:1.3rem}
.pk-j.x{border-color:#d63a2f} .pk-j.chips{border-color:#1c6fd1} .pk-j.util{border-color:#888}
.pk-j.pk-e0{background:rgba(0,0,0,.18);border:2px dashed rgba(255,255,255,.25);cursor:default}
.pk-j .fx{position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:#d63a2f;color:#fff;border-radius:6px;padding:0 5px;font-size:.72rem;font-weight:800;white-space:nowrap;animation:arPop .25s}
.pk-j .fx.c{background:#1c6fd1}
.pk-j .cnt{font-weight:800;color:#d63a2f}
.pk-zone{min-height:72px;display:flex;justify-content:center;gap:5px;align-items:flex-end;margin:6px 0}
.pk-hand{display:flex;justify-content:center;gap:4px;flex-wrap:nowrap;margin-top:8px;padding-top:16px}
.pc{width:clamp(34px,10.4vw,58px);aspect-ratio:5/7;background:#fff;color:#1c1c1e;border-radius:7px;box-shadow:0 2px 5px rgba(0,0,0,.35);display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:800;cursor:pointer;transition:transform .12s;position:relative;user-select:none;flex:0 0 auto}
.pc .rk{font-size:clamp(14px,4.6vw,22px);line-height:1}
.pc .su{font-size:clamp(13px,4vw,20px);line-height:1}
.pc.red{color:#d22}
.pc.sel{transform:translateY(-14px);box-shadow:0 0 0 3px #ffd447,0 6px 12px rgba(0,0,0,.4)}
.pc.hit{animation:arBump .3s}
.pc.off{opacity:.45}
.pc .fx{position:absolute;top:-18px;left:50%;transform:translateX(-50%);background:#1c6fd1;color:#fff;border-radius:6px;padding:0 5px;font-size:.72rem;white-space:nowrap;animation:arPop .25s}
.pc.mini{width:30px;font-size:.7rem;cursor:pointer}
.pc.mini .rk{font-size:13px} .pc.mini .su{font-size:12px}
.pk-row{display:flex;gap:8px;margin-top:12px}
.pk-row .btn{flex:1;padding:12px;font-size:1rem}
.pk-btn-play{background:#1c6fd1!important;border-color:#1c6fd1!important;color:#fff!important}
.pk-btn-disc{background:#d63a2f!important;border-color:#d63a2f!important;color:#fff!important}
.pk-table .btn.sm{background:rgba(0,0,0,.28);border-color:transparent;color:#fff}
.pk-j .fx.xx{background:#8e2bb8;font-size:.8rem}
.pk-prev{text-align:center;font-size:.85rem;min-height:1.3em;margin-top:6px;opacity:.95}
.pk-deck{display:grid;grid-template-columns:repeat(13,minmax(0,1fr));gap:3px;margin-top:8px}
.pk-deck .pc{width:100%}
.pk-deck .pc.sel{transform:translateY(-4px)}
.pk-off{display:grid;gap:8px;margin-top:10px}
.pk-o{display:flex;align-items:center;gap:10px;border:2px solid var(--line);border-radius:12px;padding:10px;text-align:left;background:var(--surface);font:inherit;color:var(--ink);cursor:pointer}
.pk-o .e{font-size:1.7rem;width:40px;text-align:center}
.pk-o.on{border-color:#e0a21b;background:color-mix(in srgb,#e0a21b 10%,var(--surface))}
.pk-lv{display:grid;grid-template-columns:1fr auto auto;gap:2px 12px;font-size:.85rem;margin-top:6px}
`;
(function(){ const st = document.createElement("style"); st.textContent = ARC_CSS; document.head.append(st); })();

function arcOverlay(kids, onClose){
  const ov = h("div", { class: "ar-ov" }), box = h("div", { class: "box" }, ...kids);
  ov.append(box);
  const close = () => { ov.remove(); onClose && onClose(); };
  ov.addEventListener("click", e => { if (e.target === ov) close(); });
  document.body.append(ov);
  return close;
}
function countUp(el, to, ms = 500, fmt = v => Math.round(v).toLocaleString()){
  const from = +(el.dataset.v || 0), t0 = performance.now(); el.dataset.v = to;
  const step = t => { const k = Math.min(1, (t - t0) / ms); el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
const arcSleep = ms => new Promise(r => setTimeout(r, ms));
const pips = (n, on) => h("span", { class: "ar-pips" }, ...[...Array(n)].map((_, i) => h("i", { class: i < on ? "on" : "" })));

/* ============================================================
   画面
   ============================================================ */
function viewArcade(main){
  qx(); const A = arc(), tk = arcTickets();
  if (!ARCU.tab) ARCU.tab = A.clear.slot >= 1 && A.poker && !A.slot ? "poker" : "slot";
  const top = h("div", { class: "ar-top", style: "margin-bottom:4px" },
    h("h1", { style: "margin:0" }, "ゲーム"),
    h("div", { class: "ar-tk", style: "margin-left:auto" }, "🎟 ", h("span", { id: "ar-tk" }, String(tk.left)), h("small", {}, `枚（今日 +${tk.today}）`)));
  const info = h("div", { class: "muted small" }, `勉強はいつも通り記録するだけ。QB 1問 = 🎟1、カード${ARC_CARD}回 = 🎟1。スロット 1回 🎟${ARC_COST.spin}・ポーカー 1戦 🎟${ARC_COST.round}`);
  const lockedP = A.clear.slot < 1;
  const seg = h("div", { class: "ar-seg" },
    h("button", { class: ARCU.tab === "slot" ? "on" : "", onclick: () => { ARCU.tab = "slot"; arcRender(); } }, "🎰 スロット" + (A.clear.slot ? ` ★${A.clear.slot}` : "")),
    h("button", { class: ARCU.tab === "poker" ? "on" : "", onclick: () => { ARCU.tab = "poker"; arcRender(); } }, (lockedP ? "🔒 " : "🃏 ") + "ポーカー" + (A.clear.poker ? ` ★${A.clear.poker}` : "")));
  const body = h("div", { id: "ar-body", class: "pl-stack" });
  main.append(top, info, seg, body);
  arcRenderBody(body);
  // 前の病院
  const old = h("details", { class: "panel ar-help", style: "margin-top:14px" }, h("summary", {}, "🏥 前の病院（部門・施設・当直）"));
  let done = false;
  old.addEventListener("toggle", () => { if (old.open && !done){ done = true; const d = h("div", { class: "pl-stack", style: "margin-top:10px" }); old.append(d); try { viewHospital(d, true); } catch(e){ console.warn(e); d.append(h("p", { class: "muted" }, "読み込めませんでした")); } } });
  main.append(old);
}
function arcRender(){ const y = window.scrollY; route(true); window.scrollTo(0, y); }
function arcRenderBody(body){
  body = body || $("#ar-body"); if (!body) return;
  body.innerHTML = "";
  const tk = $("#ar-tk"); if (tk) tk.textContent = String(arcTickets().left);
  if (ARCU.tab === "poker") pokerView(body); else slotView(body);
}
function arcLevelPicker(g){
  const A = arc(), max = A.clear[g] + 1;
  if (max <= 1) return { el: null, get: () => 1 };
  const sel = h("select", {}, ...[...Array(max)].map((_, i) => h("option", { value: String(i + 1), selected: i + 1 === max }, `難しさ Lv${i + 1}` + (i + 1 === max ? "（未クリア）" : ""))));
  return { el: h("div", { class: "row", style: "margin-top:10px;gap:8px" }, h("span", { class: "small" }, "難しさ"), sel), get: () => +sel.value };
}
function arcNoTicket(n){
  const t = arcTickets();
  toast(`🎟 が足りません（あと ${n - t.left}枚）。QBを${n - t.left}問記録すると遊べます`, 3200);
}

/* ============================================================
   スロット
   ============================================================ */
const SL = () => ARC.slot;
function slotView(box){
  const A = arc(), run = A.slot, SY = ARC.SY;
  if (!run){
    const lv = arcLevelPicker("slot");
    box.append(h("div", { class: "panel" }, h("h2", { style: "margin:0" }, "🎰 スロット"),
      h("p", { class: "ar-help", style: "margin:6px 0 0" },
        "まわすと、持っているシンボルが 5×4 の盤面にランダムに並んで、コインを稼ぐ。隣どうしで効果が出る（🐱の隣の🥛は飲まれて +9、🐝の隣の🌸は ×2 …）。",
        h("br"), "まわすたびに3つから1つシンボルを足せる（足さなくてもいい）。決まった回数ごとに家賃を払う。家賃はどんどん上がって、払えないと終わり。",
        h("br"), h("b", {}, `12回の家賃を払いきればクリア`), "。クリアするとポーカーが開く。",
        h("br"), "家賃を払うたびに「取り除く券」が1枚もらえる。弱いシンボルを抜いて盤面を濃くするのも大事。"),
      lv.el,
      h("button", { class: "btn primary ar-btn", onclick: () => { A.slot = SL().new(lv.get()); A.stats.slot.runs++; markDirty(); arcRenderBody(); } }, "はじめる"),
      A.stats.slot.runs ? h("div", { class: "muted small", style: "margin-top:8px" }, `これまで ${A.stats.slot.runs}回 · クリア ${A.stats.slot.wins}回 · 最高 家賃${A.stats.slot.best}回`) : null));
    box.append(slotDex());
    return;
  }
  const amt = SL().rentAt(Math.min(run.rent, 11), run.lv), last = run.last;
  // 状態
  box.append(h("div", { class: "panel" },
    h("div", { class: "ar-stat" },
      h("div", {}, h("div", { class: "muted small" }, "コイン"), h("b", { id: "sl-coins" }, `💰 ${run.coins.toLocaleString()}`)),
      h("div", {}, h("div", { class: "muted small" }, `家賃 ${Math.min(run.rent + 1, 12)}/12` + (run.lv > 1 ? ` · Lv${run.lv}` : "")),
        h("b", {}, `💰 ${amt.toLocaleString()}`), h("span", { class: "muted small" }, run.over ? "" : ` あと ${run.left}回`)),
      h("div", { style: "margin-left:auto;text-align:right" }, h("div", { class: "muted small" }, "払った家賃"), pips(12, run.rent))),
    h("div", { class: "ar-bar" }, h("i", { style: `width:${Math.min(100, run.coins / amt * 100)}%` }))));
  // 盤面
  const grid = h("div", { class: "sl-grid", id: "sl-grid" });
  for (let p = 0; p < 20; p++){
    const c = last && last.cell[p];
    grid.append(c ? slotCell(c) : h("div", { class: "sl-c sl-e0" }));
  }
  const sum = h("div", { class: "sl-sum" }, h("span", {}, last ? (last.paid > 0 ? `🏠 家賃 💰${last.paid} を払った！` : last.paid < 0 ? "🏠 家賃が払えなかった…" : "この回の稼ぎ") : "まわしてみよう"),
    h("span", { class: "gain", id: "sl-gain" }, last ? `+${last.gain}` : ""));
  const machine = h("div", { class: "sl-machine" }, grid, sum);
  box.append(machine);
  // 操作
  const ctl = h("div", {});
  if (run.over){
    ctl.append(h("div", { class: "panel", style: "text-align:center" },
      h("div", { style: "font-size:2.4rem" }, run.won ? "🏆" : "🏚️"),
      h("h2", { style: "margin:4px 0" }, run.won ? "完済！クリア" : `家賃 ${run.rent}回 で終了`),
      h("div", { class: "muted small" }, `${run.spins}回まわした · 1回の最高 +${run.best}`),
      h("button", { class: "btn primary ar-btn", onclick: () => { A.slot = null; markDirty(); arcRenderBody(); } }, "もう一度")));
  } else if (run.offer){
    ctl.append(h("div", { class: "panel" }, h("div", { class: "row" }, h("b", {}, "シンボルを1つ足す"), h("span", { class: "spacer" }),
      h("button", { class: "btn sm", onclick: () => { SL().pick(run, null); markDirty(); arcRenderBody(); } }, "足さない")),
      h("div", { class: "sl-offer" }, ...run.offer.map(id => { const s = SY[id];
        return h("button", { class: "sl-card " + s.r, onclick: () => { SL().pick(run, id); sfx("buy"); markDirty(); arcRenderBody(); } },
          h("span", { class: "sl-r " + s.r }, { C: "ふつう", U: "めずらしい", R: "レア" }[s.r]), h("span", { class: "e" }, s.e), h("span", { class: "nm" }, s.n),
          h("span", { class: "muted small" }, `💰${s.v}`), h("span", { class: "d" }, s.d)); }))));
  } else {
    const t = arcTickets();
    ctl.append(h("button", { class: "btn primary ar-btn", style: "font-size:1.2rem", disabled: ARCU.busy, onclick: () => slotDoSpin() }, `🎰 まわす（🎟${ARC_COST.spin}）`),
      t.left < ARC_COST.spin ? h("div", { class: "muted small", style: "text-align:center;margin-top:6px" }, "プレイ券がありません。QBを記録すると貯まります") : "");
  }
  box.append(ctl);
  // バッグ
  const counts = {}; run.bag.forEach(b => counts[b.id] = (counts[b.id] || 0) + 1);
  const bag = h("div", { class: "sl-bag" + (ARCU.rm ? " rm" : "") }, ...Object.entries(counts).sort((a, z) => z[1] - a[1]).map(([id, n]) =>
    h("button", { title: `${SY[id].n}：${SY[id].d || "効果なし"}`, onclick: () => {
      if (ARCU.rm){ const bi = run.bag.findIndex(b => b.id === id); SL().remove(run, bi); ARCU.rm = false; sfx("pet"); toast(`${SY[id].e} ${SY[id].n} を1つ取り除いた`); markDirty(); arcRenderBody(); }
      else toast(`${SY[id].e} ${SY[id].n}（💰${SY[id].v}）${SY[id].d ? "：" + SY[id].d : ""}`, 3000);
    } }, SY[id].e, h("small", {}, `×${n}`))));
  box.append(h("div", { class: "panel" }, h("div", { class: "row" }, h("b", {}, `持っているシンボル（${run.bag.length}）`), h("span", { class: "spacer" }),
    run.rm > 0 && !run.over ? h("button", { class: "btn sm" + (ARCU.rm ? " danger" : ""), onclick: () => { ARCU.rm = !ARCU.rm; arcRenderBody(); } }, ARCU.rm ? "やめる" : `🗑️ 取り除く（${run.rm}）`) : null),
    ARCU.rm ? h("div", { class: "small", style: "color:var(--again);margin-top:4px" }, "取り除くシンボルをタップ") : h("div", { class: "muted small", style: "margin-top:4px" }, "盤面は20マス。シンボルが20個を超えると、まわすたびにランダムに20個だけ並ぶ"),
    bag));
  box.append(slotDex());
}
function slotCell(c, anim, k){
  const SY = ARC.SY, s = SY[c.id];
  const el = h("div", { class: "sl-c" + (c.dead ? " dead" : "") + (anim ? " in" : ""), style: anim ? `animation-delay:${k * 45}ms` : null, title: `${s.n}${s.d ? "：" + s.d : ""}` },
    c.grow ? ARC.SY[c.grow].e : s.e);
  if (!c.dead) el.append(h("span", { class: "v" + (c.val === 0 ? " z" : c.val >= 10 ? " hi" : "") + (anim ? " in" : ""), style: anim ? `animation-delay:${300 + k * 45}ms` : null }, String(c.val)));
  if (c.fx && c.fx.length) el.append(h("span", { class: "g" }, c.fx.slice(0, 2).join("")));
  return el;
}
async function slotDoSpin(){
  const A = arc(), run = A.slot; if (!run || run.over || run.offer || ARCU.busy) return;
  if (!arcPay(ARC_COST.spin)) return arcNoTicket(ARC_COST.spin);
  ARCU.busy = true;
  const res = SL().spin(run);
  if (run.over){ A.stats.slot.best = Math.max(A.stats.slot.best, run.rent); if (run.won){ A.stats.slot.wins++; A.clear.slot = Math.max(A.clear.slot, run.lv); } }
  markDirty();
  // 盤面だけ先に演出
  const grid = $("#sl-grid"), gain = $("#sl-gain");
  if (grid){
    grid.innerHTML = ""; let k = 0;
    res.cell.forEach(c => grid.append(c ? slotCell(c, true, k++) : h("div", { class: "sl-c sl-e0" })));
    if (gain){ gain.textContent = ""; }
    let combo = 0; res.cell.forEach((c, i) => { if (c && c.val > 0 && combo < 14){ const n = ++combo; setTimeout(() => sfx("answer", n * 3), 300 + i * 45); } });
    await arcSleep(300 + 20 * 45 + 150);
    if (gain){ gain.dataset.v = 0; countUp(gain, res.gain, 450, v => "+" + Math.round(v)); }
    if (res.gain >= 40) sfx("combo");
    await arcSleep(550);
  }
  ARCU.busy = false;
  if (res.paid > 0) sfx("level");
  arcRenderBody();
  setTimeout(() => $(".sl-offer")?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 30);
  if (res.paid < 0){ sfx("again"); arcOverlay([h("div", { class: "big" }, "🏚️"), h("h2", {}, "家賃が払えなかった…"), h("p", { class: "muted" }, `家賃 ${run.rent}回 まで払えた。足すシンボルと取り除くシンボルを変えて、もう一度。`)]); }
  else if (run.won){ sfx("evolve"); arcOverlay([h("div", { class: "big" }, "🏆"), h("h2", {}, "完済！スロットクリア"), h("p", {}, A.clear.slot === run.lv && run.lv === 1 ? "🃏 ポーカーが開いた！上のタブから遊べる。" : `難しさ Lv${run.lv + 1} が開いた。`)]); }
}
function slotDex(){
  const SY = ARC.SY, R = ARC.slot.RENT;
  const rows = Object.entries(SY).map(([id, s]) => h("div", { class: "small" }, h("span", { class: "sl-r " + s.r, style: "margin-right:6px" }, s.r === "C" ? "ふ" : s.r === "U" ? "め" : "レ"), `${s.e} ${s.n} 💰${s.v}`, s.d ? h("span", { class: "muted" }, ` — ${s.d}`) : ""));
  return h("details", { class: "panel ar-help" }, h("summary", {}, "📖 シンボル図鑑と家賃表"),
    h("p", { style: "margin:8px 0 0" }, "計算の順番：①食べる・割る（食べられたシンボルは消える）→ ②足し算（+）→ ③掛け算（×）。掛け算は重なると掛け合わせる。家賃を払うほど、めずらしい・レアが出やすくなる。"),
    h("div", { class: "sl-dex" }, ...rows),
    h("p", { style: "margin:10px 0 0" }, "家賃：" + R.map((r, i) => `${i + 1}回目 ${r[0]}回で💰${r[1]}`).join(" / ")));
}

/* ============================================================
   ポーカー
   ============================================================ */
const PK = () => ARC.poker;
const BLIND = ["1戦目", "2戦目", "ボス"];
const htName = id => ARC.HT.find(x => x[0] === id)[1];
function pkCardEl(c, opt = {}){
  const red = c.s === 1 || c.s === 2;
  return h("div", { class: "pc" + (red ? " red" : "") + (opt.cls ? " " + opt.cls : ""), "data-id": String(c.id), onclick: opt.onclick || null },
    h("span", { class: "rk" }, ARC.rankName(c.r)), h("span", { class: "su" }, ARC.SUITS[c.s]));
}
function pkJokerEl(j, opt = {}){
  const d = ARC.JK[j.id];
  const cnt = j.id === "grow" ? `+${j.n || 0}` : j.id === "stack" ? `+${(j.n || 0)}` : null;
  return h("div", { class: "pk-j " + d.k + (opt.cls ? " " + opt.cls : ""), "data-j": j.id, onclick: opt.onclick || (() => toast(`${d.e} ${d.n}：${d.d}`, 3200)) },
    h("span", { class: "e" }, d.e), h("span", {}, d.n), cnt ? h("span", { class: "cnt" }, cnt) : null);
}
function pokerView(box){
  const A = arc();
  if (A.clear.slot < 1){
    box.append(h("div", { class: "panel", style: "text-align:center" }, h("div", { style: "font-size:2.4rem" }, "🔒"),
      h("h2", { style: "margin:4px 0" }, "ポーカーはまだ開いていません"),
      h("p", { class: "muted" }, "スロットで12回の家賃を払いきると開きます。"),
      h("button", { class: "btn", onclick: () => { ARCU.tab = "slot"; arcRender(); } }, "🎰 スロットへ")));
    box.append(pkRules());
    return;
  }
  const run = A.poker;
  if (!run){
    const lv = arcLevelPicker("poker");
    box.append(h("div", { class: "panel" }, h("h2", { style: "margin:0" }, "🃏 ポーカー"),
      h("p", { class: "ar-help", style: "margin:6px 0 0" },
        "手札8枚から最大5枚を出して役を作る。得点は ", h("b", {}, "チップ × 倍率"), "。役の基本値に、得点したカードの数字（Aは11、絵札は10）がチップに加わる。",
        h("br"), "1戦ごとに目標点があって、出せるのは4回・捨てられるのは3回まで。目標に届けば勝ち。",
        h("br"), "勝つたびに報酬を1つ選ぶ：ジョーカー（最大5枚・効果は左から順に計算）、役のレベルアップ、デッキの改造。",
        h("br"), h("b", {}, "8ステージ × 3戦（3戦目はルールが変わるボス）を勝ち抜けばクリア"), "。"),
      lv.el,
      h("button", { class: "btn primary ar-btn", onclick: () => { A.poker = PK().new(lv.get()); A.stats.poker.runs++; markDirty(); arcRenderBody(); } }, "はじめる"),
      A.stats.poker.runs ? h("div", { class: "muted small", style: "margin-top:8px" }, `これまで ${A.stats.poker.runs}回 · クリア ${A.stats.poker.wins}回 · 最高 ステージ${A.stats.poker.best} · 1手の最高 ${A.stats.poker.hand.toLocaleString()}点`) : null));
    box.append(pkRules());
    return;
  }
  const R = run.rd, L = PK().limits(run), bossId = run.boss[run.ante], boss = ARC.BOSS[bossId];
  const target = R ? R.target : PK().target(run.ante, run.blind, run.lv), score = R ? R.score : 0;
  const table = h("div", { class: "pk-table" });
  table.append(h("div", { class: "pk-hud" },
    h("div", { class: "b" }, h("div", { class: "k" }, `ステージ ${run.ante + 1}/8 · ${BLIND[run.blind]}` + (run.lv > 1 ? ` · Lv${run.lv}` : "")),
      h("div", { class: "v" }, `🎯 ${target.toLocaleString()}`),
      run.blind === 2 || !R ? h("div", { class: "k" }, `ボス：${boss.e} ${boss.n}（${boss.d}）`) : null),
    h("div", { class: "b" }, h("div", { class: "k" }, "得点"), h("div", { class: "v", id: "pk-score" }, score.toLocaleString()),
      h("div", { class: "ar-bar", style: "margin-top:4px;border:0;background:rgba(0,0,0,.3)" }, h("i", { id: "pk-bar", style: `width:${Math.min(100, score / target * 100)}%` })))));
  // ジョーカー
  const jk = h("div", { class: "pk-jk", id: "pk-jk" });
  for (let i = 0; i < 5; i++){ const j = run.jk[i];
    jk.append(j ? pkJokerEl(j, ARCU.replace ? { cls: "", onclick: () => pkFinishTake(i) } : {}) : h("div", { class: "pk-j pk-e0" })); }
  table.append(jk);
  if (ARCU.replace) table.append(h("div", { class: "pk-prev", style: "color:#ffd447" }, "入れ替えるジョーカーをタップ"));
  box.append(table);

  if (run.over){
    box.append(h("div", { class: "panel", style: "text-align:center" }, h("div", { style: "font-size:2.4rem" }, run.won ? "🏆" : "💀"),
      h("h2", { style: "margin:4px 0" }, run.won ? "全ステージ制覇！" : `ステージ ${run.ante + 1} の${BLIND[run.blind]}で終了`),
      h("div", { class: "muted small" }, `1手の最高 ${run.best.toLocaleString()}点`),
      h("button", { class: "btn primary ar-btn", onclick: () => { A.poker = null; markDirty(); arcRenderBody(); } }, "もう一度")));
    box.append(pkLevels(run), pkRules());
    return;
  }
  if (run.offer){ box.append(pkOfferView(run)); box.append(pkLevels(run)); return; }
  if (!R){
    const t = arcTickets(), isBoss = run.blind === 2;
    box.append(h("div", { class: "panel", style: "text-align:center" },
      h("div", { class: "muted small" }, `ステージ ${run.ante + 1} · ${BLIND[run.blind]}`),
      h("h2", { style: "margin:4px 0" }, `🎯 ${target.toLocaleString()}点`),
      isBoss ? h("div", { class: "pl-banner r", style: "margin-top:6px" }, `${boss.e} ボス「${boss.n}」：${boss.d}`) : h("div", { class: "muted small" }, `このステージのボス：${boss.e} ${boss.n}（${boss.d}）`),
      h("div", { class: "muted small", style: "margin-top:6px" }, `出す ${L.plays}回 · 捨てる ${L.discs}回 · 手札 ${L.hand}枚 · デッキ ${run.deck.length}枚`),
      h("button", { class: "btn primary ar-btn", onclick: () => {
        if (!arcPay(ARC_COST.round)) return arcNoTicket(ARC_COST.round);
        PK().start(run); ARCU.sel = []; ARCU.focus = true; markDirty(); arcRenderBody(); } }, `勝負する（🎟${ARC_COST.round}）`),
      t.left < ARC_COST.round ? h("div", { class: "muted small", style: "margin-top:6px" }, `プレイ券が ${t.left}枚。QBを記録すると貯まります`) : null));
    box.append(pkLevels(run), pkRules());
    return;
  }
  // 手札
  const hand = R.hand.map(id => PK().card(run, id));
  const ord = ARCU.sort === "s" ? (a, z) => a.s - z.s || z.r - a.r : (a, z) => z.r - a.r || a.s - z.s;
  hand.sort(ord);
  ARCU.sel = ARCU.sel.filter(id => R.hand.includes(id));
  const prev = h("div", { class: "pk-prev", id: "pk-prev" });
  const calc = h("div", {}, h("div", { class: "pk-calc" }, h("span", { class: "ch", id: "pk-ch" }, "0"), "×", h("span", { class: "mu", id: "pk-mu" }, "0")),
    h("div", { class: "pk-calc ty", style: "margin:0;min-height:0", id: "pk-ty" }, ""));
  const zone = h("div", { class: "pk-zone", id: "pk-zone" });
  const handEl = h("div", { class: "pk-hand", id: "pk-hand" });
  const upd = () => {
    const sel = ARCU.sel;
    if (!sel.length){ prev.textContent = `出す ${R.plays}回 · 捨てる ${R.discs}回 · 残りの山 ${R.pile.length}枚`; $("#pk-ch") && ($("#pk-ch").textContent = "0"); $("#pk-mu") && ($("#pk-mu").textContent = "0"); $("#pk-ty") && ($("#pk-ty").textContent = ""); }
    else {
      const cards = sel.map(id => PK().card(run, id)), ev = ARC.pkEval(cards, run.jk.some(j => j.id === "four"));
      const ht = ARC.HT.find(x => x[0] === ev.type), lv = run.lvl[ev.type] || 0;
      let c = ht[2] + ht[4] * lv, m = ht[3] + ht[5] * lv; if (L.boss === "flint"){ c = Math.ceil(c / 2); m = Math.max(1, Math.ceil(m / 2)); }
      $("#pk-ch").textContent = c; $("#pk-mu").textContent = m; $("#pk-ty").textContent = `${ht[1]}` + (lv ? ` Lv${lv + 1}` : "");
      prev.textContent = `${sel.length}枚えらんだ`;
    }
    playB.disabled = !sel.length || ARCU.busy; discB.disabled = !sel.length || R.discs <= 0 || ARCU.busy;
  };
  for (const c of hand){
    const el = pkCardEl(c, { cls: ARCU.sel.includes(c.id) ? "sel" : "", onclick: () => {
      if (ARCU.busy) return;
      const i = ARCU.sel.indexOf(c.id);
      if (i >= 0) ARCU.sel.splice(i, 1); else if (ARCU.sel.length < 5) ARCU.sel.push(c.id); else return toast("出せるのは5枚まで");
      el.classList.toggle("sel"); upd();
    } });
    handEl.append(el);
  }
  const playB = h("button", { class: "btn pk-btn-play", onclick: () => pkDoPlay() }, `出す`);
  const discB = h("button", { class: "btn pk-btn-disc", onclick: () => pkDoDiscard() }, `捨てる（${R.discs}）`);
  table.append(calc, zone, handEl, prev,
    h("div", { class: "pk-row" }, playB, discB),
    h("div", { class: "pk-row", style: "margin-top:6px" },
      h("button", { class: "btn sm", style: "flex:1", onclick: () => { ARCU.sort = ARCU.sort === "s" ? "r" : "s"; arcRenderBody(); } }, ARCU.sort === "s" ? "並び：スート" : "並び：数字"),
      h("button", { class: "btn sm", style: "flex:1", onclick: () => { ARCU.sel = []; arcRenderBody(); } }, "選択を解除")));
  upd();
  box.append(pkLevels(run), pkRules());
  if (ARCU.focus){ ARCU.focus = false; setTimeout(() => { const tb = $(".topbar"), y = table.getBoundingClientRect().top + window.scrollY - (tb ? tb.offsetHeight : 0) - 8; window.scrollTo({ top: y, behavior: "smooth" }); }, 30); }
}
async function pkDoDiscard(){
  const run = arc().poker; if (!run || ARCU.busy || !ARCU.sel.length) return;
  if (PK().discard(run, ARCU.sel.slice())){ sfx("shake", 1); ARCU.sel = []; markDirty(); arcRenderBody(); }
}
async function pkDoPlay(){
  const A = arc(), run = A.poker; if (!run || ARCU.busy || !ARCU.sel.length) return;
  const ids = ARCU.sel.slice(), before = run.rd.score, target = run.rd.target;
  const cards = ids.map(id => ({ ...PK().card(run, id) }));
  const s = PK().play(run, ids);
  if (!s) return;
  A.stats.poker.hand = Math.max(A.stats.poker.hand, s.total);
  if (run.over){ A.stats.poker.best = Math.max(A.stats.poker.best, run.ante + 1); if (run.won){ A.stats.poker.wins++; A.clear.poker = Math.max(A.clear.poker, run.lv); } }
  else A.stats.poker.best = Math.max(A.stats.poker.best, run.ante + 1);
  markDirty();
  ARCU.sel = []; ARCU.busy = true;
  // 演出：出したカードを並べて、得点を順番に足していく
  const zone = $("#pk-zone"), ch = $("#pk-ch"), mu = $("#pk-mu"), ty = $("#pk-ty"), hand = $("#pk-hand");
  try {
    if (zone && ch && mu){
      document.querySelectorAll("#pk-hand .pc").forEach(e => { if (ids.includes(+e.dataset.id)) e.remove(); });
      $$(".pk-row button").forEach(b => b.disabled = true);
      const els = {}; for (const c of cards){ const e = pkCardEl(c, { cls: s.scoringIds.includes(c.id) ? "" : "off" }); els[c.id] = e; zone.append(e); }
      const fmt = v => (Math.round(v * 10) / 10).toLocaleString();
      let n = 0;
      for (const st of s.steps){
        if (st.k === "base"){ ty.textContent = htName(st.t); ch.textContent = st.chips; mu.textContent = fmt(st.mult); ch.classList.add("ar-bump"); await arcSleep(380); ch.classList.remove("ar-bump"); continue; }
        if (st.k === "card"){
          const e = els[st.id]; if (!e) continue;
          if (st.dead){ e.classList.add("ar-shake"); await arcSleep(260); continue; }
          e.classList.remove("hit"); void e.offsetWidth; e.classList.add("hit");
          e.querySelector(".fx")?.remove(); e.append(h("span", { class: "fx" }, `+${st.chips}`));
          ch.textContent = fmt(st.c); mu.textContent = fmt(st.m); sfx("answer", ++n * 2);
          for (const jid of st.by || []){ const je = $(`#pk-jk [data-j="${jid}"]`); if (je){ je.classList.remove("ar-bump"); void je.offsetWidth; je.classList.add("ar-bump"); } }
          await arcSleep(280); continue;
        }
        if (st.k === "held"){ const je = $(`#pk-jk [data-j="${st.j}"]`); if (je){ je.classList.remove("ar-bump"); void je.offsetWidth; je.classList.add("ar-bump"); }
          mu.textContent = fmt(st.m); sfx("coin"); await arcSleep(260); continue; }
        if (st.k === "joker"){
          const je = $(`#pk-jk [data-j="${st.j}"]`);
          if (je){ je.classList.remove("ar-bump"); void je.offsetWidth; je.classList.add("ar-bump"); je.querySelector(".fx")?.remove();
            je.append(h("span", { class: "fx" + (st.chips ? " c" : st.x !== 1 ? " xx" : "") }, st.chips ? `+${st.chips}` : st.x !== 1 ? `×${fmt(st.x)}` : `+${st.mult}倍率`)); }
          ch.textContent = fmt(st.c); mu.textContent = fmt(st.m);
          if (st.x !== 1){ mu.classList.remove("ar-bump"); void mu.offsetWidth; mu.classList.add("ar-bump"); sfx("chest"); } else sfx("coin");
          await arcSleep(st.x !== 1 ? 420 : 300); continue;
        }
      }
      ty.textContent = `${htName(s.type)} → ${s.total.toLocaleString()}点`;
      const sc = $("#pk-score"), bar = $("#pk-bar");
      if (sc){ sc.dataset.v = before; countUp(sc, before + s.total, 600); }
      if (bar) bar.style.width = Math.min(100, (before + s.total) / target * 100) + "%";
      if (s.total >= target * 0.5) sfx("combo"); else sfx("coin");
      await arcSleep(900);
    }
  } catch(e){ console.warn(e); }
  ARCU.busy = false;
  arcRenderBody();
  if (s.cleared && run.won){ sfx("evolve"); arcOverlay([h("div", { class: "big" }, "🏆"), h("h2", {}, "全ステージ制覇！"), h("p", {}, `ポーカー Lv${run.lv} クリア。難しさ Lv${run.lv + 1} が開いた。`)]); }
  else if (s.cleared){ sfx("level"); }
  else if (s.failed){ sfx("again"); arcOverlay([h("div", { class: "big" }, "💀"), h("h2", {}, "目標に届かなかった…"), h("p", { class: "muted" }, `ステージ ${run.ante + 1} の${BLIND[run.blind]}（${run.rd.score.toLocaleString()} / ${run.rd.target.toLocaleString()}点）`)]); }
}
function pkOfferView(run){
  const box = h("div", { class: "panel" });
  box.append(h("div", { class: "row" }, h("h2", { style: "margin:0" }, run.blind === 2 ? "🎉 ボス撃破！報酬を1つ" : "🎉 勝ち！報酬を1つ"), h("span", { class: "spacer" }),
    h("button", { class: "btn sm", onclick: () => { ARCU.pick = null; ARCU.picks = []; ARCU.replace = false; PK().take(run, -1); markDirty(); arcRenderBody(); } }, "受け取らない")));
  const list = h("div", { class: "pk-off" });
  run.offer.forEach((it, i) => {
    let e, t, d;
    if (it.k === "j"){ const J = ARC.JK[it.id]; e = J.e; t = `ジョーカー「${J.n}」`; d = J.d; }
    else if (it.k === "lv"){ const ht = ARC.HT.find(x => x[0] === it.id); e = "⬆️"; t = `${ht[1]} を ${it.n}レベル上げる`; d = `1レベルごとに チップ +${ht[4]}・倍率 +${ht[5]}（いま Lv${(run.lvl[it.id] || 0) + 1}）`; }
    else if (it.k === "cut"){ e = "✂️"; t = `デッキからカードを${it.n}枚まで取り除く`; d = "いらないカードを抜くと、欲しいカードを引きやすくなる"; }
    else { e = ARC.SUITS[it.s]; t = `カードを${it.n}枚まで ${ARC.SUITS[it.s]} に染める`; d = "フラッシュを狙いやすくなる"; }
    list.append(h("button", { class: "pk-o" + (ARCU.pick === i ? " on" : ""), onclick: () => {
      ARCU.pick = i; ARCU.picks = []; ARCU.replace = false;
      if (it.k === "j"){ if (run.jk.length >= 5){ ARCU.replace = true; toast("ジョーカーは5枚まで。入れ替えるものを上でタップ"); arcRenderBody(); return; } pkFinishTake(null); return; }
      if (it.k === "lv"){ pkFinishTake(null); return; }
      arcRenderBody();
    } }, h("span", { class: "e" }, e), h("div", {}, h("b", {}, t), h("div", { class: "muted small" }, d))));
  });
  box.append(list);
  const it = ARCU.pick != null ? run.offer[ARCU.pick] : null;
  if (it && (it.k === "cut" || it.k === "dye")){
    const deck = run.deck.slice().sort((a, z) => a.s - z.s || a.r - z.r);
    const grid = h("div", { class: "pk-deck" });
    for (const c of deck){ const el = pkCardEl(c, { cls: "mini" + (ARCU.picks.includes(c.id) ? " sel" : ""), onclick: () => {
      const k = ARCU.picks.indexOf(c.id); if (k >= 0) ARCU.picks.splice(k, 1); else if (ARCU.picks.length < it.n) ARCU.picks.push(c.id); else return toast(`${it.n}枚まで`);
      el.classList.toggle("sel"); okB.textContent = `${ARCU.picks.length}枚で決定`; okB.disabled = !ARCU.picks.length; } }); grid.append(el); }
    const okB = h("button", { class: "btn primary", style: "width:100%;margin-top:10px", disabled: !ARCU.picks.length, onclick: () => pkFinishTake(ARCU.picks.slice()) }, `${ARCU.picks.length}枚で決定`);
    box.append(h("div", { class: "small", style: "margin-top:12px" }, it.k === "cut" ? "取り除くカードを選ぶ" : `${ARC.SUITS[it.s]} に染めるカードを選ぶ`), grid, okB);
  }
  return box;
}
function pkFinishTake(arg){
  const run = arc().poker; if (!run || ARCU.pick == null) return;
  const it = run.offer[ARCU.pick];
  if (it.k === "j" && run.jk.length >= 5 && arg == null){ ARCU.replace = true; arcRenderBody(); return; }
  if (PK().take(run, ARCU.pick, arg)){ sfx("buy"); toast("受け取った"); }
  ARCU.pick = null; ARCU.picks = []; ARCU.replace = false; markDirty(); arcRenderBody();
}
function pkLevels(run){
  const g = h("div", { class: "pk-lv" });
  for (const ht of ARC.HT){ const lv = run.lvl[ht[0]] || 0;
    g.append(h("span", {}, ht[1]), h("span", { class: "muted" }, `Lv${lv + 1}`), h("b", {}, `${ht[2] + ht[4] * lv} × ${ht[3] + ht[5] * lv}`)); }
  return h("details", { class: "panel ar-help" }, h("summary", {}, `📊 役の一覧（デッキ ${run.deck.length}枚）`), g);
}
function pkRules(){
  const js = Object.values(ARC.JK).map(j => h("div", { class: "small" }, `${j.e} ${j.n} — `, h("span", { class: "muted" }, j.d)));
  const bs = Object.values(ARC.BOSS).map(b => h("div", { class: "small" }, `${b.e} ${b.n} — `, h("span", { class: "muted" }, b.d)));
  return h("details", { class: "panel ar-help" }, h("summary", {}, "📖 ルールとジョーカー図鑑"),
    h("p", { style: "margin:8px 0 0" }, "計算の順番：役の基本値 → 得点したカード（左から。カードに反応するジョーカーもここ）→ 手札に残したカード → ジョーカー（左から）。「+倍率」と「×倍率」は順番で結果が変わる（×は後ろに置くほど効く）。",
      h("br"), "ジョーカーの順番は、いったん外して入れ直すと右端に来る。目標点：" + [0, 1, 2, 3, 4, 5, 6, 7].map(a => (ARC.pkTarget(a, 0, 1)).toLocaleString()).join(" → ") + "（2戦目 ×1.5・ボス ×2）"),
    h("div", { class: "sl-dex" }, ...js), h("p", { style: "margin:10px 0 4px" }, h("b", {}, "ボス")), h("div", { class: "sl-dex" }, ...bs));
}

/* ---------- 今日画面への導線 ---------- */
function arcStrip(){
  const A = arc(), t = arcTickets();
  let st = "";
  if (A.poker && !A.poker.over) st = `ポーカー ステージ${A.poker.ante + 1}`;
  else if (A.slot && !A.slot.over) st = `スロット 家賃${A.slot.rent}/12`;
  return h("button", { class: "hp-strip", onclick: () => go("hospital") },
    h("span", { class: "big" }, "🎮"),
    h("div", { style: "flex:1;min-width:0" }, h("div", { style: "font-weight:700" }, `ゲーム 🎟 ${t.left}枚`),
      h("div", { class: "muted small" }, `今日 +${t.today}枚` + (st ? ` · ${st}` : ""))),
    h("span", { class: "muted" }, "→"));
}
{
  const orig = VIEWS.today;
  VIEWS.today = main => {
    orig(main);
    try { const stack = main.querySelector(".pl-stack"); const first = stack && [...stack.children].find(e => e.querySelector?.(".pl-qs")); if (first) first.after(arcStrip()); } catch(e){ console.warn(e); }
  };
}
VIEWS.hospital = viewArcade;
{ const v = location.hash.slice(1); if (v === "hospital" || v === "today" || !v) route(true); }
