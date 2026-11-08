# cbt-planner

- CBT Planner（CBT用）: https://endorfin-luu.github.io/cbt-planner/
- 国試 Planner（医師国家試験用・QB／モントレ）: https://endorfin-luu.github.io/cbt-planner/kokushi/
- Kioku（間隔反復フラッシュカード＋QB・モントレの問題演習）: https://endorfin-luu.github.io/cbt-planner/kioku/

国試 Planner は CBT Planner とは別のアプリで、記録も別に保存されます（Firestore の `progress/kokushi_user1`）。

Kioku は claude.ai のアーティファクトとして作ったものを GitHub Pages に移したもの。保存先は Firestore の
`progress/kioku_user1_meta` / `kioku_user1_c0…`（データを gzip して分割）。
「問題演習」で記録した QB・モントレの解いた数は `progress/kokushi_kioku_user1` に書き出され、
国試 Planner が同期のたびに読み込みます（記録一覧に「Kioku」と付きます）。

2台以上の端末で使ったときは、保存の前にクラウドの版を読み込んで、カード・ノート・問題演習の記録を
1件ずつ合わせてから保存します（後から保存した端末が前の端末の記録を上書きしない）。消したものは `del` に残して、
合わせたときに戻らないようにしています。国試 Planner への書き出しも端末ごとの記録IDで足していく形（`recs`）です。

ローカル（github.io 以外）で開いたときは `*_localtest` のドキュメントを使うので、本番の記録には触れません。
