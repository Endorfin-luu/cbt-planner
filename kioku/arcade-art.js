/* ============================================================
   ゲームのドット絵（スロットのシンボル・ジョーカー・ボス・トランプ）
   すべて小さなパレット文字列の絵で、canvas に描いて data URL にして使う。拡大は CSS の image-rendering: pixelated
   ============================================================ */
"use strict";
(function(){
const SPR = {
  coin: { p: {"o": "#6b3d0c", "y": "#ffd447", "Y": "#d9951c", "w": "#fff3b0"}, m: ["................", ".....oooooo.....", "...oowwwwwyoo...", "..owwwwwwyyyyo..", "..owwwYYYYyyyo..", ".owwwYwwwyYyyyo.", ".owwYwwYYyyYyyo.", ".owwYwwYYyyYyyo.", ".owwYwyYYyYYYYo.", ".owyYyyYYYYYYYo.", ".oyyyYyYYYYYYYo.", "..oyyyYYYYYYYo..", "..oyyyyYYYYYYo..", "...ooyYYYYYoo...", ".....oooooo.....", "................"] },
  cherry: { p: {"o": "#4a0f14", "r": "#e8343a", "R": "#a3161f", "w": "#ffb3a8", "s": "#5d7a2a", "l": "#6cc04a", "L": "#3f8a2e"}, m: ["..........oo....", ".........ollo...", ".........olLlo..", "........osolLo..", ".......ososoo...", "......osooso....", "....o.osooso....", "..oowoso..oso...", ".owwwrro.oowoo..", "owwwrrrrowwwrro.", "owwrrrrrwwwrrrro", "owrrrrrRwwrrrrro", "orrrrRRRwrrrrrRo", ".orrRRRorrrrRRRo", "..ooRoo.orrRRRo.", "....o....ooRoo.."] },
  flower: { p: {"o": "#5a1a3a", "p": "#ff8fc2", "P": "#d9558f", "w": "#ffd6ea", "y": "#ffd447", "Y": "#e09a1c", "g": "#4caf50", "G": "#2e7d32"}, m: ["......owwo......", ".....owwppo.....", "...oowwpppPoo...", "..owwppppPwwpo..", ".owwppppPwwpppo.", ".owpppyyyypppPo.", ".opppPyyyyppPPo.", "..opPPyyYYwpPo..", "..owwpppwwpppo..", "..owppppwpppPo..", "...oppPPpppPo...", "...opPPggPPPo...", "....oooggGggo...", "......oggoGGo...", "......oggooo....", "......oggo......"] },
  bee: { p: {"o": "#2a1d05", "y": "#ffd447", "Y": "#e09a1c", "w": "#fff3b0", "k": "#2a1d05", "W": "#e6f3ff", "e": "#ffffff"}, m: ["................", ".....o...ooo....", "...oowooowwWo...", "..owwwWWwwWWWo..", "..owwWWwwWWWWWo.", "..oWWWWWWWWWWo..", "..oWWwwkkwyko...", "...owwwkkyykyo..", "..owwwwkkyykyyo.", "..okewykkyykyyoo", "..okwyykkyykYYok", "..oyyyykkyYkYYoo", "...oyyykkYYkYo..", "....oyYkkYYko...", ".....okkookko...", "......oo..oo...."] },
  cat: { p: {"o": "#4a2508", "n": "#f5a142", "N": "#c9731f", "w": "#ffd9a0", "p": "#ff9eb3", "k": "#2b1606", "e": "#ffffff"}, m: [".............o..", "..o.........ono.", ".ono.......onno.", ".onnooooooonpno.", ".onpwwwwwwnppno.", ".onpwwwwwnnnpno.", ".owwwwwwnnnnnno.", ".owwwwwnnnnnnno.", ".owwwennnnennno.", ".owwnknnnnknNNo.", "kownnnnnnnnNNNok", ".knnnnnppNNNNNk.", "..onnnnkkNNNNo..", "...onnkNNkNNo...", "....oooooooo....", "................"] },
  milk: { p: {"o": "#26344a", "W": "#ffffff", "w": "#ffffff", "g": "#c9d6e6", "b": "#3d7fd9"}, m: ["......oooo......", ".....obbbbo.....", ".....obbbbo.....", ".....oWWWWo.....", ".....oWWWWo.....", "....oWWWWWWo....", "...oWwwWWWWo....", "...oWwoWWWWWo...", "..oWWWWWWWWgo...", "..oWbbbbbbbgo...", "..oWbbWWWWbgo...", "..oWbbWWWWbgo...", "..oWbbbbbbbgo...", "..oWWWWWWWWgo...", "..oWWWWWWWWgo...", "...ooooooooo...."] },
  seed: { p: {"o": "#3b2410", "n": "#b07a45", "N": "#7a4f26", "w": "#dcae7a", "g": "#3f8a2e", "l": "#7ad04f", "L": "#3f8a2e"}, m: ["................", "........ooooo...", "...ooooolllllo..", "..olllllllllLo..", "..ollllLllLLLo..", "..ollLLLgoooo...", "...ooooogo......", "......oogo......", "....oowwgwoo....", "...owwwwnnnno...", "...owwwnnnnno...", "..owwwNnnnnNNo..", "...onnnnnNNNo...", "...onnnnNNNNo...", "....ooNNNNoo....", "......oooo......"] },
  dice: { p: {"o": "#2b2b33", "w": "#ffffff", "W": "#e2e4ea", "G": "#b8bcc8", "k": "#2b2b33", "r": "#e8343a"}, m: [".......oo.......", ".....oowwoo.....", "...oowwwwwwoo...", ".oowwwwwwwwwwoo.", "owwwwwwrrwwwwwwo", "oWWwwwwwwwwwwGGo", "oWWWWwwwwwwGGGGo", "oWWWWkWwwGGGGkGo", "oWWkWWWWGGkGGGGo", "oWWWWWWWGGGkGGGo", "oWWWWkWWGGGGkGGo", "oWWkWWWWGGkGGkGo", ".ooWWWWWGGGGGoo.", "...ooWWWGGGoo...", ".....ooWGoo.....", ".......oo......."] },
  rock: { p: {"o": "#2a2c33", "g": "#9aa1ad", "G": "#6b717d", "w": "#cdd2da", "k": "#5b6070"}, m: ["................", "................", "......ooo.......", ".....owggoo.....", "....owgggggo....", "...oggggggggo...", "..oggggggggggo..", ".ogggggggggggGo.", ".oggggkooggGGGo.", "ogggggokogGGGGo.", "ogggggookGGkGGo.", "oggggggGGGGGkGGo", ".ogggGGGGGGGGGGo", ".ogGGGGGGGGGGGGo", "..ooooooooooooo.", "................"] },
  egg: { p: {"o": "#5a4a30", "e": "#fff4dc", "E": "#e3cf9f", "w": "#ffffff"}, m: ["................", "................", "......oooo......", ".....owwwwo.....", "....owwwweeo....", "...owwwweeeeo...", "..owwwweeeeeeo..", "..owwwweeeeeeo..", "..owwweeeeeeEo..", "..owweeeeeeEEo..", "..oweeeeeeEEEo..", "..oweeeeeEEEEo..", "...oeeeeEEEEo...", "....oeeEEEEo....", ".....oEEEEo.....", "......oooo......"] },
  fish: { p: {"o": "#122a4a", "b": "#4fa3e8", "B": "#2a6fb8", "w": "#bfe3ff", "e": "#ffffff", "k": "#122a4a"}, m: ["................", "................", "........o.......", ".....oooBo......", "...oowBBBBo...o.", "..owwwwwbbbo.oBo", ".owwkwbBbbbboBBo", "owwwebbBbbbbBBBo", "owwbbbbBbbBBBBBo", ".okbbbbBBBBBoBBo", "..obbbBBBBBo.oBo", "...ooBBBBoo...o.", ".....oooo.......", "................", "................", "................"] },
  apple: { p: {"o": "#4a0f14", "r": "#e8343a", "R": "#a3161f", "w": "#ffb3a8", "s": "#6b4423", "l": "#7ad04f", "L": "#3f8a2e"}, m: ["................", "........ooooo...", ".......olllllo..", ".....ooolllLLo..", "....owwwRwroo...", "...owwwwwrrro...", "..owwwwwrrrrro..", ".owwwwwrrrrrrro.", ".owwwwrrrrrrrro.", ".owwwrrrrrrrrRo.", ".owwrrrrrrrRRRo.", ".owrrrrrrrRRRRo.", "..orrrrrRRRRRo..", "...orrrRRRRRo...", "....oRRRRRRo....", ".....oooooo....."] },
  tree: { p: {"o": "#1f3a14", "l": "#5fbf3f", "L": "#2f8a2a", "w": "#a6e57a", "t": "#8a5a2b", "T": "#5e3b1a"}, m: [".....oooooo.....", "...oowwwwwloo...", "..owwwwwwllllo..", ".owwwwwwllllllo.", ".owwwwwlllLlllo.", "owwwwLlllllllllo", "owwwwllllllllLLo", "owwlllllllllLLLo", ".ollllLlllLLLLo.", ".ollllllLLLLLLo.", "..ollllLLLLLLo..", "...ooLLLLLLoo...", ".....oottTo.....", "......ottTo.....", "......ottTo.....", "......ottTo....."] },
  hen: { p: {"o": "#3a2a1a", "w": "#ffffff", "W": "#d9dde6", "r": "#e8343a", "y": "#ffb020", "k": "#1a1a1a"}, m: ["....oo..........", "...orro.........", "..orrro.........", "..owwwwo......o.", "..owwwwo.....oWo", ".oywkwwwoooooWWo", ".oywwwwwwwwwoWWo", "..owwwwwwwwwwWWo", "..owrwwwwWwwwwWo", "..owwwwWWWWWwWo.", "..owwwWWWWWWWWo.", "..owwwwWWWWWWWo.", "...owwwwWWWWWo..", "....owwWWWWWo...", ".....ooyooyo....", "......oyooyo...."] },
  fisher: { p: {"o": "#2a1d10", "n": "#c08a4a", "N": "#7a5428", "s": "#dfe8f2", "r": "#e8343a", "w": "#ffffff", "k": "#3a3a44", "g": "#a8adb8"}, m: ["................", "............oo..", "...........onso.", "..........onNoso", ".........onNooso", ".........oNo.oso", "........onNo.oso", ".......onNo..oso", "......onNo...oso", ".....onNo....oso", "...oonNo....orro", "..okkkNo...orrwr", "..okgko.....orro", "..okkko......oo.", ".onNoo..........", "..oo............"] },
  bear: { p: {"o": "#2e1a0a", "n": "#9a5f2e", "N": "#6e3f1a", "w": "#c48a52", "m": "#e6c39a", "p": "#e6a07a", "k": "#1a0e05", "e": "#ffffff"}, m: ["..ooo......ooo..", ".onnno....onnno.", "onnnnnoooonnnnno", "onnpnwwwwwwnpnno", "onnnwwwwwwnnnnno", ".onwwwwwwnnnnno.", ".owwwewnnnennno.", ".owwwknnnnknnno.", "owwwwnnnnnnnnnNo", "owwwnnmmmmnnNNNo", ".ownnmmkkmmNNNo.", ".onnnmmmmmmNNNo.", "..onnnmmkmNNNo..", "...onnNNNNNNo...", "....oNNNNNNo....", ".....oooooo....."] },
  honey: { p: {"o": "#4a2a05", "b": "#b07a45", "h": "#f0a020", "H": "#c06f10", "w": "#ffd47a", "L": "#fff4dc", "l": "#ffffff", "y": "#ffc83a"}, m: ["................", "....oooooooo....", "...obbbbbbbbo...", "...obbbbbbbbo...", "...ohhhhhhhyo...", "...ohhhhhhhyo...", "..owwwwwwhhyho..", ".owwLllLLLLyhho.", ".owwLloLLLLLhho.", ".owwLLLLLLLLhho.", ".owwhhhhhhhhHHo.", ".owhhhhhhhhHHHo.", ".ohhhhhhhHHHHHo.", "..ohhhhHHHHHHo..", "...ohhHHHHHHo...", "....oooooooo...."] },
  pick: { p: {"o": "#24262e", "n": "#c08a4a", "N": "#7a5428", "s": "#a8b2c2", "w": "#e3e9f2"}, m: ["................", "......oooo......", ".....ossswoo....", ".....osssswwo...", "......ooosswwo..", ".........ooswo..", "..........onswo.", ".........onNssso", "........onNossso", ".......onNo.oso.", "......onNo..oso.", ".....onNo....o..", "....onNo........", "...onNo.........", "..onNo..........", "...oo..........."] },
  can: { p: {"o": "#122a4a", "b": "#4fa3e8", "B": "#2a6fb8", "w": "#bfe3ff", "s": "#8aa0b8", "d": "#7fd0ff"}, m: ["................", "................", ".....oo.......oo", "....osso.....oss", "...osooso....oss", "...osoosoo...oBo", "..oowwwwwboooBod", ".owwwwwbbbbboBdo", ".owwwwbbbbbbBood", ".owwwbbbbbbBo..o", ".owwbbbbbbBBo...", ".obbbbbbbBBBo...", ".obbbbbBBBBBo...", "..oobBBBBBoo....", "....oooooo......", "................"] },
  magnet: { p: {"o": "#3a0a0a", "r": "#e8343a", "R": "#a3161f", "w": "#ff9b8f", "s": "#d9dde6"}, m: ["................", ".....oooooo.....", "...oowwwwwroo...", "..owwwwwwrrrro..", "..owwwwwrrrrro..", ".owwwwoooorrrro.", ".owwwo....orrro.", ".owwwo....orrro.", ".owwro....orRRo.", "orrrro....oRRRRo", "orrrro....oRRRRo", ".ossso....ossso.", ".ossso....ossso.", ".ossso....ossso.", ".ossso....ossso.", "..ooo......ooo.."] },
  fox: { p: {"o": "#3a1a05", "n": "#f07a2a", "w": "#ffffff", "k": "#1a0e05"}, m: [".o............o.", "ono..........ono", "onno........onno", ".okno......onko.", ".okkno....onkno.", ".onknooooonnkno.", "onnnnnnnnnnnnnno", ".onnnnnnnnnnnno.", ".onnnknnnnknnno.", "..onnnnnnnnnno..", "..owwwnnnwwwo...", "...owwwnwwwo....", "....owwwwwo.....", ".....owkko......", "......okko......", ".......oo......."] },
  rainbow: { p: {"o": "#3a3a5a", "r": "#ff4a4a", "y": "#ffd447", "g": "#4fd06a", "b": "#4fa3e8", "p": "#a46ff0", "w": "#ffffff", "W": "#dfe6f2"}, m: ["................", "................", "................", "................", "....oooooooo....", "...orrrrrrrro...", "..orrrrrrrrrro..", ".orrryyyyyyrrro.", "orryyggggggyyrro", "rrrygbbbbbbgyrrr", "rrygbbppppbbgyrr", "rwwwwpoooopwwwwr", "wwwwwWo..owwwwwW", "owwWWo....owwWWo", ".oooo......oooo.", "................"] },
  gem: { p: {"o": "#0f2a5a", "b": "#4fc3ff", "B": "#2a86d9", "D": "#1a5aa8", "w": "#bdf0ff", "W": "#ffffff"}, m: ["................", "....oooooooo....", "...owwwwBBBBo...", "..owwwwbbBBBBo..", ".owwWwwbbBBBBBo.", "owwwwwbbbbBBBBBo", "obbbbbBBBBDDDDDo", ".obbbbBBBBDDDDo.", "..obbbbBBDDDDo..", "...obbbBBDDDo...", "...obbbBBDDo....", "....obbBBDDo....", ".....obBBDo.....", "......obDo......", ".......oo.......", "................"] },
  crown: { p: {"o": "#5a3505", "y": "#ffd447", "Y": "#d9951c", "w": "#fff3b0", "r": "#e8343a", "b": "#4fc3ff"}, m: ["........o.......", ".......obo......", ".o.....oo......o", "oro...oyyo....or", ".o....oyyo....oo", "oyo..oyyyyo..oyo", "oyyoooyyyyo.oyyo", "oyyowyyyyyyooyyo", "oyyywyyyyyyoyyo.", ".oyyyyyyyyyyyyo.", ".oyyyyyyyyyyyyo.", ".oYYYYYYYYYYYYo.", ".oYYYrYYbYYrYYo.", ".oYYYYYYYYYYYYo.", "..oooooooooooo..", "................"] },
  mirror: { p: {"o": "#3a2505", "f": "#d9a03a", "F": "#a06a1a", "m": "#9fd8ff", "M": "#5fa8e0", "w": "#d6f0ff", "W": "#ffffff"}, m: [".....oooooo.....", "....offffffo....", "...offfwWfffo...", "..offwwWwmmffo..", "..offwWwmmmffo..", "..ofwwwmmmmmfo..", "..ofwwmmmmmmfo..", "..ofwwmmmmMMfo..", "..ofwmmmmMMMfo..", "..offmmmMMMffo..", "..offmmMMMMffo..", "...offfMMfffo...", "....offffffo....", ".....oofffo.....", ".....oofffoo....", "....oFFFFFFFo..."] },
  clover: { p: {"o": "#14381a", "l": "#5fd04f", "L": "#2f8a2a", "w": "#b6f09a"}, m: ["................", "...oooooooooo...", "..owwwllwwwllo..", ".owwwllwwwllllo.", ".owwlllwwlllllo.", ".owllllwllllLLo.", ".ollllLllllLLLo.", "..owwwllLwwllo..", ".owwwllLLwllllo.", ".owwlllwwLllllo.", ".owllllwlLllLLo.", ".ollllLlllLLLLo.", "..ollLLLllLLLo..", "...ooooooooLo...", "..........oLo...", "...........oLo.."] },
  dragon: { p: {"o": "#0f2a14", "g": "#4fbf5a", "G": "#2a8a3a", "h": "#e6e0c8", "k": "#14200f", "w": "#ffffff", "y": "#ffd447"}, m: ["..........o.....", ".....oo..oho....", "....ohhoohhho...", "....ohhhgghho...", "..ooogggggggoo..", ".oggggggggggggo.", "oggggggggykggggo", "oggkgggggyyggggo", "oggggggggggggggo", "ogggwggggggggggo", ".okkkkkkkkgggggo", "..owGGwGGgggggo.", "...oooGGGgggoo..", "......ooGgoo....", "........oo......", "................"] },
  vault: { p: {"o": "#1f2229", "s": "#9aa1ad", "S": "#7b8290", "k": "#2f333c", "y": "#ffd447", "Y": "#d9951c", "w": "#fff3b0", "d": "#4a4f5a"}, m: ["................", ".oooooooooooooo.", "osssssssssssssso", "osSSSSSSSSSSSSso", "osSSSSwwkySSSSso", "osSSSwwwkyySSSso", "osSSSwwkkyyddSso", "osSSwwykkyyddSso", "osSSSyykkYYddSso", "osSSSyyyYYYddSso", "osSSSSyYYYSSSSso", "osSSSSSSSSSSSSso", "osSSSSSSSSSSSSso", "osssssssssssssso", "okkkooooooookkko", "okkko......okkko"] },
  j_plus4: { p: {"o": "#4a0a0a", "r": "#e8343a", "w": "#ff8a80"}, m: [".....oo.....", "....owro....", "....owro....", "....owro....", ".oooowroooo.", "orrrrwrrrrro", "orrrrwrrrrro", ".oooowroooo.", "....owro....", "....owro....", "....owro....", ".....oo....."] },
  j_pairy: { p: {"o": "#2a1a3a", "p": "#ffd2a8", "b": "#a46ff0", "k": "#2a1a3a"}, m: ["..ooo..ooo..", ".opppoopppo.", ".opppoopppo.", ".opkpoopkpo.", ".opppoopppo.", ".obbbbobbbbo", ".obbbbobbbbo", ".obbbbobbbbo", ".obbbbobbbbo", ".obbbbobbbbo", ".obbbbobbbbo", "..oooo.oooo."] },
  j_trio: { p: {"o": "#4a0a0a", "r": "#ff6a4a"}, m: [".....oo.....", "....orro....", "...orrrro...", "...orrrro...", "....orro....", ".....oo.....", ".oooo..oooo.", "orrrroorrrro", "orrrroorrrro", "orrrroorrrro", ".oooo..oooo.", "............"] },
  j_lineup: { p: {"o": "#14381a", "g": "#5fd04f", "G": "#2f8a2a"}, m: ["........oGGG", "........oGGG", "......oooGGG", ".....oGGGGGG", ".....oGGGGGG", "...oooGGGGGG", "..ogggGGGGGG", "..ogggGGGGGG", "ooogggGGGGGG", "ggggggGGGGGG", "ggggggGGGGGG", "ggggggGGGGGG"] },
  j_paint: { p: {"o": "#3a2505", "n": "#e8c08a", "w": "#f6dcb0", "r": "#e8343a", "b": "#3d7fd9", "g": "#4caf50", "y": "#ffd447"}, m: ["............", "...oooooo...", "..owwwwwno..", ".owwwwbnnno.", "owwwwwnnnnno", "owwrnnnnngno", "wwwnnnnnnnnn", "ownnnnnnonno", "onnnynno.ono", ".onnnnnnono.", "..onnnnnno..", "...oooooo..."] },
  j_suitS: { p: {"s": "#2b2b40", "h": "#2b2b40", "d": "#2b2b40", "c": "#2b2b40", "w": "#ffb3a8", "o": "#1a1a24"}, m: ["............", ".....ss.....", "....ssss....", "...ssssss...", "..ssssssss..", ".ssssssssss.", ".ssssssssss.", "..ss.ss.ss..", ".....ss.....", "....ssss....", "............", "............"] },
  j_suitH: { p: {"s": "#e8343a", "h": "#e8343a", "d": "#e8343a", "c": "#e8343a", "w": "#ffb3a8", "o": "#1a1a24"}, m: ["............", "............", "..hhh..hhh..", ".hhhhhhhhhh.", ".hwhhhhhhhh.", ".hhhhhhhhhh.", "..hhhhhhhh..", "...hhhhhh...", "....hhhh....", ".....hh.....", "............", "............"] },
  j_suitD: { p: {"s": "#e8343a", "h": "#e8343a", "d": "#e8343a", "c": "#e8343a", "w": "#ffb3a8", "o": "#1a1a24"}, m: ["............", ".....dd.....", "....dddd....", "...dwdddd...", "..dddddddd..", ".dddddddddd.", "..dddddddd..", "...dddddd...", "....dddd....", ".....dd.....", "............", "............"] },
  j_suitC: { p: {"s": "#2b2b40", "h": "#2b2b40", "d": "#2b2b40", "c": "#2b2b40", "w": "#ffb3a8", "o": "#1a1a24"}, m: ["............", "....cccc....", "...cccccc...", "...cccccc...", "..cc.cc.cc..", ".cccccccccc.", ".cccccccccc.", "..cc.cc.cc..", ".....cc.....", "....cccc....", "............", "............"] },
  j_face: { p: {"o": "#5a3505", "y": "#ffd447", "Y": "#d9951c", "r": "#e8343a"}, m: ["............", ".....oo.....", "....oyyo....", "....oyyo....", ".o.oyyyyo.o.", "oyooyyyyooyo", "oyyyyyyyyyo.", ".oyyyyryyyo.", ".oyyyyyyyyo.", ".oYYYYYYYYo.", ".oYYYYYYYYo.", "..oooooooo.."] },
  j_even: { p: {"o": "#2b2b33", "w": "#ffffff", "k": "#2b2b33"}, m: [".oooooooooo.", "owwwwwwwwwwo", "owwwwwwwwwwo", "owwkwwwwkwwo", "owwwwwwwwwwo", "okkkkkkkkkko", "okkkkkkkkkko", "owwwwwwwwwwo", "owwkwwwwkwwo", "owwwwwwwwwwo", "owwwwwwwwwwo", ".oooooooooo."] },
  j_odd: { p: {"o": "#3a0a0a", "r": "#e8343a", "w": "#ffffff", "y": "#ffd447"}, m: ["...oooooo...", "..orrrrrro..", ".orrrwwrrro.", "orrwwwwwwrro", "orrwrrrrwrro", "orwwryyrwwro", "orwwryyrwwro", "orrwrrrrwrro", "orrwwwwwwrro", ".orrrwwrrro.", "..orrrrrro..", "...oooooo..."] },
  j_small: { p: {"o": "#2b2b33", "w": "#ffffff", "r": "#e8343a", "k": "#2b2b33"}, m: ["............", "....oooo....", ".ooowwwwooo.", "owwwwwwwwwwo", "owwwwkwwwwwo", "owrwwwwwrwwo", "owwwwwwwwwwo", "owwwwwwwwwwo", "owwwwoowwwwo", ".oooo..oooo.", "............", "............"] },
  j_last: { p: {"o": "#3a1a2a", "y": "#ffb03a", "w": "#fff3b0", "p": "#ff7a8a", "b": "#5a3a8a", "B": "#7a5aaa"}, m: ["............", "............", "....oooo....", "...oyyyyo...", "..oyyyyyyo..", ".oyyyyyyyyo.", ".oyyyyyyyyo.", "oooooooooooo", "pppppppppppp", "bbbbbbbbbbbb", "bbBBBBbbbbbb", "bbbbbbbbbbbb"] },
  j_grow: { p: {"o": "#14381a", "g": "#5fd04f", "k": "#6b717d"}, m: ["ko......ooo.", "ko.....ogggo", "ko......oogo", "ko.......ogo", "ko......ogo.", "ko..o..ogo..", "ko.ogoogo...", "koogogogo...", "kogo.ogo....", "kogo..o.....", "kgoooooooooo", "kkkkkkkkkkkk"] },
  j_stack: { p: {"o": "#3a1a0a", "b": "#c8643a", "m": "#e8c8a8"}, m: [".oooooooooo.", "obbbmbbbmbbo", "ommmmmmmmmmo", "obmbbbmbbbmo", "ommmmmmmmmmo", "obbbmbbbmbbo", "ommmmmmmmmmo", "obmbbbmbbbmo", "ommmmmmmmmmo", "obbbmbbbmbbo", "ommmmmmmmmmo", ".oooooooooo."] },
  j_king: { p: {"o": "#5a3505", "y": "#ffd447", "Y": "#d9951c", "r": "#e8343a", "b": "#4fc3ff"}, m: [".....obo....", ".o...oo....o", "oro.oyyo..or", ".o.oyyyo..oo", "oyooyyyyooyo", "oyyyyyyyyyo.", ".oyyyyyyyyo.", ".oyyyyyyyyo.", ".oYYYYYYYYo.", ".oYYrYYbYYo.", ".oYYYYYYYYo.", "..oooooooo.."] },
  j_four: { p: {"o": "#4a2a14", "p": "#ffd2a8", "P": "#e8a878"}, m: ["...opopoo...", "..oopopopo..", ".opopopopo..", ".opopopopo..", ".opopopopo..", ".opopopopo..", ".oppppppppo.", ".oppppppppo.", ".oppppppppo.", ".opPPPPPPpo.", ".oppppppppo.", ".oppppppppo."] },
  j_hand: { p: {"o": "#4a2a14", "p": "#ffd2a8", "P": "#e8a878"}, m: [".oopopoo....", "opopopopo...", "opopopopo...", "opopopopooo.", "opopopopoppo", "oppppppppppo", "oppppppppppo", "opppppppppo.", "opppppppppo.", "opPPPPPPpo..", "oppppppppo..", "oppppppppo.."] },
  j_extra: { p: {"o": "#0f2a5a", "b": "#4fa3e8"}, m: ["...oooooooo.", "..obbbbbbbbo", ".obbbbbbobbo", "obbboooo.obo", "obbo......o.", "obbo.....oo.", ".oo.....obbo", ".o......obbo", "obo.oooobbbo", "obbobbbbbbo.", "obbbbbbbbo..", ".oooooooo..."] },
  j_tosser: { p: {"o": "#1f2229", "g": "#a8b2c2", "G": "#6b7380"}, m: ["...oggggo...", ".oooggggooo.", "oggggggggggo", "oggggggggggo", ".oGGGGGGGGo.", ".oGGgGGgGGo.", ".oGGgGGgGGo.", ".oGGgGGgGGo.", ".oGGgGGgGGo.", ".oGGgGGgGGo.", ".oGGgGGgGGo.", ".oGGGGGGGGo."] },
  j_saver: { p: {"o": "#1a3a5a", "i": "#9fe0ff", "I": "#5fb0e0", "w": "#d6f6ff", "W": "#ffffff"}, m: ["....oo......", "...owwooo...", "..owwwwwwoo.", ".owwwwwwwwIo", "oiiWwwwwIIIo", "oiiiiiiIIIIo", "oiiiiiiIIIIo", "oiiiiiiIIIIo", "oiiiiiiIIIo.", ".oiiiiiIIo..", "..oooiiIo...", ".....ooo...."] },
  j_ace: { p: {"o": "#3a0a0a", "r": "#e8343a", "w": "#ff9b8f"}, m: [".....oo.....", "....orro....", "....orro....", "...orrwro...", "...orrrro...", "..orrrrro...", "..orroorro..", "..orrrrrro..", ".orrroorrro.", ".orro.orrro.", "orrro..orrro", ".ooo....ooo."] },
  j_steady: { p: {"o": "#3a2505", "g": "#e0b040", "G": "#a07818"}, m: [".....oo.....", ".ooooggoooo.", "oggggggggggo", "oooooggooooo", "go.oggggo.og", "ogogoggogogo", "gggggggggggg", "oooooggooooo", "....oggo....", "...ooggoo...", "..oGGGGGGo..", "..oGGGGGGo.."] },
  j_mime: { p: {"o": "#2b2b33", "w": "#ffffff", "W": "#d9dde6", "k": "#2b2b33", "r": "#ff8a9a"}, m: ["...owwwwo...", "..owwwwwwo..", ".owwwwwwwwo.", "owwwwwwwwwwo", "owwkkwwkkwwo", "owwkkwwkkwwo", "owrwwwwwwrWo", "owwkooookWWo", "owwokkkkoWWo", ".owwwwWWWWo.", "..owWWWWWo..", "...oWWWWo..."] },
  j_greed: { p: {"o": "#3a2505", "n": "#c8a060", "N": "#8a6a30", "w": "#e8c890", "y": "#ffd447"}, m: ["...oooooo...", "..onnnnnno..", "...onnnno...", "..oonnnnoo..", ".owwwwwnnno.", ".owwwoyonno.", "owwwwyyynnno", "owwnnoyonnNo", "ownnnyyyNNNo", ".onnnoyoNNo.", ".onnnNNNNNo.", "..ooNNNNoo.."] },
  b_club: { p: {"c": "#2b2b40", "f": "#9aa1ad", "o": "#1a1a24"}, m: ["............", "....cccc....", "...cccccc...", "...cccccc...", "..cc.cc.cc..", ".cccccccccc.", ".cccccccccc.", "..cc.cc.cc..", ".....cc.....", "ffffffffffff", "............", ".ffffffffff."] },
  b_heart: { p: {"h": "#e8343a", "w": "#ffb3a8", "k": "#2b0a0a", "o": "#1a1a24"}, m: ["............", "............", "..hhhk.hhh..", ".hhhhkkhhhh.", ".hwhh.khhhh.", ".hhhh.kkhhh.", "..hhh..khh..", "...hhhhhh...", "....hhhh....", ".....hh.....", "............", "............"] },
  b_nodisc: { p: {"r": "#e8343a"}, m: ["....rrrr....", "..rrrrrrrr..", ".rrr....rrr.", ".rrrr....rr.", "rr.rrr....rr", "rr..rrr...rr", "rr...rrr..rr", "rr....rrr.rr", ".rr....rrrr.", ".rrr....rrr.", "..rrrrrrrr..", "....rrrr...."] },
  b_tight: { p: {"o": "#1f2229", "g": "#a8b2c2", "G": "#6b7380", "w": "#ffffff"}, m: ["............", "ooo......ooo", "gggooooooggg", "gggowwwwoggg", "gggowwwwoggg", "ggGGwwwwGGgg", "ggGGwwwwGGgg", "gggowwwwoggg", "gggowwwwoggg", "gggooooooggg", "ooo......ooo", "............"] },
  b_face: { p: {"o": "#2b1a3a", "p": "#a46ff0", "P": "#c8a0ff", "k": "#1a0e24"}, m: ["...oppppo...", "..oppppppo..", ".oppppppppo.", "oppppppppppo", "opkkkppkkkpo", "opkkkppkkkpo", "oppppppppPPo", "opppppppPPPo", "oppkkkkkkPPo", ".oppppPPPPo.", "..opPPPPPo..", "...oPPPPo..."] },
  b_two: { p: {"o": "#4a2a14", "p": "#ffd2a8", "P": "#e8a878"}, m: ["..oppooppo..", "..oppooppo..", "..oppooppo..", "..oppooppo..", "..oppooppo..", "..oppooppo..", ".oppppppppo.", ".oppppppppo.", ".oppppppppo.", ".oPPPPPPPPo.", ".oppppppppo.", ".oppppppppo."] },
  b_flint: { p: {"o": "#2a2c33", "g": "#8a919d", "k": "#5b6070"}, m: ["......oo....", "....ooggo...", "...ogggggo..", "..ogggggggo.", ".ogggggggggo", "oggggggggggo", "ggggkggggggo", "gggggkgggggo", "ggggggggkggo", "oggggggggggo", "oggggggggggo", ".oooooooooo."] }
};

// 小物（UI 用）
Object.assign(SPR, {
  ticket: { p: { o: "#5a2a05", y: "#ffd447", Y: "#d9951c", r: "#e8574a", k: "#8a5a10" }, m: [".oooooooooooo.", "oyyyyyykyyyyyo", "oyrryyykyyyyYo", ".yrryyykyyyyY.", ".yyyyyykyyyyY.", "oyrryyykyyyyYo", "oyyyyyykyyyYYo", ".oooooooooooo."] },
  house:  { p: { o: "#2a1a10", r: "#d8463a", R: "#a32f25", w: "#f3e3c3", W: "#d6c09a", d: "#7a4a24", b: "#7fc8ff" }, m: ["......oo......", ".....orro.....", "....orrrRo....", "...orrrrrRo...", "..orrrrrrrRo..", ".orrrrrrrrrRo.", "oooooooooooooo", ".owwwwwwwwwWo.", ".owbbwwwddwWo.", ".owbbwwwddwWo.", ".owwwwwwddwWo.", ".oooooooooooo."] },
  flame:  { p: { R: "#b8321f", r: "#ff5a36", y: "#ffc23a", w: "#fff3b0" }, m: ["...R....", "..RrR...", "..RrrR..", ".RrryrR.", "RrryyrrR", "RryywyrR", "Rrywwyr.", ".Rryyr..", "..RRR..."] },
  star:   { p: { o: "#7a4a12", y: "#ffd447", w: "#fff6c2", Y: "#d39a1c" }, m: ["...o...", "..oyo..", "ooywyoo", "oyyyyYo", ".oyyYo.", ".oyoYo.", ".o...o."] },
  skull:  { p: { o: "#1a1a24", w: "#f3efe6", W: "#c9c2b4", k: "#1a1a24" }, m: ["..oooooo..", ".owwwwwwo.", "owwwwwwwWo", "owkkwwkkWo", "owkkwwkkWo", "owwwkkwwWo", ".owwwwwWo.", "..owkwko..", "..oooooo.."] },
  trophy: { p: { o: "#5a3505", y: "#ffd447", Y: "#d9951c", w: "#fff3b0" }, m: ["oooooooooooo", "oywyyyyyyyYo", "oywyyyyyyyYo", ".oyyyyyyyYo.", "..oyyyyyYo..", "...oyyyYo...", "....oyYo....", "....oyYo....", "...oyyyYo...", "..oooooooo.."] },
  lock:   { p: { o: "#2a2a34", g: "#a8adb8", G: "#7a7f8c", y: "#ffd447", Y: "#d9951c" }, m: ["..oooo..", ".og..Go.", ".og..Go.", "oooooooo", "oyyyyyYo", "oyyooyYo", "oyyyyyYo", "oooooooo"] }
});

/* ---------- ランクの文字（5x7。10 だけ 7x7） ---------- */
const GLYPH = {
  "2": [".XXX.", "X...X", "....X", "..XX.", ".X...", "X....", "XXXXX"],
  "3": ["XXXX.", "....X", "....X", ".XXX.", "....X", "....X", "XXXX."],
  "4": ["...X.", "..XX.", ".X.X.", "X..X.", "XXXXX", "...X.", "...X."],
  "5": ["XXXXX", "X....", "XXXX.", "....X", "....X", "X...X", ".XXX."],
  "6": [".XXX.", "X....", "X....", "XXXX.", "X...X", "X...X", ".XXX."],
  "7": ["XXXXX", "....X", "...X.", "..X..", "..X..", ".X...", ".X..."],
  "8": [".XXX.", "X...X", "X...X", ".XXX.", "X...X", "X...X", ".XXX."],
  "9": [".XXX.", "X...X", "X...X", ".XXXX", "....X", "....X", ".XXX."],
  "10": [".X..XX.", "XX.X..X", ".X.X..X", ".X.X..X", ".X.X..X", ".X.X..X", "XXX.XX."],
  "J": ["..XXX", "...X.", "...X.", "...X.", "...X.", "X..X.", ".XX.."],
  "Q": [".XXX.", "X...X", "X...X", "X...X", "X.X.X", "X..X.", ".XX.X"],
  "K": ["X...X", "X..X.", "X.X..", "XX...", "X.X..", "X..X.", "X...X"],
  "A": ["..X..", ".X.X.", "X...X", "X...X", "XXXXX", "X...X", "X...X"]
};
const SUIT9 = [
  ["....X....", "...XXX...", "..XXXXX..", ".XXXXXXX.", "XXXXXXXXX", "XXXXXXXXX", ".XX.X.XX.", "....X....", "...XXX..."],
  [".XX...XX.", "XXXX.XXXX", "XwXXXXXXX", "XXXXXXXXX", ".XXXXXXX.", "..XXXXX..", "...XXX...", "....X....", "........."],
  ["....X....", "...XXX...", "..XXXXX..", ".XwXXXXX.", "XXXXXXXXX", ".XXXXXXX.", "..XXXXX..", "...XXX...", "....X...."],
  ["...XXX...", "..XXXXX..", "...XXX...", ".XX.X.XX.", "XXXXXXXXX", "XXXXXXXXX", ".XX.X.XX.", "....X....", "...XXX..."]
];
const SUIT5 = [
  ["..X..", ".XXX.", "XXXXX", "XXXXX", "..X.."],
  [".X.X.", "XXXXX", "XXXXX", ".XXX.", "..X.."],
  ["..X..", ".XXX.", "XXXXX", ".XXX.", "..X.."],
  [".XXX.", ".XXX.", "XXXXX", "XXXXX", "..X.."]
];
// 絵札の顔（9x11）。c=スートの色 y=金 s=肌 k=目 h=髪 b=ひげ
const FACE = {
  11: ["..ccccc..", ".ccccccc.", "ccwccccc.", ".hsssssh.", ".sksssks.", ".sssssss.", "..ssmss..", "...sss...", ".ccc.ccc.", "cccccyccc", "ccccccccc"],
  12: ["..y.y.y..", "..yyyyy..", ".hhhhhhh.", "hhsssssh.", "hsksssksh", "hhsssssh.", "hh.sms.hh", "h..sss..h", ".ccc.ccc.", "ccccycccc", "ccccccccc"],
  13: ["y.y.y.y.y", "yyyyyyyyy", ".sssssss.", ".sksssks.", ".sssssss.", ".bbbmbbb.", "..bbbbb..", "c..bbb..c", "cccc.cccc", "cccyyyccc", "ccccccccc"]
};
const ART = {};
ART.SPR = SPR;
const urlCache = new Map();
function cv(w, h){ const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
function drawRows(x, rows, pal, x0, y0){
  rows.forEach((r, j) => { for (let i = 0; i < r.length; i++){ const ch = r[i]; if (ch === "." || ch === " ") continue; const col = pal[ch]; if (!col) continue; x.fillStyle = col; x.fillRect(x0 + i, y0 + j, 1, 1); } });
}
/** スプライトの画像 URL（原寸。拡大は CSS の pixelated で） */
ART.url = function(id){
  if (urlCache.has(id)) return urlCache.get(id);
  const s = SPR[id]; if (!s) return "";
  const c = cv(s.m[0].length, s.m.length); drawRows(c.getContext("2d"), s.m, s.p, 0, 0);
  const u = c.toDataURL(); urlCache.set(id, u); return u;
};
ART.img = function(id, size, cls = ""){
  const s = SPR[id]; const im = document.createElement("img");
  im.src = ART.url(id); im.alt = ""; im.className = "px-img " + cls; im.draggable = false;
  if (size){ im.style.width = size + "px"; im.style.height = size + "px"; }
  return im;
};
const RED = "#d8322e", BLK = "#2b2b40";
const suitCol = s => (s === 1 || s === 2) ? RED : BLK;
/** トランプ1枚（20x28）の画像 URL */
ART.card = function(r, s){
  const key = `card:${r}:${s}`; if (urlCache.has(key)) return urlCache.get(key);
  const W = 20, H = 28, c = cv(W, H), x = c.getContext("2d"), col = suitCol(s);
  // 地と縁（角を落とす）
  x.fillStyle = "#3a3242"; x.fillRect(1, 0, W - 2, H); x.fillRect(0, 1, W, H - 2);
  x.fillStyle = "#fffaf0"; x.fillRect(1, 1, W - 2, H - 2);
  x.fillStyle = "#e6dcc8"; x.fillRect(W - 2, 2, 1, H - 3); x.fillRect(2, H - 2, W - 3, 1);
  const name = r === 14 ? "A" : r === 13 ? "K" : r === 12 ? "Q" : r === 11 ? "J" : String(r);
  const g = GLYPH[name], pal = { X: col, w: "#ffb3a8" };
  drawRows(x, g, pal, 2, 2);
  // 右下は逆さ
  const rev = g.slice().reverse().map(row => row.split("").reverse().join(""));
  drawRows(x, rev, pal, W - 2 - g[0].length, H - 2 - 7);
  if (r >= 11 && r <= 13){
    drawRows(x, SUIT5[s], pal, 2, 10);
    const fp = { c: col, y: "#e0a21b", s: "#ffd9b0", k: "#2b1606", h: "#7a4a1a", b: "#e8e4dc", m: "#d86a6a", w: "#ffffff" };
    x.fillStyle = "#f3ead6"; x.fillRect(7, 8, 11, 13);
    drawRows(x, FACE[r], fp, 8, 9);
  } else {
    drawRows(x, SUIT9[s], pal, 6, 11);
    if (r === 14){ x.fillStyle = col; }
  }
  const u = c.toDataURL(); urlCache.set(key, u); return u;
};
/** カードの裏 */
ART.back = function(){
  const key = "card:back"; if (urlCache.has(key)) return urlCache.get(key);
  const W = 20, H = 28, c = cv(W, H), x = c.getContext("2d");
  x.fillStyle = "#3a3242"; x.fillRect(1, 0, W - 2, H); x.fillRect(0, 1, W, H - 2);
  x.fillStyle = "#c2352c"; x.fillRect(1, 1, W - 2, H - 2);
  x.fillStyle = "#e8574a"; for (let j = 3; j < H - 3; j++) for (let i = 3; i < W - 3; i++) if ((i + j) % 4 === 0) x.fillRect(i, j, 1, 1);
  x.fillStyle = "#fffaf0"; x.fillRect(2, 2, W - 4, 1); x.fillRect(2, H - 3, W - 4, 1); x.fillRect(2, 2, 1, H - 4); x.fillRect(W - 3, 2, 1, H - 4);
  const u = c.toDataURL(); urlCache.set(key, u); return u;
};
/** ドットの模様（背景用）。a/b の2色で n px 角の市松＋ちらし */
ART.pattern = function(key, a, b, n = 4){
  const k = `pat:${key}`; if (urlCache.has(k)) return urlCache.get(k);
  const c = cv(n * 4, n * 4), x = c.getContext("2d");
  x.fillStyle = a; x.fillRect(0, 0, n * 4, n * 4); x.fillStyle = b;
  for (let j = 0; j < n * 4; j++) for (let i = 0; i < n * 4; i++) if ((i * 7 + j * 13) % 11 === 0 || ((i + j) % (n * 2) === 0 && i % 2 === 0)) x.fillRect(i, j, 1, 1);
  const u = c.toDataURL(); urlCache.set(k, u); return u;
};
// キャラクター（大家さん・ディーラー、24x24、表情3種）と紙吹雪
Object.assign(SPR, {
  ll_normal: { p: {"o": "#2a1a10", "s": "#f2c8a0", "S": "#d49a74", "h": "#dcdce6", "H": "#9a9aaa", "g": "#2b2b33", "l": "#cfeaff", "m": "#f4f4f8", "c": "#8a5a2b", "C": "#6a4220", "w": "#ffffff", "k": "#2b1606", "r": "#b5524a", "b": "#f0a090"}, m: ["........................", "..........oooo..........", "........oossssoo........", ".......oswwssssso.......", ".....oosswsssssssoo.....", "....ohhsssssssssshho....", "...ohhhsssssssssshhho...", "...ohhhsHHHsssHHHhhHo...", "...ohhHggggssgggghhHo...", "...osHHgllggggllghHso...", "..ossssgkkgssgkkgSSsSo..", "...osssggggsSggggSSSo...", "...osssbssssSSSSSbSSo...", "....oosssmmmmmmmSSoo....", "......osmmmkkkmmmo......", ".......ossSSSSSSo.......", "........ooSSSSSo........", "......ooowSSSSSooo......", ".....occccwwCwcccco.....", "....occccccwCcccccco....", "...occcccccwCccccccco...", "...occcccccCCCcccccco...", "...oCCCcccccCcccccCCCo..", "..ocCCCcccccCcccccCCCo.."] },
  ll_happy: { p: {"o": "#2a1a10", "s": "#f2c8a0", "S": "#d49a74", "h": "#dcdce6", "H": "#9a9aaa", "g": "#2b2b33", "l": "#cfeaff", "m": "#f4f4f8", "c": "#8a5a2b", "C": "#6a4220", "w": "#ffffff", "k": "#2b1606", "r": "#b5524a", "b": "#f0a090"}, m: ["........................", "..........oooo..........", "........oossssoo........", ".......oswwssssso.......", ".....oosswsssssssoo.....", "....ohhsssssssssshho....", "...ohhhsssssssssshhho...", "...ohhhsHHHsssHHHhhHo...", "...ohhHggggssgggghhHo...", "...osHHglkgggglkghHso...", "..ossssgklgssgklgSSsSo..", "...osssggggsSggggSSSo...", "...osssbssssSSSSSbSSo...", "....oosssmmmmmmmSSoo....", "......osmmmrrrmmmo......", ".......ossSrrrSSo.......", "........ooSSSSSo........", "......ooowSSSSSooo......", ".....occccwwCwcccco.....", "....occccccwCcccccco....", "...occcccccwCccccccco...", "...occcccccCCCcccccco...", "...oCCCcccccCcccccCCCo..", "..ocCCCcccccCcccccCCCo.."] },
  ll_angry: { p: {"o": "#2a1a10", "s": "#f2c8a0", "S": "#d49a74", "h": "#dcdce6", "H": "#9a9aaa", "g": "#2b2b33", "l": "#cfeaff", "m": "#f4f4f8", "c": "#8a5a2b", "C": "#6a4220", "w": "#ffffff", "k": "#2b1606", "r": "#b5524a", "b": "#f0a090"}, m: ["........................", "..........oooo..........", "........oossssoo........", ".......oswwssssso.......", ".....oosswsssssssoo.....", "....ohhsssssssssshho....", "...ohhhsssssssssshhho...", "...ohhhsHsssssssHhhHo...", "...ohhHggggssgggghhHo...", "...osHHgllggggllghHso...", "..ossssgkkgssgkkgSSsSo..", "...osssggggsSggggSSSo...", "...osssbssssSSSSSbSSo...", "....oosssmmmmmmmSSoo....", "......osmmmSSSmmmo......", ".......ossSkkkSSo.......", "........ooSSSSSo........", "......ooowSSSSSooo......", ".....occccwwCwcccco.....", "....occccccwCcccccco....", "...occcccccwCccccccco...", "...occcccccCCCcccccco...", "...oCCCcccccCcccccCCCo..", "..ocCCCcccccCcccccCCCo.."] },
  dl_normal: { p: {"o": "#1a1410", "s": "#f6d0aa", "S": "#d9a57c", "n": "#4a2e1a", "N": "#2e1b0e", "g": "#5fd06a", "G": "#2fa35a", "D": "#1d6b38", "w": "#ffffff", "v": "#2b2b40", "V": "#1b1b2a", "r": "#d63a2f", "R": "#8e2219", "k": "#1a0e05", "b": "#f2a08a"}, m: ["........................", "........oooooooo........", "......oonnnnnnnnoo......", ".....onnnnnnnnnnnno.....", "....onnnnnnnnnnnnnno....", "....onnnnnnnnnnnnNNo....", "...oggggggggggggggggo...", "..oGGGGGGGGGGGGGGGGGGo..", ".oGGGGGGGGGGGGGGGGGGGGo.", "..oDDDDDDDDDDDDDDDDDDDo.", "...osnnsssssssNNNNnnoo..", "...osssskwssssskwssSo...", "...osssskkssssskksSSo...", "....oosbssssSksssboo....", "......ossskkkssSSo......", ".......ossssssSSo.......", "........osssSSSo........", "........ooSSSSSo........", ".....ooovwrrorrvooo.....", "....ovvvvwrrRrrvvvvo....", "....ovvvvwrrorrvvvvo....", "...ovvvvvvwwvwvvvvvvo...", "...oVVVvvvwwwwvvvvVVVo..", "..ovVVVvvvwwvwvvvvVVVo.."] },
  dl_happy: { p: {"o": "#1a1410", "s": "#f6d0aa", "S": "#d9a57c", "n": "#4a2e1a", "N": "#2e1b0e", "g": "#5fd06a", "G": "#2fa35a", "D": "#1d6b38", "w": "#ffffff", "v": "#2b2b40", "V": "#1b1b2a", "r": "#d63a2f", "R": "#8e2219", "k": "#1a0e05", "b": "#f2a08a"}, m: ["........................", "........oooooooo........", "......oonnnnnnnnoo......", ".....onnnnnnnnnnnno.....", "....onnnnnnnnnnnnnno....", "....onnnnnnnnnnnnNNo....", "...oggggggggggggggggo...", "..oGGGGGGGGGGGGGGGGGGo..", ".oGGGGGGGGGGGGGGGGGGGGo.", "..oDDDDDDDDDDDDDDDDDDDo.", "...osnnsssssssssssnnoo..", "...osssssksssssksssSo...", "...ossssksksssksksSSo...", "....oosbssssSssssboo....", "......ossskkkkkSSo......", ".......osssrrrSSo.......", "........osssSSSo........", "........ooSSSSSo........", ".....ooovwrrorrvooo.....", "....ovvvvwrrRrrvvvvo....", "....ovvvvwrrorrvvvvo....", "...ovvvvvvwwvwvvvvvvo...", "...oVVVvvvwwwwvvvvVVVo..", "..ovVVVvvvwwvwvvvvVVVo.."] },
  dl_wow: { p: {"o": "#1a1410", "s": "#f6d0aa", "S": "#d9a57c", "n": "#4a2e1a", "N": "#2e1b0e", "g": "#5fd06a", "G": "#2fa35a", "D": "#1d6b38", "w": "#ffffff", "v": "#2b2b40", "V": "#1b1b2a", "r": "#d63a2f", "R": "#8e2219", "k": "#1a0e05", "b": "#f2a08a"}, m: ["........................", "........oooooooo........", "......oonnnnnnnnoo......", ".....onnnnnnnnnnnno.....", "....onnnnnnnnnnnnnno....", "....onnnnnnnnnnnnNNo....", "...oggggggggggggggggo...", "..oGGGGGGGGGGGGGGGGGGo..", ".oGGGGGGGGGGGGGGGGGGGGo.", "..oDDDDDDDDDDDDDDDDDDDo.", "...osnnsssssssssssnnoo..", "...osssswkssssswkssSo...", "...osssskkssssskksSSo...", "....oosbssssSssssboo....", "......ossssrrrsSSo......", ".......osssrkrSSo.......", "........osssSSSo........", "........ooSSSSSo........", ".....ooovwrrorrvooo.....", "....ovvvvwrrRrrvvvvo....", "....ovvvvwrrorrvvvvo....", "...ovvvvvvwwvwvvvvvvo...", "...oVVVvvvwwwwvvvvVVVo..", "..ovVVVvvvwwvwvvvvVVVo.."] },
  cf0: { p: {"x": "#ffd447"}, m: [".x.", "xxx", ".x."] },
  cf1: { p: {"x": "#e8574a"}, m: [".x.", "xxx", ".x."] },
  cf2: { p: {"x": "#4fa3e8"}, m: [".x.", "xxx", ".x."] },
  cf3: { p: {"x": "#5fd06a"}, m: [".x.", "xxx", ".x."] },
  cf4: { p: {"x": "#a46ff0"}, m: [".x.", "xxx", ".x."] }
});

/** 夜の街（背景）。w x h の小さな絵を作って data URL を返す。seed で同じ街になる */
ART.skyline = function(w = 200, h = 56, seed = 7){
  const k = `sky:${w}:${h}:${seed}`; if (urlCache.has(k)) return urlCache.get(k);
  let s = seed >>> 0; const R = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const c = cv(w, h), x = c.getContext("2d");
  const bands = ["#120c20", "#1a1230", "#241640", "#33194e", "#4a1f5e", "#6a2a66"];
  const bh = h / bands.length;
  bands.forEach((col, i) => { x.fillStyle = col; x.fillRect(0, Math.floor(i * bh), w, Math.ceil(bh) + 1); });
  // 帯の境目をディザで混ぜる
  for (let i = 1; i < bands.length; i++){ const y0 = Math.floor(i * bh); x.fillStyle = bands[i]; for (let xx = 0; xx < w; xx += 2) x.fillRect(xx + (i % 2), y0 - 1, 1, 1); }
  // 星
  for (let i = 0; i < w * h / 60; i++){ const sx = Math.floor(R() * w), sy = Math.floor(R() * h * .55); x.fillStyle = R() < .2 ? "#ffd447" : "#ffffff"; x.globalAlpha = .4 + R() * .6; x.fillRect(sx, sy, 1, 1); }
  x.globalAlpha = 1;
  // 月
  const mx = w - 26, my = 12;
  for (let yy = -6; yy <= 6; yy++) for (let xx = -6; xx <= 6; xx++){ const d = xx * xx + yy * yy; if (d <= 36){ x.fillStyle = d > 26 ? "#e8d9a8" : "#fff4cc"; x.fillRect(mx + xx, my + yy, 1, 1); } }
  x.fillStyle = "#e0cf98"; x.fillRect(mx - 2, my - 1, 2, 2); x.fillRect(mx + 2, my + 2, 1, 1);
  // 遠くのビル
  let px = 0;
  while (px < w){ const bw = 6 + Math.floor(R() * 10), bh2 = 14 + Math.floor(R() * 16); x.fillStyle = "#2a1a44"; x.fillRect(px, h - bh2, bw, bh2);
    for (let yy = h - bh2 + 3; yy < h - 2; yy += 3) for (let xx = px + 1; xx < px + bw - 1; xx += 2) if (R() < .18){ x.fillStyle = "#6a5a9a"; x.fillRect(xx, yy, 1, 1); }
    px += bw + Math.floor(R() * 2); }
  // 手前のビル
  px = -2;
  while (px < w){ const bw = 9 + Math.floor(R() * 14), bh2 = 18 + Math.floor(R() * 22); const top = h - bh2;
    x.fillStyle = "#140d26"; x.fillRect(px, top, bw, bh2);
    x.fillStyle = "#1f1438"; x.fillRect(px, top, 1, bh2);
    if (R() < .35){ x.fillStyle = "#140d26"; x.fillRect(px + Math.floor(bw / 2), top - 4, 1, 4); x.fillStyle = "#ff4a4a"; x.fillRect(px + Math.floor(bw / 2), top - 5, 1, 1); }
    for (let yy = top + 3; yy < h - 3; yy += 4) for (let xx = px + 2; xx < px + bw - 2; xx += 3) if (R() < .42){ x.fillStyle = R() < .8 ? "#ffd447" : "#ffb070"; x.fillRect(xx, yy, 2, 2); }
    if (R() < .3 && bw > 12){ const ny = top + 4 + Math.floor(R() * 6); x.fillStyle = R() < .5 ? "#ff5ab4" : "#4ae0ff"; x.fillRect(px + 2, ny, bw - 4, 2); }
    px += bw + Math.floor(R() * 3); }
  // 地面
  x.fillStyle = "#0b0716"; x.fillRect(0, h - 2, w, 2);
  const u = c.toDataURL(); urlCache.set(k, u); return u;
};

window.ART = ART;
})();
