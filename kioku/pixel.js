/* Kioku — ドット絵エンジン（ペット・背景・パーティクル・アイコン） */
"use strict";
(function(){
const PX = {};
window.PX = PX;

/* ---------- 色 ---------- */
function hsl(h, s, l){
  h = (((h % 360) + 360) % 360) / 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = (t % 1 + 1) % 1; return t < 1/6 ? p + (q - p) * 6 * t : t < 1/2 ? q : t < 2/3 ? p + (q - p) * (2/3 - t) * 6 : p; };
  return [Math.round(f(h + 1/3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1/3) * 255)];
}
const hex = s => [parseInt(s.slice(1,3),16), parseInt(s.slice(3,5),16), parseInt(s.slice(5,7),16)];
const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;
const mix = (a, b, t) => [0,1,2].map(i => Math.round(a[i] + (b[i] - a[i]) * t));
PX.hsl = hsl; PX.hex = hex; PX.css = css; PX.mix = mix;

const COLORS = {
  pink:     { name: "さくら",       hue: 346, sat: .66, light: .70 },
  soda:     { name: "ソーダ",       hue: 199, sat: .70, light: .64 },
  mint:     { name: "ミント",       hue: 152, sat: .52, light: .62 },
  lemon:    { name: "レモン",       hue: 46,  sat: .86, light: .64, wing: -18 },
  lavender: { name: "ラベンダー",   hue: 266, sat: .55, light: .70 },
  choco:    { name: "ショコラ",     hue: 24,  sat: .40, light: .52 },
  midnight: { name: "ミッドナイト", hue: 232, sat: .38, light: .42 },
  gold:     { name: "ゴールド",     hue: 44,  sat: .95, light: .58, wing: -14 }
};
PX.COLORS = COLORS;
const palCache = {};
function petPalette(key){
  if (palCache[key]) return palCache[key];
  const c = COLORS[key] || COLORS.pink, H = c.hue, s = c.sat, l = c.light;
  const P = {
    body:  [hsl(H - 14, s + .10, l + .13), hsl(H, s, l), hsl(H + 12, s - .04, l - .13), hsl(H + 22, s - .08, l - .24)],
    out:   hsl(H + 26, Math.min(.7, s), .17),
    belly: [hsl(H - 12, .70, .97), hsl(H - 8, .60, .90), hsl(H, .42, .80), hsl(H + 8, .34, .70)],
    wing:  [hsl(H + (c.wing ?? 34), s, l + .16), hsl(H + (c.wing ?? 34), s - .02, l + .04), hsl(H + (c.wing ?? 34) + 6, s - .08, l - .09), hsl(H + (c.wing ?? 34) + 12, s - .12, l - .2)],
    horn:  [hex("#fffbea"), hex("#f4e3b4"), hex("#d6ba80"), hex("#b0935a")], hornOut: hex("#5a4426"),
    leaf:  [hex("#c8f79a"), hex("#86d65c"), hex("#55a83f"), hex("#3b7f31")], leafOut: hex("#1d4a22"),
    shell: [hex("#ffffff"), hex("#fbf3e3"), hex("#ead9bd"), hex("#cfba98")], shellOut: hex("#5d4a36"),
    spot:  [hsl(H - 10, s + .05, l + .08), hsl(H, s, l - .02), hsl(H + 10, s, l - .14), hsl(H + 16, s, l - .24)],
    eye:   hsl(H + 30, .45, .1), eyeHi: [255, 255, 255], eyeRef: hsl(H + 10, .55, .42),
    cheek: hsl(352, .9, .8), tongue: hsl(354, .85, .7),
  };
  P.mouth = P.eye;
  return palCache[key] = P;
}
PX.petPalette = petPalette;

/* ---------- ペットのスプライト（40×40） ---------- */
const SW = 40, SH = 40;
const M = { BODY: 1, BELLY: 2, WING: 3, HORN: 4, LEAF: 5, SHELL: 6, SPOT: 7 };
PX.SW = SW; PX.SH = SH;
function pip(pts, x, y){ let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++){ const [xi, yi] = pts[i], [xj, yj] = pts[j]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c; } return c; }
function box(sh){
  if (sh.t === "p"){ if (!sh._b){ const xs = sh.pts.map(p => p[0]), ys = sh.pts.map(p => p[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys); sh._b = { x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, hw: Math.max(.5, (x1 - x0) / 2), hh: Math.max(.5, (y1 - y0) / 2) }; } return sh._b; }
  return { x0: sh.cx - sh.rx, x1: sh.cx + sh.rx, y0: sh.cy - sh.ry, y1: sh.cy + sh.ry };
}
function inside(sh, x, y){
  if (sh.t === "e"){ const dx = (x - sh.cx) / sh.rx, dy = (y - sh.cy) / sh.ry; return dx*dx + dy*dy <= 1 ? [dx, dy] : null; }
  if (sh.t === "egg"){ const dy = (y - sh.cy) / sh.ry; const k = dy < 0 ? 1 + dy * .24 : 1; const dx = (x - sh.cx) / (sh.rx * k); return dx*dx + dy*dy <= 1 ? [dx, dy] : null; }
  if (!pip(sh.pts, x, y)) return null; const b = box(sh); return [(x - b.cx) / b.hw, (y - b.cy) / b.hh];
}
function newBuf(){ return { mat: new Uint8Array(SW*SH), z: new Int8Array(SW*SH).fill(-1), sh: new Float32Array(SW*SH), col: new Array(SW*SH), acc: new Array(SW*SH) }; }
function fillShape(buf, sh, mat, z, clip){
  const b = box(sh);
  for (let y = Math.max(0, Math.floor(b.y0)); y <= Math.min(SH - 1, Math.ceil(b.y1)); y++)
    for (let x = Math.max(0, Math.floor(b.x0)); x <= Math.min(SW - 1, Math.ceil(b.x1)); x++){
      const r = inside(sh, x + .5, y + .5); if (!r) continue;
      const i = y * SW + x;
      if (clip && buf.mat[i] !== clip) continue;
      if (z >= buf.z[i]){ buf.mat[i] = mat; buf.z[i] = z; buf.sh[i] = r[0] * .55 + r[1] * .85 + (sh.dark || 0); }
    }
}
const E = (cx, cy, rx, ry, dark) => ({ t: "e", cx, cy, rx, ry, dark });
const Pg = (pts, dark) => ({ t: "p", pts, dark });
const mirror = pts => pts.map(([x, y]) => [40 - x, y]);

const EYES = {
  open:   [".KK.", "KWKK", "KKKK", "KKRK", ".KK."],
  look:   [".KK.", "KKWK", "KKKK", "KRKK", ".KK."],
  blink:  ["....", "....", "....", "KKKK", "...."],
  happy:  ["....", ".KK.", "K..K", "....", "...."],
  closed: ["....", "....", "K..K", ".KK.", "...."],
  half:   ["....", "....", "KKKK", "KWKK", ".KK."],
  sad:    ["....", ".KK.", "KWKK", "KKRK", ".KK."],
  xl:     ["K...", ".K..", "..K.", ".K..", "K..."],
  xr:     ["...K", "..K.", ".K..", "..K.", "...K"],
  star:   [".W..", "WWW.", ".W.W", "..WW", "...."]
};
const MOUTHS = {
  cat:   ["K.K.K", ".K.K."],
  smile: ["K...K", ".KKK."],
  open:  ["KKK", "KTK"],
  laugh: [".KKK.", "KTTTK", ".KTK."],
  o:     [".K.", "K.K", ".K."],
  flat:  ["KKK"],
  wavy:  [".K.K", "K.K."]
};
function stamp(layer, map, pal, x0, y0){
  for (let r = 0; r < map.length; r++) for (let c = 0; c < map[r].length; c++){
    const ch = map[r][c]; if (ch === "." || ch === " ") continue;
    const x = x0 + c, y = y0 + r; if (x < 0 || y < 0 || x >= SW || y >= SH) continue;
    const col = pal[ch]; if (col) layer[y * SW + x] = col;
  }
}
PX.stamp = stamp;

/* 進化段階ごとの体 */
function stageModel(stage, pose){
  const b = pose.bob - pose.jump, sq = pose.sq || 0, fj = -pose.jump, fl = pose.flap || 0;
  const out = []; const add = (sh, m, z, clip) => out.push([sh, m, z, clip]);
  if (stage === 0){
    const w = pose.wob || 0;
    const cx = 20 + w * .7;
    add({ t: "egg", cx, cy: 26.5 + b, rx: 8.7, ry: 10.9 }, M.SHELL, 1);
    [[16.5, 22, 2.3, 1.8], [24, 27.6, 2.7, 2.1], [18, 32.6, 2.1, 1.5], [23.6, 19.2, 1.6, 1.3], [14.4, 28.2, 1.4, 1.2]]
      .forEach(([x, y, rx, ry]) => add(E(x + w * .7 * (1 - (y - 16) / 22), y + b, rx, ry), M.SPOT, 2, M.SHELL));
    return { shapes: out, egg: true, cx, b, head: [20, 16 + b], neck: [20, 30 + b] };
  }
  if (stage === 1){
    add(E(15, 36.4 + fj, 3, 1.7), M.BODY, 0); add(E(25, 36.4 + fj, 3, 1.7), M.BODY, 0);
    add(E(20, 28.6 + b, 10.6 + sq, 8.7 - sq * .8), M.BODY, 1);
    add(E(20, 32.2 + b, 6.6 + sq * .5, 4.6), M.BELLY, 2, M.BODY);
    add(Pg([[19.4, 21.2 + b], [20.7, 21.2 + b], [20.7, 18 + b], [19.4, 18 + b]]), M.LEAF, 3);
    add(E(17.3, 17.4 + b, 2.8, 1.55), M.LEAF, 3); add(E(23, 17 + b, 2.8, 1.55), M.LEAF, 3);
    return { shapes: out, face: { eyeL: [13, 23 + b], eyeR: [23, 23 + b], mouth: [20, 29 + b], cheeks: [[11, 28 + b], [27, 28 + b]] }, head: [20, 21 + b], neck: [20, 33 + b], forehead: 22 + b };
  }
  if (stage === 2){
    add(E(15.5, 37 + fj, 3.1, 1.7), M.BODY, 0); add(E(24.5, 37 + fj, 3.1, 1.7), M.BODY, 0);
    add(E(29.8, 34 + b, 4.1, 2.1, .15), M.BODY, 0); add(Pg([[32.4, 32.4 + b], [37, 31 + b], [35, 35 + b]], .1), M.BODY, 0);
    add(E(20, 30.6 + b, 8.9 + sq, 7.1 - sq * .6), M.BODY, 1);
    add(E(20, 32.6 + b, 5.5, 4.4), M.BELLY, 2, M.BODY);
    add(Pg([[13, 16.8 + b], [14.4, 10.6 + b], [17.4, 14.6 + b]]), M.HORN, 2); add(Pg(mirror([[13, 16.8 + b], [14.4, 10.6 + b], [17.4, 14.6 + b]])), M.HORN, 2);
    add(E(20, 21 + b, 9.7 + sq * .4, 8), M.BODY, 3);
    add(E(11.7, 30.2 + b, 2.2, 3.1), M.BODY, 4); add(E(28.3, 30.2 + b, 2.2, 3.1), M.BODY, 4);
    return { shapes: out, face: { eyeL: [13, 18 + b], eyeR: [23, 18 + b], mouth: [20, 24 + b], cheeks: [[11, 23 + b], [27, 23 + b]] }, head: [20, 14 + b], neck: [20, 28 + b], forehead: 16 + b };
  }
  // adult / legend
  const big = stage === 4 ? 1.08 : 1;
  const wl = [[15.5, 22], [7, 10.5], [2.6, 14.6], [5.2, 17.6], [2, 21.6], [6, 23.6], [4.8, 28.2], [14, 27]].map(([x, y]) => [20 - (20 - x) * big, y * big - (big - 1) * 26 + b + fl]);
  add(Pg(wl), M.WING, 0); add(Pg(mirror(wl)), M.WING, 0);
  add(E(15, 37.2 + fj, 3.4, 1.8), M.BODY, 0); add(E(25, 37.2 + fj, 3.4, 1.8), M.BODY, 0);
  add(E(30.4, 34.6 + b, 4.4, 2.3, .15), M.BODY, 0); add(Pg([[33.4, 32.6 + b], [38.4, 31.2 + b], [36.4, 35.8 + b]], .1), M.BODY, 0);
  add(E(20, 29.6 + b, 9.9 + sq, 8.3 - sq * .7), M.BODY, 1);
  add(E(20, 31.8 + b, 6.1, 5.3), M.BELLY, 2, M.BODY);
  add(Pg([[12.4, 14.6 + b], [13.4, 6 + b], [17.6, 12.2 + b]]), M.HORN, 2); add(Pg(mirror([[12.4, 14.6 + b], [13.4, 6 + b], [17.6, 12.2 + b]])), M.HORN, 2);
  add(E(20, 18.4 + b, 9.3, 7.7), M.BODY, 3);
  add(E(20, 21.9 + b, 5.3, 3.1), M.BELLY, 4, M.BODY);
  add(E(11, 29.2 + b, 2.3, 3.3), M.BODY, 5); add(E(29, 29.2 + b, 2.3, 3.3), M.BODY, 5);
  return { shapes: out, face: { eyeL: [13, 14 + b], eyeR: [23, 14 + b], mouth: [20, 21 + b], cheeks: [[11, 19 + b], [27, 19 + b]] }, head: [20, 11 + b], neck: [20, 26.5 + b], forehead: 13 + b, wingRoots: true };
}
const tonesOf = (P, m) => m === 1 ? P.body : m === 2 ? P.belly : m === 3 ? P.wing : m === 4 ? P.horn : m === 5 ? P.leaf : m === 6 ? P.shell : P.spot;
const outOf = (P, m) => m === 4 ? P.hornOut : m === 5 ? P.leafOut : (m === 6 || m === 7) ? P.shellOut : P.out;
const toneIdx = v => v < -.6 ? 0 : v < .34 ? 1 : v < .76 ? 2 : 3;

/* アクセサリー */
const AP = Object.fromEntries(Object.entries({
  o: "#2b1d2a", r: "#e8483f", R: "#a92f33", p: "#ff9fc0", P: "#e2608c", w: "#ffffff", g: "#d5dbe3", G: "#8d98a6",
  y: "#ffd447", Y: "#cf951b", b: "#4aa3ff", B: "#2d4f8c", k: "#26232e", K: "#4a4757", n: "#8a5a3b", N: "#5c3a26",
  s: "#f1f5fa", l: "#bfe6ff", m: "#7be0c3", v: "#a77be0", V: "#6b46a8", c: "#ffe9a8", e: "#5fbf63", E: "#3c8a43", f: "#ffb347"
}).map(([k, v]) => [k, hex(v)]));
PX.AP = AP;
function rowExtent(buf, y, cx = 20){ if (y < 0 || y >= SH) return [-1, -1]; const ok = x => x >= 0 && x < SW && (buf.mat[y * SW + x] === 1 || buf.mat[y * SW + x] === 2) && buf.z[y * SW + x] >= 1; if (!ok(cx)) return [-1, -1]; let a = cx, z = cx; while (ok(a - 1)) a--; while (ok(z + 1)) z++; return [a, z]; }
const ACC = {
  crown:   { slot: "hat", name: "王冠", draw: (L, A) => stampC(L, ["y...y...y", "yy.yby.yy", "ywyyyyyyy", "yyryyyryy", "YYYYYYYYY"], A.head[0], A.head[1] - 3) },
  beret:   { slot: "hat", name: "ベレー帽", draw: (L, A) => stampC(L, ["....RR.....", "..rrrrrrr..", ".rwrrrrrrrr", "rrrrrrrrrrR", ".RRRRRRRRR."], A.head[0] + 1, A.head[1] - 3) },
  ribbon:  { slot: "hat", name: "リボン", draw: (L, A) => stampC(L, ["pp...pp", "ppwPppp", "pppPppp", "pp...pp"], A.head[0] + 6, A.head[1] - 1) },
  nurse:   { slot: "hat", name: "ナースキャップ", draw: (L, A) => stampC(L, [".wwwwwww.", "wwwwrwwww", "wwwrrrwww", "wwwwrwwww", "ggggggggg"], A.head[0], A.head[1] - 3) },
  wizard:  { slot: "hat", name: "まほうのぼうし", draw: (L, A) => stampC(L, ["......vv...", ".....vvv...", "....vvvv...", "....vvyvv..", "...vvvvvvv.", "..vvvvvvvv.", "VVVVVVVVVVV"], A.head[0], A.head[1] - 5) },
  sprout:  { slot: "hat", name: "ふたば", draw: (L, A) => stampC(L, ["ee...ee", "eEe.eEe", ".eEeEe.", "...E...", "...E..."], A.head[0], A.head[1] - 4) },
  halo:    { slot: "hat", name: "天使の輪", draw: (L, A, buf, t) => stampC(L, ["..ccccc..", ".c.....c.", "..ccccc.."], A.head[0], A.head[1] - 7 + (Math.floor(t * 2) % 2)) },
  headband:{ slot: "hat", name: "必勝はちまき", draw: (L, A, buf) => { const y = A.forehead; for (const yy of [y, y + 1]){ const [a, z] = rowExtent(buf, yy); for (let x = a; x <= z && a >= 0; x++) L[yy * SW + x] = yy === y ? AP.w : AP.r; } const [, z] = rowExtent(buf, y); if (z > 0) stamp(L, ["rr", "r.", ".r"], { r: AP.r }, z, y); stamp(L, ["rr"], { r: AP.r }, A.head[0] - 1, y); } },
  mirror:  { slot: "hat", name: "額帯鏡", draw: (L, A, buf) => { const y = A.forehead; const [a, z] = rowExtent(buf, y); for (let x = a; x <= z && a >= 0; x++) L[y * SW + x] = AP.G; stampC(L, [".sss.", "sglgs", "slwls", "sglgs", ".sss."], A.head[0], y - 3); } },
  glasses: { slot: "face", name: "まるメガネ", draw: (L, A) => { if (!A.face) return; const ring = ["kkkkkk", "k....k", "k....k", "k....k", "k....k", "kkkkkk"]; const [lx, ly] = A.face.eyeL, [rx] = A.face.eyeR; stamp(L, ring, { k: AP.k }, lx - 1, ly - 1); stamp(L, ring, { k: AP.k }, rx - 1, ly - 1); for (let x = lx + 5; x < rx - 1; x++) L[(ly + 1) * SW + x] = AP.k; } },
  shades:  { slot: "face", name: "サングラス", draw: (L, A) => { if (!A.face) return; const lens = ["kkkkkk", "kKwkkk", "kkKkkk", ".kkkk."]; const [lx, ly] = A.face.eyeL, [rx] = A.face.eyeR; stamp(L, lens, { k: AP.k, K: AP.K, w: AP.w }, lx - 1, ly); stamp(L, lens, { k: AP.k, K: AP.K, w: AP.w }, rx - 1, ly); for (let x = lx + 5; x < rx - 1; x++) L[ly * SW + x] = AP.k; } },
  stetho:  { slot: "neck", name: "聴診器", draw: (L, A) => { const [nx, ny] = A.neck; for (let i = -6; i <= 6; i++){ const y = ny + Math.round((36 - i * i) / 12); L[y * SW + nx + i] = AP.B; } L[(ny - 1) * SW + nx - 6] = AP.G; L[(ny - 1) * SW + nx + 6] = AP.G; for (let y = ny + 3; y <= ny + 5; y++) L[y * SW + nx + 2] = AP.B; stamp(L, [".s.", "sGs", ".s."], { s: AP.s, G: AP.G }, nx + 1, ny + 5); } },
  scarf:   { slot: "neck", name: "マフラー", draw: (L, A, buf) => { const [nx, ny] = A.neck; for (const y of [ny - 1, ny]){ const [a, z] = rowExtent(buf, y); for (let x = a; x <= z && a >= 0; x++) L[y * SW + x] = ((x + y) % 4 < 2) ? AP.r : AP.w; } stamp(L, ["rr", "ww", "rr", "ww"], { r: AP.r, w: AP.w }, nx + 3, ny + 1); } },
  bowtie:  { slot: "neck", name: "蝶ネクタイ", draw: (L, A) => stampC(L, ["rr...rr", "rrrRrrr", "rr...rr"], A.neck[0], A.neck[1] - 1) },
  bell:    { slot: "neck", name: "すず", draw: (L, A, buf) => { const [nx, ny] = A.neck; const [a, z] = rowExtent(buf, ny - 1); for (let x = a; x <= z && a >= 0; x++) L[(ny - 1) * SW + x] = AP.r; stampC(L, [".yy.", "ywyY", "yyYY", ".kk."], nx, ny); } }
};
PX.ACC = ACC;
function stampC(L, map, cx, y0){ stamp(L, map, AP, Math.round(cx - map[0].length / 2), Math.round(y0)); }

function buildSprite(stage, colorKey, pose, equip, prog, t){
  const P = petPalette(colorKey);
  const buf = newBuf();
  const mdl = stageModel(stage, pose);
  for (const [sh, m, z, clip] of mdl.shapes) fillShape(buf, sh, m, z, clip);
  const img = new Uint8ClampedArray(SW * SH * 4);
  const put = (i, c, a = 255) => { img[i*4] = c[0]; img[i*4+1] = c[1]; img[i*4+2] = c[2]; img[i*4+3] = a; };
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++){
    const i = y * SW + x, m = buf.mat[i]; if (!m) continue;
    let t = toneIdx(buf.sh[i]);
    const nb = [y > 0 ? i - SW : -1, y < SH - 1 ? i + SW : -1, x > 0 ? i - 1 : -1, x < SW - 1 ? i + 1 : -1];
    for (const j of nb) if (j >= 0 && buf.mat[j] && buf.mat[j] !== m && buf.z[j] > buf.z[i]) t = Math.max(t, 2);
    if (t === 0 && y > 0 && !buf.mat[i - SW]) t = 1;
    put(i, tonesOf(P, m)[t]);
  }
  // 輪郭（セルアウト）
  const glow = pose.glow;
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++){
    const i = y * SW + x; if (buf.mat[i]) continue;
    let bz = -2, bm = 0, below = false;
    const nb = [[y > 0 ? i - SW : -1, false], [y < SH - 1 ? i + SW : -1, true], [x > 0 ? i - 1 : -1, false], [x < SW - 1 ? i + 1 : -1, false]];
    for (const [j, isBelow] of nb) if (j >= 0 && buf.mat[j] && buf.z[j] > bz){ bz = buf.z[j]; bm = buf.mat[j]; below = isBelow; }
    if (bm){ const o = glow || outOf(P, bm); put(i, below && !glow ? mix(o, tonesOf(P, bm)[3], .35) : o); }
  }
  // 翼の骨
  if (mdl.wingRoots){
    const W3 = petPalette(colorKey).wing[3];
    const lines = [[[15, 22], [7, 11]], [[15, 22], [2.6, 15]], [[15, 22], [2.4, 21.6]], [[15, 22], [5, 28]]];
    for (const side of [0, 1]) for (const [[x0, y0], [x1, y1]] of lines){
      const st = 24; for (let s2 = 0; s2 <= st; s2++){ let x = x0 + (x1 - x0) * s2 / st, y = y0 + (y1 - y0) * s2 / st + (pose.bob - pose.jump) + (pose.flap || 0); if (side) x = 40 - x; const i = Math.round(y) * SW + Math.round(x - .5); if (i >= 0 && i < SW * SH && buf.mat[i] === 3 && buf.z[i] === 0) put(i, W3); }
    }
  }
  // 卵のひび
  if (mdl.egg && prog > .35){
    const pts = [[12, 25], [14, 23], [16, 25], [18, 23], [20, 25], [22, 23], [24, 25], [26, 23], [28, 25]].map(([x, y]) => [x + Math.round(mdl.cx - 20), y + mdl.b]);
    const n = Math.min(pts.length, Math.ceil((prog - .35) / .65 * pts.length) + 1);
    for (let k = 0; k < n - 1; k++){ const [x0, y0] = pts[k], [x1, y1] = pts[k + 1]; const st = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let s = 0; s <= st; s++){ const x = Math.round(x0 + (x1 - x0) * s / st), y = Math.round(y0 + (y1 - y0) * s / st); const i = y * SW + x; if (buf.mat[i]) put(i, P.shellOut); } }
  }
  // 顔
  if (mdl.face){
    const F = mdl.face, L = [];
    const ep = { K: P.eye, W: P.eyeHi, R: P.eyeRef };
    const look = pose.look || 0;
    if (pose.eyes === "x"){ stamp(L, EYES.xl, ep, F.eyeL[0], F.eyeL[1]); stamp(L, EYES.xr, ep, F.eyeR[0], F.eyeR[1]); }
    else { const em = EYES[pose.eyes] || EYES.open; stamp(L, em, ep, F.eyeL[0] + look, F.eyeL[1]); stamp(L, em, ep, F.eyeR[0] + look, F.eyeR[1]); }
    if (pose.eyes === "sad"){ L[(F.eyeL[1]) * SW + F.eyeL[0] + 3] = P.eye; L[(F.eyeL[1] - 1) * SW + F.eyeL[0] + 2] = P.eye; L[(F.eyeR[1]) * SW + F.eyeR[0]] = P.eye; L[(F.eyeR[1] - 1) * SW + F.eyeR[0] + 1] = P.eye; }
    if (pose.blush !== false) for (const [cx, cy] of F.cheeks) stamp(L, ["CC"], { C: P.cheek }, cx, cy);
    const mm = MOUTHS[pose.mouth] || MOUTHS.cat;
    stamp(L, mm, { K: P.mouth, T: P.tongue }, Math.round(F.mouth[0] - mm[0].length / 2), F.mouth[1]);
    for (let i = 0; i < L.length; i++) if (L[i] && buf.mat[i]) put(i, L[i]);
  }
  // アクセサリー（自動輪郭つき）
  if (stage > 0 && equip){
    const A = { head: mdl.head.map(Math.round), neck: mdl.neck.map(Math.round), face: mdl.face, forehead: Math.round(mdl.forehead || 0) };
    const order = ["neck", "face", "hat"];
    for (const slot of order){
      const key = equip[slot]; const acc = key && ACC[key]; if (!acc) continue;
      const L = []; acc.draw(L, A, buf, t || 0);
      const ol = hex("#2b1d2a");
      for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++){
        const i = y * SW + x; if (L[i]) continue;
        if ((y > 0 && L[i - SW]) || (y < SH - 1 && L[i + SW]) || (x > 0 && L[i - 1]) || (x < SW - 1 && L[i + 1])) { if (slot === "hat" || slot === "neck" || buf.mat[i] || img[i*4+3]) put(i, ol); }
      }
      for (let i = 0; i < L.length; i++) if (L[i]) put(i, L[i]);
    }
  }
  if (pose.silhouette){ const c = pose.silhouette; for (let i = 0; i < SW * SH; i++) if (img[i*4+3]) put(i, c); }
  return img;
}
const spriteCache = new Map();
PX.sprite = function(stage, colorKey, pose, equip, prog, t){
  const key = [stage, colorKey, pose.bob, pose.jump, pose.sq, pose.eyes, pose.mouth, pose.look, pose.flap, pose.wob, pose.blush, pose.glow && pose.glow.join(), pose.silhouette && pose.silhouette.join(), equip && [equip.hat, equip.face, equip.neck].join(), Math.floor((prog || 0) * 20), equip && equip.hat === "halo" ? Math.floor((t || 0) * 2) % 2 : 0].join("|");
  let img = spriteCache.get(key);
  if (!img){ img = buildSprite(stage, colorKey, pose, equip, prog, t); if (spriteCache.size > 400) spriteCache.clear(); spriteCache.set(key, img); }
  return img;
};

/* ---------- 小さなアイコン ---------- */
const ICONS = {
  coin:  { pal: { o: "#7a4a12", y: "#ffd447", Y: "#d39a1c", w: "#fff6c2" }, map: ["..oooo..", ".oyyyyo.", "oywyyyYo", "oyyYYyYo", "oyyYYyYo", "oyyyyyYo", ".oYYYYo.", "..oooo.."] },
  flame: { pal: { R: "#b8321f", r: "#ff5a36", y: "#ffc23a", w: "#fff3b0" }, map: ["...R....", "..RrR...", "..RrrR..", ".RrryrR.", "RrryyrrR", "Rryywyr R", "Rrywwyr.", ".Rryyr..", "..RRR..."] },
  heart: { pal: { R: "#9c2546", r: "#ff5a7a", w: "#ffd3dd" }, map: [".RR.RR.", "RrwRrrR", "RrrrrrR", ".RrrrR.", "..RrR..", "...R..."] },
  food:  { pal: { o: "#3a3a3a", w: "#ffffff", g: "#d9d9d9", k: "#2f4a3a", K: "#3f6a52" }, map: ["...oo...", "..owwo..", ".owwwwo.", ".owwwwgo", "owwwwwgo", "owkkkkgo", "okKkkkko", ".oooooo."] },
  joy:   { pal: { o: "#6b4a10", y: "#ffd447", Y: "#e0a21c", k: "#4a3208" }, map: ["..oooo..", ".oyyyyo.", "oykyykyo", "oyyyyyYo", "oykyykYo", "oyykkyYo", ".oYYYYo.", "..oooo.."] },
  chest: { pal: { o: "#3b2412", n: "#a0683a", N: "#7a4a24", y: "#ffd447", Y: "#cf951b", w: "#e2b07c" }, map: [".ooooooo.", "onnwnnnno", "oNNNyNNNo", "oooyYyooo", "onnnynnno", "onnnnnnno", "oNNNNNNNo", ".ooooooo."] },
  star:  { pal: { o: "#7a4a12", y: "#ffd447", w: "#fff6c2", Y: "#d39a1c" }, map: ["...o...", "..oyo..", "ooywyoo", "oyyyyYo", ".oyyYo.", ".oyoYo.", ".o...o."] },
  gem:   { pal: { o: "#1b3a6b", b: "#6fc3ff", B: "#3a86d9", w: "#e6f6ff" }, map: [".oooo.", "obwbBo", "obbbBo", ".obBo.", "..oo.."] },
  shield:{ pal: { o: "#2d3a4a", s: "#dfe8f2", S: "#a9b8c9", y: "#ffd447" }, map: ["oooooo", "osyysSo", "osyysSo", "ossssSo", ".osSSo.", "..ooo.."] },
  lock:  { pal: { o: "#3a3a44", g: "#a8adb8", G: "#7a7f8c", y: "#ffd447" }, map: [".ooo.", "o...o", "o...o", "ooooo", "oyyGo", "oyGGo", "ooooo"] }
};
PX.ICONS = ICONS;
PX.drawMap = function(ctx, map, pal, x0, y0){
  for (let r = 0; r < map.length; r++) for (let c = 0; c < map[r].length; c++){
    const ch = map[r][c]; if (ch === "." || ch === " ") continue; const col = pal[ch]; if (!col) continue;
    ctx.fillStyle = typeof col === "string" ? col : css(col); ctx.fillRect(x0 + c, y0 + r, 1, 1);
  }
};
PX.icon = function(name, scale = 2, cls = "picon"){
  const ic = ICONS[name]; const w = Math.max(...ic.map.map(r => r.length)), h = ic.map.length;
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; cv.className = cls;
  cv.style.width = w * scale + "px"; cv.style.height = h * scale + "px";
  PX.drawMap(cv.getContext("2d"), ic.map, ic.pal, 0, 0);
  return cv;
};

/* ---------- 宝箱（大） ---------- */
const CHEST_PAL = {
  common:    { o: "#3b2412", n: "#b07440", N: "#7a4a24", w: "#e0aa74", y: "#ffd447", Y: "#cf951b" },
  rare:      { o: "#1d2c45", n: "#7fa8d6", N: "#4f73a3", w: "#c7defa", y: "#e8f1ff", Y: "#9ab6d8" },
  epic:      { o: "#2a1640", n: "#a16ee0", N: "#6b42a6", w: "#d6b8ff", y: "#ffd447", Y: "#cf951b" },
  legendary: { o: "#5a3a06", n: "#ffcc33", N: "#d4941a", w: "#fff1a8", y: "#ffffff", Y: "#ffe27a" }
};
PX.CHEST_PAL = CHEST_PAL;
PX.CHEST_LID = ["..oooooooooooo..", ".onnnwwnnnnnnnno.", "onnnwnnnnnnnnnno", "oNnnnnnnnnnnnnNo", "oyyyyyyyyyyyyyyo", "oNNNNNNNNNNNNNNo"].map(r => r.slice(0, 16));
PX.CHEST_BASE = ["oyyyyyyyyyyyyyyo", "onnnnnnyynnnnnno", "onnnnnoYYonnnnno", "onnnnnnyynnnnnno", "oNnnnnnnnnnnnnNo", "oNnnnnnnnnnnnnNo", "oNNnnnnnnnnnnNNo", "oyyyyyyyyyyyyyyo", ".oooooooooooooo."];

/* ---------- 背景（96×64） ---------- */
const BG = {};
PX.BG = BG;
const bgCache = new Map();
function cachedLayer(key, w, h, draw){ let c = bgCache.get(key); if (!c){ c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); draw(x, w, h); bgCache.set(key, c); } return c; }
function bands(x, w, cols){ cols.forEach(([y0, c]) => { x.fillStyle = c; x.fillRect(0, y0, w, 999); }); }
function hills(x, w, base, amp, freq, phase, col){ x.fillStyle = col; for (let i = 0; i < w; i++){ const y = Math.round(base - amp * (Math.sin(i * freq + phase) * .6 + Math.sin(i * freq * 2.3 + phase * 1.7) * .4)); x.fillRect(i, y, 1, 999); } }
function cloud(x, cx, cy, col, sh){ const m = ["...ww.....", ".wwwwww...", "wwwwwwwww.", "sswwwwwwss", ".ssssssss."]; for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++){ const ch = m[r][c]; if (ch === ".") continue; x.fillStyle = ch === "w" ? col : sh; x.fillRect(Math.round(cx) + c, cy + r, 1, 1); } }
function seeded(n){ let s = n; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function grassGround(x, w, y0, top, mid, dark, flowers){
  x.fillStyle = mid; x.fillRect(0, y0, w, 99); x.fillStyle = top; x.fillRect(0, y0, w, 1);
  const r = seeded(7);
  for (let i = 0; i < 70; i++){ const gx = Math.floor(r() * w), gy = y0 + 2 + Math.floor(r() * 12); x.fillStyle = dark; x.fillRect(gx, gy, 1, 1); x.fillRect(gx + 1, gy - 1, 1, 1); }
  for (let i = 0; i < 26; i++){ const gx = Math.floor(r() * w); x.fillStyle = top; x.fillRect(gx, y0 - 1, 1, 1); }
  if (flowers) for (let i = 0; i < 9; i++){ const fx = Math.floor(r() * w), fy = y0 + 3 + Math.floor(r() * 9); if (Math.abs(fx - 48) < 14 && fy < y0 + 8) continue; x.fillStyle = flowers[i % flowers.length]; x.fillRect(fx, fy, 1, 1); x.fillRect(fx - 1, fy + 1, 1, 1); x.fillRect(fx + 1, fy + 1, 1, 1); x.fillRect(fx, fy + 2, 1, 1); x.fillStyle = "#fff3a0"; x.fillRect(fx, fy + 1, 1, 1); }
}
BG.grass = {
  name: "そうげん",
  ground: 50,
  draw(x, w, h, t, tod){
    const night = tod === "night", dusk = tod === "dusk";
    const sky = night ? [[0, "#1d2154"], [14, "#252b66"], [26, "#2f377a"], [36, "#3b4690"]] : dusk ? [[0, "#5b5fb3"], [12, "#c477a8"], [22, "#f39a8e"], [32, "#ffc59a"]] : [[0, "#7cc8ff"], [12, "#94d4ff"], [22, "#addfff"], [32, "#c7eaff"]];
    x.drawImage(cachedLayer("grass-" + tod, w, h, (c) => {
      bands(c, w, sky);
      if (night){ const r = seeded(3); for (let i = 0; i < 26; i++){ c.fillStyle = "#ffffff"; c.fillRect(Math.floor(r() * w), Math.floor(r() * 34), 1, 1); } c.fillStyle = "#fff6c8"; for (const [dx, dy] of [[0,1],[1,0],[2,0],[3,1],[3,2],[2,3],[1,3],[0,2],[1,1],[1,2],[2,1],[2,2]]) c.fillRect(80 + dx, 7 + dy, 1, 1); c.fillStyle = "#1d2154"; c.fillRect(82, 7, 2, 3); }
      else if (!dusk){ c.fillStyle = "#fff4b8"; c.fillRect(79, 6, 8, 8); c.fillRect(78, 7, 10, 6); c.fillStyle = "#ffe066"; c.fillRect(80, 7, 6, 6); }
      else { c.fillStyle = "#ffdf8a"; c.fillRect(74, 30, 10, 6); c.fillRect(75, 29, 8, 1); }
      hills(c, w, 38, 4, .07, 1, night ? "#2a4560" : dusk ? "#8c6f9e" : "#a9dc94");
      hills(c, w, 44, 3, .11, 3, night ? "#22394a" : dusk ? "#6f5a86" : "#8fcf78");
      grassGround(c, w, 48, night ? "#3f7a4c" : "#7fd35a", night ? "#2f6040" : "#62b847", night ? "#24503a" : "#4c9a3a", night ? null : ["#ffffff", "#ff9fc0", "#ffd447"]);
    }), 0, 0);
    if (!night){ for (let k = 0; k < 3; k++){ const cx = ((t * (1.4 + k * .5) + k * 41) % (w + 24)) - 14; cloud(x, cx, 5 + k * 8, dusk ? "#ffd9d0" : "#ffffff", dusk ? "#e8a7b4" : "#dbefff"); } }
    else { const r = seeded(11); for (let i = 0; i < 10; i++){ const sx = Math.floor(r() * w), sy = Math.floor(r() * 32), ph = r() * 6; if (Math.sin(t * 2 + ph) > .3){ x.fillStyle = "#fffbe0"; x.fillRect(sx, sy, 1, 1); x.fillRect(sx - 1, sy, 1, 1); x.fillRect(sx + 1, sy, 1, 1); x.fillRect(sx, sy - 1, 1, 1); x.fillRect(sx, sy + 1, 1, 1); } } for (let i = 0; i < 5; i++){ const fx = (Math.sin(t * .5 + i * 2) * .5 + .5) * w, fy = 40 + Math.sin(t * .8 + i) * 6; if (Math.sin(t * 3 + i * 1.3) > -.2){ x.fillStyle = "#e9ff8a"; x.fillRect(Math.round(fx), Math.round(fy), 1, 1); } } }
  }
};
BG.night = { name: "よぞら", ground: 50, draw(x, w, h, t){ BG.grass.draw(x, w, h, t, "night"); } };
BG.beach = {
  name: "うみべ", ground: 51,
  draw(x, w, h, t){
    x.drawImage(cachedLayer("beach", w, h, c => {
      bands(c, w, [[0, "#6ec6ff"], [10, "#86d1ff"], [20, "#a3dcff"], [28, "#c2e9ff"]]);
      c.fillStyle = "#fff1a8"; c.fillRect(12, 6, 7, 7); c.fillRect(11, 7, 9, 5);
      bands(c, w, [[34, "#2e8fd1"], [38, "#3aa3e0"], [42, "#4fb7ea"]]);
      c.fillStyle = "#f6dfa4"; c.fillRect(0, 47, w, 99); c.fillStyle = "#fff0c4"; c.fillRect(0, 47, w, 1); c.fillStyle = "#e3c682"; const r = seeded(5); for (let i = 0; i < 40; i++) c.fillRect(Math.floor(r() * w), 49 + Math.floor(r() * 14), 1, 1);
      // palm
      c.fillStyle = "#9a6a3c"; for (let y = 18; y < 48; y++) c.fillRect(82 + Math.round(Math.sin(y / 9) * 2), y, 2, 1);
      c.fillStyle = "#3fa65a"; for (const [dx, dy, len] of [[-10, 2, 10], [2, 1, 10], [-7, -3, 7], [1, -4, 8]]) for (let i = 0; i < len; i++) c.fillRect(83 + dx + i, 18 + dy + Math.round(Math.abs(i - len / 2) / 2), 1, 2);
      c.fillStyle = "#ff8fb0"; c.fillRect(20, 55, 3, 2); c.fillStyle = "#fff"; c.fillRect(21, 55, 1, 1);
    }), 0, 0);
    for (let i = 0; i < 12; i++){ const wx = Math.round((i * 9 + t * 4) % (w + 6)) - 3, wy = 36 + (i % 3) * 4; x.fillStyle = "#e6f7ff"; x.fillRect(wx, wy, 3, 1); }
    const fo = Math.round(Math.sin(t * 1.5) * 1.5); x.fillStyle = "#ffffff"; x.fillRect(0, 46 + fo, w, 1);
    for (let k = 0; k < 2; k++) cloud(x, ((t * 1.2 + k * 50) % (w + 24)) - 14, 4 + k * 9, "#ffffff", "#dbefff");
  }
};
BG.library = {
  name: "としょかん", ground: 52,
  draw(x, w, h, t){
    x.drawImage(cachedLayer("library", w, h, c => {
      c.fillStyle = "#e9dcc4"; c.fillRect(0, 0, w, h); c.fillStyle = "#dccdb2"; for (let i = 0; i < w; i += 8) c.fillRect(i, 0, 1, 46);
      // window
      c.fillStyle = "#6b4a2c"; c.fillRect(38, 5, 22, 20); c.fillStyle = "#9fd8ff"; c.fillRect(40, 7, 18, 16); c.fillStyle = "#c7ebff"; c.fillRect(40, 7, 18, 5); c.fillStyle = "#6b4a2c"; c.fillRect(48, 7, 2, 16); c.fillRect(40, 14, 18, 1);
      // shelves
      const r = seeded(9); const bookCols = ["#d9534f", "#4a90d9", "#5cb85c", "#f0ad4e", "#8e6bd1", "#e07aa8", "#3fb0ac", "#c98a4b"];
      for (const sx of [2, 66]){ c.fillStyle = "#7a5230"; c.fillRect(sx, 4, 28, 44); c.fillStyle = "#5c3c22"; for (let sh = 0; sh < 4; sh++){ const y = 6 + sh * 10; c.fillRect(sx + 1, y + 8, 26, 2); let bx = sx + 2; while (bx < sx + 26){ const bw = 2 + Math.floor(r() * 2), bh = 5 + Math.floor(r() * 3); c.fillStyle = bookCols[Math.floor(r() * bookCols.length)]; c.fillRect(bx, y + 8 - bh, bw, bh); c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(bx, y + 8 - bh + 1, 1, 1); bx += bw + (r() < .2 ? 1 : 0); } c.fillStyle = "#5c3c22"; } }
      c.fillStyle = "#b07a4f"; c.fillRect(0, 48, w, 99); c.fillStyle = "#c48a5c"; c.fillRect(0, 48, w, 1); c.fillStyle = "#9a6741"; for (let y = 51; y < h; y += 4) c.fillRect(0, y, w, 1); for (let i = 0; i < 12; i++) c.fillRect((i * 17) % w, 49 + (i % 4) * 4, 1, 3);
      c.fillStyle = "#c0392b"; c.fillRect(34, 50, 28, 9); c.fillStyle = "#d65445"; c.fillRect(35, 51, 26, 1);
    }), 0, 0);
    if (Math.floor(t * 1.2) % 2){ x.fillStyle = "rgba(255,255,255,.5)"; x.fillRect(44, 9, 1, 1); }
  }
};
BG.sakura = {
  name: "さくら", ground: 50,
  draw(x, w, h, t){
    x.drawImage(cachedLayer("sakura", w, h, c => {
      bands(c, w, [[0, "#ffd6e7"], [12, "#ffe0ec"], [24, "#ffe9f1"], [34, "#fff1f6"]]);
      hills(c, w, 42, 3, .08, 2, "#c9e6b8");
      // tree
      c.fillStyle = "#7a4b3a"; c.fillRect(12, 18, 4, 32); c.fillRect(16, 26, 6, 2); c.fillRect(8, 30, 4, 2);
      const r = seeded(4); for (let i = 0; i < 160; i++){ const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 15; const px2 = Math.round(14 + Math.cos(a) * d * 1.4), py = Math.round(14 + Math.sin(a) * d * .8); c.fillStyle = r() < .3 ? "#ff9fc0" : r() < .6 ? "#ffc2d6" : "#ffe1ec"; c.fillRect(px2, py, 2, 2); }
      grassGround(c, w, 48, "#a8e07f", "#8fcf6a", "#74b553", ["#ffc2d6", "#ffffff"]);
    }), 0, 0);
    for (let i = 0; i < 10; i++){ const px2 = (i * 13 + t * 6 + Math.sin(t + i) * 4) % w, py = (i * 7 + t * (5 + i % 3)) % 50; x.fillStyle = i % 2 ? "#ff9fc0" : "#ffc2d6"; x.fillRect(Math.round(px2), Math.round(py), 2, 1); }
  }
};
BG.clinic = {
  name: "しんさつしつ", ground: 52,
  draw(x, w, h, t){
    x.drawImage(cachedLayer("clinic", w, h, c => {
      c.fillStyle = "#dff3ec"; c.fillRect(0, 0, w, h); c.fillStyle = "#cbe9df"; c.fillRect(0, 36, w, 12); c.fillStyle = "#b8ddd1"; c.fillRect(0, 36, w, 1);
      // eye chart
      c.fillStyle = "#ffffff"; c.fillRect(8, 6, 16, 24); c.fillStyle = "#c8d0d8"; c.fillRect(8, 30, 16, 1);
      c.fillStyle = "#222"; c.fillRect(14, 8, 4, 4); c.fillStyle = "#fff"; c.fillRect(17, 9, 1, 2);
      c.fillStyle = "#222"; [[11, 15], [15, 15], [19, 15]].forEach(([a, b]) => { c.fillRect(a, b, 3, 3); }); c.fillStyle = "#fff"; c.fillRect(12, 15, 1, 1); c.fillRect(17, 16, 1, 1); c.fillRect(20, 17, 1, 1);
      c.fillStyle = "#222"; for (let i = 0; i < 5; i++) c.fillRect(10 + i * 3, 21, 2, 2); for (let i = 0; i < 6; i++) c.fillRect(10 + i * 2 + (i > 2 ? 1 : 0), 26, 1, 1);
      // cross sign + window
      c.fillStyle = "#e8483f"; c.fillRect(44, 8, 8, 2); c.fillRect(47, 5, 2, 8);
      c.fillStyle = "#8aa"; c.fillRect(62, 6, 26, 20); c.fillStyle = "#bfe6ff"; c.fillRect(64, 8, 22, 16); c.fillStyle = "#d9f1ff"; c.fillRect(64, 8, 22, 6); c.fillStyle = "#8aa"; c.fillRect(74, 8, 2, 16);
      // bed
      c.fillStyle = "#9fb3c8"; c.fillRect(64, 40, 28, 2); c.fillStyle = "#ffffff"; c.fillRect(64, 34, 28, 6); c.fillStyle = "#e6eef5"; c.fillRect(66, 32, 8, 3); c.fillStyle = "#7b8ea3"; c.fillRect(64, 42, 2, 8); c.fillRect(90, 42, 2, 8);
      c.fillStyle = "#cfd8de"; c.fillRect(0, 48, w, 99); c.fillStyle = "#e3eaee"; c.fillRect(0, 48, w, 1); c.fillStyle = "#b9c4cb"; for (let i = 0; i < w; i += 12) c.fillRect(i, 48, 1, 99);
    }), 0, 0);
  }
};
BG.space = {
  name: "うちゅう", ground: 50,
  draw(x, w, h, t){
    x.drawImage(cachedLayer("space", w, h, c => {
      bands(c, w, [[0, "#0b0b2a"], [16, "#121238"], [32, "#1a1a48"]]);
      const r = seeded(21); for (let i = 0; i < 40; i++){ c.fillStyle = r() < .2 ? "#9fd0ff" : "#ffffff"; c.fillRect(Math.floor(r() * w), Math.floor(r() * 46), 1, 1); }
      c.fillStyle = "#ff9f6b"; for (let yy = -6; yy <= 6; yy++) for (let xx = -6; xx <= 6; xx++) if (xx*xx + yy*yy <= 36) c.fillRect(74 + xx, 14 + yy, 1, 1);
      c.fillStyle = "#e0703f"; for (let yy = 0; yy <= 6; yy++) for (let xx = -6; xx <= 6; xx++) if (xx*xx + yy*yy <= 36 && yy > 2) c.fillRect(74 + xx, 14 + yy, 1, 1);
      c.fillStyle = "#ffe0a8"; for (let xx = -10; xx <= 10; xx++) c.fillRect(74 + xx, 14 + Math.round(xx * .25), 1, 1);
      c.fillStyle = "#9aa3b8"; c.fillRect(0, 48, w, 99); c.fillStyle = "#b8c0d2"; c.fillRect(0, 48, w, 1); c.fillStyle = "#7c849a"; const r2 = seeded(8); for (let i = 0; i < 10; i++){ const cx = Math.floor(r2() * w), cy = 51 + Math.floor(r2() * 10); c.fillRect(cx, cy, 3, 1); c.fillRect(cx + 1, cy + 1, 2, 1); }
    }), 0, 0);
    const r = seeded(31); for (let i = 0; i < 8; i++){ const sx = Math.floor(r() * w), sy = Math.floor(r() * 44), ph = r() * 6; if (Math.sin(t * 3 + ph) > .5){ x.fillStyle = "#ffffff"; x.fillRect(sx - 1, sy, 3, 1); x.fillRect(sx, sy - 1, 1, 3); } }
    const sx = ((t * 18) % 220) - 40; if (sx > 0 && sx < w){ x.fillStyle = "#ffffff"; for (let k = 0; k < 6; k++){ x.globalAlpha = 1 - k / 6; x.fillRect(Math.round(sx - k), Math.round(6 + (sx - k) * .15), 1, 1); } x.globalAlpha = 1; }
  }
};

/* ---------- パーティクル ---------- */
const PMAPS = {
  heart:  [".r.r.", "rrrrr", ".rrr.", "..r.."],
  spark:  [".w.", "www", ".w."],
  spark2: ["..w..", "..w..", "wwwww", "..w..", "..w.."],
  coin:   [".yy.", "ywyY", "yyYY", ".YY."],
  petal:  ["pp", "p."],
  z:      ["kkk", ".k.", "kkk"],
  drop:   [".l.", "lll", ".l."],
  note:   [".kk", ".k.", "kk."]
};
PX.spawn = function(view, type, n, opt = {}){
  const cx = opt.x ?? (view.petX + 20), cy = opt.y ?? (view.petY + 16);
  for (let i = 0; i < n; i++){
    const a = opt.ring ? (i / n) * Math.PI * 2 : (-Math.PI / 2 + (Math.random() - .5) * (opt.spread ?? 2.2));
    const sp = (opt.speed ?? 18) * (opt.ring ? 1 : (.6 + Math.random() * .7));
    view.parts.push({ type, x: cx + (Math.random() - .5) * (opt.jitter ?? 10), y: cy + (Math.random() - .5) * 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: opt.g ?? (type === "coin" ? 40 : type === "heart" || type === "z" || type === "note" ? -4 : 8), life: opt.life ?? (.9 + Math.random() * .5), age: 0, col: opt.col });
  }
};
const PCOL = { heart: { r: "#ff5a7a" }, spark: { w: "#fff6b0" }, spark2: { w: "#ffffff" }, coin: { y: "#ffd447", Y: "#cf951b", w: "#fff6c2" }, petal: { p: "#ff9fc0" }, z: { k: "#5865a8" }, drop: { l: "#8fd3ff" }, note: { k: "#5a4a9a" } };
PX.stepParts = function(view, ctx, dt){
  const keep = [];
  for (const p of view.parts){
    p.age += dt; if (p.age > p.life) continue;
    p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.type === "heart" || p.type === "z" || p.type === "note"){ p.vx *= .96; }
    const fade = p.age > p.life * .7 && Math.floor(p.age * 20) % 2;
    if (!fade){ const m = PMAPS[p.type]; const pal = p.col ? Object.fromEntries(Object.keys(PCOL[p.type]).map(k => [k, p.col])) : PCOL[p.type]; PX.drawMap(ctx, m, pal, Math.round(p.x - m[0].length / 2), Math.round(p.y - m.length / 2)); }
    keep.push(p);
  }
  view.parts = keep;
};
})();
