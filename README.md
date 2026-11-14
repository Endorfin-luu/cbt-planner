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
  旧 国試 Planner の記録（localStorage `kokushi_state` と Firestore `progress/kokushi_user1`）は初回に一度だけ取り込む

モントレは中身が QB と同じ国試の過去問なので使っていない。

2台以上の端末で使ったときは、保存の前にクラウドの版を読み込み、カード・ノート・問題演習（1問ずつ）・計画の記録を
1件ずつ合わせてから保存する（後から保存した端末が前の端末の記録を上書きしない）。消したものは `del`（計画は `S.pl.tomb`）に
残して、合わせたときに戻らないようにしている。オフライン中はクラウドに書かず、つながってから合わせて保存する。

ローカル（github.io 以外）で開いたときは `*_localtest` のドキュメントを使うので、本番の記録には触れない。
