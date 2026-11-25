/* ============================================================
   Kioku アーケード — ゲームのルール（画面なし）
   - スロット：盤面に並ぶシンボルで稼ぎ、上がり続ける家賃を払う（Luck be a Landlord 系）
   - ポーカー：手札で役を作り「チップ × 倍率」で目標点を超える（Balatro 系）
   乱数は状態に入れた種で回す（保存・再開しても同じ流れになる）。node でも読めるように DOM は使わない。
   ============================================================ */
"use strict";
(function(root){
const ARC = root.ARC = root.ARC || {};

/* ---------- 乱数（mulberry32。状態 o.s を進める） ---------- */
function rnd(o){ let t = o.s = (o.s + 0x6D2B79F5) | 0; t = Math.imul(t ^ t >>> 15, 1 | t); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const ri = (o, n) => Math.floor(rnd(o) * n);
function shuffle(o, a){ for (let i = a.length - 1; i > 0; i--){ const j = ri(o, i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function wpick(o, items, w){ let s = 0; for (const x of items) s += w(x); let r = rnd(o) * s; for (const x of items){ r -= w(x); if (r < 0) return x; } return items[items.length - 1]; }
ARC.rnd = rnd; ARC.shuffle = shuffle;
const newSeed = () => (Math.random() * 2 ** 31) | 0;

/* ============================================================
   スロット
   ============================================================ */
const COLS = 5, ROWS = 4, CELLS = COLS * ROWS;
// r: C=ふつう U=すこし珍しい R=レア。v: 基本の稼ぎ。tag: 効果の対象になる種類
const SY = {
  coin:    { e: "🪙", n: "コイン",     r: "C", v: 1, d: "1枚" },
  cherry:  { e: "🍒", n: "サクランボ", r: "C", v: 1, tag: "fruit", d: "隣のサクランボ1つにつき +1" },
  flower:  { e: "🌸", n: "花",         r: "C", v: 1, tag: "plant", d: "" },
  bee:     { e: "🐝", n: "ハチ",       r: "C", v: 1, d: "隣の花・果物を ×2" },
  cat:     { e: "🐱", n: "ネコ",       r: "C", v: 1, d: "隣のミルクを飲みほして +9" },
  milk:    { e: "🥛", n: "ミルク",     r: "C", v: 1, d: "" },
  seed:    { e: "🌱", n: "タネ",       r: "C", v: 1, tag: "plant", d: "4回出ると木になる" },
  dice:    { e: "🎲", n: "サイコロ",   r: "C", v: 0, d: "1〜6" },
  rock:    { e: "🪨", n: "石",         r: "C", v: 1, d: "" },
  egg:     { e: "🥚", n: "タマゴ",     r: "C", v: 1, d: "出るたび 1/6 でニワトリになる" },
  fish:    { e: "🐟", n: "サカナ",     r: "C", v: 1, d: "" },
  apple:   { e: "🍎", n: "リンゴ",     r: "U", v: 3, tag: "fruit", d: "" },
  tree:    { e: "🌳", n: "木",         r: "U", v: 3, tag: "plant", d: "出るたび 1/4 でリンゴを1つ実らせる（バッグに追加）" },
  hen:     { e: "🐔", n: "ニワトリ",   r: "U", v: 2, d: "出るたび 1/3 でタマゴを産む（バッグに追加）" },
  fisher:  { e: "🎣", n: "釣り人",     r: "U", v: 1, d: "出るたび 1/2 でサカナを釣る（バッグに追加）" },
  bear:    { e: "🐻", n: "クマ",       r: "U", v: 2, d: "隣のサカナとハチミツを食べる（サカナ +8・ハチミツ +30）" },
  honey:   { e: "🍯", n: "ハチミツ",   r: "U", v: 3, d: "盤面のハチ1匹につき +1" },
  pick:    { e: "⛏️", n: "つるはし",   r: "U", v: 1, d: "隣の石を割って +12" },
  can:     { e: "🚿", n: "ジョウロ",   r: "U", v: 1, d: "隣の植物（花・タネ・木）+3" },
  magnet:  { e: "🧲", n: "磁石",       r: "U", v: 1, d: "隣のコインを ×3" },
  fox:     { e: "🦊", n: "キツネ",     r: "U", v: 2, d: "隣のタマゴとニワトリを食べる（タマゴ +6・ニワトリ +20）" },
  rainbow: { e: "🌈", n: "にじ",       r: "R", v: 1, d: "隣のシンボルをすべて ×2" },
  gem:     { e: "💎", n: "ダイヤ",     r: "R", v: 5, d: "盤面のほかのダイヤ1つにつき +2" },
  crown:   { e: "👑", n: "王冠",       r: "R", v: 2, d: "盤面の空きマス1つにつき +2" },
  mirror:  { e: "🪞", n: "鏡",         r: "R", v: 0, d: "隣でいちばん稼いだシンボルと同じだけ稼ぐ" },
  clover:  { e: "🍀", n: "四つ葉",     r: "R", v: 1, d: "持っているとレアが出やすくなる" },
  dragon:  { e: "🐉", n: "ドラゴン",   r: "R", v: 6, d: "隣のシンボルを食べる（食べた数 ×4）。食べないと稼がない" },
  vault:   { e: "🏦", n: "金庫",       r: "R", v: 0, d: "出るたび +2ずつ貯まり、そのぶん稼ぐ（ずっと残る）" }
};
ARC.SY = SY;
const SY_IDS = Object.keys(SY);
// 家賃：[この家賃までのスピン数, 金額]
const RENT = [[4, 15], [4, 30], [5, 60], [5, 110], [6, 180], [6, 260], [7, 370], [7, 500], [8, 660], [8, 850], [9, 1080], [10, 1400]];
ARC.SLOT_RENT = RENT;
const slotRentAt = (i, lv) => Math.round(RENT[i][1] * (1 + 0.15 * (lv - 1)));

function slotNew(lv = 1){
  const run = { g: "slot", lv, rs: { s: newSeed() }, bag: ["coin", "cherry", "flower", "cat", "milk"].map(id => ({ id })),
    coins: 0, rent: 0, left: RENT[0][0], spins: 0, rm: 0, offer: null, last: null, over: false, won: false, best: 0 };
  return run;
}
const nb = p => { const x = p % COLS, y = (p / COLS) | 0, out = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++){ if (!dx && !dy) continue; const X = x + dx, Y = y + dy; if (X >= 0 && X < COLS && Y >= 0 && Y < ROWS) out.push(Y * COLS + X); } return out; };
const NB = [...Array(CELLS)].map((_, p) => nb(p));

/** 1回まわす。盤面の結果を run.last に入れて、稼ぎを足す。家賃の支払いもここ */
function slotSpin(run){
  const o = run.rs, bag = run.bag;
  const order = shuffle(o, bag.map((_, i) => i)).slice(0, CELLS);
  const pos = shuffle(o, [...Array(CELLS)].map((_, i) => i));
  const cell = Array(CELLS).fill(null);
  order.forEach((bi, k) => { cell[pos[k]] = { bi, id: bag[bi].id, base: SY[bag[bi].id].v, add: 0, mul: 1, dead: false, fx: [] }; });
  const at = p => cell[p];
  const adj = (p, f) => NB[p].map(at).filter(c => c && !c.dead && (!f || f(c)));
  const born = [];
  // 1) 基本値
  for (const c of cell) if (c && c.id === "dice") c.base = 1 + ri(o, 6);
  for (const c of cell) if (c && c.id === "vault"){ const B = bag[c.bi]; B.n = (B.n || 0) + 2; c.base = B.n; }
  // 2) 食べる・割る
  const eat = (p, who, map) => { for (const t of adj(p, t => t.id in map)){ t.dead = true; who.add += map[t.id]; who.fx.push(t.id); } };
  cell.forEach((c, p) => { if (!c || c.dead) return;
    if (c.id === "cat") eat(p, c, { milk: 9 });
    if (c.id === "bear") eat(p, c, { fish: 8, honey: 30 });
    if (c.id === "fox") eat(p, c, { egg: 6, hen: 20 });
    if (c.id === "pick") eat(p, c, { rock: 12 });
  });
  cell.forEach((c, p) => { if (!c || c.dead || c.id !== "dragon") return;
    const prey = adj(p, t => t.id !== "dragon"); if (!prey.length){ c.base = 0; return; }
    for (const t of prey){ t.dead = true; c.fx.push(t.id); } c.add += 4 * prey.length; });
  // 3) 足し算
  const live = cell.filter(c => c && !c.dead), empty = cell.filter(c => !c).length;
  const cnt = id => live.filter(c => c.id === id).length;
  cell.forEach((c, p) => { if (!c || c.dead) return;
    if (c.id === "cherry") c.add += adj(p, t => t.id === "cherry").length;
    if (c.id === "honey") c.add += cnt("bee");
    if (c.id === "gem") c.add += 2 * (cnt("gem") - 1);
    if (c.id === "crown") c.add += 2 * empty;
    if (c.id === "can") for (const t of adj(p, t => SY[t.id].tag === "plant")) t.add += 3;
  });
  // 4) 掛け算
  cell.forEach((c, p) => { if (!c || c.dead) return;
    if (c.id === "bee") for (const t of adj(p, t => t.id === "flower" || SY[t.id].tag === "fruit")) t.mul *= 2;
    if (c.id === "magnet") for (const t of adj(p, t => t.id === "coin")) t.mul *= 3;
    if (c.id === "rainbow") for (const t of adj(p)) t.mul *= 2;
  });
  for (const c of cell) if (c) c.val = c.dead ? 0 : Math.round((c.base + c.add) * c.mul);
  cell.forEach((c, p) => { if (c && !c.dead && c.id === "mirror") c.val = Math.max(0, ...adj(p, t => t.id !== "mirror").map(t => t.val)); });
  // 5) 育つ・増える
  for (const c of cell){ if (!c || c.dead) continue; const B = bag[c.bi];
    if (c.id === "seed"){ B.n = (B.n || 0) + 1; if (B.n >= 4){ B.id = "tree"; B.n = 0; c.grow = "tree"; } }
    else if (c.id === "egg" && rnd(o) < 1 / 6){ B.id = "hen"; c.grow = "hen"; }
    else if (c.id === "hen" && rnd(o) < 1 / 3) born.push("egg");
    else if (c.id === "fisher" && rnd(o) < 1 / 2) born.push("fish");
    else if (c.id === "tree" && rnd(o) < 1 / 4) born.push("apple");
  }
  const gain = cell.reduce((a, c) => a + (c ? c.val : 0), 0);
  const deadIdx = new Set(cell.filter(c => c && c.dead).map(c => c.bi));
  run.bag = bag.filter((_, i) => !deadIdx.has(i)).concat(born.map(id => ({ id })));
  run.coins += gain; run.spins++; run.left--; run.best = Math.max(run.best || 0, gain);
  const res = { cell: cell.map(c => c && { id: c.id, val: c.val, dead: c.dead, fx: c.fx, grow: c.grow || null }), gain, born, paid: null };
  // 家賃
  if (run.left <= 0){
    const amt = slotRentAt(run.rent, run.lv);
    if (run.coins >= amt){
      run.coins -= amt; res.paid = amt; run.rent++; run.rm++;
      if (run.rent >= RENT.length){ run.won = true; run.over = true; }
      else run.left = RENT[run.rent][0];
    } else { res.paid = -amt; run.over = true; }
  }
  run.last = res;
  if (!run.over) run.offer = slotOffer(run);
  return res;
}
function slotOdds(run){
  const cl = run.bag.filter(b => b.id === "clover").length;
  const R = Math.min(0.3, (0.012 + 0.008 * run.rent) * (1 + 0.6 * cl)), U = Math.min(0.5, 0.16 + 0.03 * run.rent);
  return { R, U, C: 1 - R - U };
}
function slotOffer(run){
  const o = run.rs, odds = slotOdds(run), out = [];
  const pickable = SY_IDS.filter(id => id !== "tree" && id !== "hen" || run.rent >= 2);
  while (out.length < 3){
    const x = rnd(o), r = x < odds.R ? "R" : x < odds.R + odds.U ? "U" : "C";
    const pool = pickable.filter(id => SY[id].r === r && !out.includes(id));
    if (pool.length) out.push(pool[ri(o, pool.length)]);
  }
  return out;
}
function slotPick(run, id){ if (id && run.offer && run.offer.includes(id)) run.bag.push({ id }); run.offer = null; }
function slotRemove(run, bi){ if (run.rm > 0 && run.bag[bi]){ run.bag.splice(bi, 1); run.rm--; } }
ARC.slot = { COLS, ROWS, new: slotNew, spin: slotSpin, pick: slotPick, remove: slotRemove, rentAt: slotRentAt, odds: slotOdds, RENT };

/* ============================================================
   ポーカー
   ============================================================ */
const SUITS = ["♠", "♥", "♦", "♣"], RANKS = { 11: "J", 12: "Q", 13: "K", 14: "A" };
const rankName = r => RANKS[r] || String(r);
const cardChips = r => r === 14 ? 11 : r >= 11 ? 10 : r;
const HT = [
  // id, 名前, チップ, 倍率, レベルごとの +チップ, +倍率
  ["hc", "ハイカード",         5,  1, 10, 1],
  ["p1", "ワンペア",           10, 2, 15, 1],
  ["p2", "ツーペア",           20, 2, 20, 1],
  ["k3", "スリーカード",       30, 3, 20, 2],
  ["st", "ストレート",         30, 4, 30, 3],
  ["fl", "フラッシュ",         35, 4, 15, 2],
  ["fh", "フルハウス",         40, 4, 25, 2],
  ["k4", "フォーカード",       60, 7, 30, 3],
  ["sf", "ストレートフラッシュ", 100, 8, 40, 4]
];
const HTI = Object.fromEntries(HT.map((h, i) => [h[0], i]));
ARC.HT = HT; ARC.SUITS = SUITS; ARC.rankName = rankName; ARC.cardChips = cardChips;

// ジョーカー。kind: chips（+チップ）/ mult（+倍率）/ x（×倍率）/ util（ルール） — 画面の色分け用
const JK = {
  plus4:   { e: "➕", n: "おまけ",         k: "mult",  d: "倍率 +4" },
  pairy:   { e: "👯", n: "ふたご",         k: "mult",  d: "ペアを含む役なら 倍率 +8" },
  trio:    { e: "🔺", n: "みつどもえ",     k: "mult",  d: "スリーカードを含む役なら 倍率 +12" },
  lineup:  { e: "📏", n: "一直線",         k: "mult",  d: "ストレートを含む役なら 倍率 +12" },
  paint:   { e: "🎨", n: "そろい色",       k: "mult",  d: "フラッシュを含む役なら 倍率 +10" },
  suitS:   { e: "♠️", n: "スペード党",     k: "mult",  d: "♠ が得点するたび 倍率 +3" },
  suitH:   { e: "♥️", n: "ハート党",       k: "mult",  d: "♥ が得点するたび 倍率 +3" },
  suitD:   { e: "♦️", n: "ダイヤ党",       k: "mult",  d: "♦ が得点するたび 倍率 +3" },
  suitC:   { e: "♣️", n: "クラブ党",       k: "mult",  d: "♣ が得点するたび 倍率 +3" },
  face:    { e: "🤴", n: "絵札好き",       k: "chips", d: "J・Q・K が得点するたび チップ +30" },
  even:    { e: "🎳", n: "偶数",           k: "mult",  d: "10・8・6・4・2 が得点するたび 倍率 +4" },
  odd:     { e: "🎯", n: "奇数",           k: "chips", d: "A・9・7・5・3 が得点するたび チップ +31" },
  small:   { e: "🤏", n: "少数精鋭",       k: "x",     d: "出したカードが3枚以下なら 倍率 ×2.5" },
  last:    { e: "🌆", n: "ラストスパート", k: "x",     d: "その患者で最後のプレイなら 倍率 ×3" },
  grow:    { e: "📈", n: "伸びしろ",       k: "mult",  d: "ペアを含む役を出すたび、このカードの 倍率 が +1 ずつ増える" },
  stack:   { e: "🧱", n: "積み上げ",       k: "chips", d: "プレイするたび、このカードの チップ が +4 ずつ増える" },
  king:    { e: "👑", n: "王の間",         k: "x",     d: "手札に残した K 1枚につき 倍率 ×1.5" },
  four:    { e: "🖐️", n: "四本指",         k: "util",  d: "フラッシュとストレートが4枚で作れる" },
  hand:    { e: "🫴", n: "大きな手",       k: "util",  d: "手札 +1" },
  extra:   { e: "🔁", n: "もう一回",       k: "util",  d: "プレイ回数 +1" },
  tosser:  { e: "🗑️", n: "捨て上手",       k: "util",  d: "捨てる回数 +2" },
  saver:   { e: "🧊", n: "温存",           k: "chips", d: "残っている捨て回数1につき チップ +30" },
  ace:     { e: "🅰️", n: "エース",         k: "x",     d: "A が得点するたび 倍率 ×1.3" },
  steady:  { e: "⚖️", n: "平常心",         k: "x",     d: "倍率 ×1.5" },
  mime:    { e: "🎭", n: "なりきり",       k: "mult",  d: "手札に残したカード1枚につき 倍率 +2" },
  greed:   { e: "💰", n: "よくばり",       k: "x",     d: "ジョーカー1枚につき 倍率 ×1.15（自分も数える）" }
};
ARC.JK = JK;
const JK_IDS = Object.keys(JK);
const BOSS = {
  club:   { e: "♣", n: "黒い霧",   d: "♣ のカードは得点しない" },
  heart:  { e: "♥", n: "赤い霧",   d: "♥ のカードは得点しない" },
  nodisc: { e: "🚫", n: "封印",     d: "捨てられない" },
  tight:  { e: "🗜️", n: "窮屈",     d: "手札 −1" },
  face:   { e: "🎭", n: "仮面",     d: "J・Q・K は得点しない" },
  two:    { e: "✌️", n: "二択",     d: "プレイは2回だけ" },
  flint:  { e: "🪨", n: "重石",     d: "役の基本のチップと倍率が半分" }
};
ARC.BOSS = BOSS;
const PK_BASE = [200, 600, 1400, 3000, 6000, 11000, 19000, 30000];
const pkTarget = (ante, blind, lv) => Math.round(PK_BASE[ante] * [1, 1.5, 2][blind] * (1 + 0.2 * (lv - 1)) / 10) * 10;
ARC.pkTarget = pkTarget;

function pkNew(lv = 1){
  const deck = []; let id = 0; for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) deck.push({ id: id++, r, s });
  const run = { g: "poker", lv, rs: { s: newSeed() }, deck, jk: [], lvl: Object.fromEntries(HT.map(h => [h[0], 0])),
    ante: 0, blind: 0, score: 0, over: false, won: false, rd: null, offer: null, boss: [], best: 0 };
  run.boss = [...Array(8)].map(() => { const ks = Object.keys(BOSS); return ks[ri(run.rs, ks.length)]; });
  return run;
}
const has = (run, id) => run.jk.some(j => j.id === id);
function pkLimits(run){
  const bs = run.blind === 2 ? run.boss[run.ante] : null;
  return { hand: 8 + (has(run, "hand") ? 1 : 0) - (bs === "tight" ? 1 : 0), plays: bs === "two" ? 2 : 4 + (has(run, "extra") ? 1 : 0),
    discs: bs === "nodisc" ? 0 : 3 + (has(run, "tosser") ? 2 : 0), boss: bs };
}
/** 患者（ラウンド）をはじめる */
function pkStart(run){
  const L = pkLimits(run);
  const pile = shuffle(run.rs, run.deck.map(c => c.id));
  run.rd = { target: pkTarget(run.ante, run.blind, run.lv), score: 0, plays: L.plays, discs: L.discs, pile, hand: [], log: [] };
  pkDraw(run);
}
function pkDraw(run){ const R = run.rd, L = pkLimits(run); while (R.hand.length < L.hand && R.pile.length) R.hand.push(R.pile.shift()); }
const cardById = (run, id) => run.deck.find(c => c.id === id);

// ストレート（A は 1 としても使える）になっているカードの番号。なければ null
function straightOf(cards, need){
  if (cards.length < need) return null;
  const rs = [...new Set(cards.map(c => c.r))]; if (rs.includes(14)) rs.push(1);
  rs.sort((a, b) => a - b);
  let run = [rs[0]], best = null;
  for (let i = 1; i < rs.length; i++){ if (rs[i] === rs[i - 1] + 1) run.push(rs[i]); else run = [rs[i]]; if (run.length >= need) best = run.slice(); }
  if (!best) return null;
  const used = new Set();
  return best.map(r => { const rr = r === 1 ? 14 : r; const i = cards.findIndex((c, k) => c.r === rr && !used.has(k)); used.add(i); return i; });
}
/** 役の判定。cards: {r,s}[] → { type, scoring: index[] } */
function pkEval(cards, four){
  const n = cards.length, need = four ? 4 : 5;
  const byR = {}; cards.forEach((c, i) => (byR[c.r] ||= []).push(i));
  const groups = Object.entries(byR).map(([r, ix]) => ({ r: +r, ix })).sort((a, b) => b.ix.length - a.ix.length || b.r - a.r);
  const bySuit = {}; cards.forEach((c, i) => (bySuit[c.s] ||= []).push(i));
  const flushIx = Object.values(bySuit).find(ix => ix.length >= need) || null;
  const straightIx = straightOf(cards, need);
  const g0 = groups[0] ? groups[0].ix.length : 0, g1 = groups[1] ? groups[1].ix.length : 0;
  if (straightIx && flushIx){
    // ストレートフラッシュ：同じスートのカードだけでストレートになるか
    const sx = straightOf(flushIx.map(i => cards[i]), need);
    if (sx) return { type: "sf", scoring: [...new Set([...flushIx, ...straightIx])].slice(0, 5) };
  }
  if (g0 >= 4) return { type: "k4", scoring: groups[0].ix.slice(0, 4) };
  if (g0 >= 3 && g1 >= 2) return { type: "fh", scoring: [...groups[0].ix.slice(0, 3), ...groups[1].ix.slice(0, 2)] };
  if (flushIx) return { type: "fl", scoring: flushIx.slice(0, 5) };
  if (straightIx) return { type: "st", scoring: straightIx };
  if (g0 >= 3) return { type: "k3", scoring: groups[0].ix.slice(0, 3) };
  if (g0 >= 2 && g1 >= 2) return { type: "p2", scoring: [...groups[0].ix.slice(0, 2), ...groups[1].ix.slice(0, 2)] };
  if (g0 >= 2) return { type: "p1", scoring: groups[0].ix.slice(0, 2) };
  if (!n) return { type: "hc", scoring: [] };
  let hi = 0; cards.forEach((c, i) => { if (c.r > cards[hi].r) hi = i; });
  return { type: "hc", scoring: [hi] };
}
ARC.pkEval = pkEval;
const contains = (t, x) => ({
  p1: ["p1", "p2", "k3", "fh", "k4"], k3: ["k3", "fh", "k4"], st: ["st", "sf"], fl: ["fl", "sf"]
}[x] || []).includes(t);

/**
 * 出したカードの得点を計算する（状態は変えない）。steps は演出用
 * @returns {{type, chips, mult, total, steps, scoringIds}}
 */
function pkScore(run, playIds, heldIds, opt = {}){
  const R = run.rd, L = pkLimits(run), bs = L.boss;
  const cards = playIds.map(id => cardById(run, id)), held = heldIds.map(id => cardById(run, id));
  const ev = pkEval(cards, has(run, "four"));
  const h = HT[HTI[ev.type]], lv = run.lvl[ev.type] || 0;
  let chips = h[2] + h[4] * lv, mult = h[3] + h[5] * lv;
  if (bs === "flint"){ chips = Math.ceil(chips / 2); mult = Math.max(1, Math.ceil(mult / 2)); }
  const steps = [{ k: "base", t: ev.type, chips, mult }];
  const dead = c => (bs === "club" && c.s === 3) || (bs === "heart" && c.s === 1) || (bs === "face" && c.r >= 11 && c.r <= 13);
  const scoring = ev.scoring.map(i => cards[i]);
  for (const c of scoring){
    if (dead(c)){ steps.push({ k: "card", id: c.id, dead: true }); continue; }
    let dc = cardChips(c.r), dm = 0, x = 1; const by = [];
    for (const j of run.jk){
      if (j.id === "suitS" && c.s === 0){ dm += 3; by.push(j.id); }
      if (j.id === "suitH" && c.s === 1){ dm += 3; by.push(j.id); }
      if (j.id === "suitD" && c.s === 2){ dm += 3; by.push(j.id); }
      if (j.id === "suitC" && c.s === 3){ dm += 3; by.push(j.id); }
      if (j.id === "face" && c.r >= 11 && c.r <= 13){ dc += 30; by.push(j.id); }
      if (j.id === "even" && c.r <= 10 && c.r % 2 === 0){ dm += 4; by.push(j.id); }
      if (j.id === "odd" && (c.r === 14 || (c.r <= 9 && c.r % 2 === 1))){ dc += 31; by.push(j.id); }
      if (j.id === "ace" && c.r === 14){ x *= 1.3; by.push(j.id); }
    }
    chips += dc; mult = (mult + dm) * x;
    steps.push({ k: "card", id: c.id, chips: dc, mult: dm, x, by, c: chips, m: mult });
  }
  // 手札に残したカード
  for (const c of held){
    for (const j of run.jk){
      if (j.id === "king" && c.r === 13){ mult *= 1.5; steps.push({ k: "held", id: c.id, j: j.id, x: 1.5, c: chips, m: mult }); }
      if (j.id === "mime"){ mult += 2; steps.push({ k: "held", id: c.id, j: j.id, mult: 2, c: chips, m: mult }); }
    }
  }
  // ジョーカー（左から順に）
  const lastPlay = R.plays === 1;
  for (const j of run.jk){
    let dc = 0, dm = 0, x = 1;
    switch (j.id){
      case "plus4": dm = 4; break;
      case "pairy": if (contains(ev.type, "p1")) dm = 8; break;
      case "trio": if (contains(ev.type, "k3")) dm = 12; break;
      case "lineup": if (contains(ev.type, "st")) dm = 12; break;
      case "paint": if (contains(ev.type, "fl")) dm = 10; break;
      case "small": if (cards.length <= 3) x = 2.5; break;
      case "last": if (lastPlay) x = 3; break;
      case "grow": dm = (j.n || 0) + (contains(ev.type, "p1") ? 1 : 0); break;
      case "stack": dc = (j.n || 0) + 4; break;
      case "saver": dc = 30 * R.discs; break;
      case "steady": x = 1.5; break;
      case "greed": x = Math.pow(1.15, run.jk.length); break;
    }
    if (dc || dm || x !== 1){ chips += dc; mult = (mult + dm) * x; steps.push({ k: "joker", j: j.id, chips: dc, mult: dm, x, c: chips, m: mult }); }
  }
  const total = Math.floor(chips * mult);
  return { type: ev.type, chips, mult, total, steps, scoringIds: scoring.map(c => c.id) };
}
ARC.pkScore = pkScore;
/** カードを出す */
function pkPlay(run, ids){
  const R = run.rd; if (!R || !ids.length || ids.length > 5 || R.plays <= 0) return null;
  const held = R.hand.filter(id => !ids.includes(id));
  const s = pkScore(run, ids, held);
  R.plays--; R.score += s.total; run.best = Math.max(run.best || 0, s.total);
  R.log.push({ t: s.type, total: s.total });
  for (const j of run.jk){ if (j.id === "grow" && contains(s.type, "p1")) j.n = (j.n || 0) + 1; if (j.id === "stack") j.n = (j.n || 0) + 4; }
  R.hand = held; pkDraw(run);
  s.cleared = R.score >= R.target; s.failed = !s.cleared && R.plays <= 0;
  if (s.cleared) pkClear(run); else if (s.failed){ run.over = true; }
  return s;
}
function pkDiscard(run, ids){
  const R = run.rd; if (!R || !ids.length || ids.length > 5 || R.discs <= 0) return false;
  R.discs--; R.hand = R.hand.filter(id => !ids.includes(id)); pkDraw(run); return true;
}
function pkClear(run){
  run.score += run.rd.score;
  if (run.blind === 2 && run.ante === 7){ run.won = true; run.over = true; return; }
  run.offer = pkMakeOffer(run);
}
function pkMakeOffer(run){
  const o = run.rs, out = [];
  const free = JK_IDS.filter(id => !has(run, id));
  const nJ = run.blind === 2 ? 2 : 2;
  const js = shuffle(o, free.slice()).slice(0, nJ).map(id => ({ k: "j", id }));
  out.push(...js);
  // 役のレベルアップ（ボスのあとは2段階）
  const t = HT[1 + ri(o, HT.length - 1)][0];
  out.push({ k: "lv", id: t, n: run.blind === 2 ? 2 : 1 });
  // デッキの改造
  const r = rnd(o);
  out.push(r < 0.5 ? { k: "cut", n: 3 } : { k: "dye", s: ri(o, 4), n: 3 });
  return out;
}
/** 報酬を受け取って次の患者へ。pick: offer の番号（-1 でスキップ）、arg: ジョーカーを入れ替えるときの位置 / 削るカード */
function pkTake(run, pick, arg){
  const it = pick >= 0 && run.offer ? run.offer[pick] : null;
  if (it){
    if (it.k === "j"){ if (run.jk.length >= 5){ if (arg == null || !run.jk[arg]) return false; run.jk.splice(arg, 1); } run.jk.push({ id: it.id }); }
    else if (it.k === "lv") run.lvl[it.id] = (run.lvl[it.id] || 0) + it.n;
    else if (it.k === "cut"){ const ids = (arg || []).slice(0, it.n); run.deck = run.deck.filter(c => !ids.includes(c.id)); }
    else if (it.k === "dye"){ const ids = (arg || []).slice(0, it.n); for (const c of run.deck) if (ids.includes(c.id)) c.s = it.s; }
  }
  run.offer = null;
  if (run.blind === 2){ run.ante++; run.blind = 0; } else run.blind++;
  run.rd = null;
  return true;
}
ARC.poker = { new: pkNew, start: pkStart, play: pkPlay, discard: pkDiscard, score: pkScore, take: pkTake, limits: pkLimits, target: pkTarget, card: cardById, contains };
})(typeof window !== "undefined" ? window : globalThis);
