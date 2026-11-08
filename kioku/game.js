/* Kioku — 育成ゲーム（XP・進化・コイン・宝箱・ショップ・実績） */
"use strict";
(function(){
const G = {};
window.Game = G;
const DAYMS = 86400000;

/* ============================================================
   定数
   ============================================================ */
const STAGES = ["たまご", "ぷにまる", "ちびドラ", "ドラゴン", "でんせつドラゴン"];
const STAGE_LV = [1, 2, 7, 15, 30];
const stageFor = lv => lv >= 30 ? 4 : lv >= 15 ? 3 : lv >= 7 ? 2 : lv >= 2 ? 1 : 0;
const need = lv => 70 + 30 * lv;
G.STAGES = STAGES;

const ITEMS = {
  sprout:     { slot: "hat",  price: 90 },
  beret:      { slot: "hat",  price: 120 },
  ribbon:     { slot: "hat",  price: 120 },
  headband:   { slot: "hat",  price: 180, desc: "試験前の必需品" },
  nurse:      { slot: "hat",  price: 220 },
  mirror:     { slot: "hat",  price: 280, desc: "お医者さんのおでこのアレ" },
  wizard:     { slot: "hat",  price: 450 },
  crown:      { slot: "hat",  price: 1500, desc: "王者の証" },
  halo:       { slot: "hat",  price: 0, chest: true, desc: "伝説の宝箱からだけ出る" },
  glasses:    { slot: "face", price: 150 },
  shades:     { slot: "face", price: 240 },
  bowtie:     { slot: "neck", price: 140 },
  scarf:      { slot: "neck", price: 160 },
  bell:       { slot: "neck", price: 180 },
  stetho:     { slot: "neck", price: 320, desc: "未来の自分へ" },
  bg_night:   { slot: "bg", bg: "night",   price: 250 },
  bg_beach:   { slot: "bg", bg: "beach",   price: 300 },
  bg_sakura:  { slot: "bg", bg: "sakura",  price: 350 },
  bg_library: { slot: "bg", bg: "library", price: 400 },
  bg_clinic:  { slot: "bg", bg: "clinic",  price: 400 },
  bg_space:   { slot: "bg", bg: "space",   price: 0, chest: true, desc: "伝説の宝箱からだけ出る" },
  col_lavender: { slot: "color", color: "lavender", price: 400 },
  col_choco:    { slot: "color", color: "choco",    price: 400 },
  col_midnight: { slot: "color", color: "midnight", price: 600 },
  col_gold:     { slot: "color", color: "gold",     price: 0, chest: true, desc: "伝説の宝箱か、でんせつドラゴンへの進化で解放" },
  cookie:     { slot: "food", name: "クッキー", price: 25, full: 25, joy: 10 },
  cake:       { slot: "food", name: "ケーキ", price: 70, full: 60, joy: 30 },
  charm:      { slot: "item", name: "ストリークのお守り", price: 200, desc: "学習できない日があっても連続記録を1日分守る（自動で使われます）" }
};
const START_COLORS = ["pink", "soda", "mint", "lemon"];
function itemName(id){ const it = ITEMS[id]; if (!it) return id; if (it.name) return it.name; if (it.slot === "bg") return PX.BG[it.bg].name; if (it.slot === "color") return PX.COLORS[it.color].name + "カラー"; return PX.ACC[id] ? PX.ACC[id].name : id; }
const RARITY = { common: { name: "ノーマル", col: "#b07440" }, rare: { name: "レア", col: "#5f8fd0" }, epic: { name: "エピック", col: "#a16ee0" }, legendary: { name: "レジェンド", col: "#e0a21c" } };

const ACH = [
  ["first", "はじめの一歩", "はじめてカードを解いた", g => g.stats.cards >= 1, 20],
  ["c100", "100枚突破", "累計100枚解いた", g => g.stats.cards >= 100, 50],
  ["c500", "500枚突破", "累計500枚解いた", g => g.stats.cards >= 500, 100],
  ["c1000", "1000枚突破", "累計1000枚解いた", g => g.stats.cards >= 1000, 200],
  ["c5000", "5000枚突破", "累計5000枚解いた", g => g.stats.cards >= 5000, 500],
  ["c10000", "1万枚の壁", "累計10000枚解いた", g => g.stats.cards >= 10000, 1000],
  ["d100", "今日は本気", "1日で100枚解いた", g => g.daily.cards >= 100, 80],
  ["d300", "鬼の300枚", "1日で300枚解いた", g => g.daily.cards >= 300, 200],
  ["d500", "限界突破", "1日で500枚解いた", g => g.daily.cards >= 500, 400],
  ["s3", "三日坊主じゃない", "3日連続で学習した", g => g.streak.n >= 3, 40],
  ["s7", "1週間連続", "7日連続で学習した", g => g.streak.n >= 7, 100],
  ["s14", "2週間連続", "14日連続で学習した", g => g.streak.n >= 14, 200],
  ["s30", "習慣の達人", "30日連続で学習した", g => g.streak.n >= 30, 500],
  ["s100", "100日の継続", "100日連続で学習した", g => g.streak.n >= 100, 1500],
  ["k50", "50コンボ", "1回の学習で50枚連続", () => G.sess.combo >= 50, 60],
  ["k100", "100コンボ", "1回の学習で100枚連続", () => G.sess.combo >= 100, 150],
  ["k300", "ゾーン突入", "1回の学習で300枚連続", () => G.sess.combo >= 300, 400],
  ["hatch", "たんじょう", "たまごがかえった", g => g.evo >= 1, 30],
  ["evo2", "すくすく", "ちびドラに進化した", g => g.evo >= 2, 80],
  ["evo3", "りっぱなドラゴン", "ドラゴンに進化した", g => g.evo >= 3, 200],
  ["evo4", "でんせつ", "でんせつドラゴンに進化した", g => g.evo >= 4, 800],
  ["goal7", "目標達成×7", "1日の目標を7回達成した", g => g.stats.goals >= 7, 150],
  ["goal30", "目標達成×30", "1日の目標を30回達成した", g => g.stats.goals >= 30, 500],
  ["night", "夜ふかし", "深夜0〜4時に学習した", () => new Date().getHours() < 4, 30],
  ["early", "早起きは三文の徳", "朝5〜7時に学習した", () => { const h = new Date().getHours(); return h >= 5 && h < 7; }, 30],
  ["rich", "おかねもち", "コインを累計1000枚かせいだ", g => g.stats.coinsEarned >= 1000, 100],
  ["fashion", "おしゃれさん", "アクセサリーを5個集めた", g => Object.keys(g.owned).filter(k => ["hat", "face", "neck"].includes(ITEMS[k]?.slot)).length >= 5, 100],
  ["chest10", "トレジャーハンター", "宝箱を10個あけた", g => g.stats.chests >= 10, 100],
  ["pet50", "なかよし", "ペットを50回なでた", g => g.stats.pets >= 50, 50]
];

/* ============================================================
   状態
   ============================================================ */
function ensure(){
  if (!S.game) S.game = {
    v: 1, on: true, sound: true, started: false, color: "pink", name: "", xp: 0, level: 1, coins: 0,
    full: 70, fedAt: Date.now(), joy: 60, joyAt: Date.now(),
    owned: {}, equip: { hat: null, face: null, neck: null, bg: "grass" }, inv: { cookie: 2 },
    ach: {}, stats: { cards: 0, coinsEarned: 0, bestCombo: 0, chests: 0, goals: 0, pets: 0, maxDay: 0 },
    daily: { day: -1, cards: 0, goalDone: false, first: false, pets: 0, xp: 0 }, goal: 50,
    chests: [], streak: { n: 0, last: -1, best: 0 }, evo: 0
  };
  const g = S.game;
  g.inv ||= {}; g.owned ||= {}; g.equip ||= { bg: "grass" }; g.stats ||= {}; g.chests ||= []; g.ach ||= {};
  return g;
}
G.ensure = ensure;
G.sess = { combo: 0, xp: 0, coins: 0, cards: 0, best: 0, chests: 0 };
G.startSession = () => { G.sess = { combo: 0, xp: 0, coins: 0, cards: 0, best: 0, chests: 0 }; G._bar = null; };
G.sessSnap = () => ({ ...G.sess });
G.sessRestore = s => { G.sess = { ...s }; G.updateBar(); };
function rollDaily(){ const g = ensure(), t = today(); if (g.daily.day !== t) g.daily = { day: t, cards: 0, goalDone: false, first: false, pets: 0, xp: 0 }; }
function decay(v, at, perDay){ return clamp(v - (Date.now() - at) / DAYMS * perDay, 0, 100); }
function fullness(){ const g = ensure(); return decay(g.full, g.fedAt, 30); }
function joy(){ const g = ensure(); return decay(g.joy, g.joyAt, 25); }
function addFull(x){ const g = ensure(); g.full = clamp(fullness() + x, 0, 100); g.fedAt = Date.now(); }
function addJoy(x){ const g = ensure(); g.joy = clamp(joy() + x, 0, 100); g.joyAt = Date.now(); }
function streakNow(){ const g = ensure(), st = g.streak, t = today(); if (st.last === t || st.last === t - 1) return st.n; if (st.last >= 0 && t - st.last - 1 <= (g.inv.charm || 0)) return st.n; return 0; }
function streakMult(n = streakNow()){ return n >= 30 ? 1.5 : n >= 14 ? 1.3 : n >= 7 ? 1.2 : n >= 3 ? 1.1 : 1; }
function bumpStreak(){
  const g = ensure(), st = g.streak, t = today(); if (st.last === t) return { used: 0 };
  let used = 0;
  if (st.last === t - 1) st.n++;
  else if (st.last >= 0 && t - st.last - 1 <= (g.inv.charm || 0)){ used = t - st.last - 1; g.inv.charm -= used; st.n++; }
  else st.n = 1;
  st.last = t; st.best = Math.max(st.best || 0, st.n); return { used };
}
function goalTarget(){ const g = ensure(); return g.goal === "due" ? null : (+g.goal || 50); }
function dueLeft(){ try { const idx = buildIndex(); return rootDecks().reduce((a, d) => { const c = deckCounts(d.id, idx); return a + c.n + c.r + c.l; }, 0); } catch(e){ return 1; } }
function goalMet(){ const g = ensure(); return g.goal === "due" ? dueLeft() === 0 && g.daily.cards > 0 : g.daily.cards >= goalTarget(); }
function goalProgress(){ const g = ensure(); rollDaily(); if (g.goal === "due"){ const left = dueLeft(); const done = g.daily.cards; return { done, total: done + left, label: left ? `あと ${left} 枚` : "達成！" }; } const t = goalTarget(); return { done: Math.min(g.daily.cards, t), total: t, label: `${Math.min(g.daily.cards, t)} / ${t} 枚` }; }
function rngFrom(str){ let x = hash32(str) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
function newChest(r, boost, src){ const v = r(); const rarity = v < .01 + boost * .02 ? "legendary" : v < .07 + boost * .08 ? "epic" : v < .3 + boost * .2 ? "rare" : "common"; return { kind: "chest", rarity, src }; }
function addXp(n, ev){
  const g = ensure(); g.xp += n;
  while (g.xp >= need(g.level)){ g.xp -= need(g.level); g.level++; ev.levels.push(g.level); ev.coins += 10 + g.level * 2; }
  const s = stageFor(g.level);
  if (s > g.evo){ ev.evolve = { from: g.evo, to: s }; g.evo = s; if (s === 4) g.owned.col_gold = true; }
}
function checkAch(ev){
  const g = ensure();
  for (const [id, , , test, coins] of ACH){ if (g.ach[id]) continue; let ok = false; try { ok = test(g); } catch(e){} if (ok){ g.ach[id] = Date.now(); ev.ach.push(id); ev.coins += coins; } }
}

/* 回答ごとに呼ばれる（評価ボタンに関係なく同じ報酬＝正直に押せる） */
G.onAnswer = function(info){
  const g = ensure(); if (!g.on || !g.started) return null;
  rollDaily();
  const r = rngFrom(info.cardId + ":" + info.reps + ":" + today());
  const ev = { xp: 0, coins: 0, drops: [], levels: [], evolve: null, ach: [], goal: false, combo: 0, ease: info.ease, mult: 1, streakUp: null };
  if (!g.daily.first){ g.daily.first = true; const s = bumpStreak(); ev.streakUp = { n: g.streak.n, used: s.used }; ev.xp += 30; }
  G.sess.combo++; ev.combo = G.sess.combo; G.sess.best = Math.max(G.sess.best, G.sess.combo); g.stats.bestCombo = Math.max(g.stats.bestCombo || 0, G.sess.combo);
  ev.mult = streakMult();
  ev.cardXp = Math.round((10 + (info.wasNew ? 4 : 0)) * ev.mult);
  ev.xp += ev.cardXp; ev.coins += 1;
  const v = r();
  if (v < .045){ const c = 5 + Math.floor(r() * 11); ev.coins += c; ev.drops.push({ kind: "coins", n: c }); }
  else if (v < .052) ev.drops.push(newChest(r, 0, "drop"));
  if (ev.combo % 25 === 0) ev.drops.push(newChest(r, ev.combo >= 100 ? 2 : ev.combo >= 50 ? 1 : 0, "combo"));
  addFull(1.5); addJoy(.6);
  g.daily.cards++; g.stats.cards++; g.stats.maxDay = Math.max(g.stats.maxDay || 0, g.daily.cards);
  if (!g.daily.goalDone && goalMet()){ g.daily.goalDone = true; g.stats.goals = (g.stats.goals || 0) + 1; ev.goal = true; ev.xp += 100; ev.drops.push(newChest(r, 1, "goal")); }
  addXp(ev.xp, ev);
  checkAch(ev);
  g.coins += ev.coins; g.stats.coinsEarned = (g.stats.coinsEarned || 0) + ev.coins;
  for (const d of ev.drops) if (d.kind === "chest"){ g.chests.push(d.rarity); G.sess.chests++; }
  g.daily.xp += ev.xp; G.sess.xp += ev.xp; G.sess.coins += ev.coins; G.sess.cards++;
  return ev;
};

function openReward(rarity){
  const g = ensure(), R = Math.random;
  const range = { common: [15, 35], rare: [50, 90], epic: [120, 220], legendary: [400, 600] }[rarity] || [15, 35];
  const out = { coins: range[0] + Math.floor(R() * (range[1] - range[0])), items: [] };
  const pool = k => Object.keys(ITEMS).filter(id => { const it = ITEMS[id]; return !g.owned[id] && it.slot !== "food" && it.slot !== "item" && (k === "legend" ? it.chest : !it.chest && it.price <= k); });
  if (rarity === "legendary"){ const p = pool("legend"); if (p.length) out.items.push(p[Math.floor(R() * p.length)]); else out.coins += 300; }
  else if (rarity === "epic" && R() < .6){ const p = pool(450); if (p.length) out.items.push(p[Math.floor(R() * p.length)]); else out.coins += 80; }
  else if (rarity === "rare" && R() < .4) out.food = R() < .3 ? "cake" : "cookie";
  if (rarity !== "common" && R() < .18) out.charm = 1;
  g.coins += out.coins; g.stats.coinsEarned = (g.stats.coinsEarned || 0) + out.coins;
  for (const id of out.items) g.owned[id] = true;
  if (out.food) g.inv[out.food] = (g.inv[out.food] || 0) + 1;
  if (out.charm) g.inv.charm = (g.inv.charm || 0) + 1;
  g.stats.chests = (g.stats.chests || 0) + 1;
  return out;
}

/* ============================================================
   効果音（WebAudio で生成するチップチューン）
   ============================================================ */
const SFX = {
  ctx: null,
  ac(){ if (!ensure().sound) return null; if (!this.ctx){ try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ return null; } } if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {}); return this.ctx; },
  tone(f, d, o = {}){
    const c = this.ac(); if (!c) return;
    const t0 = c.currentTime + (o.delay || 0), osc = c.createOscillator(), gn = c.createGain();
    osc.type = o.type || "square"; osc.frequency.setValueAtTime(f, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, f * o.slide), t0 + d);
    const v = (o.vol || .05);
    gn.gain.setValueAtTime(.0001, t0); gn.gain.exponentialRampToValueAtTime(v, t0 + .008); gn.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    osc.connect(gn).connect(c.destination); osc.start(t0); osc.stop(t0 + d + .03);
  },
  answer(combo){ const step = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24][Math.min(10, Math.floor((combo - 1) / 3))]; const f = 523 * Math.pow(2, step / 12); this.tone(f, .07, { vol: .035 }); this.tone(f * 1.5, .09, { delay: .055, vol: .03 }); },
  again(){ this.tone(392, .09, { type: "triangle", vol: .06 }); this.tone(330, .14, { type: "triangle", vol: .06, delay: .08 }); },
  coin(){ this.tone(988, .06, { vol: .04 }); this.tone(1319, .2, { delay: .06, vol: .04 }); },
  chest(){ [659, 784, 988].forEach((f, i) => this.tone(f, .1, { delay: i * .07, vol: .04 })); },
  combo(){ [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, .08, { delay: i * .05, vol: .035 })); },
  level(){ [523, 659, 784, 1047].forEach((f, i) => this.tone(f, .13, { delay: i * .085, vol: .05 })); this.tone(1568, .4, { delay: .34, type: "triangle", vol: .07 }); this.tone(784, .4, { delay: .34, vol: .03 }); },
  open(rar){ const n = rar === "legendary" ? 7 : rar === "epic" ? 6 : 4; for (let i = 0; i < n; i++) this.tone(523 * Math.pow(2, [0, 4, 7, 12, 16, 19, 24][i] / 12), .12, { delay: i * .07, vol: .045 }); this.tone(2093, .5, { delay: n * .07, type: "triangle", vol: .05 }); },
  shake(i){ this.tone(180 + i * 40, .05, { type: "square", vol: .03 }); },
  pet(){ this.tone(880, .06, { type: "triangle", vol: .06 }); this.tone(1175, .1, { delay: .06, type: "triangle", vol: .06 }); },
  eat(){ for (let i = 0; i < 3; i++) this.tone(300 + i * 60, .05, { delay: i * .12, type: "square", vol: .03 }); },
  evolve(){ [392, 523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, .16, { delay: i * .09, vol: .045 })); this.tone(2093, .8, { delay: .7, type: "triangle", vol: .06 }); },
  buy(){ this.tone(1047, .06, { vol: .04 }); this.tone(1568, .14, { delay: .05, vol: .04 }); }
};
G.SFX = SFX;

/* ============================================================
   ペットの表示
   ============================================================ */
class PetView {
  constructor(o){
    this.o = o; this.w = o.w; this.h = o.h; this.scene = !!o.scene;
    const cv = this.cv = document.createElement("canvas"); cv.width = this.w; cv.height = this.h; cv.className = "gcanvas " + (o.cls || "");
    cv.style.width = this.w * o.scale + "px"; cv.style.height = this.h * o.scale + "px";
    this.ctx = cv.getContext("2d");
    this.sp = document.createElement("canvas"); this.sp.width = 40; this.sp.height = 40; this.spx = this.sp.getContext("2d");
    this.ground = o.ground ?? (this.scene ? 51 : this.h - 3);
    this.petX = Math.round((this.w - 40) / 2) + (o.dx || 0); this.petY = this.ground - 38;
    this.parts = []; this.action = null; this.t0 = performance.now(); this.born = this.t0; this.last = 0; this.blink = 3 + Math.random() * 2.5;
    this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
    if (o.onClick) cv.addEventListener("click", o.onClick);
  }
  now(){ return (performance.now() - this.t0) / 1000; }
  act(name, dur){ this.action = { name, t0: this.now(), dur }; }
  loop(ts){
    if (!this.cv.isConnected){ if (this.seen || performance.now() - this.born > 10000){ this.dead = true; return; } } else this.seen = true;
    if (ts - this.last >= 32){ const dt = this.last ? Math.min(.1, (ts - this.last) / 1000) : .03; this.last = ts; try { this.draw(dt); } catch(e){ console.warn(e); } }
    requestAnimationFrame(this.loop);
  }
  stage(){ return this.o.stage ?? ensure().evo; }
  pose(t, stage){
    const p = { bob: Math.floor(t * 1.6) % 2, sq: 0, jump: 0, eyes: "open", mouth: "cat", look: 0, flap: Math.floor(t * 1.2) % 2 ? -1 : 0, wob: 0 };
    p.sq = p.bob ? .5 : 0;
    const hr = new Date().getHours();
    this.sleeping = false;
    if (!this.o.still){
      if (fullness() < 15){ p.eyes = "half"; p.mouth = "wavy"; p.bob = Math.floor(t * .8) % 2; }
      else if (hr >= 1 && hr < 5 && !this.action){ p.eyes = "closed"; p.mouth = "flat"; p.bob = Math.floor(t * .7) % 2; this.sleeping = stage > 0; }
      if (!this.action && t > (this.nextIdle ?? (this.nextIdle = 2.5 + Math.random() * 4))){
        const r = Math.random(), j = joy();
        const name = r < .35 ? "look" : r < .35 + j / 200 ? "hop" : "wiggle";
        this.act(name, name === "look" ? 1.6 : .7); this.nextIdle = t + 4 + Math.random() * 6;
      }
    }
    if (p.eyes === "open" && (t % this.blink) < .12) p.eyes = "blink";
    const a = this.action;
    if (a){
      const e = t - a.t0, k = e / a.dur;
      if (k >= 1) this.action = null;
      else switch (a.name){
        case "hop": p.jump = Math.round(Math.sin(Math.PI * k) * 3); p.sq = k < .12 || k > .88 ? .8 : -.3; break;
        case "happy": p.jump = Math.round(Math.sin(Math.PI * k) * 6); p.sq = k < .12 || k > .88 ? 1 : -.5; p.eyes = "happy"; p.mouth = "laugh"; break;
        case "big": { const kk = (k * 2) % 1; p.jump = Math.round(Math.sin(Math.PI * kk) * 8); p.sq = kk < .1 || kk > .9 ? 1 : -.6; p.eyes = "happy"; p.mouth = "laugh"; break; }
        case "again": p.eyes = "x"; p.mouth = "o"; p.bob = Math.floor(e * 14) % 2; p.wob = Math.round(Math.sin(e * 30)); break;
        case "eat": p.eyes = "happy"; p.mouth = Math.floor(e * 7) % 2 ? "open" : "flat"; p.bob = Math.floor(e * 7) % 2; break;
        case "pet": p.eyes = "happy"; p.mouth = "open"; p.sq = Math.floor(e * 6) % 2 ? .8 : 0; break;
        case "look": p.look = k < .5 ? -1 : 1; if (p.eyes === "blink") p.eyes = "open"; break;
        case "wiggle": p.sq = Math.floor(e * 10) % 2 ? .6 : 0; p.wob = Math.round(Math.sin(e * 25)); break;
        case "level": p.jump = Math.round(Math.abs(Math.sin(Math.PI * k * 3)) * 6); p.eyes = "happy"; p.mouth = "laugh"; break;
      }
    }
    if (stage === 0){
      if (a && ["happy", "big", "pet", "again", "level", "wiggle"].includes(a.name)) p.wob = Math.round(Math.sin((t - a.t0) * 30));
      else if (Math.floor(t) % 7 === 0) p.wob = Math.round(Math.sin(t * 18));
      p.jump = Math.min(p.jump, 3);
    }
    return p;
  }
  draw(dt){
    const g = ensure(), t = this.now(), x = this.ctx;
    x.clearRect(0, 0, this.w, this.h);
    const ov = this.o.override ? this.o.override(t) : null;
    const stage = ov && ov.stage !== undefined ? ov.stage : this.stage();
    if (this.scene){
      const bgKey = this.o.bg || g.equip.bg || "grass"; const bg = PX.BG[bgKey] || PX.BG.grass;
      const hr = new Date().getHours(); const tod = bgKey === "grass" ? (hr >= 19 || hr < 5 ? "night" : hr >= 17 ? "dusk" : "day") : "day";
      bg.draw(x, this.w, this.h, t, tod);
    }
    const pose = this.pose(t, stage);
    const sw = (stage === 0 ? 14 : stage >= 3 ? 20 : 18) - Math.min(6, pose.jump);
    const cx = this.petX + 20;
    x.fillStyle = "rgba(20,30,40,.2)"; x.fillRect(Math.round(cx - sw / 2), this.ground, sw, 1); x.fillRect(Math.round(cx - sw / 2 + 2), this.ground + 1, sw - 4, 1);
    if (ov && ov.silhouette) pose.silhouette = ov.silhouette;
    if (stage === 4 && !pose.silhouette) pose.glow = Math.floor(t * 3) % 2 ? [255, 236, 140] : [255, 206, 60];
    const color = this.o.color || g.color;
    const equip = this.o.equip !== undefined ? this.o.equip : g.equip;
    const img = PX.sprite(stage, color, pose, stage > 0 ? equip : null, stage === 0 ? (this.o.prog ?? Math.min(1, g.xp / need(1))) : 0, t);
    this.spx.putImageData(new ImageData(img, 40, 40), 0, 0);
    x.drawImage(this.sp, this.petX, this.petY);
    if (stage === 4 && Math.random() < dt * 2.5) PX.spawn(this, "spark", 1, { x: this.petX + 6 + Math.random() * 28, y: this.petY + 6 + Math.random() * 26, speed: 2, g: -3, life: .8 });
    if (this.sleeping && Math.random() < dt * .6) PX.spawn(this, "z", 1, { x: this.petX + 30, y: this.petY + 14, speed: 6, spread: .5, g: -3, life: 2.2, jitter: 2 });
    PX.stepParts(this, x, dt);
    if (ov && ov.flash){ x.fillStyle = `rgba(255,255,255,${ov.flash})`; x.fillRect(0, 0, this.w, this.h); }
  }
  react(kind){
    if (kind === "happy"){ this.act("happy", .65); PX.spawn(this, "spark", 3, { speed: 22 }); }
    else if (kind === "again"){ this.act("again", .7); PX.spawn(this, "drop", 1, { x: this.petX + 30, y: this.petY + 12, speed: 8, spread: .6, g: 30 }); }
    else if (kind === "big"){ this.act("big", 1.2); PX.spawn(this, "spark2", 12, { ring: true, speed: 30, g: 0, life: .7 }); PX.spawn(this, "heart", 3, { speed: 16 }); }
    else if (kind === "coins"){ PX.spawn(this, "coin", 7, { speed: 34, spread: 1.6 }); }
    else if (kind === "level"){ this.act("level", 1.6); PX.spawn(this, "spark2", 16, { ring: true, speed: 36, g: 0, life: .9 }); PX.spawn(this, "spark", 10, { speed: 30, spread: 3 }); }
    else if (kind === "pet"){ this.act("pet", .9); PX.spawn(this, "heart", 3, { speed: 14, y: this.petY + 10 }); }
    else if (kind === "eat"){ this.act("eat", 1.3); PX.spawn(this, "heart", 2, { speed: 12, y: this.petY + 10 }); }
  }
}
G.PetView = PetView;
function staticCanvas(stage, color, equip, bgKey, scale = 2, w = 48, h = 44){
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; cv.className = "gcanvas"; cv.style.width = w * scale + "px"; cv.style.height = h * scale + "px";
  const x = cv.getContext("2d");
  if (bgKey){ const tmp = document.createElement("canvas"); tmp.width = 96; tmp.height = 64; const tx = tmp.getContext("2d"); (PX.BG[bgKey] || PX.BG.grass).draw(tx, 96, 64, 2, "day"); x.drawImage(tmp, (96 - w) / 2 | 0, 64 - h - 6, w, h, 0, 0, w, h); }
  const img = PX.sprite(stage, color, { bob: 0, jump: 0, sq: 0, eyes: "open", mouth: "cat", look: 0, flap: 0, wob: 0 }, stage > 0 ? equip : null, 0, 0);
  const sp = document.createElement("canvas"); sp.width = 40; sp.height = 40; sp.getContext("2d").putImageData(new ImageData(img, 40, 40), 0, 0);
  x.drawImage(sp, (w - 40) / 2 | 0, h - 40 - (bgKey ? 0 : 1));
  return cv;
}

/* ============================================================
   スタイル
   ============================================================ */
const CSS = `
.gf{font-family:"DotGothic16","BIZ UDPGothic",monospace}
.gcanvas{image-rendering:pixelated;image-rendering:crisp-edges;display:block}
.gpanel{display:flex;gap:18px;align-items:stretch;flex-wrap:wrap;margin-bottom:14px}
.gscene{border-radius:12px;cursor:pointer;max-width:100%;height:auto!important;aspect-ratio:3/2}
.gside{flex:1;min-width:250px;display:flex;flex-direction:column;gap:9px}
.gtitle{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.gname{font-family:"DotGothic16",sans-serif;font-size:1.4rem;line-height:1.2;cursor:pointer}
.glv{font-family:"DotGothic16",sans-serif;background:var(--ink);color:var(--surface);padding:1px 8px;border-radius:4px;font-size:.92rem}
.gstage{color:var(--muted);font-size:.82rem}
.gmeter{position:relative;height:14px;background:var(--surface2);border:2px solid var(--ink);border-radius:3px;overflow:hidden}
.gmeter>i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(180deg,#8fd0ff 0 45%,#3a8fe8 45%);transition:width .6s cubic-bezier(.2,.8,.2,1)}
.gmeter.full>i{background:linear-gradient(180deg,#ffd27a 0 45%,#f39b2f 45%)}
.gmeter.joy>i{background:linear-gradient(180deg,#ffb3c8 0 45%,#ff6f96 45%)}
.gmeter::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 9px,rgba(0,0,0,.13) 9px 10px)}
.gmeter.sm{height:11px}
.grow{display:flex;align-items:center;gap:8px;font-size:.82rem}
.grow .lab{min-width:78px;color:var(--ink2);display:flex;align-items:center;gap:5px}
.grow .gmeter{flex:1}
.grow .num{font-family:"DotGothic16",sans-serif;min-width:64px;text-align:right;color:var(--ink2)}
.gchips{display:flex;gap:6px;flex-wrap:wrap}
.gchip{display:inline-flex;align-items:center;gap:6px;background:var(--surface2);border:1px solid var(--line);border-radius:999px;padding:3px 11px 3px 8px;font-family:"DotGothic16",sans-serif;font-size:.95rem}
.gchip small{color:var(--muted);font-family:var(--f-body);font-size:.72rem}
.picon{image-rendering:pixelated;display:inline-block;vertical-align:middle}
.gbtns{display:flex;gap:7px;flex-wrap:wrap;margin-top:auto;padding-top:4px}
.gbtn{font-family:"DotGothic16",sans-serif;font-size:.95rem;border:2px solid var(--ink);background:var(--surface);color:var(--ink);border-radius:7px;padding:4px 12px;cursor:pointer;box-shadow:0 3px 0 var(--ink);display:inline-flex;align-items:center;gap:6px}
.gbtn:active{transform:translateY(2px);box-shadow:0 1px 0 var(--ink)}
.gbtn:disabled{opacity:.4;cursor:default}
.gbtn.hot{background:#ffd447;color:#3b2a00;animation:gpulse 1.1s ease-in-out infinite}
.gbtn.pri{background:var(--accent);color:var(--accent-ink);border-color:var(--ink)}
@keyframes gpulse{50%{transform:translateY(-2px)}}
.ggoal{display:flex;align-items:center;gap:10px;font-size:.85rem}
.ggoal svg{width:42px;height:42px;flex:none}
.ggoal b{font-family:"DotGothic16",sans-serif;font-size:1rem}
.gstart{flex-direction:column;align-items:center;text-align:center}
.geggs{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
.gegg{cursor:pointer;border:2px solid var(--line);border-radius:12px;padding:8px 12px 6px;background:var(--surface2);display:flex;flex-direction:column;align-items:center;gap:4px;font-family:"DotGothic16",sans-serif;transition:transform .1s}
.gegg:hover{border-color:var(--accent);transform:translateY(-3px)}
.gsbar{position:relative;display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:2px 14px 2px 4px;margin-bottom:10px;box-shadow:var(--shadow)}
.gsbar .mid{flex:1;min-width:0}
.gsbar .top{display:flex;gap:8px;align-items:baseline;font-size:.8rem;margin-bottom:3px;white-space:nowrap;overflow:hidden}
.gsbar .top b{font-family:"DotGothic16",sans-serif;font-size:1rem}
.gsbar .goal{margin-left:auto;color:var(--muted)}
.gcombo{font-family:"DotGothic16",sans-serif;text-align:center;line-height:1;min-width:54px}
.gcombo b{display:block;font-size:1.55rem;font-weight:400}
.gcombo small{font-size:.6rem;letter-spacing:.14em;color:var(--muted)}
.gcombo.t1 b{color:#f39b2f}.gcombo.t2 b{color:#e8483f}
.gcombo.t3 b{background:linear-gradient(90deg,#ff5a7a,#ffb02e,#4cc35a,#3a8fe8,#a77be0);-webkit-background-clip:text;background-clip:text;color:transparent}
.gcombo.bump b{animation:gbump .22s}
@keyframes gbump{40%{transform:scale(1.4)}}
.gcoin{font-family:"DotGothic16",sans-serif;display:flex;align-items:center;gap:5px;font-size:1.1rem}
.gfloat{position:absolute;font-family:"DotGothic16",sans-serif;font-size:1.05rem;color:#3a8fe8;-webkit-text-stroke:4px var(--surface);paint-order:stroke fill;pointer-events:none;white-space:nowrap;animation:gfloat 1.1s cubic-bezier(.2,.8,.3,1) forwards;z-index:3}
.gfloat.coin{color:#d9961a}.gfloat.big{font-size:1.35rem;color:#e8483f}.gfloat.mult{color:#a77be0;font-size:.85rem}
@keyframes gfloat{0%{opacity:0;transform:translate(-50%,6px) scale(.7)}15%{opacity:1;transform:translate(-50%,-4px) scale(1.15)}100%{opacity:0;transform:translate(-50%,-40px) scale(1)}}
.gtoasts{position:fixed;top:64px;right:16px;display:flex;flex-direction:column;gap:8px;align-items:flex-end;z-index:150;pointer-events:none;max-width:min(380px,94vw)}
@media(max-width:640px){.gtoasts{right:auto;left:50%;transform:translateX(-50%);align-items:center;top:6px}}
.gtoast{display:flex;align-items:center;gap:10px;background:#1f1d2b;color:#fff;border:2px solid #fff;box-shadow:0 0 0 2px #1f1d2b,0 8px 24px rgba(0,0,0,.3);border-radius:8px;padding:7px 16px 7px 10px;font-family:"DotGothic16",sans-serif;font-size:1rem;animation:gtin .4s cubic-bezier(.2,1.5,.4,1),gtout .35s 2.4s forwards}
.gtoast small{display:block;font-family:var(--f-body);font-size:.74rem;opacity:.75;margin-top:1px}
.gtoast.rare{border-color:#9ab6d8}.gtoast.epic{border-color:#c49cff}.gtoast.legendary{border-color:#ffd447;background:#3a2a00}.gtoast.goal{border-color:#7fe07f}
@keyframes gtin{from{transform:translateY(-24px) scale(.8);opacity:0}}
@keyframes gtout{to{transform:translateY(-14px);opacity:0}}
.glevel{position:fixed;left:50%;top:40%;transform:translate(-50%,-50%);font-family:"DotGothic16",sans-serif;font-size:clamp(2.4rem,8vw,4.4rem);color:#ffd447;-webkit-text-stroke:8px #2b1d2a;paint-order:stroke fill;text-shadow:0 6px 0 #2b1d2a;z-index:160;pointer-events:none;animation:glv 1.7s cubic-bezier(.2,1.3,.4,1) forwards;text-align:center;white-space:nowrap;line-height:1.1}
.glevel small{display:block;font-size:.42em;color:#fff;-webkit-text-stroke:5px #2b1d2a}
@keyframes glv{0%{transform:translate(-50%,-50%) scale(.3);opacity:0}14%{transform:translate(-50%,-50%) scale(1.18);opacity:1}24%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1;transform:translate(-50%,-52%)}100%{transform:translate(-50%,-75%);opacity:0}}
.gtabs{display:flex;gap:6px;margin:4px 0 12px;flex-wrap:wrap}
.gitems{display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:10px;max-height:56vh;overflow:auto;padding:2px}
.gitem{border:1px solid var(--line);border-radius:10px;padding:8px;text-align:center;background:var(--surface2);display:flex;flex-direction:column;gap:5px;align-items:center}
.gitem .nm{font-size:.86rem;font-weight:700}
.gitem .ds{font-size:.7rem;color:var(--muted);line-height:1.35}
.gitem.on{outline:2px solid var(--accent);outline-offset:-1px}
.gitem canvas{border-radius:6px}
.gach{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px;max-height:58vh;overflow:auto}
.gachi{display:flex;gap:10px;align-items:center;border:1px solid var(--line);border-radius:10px;padding:8px 10px;background:var(--surface2)}
.gachi.lock{opacity:.45;filter:grayscale(1)}
.gachi b{display:block;font-size:.88rem}.gachi span{font-size:.74rem;color:var(--muted)}
.gchest{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}
.gchest .rar{font-family:"DotGothic16",sans-serif;font-size:1.3rem}
.gchest .rew{min-height:3.2em;font-family:"DotGothic16",sans-serif;font-size:1.05rem;display:flex;flex-direction:column;align-items:center;gap:6px}
.gsum{display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:center;text-align:left;margin:16px auto 0;max-width:560px}
.gsum .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.gsum .tile{padding:8px 10px}
.gsum .tile .v{font-family:"DotGothic16",sans-serif;font-size:1.4rem}
@media(max-width:640px){.gsum{grid-template-columns:1fr;justify-items:center}.gsbar{gap:8px}.gcombo{min-width:44px}}
`;
const st = document.createElement("style"); st.textContent = CSS; document.head.append(st);

/* ============================================================
   UI 部品
   ============================================================ */
function el(tag, attrs, ...kids){ return h(tag, attrs, ...kids); }
let toastBox = null;
function gtoast(content, cls = "", iconName){
  if (!toastBox || !toastBox.isConnected){ toastBox = el("div", { class: "gtoasts" }); document.body.append(toastBox); }
  const t = el("div", { class: "gtoast " + cls }, iconName ? PX.icon(iconName, 3) : null, el("div", {}, ...[].concat(content)));
  toastBox.append(t); setTimeout(() => t.remove(), 2800);
  while (toastBox.children.length > 4) toastBox.firstChild.remove();
}
function levelBanner(text, sub){ const b = el("div", { class: "glevel" }, text, sub ? el("small", {}, sub) : null); document.body.append(b); setTimeout(() => b.remove(), 1800); }
function ring(p, col = "#4cc35a"){
  const r = 16, c = 2 * Math.PI * r;
  return el("span", { html: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="${r}" fill="none" stroke="var(--line)" stroke-width="6"/><circle cx="20" cy="20" r="${r}" fill="none" stroke="${col}" stroke-width="6" stroke-dasharray="${(c * Math.min(1, p)).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 20 20)" stroke-linecap="butt"/>${p >= 1 ? '<text x="20" y="25" text-anchor="middle" font-size="14" fill="#4cc35a">★</text>' : ""}</svg>` });
}
function petName(){ const g = ensure(); return g.name || (g.evo === 0 ? "たまご" : "キオ"); }

/* ---------- ホームのペット画面 ---------- */
G.homePanel = function(){
  const g = ensure(); if (!g.on) return null;
  rollDaily();
  if (!g.started){
    const wrap = el("div", { class: "panel gpanel gstart" },
      el("h2", { class: "gf", style: "margin:0;font-family:DotGothic16" }, "パートナーのたまごをえらぼう"),
      el("p", { class: "muted small", style: "margin:0" }, "カードを1枚解くごとにXPがたまって、たまごがかえり、どんどん進化していきます。"));
    const eggs = el("div", { class: "geggs" });
    for (const key of START_COLORS){
      const v = new PetView({ w: 48, h: 46, scale: 2, stage: 0, color: key, prog: 0 });
      const card = el("div", { class: "gegg", onclick: () => { g.started = true; g.color = key; g.owned["col_" + key] = true; SFX.chest(); markDirty(); route(true); gtoast(["たまごをむかえた！", el("small", {}, "カードを解いて、かえしてあげよう")], "", "heart"); } }, v.cv, PX.COLORS[key].name);
      v.cv.addEventListener("mouseenter", () => v.react("happy"));
      eggs.append(card);
    }
    wrap.append(eggs);
    return wrap;
  }
  const view = new PetView({ w: 96, h: 64, scale: 3, scene: true, cls: "gscene", onClick: () => petPet(view) });
  G._home = view;
  const stage = g.evo, lvNeed = need(g.level);
  const prog = goalProgress();
  const st = streakNow();
  const side = el("div", { class: "gside" },
    el("div", { class: "gtitle" },
      el("span", { class: "glv" }, "Lv " + g.level),
      el("span", { class: "gname", title: "名前を変える", onclick: rename }, petName()),
      el("span", { class: "gstage" }, STAGES[stage] + (stage < 4 ? `（Lv${STAGE_LV[stage + 1]}で進化）` : ""))),
    el("div", { class: "grow" }, el("span", { class: "lab" }, PX.icon("star", 2), "XP"), el("div", { class: "gmeter" }, el("i", { style: `width:${g.xp / lvNeed * 100}%` })), el("span", { class: "num" }, `${g.xp}/${lvNeed}`)),
    el("div", { class: "grow" }, el("span", { class: "lab" }, PX.icon("food", 2), "まんぷく"), el("div", { class: "gmeter sm full" }, el("i", { style: `width:${fullness()}%` })), el("span", { class: "num" }, Math.round(fullness()) + "%")),
    el("div", { class: "grow" }, el("span", { class: "lab" }, PX.icon("heart", 2), "ごきげん"), el("div", { class: "gmeter sm joy" }, el("i", { style: `width:${joy()}%` })), el("span", { class: "num" }, Math.round(joy()) + "%")),
    el("div", { class: "gchips" },
      el("span", { class: "gchip", title: "連続学習日数" }, PX.icon("flame", 2), `${st}日連続`, streakMult(st) > 1 ? el("small", {}, `XP×${streakMult(st)}`) : el("small", {}, "3日でXPボーナス")),
      el("span", { class: "gchip", title: "コイン" }, PX.icon("coin", 2), String(g.coins)),
      (g.inv.charm || 0) ? el("span", { class: "gchip", title: ITEMS.charm.desc }, PX.icon("shield", 2), `お守り×${g.inv.charm}`) : null),
    el("div", { class: "ggoal" }, ring(prog.total ? prog.done / prog.total : 0), el("div", {}, el("div", { class: "muted", style: "font-size:.75rem" }, "今日の目標" + (g.goal === "due" ? "（期日のカードをすべて）" : "")), el("b", {}, prog.label), g.daily.goalDone ? el("span", { class: "muted", style: "font-size:.75rem;margin-left:6px" }, "達成済み") : null)),
    el("div", { class: "gbtns" },
      g.chests.length ? el("button", { class: "gbtn hot", onclick: () => chestModal() }, PX.icon("chest", 2), `宝箱をあける ×${g.chests.length}`) : null,
      el("button", { class: "gbtn", onclick: () => feedMenu(view) }, PX.icon("food", 2), "おやつ"),
      el("button", { class: "gbtn", onclick: () => shopModal() }, PX.icon("coin", 2), "ショップ"),
      el("button", { class: "gbtn", onclick: () => achModal() }, PX.icon("star", 2), "じっせき")));
  const wrap = el("div", { class: "panel gpanel" }, el("div", {}, view.cv), side);
  if (fullness() < 15) setTimeout(() => gtoast([petName() + "はおなかぺこぺこ…", el("small", {}, "カードを解くとごはんになるよ")], "", "food"), 400);
  return wrap;
};
function petPet(view){
  const g = ensure(); rollDaily();
  view.react("pet"); SFX.pet();
  if ((g.daily.pets || 0) < 10){ g.daily.pets = (g.daily.pets || 0) + 1; addJoy(3); g.stats.pets = (g.stats.pets || 0) + 1; const ev = { ach: [], coins: 0 }; checkAch(ev); if (ev.coins){ g.coins += ev.coins; showAch(ev); } markDirty(); }
}
async function rename(){
  const g = ensure(); if (g.evo === 0){ toast("たまごがかえったら名前をつけられます"); return; }
  const v = await promptDlg("名前をつける", g.name || "キオ", "ペットの名前"); if (v == null) return;
  g.name = v.trim().slice(0, 12) || g.name; markDirty(); route(true);
}
function feedMenu(view){
  const g = ensure();
  const foods = ["cookie", "cake"].filter(k => g.inv[k]);
  if (!foods.length){ toast("おやつがありません。ショップで買えます"); return; }
  const btns = foods.map(k => ({ label: `${ITEMS[k].name}をあげる（のこり${g.inv[k]}）`, primary: true, value: k }));
  modal({ title: "おやつをあげる", body: el("p", { class: "muted small" }, "まんぷくとごきげんが上がります。ふだんのごはんはカードを解くこと！"), buttons: [{ label: "やめる", value: null }, ...btns] }).then(k => {
    if (!k) return;
    g.inv[k]--; addFull(ITEMS[k].full); addJoy(ITEMS[k].joy); markDirty(); SFX.eat();
    route(true); setTimeout(() => G._home && G._home.react("eat"), 60);
  });
}

/* ---------- 学習中のバー ---------- */
G.studyBar = function(){
  const g = ensure(); if (!g.on || !g.started) return null;
  if (G._bar && !G._bar.view.dead) return G._bar.el;
  const view = new PetView({ w: 48, h: 42, scale: 2, ground: 39, onClick: () => petPet(view) });
  const lv = el("b"), nm = el("span"), goal = el("span", { class: "goal" }), meter = el("i"), combo = el("div", { class: "gcombo" }, el("b", {}, "0"), el("small", {}, "COMBO")), coins = el("b");
  const bar = el("div", { class: "gsbar" }, view.cv,
    el("div", { class: "mid" }, el("div", { class: "top" }, lv, nm, goal), el("div", { class: "gmeter sm" }, meter)),
    combo, el("div", { class: "gcoin" }, PX.icon("coin", 2), coins));
  G._bar = { el: bar, view, lv, nm, goal, meter, combo, coins };
  G.updateBar();
  return bar;
};
G.updateBar = function(){
  const b = G._bar; if (!b) return; const g = ensure();
  b.lv.textContent = "Lv " + g.level; b.nm.textContent = petName();
  const p = goalProgress(); b.goal.textContent = "目標 " + p.label;
  b.meter.style.width = (g.xp / need(g.level) * 100) + "%";
  b.coins.textContent = g.coins;
  const n = G.sess.combo; b.combo.firstChild.textContent = n;
  b.combo.className = "gcombo " + (n >= 50 ? "t3" : n >= 25 ? "t2" : n >= 10 ? "t1" : "");
};
function floatText(text, cls, dx = 0, dy = 0){
  const b = G._bar; if (!b || !b.el.isConnected) return;
  const f = el("span", { class: "gfloat " + (cls || ""), style: `left:${60 + dx}px;top:${8 + dy}px` }, text);
  b.el.append(f); setTimeout(() => f.remove(), 1200);
}
function showAch(ev){ for (const id of ev.ach){ const a = ACH.find(x => x[0] === id); if (a) gtoast(["実績解除：" + a[1], el("small", {}, `${a[2]}　コイン +${a[4]}`)], "goal", "star"); } }
G.react = function(ev){
  if (!ev) return;
  const b = G._bar; G.updateBar();
  const v = b && b.view;
  if (b){ b.combo.classList.remove("bump"); void b.combo.offsetWidth; b.combo.classList.add("bump"); }
  if (ev.ease === 1){ v && v.react("again"); SFX.again(); }
  else { v && v.react("happy"); SFX.answer(ev.combo); }
  floatText(`+${ev.cardXp} XP`, "", 0, 0);
  if (ev.mult > 1 && ev.combo % 5 === 1) floatText(`連続ボーナス×${ev.mult}`, "mult", 50, 18);
  if (ev.combo % 10 === 0){ setTimeout(() => { v && v.react("big"); SFX.combo(); floatText(`${ev.combo} COMBO!`, "big", 30, -4); }, 120); }
  if (ev.streakUp) gtoast([`${ev.streakUp.n}日連続！`, el("small", {}, ev.streakUp.used ? `お守りが連続記録を守った（${ev.streakUp.used}個使用）・今日最初の学習 +30XP` : `今日最初の学習 +30XP` + (streakMult(ev.streakUp.n) > 1 ? `・XP×${streakMult(ev.streakUp.n)}` : ""))], "", "flame");
  for (const d of ev.drops){
    if (d.kind === "coins"){ v && v.react("coins"); SFX.coin(); floatText(`コイン +${d.n}!`, "coin", 70, 14); }
    else if (d.kind === "chest"){ SFX.chest(); gtoast([`${RARITY[d.rarity].name}の宝箱をゲット！`, el("small", {}, d.src === "combo" ? `${ev.combo}コンボ達成のごほうび` : d.src === "goal" ? "今日の目標達成のごほうび" : "ラッキードロップ！ 学習のあとであけられます")], d.rarity, "chest"); }
  }
  if (ev.goal) setTimeout(() => { gtoast(["今日の目標を達成！", el("small", {}, "+100 XP ・ 宝箱をゲット")], "goal", "star"); v && v.react("big"); }, 300);
  if (ev.levels.length){ setTimeout(() => { levelBanner("LEVEL UP!", `Lv ${ev.levels[ev.levels.length - 1]}`); SFX.level(); v && v.react("level"); }, 200); }
  showAch(ev);
  if (ev.evolve) setTimeout(() => evolutionModal(ev.evolve.from, ev.evolve.to), ev.levels.length ? 1500 : 300);
};

/* ---------- 学習後のまとめ ---------- */
G.summary = function(){
  const g = ensure(); if (!g.on || !g.started || !G.sess.cards) return null;
  const view = new PetView({ w: 96, h: 64, scale: 2, scene: true, cls: "gscene" });
  setTimeout(() => view.react("big"), 400);
  const tile = (v, k) => el("div", { class: "tile" }, el("div", { class: "v" }, String(v)), el("div", { class: "k" }, k));
  return el("div", { class: "gsum" }, view.cv, el("div", {},
    el("div", { class: "gf", style: "font-family:DotGothic16;font-size:1.1rem;margin-bottom:6px" }, "今回の成果"),
    el("div", { class: "grid" }, tile(G.sess.cards + "枚", "解いたカード"), tile("+" + G.sess.xp, "XP"), tile("+" + G.sess.coins, "コイン"), tile(G.sess.best, "最大コンボ")),
    g.chests.length ? el("button", { class: "gbtn hot", style: "margin-top:10px", onclick: () => chestModal() }, PX.icon("chest", 2), `宝箱をあける ×${g.chests.length}`) : null));
};

/* ---------- 進化 ---------- */
function evolutionModal(from, to){
  const g = ensure();
  let revealed = false;
  const view = new PetView({ w: 96, h: 64, scale: 4, scene: true, cls: "gscene", override: t => {
    if (t < 1.2) return { stage: from };
    if (t < 4.6){ const k = t - 1.2; const ph = Math.floor(k * (2 + k * 2.2)) % 2; return { stage: ph ? to : from, silhouette: [255, 255, 255] }; }
    if (t < 5.2) return { stage: to, flash: 1 - (t - 4.6) / .6 };
    if (!revealed){ revealed = true; onReveal(); }
    return { stage: to };
  } });
  view.cv.style.width = "100%"; view.cv.style.maxWidth = "384px";
  const msg = el("p", { class: "gf", style: "font-family:DotGothic16;font-size:1.15rem;text-align:center;margin:12px 0 0;min-height:1.6em" }, from === 0 ? "たまごがうごいている…！" : `${petName()}のからだが光りはじめた…！`);
  const body = el("div", { style: "display:flex;flex-direction:column;align-items:center" }, view.cv, msg);
  const onReveal = () => {
    SFX.evolve(); PX.spawn(view, "spark2", 18, { ring: true, speed: 40, g: 0, life: 1 }); PX.spawn(view, "spark", 14, { speed: 30, spread: 3 });
    msg.textContent = from === 0 ? "たまごがかえった！" : `${petName()}は ${STAGES[to]} に進化した！`;
    view.react("big");
    if (to === 4) gtoast(["ゴールドカラーを解放！", el("small", {}, "ショップの「いろ」から変えられます")], "legendary", "star");
  };
  setTimeout(() => SFX.shake(0), 1200);
  modal({ title: from === 0 ? "おや…？" : "進化！", body, buttons: [{ label: "やったー！", primary: true, value: true }] }).then(async () => {
    if (from === 0 && !g.name){ const v = await promptDlg("名前をつけてあげよう", "キオ", "生まれたペットの名前"); g.name = (v || "キオ").trim().slice(0, 12) || "キオ"; }
    markDirty(); if (currentView === "decks") route(true); else G.updateBar();
  });
}

/* ---------- 宝箱 ---------- */
function chestModal(){
  const g = ensure(); if (!g.chests.length) return;
  const rarity = g.chests[0];
  const W = 56, H = 46, cv = el("canvas", { width: W, height: H, class: "gcanvas" }); cv.style.width = W * 5 + "px"; cv.style.maxWidth = "100%";
  const x = cv.getContext("2d");
  let phase = "idle", t0 = performance.now(), opened = 0;
  const parts = { parts: [], petX: W / 2 - 20, petY: 16 };
  const pal = PX.CHEST_PAL[rarity];
  const rar = el("div", { class: "rar", style: `color:${RARITY[rarity].col}` }, RARITY[rarity].name + "の宝箱");
  const rew = el("div", { class: "rew" }, el("span", { class: "muted", style: "font-family:var(--f-body);font-size:.85rem" }, "タップしてあけよう"));
  let last = 0;
  const frame = ts => {
    if (!cv.isConnected && performance.now() - t0 > 1000) return;
    const t = (performance.now() - t0) / 1000, dt = last ? Math.min(.1, (ts - last) / 1000) : .03; last = ts;
    x.clearRect(0, 0, W, H);
    // rays
    if (phase === "open"){
      const k = Math.min(1, (performance.now() - opened) / 400);
      x.save(); x.translate(W / 2, 26); x.rotate(t * .6);
      for (let i = 0; i < 12; i++){ x.rotate(Math.PI / 6); x.fillStyle = i % 2 ? `rgba(255,236,150,${.35 * k})` : `rgba(255,255,255,${.25 * k})`; x.beginPath(); x.moveTo(0, 0); x.lineTo(-4, -60); x.lineTo(4, -60); x.fill(); }
      x.restore();
    }
    const bx = (W - 16) / 2 | 0, by = 28;
    let sx = 0;
    if (phase === "idle") sx = Math.floor(t * 2) % 2 && Math.floor(t * 6) % 3 === 0 ? 1 : 0;
    if (phase === "shake"){ const e = (performance.now() - shakeStart) / 1000; sx = Math.round(Math.sin(e * (30 + e * 40)) * (1 + e * 2)); }
    x.fillStyle = "rgba(0,0,0,.18)"; x.fillRect(bx - 1, by + 9, 18, 1);
    PX.drawMap(x, PX.CHEST_BASE, pal, bx + sx, by);
    const lift = phase === "open" ? Math.min(10, (performance.now() - opened) / 25) : 0;
    PX.drawMap(x, PX.CHEST_LID, pal, bx + sx, by - 6 - Math.round(lift));
    PX.stepParts(parts, x, dt);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  let shakeStart = 0;
  const open = () => {
    if (phase !== "idle") return;
    phase = "shake"; shakeStart = performance.now();
    [0, 1, 2, 3, 4, 5].forEach(i => setTimeout(() => SFX.shake(i), i * 140));
    setTimeout(() => {
      phase = "open"; opened = performance.now();
      g.chests.shift();
      const r = openReward(rarity);
      const ev = { ach: [], coins: 0 }; checkAch(ev); if (ev.coins) g.coins += ev.coins;
      markDirty(); SFX.open(rarity);
      PX.spawn(parts, "coin", rarity === "legendary" ? 22 : rarity === "epic" ? 16 : 10, { x: W / 2, y: 26, speed: 40, spread: 2.2 });
      PX.spawn(parts, "spark2", 10, { x: W / 2, y: 24, ring: true, speed: 30, g: 0, life: .8 });
      rew.innerHTML = "";
      rew.append(el("div", {}, PX.icon("coin", 3), ` コイン +${r.coins}`));
      for (const id of r.items){ const it = ITEMS[id]; rew.append(el("div", { style: "display:flex;align-items:center;gap:8px" }, previewFor(id, 2), el("span", {}, `${itemName(id)} を手に入れた！`))); }
      if (r.food) rew.append(el("div", {}, PX.icon("food", 3), ` ${ITEMS[r.food].name} を手に入れた`));
      if (r.charm) rew.append(el("div", {}, PX.icon("shield", 3), " ストリークのお守り を手に入れた"));
      showAch(ev);
      btn.textContent = g.chests.length ? `次の宝箱へ（のこり${g.chests.length}）` : "とじる"; btn.disabled = false;
    }, 900);
  };
  cv.addEventListener("click", open); cv.style.cursor = "pointer";
  const btn = el("button", { class: "btn primary", onclick: () => { if (phase === "idle") open(); else if (phase === "open"){ closeIt(); if (g.chests.length) setTimeout(chestModal, 50); else if (currentView === "decks") route(true); } } }, "あける");
  const mask = el("div", { class: "mask" }, el("div", { class: "modal" }, el("div", { class: "gchest" }, rar, cv, rew, el("div", { class: "foot", style: "justify-content:center" }, btn))));
  const closeIt = () => { mask.remove(); if (currentView === "decks" && !g.chests.length) route(true); };
  mask.addEventListener("mousedown", e => { if (e.target === mask && phase !== "shake"){ closeIt(); } });
  document.body.append(mask);
}

/* ---------- ショップ ---------- */
function previewFor(id, scale = 2){
  const g = ensure(), it = ITEMS[id]; const st = Math.max(1, g.evo);
  if (it.slot === "bg") return staticCanvas(st, g.color, g.equip, it.bg, scale);
  if (it.slot === "color") return staticCanvas(st, it.color, g.equip, null, scale);
  if (it.slot === "food") return PX.icon("food", scale * 3);
  if (it.slot === "item") return PX.icon("shield", scale * 3);
  const eq = { ...g.equip, [it.slot]: id };
  return staticCanvas(st, g.color, eq, null, scale);
}
function shopModal(tab = "acc"){
  const g = ensure();
  const coinEl = el("span", { class: "gchip" }, PX.icon("coin", 2), String(g.coins));
  const list = el("div", { class: "gitems" });
  const tabs = [["acc", "きせかえ"], ["bg", "はいけい"], ["color", "いろ"], ["item", "アイテム"]];
  const tabBar = el("div", { class: "gtabs" });
  const draw = () => {
    tabBar.innerHTML = ""; for (const [k, label] of tabs) tabBar.append(el("button", { class: "gbtn" + (k === tab ? " pri" : ""), onclick: () => { tab = k; draw(); } }, label));
    coinEl.lastChild.textContent = String(g.coins);
    list.innerHTML = "";
    const ids = Object.keys(ITEMS).filter(id => { const s = ITEMS[id].slot; return tab === "acc" ? ["hat", "face", "neck"].includes(s) : tab === "bg" ? s === "bg" : tab === "color" ? s === "color" : s === "food" || s === "item"; });
    if (tab === "bg") ids.unshift("bg_grass");
    for (const id of ids){
      const it = id === "bg_grass" ? { slot: "bg", bg: "grass", price: 0 } : ITEMS[id];
      const owned = id === "bg_grass" || g.owned[id] || (it.slot === "color" && g.color === it.color);
      const equipped = it.slot === "bg" ? (g.equip.bg || "grass") === it.bg : it.slot === "color" ? g.color === it.color : g.equip[it.slot] === id;
      const name = id === "bg_grass" ? PX.BG.grass.name : itemName(id);
      const prev = id === "bg_grass" ? staticCanvas(Math.max(1, g.evo), g.color, g.equip, "grass", 2) : previewFor(id, 2);
      let action;
      if (it.slot === "food" || it.slot === "item"){
        const have = g.inv[id] || 0;
        action = el("button", { class: "gbtn", disabled: g.coins < it.price, onclick: () => { if (g.coins < it.price) return; g.coins -= it.price; g.inv[id] = have + 1; SFX.buy(); markDirty(); draw(); } }, PX.icon("coin", 2), String(it.price));
        list.append(el("div", { class: "gitem" }, prev, el("div", { class: "nm" }, name), el("div", { class: "ds" }, (it.desc || `まんぷく+${it.full}・ごきげん+${it.joy}`) + `（所持 ${have}）`), action));
        continue;
      }
      if (owned){
        action = el("button", { class: "gbtn" + (equipped ? " pri" : ""), onclick: () => {
          if (it.slot === "bg") g.equip.bg = it.bg;
          else if (it.slot === "color") g.color = it.color;
          else g.equip[it.slot] = equipped ? null : id;
          SFX.pet(); markDirty(); draw();
        } }, equipped ? (it.slot === "bg" || it.slot === "color" ? "使用中" : "はずす") : "そうびする");
      } else if (it.chest){
        action = el("span", { class: "ds", style: "display:flex;align-items:center;gap:4px" }, PX.icon("lock", 2), "宝箱限定");
      } else {
        action = el("button", { class: "gbtn", disabled: g.coins < it.price, onclick: async () => {
          if (g.coins < it.price) return;
          if (!(await confirmDlg(`${name} を ${it.price} コインで買いますか？`, "買う"))) return;
          g.coins -= it.price; g.owned[id] = true;
          if (it.slot === "bg") g.equip.bg = it.bg; else if (it.slot === "color") g.color = it.color; else g.equip[it.slot] = id;
          SFX.buy(); const ev = { ach: [], coins: 0 }; checkAch(ev); if (ev.coins) g.coins += ev.coins; showAch(ev);
          markDirty(); draw();
        } }, PX.icon("coin", 2), String(it.price));
      }
      list.append(el("div", { class: "gitem" + (equipped ? " on" : "") }, prev, el("div", { class: "nm" }, name), it.desc ? el("div", { class: "ds" }, it.desc) : null, action));
    }
  };
  draw();
  modal({ title: "ショップ", wide: true, body: el("div", {}, el("div", { class: "row" }, tabBar, el("div", { class: "spacer" }), coinEl), g.evo === 0 ? el("p", { class: "muted small", style: "margin:0 0 8px" }, "きせかえはたまごがかえってから見えるようになります。") : null, list) }).then(() => { if (currentView === "decks") route(true); });
}

/* ---------- 実績 ---------- */
function achModal(){
  const g = ensure();
  const done = ACH.filter(a => g.ach[a[0]]).length;
  const list = el("div", { class: "gach" }, ...ACH.map(([id, name, desc, , coins]) => el("div", { class: "gachi" + (g.ach[id] ? "" : " lock") }, PX.icon("star", 3), el("div", {}, el("b", {}, name), el("span", {}, `${desc}・コイン${coins}`), g.ach[id] ? el("span", { style: "display:block" }, fmtDate(g.ach[id]) + " 達成") : null))));
  const st = g.stats;
  modal({ title: `じっせき（${done} / ${ACH.length}）`, wide: true, body: el("div", {},
    el("div", { class: "gchips", style: "margin-bottom:10px" }, el("span", { class: "gchip" }, `累計 ${st.cards || 0} 枚`), el("span", { class: "gchip" }, `最高 ${st.bestCombo || 0} コンボ`), el("span", { class: "gchip" }, `最長 ${g.streak.best || 0} 日連続`), el("span", { class: "gchip" }, `1日最高 ${st.maxDay || 0} 枚`), el("span", { class: "gchip" }, `宝箱 ${st.chests || 0} 個`)),
    list) });
}

/* ---------- 設定 ---------- */
G.settingsPanel = function(){
  const g = ensure();
  const on = el("input", { type: "checkbox", checked: g.on }); on.addEventListener("change", () => { g.on = on.checked; markDirty(); route(true); });
  const snd = el("input", { type: "checkbox", checked: g.sound }); snd.addEventListener("change", () => { g.sound = snd.checked; markDirty(); if (g.sound) SFX.coin(); });
  const goal = el("select", {}, ...[20, 50, 100, 200, 300].map(n => el("option", { value: String(n), selected: String(g.goal) === String(n) }, `${n}枚`)), el("option", { value: "due", selected: g.goal === "due" }, "期日のカードをすべて"));
  goal.addEventListener("change", () => { g.goal = goal.value === "due" ? "due" : +goal.value; markDirty(); toast("保存しました"); });
  return el("div", { class: "panel", style: "margin-top:14px" }, el("h3", {}, "育成ゲーム"),
    el("div", { class: "row" }, el("label", {}, on, " ペット育成・ごほうびを表示する")),
    el("div", { class: "row", style: "margin-top:6px" }, el("label", {}, snd, " 効果音")),
    el("div", { class: "row", style: "margin-top:6px" }, el("label", {}, "1日の目標"), goal),
    el("p", { class: "muted small", style: "margin-bottom:0" }, "XPとコインは「もう一度」「難しい」「普通」「簡単」のどれを押しても同じだけもらえます。ごほうび目当てで評価をごまかす必要がないので、正直に押すのがいちばん効率的です。"));
};
})();
