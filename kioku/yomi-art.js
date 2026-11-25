/* ============================================================
   ヨミの塔のドット絵を描く（データは yomi-art-data.js。tools/yomi_sprites.py で作る）
   YART.img(id, 表示px, class, 左右反転) → <img>（data URL をキャッシュ）
   ============================================================ */
"use strict";
(function(){
const cache = new Map();
function url(id, flip){
  const key = id + (flip ? "|f" : "");
  if (cache.has(key)) return cache.get(key);
  const d = (window.YOMI_SPR || {})[id];
  if (!d){ cache.set(key, ""); return ""; }
  const h = d.r.length, w = d.r[0].length;
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  const CH = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let y = 0; y < h; y++){ const row = d.r[y]; for (let x = 0; x < w; x++){ const c = row[x]; if (c === ".") continue; g.fillStyle = d.c[CH.indexOf(c)]; g.fillRect(flip ? w - 1 - x : x, y, 1, 1); } }
  const u = cv.toDataURL(); cache.set(key, u); return u;
}
function size(id){ const d = (window.YOMI_SPR || {})[id]; return d ? [d.r[0].length, d.r.length] : [16, 16]; }
function img(id, px, cls, flip){
  const im = document.createElement("img");
  im.src = url(id, flip); im.alt = ""; im.draggable = false;
  im.className = "px-img" + (cls ? " " + cls : "");
  if (px){ const [w, h] = size(id); im.style.width = (px * w / Math.max(w, h)) + "px"; im.style.height = (px * h / Math.max(w, h)) + "px"; }
  return im;
}
window.YART = { url, img, size };
})();
