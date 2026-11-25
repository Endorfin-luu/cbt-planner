/* ============================================================
   ヨミの塔 — 画面と演出
   - ルールは yomi-core.js、ドット絵は yomi-art.js（データは yomi-art-data.js）
   - 状態は S.pl.arc.yomi（run：今のラン / それ以外：図鑑・記録）。arcade.js の後に読み込む
   ============================================================ */
"use strict";
(function(){
const Y = window.YOMI;
const SP = Y.SP, MV = Y.MV, PE = Y.PE, IT = Y.IT, RL = Y.RL;
const YU = { sel: null, piv: null, busy: false, pick: [], fast: false, rstep: 0, tutor: null, tip: null, startPick: false, diff: null };
const img = (id, px, cls, flip) => YART.img(id, px, cls, flip);
const tIcon = (t, px = 14) => img("t_" + t, px, "ty");
const nm = sp => SP[sp].n;
const sleep = ms => new Promise(r => setTimeout(r, window.YOMI_FAST ? 0 : YU.fast ? Math.min(ms, 60) : ms));
const typeOf = m => m.ty || SP[m.sp].t;
const pct = (a, b) => Math.max(0, Math.round(a / Math.max(1, b) * 100));
const STAT = { a: "こうげき", d: "ぼうぎょ", s: "すばやさ" };
const STN = { brn: "やけど", psn: "どく", par: "まひ" };
const YOMI_N = { uke: "受け読み", kotai: "交代読み", mamori: "守り読み", tsumi: "積み読み" };
const YOMI_D = { uke: "交代先が半分で受けた", kotai: "交代先に2倍が刺さった", mamori: "痛い一撃をまもった", tsumi: "攻撃されないターンに積んだ" };
const STARTER_UNLOCK = { yukinbo: "1層の主を倒すと仲間になる", pachitto: "2層の主を倒すと仲間になる", koishi: "塔をクリアすると仲間になる" };
const PERS_ALL = Object.keys(PE);

/* ---------- 保存 ---------- */
function ym(){
  const A = arc(); const M = A.yomi ||= {};
  M.dex ||= {}; M.got ||= {}; M.pers ||= {}; M.clears ||= {}; M.tut ||= {};
  M.unlocked ||= ["hibachi", "shizuku", "mebuki"]; M.diffMax ||= 1; M.best ||= 0; M.runs ||= 0; M.yomiTotal ||= 0;
  return M;
}
const R = () => ym().run;
const save = () => { try { markDirty(); } catch(e){} };

/* ============================================================
   見た目
   ============================================================ */
const YCSS = `
.yo{--px:"DotGothic16",var(--f-body);color:#f3eefe}
.yo .n,.yo .l,.yo .r{color:inherit}
.yo .px{font-family:var(--px)}
.yo .ty{width:14px;height:14px;vertical-align:-2px}
.yo .tchip{display:inline-flex;align-items:center;gap:3px;font-family:var(--px);font-size:.72rem;padding:1px 6px 1px 4px;color:#1b1430;${NOTCH}}
.yo .yrow{display:flex;gap:8px;align-items:center}
.yo .ysp{flex:1}
.yo .ymut{color:#a99dcc}
.yo .ygold{color:#ffd447}
.yo .xs{font-size:.72rem}.yo .sm{font-size:.82rem}
.yo .ycard{background:#1f1733;${NOTCH};box-shadow:inset 0 0 0 2px #3a2d5e;padding:10px}
.yo .ycard.hi{box-shadow:inset 0 0 0 2px #ffd447}
.yo .yg3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.yo .yg2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.yo h2{font-family:var(--px);font-weight:400;font-size:1.15rem;margin:0 0 8px;color:#fff;letter-spacing:.04em}
.yo h3{font-family:var(--px);font-weight:400;font-size:.98rem;margin:0 0 6px;color:#fff}
.yo .hpbar{height:7px;background:#120c20;box-shadow:inset 0 0 0 1px #000;position:relative;overflow:hidden}
.yo .hpbar>i{position:absolute;left:0;top:0;bottom:0;background:#4fd06a;transition:width .45s ease-out}
.yo .hpbar>i.mid{background:#ffd447}.yo .hpbar>i.low{background:#ff5a4a}
.yo .xpbar{height:3px;background:#120c20;margin-top:2px;position:relative}.yo .xpbar>i{position:absolute;left:0;top:0;bottom:0;background:#4fc3ff}
.yo .ymon{display:flex;flex-direction:column;align-items:center;gap:2px;text-align:center;cursor:pointer;position:relative}
.yo .ymon .n{font-family:var(--px);font-size:.78rem;line-height:1.2}
.yo .ymon.dead{filter:grayscale(1) brightness(.6)}
.yo .ymon .no{position:absolute;top:-2px;left:-2px;background:#ffd447;color:#2b1a00;font-family:var(--px);font-size:.75rem;width:18px;height:18px;display:flex;align-items:center;justify-content:center;${NOTCH}}
.yo .ybadge{display:inline-flex;align-items:center;gap:3px;font-family:var(--px);font-size:.7rem;padding:1px 6px;background:#2a2142;color:#e8e0ff;${NOTCH};white-space:nowrap}
.yo .ybadge.g{background:#ffd447;color:#2b1a00}.yo .ybadge.r{background:#e8574a;color:#fff}.yo .ybadge.b{background:#3a7be0;color:#fff}.yo .ybadge.gr{background:#2fa35a;color:#fff}
.yo .ypill{display:inline-flex;gap:4px;align-items:center;font-family:var(--px);font-size:.75rem;padding:2px 8px;background:rgba(0,0,0,.35);${NOTCH}}

/* タイトル */
.yo-title{position:relative;overflow:hidden;padding:18px 12px 14px;text-align:center;background:linear-gradient(#22173f,#120c24)}
.yo-title .logo{font-family:var(--px);font-size:2rem;color:#fff;letter-spacing:.12em;text-shadow:3px 3px 0 #6a44c8,0 0 18px rgba(164,111,240,.6);margin:0}
.yo-title .en{font-family:var(--px);font-size:.72rem;letter-spacing:.4em;color:#ffd447;margin-top:2px}
.yo-title .tag{font-size:.86rem;color:#d8cff3;margin:10px 0 4px;line-height:1.6}
.yo-tw{display:flex;flex-direction:column-reverse;align-items:center;gap:3px;margin:14px auto 6px;width:min(300px,86%)}
.yo-tw .fl{width:100%;display:flex;align-items:center;gap:8px;padding:5px 8px;${NOTCH};background:#2a2142;box-shadow:inset 0 0 0 2px #3a2d5e;font-family:var(--px);font-size:.8rem;color:#cfc4ee}
.yo-tw .fl.done{background:#3a2d5e;color:#fff;box-shadow:inset 0 0 0 2px #ffd447}
.yo-tw .fl img{width:30px;height:30px}
.yo-tw .top{font-family:var(--px);color:#ffd447;font-size:.8rem}
.yo-stars{position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(#fff 1px,transparent 1px),radial-gradient(#ffd44799 1px,transparent 1px);background-size:38px 38px,57px 57px;background-position:0 0,19px 23px;opacity:.35;animation:yo-tw 6s linear infinite}
@keyframes yo-tw{50%{opacity:.6}}
.yo-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px}
.yo-stats>div{background:#171028;${NOTCH};padding:6px 2px;text-align:center}
.yo-stats .v{font-family:var(--px);font-size:1.1rem;color:#ffd447;line-height:1.1}
.yo-stats .k{font-size:.66rem;color:#a99dcc}

/* スターター */
.yo-pick{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.yo-pick .ycard{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;text-align:center;padding:10px 6px}
.yo-pick .ycard img.m{width:72px;height:72px}
.yo-pick .ycard.lock{cursor:default;opacity:.55}
.yo-pick .ycard.lock img.m{filter:brightness(0) opacity(.5)}
.yo-pick .role{font-size:.7rem;color:#a99dcc;line-height:1.45}
.yo-sbar{display:grid;grid-template-columns:auto 1fr;gap:1px 5px;align-items:center;width:100%;font-size:.62rem;color:#a99dcc;font-family:var(--px)}
.yo-sbar i{display:block;height:4px;background:#ffd447}

/* マップ */
.yo-mh{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.yo-mh .fln{font-family:var(--px);font-size:1.05rem;color:#fff}
.yo-party{display:flex;gap:4px;flex-wrap:wrap}
.yo-party .pm{width:calc((100% - 20px)/6);min-width:44px;background:#171028;${NOTCH};padding:3px 3px 4px;cursor:pointer}
.yo-party .pm img{width:100%;height:auto;aspect-ratio:1}
.yo-party .pm .lv{font-family:var(--px);font-size:.62rem;color:#cfc4ee;text-align:center;line-height:1.1}
.yo-map{position:relative;background:linear-gradient(#1a1230,#120c20);${NOTCH};box-shadow:inset 0 0 0 2px #3a2d5e;padding:8px 0;margin:8px 0}
.yo-map svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.yo-map .nrow{position:relative;height:60px}
.yo-map .node{position:absolute;top:50%;transform:translate(-50%,-50%);width:46px;height:46px;border:0;background:#2a2142;${NOTCH};box-shadow:inset 0 0 0 2px #3a2d5e;display:flex;align-items:center;justify-content:center;cursor:default;padding:0}
.yo-map .node img{width:30px;height:30px}
.yo-map .node.can{cursor:pointer;background:#3a2d5e;box-shadow:inset 0 0 0 2px #ffd447;animation:yo-pulse 1.1s ease-in-out infinite}
.yo-map .node.past{opacity:.35}
.yo-map .node.cur{box-shadow:inset 0 0 0 3px #fff;background:#4a3a78}
.yo-map .node.boss{width:64px;height:64px}.yo-map .node.boss img{width:48px;height:48px}
.yo-map .node .c{position:absolute;bottom:-7px;right:-8px;font-family:var(--px);font-size:.62rem;background:#ffd447;color:#2b1a00;padding:0 4px;${NOTCH}}
.yo-map .node .l{position:absolute;bottom:-15px;left:50%;transform:translateX(-50%);font-family:var(--px);font-size:.6rem;color:#a99dcc;white-space:nowrap}
.yo-map .node.can .l{color:#ffd447}
@keyframes yo-pulse{50%{transform:translate(-50%,-50%) scale(1.08)}}
.yo-boss{display:flex;gap:10px;align-items:center}
.yo-boss img{width:56px;height:56px}
.yo-rule{font-size:.76rem;color:#ffd0c8;line-height:1.5}
.yo-rule::before{content:"掟 ";font-family:var(--px);color:#e8574a}
.yo-rel{display:flex;gap:4px;flex-wrap:wrap}

/* 見せ合い */
.yo-foes{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.yo-foes .ycard{padding:8px 4px;text-align:center}
.yo-foes img.m{width:64px;height:64px}
.yo-cands{display:flex;flex-wrap:wrap;gap:3px;justify-content:center;margin-top:3px}
.yo-mvl{font-size:.66rem;color:#cfc4ee;line-height:1.45;margin-top:4px;text-align:left}
.yo-mvl .ty{width:10px;height:10px;vertical-align:-1px}
.yo-sel{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.yo-sel .ycard{cursor:pointer;padding:8px 4px}
.yo-sel .ycard.on{box-shadow:inset 0 0 0 3px #ffd447;background:#2a2142}
.yo-sel img.m{width:56px;height:56px}

/* バトル */
.yb{display:flex;flex-direction:column;gap:6px;user-select:none;-webkit-user-select:none}
.yb-field{position:relative;height:214px;overflow:hidden;${NOTCH};box-shadow:inset 0 0 0 2px #3a2d5e}
.yb-field.f0{background:linear-gradient(#24402e 0,#2e4a38 52%,#3a5a3e 52%,#2a4430 100%)}
.yb-field.f1{background:linear-gradient(#1c3352 0,#2a4a70 52%,#a9d6ff55 52%,#2a4a6e 100%)}
.yb-field.f2{background:linear-gradient(#211a3d 0,#2e2552 52%,#3a3060 52%,#241c40 100%)}
.yb-field.f3{background:linear-gradient(#140c28 0,#2a1d4a 52%,#4a3a78 52%,#2a1d4a 100%)}
.yb-field::before{content:"";position:absolute;inset:0;background-image:radial-gradient(#ffffff18 1px,transparent 1px);background-size:16px 16px;pointer-events:none}
.yb-field.f2.flash::after{content:"";position:absolute;inset:0;background:#fff8;animation:yb-fl .3s}
.yb-plat{position:absolute;width:150px;height:30px;border-radius:50%;background:radial-gradient(#00000066,#00000000 70%)}
.yb-plat.e{right:14px;top:96px}.yb-plat.p{left:4px;bottom:6px}
.yb-spr{position:absolute;transition:transform .25s ease-out,opacity .25s,filter .2s}
.yb-spr img{width:100%;height:100%;display:block}
.yb-spr.e{right:34px;top:20px;width:96px;height:96px}
.yb-spr.e.big{right:22px;top:4px;width:120px;height:120px}
.yb-spr.p{left:22px;bottom:12px;width:104px;height:104px}
.yb-spr.lunge-p{transform:translate(18px,-10px)}
.yb-spr.lunge-e{transform:translate(-18px,10px)}
.yb-spr.hit{animation:yb-hit .42s}
.yb-spr.out-p{transform:translateX(-140px);opacity:0}
.yb-spr.out-e{transform:translateX(140px);opacity:0}
.yb-spr.faint{transform:translateY(60px);opacity:0;transition:transform .5s ease-in,opacity .5s}
.yb-spr.glow{filter:drop-shadow(0 0 6px #ffd447) brightness(1.15)}
.yb-spr.prot img{filter:drop-shadow(0 0 4px #8fe3ff) drop-shadow(0 0 8px #8fe3ff)}
@keyframes yb-hit{0%,100%{transform:none;filter:none}15%{transform:translateX(-6px);filter:brightness(3)}30%{transform:translateX(6px)}45%{transform:translateX(-4px);filter:brightness(3)}60%{transform:translateX(3px)}}
@keyframes yb-fl{from{opacity:1}to{opacity:0}}
.yb-plate{position:absolute;background:#f3eefe;color:#1b1430;${NOTCH};padding:4px 8px 5px;min-width:150px;box-shadow:inset -3px -3px 0 #c9bfe6}
.yb-plate.e{left:8px;top:10px}.yb-plate.p{right:8px;bottom:16px}
.yb-plate .nm{font-family:var(--px);font-size:.84rem;display:flex;align-items:center;gap:4px;line-height:1.25}
.yb-plate .nm .lv{margin-left:auto;font-size:.72rem}
.yb-plate .hpbar{margin-top:3px;height:6px}
.yb-plate .hpt{font-family:var(--px);font-size:.7rem;text-align:right;line-height:1.1;margin-top:2px;display:flex;gap:4px;align-items:center}
.yb-plate .hpt .st{margin-right:auto;display:flex;gap:2px}
.yb-plate .stc{font-family:var(--px);font-size:.6rem;padding:0 4px;color:#fff;background:#e8574a}
.yb-plate .stc.psn{background:#a46ff0}.yb-plate .stc.par{background:#d9a400}.yb-plate .stc.up{background:#2fa35a}.yb-plate .stc.dn{background:#3a7be0}
.yb-team{position:absolute;display:flex;gap:3px}
.yb-team.e{left:10px;top:66px}.yb-team.p{right:10px;bottom:4px}
.yb-team i{width:9px;height:9px;background:#ffd447;${NOTCH};display:block}
.yb-team i.x{background:#4c4266}.yb-team i.a{background:#fff}
.yb-msg{position:absolute;left:8px;right:8px;bottom:8px;background:#120c20f2;color:#fff;font-family:var(--px);font-size:.9rem;padding:8px 10px;${NOTCH};box-shadow:inset 0 0 0 2px #6a5c90;display:none;line-height:1.45;z-index:4}
.yb-msg.on{display:block}
.yb-float{position:absolute;font-family:var(--px);font-size:1.05rem;color:#fff;text-shadow:2px 2px 0 #000;pointer-events:none;animation:yb-up .9s ease-out forwards;z-index:5}
.yb-float.eff2{color:#ffd447;font-size:1.25rem}.yb-float.eff0{color:#9fb6d9}.yb-float.heal{color:#7dff9a}
@keyframes yb-up{from{transform:translateY(0);opacity:1}to{transform:translateY(-34px);opacity:0}}
.yb-cut{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:6;pointer-events:none}
.yb-cut .band{width:120%;transform:rotate(-8deg);background:linear-gradient(90deg,#ffd44700,#ffd447 15%,#ffd447 85%,#ffd44700);padding:10px 0;text-align:center;animation:yb-band .9s ease-out forwards}
.yb-cut .band b{font-family:var(--px);font-weight:400;font-size:1.7rem;color:#2b1a00;letter-spacing:.2em;text-shadow:2px 2px 0 #fff}
.yb-cut .band small{display:block;font-family:var(--px);font-size:.8rem;color:#5a3a00;letter-spacing:.1em}
@keyframes yb-band{0%{transform:rotate(-8deg) translateX(-110%)}20%,75%{transform:rotate(-8deg) translateX(0)}100%{transform:rotate(-8deg) translateX(110%)}}

.yb-int{display:grid;grid-template-columns:1fr auto 1fr;gap:6px;align-items:stretch}
.yb-ic{position:relative;background:#1f1733;${NOTCH};box-shadow:inset 0 0 0 2px #3a2d5e;padding:7px 8px 6px 30px;min-height:64px;transition:opacity .2s,box-shadow .2s}
.yb-ic .L{position:absolute;left:6px;top:6px;font-family:var(--px);font-size:1.25rem;color:#a99dcc;line-height:1}
.yb-ic .what{font-family:var(--px);font-size:.84rem;color:#fff;line-height:1.3;display:flex;align-items:center;gap:4px;flex-wrap:wrap}
.yb-ic .what img.mini{width:22px;height:22px}
.yb-ic .fx{font-size:.7rem;color:#d8cff3;line-height:1.35;margin-top:2px}
.yb-ic .fx b{font-family:var(--px);font-weight:400;color:#ffd447}
.yb-ic .who{display:flex;flex-wrap:wrap;gap:3px;margin-top:4px}
.yb-ic.sure{box-shadow:inset 0 0 0 2px #ffd447;background:#2e2350}
.yb-ic.sure .L{color:#ffd447}
.yb-ic.no{opacity:.35}
.yb-ic .stamp{position:absolute;right:5px;top:5px;font-family:var(--px);font-size:.62rem;background:#ffd447;color:#2b1a00;padding:0 5px;${NOTCH}}
.yb-ic.no .stamp{background:#4c4266;color:#cfc4ee}
.yb-q{display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:var(--px);color:#a99dcc;font-size:.7rem;min-width:30px;text-align:center;line-height:1.2}
.yb-q b{font-weight:400;font-size:1.4rem;color:#fff}
.yb-q.k b{color:#ffd447}
.yb-pers{display:flex;align-items:center;gap:6px;background:#171028;${NOTCH};padding:5px 8px}
.yb-pers .ypc{font-family:var(--px);font-size:.75rem;padding:1px 6px;background:#2a2142;color:#e8e0ff;${NOTCH};cursor:pointer;border:0}
.yb-pers .ypc.k{background:#ffd447;color:#2b1a00}
.yb-pers .ypc.x{text-decoration:line-through;opacity:.35}
.yb-g{display:flex;gap:3px;align-items:center}
.yb-g i{width:14px;height:14px;background:#2a2142;box-shadow:inset 0 0 0 2px #4c4266;transform:rotate(45deg);display:block;margin:0 2px}
.yb-g i.on{background:#ffd447;box-shadow:inset 0 0 0 2px #fff3b0,0 0 6px #ffd447}
.yb-btn{font-family:var(--px);font-size:.78rem;border:0;padding:5px 9px;color:#fff;background:#3a7be0;${NOTCH};cursor:pointer;box-shadow:inset -2px -2px 0 rgba(0,0,0,.3)}
.yb-btn:disabled{filter:grayscale(.9) brightness(.6);cursor:default}
.yb-btn.y{background:#ffd447;color:#2b1a00}.yb-btn.r{background:#e8574a}

.yb-cmd{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.yb-mv{position:relative;text-align:left;border:0;cursor:pointer;color:#fff;padding:7px 8px 6px;${NOTCH};background:#2a2142;box-shadow:inset 0 -3px 0 rgba(0,0,0,.35),inset 0 0 0 2px #3a2d5e;min-height:52px}
.yb-mv .n{font-family:var(--px);font-size:.88rem;display:flex;align-items:center;gap:4px;line-height:1.25}
.yb-mv .s{font-size:.66rem;color:#cfc4ee;display:flex;gap:6px;align-items:center;margin-top:2px}
.yb-mv .e2{color:#ffd447;font-family:var(--px)}.yb-mv .e0{color:#9fb6d9;font-family:var(--px)}
.yb-mv.on{box-shadow:inset 0 0 0 3px #ffd447;background:#3a2d5e}
.yb-mv:disabled{opacity:.35;cursor:default}
.yb-mv.yomi{background:linear-gradient(135deg,#6a44c8,#c84a8a);grid-column:1/-1}
.yb-mv.yomi .n{font-size:.95rem}
.yb-bench{display:flex;gap:6px}
.yb-bm{flex:1;display:flex;align-items:center;gap:6px;border:0;cursor:pointer;color:#fff;padding:5px 8px;${NOTCH};background:#171028;box-shadow:inset 0 0 0 2px #3a2d5e;text-align:left}
.yb-bm img{width:34px;height:34px}
.yb-bm .n{font-family:var(--px);font-size:.78rem;line-height:1.2}
.yb-bm.on{box-shadow:inset 0 0 0 3px #ffd447;background:#2a2142}
.yb-bm:disabled{opacity:.35}
.yb-prev{background:#120c20;${NOTCH};box-shadow:inset 0 0 0 2px #6a5c90;padding:8px 10px}
.yb-prev .ln{display:flex;align-items:center;gap:6px;font-size:.78rem;line-height:1.4;padding:2px 0}
.yb-prev .ln .k{font-family:var(--px);color:#a99dcc;min-width:46px}
.yb-prev .ln.dim{opacity:.35}
.yb-prev .ln b{font-family:var(--px);font-weight:400}
.yb-prev .up{color:#ffd447}.yb-prev .dn{color:#ff8a7a}
.yb-prev .yo-b{font-family:var(--px);font-size:.68rem;background:#ffd447;color:#2b1a00;padding:0 5px;${NOTCH}}
.yb-prev .ord{font-size:.68rem;color:#a99dcc}
.yb-hint{font-size:.74rem;color:#a99dcc;text-align:center;line-height:1.5;padding:4px}

/* チュートリアル */
.yo-tip{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);width:min(520px,calc(100% - 24px));background:#ffd447;color:#2b1a00;${NOTCH};padding:10px 12px;z-index:300;font-size:.86rem;line-height:1.6;box-shadow:0 6px 0 #c9921a}
.yo-tip b{font-family:var(--px);font-weight:400}
.yo-tip .yrow{margin-top:6px}
.yo-tip button{font-family:var(--px);border:0;background:#2b1a00;color:#ffd447;padding:5px 12px;cursor:pointer;${NOTCH}}

/* オーバーレイ */
.yo-ov{position:fixed;inset:0;background:#0b0716cc;z-index:310;display:flex;align-items:flex-end;justify-content:center}
.yo-ov .box{background:#1a1230;width:min(560px,100%);max-height:86vh;overflow:auto;padding:14px 14px 18px;${NOTCH};box-shadow:inset 0 0 0 2px #6a5c90;color:#f3eefe}
.yo-ov .box h2{font-family:var(--px);font-weight:400;font-size:1.1rem;margin:0 0 8px;color:#fff}
.yo-det{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start}
.yo-det img.m{width:96px;height:96px}
.yo-mlist{display:flex;flex-direction:column;gap:4px;margin-top:8px}
.yo-mlist>div{display:flex;gap:6px;align-items:center;background:#120c20;padding:5px 8px;${NOTCH};font-size:.78rem}
.yo-mlist .mn{font-family:var(--px);min-width:96px}
.yo-mlist .md{color:#a99dcc;font-size:.7rem;flex:1;line-height:1.35}
.yo-mlist .on{box-shadow:inset 0 0 0 2px #ffd447}
.yo-ring{display:block;margin:6px auto;width:220px;height:220px}
.yo-rules p{font-size:.84rem;line-height:1.75;margin:0 0 8px;color:#d8cff3}
.yo-rules b{color:#ffd447;font-weight:700}
.yo-plist{display:grid;gap:5px}
.yo-plist>div{background:#120c20;${NOTCH};padding:5px 8px;font-size:.76rem;line-height:1.5}
.yo-plist .pn{font-family:var(--px);color:#fff;margin-right:6px}
.yo-plist .lock{color:#6a5c90}
.yo-evo{position:fixed;inset:0;z-index:330;background:#0b0716;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:#fff;font-family:var(--px)}
.yo-evo img{width:160px;height:160px}
.yo-evo img.sil{filter:brightness(0) invert(1)}
.yo-evo .t{font-size:1.1rem;text-align:center;line-height:1.6}
`;
(function(){ const st = document.createElement("style"); st.textContent = YCSS; document.head.append(st); })();

/* ---------- 小さな部品 ---------- */
function hpCls(p){ return p > 50 ? "" : p > 20 ? "mid" : "low"; }
function hpBar(hp, mx){ const p = pct(hp, mx); return h("div", { class: "hpbar" }, h("i", { class: hpCls(p), style: `width:${p}%` })); }
function tchip(t){ return h("span", { class: "tchip", style: `background:${Y.TC[t]}` }, tIcon(t, 12), Y.TN[t]); }
function overlay(title, kids, onClose){
  const ov = h("div", { class: "yo-ov yo" }), box = h("div", { class: "box" }, title ? h("h2", {}, title) : null, ...kids,
    h("button", { class: "pxbtn gold", style: "margin-top:12px", onclick: () => close() }, "とじる"));
  ov.append(box);
  const close = () => { ov.remove(); onClose && onClose(); };
  ov.addEventListener("click", e => { if (e.target === ov) close(); });
  document.body.append(ov); return close;
}
function moveDesc(id){
  const m = MV[id]; if (!m) return "";
  const parts = [];
  if (m.k === "atk") parts.push(`威力${m.p}`);
  if (m.pr > 0) parts.push("先制");
  if (m.pivot) parts.push("攻撃して仲間と交代");
  if (m.drain) parts.push("ダメージの半分を回復");
  if (m.recoil) parts.push(`反動 ${m.recoil < .4 ? "1/3" : "1/2"}`);
  if (m.self) parts.push(Object.entries(m.self).map(([k, v]) => `自分の${STAT[k]}${v > 0 ? "+" : ""}${v}`).join("・"));
  if (m.tgt) parts.push(Object.entries(m.tgt).map(([k, v]) => `相手の${STAT[k]}${v}`).join("・"));
  if (m.k === "st") parts.push(`相手を${STN[m.st]}にする`);
  if (m.k === "prot") parts.push("このターンの攻撃を防ぐ（連続では使えない）");
  if (m.k === "heal") parts.push(`HPを半分回復（連続では使えない・1戦${m.max || 9}回）`);
  if (m.k === "haz") parts.push("相手の場に設置：交代で出てきた相手に最大HPの1/8");
  if (m.k === "leech") parts.push("毎ターン相手のHPを1/8うばう（交代で消える）");
  if (m.yomi) parts.push("必殺・まもる貫通・" + (m.d || ""));
  return parts.join("・");
}
function moveType(sp, id){ const m = MV[id]; return m.t === "self" ? SP[sp].t : m.t; }
function moveRow(sp, id, extra){
  return h("div", { class: extra?.cls || "" }, tIcon(moveType(sp, id), 14), h("span", { class: "mn" }, MV[id].n), h("span", { class: "md" }, moveDesc(id)), extra?.right || null);
}
function statBars(sp){
  const b = SP[sp].b, mx = 165;
  return h("div", { class: "yo-sbar" }, ...["HP", "攻", "防", "速"].flatMap((k, i) => [h("span", {}, k), h("i", { style: `width:${Math.min(100, b[i] / mx * 100)}%` })]));
}
function monDetail(m, opts = {}){
  const s = SP[m.sp], mx = Y.monMax(m);
  const st = Y.calcStats(m.sp, m.lv);
  const evo = s.evo ? `Lv${s.evo[0]}で${SP[s.evo[1]].n}に進化` : "最終進化";
  return [h("div", { class: "yo-det" }, img(m.sp, 96, "m"),
      h("div", {}, h("div", { class: "yrow" }, h("h3", { style: "margin:0" }, s.n), tchip(s.t), h("span", { class: "px ymut sm" }, `Lv${m.lv}`)),
        h("div", { class: "xs ymut", style: "margin:2px 0 4px" }, s.role + "。" + evo),
        hpBar(m.hp, mx), h("div", { class: "px xs", style: "text-align:right" }, `HP ${Math.max(0, m.hp)}/${mx}`),
        h("div", { class: "px xs ymut" }, `攻撃 ${st.a}・防御 ${st.d}・素早さ ${st.s}`),
        m.item ? h("div", { class: "xs", style: "margin-top:4px" }, img("item", 14), ` ${IT[m.item].n}：${IT[m.item].d}`) : null)),
    h("div", { class: "yo-mlist" }, ...m.moves.map(id => moveRow(m.sp, id)), moveRow(m.sp, s.y || "y_any", { cls: "", right: h("span", { class: "ybadge g" }, "必殺") })),
    ...(opts.extra || [])];
}
function persChips(cands, all){
  return h("div", { class: "yo-cands" }, ...(all || cands).map(c => h("span", { class: "ybadge" + (cands.length === 1 ? " g" : ""), onclick: e => { e.stopPropagation(); persInfo(c); } }, PE[c].n)));
}
function persInfo(c){ overlay(`性格「${PE[c].n}」`, [h("p", { class: "sm", style: "line-height:1.7" }, PE[c].d), h("p", { class: "xs ymut" }, "A＝攻め（いまのあなたの場のモンスターに一番効く攻撃）、B＝対応（交代・変化技・別の技など）。ルールはターンのはじめの状態で決まる。")]); }

/* ============================================================
   画面の入口（arcade.js から呼ばれる）
   ============================================================ */
window.yomiView = function(box){
  ym();
  const o = R();
  const wrap = h("div", { class: "yo" });
  box.append(wrap);
  if (!o) return titleView(wrap);
  ({ partner: partnerView, map: mapView, pre: preView, battle: battleView, reward: rewardView, recruit: recruitView, tutor: tutorView, rest: restView, shop: shopView, event: eventView, over: overView })[o.phase]?.(wrap, o);
};
const rerender = () => { try { arcRenderBody(); } catch(e){ console.error(e); } };
window.yomiStrip = () => { const o = R(); if (!o || o.phase === "over") return ""; return `ヨミの塔 ${o.floor + 1}層`; };

/* ---------- タイトル ---------- */
function titleView(w){
  const M = ym();
  const t = h("div", { class: "ycard yo-title" }, h("div", { class: "yo-stars" }),
    h("h1", { class: "logo" }, "ヨミの塔"), h("div", { class: "en" }, "TOWER OF YOMI"),
    h("div", { class: "tag" }, "敵は、行動を2つ予告する。", h("br"), "どちらが来るかは、性格しだい。"));
  const tw = h("div", { class: "yo-tw" });
  Y.FLOORS.forEach((F, i) => tw.append(h("div", { class: "fl" + (M.best > i ? " done" : ""), style: `width:${100 - i * 8}%` }, img(F.boss, 30), h("span", {}, `${i + 1}層 ${F.n}`), h("span", { class: "ysp" }), M.best > i ? "★" : "")));
  tw.append(h("div", { class: "top" }, Object.keys(M.clears).length ? "★ 頂上 ★" : "▲ 頂上 ▲"));
  t.append(tw);
  const dexN = Object.keys(M.got).length, persN = Object.keys(M.pers).length;
  t.append(h("div", { class: "yo-stats" },
    h("div", {}, h("div", { class: "v" }, M.best ? `${M.best}層` : "-"), h("div", { class: "k" }, "最高到達")),
    h("div", {}, h("div", { class: "v" }, String(Object.values(M.clears).reduce((a, b) => a + b, 0))), h("div", { class: "k" }, "クリア")),
    h("div", {}, h("div", { class: "v" }, `${dexN}`), h("div", { class: "k" }, "仲間にした")),
    h("div", {}, h("div", { class: "v" }, `${persN}/${PERS_ALL.length}`), h("div", { class: "k" }, "見抜いた性格"))));
  w.append(t);
  if (YU.startPick) w.append(starterPick());
  else {
    const go = h("button", { class: "pxbtn gold", style: "margin-top:10px", onclick: () => { YU.startPick = true; rerender(); } }, "▶ 塔に挑む");
    w.append(go);
    w.append(h("div", { class: "yb-hint" }, "ランの途中はいつでもやめて、続きから遊べる。バトルに入るときだけ券を使う（野良3・強敵5・層の主7）"));
  }
  w.append(rulesFold(), dexFold());
}
function starterPick(){
  const M = ym();
  const box = h("div", { class: "ycard", style: "margin-top:10px" }, h("h2", {}, "最初の仲間を選ぶ"));
  const g = h("div", { class: "yo-pick" });
  for (const sp of Y.STARTERS){
    const ok = M.unlocked.includes(sp), s = SP[sp];
    g.append(h("div", { class: "ycard" + (ok ? "" : " lock"), onclick: () => { if (!ok) return toast(STARTER_UNLOCK[sp] || "まだ選べない", 2600); startRun(sp); } },
      img(sp, 72, "m"), h("div", { class: "px" }, ok ? s.n : "？？？"), tchip(s.t), ok ? h("div", { class: "role" }, s.role) : h("div", { class: "role" }, STARTER_UNLOCK[sp]), ok ? statBars(sp) : null));
  }
  box.append(g);
  if (M.diffMax > 1){
    const d = YU.diff ?? M.diffMax;
    const sel = h("select", { style: "font-family:'DotGothic16';background:#171028;color:#fff;border:2px solid #6a5c90;padding:4px 8px", onchange: e => { YU.diff = +e.target.value; } },
      ...[...Array(M.diffMax)].map((_, i) => h("option", { value: String(i + 1), selected: i + 1 === d }, `難しさ ${i + 1}` + (i + 1 === M.diffMax ? "（未クリア）" : ""))));
    box.append(h("div", { class: "yrow", style: "justify-content:center;margin-top:10px" }, sel));
    box.append(h("div", { class: "xs ymut", style: "margin-top:6px;line-height:1.6" }, ...Y.DIFF.slice(2, M.diffMax + 1).map((t, i) => h("div", {}, `難しさ${i + 2}：${t}`))));
  }
  box.append(h("button", { class: "pxbtn gray sm", style: "margin:10px auto 0", onclick: () => { YU.startPick = false; rerender(); } }, "もどる"));
  return box;
}
function startRun(sp){
  const M = ym();
  const o = Y.newRun(sp, YU.diff ?? M.diffMax);
  M.run = o; M.runs++; M.got[sp] = 1;
  YU.startPick = false;
  sfx("chest"); save(); rerender();
}

/* ---------- 相棒 ---------- */
function partnerView(w, o){
  w.append(h("div", { class: "ycard" }, h("h2", {}, "相棒を選ぶ"),
    h("p", { class: "sm ymut", style: "margin:0 0 8px" }, "交代して受けるのが、この塔の基本。タイプの違う相棒をひとり連れていこう。"),
    h("div", { class: "yo-pick" }, ...o.node.offer.map(m => h("div", { class: "ycard", onclick: () => { Y.recruit(o, m); ym().got[m.sp] = 1; Y.leaveNode(o); sfx("chest"); save(); rerender(); maybeTip("map"); } },
      img(m.sp, 72, "m"), h("div", { class: "px" }, `${nm(m.sp)} Lv${m.lv}`), tchip(SP[m.sp].t), h("div", { class: "role" }, SP[m.sp].role), statBars(m.sp))))));
  w.append(typeRingCard());
}

/* ---------- 地図 ---------- */
function partyStrip(o, onTap){
  return h("div", { class: "yo-party" }, ...o.party.map(m => { const mx = Y.monMax(m); return h("div", { class: "pm" + (m.hp <= 0 ? " ymon dead" : ""), onclick: () => onTap ? onTap(m) : teamSheet(o, m.uid) },
    img(m.sp, 40), hpBar(m.hp, mx), h("div", { class: "lv" }, `Lv${m.lv}`)); }));
}
function relicRow(o){
  if (!o.relics.length) return null;
  return h("div", { class: "yo-rel" }, ...o.relics.map(r => h("span", { class: "ybadge", onclick: () => overlay(RL[r].n, [h("p", { class: "sm" }, RL[r].d)]) }, img("relic", 14), RL[r].n)));
}
function mapView(w, o){
  const F = Y.FLOORS[o.floor];
  const tk = arcTickets().left;
  w.append(h("div", { class: "yo-mh" }, img("tower", 28), h("span", { class: "fln" }, `${o.floor + 1}層 ${F.n}`), h("span", { class: "ysp" }),
    h("span", { class: "ypill" }, img("item", 14), h("span", { class: "ygold" }, `${o.coins}`), "コイン"),
    o.diff > 1 ? h("span", { class: "ypill" }, `難しさ${o.diff}`) : null));
  w.append(partyStrip(o));
  const rr = relicRow(o); if (rr) w.append(h("div", { style: "margin-top:6px" }, rr));
  // 地図
  const map = h("div", { class: "yo-map" });
  const rows = o.map.rows, can = Y.nextNodes(o).map(x => x.join(","));
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  map.append(svg);
  const bossRow = h("div", { class: "nrow", style: "height:86px" });
  const bossBtn = h("button", { class: "node boss" + (can.includes("boss,0") ? " can" : ""), style: "left:50%", onclick: () => can.includes("boss,0") && goNode(o, "boss", 0) }, img(F.boss, 48), h("span", { class: "c" }, `券${Y.NODE.boss.cost}`), h("span", { class: "l" }, "層の主"));
  bossRow.append(bossBtn);
  map.append(bossRow);
  const els = [];
  for (let s = rows.length - 1; s >= 0; s--){
    const row = h("div", { class: "nrow" });
    rows[s].forEach((n, i) => {
      const key = `${s},${i}`, ok = can.includes(key);
      const past = s < o.step || (s === o.step && i !== o.pos) || (s > o.step + 1) ? false : false;
      const cls = ["node"]; if (ok) cls.push("can"); if (s === o.step && i === o.pos) cls.push("cur"); if (s < o.step || (s === o.step && i !== o.pos)) cls.push("past");
      const nd = Y.NODE[n.t];
      const b = h("button", { class: cls.join(" "), style: `left:${n.x * 100}%`, onclick: () => ok && goNode(o, s, i) }, img("n_" + n.t, 30), nd.cost ? h("span", { class: "c" }, `券${nd.cost}`) : null, h("span", { class: "l" }, nd.n));
      row.append(b); els.push({ s, i, b, n });
    });
    map.append(row);
  }
  w.append(map);
  requestAnimationFrame(() => {
    const r0 = map.getBoundingClientRect();
    const pos = b => { const r = b.getBoundingClientRect(); return [r.left + r.width / 2 - r0.left, r.top + r.height / 2 - r0.top]; };
    svg.setAttribute("viewBox", `0 0 ${r0.width} ${r0.height}`);
    let paths = "";
    for (const e of els){
      const [x1, y1] = pos(e.b);
      const tos = e.s === rows.length - 1 ? [bossBtn] : e.n.to.map(j => els.find(x => x.s === e.s + 1 && x.i === j)?.b).filter(Boolean);
      for (const tb of tos){
        const [x2, y2] = pos(tb);
        const on = (e.s === o.step && e.i === o.pos) || (o.step < 0 && false);
        paths += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${on ? "#ffd447" : "#3a2d5e"}" stroke-width="${on ? 3 : 2}" stroke-dasharray="${on ? "0" : "4 4"}"/>`;
      }
    }
    svg.innerHTML = paths;
  });
  // 層の主
  w.append(h("div", { class: "ycard" }, h("div", { class: "yo-boss" }, img(F.boss, 56),
    h("div", {}, h("div", { class: "px" }, `層の主：${nm(F.boss)}`), h("div", { class: "yrow", style: "gap:4px;margin:2px 0" }, tchip(SP[F.boss].t), h("span", { class: "ybadge" }, `性格 ${SP[F.boss].pe.map(p => PE[p].n).join("/")}`)),
      ...F.rd.map(t => h("div", { class: "yo-rule" }, t))))));
  w.append(h("div", { class: "yg2", style: "margin-top:8px" },
    h("button", { class: "pxbtn blue", onclick: () => teamSheet(o) }, "仲間・持ち物"),
    h("button", { class: "pxbtn gray", onclick: () => { if (confirm("このランをあきらめますか？（記録は残ります）")){ o.phase = "over"; o.result = "quit"; save(); rerender(); } } }, "あきらめる")));
  w.append(h("div", { class: "yb-hint" }, `券 ${tk}枚。地図の光っているマスに進む。バトルのマスは券を使う。`));
}
function goNode(o, s, i){
  const t = s === "boss" ? "boss" : o.map.rows[s][i].t;
  const cost = Y.NODE[t].cost;
  if (cost && !arcPay(cost)) return arcNoTicket(cost);
  Y.enterNode(o, s, i);
  if (o.node.foes){ Y.applyOracle(o); Y.applyBump(o); const M = ym(); for (const f of o.node.foes) M.dex[f.sp] = 1; YU.pick = []; }
  if (o.phase === "tutor") YU.tutor = null;
  sfx("coin"); save(); rerender(); window.scrollTo(0, 0);
}

/* ---------- 仲間・持ち物 ---------- */
function teamSheet(o, focus){
  let close;
  const body = h("div", {});
  const draw = () => {
    body.innerHTML = "";
    body.append(h("div", { class: "yrow", style: "flex-wrap:wrap;gap:6px;margin-bottom:8px" },
      h("span", { class: "ypill" }, img("potion", 16), `キズぐすり ×${o.bag.potion || 0}`), h("span", { class: "ypill" }, img("revive", 16), `げんきのかけら ×${o.bag.revive || 0}`),
      ...o.items.map((it, k) => h("span", { class: "ybadge", onclick: () => overlay(IT[it].n, [h("p", { class: "sm" }, IT[it].d)]) }, img("item", 14), IT[it].n))));
    for (const m of o.party){
      const mx = Y.monMax(m);
      const c = h("div", { class: "ycard" + (m.uid === focus ? " hi" : ""), style: "margin-bottom:8px" }, ...monDetail(m));
      const acts = h("div", { class: "yrow", style: "flex-wrap:wrap;gap:6px;margin-top:8px" });
      if (m.hp > 0 && m.hp < mx && o.bag.potion > 0) acts.append(h("button", { class: "yb-btn", onclick: () => { Y.useCon(o, "potion", m.uid); sfx("pet"); save(); draw(); } }, "キズぐすり"));
      if (m.hp <= 0 && o.bag.revive > 0) acts.append(h("button", { class: "yb-btn y", onclick: () => { Y.useCon(o, "revive", m.uid); sfx("level"); save(); draw(); } }, "げんきのかけら"));
      o.items.forEach((it, k) => acts.append(h("button", { class: "yb-btn", onclick: () => { Y.equip(o, m.uid, k); sfx("buy"); save(); draw(); } }, `${IT[it].n}を持たせる`)));
      if (m.item) acts.append(h("button", { class: "yb-btn r", onclick: () => { Y.unequip(o, m.uid); save(); draw(); } }, "持ち物を外す"));
      if (o.party.length > 1 && o.phase === "map") acts.append(h("button", { class: "yb-btn r", onclick: () => { if (confirm(`${nm(m.sp)}を逃がしますか？`)){ o.party = o.party.filter(x => x.uid !== m.uid); save(); draw(); } } }, "逃がす"));
      if (acts.childNodes.length) c.append(acts);
      body.append(c);
    }
    if (o.relics.length) body.append(h("h3", {}, "秘宝"), h("div", { class: "yo-plist" }, ...o.relics.map(r => h("div", {}, h("span", { class: "pn" }, RL[r].n), RL[r].d))));
  };
  draw();
  close = overlay("仲間・持ち物", [body], () => rerender());
}

/* ---------- 見せ合い ---------- */
function foeCard(f, opts = {}){
  const s = SP[f.sp];
  return h("div", { class: "ycard" }, img(f.sp, s.boss ? 72 : 64, "m"), h("div", { class: "px sm" }, s.n), h("div", { class: "yrow", style: "justify-content:center;gap:4px" }, tchip(s.t), h("span", { class: "px xs" }, `Lv${f.lv}`)),
    persChips(f.cand), f.item ? h("div", { class: "xs ymut" }, img("item", 12), IT[f.item].n) : null,
    h("div", { class: "yo-mvl" }, ...f.moves.map(id => h("div", {}, tIcon(moveType(f.sp, id), 10), " ", MV[id].n))));
}
function preView(w, o){
  const kind = o.node.t, F = Y.FLOORS[o.floor];
  w.append(h("div", { class: "yrow", style: "margin-bottom:6px" }, img("n_" + kind, 28), h("h2", { style: "margin:0" }, { wild: "野良戦", elite: "強敵", boss: `層の主：${nm(F.boss)}` }[kind])));
  if (kind === "boss") w.append(h("div", { class: "ycard", style: "margin-bottom:8px" }, ...F.rd.map(t => h("div", { class: "yo-rule" }, t))));
  w.append(h("div", { class: "px sm ymut", style: "margin:2px 0 4px" }, "相手（この順に出てくる）"), h("div", { class: "yo-foes" }, ...o.node.foes.map(f => foeCard(f))));
  // 自分
  const alive = o.party.filter(m => m.hp > 0);
  if (!YU.pick.length) YU.pick = alive.slice(0, 3).map(m => m.uid);
  YU.pick = YU.pick.filter(u => alive.some(m => m.uid === u));
  w.append(h("div", { class: "px sm ymut", style: "margin:10px 0 4px" }, "連れていく3体を選ぶ（①が先頭）"));
  const sel = h("div", { class: "yo-sel" });
  for (const m of o.party){
    const k = YU.pick.indexOf(m.uid), mx = Y.monMax(m);
    sel.append(h("div", { class: "ycard ymon" + (k >= 0 ? " on" : "") + (m.hp <= 0 ? " dead" : ""), onclick: () => {
        if (m.hp <= 0) return;
        if (k >= 0) YU.pick.splice(k, 1); else if (YU.pick.length < 3) YU.pick.push(m.uid); else { YU.pick.shift(); YU.pick.push(m.uid); }
        rerender(); } },
      k >= 0 ? h("span", { class: "no" }, String(k + 1)) : null, img(m.sp, 56, "m"), h("div", { class: "n" }, `${nm(m.sp)} Lv${m.lv}`), tchip(SP[m.sp].t), h("div", { style: "width:100%" }, hpBar(m.hp, mx)), h("div", { class: "px xs" }, `${Math.max(0, m.hp)}/${mx}`)));
  }
  w.append(sel);
  w.append(h("button", { class: "pxbtn gold", style: "margin-top:10px", disabled: !YU.pick.length, onclick: () => { Y.startBattle(o, YU.pick.slice()); YU.sel = null; YU.piv = null; sfx("combo"); save(); rerender(); window.scrollTo(0, 0); maybeTip("battle"); } }, "戦う"));
  w.append(h("div", { class: "yb-hint" }, "相手の性格の候補と技が見えている。相性の輪：炎→氷→草→雷→水→岩→炎（時計回りに2つ先まで2倍）"));
}

/* ============================================================
   バトル
   ============================================================ */
const BUI = {};
function battleView(w, o){
  const B = o.battle;
  if (!B){ o.phase = "map"; return mapView(w, o); }
  const wrap = h("div", { class: "yb" });
  w.append(wrap);
  // 場
  const fld = h("div", { class: `yb-field f${o.floor}` });
  BUI.fld = fld;
  fld.append(h("div", { class: "yb-plat e" }), h("div", { class: "yb-plat p" }));
  BUI.espr = h("div", { class: "yb-spr e" }); BUI.pspr = h("div", { class: "yb-spr p" });
  BUI.eplate = h("div", { class: "yb-plate e" }); BUI.pplate = h("div", { class: "yb-plate p" });
  BUI.eteam = h("div", { class: "yb-team e" }); BUI.pteam = h("div", { class: "yb-team p" });
  BUI.msg = h("div", { class: "yb-msg" });
  fld.append(BUI.espr, BUI.pspr, BUI.eplate, BUI.pplate, BUI.eteam, BUI.pteam, BUI.msg);
  fld.addEventListener("click", () => { if (YU.busy) YU.fast = true; });
  wrap.append(fld);
  drawField(B);
  BUI.under = h("div", { style: "display:flex;flex-direction:column;gap:6px" });
  wrap.append(BUI.under);
  drawControls(o);
}
function drawSide(B, side){
  const m = Y.act(B, side), S = B[side];
  const sprEl = side === "E" ? BUI.espr : BUI.pspr, plate = side === "E" ? BUI.eplate : BUI.pplate, team = side === "E" ? BUI.eteam : BUI.pteam;
  sprEl.className = "yb-spr " + (side === "E" ? "e" : "p") + (SP[m.sp].boss && side === "E" ? " big" : "") + (m.hp <= 0 ? " faint" : "");
  sprEl.innerHTML = ""; sprEl.append(img(m.sp, 0, "", side === "P"));
  sprEl.dataset.sp = m.sp;
  plate.innerHTML = "";
  const t = typeOf(m);
  const stc = [];
  if (m.status) stc.push(h("span", { class: "stc " + m.status }, STN[m.status]));
  for (const [k, v] of Object.entries(m.stg)) if (v) stc.push(h("span", { class: "stc " + (v > 0 ? "up" : "dn") }, `${STAT[k].slice(0, 2)}${v > 0 ? "+" : ""}${v}`));
  if (m.leech) stc.push(h("span", { class: "stc", style: "background:#2f8a36" }, "やどりぎ"));
  plate.append(h("div", { class: "nm" }, tIcon(t, 13), SP[m.sp].n, h("span", { class: "lv" }, `Lv${m.lv}`)),
    h("div", { class: "hpbar" }, h("i", { class: hpCls(pct(m.hp, m.mhp)), style: `width:${pct(m.hp, m.mhp)}%` })),
    h("div", { class: "hpt" }, h("span", { class: "st" }, ...stc), h("span", {}, `${Math.max(0, m.hp)}/${m.mhp}`)));
  plate.onclick = () => side === "E" ? foeInfo(B) : null;
  team.innerHTML = "";
  S.team.forEach((x, i) => team.append(h("i", { class: x.hp <= 0 ? "x" : i === S.act ? "a" : "" })));
  if (S.haz) team.append(h("span", { class: "px", style: "font-size:.6rem;color:#ffd447;margin-left:3px" }, "設置"));
}
function drawField(B){ drawSide(B, "E"); drawSide(B, "P"); }
function foeInfo(B){
  const e = Y.act(B, "E");
  overlay(`${SP[e.sp].n}（Lv${e.lv}）`, [h("div", { class: "yrow" }, tchip(typeOf(e)), h("span", { class: "px sm" }, `HP ${e.hp}/${e.mhp}`), e.item ? h("span", { class: "ybadge" }, IT[e.item].n) : null),
    h("div", { class: "px sm", style: "margin-top:8px" }, "性格の候補"), h("div", { class: "yo-plist" }, ...e.cand.map(c => h("div", {}, h("span", { class: "pn" }, PE[c].n), PE[c].d))),
    h("div", { class: "yo-mlist" }, ...e.moves.map(id => moveRow(e.sp, id))),
    h("p", { class: "xs ymut" }, `能力：攻撃 ${e.a}・防御 ${e.d}・素早さ ${e.s}`)]);
}

/** 予告カードの中身 */
function intentCard(B, L, view){
  const I = B.intent, a = L === "A" ? I.A : I.B, e = Y.act(B, "E"), p = Y.act(B, "P");
  const card = h("div", { class: "yb-ic" }, h("span", { class: "L" }, L));
  const what = h("div", { class: "what" }), fx = h("div", { class: "fx" });
  if (a.k === "sw"){
    const to = B.E.team[a.to];
    what.append("⇄ 交代", img(to.sp, 22, "mini"), SP[to.sp].n);
    fx.append(tchip(typeOf(to)));
  } else {
    const mv = MV[a.m];
    what.append(tIcon(moveType(e.sp, a.m), 14), mv.n);
    if (mv.k === "atk"){
      const r = Y.dmgCalc(B, "E", e, p, mv, false);
      fx.append("あなたの", SP[p.sp].n, "に ", h("b", {}, `${Math.min(r.dmg, p.hp)}`), r.e >= 2 ? h("b", {}, "（2倍）") : r.e < 1 ? "（半分）" : "", r.dmg >= p.hp ? h("b", {}, " 倒される") : "");
    } else fx.append(moveDesc(a.m));
  }
  card.append(what, fx);
  const who = h("div", { class: "who" });
  if (!view.known) for (const c of e.cand){ if (view.byCand[c] === L || view.byCand[c] === "?") who.append(h("span", { class: "ybadge", onclick: () => persInfo(c) }, PE[c].n + (view.byCand[c] === "?" ? "?" : ""))); }
  card.append(who);
  if (view.known === L){ card.classList.add("sure"); card.append(h("span", { class: "stamp" }, I.peek ? "看破" : "確定")); }
  else if (view.known){ card.classList.add("no"); card.append(h("span", { class: "stamp" }, "やらない")); }
  return card;
}
function drawControls(o){
  const B = o.battle, U = BUI.under; U.innerHTML = "";
  if (B.over){ U.append(endPanel(o)); return; }
  if (B.need === "switch"){ U.append(h("div", { class: "ycard" }, h("h3", {}, "次に出す仲間を選ぶ"), benchRow(B, i => { Y.chooseReplacement(B, i); sfx("coin"); save(); YU.sel = null; rerender(); }, true))); return; }
  const view = Y.intentView(B), e = Y.act(B, "E");
  // 予告
  U.append(h("div", { class: "px xs ymut" }, "敵の予告（どちらか1つだけやる）"));
  U.append(h("div", { class: "yb-int" }, intentCard(B, "A", view),
    h("div", { class: "yb-q" + (view.known ? " k" : "") }, view.known ? h("b", {}, view.known) : h("b", {}, "？"), view.known ? "" : "割れ"),
    intentCard(B, "B", view)));
  // 性格とゲージ
  const all = SP[e.sp].pe;
  const pers = h("div", { class: "yb-pers" }, h("span", { class: "px xs ymut" }, "性格"),
    ...e.cand.map(c => h("button", { class: "ypc" + (e.cand.length === 1 ? " k" : ""), onclick: () => persInfo(c) }, PE[c].n)),
    h("span", { class: "ysp" }),
    h("span", { class: "yb-g" }, ...[0, 1, 2].map(i => h("i", { class: i < B.P.gauge ? "on" : "" }))),
    h("button", { class: "yb-btn y", disabled: !!view.known || (B.P.gauge < 1 && !Y.peekFree(B)), onclick: () => { Y.peek(B); sfx("chest"); save(); YU.sel = null; rerender(); } }, Y.peekFree(B) ? "看破(無料)" : "看破◆1"));
  U.append(pers);
  // 技
  const p = Y.act(B, "P");
  const cmd = h("div", { class: "yb-cmd" });
  for (const id of p.moves){
    const mv = MV[id], ok = Y.usable(p, id), t = moveType(p.sp, id);
    let sub = [];
    if (mv.k === "atk"){ const r = Y.dmgCalc(B, "P", p, e, mv, false); sub.push(h("span", {}, `威力${mv.p}`), r.e >= 2 ? h("span", { class: "e2" }, "2倍") : r.e < 1 ? h("span", { class: "e0" }, "半分") : null, h("span", {}, `≈${Math.min(100, pct(r.dmg, e.mhp))}%`)); }
    else sub.push(h("span", {}, { st: "状態異常", buff: "能力アップ", prot: "まもる", heal: "回復", haz: "設置", leech: "やどりぎ" }[mv.k] || "変化"));
    if (mv.pr > 0) sub.push(h("span", { class: "e2" }, "先制"));
    if (!ok) sub = [h("span", {}, mv.max && (p.used?.[id] || 0) >= mv.max ? "もう使えない" : p.choice ? "こだわり中" : "連続では使えない")];
    const act = { k: "move", m: id };
    cmd.append(h("button", { class: "yb-mv" + (YU.sel && YU.sel.k === "move" && YU.sel.m === id ? " on" : ""), disabled: !ok, style: `border-left:4px solid ${Y.TC[t]}`, onclick: () => selectAct(o, act) },
      h("div", { class: "n" }, tIcon(t, 13), mv.n), h("div", { class: "s" }, ...sub)));
  }
  if (B.P.gauge >= Y.yomiCost(B)){
    const id = Y.yomiMove(B);
    cmd.append(h("button", { class: "yb-mv yomi" + (YU.sel && YU.sel.k === "yomi" ? " on" : ""), onclick: () => selectAct(o, { k: "yomi" }) }, h("div", { class: "n" }, "◆必殺 ", MV[id].n), h("div", { class: "s" }, moveDesc(id))));
  }
  U.append(cmd);
  U.append(benchRow(B, i => selectAct(o, { k: "sw", to: i })));
  // プレビュー
  if (YU.sel) U.append(previewPanel(o, YU.sel, view));
  else U.append(h("div", { class: "yb-hint" }, "技か交代を選ぶと、「Aなら」「Bなら」の結果が出る。もう一度押すか「決定」で実行"));
}
function benchRow(B, onPick, forced){
  const bn = Y.bench(B, "P");
  const row = h("div", { class: "yb-bench" });
  B.P.team.forEach((m, i) => {
    if (i === B.P.act) return;
    const ok = bn.includes(i);
    row.append(h("button", { class: "yb-bm" + (YU.sel && YU.sel.k === "sw" && YU.sel.to === i ? " on" : ""), disabled: !ok, onclick: () => onPick(i) },
      img(m.sp, 34, "", true), h("div", { style: "flex:1;min-width:0" }, h("div", { class: "n" }, (forced ? "" : "⇄ ") + SP[m.sp].n), hpBar(m.hp, m.mhp), h("div", { class: "px xs ymut" }, `${Math.max(0, m.hp)}/${m.mhp}`))));
  });
  return row;
}
function selectAct(o, a){
  const B = o.battle;
  if (YU.busy) return;
  const same = YU.sel && YU.sel.k === a.k && YU.sel.m === a.m && YU.sel.to === a.to;
  if (same) return commit(o);
  YU.sel = a;
  if (a.k === "move" && MV[a.m].pivot){ const bn = Y.bench(B, "P"); YU.piv = bn.includes(YU.piv) ? YU.piv : bn[0] ?? null; }
  sfx("pet"); drawControls(o);
  BUI.under.querySelector(".yb-prev")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
function fullAct(){ const a = { ...YU.sel }; if (a.k === "move" && MV[a.m].pivot && YU.piv != null) a.piv = YU.piv; return a; }
function previewPanel(o, a, view){
  const B = o.battle;
  const pa = fullAct();
  const pv = Y.preview(B, pa);
  const box = h("div", { class: "yb-prev" });
  const e = Y.act(B, "E");
  for (const L of ["A", "B"]){
    const r = pv[L];
    const dim = view.known && view.known !== L;
    const parts = [];
    if (r.dealt) parts.push(h("span", {}, "与 ", h("b", { class: "up" }, String(r.dealt)), r.eff >= 2 ? "（2倍）" : r.eff != null && r.eff < 1 ? "（半分）" : "", r.koE ? h("b", { class: "up" }, " 倒す") : ""));
    if (r.taken) parts.push(h("span", {}, "受 ", h("b", { class: "dn" }, String(r.taken)), r.koP ? h("b", { class: "dn" }, " 倒される") : ""));
    if (!r.dealt && !r.taken) parts.push(h("span", { class: "ymut" }, "ダメージなし"));
    for (const n of r.notes) parts.push(h("span", { class: "ymut" }, n));
    if (r.yomi.length) parts.push(h("span", { class: "yo-b" }, "読み勝ち " + r.yomi.map(k => YOMI_N[k]).join("・")));
    if (r.over === "win") parts.push(h("span", { class: "yo-b" }, "勝ち"));
    if (r.over === "lose") parts.push(h("span", { class: "yo-b", style: "background:#e8574a;color:#fff" }, "負け"));
    box.append(h("div", { class: "ln" + (dim ? " dim" : "") }, h("span", { class: "k" }, `${L}なら`), ...parts));
  }
  if (a.k === "move" && MV[a.m].pivot){
    const bn = Y.bench(B, "P");
    if (bn.length) box.append(h("div", { class: "ln" }, h("span", { class: "k" }, "下がる先"), ...bn.map(i => h("button", { class: "yb-btn" + (YU.piv === i ? " y" : ""), onclick: () => { YU.piv = i; drawControls(o); } }, SP[B.P.team[i].sp].n))));
  }
  box.append(h("div", { class: "yrow", style: "margin-top:6px" }, h("span", { class: "ord" }, orderText(B, pa)), h("span", { class: "ysp" }), h("button", { class: "pxbtn gold sm", onclick: () => commit(o) }, "決定")));
  return box;
}
function orderText(B, pa){
  if (pa.k === "sw") return "交代はいちばん先";
  const C = Y.resolveCopy(B, pa, B.intent.peek ? B.intent.letter : "A");
  const first = C.ev.find(x => x.k === "use");
  if (!first) return "";
  return first.side === "P" ? "あなたが先に動く（Aのとき）" : "相手が先に動く（Aのとき）";
}

/* ---------- 実行と演出 ---------- */
async function commit(o){
  const B = o.battle;
  if (YU.busy || !YU.sel) return;
  const pa = fullAct();
  YU.busy = true; YU.fast = false;
  const pre = Y.clone(B);
  const eBefore = Y.act(B, "E");
  Y.turn(o, pa);
  // 図鑑：見抜いた性格
  const M = ym();
  for (const ev of B.ev){ if (ev.k === "reveal"){ M.pers[ev.pers] = (M.pers[ev.pers] || 0) + 1; } if (ev.k === "yomi") M.yomiTotal += ev.kinds.length; }
  YU.sel = null; YU.piv = null;
  save();
  BUI.under.querySelectorAll("button").forEach(b => b.disabled = true);
  try { await play(pre, B); } catch(e){ console.error(e); }
  YU.busy = false; YU.fast = false;
  rerender();
}
function say(t){ BUI.msg.textContent = t; BUI.msg.classList.add("on"); }
function floatAt(side, text, cls){
  const el = side === "E" ? BUI.espr : BUI.pspr;
  const f = h("div", { class: "yb-float " + (cls || "") }, text);
  const r = el.getBoundingClientRect(), r0 = BUI.fld.getBoundingClientRect();
  f.style.left = (r.left - r0.left + r.width / 2 - 14) + "px"; f.style.top = (r.top - r0.top + 10) + "px";
  BUI.fld.append(f); setTimeout(() => f.remove(), 950);
}
function setHp(D, side){
  const m = Y.act(D, side), plate = side === "E" ? BUI.eplate : BUI.pplate;
  const bar = plate.querySelector(".hpbar i"), txt = plate.querySelector(".hpt>span:last-child");
  const p = pct(m.hp, m.mhp);
  if (bar){ bar.style.width = p + "%"; bar.className = hpCls(p); }
  if (txt) txt.textContent = `${Math.max(0, m.hp)}/${m.mhp}`;
}
async function play(D, B){
  const nmS = side => SP[Y.act(D, side).sp].n, who = side => side === "E" ? "あいての " + nmS(side) : nmS(side);
  for (const ev of B.ev){
    const el = s => s === "E" ? BUI.espr : BUI.pspr;
    switch (ev.k){
      case "use": {
        say(`${who(ev.side)}の ${MV[ev.m].n}！`);
        const s = el(ev.side); s.classList.add(ev.side === "P" ? "lunge-p" : "lunge-e");
        tone(ev.side === "P" ? 520 : 330, .07, { vol: .03 });
        await sleep(260); s.classList.remove("lunge-p", "lunge-e"); await sleep(200);
        break;
      }
      case "hit": {
        const m = Y.act(D, ev.side); m.hp = Math.max(0, m.hp - ev.dmg);
        const s = el(ev.side); s.classList.remove("hit"); void s.offsetWidth; s.classList.add("hit");
        floatAt(ev.side, `-${ev.dmg}`, ev.e >= 2 ? "eff2" : ev.e < 1 ? "eff0" : "");
        tone(ev.e >= 2 ? 140 : 200, .12, { type: "sawtooth", slide: .5, vol: ev.e >= 2 ? .06 : .04 });
        setHp(D, ev.side);
        await sleep(420);
        if (ev.e >= 2){ say("こうかは ばつぐんだ！"); await sleep(520); }
        else if (ev.e < 1){ say("こうかは いまひとつの ようだ…"); await sleep(480); }
        break;
      }
      case "blocked": say(`${who(ev.side)}は 攻撃から 身を まもった！`); el(ev.side).classList.add("prot"); tone(880, .1, { type: "triangle", vol: .04 }); await sleep(620); el(ev.side).classList.remove("prot"); break;
      case "prot": say(`${who(ev.side)}は まもりの 体勢に はいった！`); el(ev.side).classList.add("prot"); await sleep(520); el(ev.side).classList.remove("prot"); break;
      case "sw": {
        const s = el(ev.side), out = Y.act(D, ev.side);
        if (out.hp > 0 || ev.why !== "faint"){ if (ev.side === "P") say(`もどれ、${SP[out.sp].n}！`); s.classList.add(ev.side === "P" ? "out-p" : "out-e"); await sleep(300); }
        D[ev.side].act = ev.to;
        const m = Y.act(D, ev.side); m.stg = { a: 0, d: 0, s: 0 };
        drawSide(D, ev.side);
        s.classList.add(ev.side === "P" ? "out-p" : "out-e"); void s.offsetWidth;
        s.classList.remove("out-p", "out-e", "faint");
        say(ev.side === "P" ? `ゆけっ、${SP[m.sp].n}！` : `あいては ${SP[m.sp].n}を くりだした！`);
        tone(660, .08, { vol: .03 }); await sleep(520);
        break;
      }
      case "haz": { const m = Y.act(D, ev.side); m.hp = Math.max(0, m.hp - ev.dmg); setHp(D, ev.side); floatAt(ev.side, `-${ev.dmg}`); say(`${who(ev.side)}に とがった いしが ささった！`); await sleep(520); break; }
      case "flag": { const m = Y.act(D, "E"); m.hp = Math.max(0, m.hp - ev.dmg); setHp(D, "E"); floatAt("E", `-${ev.dmg}`); say("番兵の旗が ひるがえった！"); await sleep(480); break; }
      case "stg": {
        const m = Y.act(D, ev.side);
        for (const [k, v] of Object.entries(ev.ch)){ m.stg[k] = (m.stg[k] || 0) + v; say(`${who(ev.side)}の ${STAT[k]}が ${v >= 2 ? "ぐーんと あがった" : v > 0 ? "あがった" : v <= -2 ? "がくっと さがった" : "さがった"}！`); tone(v > 0 ? 700 : 300, .12, { type: "triangle", slide: v > 0 ? 1.5 : .6, vol: .04 }); await sleep(560); }
        drawSide(D, ev.side); break;
      }
      case "status": { const m = Y.act(D, ev.side); m.status = ev.st; drawSide(D, ev.side); say(`${who(ev.side)}は ${STN[ev.st]}${ev.st === "par" ? "で すばやさが おちた" : ev.st === "brn" ? "を おった" : "を あびた"}！`); await sleep(600); break; }
      case "heal": { const m = Y.act(D, ev.side); m.hp = Math.min(m.mhp, m.hp + ev.v); setHp(D, ev.side); floatAt(ev.side, `+${ev.v}`, "heal"); if (ev.why === "heal" || ev.why === "left" || ev.why === "bell") say(`${who(ev.side)}の HPが かいふくした`); tone(880, .1, { type: "triangle", vol: .03 }); await sleep(ev.why === "drain" || ev.why === "leech" ? 300 : 480); break; }
      case "recoil": case "orb": { const m = Y.act(D, ev.side); m.hp = Math.max(0, m.hp - ev.dmg); setHp(D, ev.side); floatAt(ev.side, `-${ev.dmg}`); say(`${who(ev.side)}は ${ev.k === "orb" ? "いのちのたまで" : "反動で"} HPが へった`); await sleep(480); break; }
      case "dot": { const m = Y.act(D, ev.side); m.hp = Math.max(0, m.hp - ev.dmg); setHp(D, ev.side); floatAt(ev.side, `-${ev.dmg}`); say(ev.st === "leech" ? `やどりぎが ${who(ev.side)}の HPを うばう！` : `${who(ev.side)}は ${STN[ev.st]}の ダメージを うけた`); await sleep(480); break; }
      case "sash": say(`${who(ev.side)}は きあいのハチマキで もちこたえた！`); await sleep(620); break;
      case "setHaz": say(ev.side === "E" ? "あいての 足もとに いしが ちらばった！" : "あなたの 足もとに いしが ちらばった！"); await sleep(560); break;
      case "leech": say(`${who(ev.side)}に タネを うえつけた！`); await sleep(520); break;
      case "fail": say("しかし うまく きまらなかった！"); await sleep(520); break;
      case "reflect": say("鏡が 技を はね返した！"); BUI.fld.classList.add("flash"); await sleep(560); BUI.fld.classList.remove("flash"); break;
      case "faint": { const s = el(ev.side); say(`${who(ev.side)}は たおれた！`); s.classList.add("faint"); tone(220, .4, { type: "square", slide: .3, vol: .04 }); await sleep(720); break; }
      case "yomi": await cutIn(ev); break;
      case "reveal": say(`性格を 見抜いた！ ${SP[ev.sp].n}は「${PE[ev.pers].n}」だ！`); sfx("chest"); await sleep(900); break;
      case "king": { const m = Y.act(D, "E"); m.ty = ev.ty; drawSide(D, "E"); BUI.fld.classList.add("flash"); say(`ヨミの王は ${Y.TN[ev.ty]}タイプに 姿を かえた！`); sfx("evolve"); await sleep(1100); BUI.fld.classList.remove("flash"); break; }
      case "phoenix": { const m = Y.act(D, "P"); m.hp = Math.floor(m.mhp / 2); drawSide(D, "P"); say("不死鳥の羽が 燃え上がった！"); sfx("level"); await sleep(900); break; }
      case "end": say(ev.win ? "勝った！" : "目の前が まっくらに なった…"); if (ev.win) sfx("level"); await sleep(900); break;
    }
  }
  BUI.msg.classList.remove("on");
}
async function cutIn(ev){
  const box = h("div", { class: "yb-cut" }, h("div", { class: "band" }, h("b", {}, "読み勝ち！"), h("small", {}, ev.kinds.map(k => `${YOMI_N[k]}：${YOMI_D[k]}`).join(" / "))));
  BUI.fld.append(box);
  [784, 988, 1175, 1568].forEach((f, i) => tone(f, .09, { delay: i * .05, vol: .04 }));
  BUI.pspr.classList.add("glow");
  await sleep(1000); box.remove(); BUI.pspr.classList.remove("glow");
}
function endPanel(o){
  const B = o.battle, win = B.over === "win";
  return h("div", { class: "ycard", style: "text-align:center" }, h("h2", {}, win ? "勝った！" : "負けてしまった…"),
    h("p", { class: "sm ymut" }, win ? "経験値とコインを受け取ろう" : "連れていった仲間が全員倒れた。ランはここまで。"),
    h("button", { class: "pxbtn gold", onclick: () => { const res = Y.finishBattle(o); afterBattle(o, res); } }, win ? "つぎへ" : "結果を見る"));
}
function afterBattle(o, res){
  const M = ym();
  if (res){ for (const e of res.evo) M.got[e.to] = 1; }
  YU.rstep = 0; YU.res = res;
  save(); rerender(); window.scrollTo(0, 0);
  if (res && res.evo.length) evoAnim(res.evo);
}
async function evoAnim(list){
  for (const e of list){
    const im = YART.img(e.from, 160, "sil");
    const t = h("div", { class: "t" }, `おや…？ ${SP[e.from].n}の ようすが…！`);
    const ov = h("div", { class: "yo-evo" }, im, t);
    document.body.append(ov);
    sfx("evolve");
    for (let i = 0; i < 6; i++){ await new Promise(r => setTimeout(r, 240 - i * 25)); im.src = YART.url(i % 2 ? e.from : e.to); }
    im.src = YART.url(e.to); im.classList.remove("sil");
    t.textContent = `${SP[e.from].n}は ${SP[e.to].n}に 進化した！`;
    sfx("level");
    await new Promise(r => { ov.addEventListener("click", r); setTimeout(r, 2200); });
    ov.remove();
  }
}

/* ---------- 報酬 ---------- */
function rewardView(w, o){
  const res = o.lastRes || YU.res || { win: true, xp: 0, coins: 0, lv: [], evo: [], learn: [] };
  // 順番：まとめ → 技を覚える（1つずつ）→ 仲間 → 秘宝
  const steps = [];
  steps.push("sum");
  (res.learn || []).forEach((L, i) => steps.push("learn" + i));
  if (res.recruit) steps.push("recruit");
  if (res.relicOffer && res.relicOffer.length) steps.push("relic");
  const st = steps[Math.min(YU.rstep || 0, steps.length - 1)];
  const next = () => { YU.rstep = (YU.rstep || 0) + 1; if (YU.rstep >= steps.length){ YU.rstep = 0; finishReward(o); } else { save(); rerender(); } };
  if (st === "sum"){
    const box = h("div", { class: "ycard" }, h("h2", {}, o.node?.t === "boss" ? "層の主を倒した！" : "勝利！"),
      h("div", { class: "yrow", style: "gap:6px;flex-wrap:wrap" }, h("span", { class: "ypill" }, `経験値 +${res.xp}`), h("span", { class: "ypill" }, img("item", 14), `コイン +${res.coins}`)),
      o.node?.t === "boss" ? h("p", { class: "sm ygold", style: "margin:6px 0 0" }, "全員のHPが回復した") : h("p", { class: "xs ymut", style: "margin:6px 0 0" }, "生きている仲間はHPが少し回復した"));
    const lv = h("div", { class: "yg3", style: "margin-top:8px" });
    for (const m of o.party){ const up = res.lv.filter(x => x.uid === m.uid).length; lv.append(h("div", { class: "ymon" + (m.hp <= 0 ? " dead" : "") }, img(m.sp, 48), h("div", { class: "n" }, `Lv${m.lv}`), up ? h("span", { class: "ybadge g" }, `+${up}`) : null, h("div", { style: "width:100%" }, hpBar(m.hp, Y.monMax(m))))); }
    box.append(lv);
    w.append(box, h("button", { class: "pxbtn gold", style: "margin-top:10px", onclick: next }, "つぎへ"));
    return;
  }
  if (st.startsWith("learn")){
    const L = res.learn[+st.slice(5)], m = o.party.find(x => x.uid === L.uid);
    if (!m) return next();
    w.append(h("div", { class: "ycard" }, h("h2", {}, `${nm(m.sp)}は ${MV[L.m].n}を 覚えたい！`),
      h("div", { class: "yo-mlist" }, moveRow(m.sp, L.m, { cls: "on" })),
      h("p", { class: "sm ymut" }, "技は4つまで。忘れさせる技を選ぶ："),
      h("div", { class: "yo-mlist" }, ...m.moves.map((id, k) => { const r = moveRow(m.sp, id); r.style.cursor = "pointer"; r.onclick = () => { m.moves[k] = L.m; sfx("level"); toast(`${MV[id].n}を忘れて ${MV[L.m].n}を覚えた！`); next(); }; return r; }))),
      h("button", { class: "pxbtn gray", style: "margin-top:8px", onclick: next }, `${MV[L.m].n}を覚えない`));
    return;
  }
  if (st === "recruit"){
    const r = res.recruit;
    w.append(h("div", { class: "ycard", style: "text-align:center" }, h("h2", {}, "読み切られた相手が、仲間になりたそうだ！"), img(r.sp, 96), h("div", { class: "px" }, `${nm(r.sp)} Lv${r.lv}`), tchip(SP[r.sp].t), h("div", { class: "xs ymut" }, SP[r.sp].role)));
    if (o.party.length < 6) w.append(h("div", { class: "yg2", style: "margin-top:8px" }, h("button", { class: "pxbtn gold", onclick: () => { Y.recruit(o, r); ym().got[r.sp] = 1; sfx("chest"); next(); } }, "仲間にする"), h("button", { class: "pxbtn gray", onclick: next }, "見送る")));
    else { w.append(h("p", { class: "sm ymut" }, "仲間がいっぱい（6体）。入れ替えるなら逃がす仲間を選ぶ："), partyStrip(o, m => { if (confirm(`${nm(m.sp)}を逃がして、${nm(r.sp)}を仲間にしますか？`)){ Y.recruit(o, r, m.uid); ym().got[r.sp] = 1; next(); } }), h("button", { class: "pxbtn gray", style: "margin-top:8px", onclick: next }, "見送る")); }
    return;
  }
  if (st === "relic"){
    w.append(h("div", { class: "ycard" }, h("h2", {}, "秘宝をひとつ選ぶ"), h("div", { class: "yo-plist" }, ...res.relicOffer.map(r => h("div", { style: "cursor:pointer;display:flex;gap:8px;align-items:center", onclick: () => { o.relics.push(r); sfx("open"); next(); } }, img("relic", 28), h("div", {}, h("span", { class: "pn" }, RL[r].n), h("div", { class: "xs ymut" }, RL[r].d)))))));
    return;
  }
}
function finishReward(o){
  const wasBoss = o.node && o.node.t === "boss", f = o.floor;
  const M = ym();
  Y.afterReward(o);
  if (wasBoss){
    M.best = Math.max(M.best, f + 1);
    const un = f === 0 ? "yukinbo" : f === 1 ? "pachitto" : null;
    if (un && !M.unlocked.includes(un)){ M.unlocked.push(un); setTimeout(() => toast(`${nm(un)}を最初の仲間に選べるようになった！`, 3200), 400); }
  }
  YU.res = null; save(); rerender(); window.scrollTo(0, 0);
}

/* ---------- 仲間・技・休憩・店・事件 ---------- */
function recruitView(w, o){
  const off = o.node.offer;
  w.append(h("div", { class: "ycard" }, h("h2", {}, "仲間になりたそうなモンスター"), h("p", { class: "sm ymut", style: "margin:0 0 8px" }, "1体だけ連れていける"),
    h("div", { class: "yo-pick" }, ...off.map(m => h("div", { class: "ycard", onclick: () => {
      if (o.party.length >= 6) return pickRelease(o, m);
      Y.recruit(o, m); ym().got[m.sp] = 1; Y.leaveNode(o); sfx("chest"); save(); rerender(); } },
      img(m.sp, 72, "m"), h("div", { class: "px" }, `${nm(m.sp)} Lv${m.lv}`), tchip(SP[m.sp].t), h("div", { class: "role" }, SP[m.sp].role), statBars(m.sp))))));
  w.append(h("button", { class: "pxbtn gray", style: "margin-top:8px", onclick: () => { Y.leaveNode(o); save(); rerender(); } }, "誰も連れていかない"));
}
function pickRelease(o, m){
  const close = overlay("仲間がいっぱい", [h("p", { class: "sm" }, `${nm(m.sp)}の代わりに逃がす仲間を選ぶ`), partyStrip(o, x => { Y.recruit(o, m, x.uid); ym().got[m.sp] = 1; Y.leaveNode(o); close(); save(); rerender(); })]);
}
function tutorView(w, o){
  w.append(h("h2", {}, "技を覚える"), h("p", { class: "sm ymut", style: "margin:0 0 8px" }, "1体だけ、新しい技を覚えられる"));
  if (!YU.tutor){
    w.append(h("div", { class: "yo-sel" }, ...o.party.map(m => h("div", { class: "ycard ymon", onclick: () => { YU.tutor = { uid: m.uid }; rerender(); } }, img(m.sp, 56, "m"), h("div", { class: "n" }, `${nm(m.sp)} Lv${m.lv}`), tchip(SP[m.sp].t)))));
  } else {
    const m = o.party.find(x => x.uid === YU.tutor.uid);
    const offer = (o.node.offers || {})[m.uid] || [];
    w.append(h("div", { class: "ycard" }, h("div", { class: "yrow" }, img(m.sp, 40), h("span", { class: "px" }, nm(m.sp))),
      h("p", { class: "sm ymut" }, YU.tutor.m ? "忘れさせる技を選ぶ：" : "覚える技を選ぶ："),
      YU.tutor.m ? h("div", { class: "yo-mlist" }, ...m.moves.map((id, k) => { const r = moveRow(m.sp, id); r.style.cursor = "pointer"; r.onclick = () => { m.moves[k] = YU.tutor.m; sfx("level"); toast(`${MV[YU.tutor.m].n}を覚えた！`); YU.tutor = null; Y.leaveNode(o); save(); rerender(); }; return r; }))
        : h("div", { class: "yo-mlist" }, ...offer.map(id => { const r = moveRow(m.sp, id); r.style.cursor = "pointer"; r.onclick = () => { if (m.moves.length < 4){ m.moves.push(id); sfx("level"); YU.tutor = null; Y.leaveNode(o); save(); rerender(); } else { YU.tutor.m = id; rerender(); } }; return r; }))));
    w.append(h("button", { class: "pxbtn gray", style: "margin-top:8px", onclick: () => { YU.tutor = null; rerender(); } }, "もどる"));
  }
  w.append(h("button", { class: "pxbtn gray sm", style: "margin-top:8px", onclick: () => { YU.tutor = null; Y.leaveNode(o); save(); rerender(); } }, "覚えずに進む"));
}
function restView(w, o){
  const k = o.diff >= 5 ? 60 : 100;
  w.append(h("div", { class: "ycard", style: "text-align:center" }, img("n_rest", 64), h("h2", {}, "たき火で休む")));
  w.append(h("button", { class: "pxbtn green", style: "margin-top:8px", onclick: () => { Y.rest(o, "heal"); sfx("pet"); save(); rerender(); } }, `みんなで休む（HP${k}%回復・倒れた仲間も起きる）`));
  w.append(h("div", { class: "px sm ymut", style: "margin:12px 0 4px" }, "または1体を修行させる（2レベル上がる）"));
  w.append(h("div", { class: "yo-sel" }, ...o.party.filter(m => m.hp > 0).map(m => h("div", { class: "ycard ymon", onclick: () => { const res = Y.rest(o, "train", m.uid); o.phase = "map"; o.node = null; if (res && res.evo.length) evoAnim(res.evo); if (res){ for (const e of res.evo) ym().got[e.to] = 1; for (const L of res.learn){ if (m.moves.length < 4) m.moves.push(L.m); else toast(`${MV[L.m].n}は技のマスで覚えられる`); } } sfx("level"); save(); rerender(); } },
    img(m.sp, 48, "m"), h("div", { class: "n" }, `${nm(m.sp)} Lv${m.lv}→${m.lv + 2}`)))));
}
function shopView(w, o){
  w.append(h("div", { class: "yrow", style: "margin-bottom:8px" }, img("n_shop", 32), h("h2", { style: "margin:0" }, "店"), h("span", { class: "ysp" }), h("span", { class: "ypill" }, img("item", 14), h("span", { class: "ygold" }, String(o.coins)), "コイン")));
  const list = h("div", { class: "yo-plist" });
  o.node.stock.forEach((it, i) => {
    const info = it.k === "con" ? Y.CON[it.id] : IT[it.id];
    list.append(h("div", { style: "display:flex;gap:8px;align-items:center" + (it.sold ? ";opacity:.4" : "") }, img(it.k === "con" ? it.id : "item", 28),
      h("div", { style: "flex:1" }, h("span", { class: "pn" }, info.n), h("div", { class: "xs ymut" }, info.d)),
      h("button", { class: "yb-btn y", disabled: !!it.sold || o.coins < it.price, onclick: () => { if (Y.buy(o, i)){ sfx("buy"); save(); rerender(); } } }, it.sold ? "売り切れ" : `${it.price}`)));
  });
  w.append(list, h("p", { class: "xs ymut" }, "持ち物は「仲間・持ち物」から持たせる。キズぐすり等も地図の画面で使える。"),
    h("button", { class: "pxbtn gray", style: "margin-top:8px", onclick: () => { Y.leaveNode(o); save(); rerender(); } }, "店を出る"));
}
function eventView(w, o){
  const E = Y.EVENTS[o.node.ev];
  w.append(h("div", { class: "ycard" }, h("div", { class: "yrow" }, img("n_event", 32), h("h2", { style: "margin:0" }, E.n)), h("p", { class: "sm", style: "line-height:1.8" }, E.d)));
  if (!o.node.done){
    E.ch.forEach((c, i) => w.append(h("button", { class: "pxbtn " + (i ? "gray" : "blue"), style: "margin-top:8px", onclick: () => { const msg = Y.doEvent(o, i); sfx("chest"); if (o.lastRes && o.lastRes.evo) for (const e of o.lastRes.evo) ym().got[e.to] = 1; save(); rerender(); } }, c.n)));
  } else {
    w.append(h("div", { class: "ycard", style: "margin-top:8px" }, h("p", { class: "sm ygold", style: "margin:0" }, o.node.msg || "")));
    if (o.pendingRecruit){
      const m = o.pendingRecruit;
      w.append(h("div", { class: "ycard", style: "margin-top:8px;text-align:center" }, img(m.sp, 72), h("div", { class: "px" }, `${nm(m.sp)} Lv${m.lv}`), tchip(SP[m.sp].t)),
        h("div", { class: "yg2", style: "margin-top:8px" }, h("button", { class: "pxbtn gold", onclick: () => { if (o.party.length >= 6) return pickRelease(o, m), (o.pendingRecruit = null); Y.recruit(o, m); ym().got[m.sp] = 1; o.pendingRecruit = null; Y.leaveNode(o); save(); rerender(); } }, "仲間にする"), h("button", { class: "pxbtn gray", onclick: () => { o.pendingRecruit = null; Y.leaveNode(o); save(); rerender(); } }, "見送る")));
    } else w.append(h("button", { class: "pxbtn gold", style: "margin-top:8px", onclick: () => { Y.leaveNode(o); save(); rerender(); } }, "先へ進む"));
  }
}

/* ---------- 終わり ---------- */
function overView(w, o){
  const M = ym();
  if (!o.recorded){
    o.recorded = true;
    const reached = o.result === "clear" ? 4 : o.floor;
    M.best = Math.max(M.best, reached);
    if (o.result === "clear"){
      M.clears[o.diff] = (M.clears[o.diff] || 0) + 1;
      if (o.diff >= M.diffMax) M.diffMax = Math.min(8, o.diff + 1);
      if (!M.unlocked.includes("koishi")) M.unlocked.push("koishi");
    }
    save();
  }
  const clear = o.result === "clear";
  w.append(h("div", { class: "ycard yo-title" }, h("div", { class: "yo-stars" }), h("h1", { class: "logo", style: "font-size:1.6rem" }, clear ? "塔を登りきった！" : o.result === "quit" ? "ランを終えた" : "力尽きた…"),
    h("div", { class: "tag" }, clear ? `難しさ${o.diff}をクリア。次は難しさ${Math.min(8, o.diff + 1)}に挑める` : `${o.floor + 1}層まで登った`),
    h("div", { class: "yo-stats" },
      h("div", {}, h("div", { class: "v" }, String(o.stats.battles)), h("div", { class: "k" }, "バトル")),
      h("div", {}, h("div", { class: "v" }, String(o.stats.yomi)), h("div", { class: "k" }, "読み勝ち")),
      h("div", {}, h("div", { class: "v" }, String(o.stats.reveals)), h("div", { class: "k" }, "見抜いた")),
      h("div", {}, h("div", { class: "v" }, String(o.stats.turns)), h("div", { class: "k" }, "ターン"))),
    h("div", { class: "yg3", style: "margin-top:10px" }, ...o.party.map(m => h("div", { class: "ymon" }, img(m.sp, 48), h("div", { class: "n" }, `${nm(m.sp)} Lv${m.lv}`))))));
  w.append(h("button", { class: "pxbtn gold", style: "margin-top:10px", onclick: () => { M.run = null; YU.startPick = true; save(); rerender(); } }, "もう一度挑む"));
  w.append(h("button", { class: "pxbtn gray", style: "margin-top:8px", onclick: () => { M.run = null; save(); rerender(); } }, "タイトルへ"));
}

/* ---------- 遊び方・図鑑 ---------- */
function typeRing(){
  const T = Y.TY, cx = 110, cy = 110, r = 78;
  const pos = i => [cx + r * Math.sin(i / 6 * Math.PI * 2), cy - r * Math.cos(i / 6 * Math.PI * 2)];
  let s = `<svg class="yo-ring" viewBox="0 0 220 220"><defs><marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#ffd447"/></marker></defs>`;
  for (let i = 0; i < 6; i++){ for (const st of [1, 2]){ const [x1, y1] = pos(i), [x2, y2] = pos((i + st) % 6); const k = .26; s += `<line x1="${x1 + (x2 - x1) * k}" y1="${y1 + (y2 - y1) * k}" x2="${x2 - (x2 - x1) * k}" y2="${y2 - (y2 - y1) * k}" stroke="${st === 1 ? "#ffd447" : "#ffd44788"}" stroke-width="${st === 1 ? 2.5 : 1.5}" marker-end="url(#ar)"/>`; } }
  T.forEach((t, i) => { const [x, y] = pos(i); s += `<circle cx="${x}" cy="${y}" r="19" fill="${Y.TC[t]}"/><text x="${x}" y="${y + 6}" text-anchor="middle" font-family="DotGothic16" font-size="17" fill="#1b1430">${Y.TN[t]}</text>`; });
  s += `<text x="110" y="115" text-anchor="middle" font-family="DotGothic16" font-size="11" fill="#a99dcc">矢印の先に2倍</text></svg>`;
  const d = document.createElement("div"); d.innerHTML = s; return d.firstChild;
}
function typeRingCard(){
  return h("div", { class: "ycard", style: "margin-top:10px" }, h("h3", {}, "相性の輪"), typeRing(),
    h("p", { class: "sm ymut", style: "margin:0;line-height:1.7" }, "時計回りに2つ先まで2倍。真向かいは等倍。それ以外（反時計回りの2つと、同じタイプ）は半分。自分と同じタイプの技は威力×1.25。"));
}
function rulesFold(){
  const M = ym();
  return fold("📖 遊び方",
    h("div", { class: "yo yo-rules" },
      h("p", {}, "敵は毎ターン、行動を ", h("b", {}, "A（攻め）と B（対応）の2つ"), " 予告して、", h("b", {}, "どちらか1つだけ"), " やる。どちらになるかは ", h("b", {}, "性格のルール"), " で決まる。性格がわかっているか、候補の答えがそろっていれば「確定」と出る。"),
      h("p", {}, "最初は性格の候補が2〜3個。候補の答えが割れたターンだけ「？」になる。敵の行動を見れば候補は絞れる。HPや交代で状態を変えれば、", h("b", {}, "敵に選ばせたい方を選ばせる"), " こともできる。"),
      h("p", {}, "技を選ぶと「Aなら／Bなら」の結果が出る。ダメージは固定で、命中や急所の運はない（運は「気まぐれ」な敵だけ）。"),
      h("p", {}, h("b", {}, "読み勝ち"), "（交代先が半分で受ける・交代先に2倍を当てる・痛い一撃をまもる・攻撃されないターンに積む）でヨミゲージが溜まる。ゲージは ", h("b", {}, "看破（1）"), "でこのターンの手を見るか、", h("b", {}, "必殺（3）"), "で大技を撃つ。最後の1体を読み勝ちか必殺で倒すと、仲間になりたがる。"),
      h("p", {}, "4層の塔を分かれ道で登る。HPは持ち越し。戦う前に相手を見て、仲間から3体を選ぶ。層の主は「掟」でルールを変えてくる。"),
      h("p", {}, "券：野良戦3・強敵5・層の主7。ほかのマスは無料。")),
    typeRing(),
    h("div", { class: "px sm", style: "margin:8px 0 4px;color:#fff" }, "性格"),
    h("div", { class: "yo yo-plist" }, ...PERS_ALL.map(p => h("div", {}, h("span", { class: "pn" }, PE[p].n), M.pers[p] ? h("span", { class: "ybadge g" }, `見抜いた ${M.pers[p]}`) : null, h("div", { class: "xs ymut" }, PE[p].d)))));
}
function dexFold(){
  const M = ym();
  const list = Object.values(SP).filter(s => !s.boss);
  const g = h("div", { class: "yg3 yo", style: "grid-template-columns:repeat(5,1fr)" });
  for (const s of list){
    const got = M.got[s.id], seen = M.dex[s.id];
    const im = img(s.id, 44); if (!got && !seen) im.style.filter = "brightness(0) opacity(.4)"; else if (!got) im.style.opacity = ".55";
    g.append(h("div", { class: "ymon", onclick: () => (got || seen) && overlay(s.n, [h("div", { class: "yrow" }, img(s.id, 72), h("div", {}, tchip(s.t), h("p", { class: "xs ymut" }, s.role), h("div", { class: "xs" }, "なりやすい性格：" + s.pe.map(p => PE[p].n).join("・"))))]) }, im, h("div", { class: "n", style: "font-size:.6rem" }, got || seen ? s.n : "？？？")));
  }
  return fold(`📕 図鑑（仲間にした ${Object.keys(M.got).length}・出会った ${Object.keys(M.dex).length}／${list.length}）`, g);
}

/* ---------- はじめての説明 ---------- */
const TIPS = {
  map: ["地図は下から上へ登る。光っているマスに進める。", "バトルのマスは券を使う（野良3・強敵5・層の主7）。休憩や技のマスは無料。", "いちばん上の層の主は「掟」を持っている。仲間をそろえて挑もう。"],
  battle: ["敵は毎ターン <b>A と B の2つ</b> を予告する。実際にやるのはどちらか1つ。", "どちらをやるかは <b>性格</b> のルールで決まる。わかっている（候補の答えがそろう）ときは <b>確定</b> と光る。", "技や交代を選ぶと「<b>Aなら／Bなら</b>」の結果が出る。読みが当たる手を選ぼう。", "交代先が半分で受けたり、交代先に2倍を当てると <b>読み勝ち</b>。ゲージで看破か必殺が使える。"],
};
function maybeTip(k){
  const M = ym(); if (M.tut[k]) return;
  M.tut[k] = 1; save();
  const list = TIPS[k]; let i = 0;
  const el = h("div", { class: "yo-tip" });
  const draw = () => { el.innerHTML = `<b>${i + 1}/${list.length}</b>　${list[i]}`; el.append(h("div", { class: "yrow" }, h("span", { class: "ysp" }), h("button", { onclick: () => { i++; if (i >= list.length) el.remove(); else draw(); } }, i + 1 >= list.length ? "わかった" : "つぎへ"))); };
  draw(); setTimeout(() => document.body.append(el), 300);
}
})();
