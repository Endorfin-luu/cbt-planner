/* ============================================================
   ヨミの塔 — ルール（画面なし・node でも動く）
   - 敵は毎ターン A（攻め）と B（対応）を予告し、性格のルールでどちらか1つを実行する
   - 乱数は「気まぐれ」の性格と、ランの生成（マップ・敵・報酬）だけ。戦闘のダメージは固定
   - 状態はすべて JSON（保存・複製してプレビューやAIの先読みに使う）
   設計は YOMI.md
   ============================================================ */
"use strict";
(function(root){
const Y = root.YOMI = root.YOMI || {};

/* ---------- 乱数（mulberry32。状態 o.s を進める） ---------- */
function rnd(o){ let t = o.s = (o.s + 0x6D2B79F5) | 0; t = Math.imul(t ^ t >>> 15, 1 | t); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const ri = (o, n) => Math.floor(rnd(o) * n);
const pick = (o, a) => a[ri(o, a.length)];
function shuffle(o, a){ for (let i = a.length - 1; i > 0; i--){ const j = ri(o, i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function wpick(o, items, w){ let s = 0; for (const x of items) s += w(x); let r = rnd(o) * s; for (const x of items){ r -= w(x); if (r < 0) return x; } return items[items.length - 1]; }
const clone = x => JSON.parse(JSON.stringify(x));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
Y.rnd = rnd; Y.clone = clone;

/* ============================================================
   タイプ：炎 → 氷 → 草 → 雷 → 水 → 岩 → 炎（時計回り）
   時計回りに2つ先まで2倍・真向かいは等倍・それ以外（反時計回り2つと同じタイプ）は半分
   ============================================================ */
const TY = ["fire", "ice", "leaf", "volt", "water", "rock"];
const TN = { fire: "炎", ice: "氷", leaf: "草", volt: "雷", water: "水", rock: "岩", none: "無" };
const TC = { fire: "#ff7a3d", ice: "#8fe3ff", leaf: "#62d34f", volt: "#ffd447", water: "#4a90ff", rock: "#c49a62", none: "#b9b0cf" };
function eff(at, df){
  if (at === "none" || df === "none") return 1;
  const d = (TY.indexOf(df) - TY.indexOf(at) + 6) % 6;
  return d === 1 || d === 2 ? 2 : d === 3 ? 1 : 0.5;
}
Y.TY = TY; Y.TN = TN; Y.TC = TC; Y.eff = eff;

/* ============================================================
   技
   p 威力 / pr 優先度 / k: atk 攻撃・st 状態異常・buff 能力アップ・prot まもる・heal 回復・haz 設置・leech やどりぎ
   recoil 反動（与えたダメージの割合）/ drain 吸収 / pivot 攻撃して下がる / self 自分の能力変化 / tgt 相手の能力変化
   once 連続で使えない / yomi ヨミ技（必殺・まもる貫通）
   ============================================================ */
const MV = {
  tackle:   { n: "たいあたり",     t: "none",  p: 40, k: "atk" },
  quick:    { n: "でんこうせっか", t: "none",  p: 40, k: "atk", pr: 1 },
  bodyslam: { n: "のしかかり",     t: "none",  p: 75, k: "atk" },
  uturn:    { n: "とんぼがえり",   t: "none",  p: 55, k: "atk", pivot: 1 },
  giga:     { n: "ギガインパクト", t: "none",  p: 120, k: "atk", recoil: 1/3 },
  protect:  { n: "まもる",         t: "none",  k: "prot", pr: 4, once: 1 },
  sharpen:  { n: "つめとぎ",       t: "none",  k: "buff", self: { a: 1 } },
  swords:   { n: "つるぎのまい",   t: "none",  k: "buff", self: { a: 2 } },
  agility:  { n: "こうそくいどう", t: "none",  k: "buff", self: { s: 2 } },
  harden:   { n: "てっぺき",       t: "none",  k: "buff", self: { d: 2 } },
  recover:  { n: "じこさいせい",   t: "none",  k: "heal", heal: .5, once: 1, max: 2 },
  spikes:   { n: "まきびし",       t: "none",  k: "haz" },

  ember:    { n: "ひのこ",         t: "fire",  p: 40, k: "atk" },
  nitro:    { n: "ニトロチャージ", t: "fire",  p: 50, k: "atk", self: { s: 1 } },
  fwheel:   { n: "かえんぐるま",   t: "fire",  p: 65, k: "atk" },
  flame:    { n: "かえんほうしゃ", t: "fire",  p: 80, k: "atk" },
  overheat: { n: "オーバーヒート", t: "fire",  p: 125, k: "atk", self: { a: -2 } },
  wisp:     { n: "おにび",         t: "fire",  k: "st", st: "brn" },

  powder:   { n: "こなゆき",       t: "ice",   p: 40, k: "atk" },
  shard:    { n: "こおりのつぶて", t: "ice",   p: 40, k: "atk", pr: 1 },
  icywind:  { n: "こごえるかぜ",   t: "ice",   p: 55, k: "atk", tgt: { s: -1 } },
  ifang:    { n: "こおりのキバ",   t: "ice",   p: 65, k: "atk" },
  icebeam:  { n: "れいとうビーム", t: "ice",   p: 80, k: "atk" },
  blizzard: { n: "ふぶき",         t: "ice",   p: 115, k: "atk", self: { d: -1 } },

  leaf:     { n: "はっぱカッター", t: "leaf",  p: 45, k: "atk" },
  drain:    { n: "ギガドレイン",   t: "leaf",  p: 60, k: "atk", drain: .5 },
  blade:    { n: "リーフブレード", t: "leaf",  p: 80, k: "atk" },
  hammer:   { n: "ウッドハンマー", t: "leaf",  p: 120, k: "atk", recoil: 1/3 },
  poison:   { n: "どくのこな",     t: "leaf",  k: "st", st: "psn" },
  seed:     { n: "やどりぎのタネ", t: "leaf",  k: "leech" },

  shock:    { n: "でんきショック", t: "volt",  p: 40, k: "atk" },
  vswitch:  { n: "ボルトチェンジ", t: "volt",  p: 60, k: "atk", pivot: 1 },
  spark:    { n: "スパーク",       t: "volt",  p: 65, k: "atk" },
  bolt:     { n: "10まんボルト",   t: "volt",  p: 80, k: "atk" },
  thunder:  { n: "かみなり",       t: "volt",  p: 115, k: "atk", self: { d: -1 } },
  twave:    { n: "でんじは",       t: "volt",  k: "st", st: "par" },

  wgun:     { n: "みずでっぽう",   t: "water", p: 40, k: "atk" },
  jet:      { n: "アクアジェット", t: "water", p: 40, k: "atk", pr: 1 },
  scald:    { n: "ねっとう",       t: "water", p: 55, k: "atk", tgt: { a: -1 } },
  atail:    { n: "アクアテール",   t: "water", p: 65, k: "atk" },
  surf:     { n: "なみのり",       t: "water", p: 80, k: "atk" },
  crab:     { n: "クラブハンマー", t: "water", p: 90, k: "atk" },
  hydro:    { n: "ハイドロポンプ", t: "water", p: 120, k: "atk", self: { a: -1 } },

  rthrow:   { n: "いわおとし",     t: "rock",  p: 45, k: "atk" },
  tomb:     { n: "がんせきふうじ", t: "rock",  p: 55, k: "atk", tgt: { s: -1 } },
  slide:    { n: "いわなだれ",     t: "rock",  p: 65, k: "atk" },
  edge:     { n: "ストーンエッジ", t: "rock",  p: 95, k: "atk" },
  smash:    { n: "もろはのずつき", t: "rock",  p: 135, k: "atk", recoil: 1/2 },
  srock:    { n: "ステルスロック", t: "rock",  k: "haz" },

  /* ヨミ技（ゲージ3・まもるを貫通） */
  y_fire:   { n: "紅蓮のヨミ",     t: "fire",  p: 130, k: "atk", yomi: 1, st: "brn", d: "相手をやけどにする" },
  y_ice:    { n: "氷華のヨミ",     t: "ice",   p: 130, k: "atk", yomi: 1, tgt: { s: -2 }, d: "相手の素早さを2段階下げる" },
  y_leaf:   { n: "樹海のヨミ",     t: "leaf",  p: 130, k: "atk", yomi: 1, drain: .5, d: "与えたダメージの半分を回復" },
  y_volt:   { n: "迅雷のヨミ",     t: "volt",  p: 130, k: "atk", yomi: 1, pr: 2, d: "必ず先に動く" },
  y_water:  { n: "大海のヨミ",     t: "water", p: 130, k: "atk", yomi: 1, heal: .25, d: "最大HPの1/4を回復" },
  y_rock:   { n: "天岩のヨミ",     t: "rock",  p: 130, k: "atk", yomi: 1, haz: 1, d: "相手の場にステルスロックを置く" },
  y_any:    { n: "ヨミうち",       t: "self",  p: 120, k: "atk", yomi: 1, d: "自分のタイプで攻撃" },
  y_king:   { n: "王のヨミ",       t: "self",  p: 100, k: "atk", d: "自分のいまのタイプで攻撃" },
};
for (const [id, m] of Object.entries(MV)) m.id = id;
Y.MV = MV;
const isAtk = m => m.k === "atk";

/* ============================================================
   性格（A/B の選び方）
   tier: 出てくる層（1〜3）。boss はボス専用
   ============================================================ */
const PE = {
  tanki:     { n: "短気",       tier: 1, d: "いつも A" },
  okubyo:    { n: "臆病",       tier: 1, d: "自分のHPが半分以下か、あなたの場のモンスターが2倍の技を持っていると B。それ以外は A" },
  ganko:     { n: "頑固",       tier: 1, d: "前のターンと同じ記号（出てきた最初のターンは A）" },
  amanojaku: { n: "天邪鬼",     tier: 2, d: "あなたが前のターンに攻撃技を使っていたら B、それ以外（交代・変化技・まもる）なら A" },
  mieppari:  { n: "見栄っ張り", tier: 2, d: "A で倒せるか、A が2倍で入るなら A。それ以外は B" },
  kimagure:  { n: "気まぐれ",   tier: 2, d: "毎ターン半々" },
  richigi:   { n: "律儀",       tier: 2, d: "A と B を1ターンごとに交互に出す（出てきた最初のターンは A）" },
  shincho:   { n: "慎重",       tier: 3, d: "あなたの場のモンスターの方が速ければ B、同じか遅ければ A" },
  shunen:    { n: "執念",       tier: 3, d: "前のターンにダメージを受けていたら A（やり返す）、受けていなければ B" },
  sakushi:   { n: "策士",       tier: 3, d: "あなたが前のターンと同じ行動をすると読んで、それに強い方を選ぶ（最初は A）" },
  ounome:    { n: "王の眼",     tier: 9, d: "このバトルであなたがいちばん多く選んだ種類（攻撃か、それ以外か）を読んで、それに強い方を選ぶ" },
};
Y.PE = PE;

/* ============================================================
   種族
   b: [HP, 攻撃, 防御, 素早さ] / evo: [レベル, 進化先] / L: 覚える技 [レベル, 技] / pool: 技マスで覚えられる技
   pe: なりやすい性格 / y: ヨミ技 / stage: 1〜3（敵の出る層の目安）/ role: 役割の説明
   ============================================================ */
const SP = {
  // ---- 炎：アタッカー
  hibachi:   { n: "ヒバチ",       t: "fire",  stage: 1, b: [70, 86, 60, 84],  evo: [9, "kaenjishi"], line: "fire3", y: "y_fire", pe: ["tanki", "mieppari", "shunen"], role: "攻撃と素早さが高いアタッカー",
               L: [[1, "ember"], [1, "tackle"], [4, "sharpen"], [6, "fwheel"], [9, "nitro"], [12, "flame"], [15, "wisp"], [18, "quick"], [21, "overheat"]], pool: ["uturn", "protect", "tomb", "bodyslam", "swords"] },
  kaenjishi: { n: "カエンジシ",   t: "fire",  stage: 2, b: [85, 110, 75, 110], evo: [16, "glenoh"], line: "fire3", y: "y_fire", pe: ["tanki", "mieppari", "shunen"], role: "攻撃と素早さが高いアタッカー" },
  glenoh:    { n: "グレンオウ",   t: "fire",  stage: 3, b: [100, 135, 90, 135], line: "fire3", y: "y_fire", pe: ["tanki", "mieppari", "shunen"], role: "攻撃と素早さが高いアタッカー" },
  // ---- 氷：重いアタッカー
  yukinbo:   { n: "ユキンボ",     t: "ice",   stage: 1, b: [86, 76, 84, 54],  evo: [9, "tsuraragma"], line: "ice3", y: "y_ice", pe: ["ganko", "shincho", "okubyo"], role: "HPと防御が高い。打たれながら殴る",
               L: [[1, "powder"], [1, "tackle"], [4, "harden"], [6, "ifang"], [9, "icywind"], [11, "shard"], [13, "icebeam"], [17, "recover"], [21, "blizzard"]], pool: ["tomb", "protect", "bodyslam", "srock", "surf"] },
  tsuraragma:{ n: "ツララグマ",   t: "ice",   stage: 2, b: [106, 96, 108, 70], evo: [16, "hyogaoh"], line: "ice3", y: "y_ice", pe: ["ganko", "shincho", "okubyo"], role: "HPと防御が高い。打たれながら殴る" },
  hyogaoh:   { n: "ヒョウガオウ", t: "ice",   stage: 3, b: [126, 116, 132, 86], line: "ice3", y: "y_ice", pe: ["ganko", "shincho", "okubyo"], role: "HPと防御が高い。打たれながら殴る" },
  // ---- 草：粘り・状態異常
  mebuki:    { n: "メブキ",       t: "leaf",  stage: 1, b: [80, 72, 78, 70],  evo: [9, "tsutatokage"], line: "leaf3", y: "y_leaf", pe: ["shincho", "ganko", "sakushi"], role: "吸収と毒で粘る",
               L: [[1, "leaf"], [1, "tackle"], [4, "poison"], [6, "drain"], [9, "seed"], [12, "blade"], [16, "protect"], [20, "hammer"]], pool: ["recover", "tomb", "uturn", "sharpen", "spikes"] },
  tsutatokage:{ n: "ツタトカゲ",  t: "leaf",  stage: 2, b: [100, 92, 95, 93], evo: [16, "jukairyu"], line: "leaf3", y: "y_leaf", pe: ["shincho", "ganko", "sakushi"], role: "吸収と毒で粘る" },
  jukairyu:  { n: "ジュカイリュウ", t: "leaf", stage: 3, b: [120, 112, 114, 114], line: "leaf3", y: "y_leaf", pe: ["shincho", "ganko", "sakushi"], role: "吸収と毒で粘る" },
  // ---- 雷：速い交代役
  pachitto:  { n: "パチット",     t: "volt",  stage: 1, b: [64, 80, 56, 100], evo: [9, "inazumaru"], line: "volt3", y: "y_volt", pe: ["kimagure", "amanojaku", "okubyo"], role: "とても速い。攻撃して下がる交代役",
               L: [[1, "shock"], [1, "quick"], [4, "twave"], [6, "spark"], [9, "vswitch"], [11, "agility"], [13, "bolt"], [18, "uturn"], [21, "thunder"]], pool: ["icywind", "protect", "nitro", "tackle", "swords"] },
  inazumaru: { n: "イナズマル",   t: "volt",  stage: 2, b: [80, 100, 70, 130], evo: [16, "raijinga"], line: "volt3", y: "y_volt", pe: ["kimagure", "amanojaku", "okubyo"], role: "とても速い。攻撃して下がる交代役" },
  raijinga:  { n: "ライジンガ",   t: "volt",  stage: 3, b: [95, 120, 85, 160], line: "volt3", y: "y_volt", pe: ["kimagure", "amanojaku", "okubyo"], role: "とても速い。攻撃して下がる交代役" },
  // ---- 水：バランス・先制
  shizuku:   { n: "シズク",       t: "water", stage: 1, b: [80, 76, 76, 68],  evo: [9, "namiazara"], line: "water3", y: "y_water", pe: ["okubyo", "sakushi", "amanojaku"], role: "なんでもできる。先制技を持つ",
               L: [[1, "wgun"], [1, "tackle"], [4, "jet"], [6, "atail"], [9, "scald"], [10, "protect"], [13, "surf"], [17, "recover"], [21, "hydro"]], pool: ["icebeam", "icywind", "uturn", "harden", "powder"] },
  namiazara: { n: "ナミアザラ",   t: "water", stage: 2, b: [100, 95, 95, 90], evo: [16, "watatsumi"], line: "water3", y: "y_water", pe: ["okubyo", "sakushi", "amanojaku"], role: "なんでもできる。先制技を持つ" },
  watatsumi: { n: "ワダツミ",     t: "water", stage: 3, b: [120, 115, 115, 110], line: "water3", y: "y_water", pe: ["okubyo", "sakushi", "amanojaku"], role: "なんでもできる。先制技を持つ" },
  // ---- 岩：壁・設置
  koishi:    { n: "コイシ",       t: "rock",  stage: 1, b: [86, 86, 94, 34],  evo: [9, "iwagoron"], line: "rock3", y: "y_rock", pe: ["ganko", "tanki", "shunen"], role: "硬くて遅い。ステルスロックで交代を咎める",
               L: [[1, "rthrow"], [1, "tackle"], [4, "harden"], [6, "slide"], [8, "srock"], [10, "tomb"], [13, "edge"], [17, "bodyslam"], [21, "smash"]], pool: ["protect", "recover", "sharpen", "flame", "swords"] },
  iwagoron:  { n: "イワゴロン",   t: "rock",  stage: 2, b: [106, 110, 124, 40], evo: [16, "gantetsu"], line: "rock3", y: "y_rock", pe: ["ganko", "tanki", "shunen"], role: "硬くて遅い。ステルスロックで交代を咎める" },
  gantetsu:  { n: "ガンテツ",     t: "rock",  stage: 3, b: [126, 136, 154, 44], line: "rock3", y: "y_rock", pe: ["ganko", "tanki", "shunen"], role: "硬くて遅い。ステルスロックで交代を咎める" },
  // ---- 2段階の系統
  hotarubi:  { n: "ホタルビ",     t: "fire",  stage: 1, b: [60, 66, 60, 114], evo: [12, "onibidori"], line: "fire2", y: "y_any", pe: ["kimagure", "amanojaku", "sakushi"], role: "速い。おにびで相手の攻撃を落とす",
               L: [[1, "ember"], [1, "quick"], [4, "wisp"], [6, "fwheel"], [9, "uturn"], [12, "flame"], [16, "protect"], [20, "overheat"]], pool: ["agility", "nitro", "twave", "recover"] },
  onibidori: { n: "オニビドリ",   t: "fire",  stage: 2, b: [76, 90, 76, 158], line: "fire2", y: "y_any", pe: ["kimagure", "amanojaku", "sakushi"], role: "速い。おにびで相手の攻撃を落とす" },
  hasamigani:{ n: "ハサミガニ",   t: "water", stage: 1, b: [70, 96, 100, 34], evo: [12, "yoroigani"], line: "water2", y: "y_any", pe: ["ganko", "richigi", "shincho"], role: "硬い。つめとぎから殴る",
               L: [[1, "wgun"], [1, "harden"], [4, "rthrow"], [6, "atail"], [9, "jet"], [12, "crab"], [16, "swords"], [20, "hydro"]], pool: ["protect", "tomb", "bodyslam", "edge"] },
  yoroigani: { n: "ヨロイガニ",   t: "water", stage: 2, b: [90, 128, 134, 48], line: "water2", y: "y_any", pe: ["ganko", "richigi", "shincho"], role: "硬い。つめとぎから殴る" },
  tsuchimogu:{ n: "ツチモグ",     t: "rock",  stage: 1, b: [66, 90, 70, 74],  evo: [12, "drillmogu"], line: "rock2", y: "y_any", pe: ["okubyo", "kimagure", "shunen"], role: "まきびしを撒いて、攻撃して下がる",
               L: [[1, "rthrow"], [1, "spikes"], [4, "quick"], [6, "slide"], [9, "tomb"], [12, "uturn"], [16, "edge"], [20, "smash"]], pool: ["protect", "swords", "bodyslam", "nitro"] },
  drillmogu: { n: "ドリルモグ",   t: "rock",  stage: 2, b: [86, 122, 90, 104], line: "rock2", y: "y_any", pe: ["okubyo", "kimagure", "shunen"], role: "まきびしを撒いて、攻撃して下がる" },
  togepod:   { n: "トゲポッド",   t: "leaf",  stage: 1, b: [92, 64, 96, 48],  evo: [12, "sabotenoh"], line: "leaf2", y: "y_any", pe: ["ganko", "shincho", "sakushi"], role: "やどりぎと回復でしぶとく居座る",
               L: [[1, "leaf"], [1, "poison"], [4, "seed"], [6, "drain"], [9, "protect"], [13, "blade"], [16, "recover"], [20, "hammer"]], pool: ["spikes", "harden", "tomb", "bodyslam"] },
  sabotenoh: { n: "サボテンオー", t: "leaf",  stage: 2, b: [118, 86, 126, 72], line: "leaf2", y: "y_any", pe: ["ganko", "shincho", "sakushi"], role: "やどりぎと回復でしぶとく居座る" },
  denden:    { n: "デンデン",     t: "volt",  stage: 1, b: [86, 70, 100, 44], evo: [12, "raidenmai"], line: "volt2", y: "y_any", pe: ["ganko", "shincho", "okubyo"], role: "遅くて硬い。でんじはで足を止める",
               L: [[1, "shock"], [1, "harden"], [4, "twave"], [6, "spark"], [9, "vswitch"], [12, "bolt"], [16, "recover"], [20, "thunder"]], pool: ["protect", "surf", "bodyslam", "icywind"] },
  raidenmai: { n: "ライデンマイ", t: "volt",  stage: 2, b: [112, 94, 134, 60], line: "volt2", y: "y_any", pe: ["ganko", "shincho", "okubyo"], role: "遅くて硬い。でんじはで足を止める" },
  koriuo:    { n: "コオリウオ",   t: "ice",   stage: 1, b: [60, 86, 56, 98],  evo: [12, "tsurarazame"], line: "ice2", y: "y_any", pe: ["tanki", "mieppari", "kimagure"], role: "速い。先制技で削り切る",
               L: [[1, "powder"], [1, "jet"], [4, "shard"], [6, "ifang"], [9, "icywind"], [12, "icebeam"], [16, "agility"], [20, "blizzard"]], pool: ["surf", "protect", "swords", "uturn"] },
  tsurarazame:{ n: "ツララザメ",  t: "ice",   stage: 2, b: [80, 118, 74, 128], line: "ice2", y: "y_any", pe: ["tanki", "mieppari", "kimagure"], role: "速い。先制技で削り切る" },
  // ---- ボス
  b_moss:    { n: "苔の番人",     t: "rock",  stage: 9, boss: 1, b: [140, 104, 108, 40], pe: ["richigi"], role: "1層の主", y: "y_rock", moves: ["edge", "tomb", "harden", "bodyslam"] },
  b_witch:   { n: "鏡の魔女",     t: "ice",   stage: 9, boss: 1, b: [140, 118, 110, 112], pe: ["amanojaku"], role: "2層の主", y: "y_ice", moves: ["icebeam", "icywind", "protect", "recover"] },
  b_thunder: { n: "雷帝ナルカミ", t: "volt",  stage: 9, boss: 1, b: [160, 134, 118, 36], pe: ["shunen", "shincho"], role: "3層の主", y: "y_volt", moves: ["bolt", "vswitch", "thunder", "agility"] },
  b_king:    { n: "ヨミの王",     t: "none",  stage: 9, boss: 1, b: [180, 128, 128, 118], pe: ["ounome"], role: "塔の頂上", y: "y_king", moves: ["y_king", "bodyslam", "protect", "sharpen"] },
};
// 進化先は進化前の技表・技マスを引き継ぐ
for (const [id, s] of Object.entries(SP)){ s.id = id; }
for (const s of Object.values(SP)) if (s.evo){ let to = SP[s.evo[1]]; while (to){ to.L ||= s.L; to.pool ||= s.pool; to.root ||= s.root || s.id; to = to.evo ? SP[to.evo[1]] : null; } s.root ||= s.id; }
Y.SP = SP;
Y.STARTERS = ["hibachi", "shizuku", "mebuki", "yukinbo", "pachitto", "koishi"];

/* ============================================================
   持ち物（1体に1つ）と秘宝（チーム全体）
   ============================================================ */
const IT = {
  charm:   { n: "得意の珠",         d: "自分と同じタイプの技の威力 ×1.2", price: 70 },
  sash:    { n: "きあいのハチマキ", d: "HP満タンから倒される攻撃を受けても、1戦に1回だけHP1で耐える", price: 70 },
  left:    { n: "たべのこし",       d: "毎ターンの終わりに最大HPの1/16回復", price: 70 },
  claw:    { n: "せんせいのツメ",   d: "場に出た最初のターン、同じ優先度なら先に動く", price: 55 },
  wpolicy: { n: "じゃくてんほけん", d: "2倍の技を受けると攻撃が2段階上がる（1戦1回）", price: 60 },
  shield:  { n: "受けの盾",         d: "交代で出たターン、受けるダメージ −40%", price: 60 },
  orb:     { n: "いのちのたま",     d: "技の威力 ×1.3。攻撃するたび最大HPの1/10減る", price: 75 },
  band:    { n: "こだわりハチマキ", d: "攻撃 ×1.5。下がるまで最初に選んだ技しか使えない", price: 75 },
  bell:    { n: "読みの鈴",         d: "場にいて読み勝ちしたターン、最大HPの1/6回復", price: 55 },
  feather: { n: "はやてのはね",     d: "素早さ ×1.2", price: 55 },
  shell:   { n: "てつのこうら",     d: "防御 ×1.3、素早さ ×0.8", price: 55 },
  glasses: { n: "先読みメガネ",     d: "場にいるとき、1戦に1回だけ看破のゲージを使わない", price: 55 },
};
for (const [id, x] of Object.entries(IT)) x.id = id;
const RL = {
  beads:   { n: "読心の数珠",   d: "バトル開始時、ヨミゲージ+1" },
  bellr:   { n: "共鳴の鐘",     d: "読み勝ちしたとき、ゲージがもう1つ溜まる" },
  whistle: { n: "撤退の笛",     d: "交代で下がった仲間は最大HPの1/8回復" },
  flag:    { n: "番兵の旗",     d: "相手が交代するたび、出てきた相手に最大HPの1/10ダメージ" },
  cup:     { n: "勝利の杯",     d: "バトルに勝つたび、全員が最大HPの15%回復" },
  book:    { n: "学びの書",     d: "もらえる経験値 +30%" },
  whet:    { n: "研ぎ石",       d: "攻撃技の威力 +10%" },
  stone:   { n: "堅牢の石",     d: "受けるダメージ −10%" },
  wing:    { n: "疾風の羽",     d: "仲間全員の素早さ +10%" },
  eye:     { n: "看破の眼",     d: "1戦に1回、看破のゲージを使わない" },
  seal:    { n: "必殺の印",     d: "必殺がゲージ2で使える" },
  banner:  { n: "先手の旗",     d: "各バトルの最初のターン、同じ優先度なら先に動く" },
  phoenix: { n: "不死鳥の羽",   d: "ラン中1回、最後の1体が倒れたときHP50%で立ち上がる" },
  cat:     { n: "招き猫",       d: "もらえるコイン +50%" },
  crown:   { n: "王冠の欠片",   d: "強敵と層の主に与えるダメージ +15%" },
  mirror:  { n: "写し鏡",       d: "敵の性格の候補が1つ少ない状態で始まる" },
  sand:    { n: "砂時計",       d: "バトル開始時、相手の先頭の性格を見抜いている" },
};
for (const [id, x] of Object.entries(RL)) x.id = id;
Y.IT = IT; Y.RL = RL;
Y.CON = { potion: { n: "キズぐすり", d: "1体のHPを最大HPの50%回復", price: 25 }, revive: { n: "げんきのかけら", d: "倒れた1体をHP50%で復活", price: 40 } };

/* ============================================================
   能力・ダメージ
   ============================================================ */
const lvF = lv => 0.5 + lv / 20;
function calcStats(sp, lv){
  const s = SP[sp], f = lvF(lv);
  return { mhp: Math.floor(s.b[0] * f) + lv + 6, a: Math.floor(s.b[1] * f), d: Math.floor(s.b[2] * f), s: Math.floor(s.b[3] * f) };
}
Y.calcStats = calcStats;
const STG = [1/2, 2/3, 1, 1.5, 2];  // -2..+2
const stg = v => STG[clamp(v, -2, 2) + 2];
const K = 0.46;

function monType(m){ return m.ty || SP[m.sp].t; }
function moveType(m, mv){ return mv.t === "self" ? monType(m) : mv.t; }
function spdOf(B, side, m){
  let v = m.s * stg(m.stg.s);
  if (m.status === "par") v *= .5;
  if (m.item === "feather") v *= 1.2;
  if (m.item === "shell") v *= .8;
  if (side === "P" && B.rel.wing) v *= 1.1;
  return v;
}
/** 1回の攻撃のダメージ（副作用なし）。info に倍率などを入れて返す */
function dmgCalc(B, aSide, att, def, mv, defSwitchedIn){
  const t = moveType(att, mv), e = eff(t, monType(def));
  let p = mv.p;
  if (t === monType(att) && t !== "none") p *= 1.25;
  if (att.item === "charm" && t === monType(att)) p *= 1.2;
  if (att.item === "orb") p *= 1.3;
  if (aSide === "P" && B.rel.whet) p *= 1.1;
  if (aSide === "P" && B.rel.crown && B.kind !== "wild") p *= 1.15;
  if (B.rules.boost && B.rules.boost[t] && aSide === "E") p *= B.rules.boost[t];
  if (B.rules.boostAll && B.rules.boostAll[t]) p *= B.rules.boostAll[t];
  let A = att.a * stg(att.stg.a); if (att.status === "brn") A *= .5; if (att.item === "band") A *= 1.5;
  let D = def.d * stg(def.stg.d); if (def.item === "shell") D *= 1.3;
  let dmg = p * (A / D) * lvF(att.lv) * K * e;
  if (aSide === "E" && B.rel.stone) dmg *= .9;
  if (defSwitchedIn && def.item === "shield") dmg *= .6;
  dmg = Math.max(1, Math.floor(dmg));
  return { dmg, e, t };
}
Y.dmgCalc = dmgCalc;

/* ============================================================
   バトル
   ============================================================ */
function mkBattleMon(src, side, opts = {}){
  const st = calcStats(src.sp, src.lv);
  const s = SP[src.sp];
  return {
    uid: src.uid ?? null, sp: src.sp, lv: src.lv, mhp: Math.floor(st.mhp * (opts.hpMul || 1)), hp: 0,
    a: st.a, d: st.d, s: st.s, moves: src.moves.slice(), item: src.item || null,
    stg: { a: 0, d: 0, s: 0 }, status: null, lastM: null, lastL: null, entered: 0, hurt: false,
    sashUsed: false, wpUsed: false, choice: null, leech: null, prot: false, protPrev: false,
    pers: opts.pers || null, cand: opts.cand || null, boss: !!s.boss, ty: null, phase: 0,
  };
}
/** 敵の個体をつくる */
function mkEnemy(o, sp, lv, floor, opts = {}){
  const s = SP[sp];
  let moves = s.moves ? s.moves.slice() : learnedMoves(sp, lv);
  if (opts.extra && !s.moves){ const pool = (s.pool || []).filter(m => !moves.includes(m) && isAtk(MV[m])); if (pool.length){ if (moves.length >= 4) moves[ri(o, 2)] = pick(o, pool); else moves.push(pick(o, pool)); } }
  const tierMax = floor >= 2 ? 3 : floor >= 1 ? 2 : 1;
  let pool = s.pe.filter(p => PE[p].tier <= tierMax || s.boss);
  if (!pool.length) pool = ["tanki"];
  const pers = opts.pers || pick(o, pool);
  let cand = opts.cand || pool.slice();
  if (!cand.includes(pers)) cand.push(pers);
  return { sp, lv, moves, item: opts.item || null, pers, cand, hpMul: opts.hpMul || 1 };
}
function learnedMoves(sp, lv){
  const L = SP[sp].L || [];
  const got = L.filter(x => x[0] <= lv).map(x => x[1]);
  // 新しく覚えた順に4つ。ただし攻撃技が最低2つになるように
  let moves = [...new Set(got)].slice(-4);
  const atks = [...new Set(got)].filter(m => isAtk(MV[m]));
  if (moves.filter(m => isAtk(MV[m])).length < 2){ for (const m of atks.slice().reverse()) if (!moves.includes(m)){ const i = moves.findIndex(x => !isAtk(MV[x])); if (i >= 0) moves[i] = m; if (moves.filter(x => isAtk(MV[x])).length >= 2) break; } }
  return moves;
}
Y.learnedMoves = learnedMoves;

/**
 * バトルをはじめる
 * party: 連れていく自分の仲間（{uid,sp,lv,hp,moves,item}）の配列（先頭が最初に出る）
 * foes: 敵（mkEnemy の結果）の配列
 */
function newBattle(run, party, foes, kind, rules = {}){
  const rel = {}; for (const r of run.relics || []) rel[r] = 1;
  const B = {
    s: (rnd(run) * 2 ** 31) | 0, t: 0, kind, rules, rel,
    P: { team: party.map(p => { const m = mkBattleMon(p, "P"); m.hp = Math.min(m.mhp, p.hp); return m; }), act: 0, gauge: rel.beads ? 1 : 0, haz: false, eyeUsed: false, glUsed: false, last: null, hist: { atk: 0, oth: 0 }, peek: false },
    E: { team: foes.map(f => { const m = mkBattleMon(f, "E", { pers: f.pers, cand: f.cand.slice(), hpMul: f.hpMul }); m.hp = m.mhp; return m; }), act: 0, haz: false },
    intent: null, need: null, over: null, log: [], ev: [], phoenix: !!rel.phoenix && !run.phoenixUsed,
  };
  // 先頭が倒れていたら、生きている最初の仲間を出す
  B.P.act = Math.max(0, B.P.team.findIndex(m => m.hp > 0));
  if (rel.mirror) for (const e of B.E.team) if (e.cand.length > 1){ const wrong = e.cand.filter(c => c !== e.pers); if (wrong.length) e.cand.splice(e.cand.indexOf(wrong[0]), 1); }
  if (rel.sand){ const e = B.E.team[0]; e.cand = [e.pers]; }
  for (const side of ["P", "E"]) act(B, side).entered = 0;
  startTurn(B);
  return B;
}
Y.newBattle = newBattle;

const act = (B, side) => B[side].team[B[side].act];
const other = s => s === "P" ? "E" : "P";
const alive = m => m && m.hp > 0;
const bench = (B, side) => B[side].team.map((m, i) => i).filter(i => i !== B[side].act && alive(B[side].team[i]));
Y.act = act; Y.bench = bench;

/* ---------- 使える技 ---------- */
function usable(m, id){
  const mv = MV[id];
  if (!mv) return false;
  if (mv.once && m.lastM === id) return false;
  if (mv.max && (m.used?.[id] || 0) >= mv.max) return false;
  if (m.choice && m.choice !== id) return false;
  return true;
}
Y.usable = usable;
function yomiMove(B){ const m = act(B, "P"); return SP[m.sp].y || "y_any"; }
Y.yomiMove = yomiMove;
const yomiCost = B => B.rel.seal ? 2 : 3;
Y.yomiCost = yomiCost;

/* ============================================================
   敵の予告（A＝攻め・B＝対応）
   ============================================================ */
function estDmg(B, aSide, att, def, id, swIn){ const mv = MV[id]; if (!isAtk(mv)) return 0; return dmgCalc(B, aSide, att, def, mv, swIn).dmg; }
/** att が def に撃てるいちばん痛い技（使える技だけ） */
function bestHit(B, aSide, att, def, swIn){
  let best = null, bd = -1;
  for (const id of att.moves){ if (!usable(att, id) || !isAtk(MV[id])) continue; const d = estDmg(B, aSide, att, def, id, swIn); const sc = Math.min(d, def.hp) + (MV[id].pr || 0) * 3; if (sc > bd){ bd = sc; best = id; } }
  return { id: best, dmg: best ? estDmg(B, aSide, att, def, best, swIn) : 0 };
}
/** 相手から見た「この子を出したときの相性」（大きいほど有利） */
function matchup(B, side, m, foe){
  const mine = bestHit(B, side, m, foe).dmg / Math.max(1, foe.hp);
  const theirs = bestHit(B, other(side), foe, m, true).dmg / Math.max(1, m.hp);
  return mine - theirs * 1.1;
}
function bestSwitch(B, side, foe, exclude){
  let bi = null, bs = -Infinity;
  for (const i of bench(B, side)){ if (i === exclude) continue; const sc = matchup(B, side, B[side].team[i], foe); if (sc > bs){ bs = sc; bi = i; } }
  return bi;
}
Y.bestSwitch = bestSwitch;

function planIntents(B){
  const e = act(B, "E"), p = act(B, "P");
  // A：今の相手にいちばん効く攻撃
  const hit = bestHit(B, "E", e, p);
  let A = hit.id ? { k: "move", m: hit.id } : null;
  const opts = [];
  // B の候補1：交代（今の相手に不利なら）
  const threat = bestHit(B, "P", p, e).dmg / Math.max(1, e.hp);
  const sw = bestSwitch(B, "E", p);
  if (sw != null){
    const to = B.E.team[sw];
    const gain = threat - bestHit(B, "P", p, to, true).dmg / Math.max(1, to.hp);
    opts.push({ a: { k: "sw", to: sw }, sc: gain * 1.3 + (e.hp < e.mhp * .5 ? .15 : 0) + (B.P.haz ? 0 : 0) - (B.E.haz ? .12 : 0) });
  }
  // 候補2：あなたの交代先を狙う技
  if (A){
    const pb = bench(B, "P");
    let wall = null, wv = Infinity;
    for (const i of pb){ const m = B.P.team[i]; const d = estDmg(B, "E", e, m, A.m, true) / Math.max(1, m.hp); if (d < wv){ wv = d; wall = m; } }
    if (wall && wv < .25){
      let bm = null, bd = 0;
      for (const id of e.moves){ if (id === A.m || !usable(e, id) || !isAtk(MV[id])) continue; const d = estDmg(B, "E", e, wall, id, true) / Math.max(1, wall.hp); if (d > bd){ bd = d; bm = id; } }
      if (bm && bd > wv * 1.6) opts.push({ a: { k: "move", m: bm }, sc: (bd - wv) * .8 + .05 });
    }
  }
  // 候補3：変化技
  for (const id of e.moves){
    const mv = MV[id]; if (!usable(e, id) || isAtk(mv)) continue;
    let sc = 0;
    if (mv.k === "heal") sc = e.hp < e.mhp * .6 ? .5 - e.hp / e.mhp * .4 : -1;
    else if (mv.k === "prot") sc = .18 + (p.status === "psn" || p.status === "brn" || p.leech ? .2 : 0) + (e.hp < e.mhp * .35 ? .1 : 0);
    else if (mv.k === "buff"){ const k = Object.keys(mv.self)[0]; sc = e.stg[k] >= 2 ? -1 : (e.hp / e.mhp) * .45 - threat * .5; }
    else if (mv.k === "st"){ const ok = canStatus(p, mv.st); sc = ok ? .32 + (mv.st === "brn" && p.a > p.d ? .15 : 0) : -1; }
    else if (mv.k === "haz") sc = B.P.haz ? -1 : .28 + bench(B, "P").length * .06;
    else if (mv.k === "leech") sc = p.leech ? -1 : .3;
    if (sc > 0) opts.push({ a: { k: "move", m: id }, sc });
  }
  // 候補4：2番目に痛い攻撃（ほかに何もないとき）
  if (A){ for (const id of e.moves){ if (id === A.m || !usable(e, id) || !isAtk(MV[id])) continue; opts.push({ a: { k: "move", m: id }, sc: -.5 + estDmg(B, "E", e, p, id) / Math.max(1, p.hp) * .2 }); } }
  opts.sort((x, y) => y.sc - x.sc);
  let Bo = opts.find(o => !A || o.a.k !== A.k || o.a.m !== A.m);
  if (!A){ A = Bo ? Bo.a : { k: "move", m: e.moves[0] }; Bo = opts.find(o => o.a !== A) || null; }
  const Bact = Bo ? Bo.a : A;
  B.intent = { A, B: Bact, letter: null, pred: {}, peek: false };
  // 性格の判定（ターンのはじめの状態で）
  for (const c of e.cand) B.intent.pred[c] = persChoose(B, c);
  const truth = e.pers === "kimagure" ? (rnd(B) < .5 ? "A" : "B") : B.intent.pred[e.pers];
  B.intent.letter = sameAct(A, Bact) ? "A" : truth;
}
function sameAct(a, b){ return a.k === b.k && a.m === b.m && a.to === b.to; }
function canStatus(m, st){
  if (m.status) return false;
  const t = monType(m);
  if (st === "brn" && t === "fire") return false;
  if (st === "par" && t === "volt") return false;
  if (st === "psn" && t === "rock") return false;
  return true;
}
Y.canStatus = canStatus;

/** 性格 c なら A と B のどちらを選ぶか（気まぐれは "?"） */
function persChoose(B, c){
  const e = act(B, "E"), p = act(B, "P"), I = B.intent;
  switch (c){
    case "tanki": return "A";
    case "okubyo": { const se = p.moves.some(id => isAtk(MV[id]) && eff(moveType(p, MV[id]), monType(e)) >= 2); return e.hp <= e.mhp / 2 || se ? "B" : "A"; }
    case "ganko": return e.lastL || "A";
    case "richigi": return e.lastL === "A" ? "B" : "A";
    case "amanojaku": { const l = B.P.last; if (!l) return "A"; return l === "atk" ? "B" : "A"; }
    case "mieppari": { if (I.A.k !== "move" || !isAtk(MV[I.A.m])) return "B"; const d = estDmg(B, "E", e, p, I.A.m); const ef = eff(moveType(e, MV[I.A.m]), monType(p)); return d >= p.hp || ef >= 2 ? "A" : "B"; }
    case "kimagure": return "?";
    case "shincho": { let ps = spdOf(B, "P", p), es = spdOf(B, "E", e); return ps > es ? "B" : "A"; }
    case "shunen": return e.hurt ? "A" : "B";
    case "sakushi": { const last = B.P.lastAct; if (!last || B.simDepth) return "A"; return betterVs(B, last.k === "sw" ? guessDef(B) : last.k === "yomi" ? guessAtk(B) : last); }
    case "ounome": { if (B.simDepth) return "A"; const h = B.P.hist; const guess = h.atk >= h.oth ? guessAtk(B) : guessDef(B); return betterVs(B, guess); }
  }
  return "A";
}
function guessAtk(B){ const p = act(B, "P"), e = act(B, "E"); const h = bestHit(B, "P", p, e); return h.id ? { k: "move", m: h.id } : { k: "move", m: p.moves[0] }; }
function guessDef(B){
  const p = act(B, "P");
  if (p.moves.includes("protect") && usable(p, "protect")) return { k: "move", m: "protect" };
  const e = act(B, "E"), A = B.intent.A;
  let bi = null, bv = Infinity;
  for (const i of bench(B, "P")){ const m = B.P.team[i]; const d = A.k === "move" ? estDmg(B, "E", e, m, A.m, true) / Math.max(1, m.hp) : 0; if (d < bv){ bv = d; bi = i; } }
  return bi != null ? { k: "sw", to: bi } : guessAtk(B);
}
/** あなたが pa をすると読んだとき、敵にとって A と B のどちらが得か */
function betterVs(B, pa){
  if (!legalP(B, pa)) pa = guessAtk(B);
  const sa = evalFor(resolveCopy(B, pa, "A"), "E"), sb = evalFor(resolveCopy(B, pa, "B"), "E");
  return sb > sa + 1e-6 ? "B" : "A";
}
function legalP(B, a){
  if (!a) return false;
  if (a.k === "sw") return alive(B.P.team[a.to]) && a.to !== B.P.act;
  if (a.k === "move") return act(B, "P").moves.includes(a.m) && usable(act(B, "P"), a.m);
  return false;
}

/* 盤面の評価（side から見て大きいほど良い）：HPの割合の合計＋生きている数 */
function evalFor(B, side){
  if (B.over) return (B.over === "win") === (side === "P") ? 100 : -100;
  const sc = s => B[s].team.reduce((t, m) => t + (m.hp > 0 ? .6 + m.hp / m.mhp : 0), 0)
    + (alive(act(B, s)) ? (act(B, s).stg.a * .12 + act(B, s).stg.s * .06 + act(B, s).stg.d * .05) : 0)
    + (s === "P" ? B.P.gauge * .12 : 0) - (B[s].haz ? .1 : 0);
  return sc(side) - sc(other(side));
}
Y.evalFor = evalFor;

/* ============================================================
   ターンの処理
   pa: { k: "move", m, piv? } | { k: "sw", to } | { k: "yomi", piv? }
   ============================================================ */
function startTurn(B){
  B.t++; B.P.peek = false;
  for (const s of ["P", "E"]) for (const m of B[s].team){ m.protPrev = m.prot; m.prot = false; }
  planIntents(B);
}
function resolveCopy(B, pa, letter){
  const C = clone(B); C.sim = true; C.simDepth = (B.simDepth || 0) + (B.sim ? 0 : 0); C.intent.letter = letter; doTurn(C, pa, true); return C;
}
Y.resolveCopy = resolveCopy;

function logp(B, ev){ B.ev.push(ev); }

function doSwitch(B, side, to, why){
  const S = B[side], out = act(B, side);
  if (out){
    out.stg = { a: 0, d: 0, s: 0 }; out.choice = null; out.leech = null; out.prot = false; out.lastM = null;
    if (side === "P" && B.rel.whistle && out.hp > 0 && why !== "faint") out.hp = Math.min(out.mhp, out.hp + Math.floor(out.mhp / 8));
  }
  S.act = to;
  const m = act(B, side);
  m.entered = B.t; m.lastL = null; m.hurt = false; m.swIn = B.t;
  logp(B, { k: "sw", side, to, why, sp: m.sp });
  if (S.haz){ const d = Math.max(1, Math.floor(m.mhp / 8)); m.hp = Math.max(0, m.hp - d); logp(B, { k: "haz", side, dmg: d }); }
  if (side === "E" && B.rel.flag && m.hp > 0){ const d = Math.max(1, Math.floor(m.mhp / 10)); m.hp = Math.max(0, m.hp - d); logp(B, { k: "flag", dmg: d }); }
}

function applyStages(B, side, m, ch, who){
  const res = {};
  for (const [k, v] of Object.entries(ch)){
    if (B.rules.noDrop && side === "E" && v < 0 && m.boss) continue;
    const old = m.stg[k]; m.stg[k] = clamp(old + v, -2, 2); if (m.stg[k] !== old) res[k] = m.stg[k] - old;
  }
  if (Object.keys(res).length) logp(B, { k: "stg", side, ch: res, who });
}

function useMove(B, side, id, ctx){
  const me = act(B, side), foeSide = other(side), foe = act(B, foeSide), mv = MV[id];
  if (!alive(me)) return;
  logp(B, { k: "use", side, m: id, sp: me.sp });
  if (mv.max){ me.used ||= {}; me.used[id] = (me.used[id] || 0) + 1; }
  if (me.item === "band" && !me.choice && !mv.yomi) me.choice = id;
  if (mv.k === "prot"){ me.prot = true; me.lastM = id; logp(B, { k: "prot", side }); return; }
  // 鏡の掟：同じ技を2回続けると跳ね返る（攻撃技だけ）
  const reflect = side === "P" && B.rules.mirror && isAtk(mv) && !mv.yomi && me.lastM === id;
  me.lastM = id;
  if (isAtk(mv)){
    if (!alive(foe)) return;
    if (foe.prot && !mv.yomi){
      logp(B, { k: "blocked", side: foeSide }); ctx[side].blocked = true;
      // 防いだ攻撃が本当に痛かったか（2倍か、残りHPの35%以上）
      const r0 = dmgCalc(B, side, me, foe, mv, false);
      ctx[foeSide].blockedBig = r0.e >= 2 || r0.dmg >= foe.hp * .35;
      return;
    }
    const tgt = reflect ? me : foe, tSide = reflect ? side : foeSide;
    const swIn = tgt.swIn === B.t;
    const r = dmgCalc(B, side, me, tgt, mv, swIn);
    let dmg = r.dmg;
    if (tgt.item === "sash" && !tgt.sashUsed && tgt.hp === tgt.mhp && dmg >= tgt.hp){ dmg = tgt.hp - 1; tgt.sashUsed = true; logp(B, { k: "sash", side: tSide }); }
    dmg = Math.min(dmg, tgt.hp);
    tgt.hp -= dmg; tgt.hurt = true;
    if (reflect) logp(B, { k: "reflect" });
    logp(B, { k: "hit", side: tSide, dmg, e: r.e, m: id, ko: tgt.hp <= 0 });
    ctx[side].hits.push({ e: r.e, swIn, tgtIdx: B[tSide].act, ko: tgt.hp <= 0, m: id, dmg });
    if (tgt.hp <= 0) ctx[side].ko = true;
    if (!reflect){
      if (tgt.item === "wpolicy" && !tgt.wpUsed && r.e >= 2 && tgt.hp > 0){ tgt.wpUsed = true; applyStages(B, tSide, tgt, { a: 2 }, "wpolicy"); }
      if (mv.drain) heal(B, side, me, Math.floor(dmg * mv.drain), "drain");
      if (mv.heal) heal(B, side, me, Math.floor(me.mhp * mv.heal), "heal");
      if (mv.recoil){ const rc = Math.max(1, Math.floor(dmg * mv.recoil)); me.hp = Math.max(0, me.hp - rc); logp(B, { k: "recoil", side, dmg: rc }); }
      if (mv.tgt && tgt.hp > 0) applyStages(B, tSide, tgt, mv.tgt, "move");
      if (mv.st && tgt.hp > 0 && canStatus(tgt, mv.st)){ tgt.status = mv.st; logp(B, { k: "status", side: tSide, st: mv.st }); }
      if (mv.haz && !B[tSide].haz){ B[tSide].haz = true; logp(B, { k: "setHaz", side: tSide }); }
    }
    if (me.item === "orb" && me.hp > 0){ const rc = Math.max(1, Math.floor(me.mhp / 10)); me.hp = Math.max(0, me.hp - rc); logp(B, { k: "orb", side, dmg: rc }); }
    if (mv.self && me.hp > 0) applyStages(B, side, me, mv.self, "self");
    // 攻撃して下がる
    if (mv.pivot && me.hp > 0 && foe.hp >= 0){
      const bn = bench(B, side);
      if (bn.length){
        let to = side === "P" ? ctx.P.piv : null;
        if (to == null || !bn.includes(to)) to = side === "P" ? bn[0] : bestSwitch(B, "E", act(B, "P"));
        doSwitch(B, side, to, "pivot");
        ctx[side].pivoted = true;
      }
    }
    return;
  }
  if (mv.k === "st"){
    if (foe.prot){ logp(B, { k: "blocked", side: foeSide }); return; }
    if (canStatus(foe, mv.st)){ foe.status = mv.st; logp(B, { k: "status", side: foeSide, st: mv.st }); } else logp(B, { k: "fail", side });
    return;
  }
  if (mv.k === "buff"){ const before = JSON.stringify(me.stg); applyStages(B, side, me, mv.self, "self"); ctx[side].buffed = JSON.stringify(me.stg) !== before; return; }
  if (mv.k === "heal"){ heal(B, side, me, Math.floor(me.mhp * mv.heal), "heal"); return; }
  if (mv.k === "haz"){ if (!B[foeSide].haz){ B[foeSide].haz = true; logp(B, { k: "setHaz", side: foeSide }); } else logp(B, { k: "fail", side }); return; }
  if (mv.k === "leech"){ if (foe.prot){ logp(B, { k: "blocked", side: foeSide }); return; } if (!foe.leech && monType(foe) !== "leaf"){ foe.leech = side; logp(B, { k: "leech", side: foeSide }); } else logp(B, { k: "fail", side }); return; }
}
function heal(B, side, m, v, why){ if (v <= 0 || m.hp <= 0) return; const old = m.hp; m.hp = Math.min(m.mhp, m.hp + v); if (m.hp > old) logp(B, { k: "heal", side, v: m.hp - old, why }); }

function prioOf(B, side, a){
  if (a.k === "sw") return 10;
  const m = act(B, side), id = a.k === "yomi" ? yomiMoveOf(B, side) : a.m;
  let p = MV[id].pr || 0;
  if (m.item === "claw" && B.t === m.entered + 1) p += .5;
  if (side === "P" && B.rel.banner && B.t === 1) p += .5;
  return p;
}
function yomiMoveOf(B, side){ const m = act(B, side); return SP[m.sp].y || "y_any"; }

/** 1ターン進める。pa はあなたの行動 */
function doTurn(B, pa, sim){
  if (B.over || B.need) return;
  B.ev = [];
  const I = B.intent, ea = I.letter === "B" ? I.B : I.A;
  const ctx = { P: { hits: [], piv: pa.piv }, E: { hits: [] } };
  const outP = act(B, "P");
  // 看破：ゲージ（またはタダ）
  // 交代
  if (pa.k === "sw") doSwitch(B, "P", pa.to, "manual");
  if (ea.k === "sw" && alive(B.E.team[ea.to])){ doSwitch(B, "E", ea.to, "manual"); ctx.E.acted = true; }
  // 必殺はゲージを使う
  if (pa.k === "yomi"){ B.P.gauge -= yomiCost(B); }
  // 技の順番
  const movers = [];
  if (pa.k === "move" || pa.k === "yomi") movers.push({ side: "P", a: pa });
  if (ea.k === "move") movers.push({ side: "E", a: ea });
  const key = mv => { const m = act(B, mv.side); let sp = spdOf(B, mv.side, m); if (B.rules.trick) sp = -sp; return [prioOf(B, mv.side, mv.a), sp, mv.side === "P" ? 1 : 0]; };
  movers.sort((x, y) => { const a = key(x), b = key(y); return b[0] - a[0] || b[1] - a[1] || b[2] - a[2]; });
  for (const mv of movers){
    const me = act(B, mv.side);
    if (!alive(me)) continue;
    const id = mv.a.k === "yomi" ? yomiMoveOf(B, mv.side) : mv.a.m;
    if (mv.side === "E") ctx.E.acted = true;
    useMove(B, mv.side, id, ctx);
    if (!alive(act(B, "P")) || !alive(act(B, "E"))){ /* 倒れた側の残りの行動は消える */ }
  }
  // ターン終わり
  for (const s of ["P", "E"]){
    const m = act(B, s); if (!alive(m)) continue;
    if (m.status === "brn"){ const d = Math.max(1, Math.floor(m.mhp / 16)); m.hp = Math.max(0, m.hp - d); logp(B, { k: "dot", side: s, st: "brn", dmg: d }); }
    if (m.status === "psn"){ const d = Math.max(1, Math.floor(m.mhp / 8)); m.hp = Math.max(0, m.hp - d); logp(B, { k: "dot", side: s, st: "psn", dmg: d }); }
    if (m.leech && m.hp > 0){ const d = Math.max(1, Math.floor(m.mhp / 8)); m.hp = Math.max(0, m.hp - d); logp(B, { k: "dot", side: s, st: "leech", dmg: d }); const o = act(B, other(s)); if (alive(o)) heal(B, other(s), o, d, "leech"); }
    if (m.item === "left" && m.hp > 0 && m.hp < m.mhp) heal(B, s, m, Math.max(1, Math.floor(m.mhp / 16)), "left");
  }
  // 読み勝ち
  const yomi = [];
  const eUsed = ea.k === "move" ? MV[ea.m] : null, eAtk = eUsed && isAtk(eUsed);
  // 受け読み：交代先が半分以下で受け、しかも下がった子には等倍以上で入る攻撃だった
  if (pa.k === "sw" && eAtk && ctx.E.hits.some(h => h.e <= .5 && h.swIn && eff(moveType(act(B, "E"), MV[h.m]), monType(outP)) >= 1)) yomi.push("uke");
  if (ea.k === "sw" && ctx.P.hits.some(h => h.e >= 2 && h.swIn)) yomi.push("kotai");
  if (pa.k === "move" && MV[pa.m].k === "prot" && ctx.P.blockedBig) yomi.push("mamori");
  if (pa.k === "move" && MV[pa.m].k === "buff" && !eAtk && ctx.P.buffed) yomi.push("tsumi");
  if (yomi.length){
    const gain = yomi.length * (B.rel.bellr ? 2 : 1);
    B.P.gauge = Math.min(3, B.P.gauge + gain);
    const pm = act(B, "P");
    if (alive(pm) && pm.item === "bell") heal(B, "P", pm, Math.floor(pm.mhp / 6), "bell");
    logp(B, { k: "yomi", kinds: yomi, gain });
  }
  B.lastYomi = yomi;
  // ヨミの王：HPが半分を切ると、場の相手に強いタイプに変わる
  const ke = act(B, "E");
  if (alive(ke) && B.rules.king && ke.phase === 0 && ke.hp <= ke.mhp / 2){
    ke.phase = 1;
    const pt = monType(act(B, "P"));
    const nt = TY.find(t => eff(t, pt) >= 2 && eff(pt, t) <= .5) || TY.find(t => eff(t, pt) >= 2);
    ke.ty = nt; logp(B, { k: "king", ty: nt });
  }
  // 記憶（性格の判定に使う）
  const eAct = act(B, "E");
  if (ea.k !== "sw") eAct.lastL = I.letter; else eAct.lastL = null;
  for (const m of B.E.team) if (m !== eAct) m.hurt = false;
  if (!ctx.P.hits.length) eAct.hurt = false;
  const kind = pa.k === "move" && isAtk(MV[pa.m]) || pa.k === "yomi" ? "atk" : "oth";
  B.P.last = kind; B.P.lastAct = pa;
  B.P.hist[kind]++;
  // 性格を絞る（敵が実際に動いたときだけ）
  if (ctx.E.acted) narrow(B, I);
  // 倒れたあと
  settle(B, sim);
}
Y.doTurn = doTurn;

function narrow(B, I){
  const owner = B.E.team[I.owner];
  if (!owner || sameAct(I.A, I.B)) return;
  const before = owner.cand.length;
  owner.cand = owner.cand.filter(c => I.pred[c] === "?" || I.pred[c] === I.letter);
  if (!owner.cand.length) owner.cand = [owner.pers];
  if (before > 1 && owner.cand.length === 1) logp(B, { k: "reveal", pers: owner.cand[0], sp: owner.sp });
}

function settle(B, sim){
  const pA = alive(act(B, "P")), eA = alive(act(B, "E"));
  const pLeft = B.P.team.some(alive), eLeft = B.E.team.some(alive);
  if (!eLeft){ B.over = "win"; logp(B, { k: "end", win: true }); return; }
  if (!pLeft){
    if (B.phoenix){ B.phoenix = false; B.phoenixUsed = true; const m = act(B, "P"); m.hp = Math.floor(m.mhp / 2); m.status = null; logp(B, { k: "phoenix" }); }
    else { B.over = "lose"; logp(B, { k: "end", win: false }); return; }
  }
  if (!eA){
    const to = bestSwitch(B, "E", act(B, "P"));
    logp(B, { k: "faint", side: "E", sp: act(B, "E").sp });
    if (to != null) doSwitch(B, "E", to, "faint");
    if (!alive(act(B, "E"))) return settle(B, sim);
  }
  if (!alive(act(B, "P"))){
    logp(B, { k: "faint", side: "P", sp: act(B, "P").sp });
    if (bench(B, "P").length){ B.need = "switch"; return; }
  }
  startTurnOwned(B);
}
function startTurnOwned(B){ if (B.sim){ B.pending = true; return; } startTurn(B); B.intent.owner = B.E.act; }
/** シミュレーションの続き（ボットの先読み用）。深さ1以上では策士・王の眼は A とみなす */
Y.simNext = C => { if (!C.pending || C.over || C.need) return C; C.pending = false; C.simDepth = (C.simDepth || 0) + 1; startTurn(C); C.intent.owner = C.E.act; return C; };

/** 倒れたあと、あなたが次の仲間を選ぶ */
function chooseReplacement(B, to){
  if (B.need !== "switch") return;
  B.ev = [];
  B.need = null;
  doSwitch(B, "P", to, "faint");
  if (!alive(act(B, "P"))){ if (bench(B, "P").length){ B.need = "switch"; return; } return settle(B); }
  startTurnOwned(B);
}
Y.chooseReplacement = chooseReplacement;

/** 看破：このターンの記号を見る */
function peek(B){
  if (B.P.peek) return true;
  const m = act(B, "P");
  let free = false;
  if (m.item === "glasses" && !B.P.glUsed){ B.P.glUsed = true; free = true; }
  else if (B.rel.eye && !B.P.eyeUsed){ B.P.eyeUsed = true; free = true; }
  else if (B.P.gauge >= 1) B.P.gauge -= 1;
  else return false;
  B.P.peek = true; B.intent.peek = true;
  const e = act(B, "E");
  // 見えた記号と合わない候補は消える
  const L = B.intent.letter;
  e.cand = e.cand.filter(c => B.intent.pred[c] === "?" || B.intent.pred[c] === L);
  if (!e.cand.length) e.cand = [e.pers];
  return true;
}
Y.peek = peek;
Y.peekFree = B => { const m = act(B, "P"); return (m.item === "glasses" && !B.P.glUsed) || (B.rel.eye && !B.P.eyeUsed); };

/** 今のターン、敵がどちらをやるかの見え方：{ known: "A"|"B"|null, byCand: {pers: letter} } */
function intentView(B){
  const I = B.intent, e = act(B, "E");
  if (sameAct(I.A, I.B)) return { known: "A", byCand: {} };
  if (I.peek) return { known: I.letter, byCand: I.pred };
  const ls = new Set(e.cand.map(c => I.pred[c]));
  if (ls.size === 1 && !ls.has("?")) return { known: [...ls][0], byCand: I.pred };
  return { known: null, byCand: I.pred };
}
Y.intentView = intentView;

/** あなたが選べる行動の一覧 */
function legalActions(B){
  const m = act(B, "P"), out = [];
  for (const id of m.moves) if (usable(m, id)) out.push({ k: "move", m: id });
  for (const i of bench(B, "P")) out.push({ k: "sw", to: i });
  if (B.P.gauge >= yomiCost(B)) out.push({ k: "yomi" });
  return out;
}
Y.legalActions = legalActions;

/** プレビュー：行動 pa をしたとき、A なら／B ならの結果 */
function preview(B, pa){
  const res = {};
  for (const L of ["A", "B"]){
    const C = resolveCopy(B, pa, L);
    const sum = { dealt: 0, taken: 0, koE: 0, koP: 0, yomi: C.lastYomi || [], over: C.over, eff: null, notes: [] };
    for (const ev of C.ev){
      if (ev.k === "hit" && ev.side === "E"){ sum.dealt += ev.dmg; if (ev.ko) sum.koE++; sum.eff = ev.e; }
      if (ev.k === "hit" && ev.side === "P"){ sum.taken += ev.dmg; if (ev.ko) sum.koP++; }
      if (ev.k === "blocked" && ev.side === "E") sum.notes.push("まもられる");
      if (ev.k === "blocked" && ev.side === "P") sum.notes.push("まもる");
      if (ev.k === "reflect") sum.notes.push("跳ね返る");
    }
    sum.score = evalFor(C, "P");
    res[L] = sum;
  }
  return res;
}
Y.preview = preview;

/* newBattle → startTurn の owner 付け */
const _nb = newBattle;
Y.newBattle = function(run, party, foes, kind, rules){ const B = _nb(run, party, foes, kind, rules); B.intent.owner = B.E.act; return B; };

/* ============================================================
   ラン
   ============================================================ */
const FLOORS = [
  { n: "苔むす回廊", lv: [3, 7], boss: "b_moss", bossLv: 8, hpMul: 1.1, rules: { boost: { rock: 1.3 } }, rd: ["番人の岩の技の威力 ×1.3"] },
  { n: "氷鏡の間",   lv: [9, 13], boss: "b_witch", bossLv: 15, hpMul: 1.2, rules: { mirror: true, noDrop: true }, rd: ["同じ攻撃技を2回続けると、2回目は自分に跳ね返る", "魔女の能力は下がらない"] },
  { n: "雷雲の塔",   lv: [14, 18], boss: "b_thunder", bossLv: 20, hpMul: 1.25, rules: { trick: true, boostAll: { volt: 1.3 } }, rd: ["遅い方が先に動く（優先度はそのまま）", "雷の技の威力 ×1.3（あなたも）"] },
  { n: "天頂",       lv: [19, 23], boss: "b_king", bossLv: 25, hpMul: 1.3, rules: { king: true }, rd: ["王の眼：あなたの癖を読んでくる", "HPが半分を切ると、場の相手に強いタイプに変わる"] },
];
Y.FLOORS = FLOORS;
const STEPS = 7;
const NODE = {
  wild:   { n: "野良戦", cost: 3 },
  elite:  { n: "強敵",   cost: 5 },
  boss:   { n: "層の主", cost: 7 },
  recruit:{ n: "仲間",   cost: 0 },
  tutor:  { n: "技",     cost: 0 },
  rest:   { n: "休憩",   cost: 0 },
  shop:   { n: "店",     cost: 0 },
  event:  { n: "事件",   cost: 0 },
};
Y.NODE = NODE;

let UID = 1;
function mkMon(o, sp, lv){
  const st = calcStats(sp, lv);
  return { uid: o.uid = (o.uid || 0) + 1, sp, lv, xp: 0, hp: st.mhp, moves: learnedMoves(sp, lv), item: null };
}
Y.mkMon = mkMon;
const monMax = m => calcStats(m.sp, m.lv).mhp;
Y.monMax = monMax;

function newRun(starter, diff = 1, seed){
  const o = { s: seed ?? ((Math.random() * 2 ** 31) | 0), diff, floor: 0, step: -1, pos: null, coins: 30, relics: [], bag: { potion: 1, revive: 0 }, items: [], phase: "map", party: [], uid: 0, stats: { battles: 0, yomi: 0, reveals: 0, turns: 0 }, seen: {} };
  o.party.push(mkMon(o, starter, 6));
  o.map = genMap(o, 0);
  // 相棒の候補：スターターと違うタイプの1段階目を3体
  const roots = shuffle(o, Object.values(SP).filter(s => !s.boss && s.stage === 1 && s.t !== SP[starter].t && !s.L.some(() => false) && !Y.STARTERS.includes(s.id)).map(s => s.id));
  o.phase = "partner"; o.node = { t: "partner", offer: roots.slice(0, 3).map(sp => mkMon(o, sp, 5)) };
  return o;
}
Y.newRun = newRun;

function genMap(o, floor){
  const rows = [];
  for (let s = 0; s < STEPS; s++){
    const n = s === 0 ? 2 : 2 + (rnd(o) < .55 ? 1 : 0);
    const row = [];
    for (let i = 0; i < n; i++){
      let t;
      if (s === 0) t = "wild";
      else if (s === STEPS - 1) t = i === 0 ? "rest" : pick(o, ["shop", "event", "wild", "rest"]);
      else if (floor === 0 && s === 1) t = i === 0 ? "recruit" : pick(o, ["wild", "event", "recruit"]);
      else t = wpick(o, ["wild", "elite", "recruit", "tutor", "rest", "shop", "event"], k => ({ wild: 36, elite: s >= 3 ? 14 : 0, recruit: 12, tutor: 10, rest: s >= 2 ? 10 : 3, shop: s >= 2 ? 8 : 0, event: 10 })[k]);
      row.push({ t, x: n === 2 ? [.3, .7][i] : [.18, .5, .82][i], to: [] });
    }
    rows.push(row);
  }
  // 少なくとも1つの強敵（3〜5段）
  if (!rows.slice(3, 6).some(r => r.some(n => n.t === "elite"))){ const r = rows[3 + ri(o, 3)]; r[ri(o, r.length)].t = "elite"; }
  // 線：近いマスへ
  for (let s = 0; s < STEPS - 1; s++){
    const a = rows[s], b = rows[s + 1];
    a.forEach(n => { const near = b.map((m, j) => [Math.abs(m.x - n.x), j]).sort((x, y) => x[0] - y[0]); n.to = [near[0][1]]; if (near[1] && near[1][0] < .4) n.to.push(near[1][1]); });
    b.forEach((m, j) => { if (!a.some(n => n.to.includes(j))){ const near = a.map((n, i) => [Math.abs(m.x - n.x), i]).sort((x, y) => x[0] - y[0]); a[near[0][1]].to.push(j); } });
  }
  return { floor, rows };
}
Y.genMap = genMap;

/** 今選べるマス [step, index] */
function nextNodes(o){
  if (o.step < 0) return o.map.rows[0].map((n, i) => [0, i]);
  if (o.step >= STEPS - 1) return [["boss", 0]];
  const cur = o.map.rows[o.step][o.pos];
  return cur.to.map(j => [o.step + 1, j]);
}
Y.nextNodes = nextNodes;

/** 仲間に加わるときのレベル：その段の敵とチームの平均の高い方から少し下 */
function joinLv(o, minus){ const avg = o.party.length ? o.party.reduce((t, m) => t + m.lv, 0) / o.party.length : 5; return Math.max(3, Math.round(Math.max(floorLv(o, o.floor), avg - 1)) - minus); }
Y.joinLv = joinLv;
/* ---------- 敵の編成 ---------- */
/** 難しさごとに増える縛り（その段階までのものが全部かかる） */
Y.DIFF = ["", "", "強敵がかならず持ち物を持つ", "敵のレベル+1・強敵が追加の技を持つ・層の主の性格の候補が1つ増える", "野良戦で2体出やすい", "休憩の回復が60%に", "敵のレベル+2", "層の主のHPがさらに増える"];
/** その段の敵のレベル：層の中で段が進むほど上がる（±1） */
function floorLv(o, f, bump = 0){ const L = FLOORS[f].lv, st = clamp(o.step, 0, STEPS - 1); return Math.max(2, L[0] + Math.round((L[1] - L[0]) * st / (STEPS - 1)) + ri(o, 3) - 1 + bump + Math.floor((o.diff - 1) / 2)); }
function enemyPool(f){
  const st = f === 0 ? [1] : f === 1 ? [1, 2] : f === 2 ? [2] : [2, 3];
  return Object.values(SP).filter(s => !s.boss && st.includes(s.stage)).map(s => s.id);
}
/** レベルに合わせて進化させる */
function evolveTo(sp, lv){ let s = SP[sp]; while (s.evo && lv >= s.evo[0]) s = SP[s.evo[1]]; return s.id; }
function rootOf(sp){ return SP[sp].root || sp; }
function genFoes(o, kind){
  const f = o.floor, foes = [];
  if (kind === "boss"){
    const F = FLOORS[f];
    const mlv = F.lv[1] - (f === 0 ? 1 : 0) + Math.floor((o.diff - 1) / 2);
    const minion = () => { const sp = evolveTo(rootOf(pick(o, enemyPool(f))), mlv); return mkEnemy(o, sp, mlv, f, { extra: f >= 1 }); };
    const boss = mkEnemy(o, F.boss, F.bossLv + Math.floor((o.diff - 1) / 2), f, { hpMul: F.hpMul + .05 * (o.diff - 1) });
    if (o.diff >= 3 && f >= 1){ const extra = ["sakushi", "shincho", "okubyo"].find(p => !boss.cand.includes(p)); if (extra) boss.cand.push(extra); }
    foes.push(boss, minion(), minion());
    // 先頭は手下、ボスは2番目に出てくる（最初の1体で性格を練習できる）
    return [foes[1], foes[0], foes[2]];
  }
  const n = kind === "elite" ? 3 : (o.step <= 1 && f === 0 ? 1 : (rnd(o) < .5 + f * .15 + (o.diff >= 4 ? .2 : 0) ? 2 : 1));
  const used = new Set();
  for (let i = 0; i < n; i++){
    let root; let tries = 0;
    do { root = rootOf(pick(o, enemyPool(f))); tries++; } while (used.has(root) && tries < 10);
    used.add(root);
    const lv = floorLv(o, f, kind === "elite" && f >= 2 ? 1 : 0);
    const sp = evolveTo(root, lv);
    const itemOk = kind === "elite" && (o.diff >= 2 || (f >= 1 && rnd(o) < .35));
    foes.push(mkEnemy(o, sp, lv, f, { extra: kind === "elite" && (f >= 1 || o.diff >= 3), item: itemOk ? pick(o, Object.keys(IT)) : null }));
  }
  return foes;
}
Y.genFoes = genFoes;

/* ---------- マスに入る ---------- */
function enterNode(o, step, idx){
  let node;
  if (step === "boss"){ node = { t: "boss" }; o.atBoss = true; }
  else { node = o.map.rows[step][idx]; o.step = step; o.pos = idx; }
  o.node = { t: node.t };
  if (node.t === "wild" || node.t === "elite" || node.t === "boss"){
    o.node.foes = genFoes(o, node.t);
    o.phase = "pre";
    for (const f of o.node.foes) o.seen[f.sp] = 1;
  } else if (node.t === "recruit"){
    const lv = joinLv(o, 0);
    const roots = shuffle(o, [...new Set(enemyPool(o.floor).map(rootOf))]).filter(r => !o.party.some(m => rootOf(m.sp) === r));
    o.node.offer = roots.slice(0, 3).map(r => mkMon(o, evolveTo(r, lv), lv));
    o.phase = "recruit";
  } else if (node.t === "tutor"){ o.phase = "tutor"; o.node.offers = {}; for (const m of o.party) o.node.offers[m.uid] = tutorOffer(o, m); }
  else if (node.t === "rest") o.phase = "rest";
  else if (node.t === "shop"){ o.phase = "shop"; o.node.stock = shopStock(o); }
  else if (node.t === "event"){ o.phase = "event"; o.node.ev = pick(o, Object.keys(EVENTS).filter(k => !EVENTS[k].ok || EVENTS[k].ok(o))); }
  return o.node;
}
Y.enterNode = enterNode;

function tutorOffer(o, m){
  const s = SP[m.sp];
  const pool = [...new Set([...(s.pool || []), ...(s.L || []).filter(x => x[0] <= m.lv + 6).map(x => x[1])])].filter(id => !m.moves.includes(id));
  return shuffle(o, pool).slice(0, 3);
}
function shopStock(o){
  const its = shuffle(o, Object.keys(IT)).slice(0, 3).map(id => ({ k: "item", id, price: IT[id].price }));
  return [{ k: "con", id: "potion", price: Y.CON.potion.price }, { k: "con", id: "revive", price: Y.CON.revive.price }, ...its];
}

/** 見せ合いのあと：連れていく3体（uid の配列。先頭が最初）でバトル開始 */
function startBattle(o, uids){
  const party = uids.map(u => o.party.find(m => m.uid === u)).filter(m => m && m.hp > 0).slice(0, 3);
  const kind = o.node.t;
  const rules = kind === "boss" ? clone(FLOORS[o.floor].rules) : {};
  o.battle = Y.newBattle(o, party, o.node.foes, kind, rules);
  o.battle.uids = party.map(m => m.uid);
  o.phase = "battle";
  return o.battle;
}
Y.startBattle = startBattle;

/** バトルの結果をランに戻す */
function finishBattle(o){
  const B = o.battle; if (!B || !B.over) return null;
  o.stats.battles++;
  for (const m of B.P.team){ const p = o.party.find(x => x.uid === m.uid); if (p){ p.hp = Math.max(0, m.hp); } }
  if (B.phoenixUsed) o.phoenixUsed = true;
  const res = { win: B.over === "win", xp: 0, coins: 0, lv: [], evo: [], learn: [], recruit: null, relic: null };
  if (!res.win){ o.phase = "over"; o.result = "lose"; o.battle = null; return res; }
  const kind = B.kind;
  // 経験値
  const foeLv = B.E.team.reduce((t, m) => t + m.lv * (m.boss ? 2 : 1), 0);
  let xp = foeLv * (kind === "wild" ? 5 : 6);
  if (o.relics.includes("book")) xp = Math.floor(xp * 1.3);
  res.xp = xp;
  for (const p of o.party){
    const inB = B.uids.includes(p.uid);
    if (p.hp <= 0 && !inB) continue;
    const avgFoe = B.E.team.reduce((t, m) => t + m.lv, 0) / B.E.team.length;
    const rubber = clamp(1 + (avgFoe - p.lv) * .2, .15, 2);
    gainXp(o, p, Math.floor(xp * (inB ? 1 : .5) * rubber), res);
  }
  // コイン
  let coins = kind === "boss" ? 60 : kind === "elite" ? 40 : 14 + B.E.team.length * 6;
  if (o.relics.includes("cat")) coins = Math.floor(coins * 1.5);
  o.coins += coins; res.coins = coins;
  // 勝つと生きている仲間は少し回復（勝利の杯でさらに）
  const after = .15 + (o.relics.includes("cup") ? .15 : 0);
  for (const p of o.party) if (p.hp > 0) p.hp = Math.min(monMax(p), p.hp + Math.floor(monMax(p) * after));
  // 仲間になりたがる（最後の1体を読み勝ちか必殺で倒した）
  if (B.recruitable && kind !== "boss"){
    const e = B.E.team[B.recruitable.idx];
    res.recruit = { sp: e.sp, lv: Math.max(e.lv - 1, joinLv(o, 1)), moves: e.moves.filter(id => !MV[id].yomi && !SP[e.sp].boss) };
  }
  // 報酬
  if (kind === "elite" || kind === "boss") res.relicOffer = relicOffer(o, 3);
  if (kind === "boss"){ for (const p of o.party) p.hp = monMax(p); }
  o.lastRes = res;
  o.phase = "reward";
  o.battle = null;
  return res;
}
Y.finishBattle = finishBattle;

function relicOffer(o, n){ return shuffle(o, Object.keys(RL).filter(r => !o.relics.includes(r))).slice(0, n); }

const xpNeed = lv => 5 * lv + 10;
Y.xpNeed = xpNeed;
function gainXp(o, p, xp, res){
  p.xp += xp;
  while (p.xp >= xpNeed(p.lv) && p.lv < 30){
    p.xp -= xpNeed(p.lv);
    const before = monMax(p);
    p.lv++;
    const after = monMax(p);
    if (p.hp > 0) p.hp = Math.min(after, p.hp + (after - before) + Math.floor(after * .08));
    res.lv.push({ uid: p.uid, lv: p.lv });
    const s = SP[p.sp];
    if (s.evo && p.lv >= s.evo[0]){ const from = p.sp; const b0 = monMax(p); p.sp = s.evo[1]; const b1 = monMax(p); if (p.hp > 0) p.hp = Math.min(b1, p.hp + (b1 - b0)); res.evo.push({ uid: p.uid, from, to: p.sp }); }
    for (const [L, id] of SP[p.sp].L || []) if (L === p.lv && !p.moves.includes(id)){ if (p.moves.length < 4) p.moves.push(id); else res.learn.push({ uid: p.uid, m: id }); }
  }
}
Y.gainXp = gainXp;

/** 報酬を受け取って地図に戻る（層の主のあとは次の層へ） */
function afterReward(o){
  if (o.node && o.node.t === "boss"){
    if (o.floor >= FLOORS.length - 1){ o.phase = "over"; o.result = "clear"; return; }
    o.floor++; o.step = -1; o.pos = null; o.atBoss = false; o.map = genMap(o, o.floor);
  }
  o.phase = "map"; o.node = null; o.lastRes = null;
}
Y.afterReward = afterReward;

/* ---------- 休憩・技・店・仲間 ---------- */
Y.rest = (o, mode, uid) => {
  if (mode === "heal"){ const k = o.diff >= 5 ? .6 : 1; for (const p of o.party){ const mx = monMax(p); p.hp = p.hp > 0 ? Math.min(mx, p.hp + Math.floor(mx * k)) : Math.floor(mx * k * .5); } }
  else if (mode === "train"){ const p = o.party.find(m => m.uid === uid); if (p){ const res = { lv: [], evo: [], learn: [] }; gainXp(o, p, xpNeed(p.lv) - p.xp, res); gainXp(o, p, xpNeed(p.lv) - p.xp, res); o.lastRes = res; return res; } }
  o.phase = "map"; o.node = null;
};
Y.learn = (o, uid, id, replaceIdx) => { const p = o.party.find(m => m.uid === uid); if (!p) return; if (p.moves.length < 4) p.moves.push(id); else if (replaceIdx != null) p.moves[replaceIdx] = id; };
Y.buy = (o, i) => { const it = o.node.stock[i]; if (!it || it.sold || o.coins < it.price) return false; o.coins -= it.price; it.sold = true; if (it.k === "con") o.bag[it.id] = (o.bag[it.id] || 0) + 1; else o.items.push(it.id); return true; };
Y.useCon = (o, id, uid) => {
  const p = o.party.find(m => m.uid === uid); if (!p || !(o.bag[id] > 0)) return false;
  const mx = monMax(p);
  if (id === "potion"){ if (p.hp <= 0 || p.hp >= mx) return false; p.hp = Math.min(mx, p.hp + Math.floor(mx / 2)); }
  if (id === "revive"){ if (p.hp > 0) return false; p.hp = Math.floor(mx / 2); }
  o.bag[id]--; return true;
};
Y.equip = (o, uid, itemIdx) => { const p = o.party.find(m => m.uid === uid); if (!p) return; const it = o.items[itemIdx]; if (it == null) return; o.items.splice(itemIdx, 1); if (p.item) o.items.push(p.item); p.item = it; };
Y.unequip = (o, uid) => { const p = o.party.find(m => m.uid === uid); if (p && p.item){ o.items.push(p.item); p.item = null; } };
Y.recruit = (o, mon, releaseUid) => {
  if (o.party.length >= 6){ if (releaseUid == null) return false; o.party = o.party.filter(m => m.uid !== releaseUid); }
  const m = mon.uid ? mon : { uid: o.uid = (o.uid || 0) + 1, sp: mon.sp, lv: mon.lv, xp: 0, hp: calcStats(mon.sp, mon.lv).mhp, moves: (mon.moves && mon.moves.length ? mon.moves : learnedMoves(mon.sp, mon.lv)).slice(0, 4), item: null };
  if (!m.uid) m.uid = o.uid = (o.uid || 0) + 1;
  o.party.push(m); return true;
};

/* ---------- 事件 ---------- */
const EVENTS = {
  altar:   { n: "古い祭壇", d: "苔むした祭壇に、光る何かが置かれている。", ch: [
             { n: "先頭の仲間のHPを30%捧げて、秘宝をもらう", go: o => { const p = o.party.find(m => m.hp > 0); if (p) p.hp = Math.max(1, p.hp - Math.floor(monMax(p) * .3)); const r = relicOffer(o, 1)[0]; if (r) o.relics.push(r); return r ? `秘宝「${RL[r].n}」を手に入れた` : "何もなかった"; } },
             { n: "立ち去る", go: () => "そっと立ち去った" }] },
  stray:   { n: "迷子のモンスター", d: "群れからはぐれたモンスターが、こちらを見ている。", ch: [
             { n: "仲間にする（レベルは少し低め）", go: o => { const lv = joinLv(o, 2); const r = rootOf(pick(o, enemyPool(o.floor))); const m = mkMon(o, evolveTo(r, lv), lv); o.pendingRecruit = m; return `${SP[m.sp].n}（Lv${lv}）が仲間になりたそうだ`; } },
             { n: "木の実をあげて見送る（コイン+20）", go: o => { o.coins += 20; return "お礼に何か落としていった。コイン+20"; } }] },
  dojo:    { n: "修行場", d: "古い修行場。汗と石の匂いがする。", ch: [
             { n: "1体を2レベル上げる（HPの低い仲間から）", go: o => { const p = o.party.filter(m => m.hp > 0).sort((a, b) => a.lv - b.lv)[0]; if (!p) return "誰も修行できない"; const res = { lv: [], evo: [], learn: [] }; gainXp(o, p, xpNeed(p.lv) - p.xp, res); gainXp(o, p, xpNeed(p.lv) - p.xp, res); o.lastRes = res; return `${SP[p.sp].n} は Lv${p.lv} になった`; } },
             { n: "みんなで休む（全員HP+30%）", go: o => { for (const p of o.party) if (p.hp > 0) p.hp = Math.min(monMax(p), p.hp + Math.floor(monMax(p) * .3)); return "少し元気になった"; } }] },
  peddler: { n: "謎の行商人", d: "「いい品があるよ。ひとつだけ、安くしとく」", ok: o => o.coins >= 35, ch: [
             { n: "コイン35で持ち物をひとつ買う", go: o => { o.coins -= 35; const it = pick(o, Object.keys(IT)); o.items.push(it); return `「${IT[it].n}」を手に入れた`; } },
             { n: "断る", go: () => "行商人は霧の中に消えた" }] },
  oracle:  { n: "占い師", d: "「次の強い相手の心、見てあげようか」", ch: [
             { n: "次の強敵・層の主の性格を最初から見抜く", go: o => { o.oracle = 1; return "次の強敵か層の主の性格が、はじめからわかる"; } },
             { n: "お布施をもらう（コイン+30）", go: o => { o.coins += 30; return "占い師は笑ってコインをくれた。+30"; } }] },
  spring:  { n: "癒やしの泉", d: "澄んだ泉。けれど、奥から強い気配がする。", ch: [
             { n: "泉に入る（全員全回復・倒れた仲間も）。次のバトルの敵はレベル+2", go: o => { for (const p of o.party) p.hp = monMax(p); o.nextBump = 2; return "全員すっかり元気になった。何かが目を覚ました気がする…"; } },
             { n: "手ですくって飲む（全員HP+25%）", go: o => { for (const p of o.party) if (p.hp > 0) p.hp = Math.min(monMax(p), p.hp + Math.floor(monMax(p) * .25)); return "少し回復した"; } }] },
  scroll:  { n: "技の碑文", d: "壁に、強い技の型が刻まれている。", ch: [
             { n: "誰かに覚えさせる（技のマスと同じ）", go: o => { o.phase = "tutor"; o.node.offers = {}; for (const m of o.party) o.node.offers[m.uid] = tutorOffer(o, m); return null; } },
             { n: "写して売る（コイン+25）", go: o => { o.coins += 25; return "コイン+25"; } }] },
  gamble:  { n: "サイコロ賭博", d: "「半か丁か。持ち金の半分を賭けな」", ok: o => o.coins >= 20, ch: [
             { n: "賭ける（半々で、賭けた分が倍になる）", go: o => { const bet = Math.floor(o.coins / 2); if (rnd(o) < .5){ o.coins += bet; return `勝った！ コイン+${bet}`; } o.coins -= bet; return `負けた… コイン−${bet}`; } },
             { n: "やめておく", go: () => "賭けはしなかった" }] },
};
Y.EVENTS = EVENTS;
Y.doEvent = (o, i) => { const E = EVENTS[o.node.ev]; const msg = E.ch[i].go(o); o.node.msg = msg; if (o.phase === "event") o.node.done = true; return msg; };
Y.leaveNode = o => { o.phase = "map"; o.node = null; };

/* ---------- バトル中のターン（ランを通して） ---------- */
/** あなたの行動でターンを進め、読み勝ちで倒した最後の1体を記録する */
Y.turn = (o, pa) => {
  const B = o.battle;
  const eBefore = B.E.team.map(m => m.hp > 0);
  doTurn(B, pa);
  o.stats.turns++;
  if (B.lastYomi && B.lastYomi.length) o.stats.yomi += B.lastYomi.length;
  if (B.ev.some(e => e.k === "reveal")) o.stats.reveals++;
  // 最後の1体を読み勝ち（か必殺）で倒した
  const lastIdx = eBefore.map((a, i) => a && B.E.team[i].hp <= 0 ? i : -1).filter(i => i >= 0);
  if (B.over === "win" && lastIdx.length && ((B.lastYomi && B.lastYomi.length) || pa.k === "yomi")) B.recruitable = { idx: lastIdx[lastIdx.length - 1] };
  return B;
};
/** ボス戦などで占いを使う */
Y.applyOracle = o => { if (!o.oracle || !o.node || (o.node.t !== "elite" && o.node.t !== "boss")) return; for (const f of o.node.foes) f.cand = [f.pers]; o.oracle = 0; };
Y.applyBump = o => { if (!o.nextBump || !o.node || !o.node.foes) return; for (const f of o.node.foes) f.lv += o.nextBump; o.nextBump = 0; };

Y.STEPS = STEPS;
Y.floorLv = floorLv;
Y.rootOf = rootOf;
Y.evolveTo = evolveTo;
})(typeof window !== "undefined" ? window : globalThis);
