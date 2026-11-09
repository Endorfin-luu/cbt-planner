# cbt-planner

- CBT Planner（CBT用）: https://endorfin-luu.github.io/cbt-planner/
- 国試 Planner（医師国家試験用・QB分野別／QB回数別）: https://endorfin-luu.github.io/cbt-planner/kokushi/
- Kioku（間隔反復フラッシュカード＋QBの問題演習）: https://endorfin-luu.github.io/cbt-planner/kioku/

国試 Planner は CBT Planner とは別のアプリで、記録も別に保存されます（Firestore の `progress/kokushi_user1`）。

Kioku は claude.ai のアーティファクトとして作ったものを GitHub Pages に移したもの。保存先は Firestore の
`progress/kioku_user1_meta` / `kioku_user1_c0…`（データを gzip して分割）。
「問題演習」で記録した QB（分野別・回数別）の解いた数は `progress/kokushi_kioku_user1` に書き出され、
国試 Planner が同期のたびに読み込みます（記録一覧に「Kioku」と付きます）。

ローカル（github.io 以外）で開いたときは `*_localtest` のドキュメントを使うので、本番の記録には触れません。

国試 Planner の問題集は 2 つ：QB「分野別」（2027年版 vol.1〜7・6,979問）と QB「回数別」（第80〜120回の過去問ぜんぶ・17,140問）。
モントレは中身が同じ国試の過去問なので、v3（CH_VER 3）で外した。
