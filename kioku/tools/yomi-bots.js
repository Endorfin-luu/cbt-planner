/* ヨミの塔のボット（バランス調整用。node で使う） */
"use strict";
require("../yomi-core.js");
const Y = globalThis.YOMI;
const { act, bench, legalActions, resolveCopy, evalFor, intentView, preview, MV, SP, PE } = Y;

/** 今のターン、A と B の確率 */
function letterProbs(B){
  const v = intentView(B);
  if (v.known) return v.known === "A" ? { A: 1, B: 0 } : { A: 0, B: 1 };
  const e = act(B, "E"); let a = 0, b = 0;
  for (const c of e.cand){ const l = v.byCand[c]; if (l === "A") a++; else if (l === "B") b++; else { a += .5; b += .5; } }
  const t = a + b || 1; return { A: a / t, B: b / t };
}
function expVal(B, pa, depth){
  const pr = letterProbs(B); let v = 0;
  for (const L of ["A", "B"]){
    if (pr[L] <= 0) continue;
    let C = resolveCopy(B, pa, L);
    let sc;
    if (depth > 1 && !C.over){
      if (C.need === "switch"){ // 倒れたら一番いい仲間を出す
        const bn = bench(C, "P"); let best = -1e9;
        for (const i of bn){ const D = Y.clone(C); D.sim = true; Y.chooseReplacement(D, i); Y.simNext(D); best = Math.max(best, D.over ? evalFor(D, "P") : bestNext(D)); }
        sc = bn.length ? best : evalFor(C, "P");
      } else { Y.simNext(C); sc = C.over ? evalFor(C, "P") : bestNext(C); }
    } else sc = evalFor(C, "P");
    v += pr[L] * sc;
  }
  return v;
}
function bestNext(C){ let best = -1e9; for (const a of legalActions(C)) best = Math.max(best, expVal(C, a, 1)); return best; }

/** 攻撃して下がる技なら、下がった先にいちばん合う仲間を選ぶ */
function withPivot(B, a){
  if (!a || a.k !== "move" || !MV[a.m].pivot) return a;
  const bn = bench(B, "P"); if (!bn.length) return a;
  let best = bn[0], bv = -1e9;
  for (const i of bn){ const v = expVal(B, { ...a, piv: i }, 1); if (v > bv){ bv = v; best = i; } }
  return { ...a, piv: best };
}
const BOTS = {
  random: { act: (B, o) => { const L = legalActions(B); return L[Math.floor(Y.rnd(o) * L.length)]; }, rep: (B, o) => { const bn = bench(B, "P"); return bn[Math.floor(Y.rnd(o) * bn.length)]; } },
  naive: { act: B => { const p = act(B, "P"), e = act(B, "E"); let best = null, bd = -1; for (const id of p.moves){ if (!Y.usable(p, id) || MV[id].k !== "atk") continue; const d = Y.dmgCalc(B, "P", p, e, MV[id]).dmg; if (d > bd){ bd = d; best = id; } } return best ? { k: "move", m: best } : legalActions(B)[0]; }, rep: B => Y.bestSwitch(B, "P", act(B, "E")) },
  hedge: { act: B => { let best = null, bv = -1e9; for (const a0 of legalActions(B)){ const a = withPivot(B, a0); const v = expVal(B, a, 1); if (v > bv){ bv = v; best = a; } } return best; }, rep: B => Y.bestSwitch(B, "P", act(B, "E")) },
  expert: { act: (B) => {
      const pr = letterProbs(B);
      // 割れていてゲージがあれば、情報の価値を見て看破
      if (pr.A > 0 && pr.B > 0 && (B.P.gauge >= 1 || Y.peekFree(B))){
        const acts = legalActions(B);
        let vNo = -1e9; for (const a of acts) vNo = Math.max(vNo, expVal(B, a, 2));
        const C = Y.clone(B); Y.peek(C);
        let vYes = -1e9; for (const a of legalActions(C)) vYes = Math.max(vYes, expVal(C, a, 2));
        if (vYes - vNo > (Y.peekFree(B) ? 0 : .12)){ Y.peek(B); }
      }
      let best = null, bv = -1e9;
      for (const a0 of legalActions(B)){ const a = withPivot(B, a0); const v = expVal(B, a, 2); if (v > bv){ bv = v; best = a; } }
      return best;
    }, rep: B => { const bn = bench(B, "P"); let best = bn[0], bv = -1e9; for (const i of bn){ const D = Y.clone(B); D.sim = true; Y.chooseReplacement(D, i); Y.simNext(D); const v = D.over ? evalFor(D, "P") : bestNext(D); if (v > bv){ bv = v; best = i; } } return best; } },
};
module.exports = { Y, BOTS, letterProbs, expVal };
