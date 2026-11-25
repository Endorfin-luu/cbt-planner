/* 条件をそろえた1戦の勝率： node tools/yomi-bench.js N bots... */
const { Y, BOTS } = require("./yomi-bots.js");
const N = +(process.argv[2] || 60), bots = process.argv.slice(3).length ? process.argv.slice(3) : ["naive", "hedge"];
const LV = [7, 12, 17, 22], LVB = [10, 15, 20, 25];
const roots = Object.values(Y.SP).filter(s => s.stage === 1 && !s.boss).map(s => s.id);
function party(o, f, kind){
  const r = Y.STARTERS.slice(0, 3)[Y.rnd(o) * 3 | 0];
  const picks = [r]; while (picks.length < 3){ const x = roots[Y.rnd(o) * roots.length | 0]; if (!picks.includes(x)) picks.push(x); }
  o.party = []; for (const sp of picks){ const lv = (kind === "boss" ? LVB : LV)[f] - (picks.indexOf(sp) ? 1 : 0); const m = Y.mkMon(o, Y.evolveTo(sp, lv), lv); m.moves = Y.learnedMoves(m.sp, lv); m.hp = Y.monMax(m); o.party.push(m); }
}
const out = {};
for (const bot of bots){
  for (let f = 0; f < 4; f++) for (const kind of ["wild", "elite", "boss"]){
    let w = 0, T = 0, yomi = 0, hpLeft = 0;
    for (let i = 0; i < N; i++){
      const o = Y.newRun("hibachi", 1, 99 + i * 31 + f * 7);
      o.floor = f; o.step = 4; party(o, f, kind); o.phase = "map"; o.node = { t: kind }; o.node.foes = Y.genFoes(o, kind);
      const B = Y.startBattle(o, o.party.map(m => m.uid));
      let g = 0;
      while (!B.over && g++ < 100){ if (B.need){ Y.chooseReplacement(B, BOTS[bot].rep(B, o)); continue; } Y.turn(o, BOTS[bot].act(B, o)); }
      if (B.over === "win"){ w++; hpLeft += B.P.team.reduce((t, m) => t + Math.max(0, m.hp) / m.mhp, 0) / 3; }
      T += B.t; yomi += o.stats.yomi;
    }
    console.log(`${bot.padEnd(6)} ${f + 1}F ${kind.padEnd(5)} win ${(w / N * 100).toFixed(0).padStart(3)}%  hpLeft ${(w ? hpLeft / w * 100 : 0).toFixed(0).padStart(3)}%  turns ${(T / N).toFixed(1)}  yomi ${(yomi / N).toFixed(1)}`);
  }
}
