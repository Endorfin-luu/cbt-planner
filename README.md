# cbt-planner

- CBT Planner（CBT用）: https://endorfin-luu.github.io/cbt-planner/
- Kioku（国試用：今日・計画＋QBの問題演習＋間隔反復フラッシュカード）: https://endorfin-luu.github.io/cbt-planner/kioku/
  - 旧「国試 Planner」（/kokushi/）は Kioku の「今日」「計画」タブに統合した。/kokushi/ は Kioku へ転送するだけ

## Kioku

claude.ai のアーティファクトとして作ったものを GitHub Pages に移したもの。保存先は Firestore の
`progress/kioku_user1_meta` / `kioku_user1_c0…`（データを gzip して分割）。CBT Planner の記録には触れない。

- `index.html` … フラッシュカード本体（デッキ・追加・閲覧・統計・設定）
- `qbank.js` … 問題演習。QB「分野別」（2027年版 vol.1〜7・6,979問）と QB「回数別」（第80〜120回の過去問ぜんぶ・17,140問）を
  1問ずつ FSRS で回す。記録は `S.qx`
- `planner.js` … 今日・計画（旧 国試 Planner）。QB の解いた数は `S.qx.out` をそのまま集計し、計画・設定・週の目標は `S.pl` に入れる。
  毎日のノルマは「QB（最低ライン）」と「カードの新規（`cardNewDaily` 枚、対象は `cardDeck` のデッキ）」の2本柱で、
  両方そろった日だけ連続記録がつながる。カードの新規・復習の数は復習ログ（`S.revlog`）から日ごとに数える。
- `ability.js` … 実力タブ。QB分野別を初めて解いたときの正答率（`S.qx.out` の r=1）から、必修・一般臨床の予想得点を
  合格ラインと並べて出す（問題が少ない科は全体の正答率に寄せる）。模試の記録（`S.pl.mocks`）と偏差値の推移、
  26科の苦手マップ、取りこぼし点（推定）順の「いま効く章」。
- `hospital.js` … 病院タブ（育成・アップグレード）。部門のレベルは実力（進み・初見正答率・記憶の残り・2周目）が条件で、
  DP（勉強の記録から毎回計算：QB・初見の正解・カード・ノルマ達成×連続記録コンボ）を払って上げる。施設でDPの倍率を強化。
  記憶の残りが70%を切った部門は休診（DP減）。病院ランク、QB回数別1回分の「当直」。状態は `S.pl.hosp`。
  旧 国試 Planner の記録（localStorage `kokushi_state` と Firestore `progress/kokushi_user1`）は初回に一度だけ取り込む

モントレは中身が QB と同じ国試の過去問なので使っていない。

2台以上の端末で使ったときは、保存の前にクラウドの版を読み込み、カード・ノート・問題演習（1問ずつ）・計画の記録を
1件ずつ合わせてから保存する（後から保存した端末が前の端末の記録を上書きしない）。消したものは `del`（計画は `S.pl.tomb`）に
残して、合わせたときに戻らないようにしている。オフライン中はクラウドに書かず、つながってから合わせて保存する。

ローカル（github.io 以外）で開いたときは `*_localtest` のドキュメントを使うので、本番の記録には触れない。
