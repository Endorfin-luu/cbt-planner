/* ============================================================
   ゲーム（アーケード）— 画面
   - 勉強には手を入れない。記録した QB の問題数（＋カード5枚で1枚）が「プレイ券」として貯まるだけ
   - スロット（1回まわす＝券2枚）を完済するとポーカー（1戦＝券10枚）が開く。クリアするたび難しさ Lv が上がる
   - ルールは arcade-core.js、ドット絵は arcade-art.js。状態は S.pl.arc（今日・計画と一緒に同期）
   hospital.js の後に読み込む。
   ============================================================ */
"use strict";

const ARC_COST = { spin: 2, round: 10 }, ARC_CARD = 5, ARC_BONUS = 30;
const ARCU = { tab: null, sel: [], sort: "r", busy: false, pick: null, picks: [], replace: false, rm: false, seen: new Set(), focus: false };

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
const tone = (f, d, o) => { try { window.Game?.SFX?.tone(f, d, o); } catch(e){} };
const spr = (id, size, cls) => ART.img(id, size, cls);
const arcSleep = ms => new Promise(r => setTimeout(r, ms));
const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ---------- 見た目 ---------- */
const NOTCH = "clip-path:polygon(4px 0,calc(100% - 4px) 0,calc(100% - 4px) 2px,calc(100% - 2px) 2px,calc(100% - 2px) 4px,100% 4px,100% calc(100% - 4px),calc(100% - 2px) calc(100% - 4px),calc(100% - 2px) calc(100% - 2px),calc(100% - 4px) calc(100% - 2px),calc(100% - 4px) 100%,4px 100%,4px calc(100% - 2px),2px calc(100% - 2px),2px calc(100% - 4px),0 calc(100% - 4px),0 4px,2px 4px,2px 2px,4px 2px)";
const ARC_CSS = `
.arx{font-family:"DotGothic16",var(--f-body);background:#140f22;color:#f3eefe;border-radius:6px;padding:12px 10px 14px;margin:-4px -2px 0;
  background-image:radial-gradient(#ffffff14 1px,transparent 1px),radial-gradient(#ffffff0c 1px,transparent 1px);background-size:22px 22px,13px 13px;background-position:0 0,7px 9px;letter-spacing:.02em}
.arx *{box-sizing:border-box}
.arx h1,.arx h2,.arx h3{font-family:"DotGothic16",var(--f-head);font-weight:400;color:#fff}
.arx .mut{color:#b5a9d6}
.arx .sm{font-size:.82rem}
.px-img{image-rendering:pixelated;image-rendering:crisp-edges;display:inline-block;vertical-align:middle}
#ar-body>*{min-width:0}
.ax-top{display:flex;align-items:center;gap:10px}
.ax-top h1{margin:0;font-size:1.5rem;text-shadow:2px 2px 0 #5a3fa0}
.ax-tk{margin-left:auto;display:flex;align-items:center;gap:6px;font-size:1.5rem;font-variant-numeric:tabular-nums}
.ax-tk small{font-size:.75rem;color:#b5a9d6}
.ax-info{font-size:.78rem;color:#b5a9d6;margin:4px 0 0;line-height:1.6}
.ax-seg{display:flex;gap:8px;margin:12px 0}
.ax-seg button{flex:1;font:inherit;font-size:1rem;padding:9px 6px;border:0;cursor:pointer;color:#cfc4ee;background:#2a2142;${NOTCH};display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:inset 0 -4px 0 #1b1530}
.ax-seg button.on{background:#ffd447;color:#2b1a00;box-shadow:inset 0 -4px 0 #c9921a}
.pxp{background:#241a3a;${NOTCH};padding:12px;box-shadow:inset 0 0 0 2px #3d2f63;margin-bottom:10px}
.pxp>h2{margin:0 0 6px;font-size:1.15rem}
.pxbtn{font-family:"DotGothic16",var(--f-body);font-size:1.1rem;border:0;color:#fff;background:#e8574a;padding:12px 14px;cursor:pointer;${NOTCH};
  box-shadow:inset -4px -4px 0 rgba(0,0,0,.28),inset 4px 4px 0 rgba(255,255,255,.22);width:100%;letter-spacing:.06em}
.pxbtn:active{transform:translateY(2px);box-shadow:inset 4px 4px 0 rgba(0,0,0,.28)}
.pxbtn:disabled{filter:grayscale(.85) brightness(.75);cursor:default}
.pxbtn.blue{background:#2f6fd8}.pxbtn.gold{background:#ffd447;color:#2b1a00}.pxbtn.gray{background:#4c4266}.pxbtn.green{background:#2fa35a}
.pxbtn.sm{font-size:.85rem;padding:7px 10px;width:auto}
.ax-row{display:flex;gap:8px;align-items:center}
.ax-row .sp{flex:1}
.ax-help{font-size:.82rem;line-height:1.75;color:#d8cff3}
.ax-help summary{cursor:pointer;color:#fff;font-size:.95rem}
.ax-help b{color:#ffd447;font-weight:400}
.ax-num{font-variant-numeric:tabular-nums}
.ax-pips{display:inline-flex;gap:2px}
.ax-pips img{width:10px;height:10px}
.ax-pips img.off{filter:grayscale(1) brightness(.45)}
.ax-bar{height:10px;background:#120d1e;box-shadow:inset 0 0 0 2px #3d2f63;margin-top:8px;padding:2px}
.ax-bar>i{display:block;height:100%;background:repeating-linear-gradient(90deg,#ffd447 0 6px,#f0a020 6px 8px);transition:width .6s steps(12)}
.ax-ov{position:fixed;inset:0;background:rgba(8,5,16,.7);z-index:300;display:flex;align-items:center;justify-content:center;padding:16px;animation:axFade .2s}
.ax-ov .box{font-family:"DotGothic16",var(--f-body);background:#241a3a;color:#fff;${NOTCH};box-shadow:inset 0 0 0 3px #ffd447;padding:22px 18px;max-width:380px;width:100%;text-align:center;animation:axPop .35s cubic-bezier(.2,1.4,.4,1)}
.ax-ov h2{font-family:"DotGothic16";font-weight:400;margin:8px 0;color:#ffd447;font-size:1.4rem}
.ax-ov p{color:#d8cff3;margin:6px 0 14px}
@keyframes axFade{from{opacity:0}to{opacity:1}}
@keyframes axPop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes axBump{0%{transform:scale(1)}40%{transform:scale(1.3)}100%{transform:scale(1)}}
@keyframes axShake{0%,100%{transform:translate(0,0)}20%{transform:translate(-4px,2px)}40%{transform:translate(4px,-2px)}60%{transform:translate(-3px,-1px)}80%{transform:translate(3px,1px)}}
@keyframes axFloat{0%{transform:translate(-50%,0);opacity:1}100%{transform:translate(-50%,-26px);opacity:0}}
@keyframes axBlink{0%,49%{opacity:1}50%,100%{opacity:.25}}
@keyframes axFlame{0%{transform:scaleY(1) translateY(0)}50%{transform:scaleY(1.25) translateY(-3px)}100%{transform:scaleY(.9) translateY(1px)}}
.ax-bump{animation:axBump .28s steps(4)}
.ax-shake{animation:axShake .3s steps(5) 2}
.ax-float{position:absolute;left:50%;top:-6px;font-size:.95rem;color:#ffd447;text-shadow:2px 2px 0 #000;white-space:nowrap;pointer-events:none;animation:axFloat .8s steps(8) forwards;z-index:5}
.ax-float.red{color:#ff6a5a}
.coin-fly{position:fixed;z-index:400;width:22px;height:22px;pointer-events:none;image-rendering:pixelated;transition:transform .5s cubic-bezier(.45,-0.35,.7,1);will-change:transform}

/* スロット */
.sl-hud{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.sl-hud .cell{background:#1a1330;${NOTCH};padding:8px 10px;box-shadow:inset 0 0 0 2px #3d2f63}
.sl-hud .k{font-size:.72rem;color:#b5a9d6}
.sl-hud .v{font-size:1.45rem;display:flex;align-items:center;gap:6px;line-height:1.2}
.sl-hud .v.gold{color:#ffd447}
.sl-mach{background:#c2352c;${NOTCH};padding:8px;box-shadow:inset 0 0 0 3px #7a1a14,inset 0 0 0 6px #e8574a,inset -10px -10px 0 #9e2a22}
.sl-marq{display:flex;align-items:center;justify-content:center;gap:8px;background:#2a1030;${NOTCH};padding:6px 8px;margin-bottom:8px;box-shadow:inset 0 0 0 2px #ffd447}
.sl-marq .t{font-size:1.25rem;color:#ffd447;text-shadow:2px 2px 0 #c2352c;letter-spacing:.18em}
.sl-bulbs{display:flex;gap:5px}
.sl-bulbs i{width:6px;height:6px;background:#ffd447;display:block;box-shadow:0 0 6px #ffd447;animation:axBlink .6s steps(1) infinite}
.sl-bulbs i:nth-child(2n){animation-delay:.3s}
.sl-win{background:#0e0a18;padding:6px;${NOTCH};box-shadow:inset 0 0 0 2px #000}
.sl-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}
.sl-c{min-width:0;aspect-ratio:1;background:linear-gradient(#fdf8ec,#e9dfc6);position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;${NOTCH}}
.sl-c img{width:84%;height:84%}
.sl-c.e0{background:#2a2142}
.sl-c.dead img{filter:grayscale(1) brightness(1.3);opacity:.35}
.sl-c.dead::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(45deg,transparent 0 6px,rgba(200,40,40,.35) 6px 8px)}
.sl-c .v{position:absolute;right:5px;bottom:3px;font-size:.85rem;color:#fff;text-shadow:1px 0 0 #000,-1px 0 0 #000,0 1px 0 #000,0 -1px 0 #000,2px 2px 0 #000;line-height:1}
.sl-c .v.z{color:#9a90b0}
.sl-c .v.hi{color:#ffd447;font-size:1rem}
.sl-c .v.mega{color:#ff7a3a;font-size:1.1rem}
.sl-c .fx{position:absolute;left:2px;top:2px;display:flex;gap:1px}
.sl-c .fx img{width:12px;height:12px}
.sl-c.spin img{animation:slJit .07s steps(2) infinite alternate;filter:blur(.4px) brightness(1.15)}
@keyframes slJit{from{transform:translateY(-28%)}to{transform:translateY(28%)}}
.sl-c.land img{animation:slLand .25s steps(4)}
@keyframes slLand{0%{transform:translateY(-22%)}60%{transform:translateY(8%)}100%{transform:none}}
.sl-c.hit{animation:slHit .25s steps(4)}
@keyframes slHit{0%,100%{transform:scale(1)}40%{transform:scale(1.12)}}
.sl-c.eaten img{animation:slPoof .45s steps(5) forwards}
@keyframes slPoof{to{transform:scale(1.7) rotate(25deg);opacity:0}}
.sl-tray{display:flex;align-items:center;justify-content:space-between;background:#2a1030;${NOTCH};margin-top:8px;padding:6px 10px;box-shadow:inset 0 0 0 2px #7a1a14}
.sl-tray .msg{font-size:.85rem;color:#f3eefe}
.sl-tray .gain{font-size:1.6rem;color:#ffd447;text-shadow:2px 2px 0 #7a1a14;font-variant-numeric:tabular-nums}
.sl-spin{margin-top:10px;font-size:1.3rem;padding:14px}
.sl-offer{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:8px}
.sl-card{min-width:0;font:inherit;color:#f3eefe;background:#1a1330;border:0;cursor:pointer;padding:10px 6px 8px;${NOTCH};box-shadow:inset 0 0 0 2px #6a5c90;display:flex;flex-direction:column;align-items:center;gap:3px;text-align:center}
.sl-card:active{transform:translateY(2px)}
.sl-card img.big{width:56px;height:56px}
.sl-card .nm{font-size:.95rem}
.sl-card .d{font-size:.7rem;color:#c8bde6;line-height:1.35}
.sl-card.U{box-shadow:inset 0 0 0 2px #4fa3e8,inset 0 0 0 4px #1a1330,inset 0 0 14px #4fa3e855}
.sl-card.R{box-shadow:inset 0 0 0 2px #ffd447,inset 0 0 0 4px #1a1330,inset 0 0 18px #ffd44777;animation:slShine 1.4s steps(6) infinite}
@keyframes slShine{0%,100%{background:#1a1330}50%{background:#2f2448}}
.sl-tag{font-size:.65rem;padding:1px 6px;background:#4c4266;color:#fff}
.sl-tag.U{background:#2a6fb8}.sl-tag.R{background:#d9951c;color:#2b1a00}
.sl-bag{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
.sl-bag button{font:inherit;background:#1a1330;border:0;color:#f3eefe;padding:4px 6px 3px;cursor:pointer;${NOTCH};box-shadow:inset 0 0 0 2px #3d2f63;display:flex;align-items:center;gap:3px;font-size:.8rem}
.sl-bag button img{width:28px;height:28px}
.sl-bag.rm button{box-shadow:inset 0 0 0 2px #e8574a;animation:axBlink 1s steps(1) infinite}
.sl-dex{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:6px 12px;margin-top:8px}
.sl-dex>div{display:flex;gap:8px;align-items:center;font-size:.8rem}
.sl-dex img{width:32px;height:32px;flex:0 0 auto}
.ax-title{display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 0 4px}
.ax-title .logo{font-size:2rem;color:#ffd447;text-shadow:3px 3px 0 #c2352c,6px 6px 0 #000;letter-spacing:.2em}
.ax-title .row{display:flex;gap:6px}
.ax-title .row img{width:40px;height:40px;animation:slBob 1.2s steps(2) infinite}
.ax-title .row img:nth-child(2n){animation-delay:.6s}
@keyframes slBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}

/* ポーカー */
.pk-felt{${NOTCH};padding:10px;box-shadow:inset 0 0 0 3px #0b3621,inset 0 0 0 6px #a0683a,inset 0 0 0 8px #5e3b1a;background-size:64px 64px}
.pk-hud{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.pk-hud .b{background:rgba(6,20,12,.55);${NOTCH};padding:7px 9px}
.pk-hud .k{font-size:.7rem;color:#bfe8cf}
.pk-hud .v{font-size:1.35rem;display:flex;align-items:center;gap:5px;line-height:1.25}
.pk-boss{display:flex;align-items:center;gap:6px;font-size:.72rem;color:#ffd0c8;margin-top:3px}
.pk-boss img{width:20px;height:20px}
.pk-jk{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;margin:8px 0 4px}
.pk-j{position:relative;background:#fff6dc;color:#3a2a00;${NOTCH};padding:5px 2px 4px;min-height:70px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;font-size:.62rem;line-height:1.15;text-align:center;box-shadow:inset 0 0 0 2px #e0a21b,inset 0 -4px 0 #e8d7aa}
.pk-j img{width:36px;height:36px}
.pk-j.x{box-shadow:inset 0 0 0 2px #d63a2f,inset 0 -4px 0 #e8d7aa}.pk-j.chips{box-shadow:inset 0 0 0 2px #2f6fd8,inset 0 -4px 0 #e8d7aa}.pk-j.util{box-shadow:inset 0 0 0 2px #7a7290,inset 0 -4px 0 #e8d7aa}
.pk-j.e0{background:rgba(0,0,0,.22);box-shadow:inset 0 0 0 2px rgba(255,255,255,.18);cursor:default}
.pk-j.pick{animation:axBlink .8s steps(1) infinite}
.pk-j .cnt{color:#d63a2f}
.pk-j .tag{position:absolute;top:3px;left:50%;transform:translateX(-50%);font-size:.75rem;padding:0 5px;color:#fff;background:#d63a2f;white-space:nowrap;text-shadow:1px 1px 0 #000;animation:axPop .2s;z-index:3}
.pk-j .tag.c{background:#2f6fd8}.pk-j .tag.xx{background:#9a3ad8;font-size:.85rem}
.pk-calc{display:flex;align-items:center;justify-content:center;gap:8px;margin:6px 0 2px;position:relative}
.pk-calc .ch,.pk-calc .mu{min-width:84px;text-align:center;padding:5px 8px;font-size:1.45rem;${NOTCH};font-variant-numeric:tabular-nums;color:#fff;text-shadow:2px 2px 0 rgba(0,0,0,.35)}
.pk-calc .ch{background:#2f6fd8;box-shadow:inset -3px -3px 0 #1d4a9a}.pk-calc .mu{background:#d63a2f;box-shadow:inset -3px -3px 0 #8e2219}
.pk-calc .x{font-size:1.2rem;color:#fff}
.pk-flames{position:absolute;inset:-14px 0 auto;display:flex;justify-content:center;gap:2px;pointer-events:none}
.pk-flames img{width:22px;height:26px;animation:axFlame .18s steps(2) infinite alternate;transform-origin:bottom}
.pk-flames img:nth-child(2n){animation-delay:.09s}
.pk-ty{text-align:center;font-size:.95rem;min-height:1.4em;color:#fff;text-shadow:2px 2px 0 rgba(0,0,0,.35)}
.pk-zone{--n:8;min-height:66px;display:flex;justify-content:center;gap:4px;align-items:flex-end;margin:4px 0}
.pk-hand{display:flex;justify-content:center;gap:3px;margin-top:4px;padding-top:16px;position:relative}
.pc{width:min(58px,calc((100% - (var(--n,8) - 1) * 3px) / var(--n,8)));aspect-ratio:20/28;position:relative;cursor:pointer;transition:transform .1s steps(2);flex:0 0 auto;user-select:none}
.pc img{width:100%;height:100%;display:block;image-rendering:pixelated;filter:drop-shadow(0 2px 0 rgba(0,0,0,.35))}
.pc.sel{transform:translateY(-14px)}
.pc.sel img{filter:drop-shadow(0 0 0 #ffd447) drop-shadow(0 -2px 0 #ffd447) drop-shadow(2px 0 0 #ffd447) drop-shadow(-2px 0 0 #ffd447)}
.pc.off img{filter:brightness(.6)}
.pc.deal{animation:pkDeal .34s steps(6) both}
@keyframes pkDeal{from{transform:translate(160px,-40px) rotate(25deg);opacity:0}to{transform:none;opacity:1}}
.pc.rise{animation:pkRise .25s steps(4) both}
@keyframes pkRise{from{transform:translateY(70px);opacity:.3}to{transform:none;opacity:1}}
.pc.hit{animation:axBump .28s steps(4)}
.pc .tag{position:absolute;top:-16px;left:50%;transform:translateX(-50%);background:#2f6fd8;color:#fff;font-size:.72rem;padding:0 4px;white-space:nowrap;animation:axPop .2s;text-shadow:1px 1px 0 #000}
.pk-pile{display:flex;margin-top:5px;align-items:center;gap:3px;font-size:.7rem;color:#bfe8cf}
.pk-pile img{width:16px;height:22px;image-rendering:pixelated}
.pk-info{text-align:center;font-size:.78rem;color:#d8f0e0;min-height:1.3em;margin-top:6px}
.pk-btns{display:flex;gap:8px;margin-top:8px}
.pk-btns .pxbtn{flex:1}
.pk-sub{display:flex;gap:8px;margin-top:6px}
.pk-sub .pxbtn{flex:1;font-size:.8rem;padding:6px;background:rgba(0,0,0,.35)}
.pk-off{display:grid;gap:8px;margin-top:8px}
.pk-o{display:flex;align-items:center;gap:10px;font:inherit;color:#f3eefe;background:#1a1330;border:0;padding:10px;cursor:pointer;text-align:left;${NOTCH};box-shadow:inset 0 0 0 2px #6a5c90}
.pk-o.on{box-shadow:inset 0 0 0 2px #ffd447,inset 0 0 14px #ffd44755}
.pk-o .ic{width:44px;height:44px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;background:#fff6dc;${NOTCH}}
.pk-o .ic img{width:36px;height:36px}
.pk-o .ic.t{background:#2a2142;font-size:1.5rem;color:#ffd447}
.pk-o .d{font-size:.75rem;color:#c8bde6}
.pk-deck{display:grid;grid-template-columns:repeat(13,minmax(0,1fr));gap:2px;margin-top:8px}
.pk-deck .pc{width:100%}
.pk-deck .pc.sel{transform:translateY(-5px)}
.pk-lv{display:grid;grid-template-columns:1fr auto auto;gap:3px 12px;font-size:.82rem;margin-top:6px}
`;
(function(){ const st = document.createElement("style"); st.textContent = ARC_CSS; document.head.append(st); })();

function arcOverlay(kids, onClose){
  const ov = h("div", { class: "ax-ov" }), box = h("div", { class: "box" }, ...kids,
    h("button", { class: "pxbtn gold", style: "margin-top:4px", onclick: () => close() }, "OK"));
  ov.append(box);
  const close = () => { ov.remove(); onClose && onClose(); };
  ov.addEventListener("click", e => { if (e.target === ov) close(); });
  document.body.append(ov);
  return close;
}
function countUp(el, to, ms = 500, fmt = v => Math.round(v).toLocaleString()){
  if (!el) return;
  const from = +(el.dataset.v || 0), t0 = performance.now(); el.dataset.v = to;
  const step = t => { const k = Math.min(1, (t - t0) / ms); el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function floatText(host, text, cls = ""){
  if (!host) return; const f = h("span", { class: "ax-float " + cls }, text);
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  host.append(f); setTimeout(() => f.remove(), 900);
}
function bump(el, cls = "ax-bump"){ if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
/** コインを from 要素から to 要素へ飛ばす */
function flyCoin(from, to, delay = 0, done){
  if (!from || !to || reduceMotion()){ done && done(); return; }
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  const im = spr("coin", 22, "coin-fly");
  im.style.left = (a.left + a.width / 2 - 11) + "px"; im.style.top = (a.top + a.height / 2 - 11) + "px";
  setTimeout(() => {
    document.body.append(im);
    requestAnimationFrame(() => requestAnimationFrame(() => { im.style.transform = `translate(${b.left + 14 - a.left - a.width / 2}px,${b.top + b.height / 2 - a.top - a.height / 2}px) scale(.8)`; }));
    setTimeout(() => { im.remove(); done && done(); }, 520);
  }, delay);
}

/* ============================================================
   画面
   ============================================================ */
function viewArcade(main){
  qx(); const A = arc(), tk = arcTickets();
  if (!ARCU.tab) ARCU.tab = A.clear.slot >= 1 && A.poker && !A.slot ? "poker" : "slot";
  const wrap = h("div", { class: "arx" });
  wrap.append(h("div", { class: "ax-top" }, h("h1", {}, "ゲーム"),
      h("div", { class: "ax-tk" }, spr("ticket", 28), h("span", { id: "ar-tk", class: "ax-num" }, String(tk.left)), h("small", {}, `今日+${tk.today}`))),
    h("div", { class: "ax-info" }, `勉強はいつも通り記録するだけ。QB1問＝券1枚、カード${ARC_CARD}回＝券1枚。スロット1回＝券${ARC_COST.spin}枚、ポーカー1戦＝券${ARC_COST.round}枚`));
  const lockedP = A.clear.slot < 1;
  wrap.append(h("div", { class: "ax-seg" },
    h("button", { class: ARCU.tab === "slot" ? "on" : "", onclick: () => { ARCU.tab = "slot"; arcRender(); } }, spr("cherry", 22), "スロット", A.clear.slot ? h("span", {}, "★" + A.clear.slot) : null),
    h("button", { class: ARCU.tab === "poker" ? "on" : "", onclick: () => { ARCU.tab = "poker"; arcRender(); } }, spr(lockedP ? "lock" : "j_suitS", 20), "ポーカー", A.clear.poker ? h("span", {}, "★" + A.clear.poker) : null)));
  const body = h("div", { id: "ar-body" });
  wrap.append(body);
  main.append(wrap);
  arcRenderBody(body);
  // 前の病院
  const old = h("details", { class: "panel", style: "margin-top:14px" }, h("summary", { style: "cursor:pointer;font-weight:700" }, "🏥 前の病院（部門・施設・当直）"));
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
  const sel = h("select", { style: "font:inherit;background:#1a1330;color:#fff;border:2px solid #6a5c90;padding:4px 6px" }, ...[...Array(max)].map((_, i) => h("option", { value: String(i + 1), selected: i + 1 === max }, `Lv${i + 1}` + (i + 1 === max ? "（未クリア）" : ""))));
  return { el: h("div", { class: "ax-row", style: "margin:10px 0 0;justify-content:center" }, h("span", { class: "sm" }, "難しさ"), sel), get: () => +sel.value };
}
function arcNoTicket(n){
  const t = arcTickets();
  toast(`券が足りません（あと${n - t.left}枚）。QBを${n - t.left}問記録すると遊べます`, 3200);
}
const pips = (n, on, id = "coin") => h("span", { class: "ax-pips" }, ...[...Array(n)].map((_, i) => spr(id, 11, i < on ? "" : "off")));

/* ============================================================
   スロット
   ============================================================ */
const SL = () => ARC.slot;
const RAR = { C: "ふつう", U: "めずらしい", R: "レア" };
function slotView(box){
  const A = arc(), run = A.slot, SY = ARC.SY;
  if (!run){
    const lv = arcLevelPicker("slot");
    box.append(h("div", { class: "pxp" },
      h("div", { class: "ax-title" }, h("div", { class: "logo" }, "SLOT"),
        h("div", { class: "row" }, ...["cherry", "cat", "bee", "gem", "dragon", "coin"].map(id => spr(id, 40)))),
      h("div", { class: "ax-help", style: "margin-top:8px" },
        "まわすと、持っているシンボルが5×4の盤面にランダムに並んでコインを稼ぐ。隣どうしで効果が出る（ネコの隣のミルクは飲まれて+9、ハチの隣の花は×2…）。",
        h("br"), "まわすたびに3つから1つシンボルを足せる（足さなくてもいい）。決まった回数ごとに家賃を払う。家賃はどんどん上がって、払えないと閉店。",
        h("br"), h("b", {}, "12回の家賃を払いきればクリア"), "。クリアするとポーカーが開く。家賃を払うたびに「取り除く券」も1枚もらえる。"),
      lv.el,
      h("button", { class: "pxbtn sl-spin", onclick: () => { A.slot = SL().new(lv.get()); A.stats.slot.runs++; markDirty(); arcRenderBody(); } }, "▶ はじめる"),
      A.stats.slot.runs ? h("div", { class: "mut sm", style: "margin-top:8px;text-align:center" }, `これまで${A.stats.slot.runs}回・クリア${A.stats.slot.wins}回・最高 家賃${A.stats.slot.best}回`) : null));
    box.append(slotDex());
    return;
  }
  const amt = SL().rentAt(Math.min(run.rent, 11), run.lv), last = run.last;
  // HUD
  box.append(h("div", { class: "sl-hud", style: "margin-bottom:8px" },
    h("div", { class: "cell" }, h("div", { class: "k" }, "コイン"), h("div", { class: "v gold" }, spr("coin", 24), h("span", { id: "sl-coins", class: "ax-num", "data-v": String(run.coins) }, run.coins.toLocaleString()))),
    h("div", { class: "cell" }, h("div", { class: "k" }, `家賃 ${Math.min(run.rent + 1, 12)}/12` + (run.lv > 1 ? `・Lv${run.lv}` : "") + (run.over ? "" : `・あと${run.left}回`)),
      h("div", { class: "v", id: "sl-rent" }, spr("house", 24), h("span", { class: "ax-num" }, amt.toLocaleString())))));
  box.append(h("div", { class: "pxp", style: "padding:8px 10px" }, h("div", { class: "ax-row sm" }, h("span", { class: "mut" }, "払った家賃"), h("span", { class: "sp" }), pips(12, run.rent)),
    h("div", { class: "ax-bar" }, h("i", { id: "sl-bar", style: `width:${Math.min(100, run.coins / amt * 100)}%` }))));
  // 筐体
  const grid = h("div", { class: "sl-grid", id: "sl-grid" });
  for (let p = 0; p < 20; p++) grid.append(slotCell(last && last.cell[p]));
  const tray = h("div", { class: "sl-tray" }, h("span", { class: "msg", id: "sl-msg" }, last ? (last.paid > 0 ? `家賃 ${last.paid} を払った！` : last.paid < 0 ? "家賃が払えなかった…" : "この回の稼ぎ") : "レバーを引こう"),
    h("span", { class: "gain", id: "sl-gain" }, last ? `+${last.gain}` : ""));
  box.append(h("div", { class: "sl-mach", id: "sl-mach" },
    h("div", { class: "sl-marq" }, h("div", { class: "sl-bulbs" }, ...[...Array(4)].map(() => h("i"))), h("span", { class: "t" }, "LUCKY"), h("div", { class: "sl-bulbs" }, ...[...Array(4)].map(() => h("i")))),
    h("div", { class: "sl-win" }, grid), tray));
  // 操作
  if (run.over){
    box.append(h("div", { class: "pxp", style: "text-align:center;margin-top:10px" },
      spr(run.won ? "trophy" : "skull", 56),
      h("h2", { style: "margin:6px 0" }, run.won ? "完済！クリア" : `家賃${run.rent}回で閉店`),
      h("div", { class: "mut sm" }, `${run.spins}回まわした・1回の最高 +${run.best}`),
      h("button", { class: "pxbtn sl-spin", onclick: () => { A.slot = null; markDirty(); arcRenderBody(); } }, "もう一度")));
  } else if (run.offer){
    box.append(h("div", { class: "pxp", style: "margin-top:10px", id: "sl-offer" }, h("div", { class: "ax-row" }, h("span", {}, "シンボルを1つ足す"), h("span", { class: "sp" }),
      h("button", { class: "pxbtn gray sm", onclick: () => { SL().pick(run, null); markDirty(); arcRenderBody(); } }, "足さない")),
      h("div", { class: "sl-offer" }, ...run.offer.map(id => { const s = SY[id];
        return h("button", { class: "sl-card " + s.r, onclick: () => { SL().pick(run, id); sfx("buy"); markDirty(); arcRenderBody(); } },
          h("span", { class: "sl-tag " + s.r }, RAR[s.r]), spr(id, 56, "big"), h("span", { class: "nm" }, s.n),
          h("span", { class: "sm", style: "color:#ffd447" }, `+${s.v}`), h("span", { class: "d" }, s.d)); }))));
  } else {
    const t = arcTickets();
    box.append(h("button", { class: "pxbtn sl-spin", id: "sl-spin", disabled: ARCU.busy, onclick: () => slotDoSpin() }, `🎰 まわす（券${ARC_COST.spin}）`),
      t.left < ARC_COST.spin ? h("div", { class: "mut sm", style: "text-align:center;margin-top:6px" }, "券がありません。QBを記録すると貯まります") : "");
  }
  // バッグ
  const counts = {}; run.bag.forEach(b => counts[b.id] = (counts[b.id] || 0) + 1);
  const bag = h("div", { class: "sl-bag" + (ARCU.rm ? " rm" : "") }, ...Object.entries(counts).sort((a, z) => z[1] - a[1]).map(([id, n]) =>
    h("button", { title: `${SY[id].n}：${SY[id].d || "効果なし"}`, onclick: () => {
      if (ARCU.rm){ const bi = run.bag.findIndex(b => b.id === id); SL().remove(run, bi); ARCU.rm = false; sfx("eat"); toast(`${SY[id].n}を1つ取り除いた`); markDirty(); arcRenderBody(); }
      else toast(`${SY[id].n}（+${SY[id].v}）${SY[id].d ? "：" + SY[id].d : ""}`, 3000);
    } }, spr(id, 28), `×${n}`)));
  box.append(h("div", { class: "pxp", style: "margin-top:10px" }, h("div", { class: "ax-row" }, h("span", {}, `持っているシンボル ${run.bag.length}`), h("span", { class: "sp" }),
    run.rm > 0 && !run.over ? h("button", { class: "pxbtn sm " + (ARCU.rm ? "" : "gray"), onclick: () => { ARCU.rm = !ARCU.rm; arcRenderBody(); } }, ARCU.rm ? "やめる" : `取り除く ×${run.rm}`) : null),
    h("div", { class: "sm " + (ARCU.rm ? "" : "mut"), style: "margin-top:4px;" + (ARCU.rm ? "color:#ff8a7a" : "") }, ARCU.rm ? "取り除くシンボルをタップ" : "盤面は20マス。20個を超えると、まわすたびにランダムに20個だけ並ぶ。タップで説明"),
    bag));
  box.append(slotDex());
}
function slotCell(c){
  if (!c) return h("div", { class: "sl-c e0" });
  const s = ARC.SY[c.id], el = h("div", { class: "sl-c" + (c.dead ? " dead" : ""), title: `${s.n}${s.d ? "：" + s.d : ""}` }, spr(c.grow || c.id));
  if (!c.dead) el.append(h("span", { class: "v" + (c.val === 0 ? " z" : c.val >= 20 ? " mega" : c.val >= 8 ? " hi" : "") }, String(c.val)));
  if (c.fx && c.fx.length) el.append(h("span", { class: "fx" }, ...c.fx.slice(0, 3).filter(id => ART.SPR[id]).map(id => spr(id, 12))));
  return el;
}
async function slotDoSpin(){
  const A = arc(), run = A.slot; if (!run || run.over || run.offer || ARCU.busy) return;
  if (!arcPay(ARC_COST.spin)) return arcNoTicket(ARC_COST.spin);
  ARCU.busy = true;
  const coins0 = run.coins, bagIds = run.bag.map(b => b.id);
  const res = SL().spin(run);
  if (run.over){ A.stats.slot.best = Math.max(A.stats.slot.best, run.rent); if (run.won){ A.stats.slot.wins++; A.clear.slot = Math.max(A.clear.slot, run.lv); } }
  markDirty();
  const tk = $("#ar-tk"); if (tk) tk.textContent = String(arcTickets().left);
  const grid = $("#sl-grid"), gain = $("#sl-gain"), msg = $("#sl-msg"), coinsEl = $("#sl-coins"), btn = $("#sl-spin");
  if (btn) btn.disabled = true;
  try {
    if (grid && !reduceMotion()){
      const cells = [...grid.children];
      if (gain) gain.textContent = ""; if (msg) msg.textContent = "…";
      // リールを回す
      const rnd = () => bagIds[Math.floor(Math.random() * bagIds.length)] || "coin";
      cells.forEach(el => { el.className = "sl-c spin"; el.innerHTML = ""; el.append(spr(rnd())); });
      const flick = setInterval(() => cells.forEach(el => { if (el.classList.contains("spin")) el.firstChild.src = ART.url(rnd()); }), 70);
      tone(160, .25, { type: "sawtooth", slide: 2.2, vol: .03 });
      await arcSleep(380);
      for (let col = 0; col < 5; col++){
        for (let row = 0; row < 4; row++){
          const p = row * 5 + col, c = res.cell[p], el = cells[p];
          const nu = c ? h("div", { class: "sl-c land" }, spr(c.id)) : h("div", { class: "sl-c e0" });
          el.replaceWith(nu); cells[p] = nu;
        }
        tone(220 + col * 30, .05, { type: "square", vol: .05 });
        await arcSleep(140);
      }
      clearInterval(flick);
      await arcSleep(120);
      // 食べる・割る
      const eaten = res.cell.map((c, p) => c && c.dead ? p : -1).filter(p => p >= 0);
      if (eaten.length){
        res.cell.forEach((c, p) => { if (c && c.fx && c.fx.length){ bump(cells[p], "hit"); } });
        eaten.forEach(p => cells[p].classList.add("eaten"));
        sfx("eat"); await arcSleep(420);
        eaten.forEach(p => { const nu = slotCell(res.cell[p]); cells[p].replaceWith(nu); cells[p] = nu; });
      }
      // 育つ
      res.cell.forEach((c, p) => { if (c && c.grow){ const im = cells[p].querySelector("img"); if (im){ im.src = ART.url(c.grow); bump(cells[p], "hit"); floatText(cells[p], "成長！"); } } });
      // 1マスずつ数える
      let run$ = coins0, n = 0, flying = 0;
      const order = res.cell.map((c, p) => [c, p]).filter(([c]) => c && !c.dead);
      for (const [c, p] of order){
        const el = cells[p];
        el.append(h("span", { class: "v" + (c.val === 0 ? " z" : c.val >= 20 ? " mega" : c.val >= 8 ? " hi" : "") }, String(c.val)));
        if (c.val > 0){
          bump(el, "hit"); n++;
          tone(440 * Math.pow(2, Math.min(n, 18) / 12), .06, { type: "square", vol: .035 });
          if (n <= 14){ flying++; const v = c.val; flyCoin(el, coinsEl, 0, () => { run$ += v; flying--; if (coinsEl){ coinsEl.dataset.v = run$; coinsEl.textContent = run$.toLocaleString(); bump(coinsEl.parentElement); } }); }
          else run$ += c.val;
          await arcSleep(c.val >= 8 ? 110 : 60);
        }
      }
      await arcSleep(560);
      if (coinsEl){ coinsEl.dataset.v = run$; countUp(coinsEl, coins0 + res.gain, 300); }
      if (gain){ gain.dataset.v = 0; countUp(gain, res.gain, 450, v => "+" + Math.round(v)); }
      if (msg) msg.textContent = "この回の稼ぎ";
      if (res.gain >= 40){ sfx("combo"); bump($("#sl-mach"), "ax-shake"); }
      await arcSleep(500);
      // 家賃
      if (res.paid){
        const rentEl = $("#sl-rent");
        if (res.paid > 0){ sfx("level"); floatText(rentEl, `-${res.paid}`, "red"); if (coinsEl) countUp(coinsEl, coins0 + res.gain - res.paid, 600); if (msg) msg.textContent = `家賃 ${res.paid} を払った！`; }
        else { sfx("again"); if (rentEl) bump(rentEl, "ax-shake"); if (msg) msg.textContent = "家賃が払えなかった…"; }
        await arcSleep(800);
      }
    }
  } catch(e){ console.warn(e); }
  ARCU.busy = false;
  arcRenderBody();
  setTimeout(() => $("#sl-offer")?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 30);
  if (res.paid < 0) arcOverlay([spr("skull", 64), h("h2", {}, "閉店…"), h("p", {}, `家賃${run.rent}回まで払えた。足すシンボルと取り除くシンボルを変えて、もう一度。`)]);
  else if (run.won){ sfx("evolve"); arcOverlay([spr("trophy", 72), h("h2", {}, "完済！スロットクリア"), h("p", {}, A.clear.slot === run.lv && run.lv === 1 ? "ポーカーが開いた！上のタブから遊べる。" : `難しさ Lv${run.lv + 1} が開いた。`)]); }
  else if (res.paid > 0) toast(`家賃を払った！取り除く券 +1`, 2200);
}
function slotDex(){
  const SY = ARC.SY, R = ARC.slot.RENT;
  const rows = Object.entries(SY).map(([id, s]) => h("div", {}, spr(id, 32), h("div", {}, h("span", { class: "sl-tag " + s.r }, RAR[s.r]), ` ${s.n} +${s.v}`, s.d ? h("div", { class: "mut" }, s.d) : "")));
  return h("details", { class: "pxp ax-help", style: "margin-top:10px" }, h("summary", {}, "シンボル図鑑と家賃表"),
    h("p", { style: "margin:8px 0 0" }, "計算の順番：①食べる・割る（食べられたシンボルは消える）→ ②足し算（+）→ ③掛け算（×）。掛け算が重なると掛け合わせる。家賃を払うほど、めずらしい・レアが出やすくなる。"),
    h("div", { class: "sl-dex" }, ...rows),
    h("p", { style: "margin:10px 0 0" }, "家賃：" + R.map((r, i) => `${i + 1}回目 ${r[0]}回で${r[1]}`).join(" / ")));
}

/* ============================================================
   ポーカー
   ============================================================ */
const PK = () => ARC.poker;
const BLIND = ["1戦目", "2戦目", "ボス"];
const htName = id => ARC.HT.find(x => x[0] === id)[1];
const feltStyle = () => `background-color:#1f7a4d;background-image:url(${ART.pattern("felt", "#1f7a4d", "#237f52", 4)});background-size:64px 64px`;
function pkCardEl(c, opt = {}){
  const im = document.createElement("img"); im.src = ART.card(c.r, c.s); im.alt = `${ARC.SUITS[c.s]}${ARC.rankName(c.r)}`; im.draggable = false;
  return h("div", { class: "pc" + (opt.cls ? " " + opt.cls : ""), "data-id": String(c.id), style: opt.style || null, onclick: opt.onclick || null }, im);
}
function pkJokerEl(j, opt = {}){
  const d = ARC.JK[j.id];
  const cnt = j.id === "grow" ? `+${j.n || 0}` : j.id === "stack" ? `+${(j.n || 0)}` : null;
  return h("div", { class: "pk-j " + d.k + (opt.cls ? " " + opt.cls : ""), "data-j": j.id, onclick: opt.onclick || (() => toast(`${d.n}：${d.d}`, 3200)) },
    spr("j_" + j.id, 36), h("span", {}, d.n), cnt ? h("span", { class: "cnt" }, cnt) : null);
}
function pokerView(box){
  const A = arc();
  if (A.clear.slot < 1){
    box.append(h("div", { class: "pxp", style: "text-align:center" }, spr("lock", 48),
      h("h2", { style: "margin:8px 0" }, "まだ開いていません"),
      h("p", { class: "mut" }, "スロットで12回の家賃を払いきると開きます。"),
      h("button", { class: "pxbtn gold", onclick: () => { ARCU.tab = "slot"; arcRender(); } }, "スロットへ")));
    box.append(pkRules());
    return;
  }
  const run = A.poker;
  if (!run){
    const lv = arcLevelPicker("poker");
    box.append(h("div", { class: "pxp" },
      h("div", { class: "ax-title" }, h("div", { class: "logo" }, "POKER"),
        h("div", { class: "row" }, ...[[14, 0], [13, 1], [12, 2], [11, 3], [10, 0]].map(([r, s]) => { const im = document.createElement("img"); im.src = ART.card(r, s); im.className = "px-img"; im.style.cssText = "width:40px;height:56px"; return im; }))),
      h("div", { class: "ax-help", style: "margin-top:8px" },
        "手札8枚から最大5枚を出して役を作る。得点は ", h("b", {}, "チップ × 倍率"), "。役の基本値に、得点したカードの数字（Aは11、絵札は10）がチップに加わる。",
        h("br"), "1戦ごとに目標点があって、出せるのは4回・捨てられるのは3回まで。目標に届けば勝ち。",
        h("br"), "勝つたびに報酬を1つ選ぶ：ジョーカー（最大5枚・左から順に効く）、役のレベルアップ、デッキの改造。",
        h("br"), h("b", {}, "8ステージ×3戦（3戦目はルールが変わるボス）を勝ち抜けばクリア"), "。"),
      lv.el,
      h("button", { class: "pxbtn blue sl-spin", onclick: () => { A.poker = PK().new(lv.get()); A.stats.poker.runs++; ARCU.seen = new Set(); markDirty(); arcRenderBody(); } }, "▶ はじめる"),
      A.stats.poker.runs ? h("div", { class: "mut sm", style: "margin-top:8px;text-align:center" }, `これまで${A.stats.poker.runs}回・クリア${A.stats.poker.wins}回・最高ステージ${A.stats.poker.best}・1手の最高${A.stats.poker.hand.toLocaleString()}点`) : null));
    box.append(pkRules());
    return;
  }
  const R = run.rd, L = PK().limits(run), bossId = run.boss[run.ante], boss = ARC.BOSS[bossId];
  const target = R ? R.target : PK().target(run.ante, run.blind, run.lv), score = R ? R.score : 0;
  const table = h("div", { class: "pk-felt", id: "pk-table", style: feltStyle() });
  table.append(h("div", { class: "pk-hud" },
    h("div", { class: "b" }, h("div", { class: "k" }, `ステージ ${run.ante + 1}/8・${BLIND[run.blind]}` + (run.lv > 1 ? `・Lv${run.lv}` : "")),
      h("div", { class: "v" }, spr("star", 18), h("span", { class: "ax-num" }, target.toLocaleString())),
      h("div", { class: "pk-boss" }, spr("b_" + bossId, 20), `${boss.n}：${boss.d}`)),
    h("div", { class: "b" }, h("div", { class: "k" }, "得点"), h("div", { class: "v" }, h("span", { id: "pk-score", class: "ax-num" }, score.toLocaleString())),
      h("div", { class: "ax-bar", style: "margin-top:4px" }, h("i", { id: "pk-bar", style: `width:${Math.min(100, score / target * 100)}%` })),
      R ? h("div", { class: "pk-pile" }, h("img", { src: ART.back(), alt: "" }), `山${R.pile.length}・出す${R.plays}・捨てる${R.discs}`) : null)));
  const jk = h("div", { class: "pk-jk", id: "pk-jk" });
  for (let i = 0; i < 5; i++){ const j = run.jk[i];
    jk.append(j ? pkJokerEl(j, ARCU.replace ? { cls: "pick", onclick: () => pkFinishTake(i) } : {}) : h("div", { class: "pk-j e0" })); }
  table.append(jk);
  if (ARCU.replace) table.append(h("div", { class: "pk-info", style: "color:#ffd447" }, "入れ替えるジョーカーをタップ"));
  box.append(table);

  if (run.over){
    box.append(h("div", { class: "pxp", style: "text-align:center;margin-top:10px" }, spr(run.won ? "trophy" : "skull", 56),
      h("h2", { style: "margin:6px 0" }, run.won ? "全ステージ制覇！" : `ステージ${run.ante + 1}の${BLIND[run.blind]}で終了`),
      h("div", { class: "mut sm" }, `1手の最高 ${run.best.toLocaleString()}点`),
      h("button", { class: "pxbtn blue sl-spin", onclick: () => { A.poker = null; markDirty(); arcRenderBody(); } }, "もう一度")));
    box.append(pkLevels(run), pkRules());
    return;
  }
  if (run.offer){ box.append(pkOfferView(run)); box.append(pkLevels(run)); return; }
  if (!R){
    const t = arcTickets(), isBoss = run.blind === 2;
    box.append(h("div", { class: "pxp", style: "text-align:center;margin-top:10px" },
      h("div", { class: "mut sm" }, `ステージ${run.ante + 1}・${BLIND[run.blind]}`),
      isBoss ? h("div", { style: "margin:6px 0" }, spr("b_" + bossId, 56)) : null,
      h("h2", { style: "margin:4px 0;font-size:1.6rem;color:#ffd447" }, `目標 ${target.toLocaleString()}点`),
      isBoss ? h("div", { style: "color:#ff9a8a" }, `ボス「${boss.n}」：${boss.d}`) : h("div", { class: "mut sm" }, `このステージのボス：${boss.n}（${boss.d}）`),
      h("div", { class: "mut sm", style: "margin-top:6px" }, `出す${L.plays}回・捨てる${L.discs}回・手札${L.hand}枚・デッキ${run.deck.length}枚`),
      h("button", { class: "pxbtn blue sl-spin", onclick: () => {
        if (!arcPay(ARC_COST.round)) return arcNoTicket(ARC_COST.round);
        PK().start(run); ARCU.sel = []; ARCU.seen = new Set(); ARCU.focus = true; sfx("open", "rare"); markDirty(); arcRenderBody(); } }, `▶ 勝負する（券${ARC_COST.round}）`),
      t.left < ARC_COST.round ? h("div", { class: "mut sm", style: "margin-top:6px" }, `券が${t.left}枚。QBを記録すると貯まります`) : null));
    box.append(pkLevels(run), pkRules());
    return;
  }
  // 手札
  const hand = R.hand.map(id => PK().card(run, id));
  const ord = ARCU.sort === "s" ? (a, z) => a.s - z.s || z.r - a.r : (a, z) => z.r - a.r || a.s - z.s;
  hand.sort(ord);
  ARCU.sel = ARCU.sel.filter(id => R.hand.includes(id));
  const calc = h("div", { class: "pk-calc", id: "pk-calc" }, h("span", { class: "ch", id: "pk-ch" }, "0"), h("span", { class: "x" }, "×"), h("span", { class: "mu", id: "pk-mu" }, "0"));
  const ty = h("div", { class: "pk-ty", id: "pk-ty" }, "");
  const zone = h("div", { class: "pk-zone", id: "pk-zone" });
  const handEl = h("div", { class: "pk-hand", id: "pk-hand", style: `--n:${Math.max(8, hand.length)}` });
  const info = h("div", { class: "pk-info", id: "pk-info" });
  const playB = h("button", { class: "pxbtn blue", onclick: () => pkDoPlay() }, "出す");
  const discB = h("button", { class: "pxbtn", onclick: () => pkDoDiscard() }, `捨てる ${R.discs}`);
  const upd = () => {
    const sel = ARCU.sel;
    if (!sel.length){ info.textContent = "カードをタップして選ぶ（5枚まで）"; $("#pk-ch") && ($("#pk-ch").textContent = "0"); $("#pk-mu") && ($("#pk-mu").textContent = "0"); ty.textContent = ""; }
    else {
      const cards = sel.map(id => PK().card(run, id)), ev = ARC.pkEval(cards, run.jk.some(j => j.id === "four"));
      const ht = ARC.HT.find(x => x[0] === ev.type), lv = run.lvl[ev.type] || 0;
      let c = ht[2] + ht[4] * lv, m = ht[3] + ht[5] * lv; if (L.boss === "flint"){ c = Math.ceil(c / 2); m = Math.max(1, Math.ceil(m / 2)); }
      $("#pk-ch").textContent = c; $("#pk-mu").textContent = m; ty.textContent = `${ht[1]}` + (lv ? ` Lv${lv + 1}` : "");
      info.textContent = `${sel.length}枚えらんだ`;
    }
    playB.disabled = !sel.length || ARCU.busy; discB.disabled = !sel.length || R.discs <= 0 || ARCU.busy;
  };
  let k = 0;
  for (const c of hand){
    const isNew = !ARCU.seen.has(c.id);
    const el = pkCardEl(c, { cls: (ARCU.sel.includes(c.id) ? "sel" : "") + (isNew && !reduceMotion() ? " deal" : ""), style: isNew ? `animation-delay:${(k++) * 70}ms` : null, onclick: () => {
      if (ARCU.busy) return;
      const i = ARCU.sel.indexOf(c.id);
      if (i >= 0) ARCU.sel.splice(i, 1); else if (ARCU.sel.length < 5) ARCU.sel.push(c.id); else return toast("出せるのは5枚まで");
      el.classList.remove("deal"); el.classList.toggle("sel"); tone(i >= 0 ? 520 : 660, .04, { type: "square", vol: .03 }); upd();
    } });
    handEl.append(el);
  }
  if (k) for (let i = 0; i < Math.min(k, 8); i++) setTimeout(() => tone(900 + i * 40, .025, { type: "square", vol: .02 }), i * 70);
  ARCU.seen = new Set(R.hand);
  table.append(calc, ty, zone, handEl, info,
    h("div", { class: "pk-btns" }, playB, discB),
    h("div", { class: "pk-sub" },
      h("button", { class: "pxbtn", onclick: () => { ARCU.sort = ARCU.sort === "s" ? "r" : "s"; arcRenderBody(); } }, ARCU.sort === "s" ? "並び：スート" : "並び：数字"),
      h("button", { class: "pxbtn", onclick: () => { ARCU.sel = []; arcRenderBody(); } }, "選択を解除")));
  upd();
  box.append(pkLevels(run), pkRules());
  if (ARCU.focus){ ARCU.focus = false; setTimeout(() => { const tb = $(".topbar"), y = table.getBoundingClientRect().top + window.scrollY - (tb ? tb.offsetHeight : 0) - 8; window.scrollTo({ top: y, behavior: "smooth" }); }, 30); }
}
async function pkDoDiscard(){
  const run = arc().poker; if (!run || ARCU.busy || !ARCU.sel.length) return;
  const ids = ARCU.sel.slice();
  ARCU.busy = true;
  ids.forEach((id, i) => { const e = $(`#pk-hand .pc[data-id="${id}"]`); if (e){ e.style.transition = "transform .25s steps(4), opacity .25s"; e.style.transform = `translate(${-120 - i * 10}px, 40px) rotate(-30deg)`; e.style.opacity = "0"; } });
  tone(300, .12, { type: "sawtooth", slide: .5, vol: .03 });
  await arcSleep(reduceMotion() ? 0 : 260);
  ARCU.busy = false;
  if (PK().discard(run, ids)){ ARCU.sel = []; markDirty(); arcRenderBody(); }
}
async function pkDoPlay(){
  const A = arc(), run = A.poker; if (!run || ARCU.busy || !ARCU.sel.length) return;
  const ids = ARCU.sel.slice(), before = run.rd.score, target = run.rd.target;
  const cards = ids.map(id => ({ ...PK().card(run, id) }));
  const s = PK().play(run, ids);
  if (!s) return;
  A.stats.poker.hand = Math.max(A.stats.poker.hand, s.total);
  A.stats.poker.best = Math.max(A.stats.poker.best, run.ante + 1);
  if (run.over && run.won){ A.stats.poker.wins++; A.clear.poker = Math.max(A.clear.poker, run.lv); }
  markDirty();
  ARCU.sel = []; ARCU.busy = true;
  const zone = $("#pk-zone"), ch = $("#pk-ch"), mu = $("#pk-mu"), ty = $("#pk-ty"), calc = $("#pk-calc");
  try {
    if (zone && ch && mu && !reduceMotion()){
      document.querySelectorAll("#pk-hand .pc").forEach(e => { if (ids.includes(+e.dataset.id)) e.remove(); });
      $$(".pk-btns button, .pk-sub button").forEach(b => b.disabled = true);
      const els = {}; let i = 0;
      for (const c of cards){ const e = pkCardEl(c, { cls: "rise" + (s.scoringIds.includes(c.id) ? "" : " off"), style: `animation-delay:${(i++) * 50}ms` }); els[c.id] = e; zone.append(e); }
      tone(500, .08, { type: "square", vol: .04 });
      await arcSleep(320);
      const fmt = v => (Math.round(v * 10) / 10).toLocaleString();
      let n = 0;
      const tagOn = (el, text, cls) => { if (!el) return; el.querySelector(".tag")?.remove(); el.append(h("span", { class: "tag " + (cls || "") }, text)); bump(el); };
      for (const st of s.steps){
        if (st.k === "base"){ ty.textContent = htName(st.t); ch.textContent = st.chips; mu.textContent = fmt(st.mult); bump(ch); bump(mu); tone(392, .1, { vol: .04 }); await arcSleep(380); continue; }
        if (st.k === "card"){
          const e = els[st.id]; if (!e) continue;
          if (st.dead){ bump(e, "ax-shake"); tone(140, .1, { type: "sawtooth", vol: .03 }); await arcSleep(260); continue; }
          e.classList.remove("hit"); void e.offsetWidth; e.classList.add("hit");
          e.querySelector(".tag")?.remove(); e.append(h("span", { class: "tag" }, `+${st.chips}`));
          ch.textContent = fmt(st.c); mu.textContent = fmt(st.m); bump(ch);
          tone(523 * Math.pow(2, Math.min(++n, 12) / 12), .07, { type: "square", vol: .04 });
          for (const jid of st.by || []) bump($(`#pk-jk [data-j="${jid}"]`));
          await arcSleep(260); continue;
        }
        if (st.k === "held"){ tagOn($(`#pk-jk [data-j="${st.j}"]`), st.x ? `×${fmt(st.x)}` : `+${st.mult}`, st.x ? "xx" : ""); mu.textContent = fmt(st.m); bump(mu); tone(700, .06, { vol: .04 }); await arcSleep(260); continue; }
        if (st.k === "joker"){
          tagOn($(`#pk-jk [data-j="${st.j}"]`), st.chips ? `+${st.chips}` : st.x !== 1 ? `×${fmt(st.x)}` : `+${st.mult}倍率`, st.chips ? "c" : st.x !== 1 ? "xx" : "");
          ch.textContent = fmt(st.c); mu.textContent = fmt(st.m);
          if (st.x !== 1){ bump(mu); tone(784, .12, { vol: .05 }); tone(1175, .16, { delay: .06, vol: .05 }); await arcSleep(420); }
          else { bump(st.chips ? ch : mu); tone(660, .07, { vol: .04 }); await arcSleep(300); }
          continue;
        }
      }
      // 合計。残りを一撃で超えたら炎
      const need = target - before, big = s.total >= need;
      if (big && calc){ calc.append(h("div", { class: "pk-flames" }, ...[...Array(7)].map(() => spr("flame", 22)))); }
      ty.innerHTML = ""; ty.append(h("span", { style: `font-size:1.5rem;color:${big ? "#ffd447" : "#fff"}` }, s.total.toLocaleString()), h("span", { class: "sm" }, ` 点（${htName(s.type)}）`));
      bump(ty);
      const sc = $("#pk-score"), bar = $("#pk-bar");
      if (sc){ sc.dataset.v = before; countUp(sc, before + s.total, 600); }
      if (bar) bar.style.width = Math.min(100, (before + s.total) / target * 100) + "%";
      if (big){ sfx("combo"); bump($("#pk-table"), "ax-shake"); } else sfx("coin");
      await arcSleep(big ? 1200 : 900);
    }
  } catch(e){ console.warn(e); }
  ARCU.busy = false;
  arcRenderBody();
  if (s.cleared && run.won){ sfx("evolve"); arcOverlay([spr("trophy", 72), h("h2", {}, "全ステージ制覇！"), h("p", {}, `ポーカー Lv${run.lv} クリア。難しさ Lv${run.lv + 1} が開いた。`)]); }
  else if (s.cleared) sfx("level");
  else if (s.failed){ sfx("again"); arcOverlay([spr("skull", 64), h("h2", {}, "届かなかった…"), h("p", {}, `ステージ${run.ante + 1}の${BLIND[run.blind]}（${run.rd.score.toLocaleString()} / ${run.rd.target.toLocaleString()}点）`)]); }
}
function pkOfferView(run){
  const box = h("div", { class: "pxp", style: "margin-top:10px" });
  box.append(h("div", { class: "ax-row" }, spr("star", 22), h("h2", { style: "margin:0" }, run.blind === 2 ? "ボス撃破！報酬を1つ" : "勝ち！報酬を1つ"), h("span", { class: "sp" }),
    h("button", { class: "pxbtn gray sm", onclick: () => { ARCU.pick = null; ARCU.picks = []; ARCU.replace = false; PK().take(run, -1); markDirty(); arcRenderBody(); } }, "いらない")));
  const list = h("div", { class: "pk-off" });
  run.offer.forEach((it, i) => {
    let ic, t, d;
    if (it.k === "j"){ const J = ARC.JK[it.id]; ic = h("span", { class: "ic" }, spr("j_" + it.id, 36)); t = `ジョーカー「${J.n}」`; d = J.d; }
    else if (it.k === "lv"){ const ht = ARC.HT.find(x => x[0] === it.id); ic = h("span", { class: "ic t" }, "▲"); t = `${ht[1]} を${it.n}レベル上げる`; d = `1レベルごとに チップ+${ht[4]}・倍率+${ht[5]}（いま Lv${(run.lvl[it.id] || 0) + 1}）`; }
    else if (it.k === "cut"){ ic = h("span", { class: "ic t" }, "✂"); t = `デッキからカードを${it.n}枚まで取り除く`; d = "いらないカードを抜くと、欲しいカードを引きやすくなる"; }
    else { ic = h("span", { class: "ic" }, spr("j_suit" + "SHDC"[it.s], 36)); t = `カードを${it.n}枚まで ${ARC.SUITS[it.s]} に染める`; d = "フラッシュを狙いやすくなる"; }
    list.append(h("button", { class: "pk-o" + (ARCU.pick === i ? " on" : ""), onclick: () => {
      ARCU.pick = i; ARCU.picks = []; ARCU.replace = false; sfx("pet");
      if (it.k === "j"){ if (run.jk.length >= 5){ ARCU.replace = true; toast("ジョーカーは5枚まで。入れ替えるものを上でタップ"); arcRenderBody(); return; } pkFinishTake(null); return; }
      if (it.k === "lv"){ pkFinishTake(null); return; }
      arcRenderBody();
    } }, ic, h("div", {}, h("div", {}, t), h("div", { class: "d" }, d))));
  });
  box.append(list);
  const it = ARCU.pick != null ? run.offer[ARCU.pick] : null;
  if (it && (it.k === "cut" || it.k === "dye")){
    const deck = run.deck.slice().sort((a, z) => a.s - z.s || a.r - z.r);
    const grid = h("div", { class: "pk-deck" });
    const okB = h("button", { class: "pxbtn gold", style: "margin-top:10px", disabled: !ARCU.picks.length, onclick: () => pkFinishTake(ARCU.picks.slice()) }, `${ARCU.picks.length}枚で決定`);
    for (const c of deck){ const el = pkCardEl(c, { cls: ARCU.picks.includes(c.id) ? "sel" : "", onclick: () => {
      const k = ARCU.picks.indexOf(c.id); if (k >= 0) ARCU.picks.splice(k, 1); else if (ARCU.picks.length < it.n) ARCU.picks.push(c.id); else return toast(`${it.n}枚まで`);
      el.classList.toggle("sel"); okB.textContent = `${ARCU.picks.length}枚で決定`; okB.disabled = !ARCU.picks.length; } }); grid.append(el); }
    box.append(h("div", { class: "sm", style: "margin-top:12px" }, it.k === "cut" ? "取り除くカードを選ぶ" : `${ARC.SUITS[it.s]} に染めるカードを選ぶ`), grid, okB);
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
    g.append(h("span", {}, ht[1]), h("span", { class: "mut" }, `Lv${lv + 1}`), h("span", { style: "color:#ffd447" }, `${ht[2] + ht[4] * lv} × ${ht[3] + ht[5] * lv}`)); }
  return h("details", { class: "pxp ax-help", style: "margin-top:10px" }, h("summary", {}, `役の一覧（デッキ${run.deck.length}枚）`), g);
}
function pkRules(){
  const js = Object.entries(ARC.JK).map(([id, j]) => h("div", {}, spr("j_" + id, 32), h("div", {}, j.n, h("div", { class: "mut" }, j.d))));
  const bs = Object.entries(ARC.BOSS).map(([id, b]) => h("div", {}, spr("b_" + id, 32), h("div", {}, b.n, h("div", { class: "mut" }, b.d))));
  return h("details", { class: "pxp ax-help", style: "margin-top:10px" }, h("summary", {}, "ルールとジョーカー図鑑"),
    h("p", { style: "margin:8px 0 0" }, "計算の順番：役の基本値 → 得点したカード（左から。カードに反応するジョーカーもここ）→ 手札に残したカード → ジョーカー（左から）。「+倍率」と「×倍率」は順番で結果が変わる（×は後ろに置くほど効く）。",
      h("br"), "ジョーカーの順番は、いったん外して入れ直すと右端に来る。目標点：" + [0, 1, 2, 3, 4, 5, 6, 7].map(a => (ARC.pkTarget(a, 0, 1)).toLocaleString()).join(" → ") + "（2戦目×1.5・ボス×2）"),
    h("div", { class: "sl-dex" }, ...js), h("p", { style: "margin:10px 0 4px" }, h("b", {}, "ボス")), h("div", { class: "sl-dex" }, ...bs));
}

/* ---------- 今日画面への導線 ---------- */
function arcStrip(){
  const A = arc(), t = arcTickets();
  let st = "";
  if (A.poker && !A.poker.over) st = `ポーカー ステージ${A.poker.ante + 1}`;
  else if (A.slot && !A.slot.over) st = `スロット 家賃${A.slot.rent}/12`;
  return h("button", { class: "hp-strip", onclick: () => go("hospital") },
    spr(A.clear.slot ? "j_suitS" : "cherry", 32),
    h("div", { style: "flex:1;min-width:0" }, h("div", { style: "font-weight:700" }, `ゲーム・券 ${t.left}枚`),
      h("div", { class: "muted small" }, `今日 +${t.today}枚` + (st ? `・${st}` : ""))),
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
