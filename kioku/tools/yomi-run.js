/* ラン全体をボットで遊ぶ： node tools/yomi-run.js bot runs [diff] [starter] */
const { Y, BOTS } = require("./yomi-bots.js");
const { SP, MV, IT, RL } = Y;
const hpPct = p => p.hp / Y.monMax(p);
function matchScore(o, m, foes){
  const fake = { rules: {}, rel: {}, kind: "wild" };
  const mm = mk(m, "P"), s = foes.reduce((t, f) => { const fm = mk(f, "E"); const mine = bestD(fake, "P", mm, fm) / fm.mhp, theirs = bestD(fake, "E", fm, mm) / Math.max(1, mm.hp); return t + mine - theirs * 1.1; }, 0);
  return s + hpPct(m) * .8;
}
function mk(src, side){ const st = Y.calcStats(src.sp, src.lv); return { sp: src.sp, lv: src.lv, mhp: st.mhp, hp: side === "P" ? src.hp : st.mhp, a: st.a, d: st.d, s: st.s, moves: src.moves, item: src.item, stg: { a: 0, d: 0, s: 0 } }; }
function bestD(B, side, a, d){ let b = 0; for (const id of a.moves){ const mv = MV[id]; if (mv.k !== "atk") continue; b = Math.max(b, Y.dmgCalc(B, side, a, d, mv).dmg); } return b; }
function pickTeam(o){
  const foes = o.node.foes, al = o.party.filter(m => m.hp > 0);
  const sc = al.map(m => [matchScore(o, m, foes), m]).sort((a, b) => b[0] - a[0]).slice(0, 3);
  // 先頭は最初の敵に強い子
  const f0 = foes[0];
  sc.sort((a, b) => matchScore(o, b[1], [f0]) - matchScore(o, a[1], [f0]));
  return sc.map(x => x[1].uid);
}
const RL_RANK = ["whet", "stone", "cup", "bellr", "beads", "book", "wing", "crown", "phoenix", "seal", "eye", "banner", "whistle", "flag", "mirror", "sand", "cat"];
function bestMoveSwap(p, id){
  const mv = MV[id]; if (p.moves.length < 4) return -2;
  if (mv.k !== "atk") return -1;
  let wi = -1, wp = 1e9;
  p.moves.forEach((m, i) => { const x = MV[m]; const v = x.k === "atk" ? x.p * (x.t === SP[p.sp].t ? 1.25 : 1) : 55; if (v < wp){ wp = v; wi = i; } });
  return mv.p * (mv.t === SP[p.sp].t ? 1.25 : 1) > wp + 10 ? wi : -1;
}
function playRun(botName, diff, starter, seed){
  const bot = BOTS[botName];
  const o = Y.newRun(starter, diff, seed), log = { floor: 0, battles: 0, turns: 0, yomi: 0, lv: [] };
  let guard = 0;
  while (o.phase !== "over" && guard++ < 400){
    if (o.phase === "map"){
      // 薬
      for (const p of o.party){ if (p.hp <= 0 && o.bag.revive > 0) Y.useCon(o, "revive", p.uid); if (p.hp > 0 && hpPct(p) < .45 && o.bag.potion > 0) Y.useCon(o, "potion", p.uid); }
      // 持ち物を付ける
      while (o.items.length){ const p = o.party.find(m => !m.item); if (!p) break; Y.equip(o, p.uid, 0); }
      const nx = Y.nextNodes(o);
      const avg = o.party.reduce((t, p) => t + hpPct(p), 0) / o.party.length;
      const pref = t => ({ rest: avg < .55 ? 9 : 2, recruit: o.party.length < 4 ? 7 : o.party.length < 6 ? 3 : 0, elite: avg > .7 ? 5 : 1, wild: 4, tutor: 3, shop: o.coins > 60 ? 4 : 1, event: 3, boss: 10 })[t];
      let best = nx[0], bv = -1;
      for (const [s, i] of nx){ const t = s === "boss" ? "boss" : o.map.rows[s][i].t; const v = pref(t) + Y.rnd({ s: seed + guard }) * .5; if (v > bv){ bv = v; best = [s, i]; } }
      Y.enterNode(o, best[0], best[1]);
      continue;
    }
    if (o.phase === "pre"){
      Y.applyOracle(o); Y.applyBump(o);
      const uids = pickTeam(o);
      if (!uids.length){ o.phase = "over"; o.result = "lose"; break; }
      const B = Y.startBattle(o, uids);
      let g = 0;
      while (!B.over && g++ < 120){
        if (B.need){ Y.chooseReplacement(B, bot.rep(B, o)); continue; }
        const a = bot.act(B, o); Y.turn(o, a);
      }
      if (!B.over) B.over = "lose";
      log.battles++; log.turns += B.t;
      const res = Y.finishBattle(o);
      if (!res.win){ log.lostAt = `${o.floor + 1}F ${o.node.t}`; if (process.env.TRACE) console.log(`  LOST ${log.lostAt} party ${o.party.map(p => SP[p.sp].n + p.lv + "(" + Math.round(hpPct(p)*100) + "%)").join(" ")} foes ${o.node.foes.map(f => SP[f.sp].n + f.lv).join(",")}`); break; }
      for (const L of res.learn){ const p = o.party.find(m => m.uid === L.uid); const i = bestMoveSwap(p, L.m); if (i >= 0) p.moves[i] = L.m; }
      if (res.recruit && o.party.length < 6) Y.recruit(o, res.recruit);
      if (res.relicOffer && res.relicOffer.length){ const r = res.relicOffer.slice().sort((a, b) => RL_RANK.indexOf(a) - RL_RANK.indexOf(b))[0]; o.relics.push(r); }
      if (o.node.t === "boss") log.floor = o.floor + 1;
      if (process.env.TRACE && (o.node.t === "boss" || o.node.t === "elite")) console.log(`  ${o.floor+1}F ${o.node.t} win  party ${o.party.map(p => SP[p.sp].n + p.lv + "(" + Math.round(hpPct(p)*100) + "%)").join(" ")}  foes ${o.node.foes.map(f => f.lv).join(",")} relics ${o.relics.length}`);
      Y.afterReward(o);
      continue;
    }
    if (o.phase === "partner"){ const off = o.node.offer.slice().sort((a, b) => SP[b.sp].b.reduce((x, y) => x + y) - SP[a.sp].b.reduce((x, y) => x + y)); Y.recruit(o, off[0]); Y.leaveNode(o); continue; }
    if (o.phase === "recruit"){ const off = o.node.offer.slice().sort((a, b) => SP[b.sp].b.reduce((x, y) => x + y) - SP[a.sp].b.reduce((x, y) => x + y)); if (off[0] && o.party.length < 6) Y.recruit(o, off[0]); Y.leaveNode(o); continue; }
    if (o.phase === "rest"){ const avg = o.party.reduce((t, p) => t + hpPct(p), 0) / o.party.length; if (avg < .8 || o.party.some(p => p.hp <= 0)) Y.rest(o, "heal"); else { const p = o.party.slice().sort((a, b) => a.lv - b.lv)[0]; Y.rest(o, "train", p.uid); o.phase = "map"; o.node = null; } continue; }
    if (o.phase === "tutor"){ for (const p of o.party){ const off = o.node.offers[p.uid] || []; for (const id of off){ const i = bestMoveSwap(p, id); if (i === -2){ Y.learn(o, p.uid, id); break; } if (i >= 0){ Y.learn(o, p.uid, id, i); break; } } } Y.leaveNode(o); continue; }
    if (o.phase === "shop"){ o.node.stock.forEach((it, i) => { if (it.k === "item" && o.party.some(p => !p.item)) Y.buy(o, i); }); if (o.coins >= 25) Y.buy(o, 0); Y.leaveNode(o); continue; }
    if (o.phase === "event"){ Y.doEvent(o, 0); if (o.pendingRecruit){ if (o.party.length < 6) Y.recruit(o, o.pendingRecruit); o.pendingRecruit = null; } if (o.phase === "tutor") continue; Y.leaveNode(o); continue; }
    if (o.phase === "reward"){ Y.afterReward(o); continue; }
    break;
  }
  log.clear = o.result === "clear";
  log.yomi = o.stats.yomi; log.lv = o.party.map(p => SP[p.sp].n + p.lv);
  return log;
}
module.exports = { playRun };
if (require.main === module){
  const [bot = "hedge", n = 10, diff = 1, starter = ""] = process.argv.slice(2);
  const ST = Y.STARTERS.slice(0, 3);
  let clear = 0, floors = [0, 0, 0, 0, 0], T = 0, Bt = 0, yo = 0; const lost = {};
  const t0 = Date.now();
  for (let i = 0; i < +n; i++){
    const st = starter || ST[i % 3];
    const r = playRun(bot, +diff, st, 1000 + i * 7919);
    if (r.clear) clear++; floors[r.floor]++; T += r.turns; Bt += r.battles; yo += r.yomi;
    if (r.lostAt) lost[r.lostAt] = (lost[r.lostAt] || 0) + 1;
    if (+n <= 6) console.log(st, r);
  }
  console.log(`${bot} diff${diff}: clear ${clear}/${n}  floors-cleared dist ${floors.join(",")}  turns/battle ${(T / Bt).toFixed(1)}  yomi/run ${(yo / n).toFixed(1)}  ${((Date.now() - t0) / n / 1000).toFixed(1)}s/run`);
  console.log("lost at", Object.entries(lost).sort((a, b) => b[1] - a[1]).map(x => x.join(":")).join("  "));
}
