/* 1戦を文字で流す： node tools/yomi-demo.js [bot] [seed] */
const { Y, BOTS } = require("./yomi-bots.js");
const bot = BOTS[process.argv[2] || "expert"], seed = +(process.argv[3] || 7);
const o = Y.newRun("hibachi", 1, seed);
o.party.push(Y.mkMon(o, "shizuku", 6)); o.party.push(Y.mkMon(o, "koishi", 6));
o.floor = +(process.argv[4] || 0);
for (const p of o.party){ const lv = [6, 11, 16, 21][o.floor]; const res = {lv:[],evo:[],learn:[]}; while (p.lv < lv) Y.gainXp(o, p, Y.xpNeed(p.lv) - p.xp, res); p.hp = Y.monMax(p); }
o.node = { t: process.argv[5] || "elite" }; o.node.foes = Y.genFoes(o, o.node.t);
const B = Y.startBattle(o, o.party.map(m => m.uid));
const nm = (s, m) => `${s === "P" ? "自" : "敵"}:${Y.SP[m.sp].n}(${Y.TN[m.ty || Y.SP[m.sp].t]}) ${m.hp}/${m.mhp}`;
const actS = (a, side) => !a ? "-" : a.k === "sw" ? `交代→${Y.SP[B[side].team[a.to].sp].n}` : a.k === "yomi" ? "必殺" : Y.MV[a.m].n;
let guard = 0;
while (!B.over && guard++ < 60){
  if (B.need){ const i = bot.rep(B, o); console.log("  (交代で出す)", Y.SP[B.P.team[i].sp].n); Y.chooseReplacement(B, i); continue; }
  const e = Y.act(B, "E"), p = Y.act(B, "P"), v = Y.intentView(B);
  console.log(`T${B.t} ${nm("P", p)} vs ${nm("E", e)}  ゲージ${B.P.gauge}`);
  console.log(`   予告 A:${actS(B.intent.A, "E")}  B:${actS(B.intent.B, "E")}  候補[${e.cand.map(c => Y.PE[c].n + "→" + v.byCand[c]).join(" ")}] ${v.known ? "確定" + v.known : "？"} (真:${Y.PE[e.pers].n}=${B.intent.letter})`);
  const a = bot.act(B, o);
  const pv = Y.preview(B, a);
  console.log(`   自分: ${actS(a, "P")}${B.intent.peek ? "（看破済）" : ""}  Aなら 与${pv.A.dealt} 受${pv.A.taken}  Bなら 与${pv.B.dealt} 受${pv.B.taken}`);
  Y.turn(o, a);
  const msg = B.ev.map(x => x.k === "hit" ? `${x.side === "E" ? "敵に" : "自に"}${x.dmg}${x.e >= 2 ? "(2倍)" : x.e < 1 ? "(半)" : ""}` : x.k === "yomi" ? `★読み勝ち[${x.kinds}]` : x.k === "reveal" ? `◎見抜いた:${Y.PE[x.pers].n}` : x.k === "faint" ? `${x.side}倒れた` : x.k === "sw" ? `${x.side}交代${Y.SP[x.sp].n}` : x.k === "status" ? `${x.side}${x.st}` : x.k === "stg" ? `${x.side}${JSON.stringify(x.ch)}` : x.k === "king" ? `王→${x.ty}` : x.k === "reflect" ? "跳ね返り" : x.k).join(" ");
  console.log("   →", msg);
}
console.log("結果", B.over, "ターン", B.t);
