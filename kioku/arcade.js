/* ============================================================
   ゲーム（アーケード）— 画面
   - 勉強には手を入れない。記録した QB の問題数（＋カード5枚で1枚）が「プレイ券」として貯まるだけ
   - スロット（1回まわす＝券2枚）を完済するとポーカー（1戦＝券10枚）が開く。クリアするたび難しさ Lv が上がる
   - ルールは arcade-core.js、ドット絵は arcade-art.js。状態は S.pl.arc（今日・計画と一緒に同期）
   - 見た目：ゲームタブにいる間はページ全体を暗い「ゲームモード」にする。見出し・数字・ボタンはドット文字、
     説明文は読みやすい BIZ UDPゴシック。選ぶ場面（シンボル・報酬）は下から出るシートにする
   hospital.js の後に読み込む。
   ============================================================ */
"use strict";

const ARC_COST = { spin: 2, round: 10 }, ARC_CARD = 5, ARC_BONUS = 30;
const ARCU = { tab: null, sel: [], sort: "r", busy: false, pick: null, picks: [], replace: false, rm: false, seen: new Set(), focus: false, sheetMin: false, sheetKey: null, help: false };

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
const fmtN = n => Math.round(n).toLocaleString();

/* ---------- 見た目 ---------- */
// ドット風の欠け角（2段）
const NOTCH = "clip-path:polygon(4px 0,calc(100% - 4px) 0,calc(100% - 4px) 2px,calc(100% - 2px) 2px,calc(100% - 2px) 4px,100% 4px,100% calc(100% - 4px),calc(100% - 2px) calc(100% - 4px),calc(100% - 2px) calc(100% - 2px),calc(100% - 4px) calc(100% - 2px),calc(100% - 4px) 100%,4px 100%,4px calc(100% - 2px),2px calc(100% - 2px),2px calc(100% - 4px),0 calc(100% - 4px),0 4px,2px 4px,2px 2px,4px 2px)";
const ARC_CSS = `
/* ---- ゲームモード（ページ全体） ---- */
html:has(body.arcade){background:#120c20}
body.arcade{min-height:100vh;background:#120c20;background-image:radial-gradient(#ffffff12 1px,transparent 1px),radial-gradient(#ffffff0a 1px,transparent 1px);background-size:24px 24px,14px 14px;background-position:0 0,7px 9px;background-attachment:fixed}
body.arcade .topbar{background:#1a1230;border-bottom:2px solid #2c2148;position:static}
body.arcade .brand{color:#f3eefe;font-family:"DotGothic16",var(--f-head);font-weight:400}
body.arcade .nav button,body.arcade .ax-old{font-family:"DotGothic16",var(--f-body)}
body.arcade .nav button{color:#a99dcc}
body.arcade .nav button:hover{background:#2a2142}
body.arcade .nav button.on{background:#ffd447;color:#2b1a00}
body.arcade .sync{color:#7d71a3}
body.arcade main{padding-top:14px}
body.arcade .toast{background:#0b0820;color:#fff;font-family:"DotGothic16",var(--f-body);border-radius:0;z-index:320;box-shadow:inset 0 0 0 2px #0b0820,inset 0 0 0 4px #f3eefe;padding:10px 16px;${NOTCH}}

.arx,.ax-sheet,.ax-ov{--px:"DotGothic16",var(--f-body);--tx:#f3eefe;--sub:#a99dcc;--line:#3a2d5e;--panel:#1f1733;--panel2:#171028;--gold:#ffd447;--red:#e8574a;--blue:#3a7be0;--green:#2fa35a}
.arx{
  max-width:560px;margin:0 auto;color:var(--tx);font-family:var(--px);font-size:16px;line-height:1.6;-webkit-font-smoothing:none;letter-spacing:.02em}
.arx *{box-sizing:border-box}
.arx .px{font-family:var(--px);letter-spacing:.03em;font-weight:400}
.arx h1,.arx h2,.arx h3{font-family:var(--px);font-weight:400;color:#fff;letter-spacing:.03em;line-height:1.35}
.arx .sub{color:var(--sub)}
.arx .sm{font-size:13px;line-height:1.55}
.arx .xs{font-size:12px}
.arx .num{font-family:var(--px);font-variant-numeric:tabular-nums;letter-spacing:.02em}
.arx .gold{color:var(--gold)}
.px-img{image-rendering:pixelated;image-rendering:crisp-edges;display:inline-block;vertical-align:middle;flex:0 0 auto}
#ar-body{display:flex;flex-direction:column;gap:10px}
#ar-body>*{min-width:0}

/* ヘッダー */
.ax-head{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.ax-logo{font-family:var(--px);font-size:22px;color:#fff;text-shadow:2px 2px 0 #6a44c8;letter-spacing:.08em;margin:0}
.ax-tk{margin-left:auto;display:flex;align-items:center;gap:6px;background:var(--panel);${NOTCH};padding:5px 10px 5px 8px;box-shadow:inset 0 0 0 2px var(--line)}
.ax-tk .num{font-size:21px;color:var(--gold);line-height:1}
.ax-tk .xs{color:var(--sub);font-family:var(--px)}
.ax-q{font-family:var(--px);width:34px;height:34px;border:0;background:var(--panel);color:var(--sub);cursor:pointer;${NOTCH};box-shadow:inset 0 0 0 2px var(--line);font-size:16px;flex:0 0 auto}
.ax-q.on{background:var(--gold);color:#2b1a00}
.ax-howto{background:var(--panel2);${NOTCH};box-shadow:inset 0 0 0 2px var(--line);padding:10px 12px;margin-bottom:10px;font-size:13px;color:#d8cff3}
.ax-howto b{color:var(--gold);font-weight:700}
.ax-seg{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
.ax-seg button{font-family:var(--px);font-size:16px;padding:9px 6px 11px;border:0;cursor:pointer;color:#cfc4ee;background:#2a2142;${NOTCH};display:flex;align-items:center;justify-content:center;gap:7px;box-shadow:inset 0 -4px 0 #1b1530}
.ax-seg button.on{background:var(--gold);color:#2b1a00;box-shadow:inset 0 -4px 0 #c9921a}
.ax-seg .st{font-size:13px;opacity:.8}

/* パネル・見出し */
.pxp{background:var(--panel);${NOTCH};padding:12px;box-shadow:inset 0 0 0 2px var(--line)}
.ax-h{display:flex;align-items:center;gap:8px;margin:0 0 8px;font-family:var(--px);font-size:16px;color:#fff}
.ax-h .sp{flex:1}
.ax-h .cnt{font-size:13px;color:var(--sub)}
.ax-row{display:flex;gap:8px;align-items:center}
.ax-row .sp{flex:1}

/* ボタン */
.pxbtn{font-family:var(--px);font-size:16px;border:0;color:#fff;background:var(--red);padding:12px 14px;cursor:pointer;${NOTCH};
  box-shadow:inset -4px -4px 0 rgba(0,0,0,.28),inset 4px 4px 0 rgba(255,255,255,.22);width:100%;letter-spacing:.06em;line-height:1.2;display:flex;align-items:center;justify-content:center;gap:8px}
.pxbtn:active{transform:translateY(2px);box-shadow:inset 4px 4px 0 rgba(0,0,0,.28)}
.pxbtn:disabled{filter:grayscale(.85) brightness(.7);cursor:default;transform:none}
.pxbtn.blue{background:var(--blue)}.pxbtn.gold{background:var(--gold);color:#2b1a00}.pxbtn.gray{background:#4c4266}.pxbtn.green{background:var(--green)}
.pxbtn.sm{font-size:13px;padding:6px 10px;width:auto}
.pxbtn .cost{font-size:13px;opacity:.9;display:inline-flex;align-items:center;gap:3px}
.ax-chip{display:inline-flex;align-items:center;gap:5px;font-family:var(--px);font-size:13px;padding:3px 8px;background:rgba(0,0,0,.32);color:#fff;${NOTCH};white-space:nowrap;line-height:1.5}
.ax-chip.btn{border:0;cursor:pointer}
.ax-chip img{width:18px;height:18px}
.ax-chip.boss{background:#5a1f2a;color:#ffd0c8}

/* たたみ */
.ax-fold{background:var(--panel2);${NOTCH};box-shadow:inset 0 0 0 2px var(--line)}
.ax-fold>summary{list-style:none;cursor:pointer;padding:11px 12px;font-family:var(--px);font-size:15px;display:flex;align-items:center;gap:8px;color:#e8e0ff}
.ax-fold>summary::-webkit-details-marker{display:none}
.ax-fold>summary::after{content:"▼";margin-left:auto;font-size:12px;color:var(--sub);transition:transform .15s}
.ax-fold[open]>summary::after{transform:rotate(180deg)}
.ax-fold>.in{padding:0 12px 12px;font-size:13px;color:#d8cff3;line-height:1.75}
.ax-dex{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px 14px;margin-top:10px}
.ax-dex>div{display:flex;gap:9px;align-items:flex-start}
.ax-dex img{width:32px;height:32px}
.ax-dex .n{font-family:var(--px);color:#fff}
.ax-dex .d{font-size:13px;color:var(--sub);line-height:1.5}

/* 共通の演出 */
.ax-num-big{font-family:var(--px);font-variant-numeric:tabular-nums;line-height:1.1}
.ax-pips{display:inline-flex;gap:2px}
.ax-pips img{width:10px;height:10px}
.ax-pips img.off{filter:grayscale(1) brightness(.4)}
.ax-bar{height:10px;background:#0c0816;box-shadow:inset 0 0 0 2px var(--line);padding:2px}
.ax-bar>i{display:block;height:100%;background:repeating-linear-gradient(90deg,#ffd447 0 6px,#f0a020 6px 8px);transition:width .6s steps(12)}
.ax-bar.ok>i{background:repeating-linear-gradient(90deg,#5fd06a 0 6px,#2fa35a 6px 8px)}
.ax-ov{position:fixed;inset:0;background:rgba(8,5,16,.72);z-index:300;display:flex;align-items:center;justify-content:center;padding:16px;animation:axFade .2s}
.ax-ov .box{font-family:"DotGothic16",var(--f-body);background:#241a3a;color:#fff;${NOTCH};box-shadow:inset 0 0 0 3px #ffd447;padding:22px 18px 16px;max-width:360px;width:100%;text-align:center;animation:axPop .35s cubic-bezier(.2,1.4,.4,1)}
.ax-ov h2{font-family:"DotGothic16";font-weight:400;margin:8px 0 4px;color:#ffd447;font-size:24px}
.ax-ov p{color:#d8cff3;margin:6px 0 14px;font-size:14px;line-height:1.7}
@keyframes axFade{from{opacity:0}to{opacity:1}}
@keyframes axPop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes axBump{0%{transform:scale(1)}40%{transform:scale(1.3)}100%{transform:scale(1)}}
@keyframes axShake{0%,100%{transform:translate(0,0)}20%{transform:translate(-4px,2px)}40%{transform:translate(4px,-2px)}60%{transform:translate(-3px,-1px)}80%{transform:translate(3px,1px)}}
@keyframes axFloat{0%{transform:translate(-50%,0);opacity:1}100%{transform:translate(-50%,-26px);opacity:0}}
@keyframes axBlink{0%,49%{opacity:1}50%,100%{opacity:.25}}
@keyframes axFlame{0%{transform:scaleY(1) translateY(0)}50%{transform:scaleY(1.25) translateY(-3px)}100%{transform:scaleY(.9) translateY(1px)}}
@keyframes axUp{from{transform:translate(-50%,100%)}to{transform:translate(-50%,0)}}
.ax-bump{animation:axBump .28s steps(4)}
.ax-shake{animation:axShake .3s steps(5) 2}
.ax-float{position:absolute;left:50%;top:-6px;font-family:"DotGothic16";font-size:16px;color:#ffd447;text-shadow:2px 2px 0 #000;white-space:nowrap;pointer-events:none;animation:axFloat .8s steps(8) forwards;z-index:5}
.ax-float.red{color:#ff6a5a}
.coin-fly{position:fixed;z-index:400;width:22px;height:22px;pointer-events:none;image-rendering:pixelated;transition:transform .5s cubic-bezier(.45,-0.35,.7,1);will-change:transform}

/* 下から出るシート */
.ax-sheet{position:fixed;left:50%;bottom:0;transform:translateX(-50%);width:min(560px,100%);max-height:78vh;overflow:auto;z-index:250;background:#1f1733;color:#f3eefe;font-family:"DotGothic16",var(--f-body);
  box-shadow:0 -4px 0 #ffd447,0 -10px 30px rgba(0,0,0,.55);padding:0 12px calc(14px + env(safe-area-inset-bottom));font-size:14px}
.ax-sheet.anim{animation:axUp .28s steps(6)}
.ax-sheet .grab{position:sticky;top:0;display:flex;align-items:center;gap:8px;width:calc(100% + 24px);margin:0 -12px 10px;padding:10px 12px;background:#2a2048;border:0;color:#fff;font-family:"DotGothic16";font-size:16px;cursor:pointer;z-index:2;text-align:left}
.ax-sheet .grab .sp{flex:1}
.ax-sheet .grab .hint{font-size:12px;color:#a99dcc}
.ax-sheet.min{overflow:hidden}
.ax-sheet.min>:not(.grab){display:none}
.ax-sheet.min .grab{margin-bottom:0}
body.arcade.sheet-open main{padding-bottom:340px}

/* ---- スロット ---- */
.sl-hud{background:var(--panel);${NOTCH};box-shadow:inset 0 0 0 2px var(--line);padding:10px 12px}
.sl-hud .top{display:flex;align-items:flex-end;gap:10px}
.sl-hud .k{font-size:12px;color:var(--sub);font-family:var(--px)}
.sl-hud .coins{display:flex;align-items:center;gap:6px;font-size:27px;color:var(--gold)}
.sl-hud .rent{margin-left:auto;text-align:right}
.sl-hud .rent .v{display:flex;align-items:center;gap:5px;justify-content:flex-end;font-size:20px}
.sl-hud .rent .left{font-size:12px;color:var(--sub);font-family:var(--px)}
.sl-hud .rent .left.hot{color:#ff8a7a;animation:axBlink .8s steps(1) infinite}
.sl-hud .bot{display:flex;align-items:center;gap:10px;margin-top:8px}
.sl-hud .bot .ax-bar{flex:1}
.sl-mach{background:#c2352c;${NOTCH};padding:8px 8px 10px;box-shadow:inset 0 0 0 3px #7a1a14,inset 0 0 0 6px #e8574a,inset -10px -10px 0 #9e2a22}
.sl-marq{display:flex;align-items:center;justify-content:center;gap:8px;background:#2a1030;${NOTCH};padding:5px 8px;margin-bottom:8px;box-shadow:inset 0 0 0 2px #ffd447}
.sl-marq .t{font-family:"DotGothic16";font-size:19px;color:#ffd447;text-shadow:2px 2px 0 #c2352c;letter-spacing:.2em}
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
.sl-c .v{position:absolute;right:5px;bottom:3px;font-family:"DotGothic16";font-size:14px;color:#fff;text-shadow:1px 0 0 #000,-1px 0 0 #000,0 1px 0 #000,0 -1px 0 #000,2px 2px 0 #000;line-height:1}
.sl-c .v.z{color:#9a90b0}
.sl-c .v.hi{color:#ffd447;font-size:16px}
.sl-c .v.mega{color:#ff7a3a;font-size:17px}
.sl-c .fx{position:absolute;left:3px;top:3px;display:flex;gap:1px}
.sl-c .fx img{width:12px;height:12px}
.sl-c.spin img{animation:slJit .07s steps(2) infinite alternate;filter:blur(.4px) brightness(1.15)}
@keyframes slJit{from{transform:translateY(-28%)}to{transform:translateY(28%)}}
.sl-c.land img{animation:slLand .25s steps(4)}
@keyframes slLand{0%{transform:translateY(-22%)}60%{transform:translateY(8%)}100%{transform:none}}
.sl-c.hit{animation:slHit .25s steps(4)}
@keyframes slHit{0%,100%{transform:scale(1)}40%{transform:scale(1.12)}}
.sl-c.eaten img{animation:slPoof .45s steps(5) forwards}
@keyframes slPoof{to{transform:scale(1.7) rotate(25deg);opacity:0}}
.sl-tray{display:flex;align-items:center;justify-content:space-between;background:#2a1030;${NOTCH};margin-top:8px;padding:6px 10px;box-shadow:inset 0 0 0 2px #7a1a14;min-height:44px}
.sl-tray .msg{font-size:13px;color:#f3eefe;font-family:"DotGothic16"}
.sl-tray .gain{font-family:"DotGothic16";font-size:26px;color:#ffd447;text-shadow:2px 2px 0 #7a1a14;font-variant-numeric:tabular-nums}
.sl-lever{margin-top:10px;font-size:22px;padding:13px;background:#ffd447;color:#7a1a14;box-shadow:inset -4px -4px 0 #c9921a,inset 4px 4px 0 #fff3b0}
.sl-lever .cost{color:#7a1a14}
.sl-offer{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.sl-card{min-width:0;font:inherit;color:#f3eefe;background:#171028;border:0;cursor:pointer;padding:10px 6px 9px;${NOTCH};box-shadow:inset 0 0 0 2px #6a5c90;display:flex;flex-direction:column;align-items:center;gap:3px;text-align:center}
.sl-card:active{transform:translateY(2px)}
.sl-card img.big{width:52px;height:52px}
.sl-card .nm{font-family:"DotGothic16";font-size:16px;color:#fff;line-height:1.3}
.sl-card .val{font-family:"DotGothic16";font-size:13px;color:#ffd447;display:flex;align-items:center;gap:3px}
.sl-card .d{font-size:12px;color:#c8bde6;line-height:1.45}
.sl-card.U{box-shadow:inset 0 0 0 2px #4fa3e8,inset 0 0 0 4px #171028,inset 0 0 14px #4fa3e855}
.sl-card.R{box-shadow:inset 0 0 0 2px #ffd447,inset 0 0 0 4px #171028,inset 0 0 18px #ffd44777;animation:slShine 1.4s steps(6) infinite}
@keyframes slShine{0%,100%{background:#171028}50%{background:#2f2448}}
.sl-tag{font-family:"DotGothic16";font-size:12px;padding:1px 6px;background:#4c4266;color:#fff;font-weight:400}
.sl-tag.U{background:#2a6fb8}.sl-tag.R{background:#d9951c;color:#2b1a00}
.sl-bag{display:flex;flex-wrap:wrap;gap:5px}
.sl-bag button{font-family:"DotGothic16";background:var(--panel2);border:0;color:#f3eefe;padding:3px 7px 3px 4px;cursor:pointer;${NOTCH};box-shadow:inset 0 0 0 2px var(--line);display:flex;align-items:center;gap:2px;font-size:13px}
.sl-bag button img{width:28px;height:28px}
.sl-bag.rm button{box-shadow:inset 0 0 0 2px #e8574a;animation:axBlink 1s steps(1) infinite}
.ax-title{display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 0 6px}
.ax-title .logo{font-family:"DotGothic16";font-size:32px;color:#ffd447;text-shadow:3px 3px 0 #c2352c,6px 6px 0 #000;letter-spacing:.2em;line-height:1}
.ax-title .row{display:flex;gap:6px}
.ax-title .row img{width:40px;height:40px;animation:slBob 1.2s steps(2) infinite}
.ax-title .row img:nth-child(2n){animation-delay:.6s}
@keyframes slBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.ax-steps{display:grid;gap:8px;margin:12px 0 4px}
.ax-steps>div{display:flex;gap:10px;align-items:center;background:var(--panel2);${NOTCH};padding:8px 10px;font-size:13px;line-height:1.6}
.ax-steps .no{font-family:"DotGothic16";width:26px;height:26px;flex:0 0 auto;display:grid;place-items:center;background:var(--gold);color:#2b1a00;${NOTCH}}
.ax-steps b{color:var(--gold);font-weight:700}
.ax-record{display:flex;justify-content:center;gap:14px;margin-top:12px;font-size:12px;color:var(--sub);font-family:var(--px);flex-wrap:wrap}
.ax-record .num{color:#fff}

/* ---- ポーカー ---- */
.pk-felt{${NOTCH};padding:10px;box-shadow:inset 0 0 0 3px #0b3621,inset 0 0 0 6px #a0683a,inset 0 0 0 8px #5e3b1a;background-size:64px 64px}
.pk-top{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.pk-top .sp{flex:1}
.pk-score{background:rgba(6,20,12,.55);${NOTCH};padding:8px 10px;margin-top:8px}
.pk-score .r1{display:flex;align-items:baseline;gap:8px}
.pk-score .k{font-family:"DotGothic16";font-size:12px;color:#bfe8cf}
.pk-score .now{font-size:28px;color:#fff}
.pk-score .tgt{margin-left:auto;font-size:16px;color:#ffd447;display:flex;align-items:baseline;gap:4px}
.pk-score .ax-bar{margin-top:6px}
.pk-res{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
.pk-res .ax-chip{background:rgba(0,0,0,.28)}
.pk-res .ax-chip b{font-weight:400;color:#ffd447}
.pk-res img{width:13px;height:18px}
.pk-jk{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;margin:8px 0 4px}
.pk-j{position:relative;background:#fff6dc;color:#3a2a00;${NOTCH};padding:5px 2px 4px;min-height:66px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:1px;font-family:"DotGothic16";font-size:12px;line-height:1.15;text-align:center;box-shadow:inset 0 0 0 2px #e0a21b,inset 0 -4px 0 #e8d7aa}
.pk-j img{width:34px;height:34px}
.pk-j.x{box-shadow:inset 0 0 0 2px #d63a2f,inset 0 -4px 0 #e8d7aa}.pk-j.chips{box-shadow:inset 0 0 0 2px #2f6fd8,inset 0 -4px 0 #e8d7aa}.pk-j.util{box-shadow:inset 0 0 0 2px #7a7290,inset 0 -4px 0 #e8d7aa}
.pk-j.e0{background:rgba(0,0,0,.2);box-shadow:inset 0 0 0 2px rgba(255,255,255,.14);cursor:default}
.pk-j.pick{animation:axBlink .8s steps(1) infinite}
.pk-j .cnt{color:#d63a2f}
.pk-j .tag{position:absolute;top:3px;left:50%;transform:translateX(-50%);font-size:12px;padding:0 5px;color:#fff;background:#d63a2f;white-space:nowrap;text-shadow:1px 1px 0 #000;animation:axPop .2s;z-index:3}
.pk-j .tag.c{background:#2f6fd8}.pk-j .tag.xx{background:#9a3ad8;font-size:14px}
.pk-calc{display:flex;align-items:center;justify-content:center;gap:8px;margin:8px 0 2px;position:relative}
.pk-calc .ch,.pk-calc .mu{min-width:88px;text-align:center;padding:5px 8px;font-family:"DotGothic16";font-size:24px;${NOTCH};font-variant-numeric:tabular-nums;color:#fff;text-shadow:2px 2px 0 rgba(0,0,0,.35)}
.pk-calc .ch{background:#2f6fd8;box-shadow:inset -3px -3px 0 #1d4a9a}.pk-calc .mu{background:#d63a2f;box-shadow:inset -3px -3px 0 #8e2219}
.pk-calc .x{font-family:"DotGothic16";font-size:19px;color:#fff}
.pk-flames{position:absolute;inset:-14px 0 auto;display:flex;justify-content:center;gap:2px;pointer-events:none}
.pk-flames img{width:22px;height:26px;animation:axFlame .18s steps(2) infinite alternate;transform-origin:bottom}
.pk-flames img:nth-child(2n){animation-delay:.09s}
.pk-ty{text-align:center;font-family:"DotGothic16";font-size:16px;min-height:1.5em;color:#fff;text-shadow:2px 2px 0 rgba(0,0,0,.35)}
.pk-zone{--n:8;min-height:62px;display:flex;justify-content:center;gap:4px;align-items:flex-end;margin:2px 0}
.pk-handbar{display:flex;align-items:center;justify-content:space-between;margin-top:4px}
.pk-handbar .xs{font-family:"DotGothic16";color:#d8f0e0}
.pk-hand{display:flex;justify-content:center;gap:3px;padding-top:16px;position:relative}
.pc{width:min(58px,calc((100% - (var(--n,8) - 1) * 3px) / var(--n,8)));aspect-ratio:20/28;position:relative;cursor:pointer;transition:transform .1s steps(2);flex:0 0 auto;user-select:none;-webkit-tap-highlight-color:transparent}
.pc img{width:100%;height:100%;display:block;image-rendering:pixelated;filter:drop-shadow(0 2px 0 rgba(0,0,0,.35))}
.pc.sel{transform:translateY(-14px)}
.pc.sel img{filter:drop-shadow(0 -2px 0 #ffd447) drop-shadow(2px 0 0 #ffd447) drop-shadow(-2px 0 0 #ffd447) drop-shadow(0 2px 0 #ffd447)}
.pc.off img{filter:brightness(.6)}
.pc.deal{animation:pkDeal .34s steps(6) both}
@keyframes pkDeal{from{transform:translate(160px,-40px) rotate(25deg);opacity:0}to{transform:none;opacity:1}}
.pc.rise{animation:pkRise .25s steps(4) both}
@keyframes pkRise{from{transform:translateY(70px);opacity:.3}to{transform:none;opacity:1}}
.pc.hit{animation:axBump .28s steps(4)}
.pc .tag{position:absolute;top:-16px;left:50%;transform:translateX(-50%);background:#2f6fd8;color:#fff;font-family:"DotGothic16";font-size:12px;padding:0 4px;white-space:nowrap;animation:axPop .2s;text-shadow:1px 1px 0 #000}
.pk-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.pk-btns .pxbtn small{font-size:12px;opacity:.85}
.pk-vs{text-align:center;padding:14px 6px 4px}
.pk-vs .who{display:flex;justify-content:center;align-items:center;gap:10px;margin:8px 0 4px}
.pk-vs .tg{font-family:"DotGothic16";font-size:32px;color:#ffd447;text-shadow:3px 3px 0 #000;line-height:1.2}
.pk-vs .rule{display:inline-block;margin-top:8px;padding:6px 10px;background:#5a1f2a;color:#ffd0c8;${NOTCH};font-size:13px}
.pk-vs .lim{display:flex;justify-content:center;gap:6px;margin-top:10px;flex-wrap:wrap}
.pk-off{display:grid;gap:8px}
.pk-o{display:flex;align-items:center;gap:10px;font:inherit;color:#f3eefe;background:#171028;border:0;padding:10px;cursor:pointer;text-align:left;${NOTCH};box-shadow:inset 0 0 0 2px #6a5c90}
.pk-o.on{box-shadow:inset 0 0 0 2px #ffd447,inset 0 0 14px #ffd44755}
.pk-o .ic{width:44px;height:44px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;background:#fff6dc;${NOTCH}}
.pk-o .ic img{width:36px;height:36px}
.pk-o .ic.t{background:#2a2142;font-family:"DotGothic16";font-size:22px;color:#ffd447}
.pk-o .t{font-family:"DotGothic16";color:#fff}
.pk-o .d{font-size:13px;color:#c8bde6;line-height:1.5}
.pk-deck{display:grid;grid-template-columns:repeat(13,minmax(0,1fr));gap:2px;margin-top:8px}
.pk-deck .pc{width:100%}
.pk-deck .pc.sel{transform:translateY(-5px)}
.pk-lv{display:grid;grid-template-columns:1fr auto auto;gap:4px 14px;font-size:13px;margin-top:4px}
.pk-lv .num{color:#ffd447}

/* 前の病院（ゲームモードの中では暗く） */
body.arcade .ax-old{max-width:560px;margin:14px auto 0;background:#171028;border:0;box-shadow:inset 0 0 0 2px #3a2d5e;color:#d8cff3;border-radius:0}
body.arcade .ax-old>summary{color:#e8e0ff}

/* RPG のメッセージ窓 */
.rpg{background:#0b0820;color:#fff;${NOTCH};box-shadow:inset 0 0 0 2px #0b0820,inset 0 0 0 4px #f3eefe,inset 0 0 0 6px #0b0820;padding:12px 14px}
.rpg b,.rpg .em{color:#ffd447;font-weight:400}
.ax-talk{display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:stretch}
.ax-talk .face{width:60px;height:60px;align-self:center;display:grid;place-items:center;background:#2a2142;${NOTCH};box-shadow:inset 0 0 0 2px #f3eefe,inset 0 0 0 4px #2a2142}
.ax-talk .face img{width:48px;height:48px}
.ax-talk .win{position:relative;padding:12px 14px 10px;min-height:60px;display:flex;flex-direction:column;justify-content:center}
.ax-talk .nm{font-size:12px;color:#ffd447;line-height:1;margin-bottom:5px}
.ax-talk .tx{font-size:15px;line-height:1.55;min-height:1.55em}
.ax-talk .tx::after{content:"▼";font-size:10px;margin-left:4px;color:#ffd447;animation:axBlink .8s steps(1) infinite}
.ax-banner{position:relative;height:112px;background-color:#120c20;background-size:400px 112px;background-repeat:repeat-x;background-position:center bottom;image-rendering:pixelated;${NOTCH};box-shadow:inset 0 0 0 2px #3a2d5e;display:flex;align-items:flex-end;gap:8px;padding:10px;margin-bottom:10px}
.ax-banner .ttl{display:flex;flex-direction:column;gap:2px;margin-right:auto}
.ax-banner .en{font-size:12px;color:#ff7ad0;text-shadow:0 0 6px #ff5ab4,0 0 2px #ff5ab4;letter-spacing:.25em;animation:axNeon 3s steps(1) infinite}
.ax-banner .ax-logo{font-size:24px;text-shadow:2px 2px 0 #000,0 0 8px #6a44c8}
.ax-banner .ax-tk{background:rgba(11,8,32,.85)}
@keyframes axNeon{0%,92%,96%,100%{opacity:1}94%{opacity:.3}}
.ax-step-list{margin:0;padding:0;list-style:none;display:grid;gap:8px}
.ax-step-list li{display:flex;gap:8px;font-size:14px;line-height:1.6}
.ax-step-list li::before{content:"▶";color:#ffd447;flex:0 0 auto;font-size:12px;margin-top:3px}
.ax-cf{position:fixed;top:-12px;width:9px;height:9px;z-index:310;pointer-events:none;animation:axFall linear forwards}
@keyframes axFall{to{transform:translateY(110vh) rotate(720deg)}}
.ax-ov .faces{display:flex;justify-content:center;align-items:flex-end;gap:10px}
.ax-hero{display:flex;align-items:flex-end;justify-content:center;gap:10px}
.ax-hero .chr{width:96px;height:96px;animation:slBob 1.6s steps(2) infinite}
`;
(function(){ const st = document.createElement("style"); st.textContent = ARC_CSS; document.head.append(st); })();

/* ---------- 小さな部品 ---------- */
function confetti(n = 40){
  if (reduceMotion()) return;
  for (let i = 0; i < n; i++){
    const im = spr("cf" + (i % 5), 9, "ax-cf");
    im.style.left = Math.random() * 100 + "vw"; im.style.animationDuration = (1.6 + Math.random() * 1.6) + "s"; im.style.animationDelay = Math.random() * .6 + "s";
    document.body.append(im); setTimeout(() => im.remove(), 4000);
  }
}
function arcOverlay(kids, onClose, opt = {}){
  if (opt.confetti) confetti();
  const ov = h("div", { class: "ax-ov" }), box = h("div", { class: "box" }, ...kids,
    h("button", { class: "pxbtn gold", style: "margin-top:4px", onclick: () => close() }, "OK"));
  ov.append(box);
  const close = () => { ov.remove(); onClose && onClose(); };
  ov.addEventListener("click", e => { if (e.target === ov) close(); });
  document.body.append(ov);
  return close;
}
function countUp(el, to, ms = 500, fmt = v => fmtN(v)){
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
const pips = (n, on, id = "coin") => h("span", { class: "ax-pips" }, ...[...Array(n)].map((_, i) => spr(id, 10, i < on ? "" : "off")));
const fold = (title, ...kids) => h("details", { class: "ax-fold" }, h("summary", {}, title), h("div", { class: "in" }, ...kids));
const cost = n => h("span", { class: "cost" }, spr("ticket", 18), `×${n}`);
const WHO = { ll: "大家さん", dl: "ディーラー" };
/** キャラのセリフ。前と同じセリフなら一気に、変わったときだけ1文字ずつ出す */
function talk(who, expr, text){
  ARCU.talk ||= {};
  const fresh = ARCU.talk[who] !== text; ARCU.talk[who] = text;
  const msg = h("div", { class: "tx" });
  const el = h("div", { class: "ax-talk" }, h("div", { class: "face" }, spr(`${who}_${expr}`, 48)),
    h("div", { class: "rpg win" }, h("div", { class: "nm" }, WHO[who]), msg));
  if (fresh && !reduceMotion()){
    let i = 0;
    const tick = () => { if (!msg.isConnected) return; i++; msg.textContent = text.slice(0, i); if (i % 3 === 1) tone(1100, .012, { type: "square", vol: .01 }); if (i < text.length) setTimeout(tick, 26); };
    setTimeout(tick, 80);
  } else msg.textContent = text;
  return el;
}
/** 下から出るシート。key が変わったときだけ出てくる動きをつける */
function arcSheet(key, title, hint, kids){
  closeSheet();
  const fresh = ARCU.sheetKey !== key; ARCU.sheetKey = key;
  if (fresh) ARCU.sheetMin = false;
  const hintText = () => ARCU.sheetMin ? "▲ ひらく" : (hint || "▼ 盤面を見る");
  const hintEl = h("span", { class: "hint" }, hintText());
  const sh = h("div", { class: "ax-sheet" + (fresh && !reduceMotion() ? " anim" : "") + (ARCU.sheetMin ? " min" : ""), id: "ax-sheet" },
    h("button", { class: "grab", onclick: () => { ARCU.sheetMin = !ARCU.sheetMin; sh.classList.toggle("min", ARCU.sheetMin); hintEl.textContent = hintText(); } },
      title, h("span", { class: "sp" }), hintEl), ...kids);
  document.body.append(sh); document.body.classList.add("sheet-open");
}
function closeSheet(){ $("#ax-sheet")?.remove(); document.body.classList.remove("sheet-open"); }
function arcMode(on){ document.body.classList.toggle("arcade", !!on); if (!on) closeSheet(); }
window.addEventListener("hashchange", () => { if (location.hash.slice(1) !== "hospital") arcMode(false); });

/* ============================================================
   画面
   ============================================================ */
function viewArcade(main){
  qx(); const A = arc(), tk = arcTickets();
  arcMode(true);
  if (!ARCU.tab) ARCU.tab = "yomi";
  const wrap = h("div", { class: "arx" });
  const q = h("button", { class: "ax-q" + (ARCU.help ? " on" : ""), title: "券のしくみ", onclick: () => { ARCU.help = !ARCU.help; arcRender(); } }, "?");
  wrap.append(h("div", { class: "ax-banner", style: `background-image:url(${ART.skyline(200, 56, 7)})` },
    h("div", { class: "ttl" }, h("span", { class: "en" }, "KIOKU ARCADE"), h("h1", { class: "ax-logo" }, "ゲーム")),
    h("div", { class: "ax-tk", title: "プレイ券" }, spr("ticket", 26), h("span", { class: "num", id: "ar-tk" }, String(tk.left)), h("span", { class: "xs" }, `今日+${tk.today}`)), q));
  if (ARCU.help) wrap.append(h("div", { class: "rpg", style: "margin-bottom:10px;font-size:14px" },
    "勉強はいつも通り記録するだけ。", h("b", {}, "QB 1問＝券1枚"), "、", h("b", {}, `カード${ARC_CARD}回＝券1枚`), "。",
    h("br"), `ヨミの塔は野良戦3枚・強敵5枚・層の主7枚。スロット1回＝券${ARC_COST.spin}枚、ポーカー1戦＝券${ARC_COST.round}枚。はじめに${ARC_BONUS}枚。`));
  const lockedP = A.clear.slot < 1;
  wrap.append(h("div", { class: "ax-seg", style: "grid-template-columns:1.3fr 1fr 1fr" },
    h("button", { class: ARCU.tab === "yomi" ? "on" : "", onclick: () => { ARCU.tab = "yomi"; arcRender(); } }, window.YART ? YART.img("tower", 20) : "", "ヨミの塔"),
    h("button", { class: ARCU.tab === "slot" ? "on" : "", onclick: () => { ARCU.tab = "slot"; arcRender(); } }, spr("cherry", 22), "スロット", A.clear.slot ? h("span", { class: "st" }, "★" + A.clear.slot) : null),
    h("button", { class: ARCU.tab === "poker" ? "on" : "", onclick: () => { ARCU.tab = "poker"; arcRender(); } }, spr(lockedP ? "lock" : "j_suitS", 20), "ポーカー", A.clear.poker ? h("span", { class: "st" }, "★" + A.clear.poker) : null)));
  const body = h("div", { id: "ar-body" });
  wrap.append(body);
  main.append(wrap);
  arcRenderBody(body);
  // 前の病院
  const old = h("details", { class: "panel ax-old" }, h("summary", { style: "cursor:pointer;font-weight:700" }, "🏥 前の病院（部門・施設・当直）"));
  let done = false;
  old.addEventListener("toggle", () => { if (old.open && !done){ done = true; const d = h("div", { class: "pl-stack", style: "margin-top:10px" }); old.append(d); try { viewHospital(d, true); } catch(e){ console.warn(e); d.append(h("p", { class: "muted" }, "読み込めませんでした")); } } });
  if (ARCU.tab !== "yomi") main.append(old);
}
function arcRender(){ const y = window.scrollY; route(true); window.scrollTo(0, y); }
function arcRenderBody(body){
  body = body || $("#ar-body"); if (!body) return;
  body.innerHTML = ""; closeSheet();
  const tk = $("#ar-tk"); if (tk) tk.textContent = String(arcTickets().left);
  if (ARCU.tab === "yomi" && window.yomiView) window.yomiView(body);
  else if (ARCU.tab === "poker") pokerView(body); else slotView(body);
}
function arcLevelPicker(g){
  const A = arc(), max = A.clear[g] + 1;
  if (max <= 1) return { el: null, get: () => 1 };
  const sel = h("select", { style: "font-family:'DotGothic16';background:#171028;color:#fff;border:2px solid #6a5c90;padding:4px 8px" }, ...[...Array(max)].map((_, i) => h("option", { value: String(i + 1), selected: i + 1 === max }, `Lv${i + 1}` + (i + 1 === max ? "（未クリア）" : ""))));
  return { el: h("div", { class: "ax-row px", style: "margin:12px 0 0;justify-content:center" }, h("span", { class: "sm" }, "難しさ"), sel), get: () => +sel.value };
}
function arcNoTicket(n){
  const t = arcTickets();
  toast(`券が足りません（あと${n - t.left}枚）。QBを${n - t.left}問記録すると遊べます`, 3200);
}

/* ============================================================
   スロット
   ============================================================ */
const SL = () => ARC.slot;
const RAR = { C: "ふつう", U: "めずらしい", R: "レア" };
function slotView(box){
  const A = arc(), run = A.slot, SY = ARC.SY;
  if (!run){
    const lv = arcLevelPicker("slot"), st = A.stats.slot;
    box.append(talk("ll", "normal", st.runs ? "また来たのう。今度こそ12回、家賃を払いきってもらうぞ。" : "わしの店のスロットで稼いで、家賃を12回払えたら一人前じゃ。"));
    box.append(h("div", { class: "pxp" },
      h("div", { class: "ax-title" }, h("div", { class: "logo" }, "SLOT"),
        h("div", { class: "row" }, ...["cherry", "cat", "bee", "gem", "dragon", "coin"].map(id => spr(id, 40)))),
      h("div", { class: "rpg", style: "margin-top:12px" }, h("ul", { class: "ax-step-list" },
        h("li", {}, h("span", {}, "まわすと、持っているシンボルが5×4の盤面に並んでコインを稼ぐ。", h("b", {}, "隣どうしで効果"), "が出る（ネコの隣のミルクは+9、ハチの隣の花は×2）")),
        h("li", {}, h("span", {}, "まわすたびに3つから1つシンボルを足せる。足さないのもアリ")),
        h("li", {}, h("span", {}, "決まった回数ごとに家賃を払う。", h("b", {}, "12回払いきればクリア"), "、払えなければ閉店。払うたびに「取り除く券」も1枚")))),
      lv.el,
      h("button", { class: "pxbtn sl-lever", onclick: () => { A.slot = SL().new(lv.get()); A.stats.slot.runs++; markDirty(); arcRenderBody(); } }, "▶ はじめる"),
      st.runs ? h("div", { class: "ax-record" }, h("span", {}, "プレイ ", h("span", { class: "num" }, st.runs)), h("span", {}, "クリア ", h("span", { class: "num" }, st.wins)), h("span", {}, "最高 家賃", h("span", { class: "num" }, st.best), "回")) : null));
    box.append(slotDex());
    return;
  }
  const amt = SL().rentAt(Math.min(run.rent, 11), run.lv), last = run.last;
  { const [e, t] = slotSay(run, amt); box.append(talk("ll", e, t)); }
  // HUD（コイン ⟷ 家賃）
  box.append(h("div", { class: "sl-hud" },
    h("div", { class: "top" },
      h("div", {}, h("div", { class: "k" }, "コイン"), h("div", { class: "coins" }, spr("coin", 26), h("span", { class: "ax-num-big", id: "sl-coins", "data-v": String(run.coins) }, fmtN(run.coins)))),
      h("div", { class: "rent" }, h("div", { class: "k" }, `家賃 ${Math.min(run.rent + 1, 12)}/12` + (run.lv > 1 ? `・Lv${run.lv}` : "")),
        h("div", { class: "v", id: "sl-rent" }, spr("house", 22), h("span", { class: "ax-num-big" }, fmtN(amt))),
        h("div", { class: "left" + (!run.over && run.left === 1 && run.coins < amt ? " hot" : "") }, run.over ? "" : run.left === 1 ? "次で支払い！" : `あと${run.left}回で支払い`))),
    h("div", { class: "bot" }, h("div", { class: "ax-bar" + (run.coins >= amt ? " ok" : "") }, h("i", { id: "sl-bar", style: `width:${Math.min(100, run.coins / amt * 100)}%` })), pips(12, run.rent))));
  // 筐体
  const grid = h("div", { class: "sl-grid", id: "sl-grid" });
  for (let p = 0; p < 20; p++) grid.append(slotCell(last && last.cell[p]));
  const tray = h("div", { class: "sl-tray" }, h("span", { class: "msg", id: "sl-msg" }, last ? (last.paid > 0 ? `家賃 ${last.paid} を払った！` : last.paid < 0 ? "家賃が払えなかった…" : "この回の稼ぎ") : "レバーを引こう"),
    h("span", { class: "gain", id: "sl-gain" }, last ? `+${last.gain}` : ""));
  const mach = h("div", { class: "sl-mach", id: "sl-mach" },
    h("div", { class: "sl-marq" }, h("div", { class: "sl-bulbs" }, ...[...Array(4)].map(() => h("i"))), h("span", { class: "t" }, "LUCKY"), h("div", { class: "sl-bulbs" }, ...[...Array(4)].map(() => h("i")))),
    h("div", { class: "sl-win" }, grid), tray);
  if (!run.over){
    const t = arcTickets();
    mach.append(h("button", { class: "pxbtn sl-lever", id: "sl-spin", disabled: ARCU.busy || !!run.offer, onclick: () => slotDoSpin() }, "SPIN", cost(ARC_COST.spin)));
    if (t.left < ARC_COST.spin) mach.append(h("div", { class: "xs", style: "text-align:center;margin-top:6px;color:#fff;font-family:'DotGothic16'" }, "券がありません。QBを記録すると貯まります"));
  }
  box.append(mach);
  if (run.over){
    box.append(h("div", { class: "pxp", style: "text-align:center" },
      spr(run.won ? "trophy" : "skull", 56),
      h("h2", { style: "margin:6px 0 2px" }, run.won ? "完済！クリア" : `家賃${run.rent}回で閉店`),
      h("div", { class: "sub sm px" }, `${run.spins}回まわした・1回の最高 +${run.best}`),
      h("button", { class: "pxbtn sl-lever", onclick: () => { A.slot = null; markDirty(); arcRenderBody(); } }, "もう一度")));
  }
  // バッグ
  const counts = {}; run.bag.forEach(b => counts[b.id] = (counts[b.id] || 0) + 1);
  const bag = h("div", { class: "sl-bag" + (ARCU.rm ? " rm" : "") }, ...Object.entries(counts).sort((a, z) => z[1] - a[1]).map(([id, n]) =>
    h("button", { title: `${SY[id].n}：${SY[id].d || "効果なし"}`, onclick: () => {
      if (ARCU.rm){ const bi = run.bag.findIndex(b => b.id === id); SL().remove(run, bi); ARCU.rm = false; sfx("eat"); toast(`${SY[id].n}を1つ取り除いた`); markDirty(); arcRenderBody(); }
      else toast(`${SY[id].n}（+${SY[id].v}）${SY[id].d ? "：" + SY[id].d : ""}`, 3000);
    } }, spr(id, 28), `${n}`)));
  box.append(h("div", { class: "pxp" },
    h("div", { class: "ax-h" }, "持っているシンボル", h("span", { class: "cnt" }, `${run.bag.length}個 / 盤面20マス`), h("span", { class: "sp" }),
      run.rm > 0 && !run.over ? h("button", { class: "pxbtn sm " + (ARCU.rm ? "" : "gray"), onclick: () => { ARCU.rm = !ARCU.rm; arcRenderBody(); } }, ARCU.rm ? "やめる" : `取り除く ×${run.rm}`) : null),
    ARCU.rm ? h("div", { class: "sm", style: "margin:-2px 0 8px;color:#ff8a7a" }, "取り除くシンボルをタップ") : null,
    bag,
    run.bag.length > 20 ? h("div", { class: "xs sub", style: "margin-top:8px" }, "20個を超えたぶんは、まわすたびにランダムで外れる。取り除いて濃くするのも手") : null));
  box.append(slotDex());
  // シンボル選び（下から出るシート）
  if (run.offer && !run.over && !ARCU.busy){
    arcSheet(`offer:${run.spins}`, h("span", { class: "ax-row" }, spr("star", 18), "シンボルを1つ足す"), null, [
      h("div", { class: "sl-offer" }, ...run.offer.map(id => { const s = SY[id];
        return h("button", { class: "sl-card " + s.r, onclick: () => { SL().pick(run, id); sfx("buy"); markDirty(); arcRenderBody(); } },
          h("span", { class: "sl-tag " + s.r }, RAR[s.r]), spr(id, 52, "big"), h("span", { class: "nm" }, s.n),
          h("span", { class: "val" }, spr("coin", 12), `+${s.v}`), h("span", { class: "d" }, s.d)); })),
      h("button", { class: "pxbtn gray", style: "margin-top:10px", onclick: () => { SL().pick(run, null); markDirty(); arcRenderBody(); } }, "足さない")]);
  }
}
const LL_TIPS = [
  "ネコはミルクの隣に来ると、ミルクを飲んで+9じゃ。",
  "掛け算は重なると掛け合わさる。にじの隣で磁石が光るとすごいぞ。",
  "シンボルが20個を超えると、まわしても出ないやつが出てくる。",
  "取り除く券で弱いのを抜くと、盤面が濃くなるぞ。",
  "家賃を払うほど、めずらしい・レアが出やすくなるんじゃ。",
  "ドラゴンは隣を全部食べてしまう。腹ぺこじゃ。",
  "王冠は空きマスが多いほど稼ぐ。少なく持つのも手じゃな。",
  "タネは4回出ると木になって、リンゴを実らせるぞ。"
];
function slotSay(run, amt){
  const last = run.last;
  if (run.over) return run.won ? ["happy", "完済じゃ！大したもんだ。ポーカー場の鍵をやろう。"] : ["angry", "家賃が足りんぞ！今日は閉店じゃ。"];
  if (last && last.paid > 0) return ["happy", `まいど！次の家賃は${fmtN(amt)}じゃよ。`];
  if (run.left === 1) return run.coins >= amt ? ["normal", `次で家賃${fmtN(amt)}じゃ。用意はできとるようじゃな。`] : ["angry", `次で家賃${fmtN(amt)}じゃ。あと${fmtN(amt - run.coins)}足りんぞ？`];
  if (run.offer) return ["normal", "どれか1つ足していいぞ。足さんのも手じゃ。"];
  if (!last) return ["normal", `最初の家賃は${fmtN(amt)}、${run.left}回後じゃ。さあ、まわしてみい。`];
  return ["normal", LL_TIPS[run.spins % LL_TIPS.length]];
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
      // 筐体がはみ出していたら見える位置へ
      const mach = $("#sl-mach");
      if (mach){ const r = mach.getBoundingClientRect(); if (r.top < 0 || r.bottom > window.innerHeight) window.scrollTo({ top: r.top + window.scrollY - 8, behavior: "smooth" }); }
      const cells = [...grid.children];
      if (gain) gain.textContent = ""; if (msg) msg.textContent = "…";
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
      const eaten = res.cell.map((c, p) => c && c.dead ? p : -1).filter(p => p >= 0);
      if (eaten.length){
        res.cell.forEach((c, p) => { if (c && c.fx && c.fx.length) bump(cells[p], "hit"); });
        eaten.forEach(p => cells[p].classList.add("eaten"));
        sfx("eat"); await arcSleep(420);
        eaten.forEach(p => { const nu = slotCell(res.cell[p]); cells[p].replaceWith(nu); cells[p] = nu; });
      }
      res.cell.forEach((c, p) => { if (c && c.grow){ const im = cells[p].querySelector("img"); if (im){ im.src = ART.url(c.grow); bump(cells[p], "hit"); floatText(cells[p], "成長！"); } } });
      let run$ = coins0, n = 0;
      const order = res.cell.map((c, p) => [c, p]).filter(([c]) => c && !c.dead);
      for (const [c, p] of order){
        const el = cells[p];
        el.append(h("span", { class: "v" + (c.val === 0 ? " z" : c.val >= 20 ? " mega" : c.val >= 8 ? " hi" : "") }, String(c.val)));
        if (c.fx && c.fx.length) el.append(h("span", { class: "fx" }, ...c.fx.slice(0, 3).filter(id => ART.SPR[id]).map(id => spr(id, 12))));
        if (c.val > 0){
          bump(el, "hit"); n++;
          tone(440 * Math.pow(2, Math.min(n, 18) / 12), .06, { type: "square", vol: .035 });
          if (n <= 14){ const v = c.val; flyCoin(el, coinsEl, 0, () => { run$ += v; if (coinsEl){ coinsEl.dataset.v = run$; coinsEl.textContent = fmtN(run$); bump(coinsEl.parentElement); } }); }
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
  // シートが出たら、盤面がシートの上に見えるように
  if ($("#ax-sheet")){ const m = $("#sl-mach"); if (m){ const r = m.getBoundingClientRect(); if (r.top > 40 || r.top < 0) window.scrollTo({ top: r.top + window.scrollY - 8, behavior: reduceMotion() ? "auto" : "smooth" }); } }
  if (res.paid < 0) arcOverlay([h("div", { class: "faces" }, spr("ll_angry", 72)), h("h2", {}, "閉店…"), h("p", {}, `家賃${run.rent}回まで払えた。足すシンボルと取り除くシンボルを変えて、もう一度。`)]);
  else if (run.won){ sfx("evolve"); arcOverlay([h("div", { class: "faces" }, spr("trophy", 64), spr("ll_happy", 72)), h("h2", {}, "完済！スロットクリア"), h("p", {}, A.clear.slot === run.lv && run.lv === 1 ? "ポーカーが開いた！上のタブから遊べる。" : `難しさ Lv${run.lv + 1} が開いた。`)], null, { confetti: true }); }
  else if (res.paid > 0) toast("家賃を払った！取り除く券 +1", 2200);
}
function slotDex(){
  const SY = ARC.SY, R = ARC.slot.RENT;
  const rows = Object.entries(SY).map(([id, s]) => h("div", {}, spr(id, 32), h("div", {}, h("div", { class: "n" }, s.n, " ", h("span", { class: "sl-tag " + s.r }, RAR[s.r]), h("span", { class: "gold xs" }, ` +${s.v}`)), s.d ? h("div", { class: "d" }, s.d) : "")));
  return fold(h("span", { class: "ax-row" }, spr("coin", 18), "シンボル図鑑と家賃表"),
    h("div", {}, "計算の順番：① 食べる・割る（食べられたシンボルは消える）→ ② 足し算（+）→ ③ 掛け算（×）。掛け算が重なると掛け合わせる。家賃を払うほど、めずらしい・レアが出やすくなる。"),
    h("div", { class: "ax-dex" }, ...rows),
    h("div", { style: "margin-top:10px" }, "家賃：" + R.map((r, i) => `${i + 1}回目 ${r[0]}回で${r[1]}`).join(" / ")));
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
    spr("j_" + j.id, 34), h("span", {}, d.n), cnt ? h("span", { class: "cnt" }, cnt) : null);
}
const bossChip = id => { const b = ARC.BOSS[id]; return h("button", { class: "ax-chip btn boss", onclick: () => toast(`ボス「${b.n}」：${b.d}`, 3200) }, spr("b_" + id, 18), "ボス ", b.n); };
function pokerView(box){
  const A = arc();
  if (A.clear.slot < 1){
    box.append(h("div", { class: "pxp", style: "text-align:center;padding:22px 14px" }, spr("lock", 48),
      h("h2", { style: "margin:10px 0 4px" }, "まだ開いていません"),
      h("p", { class: "sub sm", style: "margin:0 0 14px" }, "スロットで12回の家賃を払いきると開きます。"),
      h("button", { class: "pxbtn gold", onclick: () => { ARCU.tab = "slot"; arcRender(); } }, "スロットへ")));
    box.append(pkRules());
    return;
  }
  const run = A.poker;
  if (!run){
    const lv = arcLevelPicker("poker"), st = A.stats.poker;
    box.append(talk("dl", "normal", st.runs ? "おかえり。今日はどこまで行けるかな。" : "いらっしゃい。8ステージ勝ち抜けたら、あんたは本物だ。"));
    box.append(h("div", { class: "pxp" },
      h("div", { class: "ax-title" }, h("div", { class: "logo" }, "POKER"),
        h("div", { class: "row" }, ...[[14, 0], [13, 1], [12, 2], [11, 3], [10, 0]].map(([r, s]) => { const im = document.createElement("img"); im.src = ART.card(r, s); im.className = "px-img"; im.style.cssText = "width:40px;height:56px"; return im; }))),
      h("div", { class: "rpg", style: "margin-top:12px" }, h("ul", { class: "ax-step-list" },
        h("li", {}, h("span", {}, "手札8枚から最大5枚を出して役を作る。得点は ", h("b", {}, "チップ × 倍率"), "。出したカードの数字（Aは11、絵札は10）もチップに入る")),
        h("li", {}, h("span", {}, "1戦ごとに目標点。出せるのは4回、捨てられるのは3回まで")),
        h("li", {}, h("span", {}, "勝つたびに報酬を1つ：ジョーカー（5枚まで）、役のレベルアップ、デッキの改造。", h("b", {}, "8ステージ×3戦"), "を勝ち抜けばクリア。3戦目はルールが変わるボス")))),
      lv.el,
      h("button", { class: "pxbtn blue", style: "margin-top:10px;font-size:21px;padding:13px", onclick: () => { A.poker = PK().new(lv.get()); A.stats.poker.runs++; ARCU.seen = new Set(); markDirty(); arcRenderBody(); } }, "▶ はじめる"),
      st.runs ? h("div", { class: "ax-record" }, h("span", {}, "プレイ ", h("span", { class: "num" }, st.runs)), h("span", {}, "クリア ", h("span", { class: "num" }, st.wins)), h("span", {}, "最高 ステージ", h("span", { class: "num" }, st.best)), h("span", {}, "1手の最高 ", h("span", { class: "num" }, fmtN(st.hand)))) : null));
    box.append(pkRules());
    return;
  }
  const R = run.rd, L = PK().limits(run), bossId = run.boss[run.ante];
  const target = R ? R.target : PK().target(run.ante, run.blind, run.lv), score = R ? R.score : 0;
  { const [e, t] = pkSay(run, target, score); box.append(talk("dl", e, t)); }
  const table = h("div", { class: "pk-felt", id: "pk-table", style: feltStyle() });
  table.append(h("div", { class: "pk-top" },
    h("span", { class: "ax-chip" }, spr("star", 16), `STAGE ${run.ante + 1}-${run.blind + 1}`, run.lv > 1 ? ` Lv${run.lv}` : ""),
    h("span", { class: "sp" }), bossChip(bossId)));
  table.append(h("div", { class: "pk-score" },
    h("div", { class: "r1" }, h("span", { class: "k" }, "得点"), h("span", { class: "now ax-num-big", id: "pk-score" }, fmtN(score)),
      h("span", { class: "tgt ax-num-big" }, h("span", { class: "k" }, "目標"), fmtN(target))),
    h("div", { class: "ax-bar" + (score >= target ? " ok" : "") }, h("i", { id: "pk-bar", style: `width:${Math.min(100, score / target * 100)}%` })),
    R ? h("div", { class: "pk-res" },
      h("span", { class: "ax-chip" }, "出す ", h("b", {}, R.plays)), h("span", { class: "ax-chip" }, "捨てる ", h("b", {}, R.discs)),
      h("span", { class: "ax-chip" }, h("img", { src: ART.back(), alt: "", class: "px-img" }), "山 ", h("b", {}, R.pile.length))) : null));
  const jk = h("div", { class: "pk-jk", id: "pk-jk" });
  for (let i = 0; i < 5; i++){ const j = run.jk[i];
    jk.append(j ? pkJokerEl(j, ARCU.replace ? { cls: "pick", onclick: () => pkFinishTake(i) } : {}) : h("div", { class: "pk-j e0" })); }
  table.append(jk);
  box.append(table);

  if (run.over){
    box.append(h("div", { class: "pxp", style: "text-align:center" }, spr(run.won ? "trophy" : "skull", 56),
      h("h2", { style: "margin:6px 0 2px" }, run.won ? "全ステージ制覇！" : `ステージ${run.ante + 1}の${BLIND[run.blind]}で終了`),
      h("div", { class: "sub sm px" }, `1手の最高 ${fmtN(run.best)}点`),
      h("button", { class: "pxbtn blue", style: "margin-top:12px", onclick: () => { A.poker = null; markDirty(); arcRenderBody(); } }, "もう一度")));
    box.append(pkLevels(run), pkRules());
    return;
  }
  if (run.offer){
    table.append(h("div", { class: "pk-ty", style: "margin:8px 0 2px;color:" + (ARCU.replace ? "#ffd447" : "#fff") }, ARCU.replace ? "▲ 入れ替えるジョーカーをタップ" : "勝ち！ 報酬を選んでね"));
    pkOfferSheet(run); box.append(pkLevels(run), pkRules()); return;
  }
  if (!R){
    const t = arcTickets(), isBoss = run.blind === 2, b = ARC.BOSS[bossId];
    table.append(h("div", { class: "pk-vs" },
      h("div", { class: "pk-ty" }, isBoss ? "ボス戦" : `ステージ${run.ante + 1}・${BLIND[run.blind]}`),
      h("div", { class: "who" }, isBoss ? spr("b_" + bossId, 64) : spr("star", 40)),
      h("div", { class: "xs px", style: "color:#bfe8cf" }, "目標"), h("div", { class: "tg" }, fmtN(target)),
      isBoss ? h("div", { class: "rule" }, `${b.n}：${b.d}`) : h("div", { class: "xs", style: "margin-top:6px;color:#d8f0e0" }, `このステージのボス：${b.n}（${b.d}）`),
      h("div", { class: "lim" }, h("span", { class: "ax-chip" }, `出す ${L.plays}`), h("span", { class: "ax-chip" }, `捨てる ${L.discs}`), h("span", { class: "ax-chip" }, `手札 ${L.hand}`), h("span", { class: "ax-chip" }, `デッキ ${run.deck.length}`)),
      h("button", { class: "pxbtn blue", style: "margin-top:14px;font-size:20px", onclick: () => {
        if (!arcPay(ARC_COST.round)) return arcNoTicket(ARC_COST.round);
        PK().start(run); ARCU.sel = []; ARCU.seen = new Set(); ARCU.focus = true; sfx("open", "rare"); markDirty(); arcRenderBody(); } }, "勝負する", cost(ARC_COST.round)),
      t.left < ARC_COST.round ? h("div", { class: "xs", style: "margin-top:6px;color:#fff" }, `券が${t.left}枚。QBを記録すると貯まります`) : null));
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
  const info = h("span", { class: "xs" });
  const handEl = h("div", { class: "pk-hand", id: "pk-hand", style: `--n:${Math.max(8, hand.length)}` });
  const playB = h("button", { class: "pxbtn blue", onclick: () => pkDoPlay() }, "出す");
  const discB = h("button", { class: "pxbtn", onclick: () => pkDoDiscard() }, "捨てる", h("small", {}, `残り${R.discs}`));
  const upd = () => {
    const sel = ARCU.sel;
    if (!sel.length){ info.textContent = "タップで選ぶ（5枚まで）"; $("#pk-ch") && ($("#pk-ch").textContent = "0"); $("#pk-mu") && ($("#pk-mu").textContent = "0"); ty.textContent = "　"; }
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
  table.append(calc, ty, zone,
    h("div", { class: "pk-handbar" }, info, h("button", { class: "ax-chip btn", onclick: () => { ARCU.sort = ARCU.sort === "s" ? "r" : "s"; arcRenderBody(); } }, ARCU.sort === "s" ? "⇄ スート順" : "⇄ 数字順")),
    handEl,
    h("div", { class: "pk-btns" }, playB, discB));
  upd();
  box.append(pkLevels(run), pkRules());
  if (ARCU.focus){ ARCU.focus = false; const tgt = box.firstChild || table; setTimeout(() => { const y = tgt.getBoundingClientRect().top + window.scrollY - 8; window.scrollTo({ top: y, behavior: "smooth" }); }, 30); }
}
const DL_TIPS = [
  "×倍率のジョーカーは右に置くほど効く。順番が大事さ。",
  "迷ったら捨てて引き直しな。捨てるのはタダだ。",
  "フラッシュはそろえやすい。染める報酬と相性がいいよ。",
  "手札に残したカードに反応するジョーカーもある。全部出せばいいってもんじゃない。",
  "役のレベルを上げると、その役の基本値がずっと上がる。",
  "少ない枚数で出すと効くジョーカーもあるね。"
];
function pkSay(run, target, score){
  const R = run.rd, b = ARC.BOSS[run.boss[run.ante]];
  if (run.over) return run.won ? ["happy", "全ステージ制覇！あんたの勝ちだ。"] : ["wow", "おっと…ここまでだね。また来な。"];
  if (run.offer) return ["happy", run.blind === 2 ? "ボスを倒したか。報酬を1つ持っていきな。" : "お見事。報酬を1つ持っていきな。"];
  if (!R) return run.blind === 2 ? ["wow", `ボス「${b.n}」のお出ましだ。${b.d}。`] : ["normal", `次の目標は${fmtN(target)}点。準備はいいかい？`];
  if (R.plays === 1 && score < target) return ["wow", `ラスト1回。あと${fmtN(target - score)}点だ。`];
  if (!R.log.length) return ["normal", run.blind === 2 ? `ボス戦だ。${b.d}。` : "さあ、カードを選びな。"];
  return ["normal", DL_TIPS[(R.log.length + run.ante) % DL_TIPS.length]];
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
      $$(".pk-btns button, .pk-handbar button").forEach(b => b.disabled = true);
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
      const need = target - before, big = s.total >= need;
      if (big && calc) calc.append(h("div", { class: "pk-flames" }, ...[...Array(7)].map(() => spr("flame", 22))));
      ty.innerHTML = ""; ty.append(h("span", { style: `font-size:24px;color:${big ? "#ffd447" : "#fff"}` }, fmtN(s.total)), h("span", { style: "font-size:13px" }, ` 点（${htName(s.type)}）`));
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
  if (s.cleared && run.won){ sfx("evolve"); arcOverlay([h("div", { class: "faces" }, spr("trophy", 64), spr("dl_happy", 72)), h("h2", {}, "全ステージ制覇！"), h("p", {}, `ポーカー Lv${run.lv} クリア。難しさ Lv${run.lv + 1} が開いた。`)], null, { confetti: true }); }
  else if (s.cleared && run.blind === 2 && run.offer) confetti(24);
  else if (s.cleared) sfx("level");
  else if (s.failed){ sfx("again"); arcOverlay([h("div", { class: "faces" }, spr("dl_wow", 72)), h("h2", {}, "届かなかった…"), h("p", {}, `ステージ${run.ante + 1}の${BLIND[run.blind]}（${fmtN(run.rd.score)} / ${fmtN(run.rd.target)}点）`)]); }
}
function pkOfferSheet(run){
  const kids = [];
  const list = h("div", { class: "pk-off" });
  run.offer.forEach((it, i) => {
    let ic, t, d;
    if (it.k === "j"){ const J = ARC.JK[it.id]; ic = h("span", { class: "ic" }, spr("j_" + it.id, 36)); t = `ジョーカー「${J.n}」`; d = J.d; }
    else if (it.k === "lv"){ const ht = ARC.HT.find(x => x[0] === it.id); ic = h("span", { class: "ic t" }, "▲"); t = `${ht[1]} を${it.n}レベル上げる`; d = `1レベルごとに チップ+${ht[4]}・倍率+${ht[5]}（いま Lv${(run.lvl[it.id] || 0) + 1}）`; }
    else if (it.k === "cut"){ ic = h("span", { class: "ic t" }, "✂"); t = `デッキからカードを${it.n}枚まで取り除く`; d = "いらないカードを抜くと、欲しいカードを引きやすくなる"; }
    else { ic = h("span", { class: "ic" }, spr("j_suit" + "SHDC"[it.s], 36)); t = `カードを${it.n}枚まで ${ARC.SUITS[it.s]} に染める`; d = "フラッシュを狙いやすくなる"; }
    list.append(h("button", { class: "pk-o" + (ARCU.pick === i ? " on" : ""), onclick: () => {
      ARCU.pick = i; ARCU.picks = []; ARCU.replace = false; sfx("pet");
      if (it.k === "j"){ if (run.jk.length >= 5){ ARCU.replace = true; ARCU.sheetMin = true; toast("ジョーカーは5枚まで。入れ替えるものを卓でタップ"); arcRenderBody(); return; } pkFinishTake(null); return; }
      if (it.k === "lv"){ pkFinishTake(null); return; }
      arcRenderBody();
    } }, ic, h("div", {}, h("div", { class: "t" }, t), h("div", { class: "d" }, d))));
  });
  kids.push(list);
  const it = ARCU.pick != null ? run.offer[ARCU.pick] : null;
  if (it && (it.k === "cut" || it.k === "dye")){
    const deck = run.deck.slice().sort((a, z) => a.s - z.s || a.r - z.r);
    const grid = h("div", { class: "pk-deck" });
    const okB = h("button", { class: "pxbtn gold", style: "margin-top:10px", disabled: !ARCU.picks.length, onclick: () => pkFinishTake(ARCU.picks.slice()) }, `${ARCU.picks.length}枚で決定`);
    for (const c of deck){ const el = pkCardEl(c, { cls: ARCU.picks.includes(c.id) ? "sel" : "", onclick: () => {
      const k = ARCU.picks.indexOf(c.id); if (k >= 0) ARCU.picks.splice(k, 1); else if (ARCU.picks.length < it.n) ARCU.picks.push(c.id); else return toast(`${it.n}枚まで`);
      el.classList.toggle("sel"); okB.textContent = `${ARCU.picks.length}枚で決定`; okB.disabled = !ARCU.picks.length; } }); grid.append(el); }
    kids.push(h("div", { class: "px sm", style: "margin-top:12px" }, it.k === "cut" ? "取り除くカードを選ぶ" : `${ARC.SUITS[it.s]} に染めるカードを選ぶ`), grid, okB);
  }
  kids.push(h("button", { class: "pxbtn gray", style: "margin-top:10px", onclick: () => { ARCU.pick = null; ARCU.picks = []; ARCU.replace = false; PK().take(run, -1); markDirty(); arcRenderBody(); } }, "報酬はいらない"));
  arcSheet(`pk:${run.ante}:${run.blind}`, h("span", { class: "ax-row" }, spr("star", 18), run.blind === 2 ? "ボス撃破！報酬を1つ" : "勝ち！報酬を1つ"), "▼ 卓を見る", kids);
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
    g.append(h("span", {}, ht[1]), h("span", { class: "sub px" }, `Lv${lv + 1}`), h("span", { class: "num" }, `${ht[2] + ht[4] * lv} × ${ht[3] + ht[5] * lv}`)); }
  return fold(h("span", { class: "ax-row" }, spr("j_lineup", 18), `役の一覧（デッキ ${run.deck.length}枚）`), g);
}
function pkRules(){
  const js = Object.entries(ARC.JK).map(([id, j]) => h("div", {}, spr("j_" + id, 32), h("div", {}, h("div", { class: "n" }, j.n), h("div", { class: "d" }, j.d))));
  const bs = Object.entries(ARC.BOSS).map(([id, b]) => h("div", {}, spr("b_" + id, 32), h("div", {}, h("div", { class: "n" }, b.n), h("div", { class: "d" }, b.d))));
  return fold(h("span", { class: "ax-row" }, spr("j_suitS", 18), "ルールとジョーカー図鑑"),
    h("div", {}, "計算の順番：役の基本値 → 得点したカード（左から。カードに反応するジョーカーもここ）→ 手札に残したカード → ジョーカー（左から）。「+倍率」と「×倍率」は順番で結果が変わる（×は後ろに置くほど効く）。ジョーカーは外して入れ直すと右端に来る。"),
    h("div", { style: "margin-top:6px" }, "目標点：" + [0, 1, 2, 3, 4, 5, 6, 7].map(a => fmtN(ARC.pkTarget(a, 0, 1))).join(" → ") + "（2戦目×1.5・ボス×2）"),
    h("div", { class: "ax-dex" }, ...js), h("div", { class: "px", style: "margin:12px 0 0;color:#fff" }, "ボス"), h("div", { class: "ax-dex" }, ...bs));
}

/* ---------- 今日画面への導線 ---------- */
function arcStrip(){
  const A = arc(), t = arcTickets();
  let st = "";
  const ys = window.yomiStrip ? window.yomiStrip() : "";
  if (ys) st = ys;
  else if (A.poker && !A.poker.over) st = `ポーカー ステージ${A.poker.ante + 1}`;
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
