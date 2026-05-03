# 修正内容の確認

- `src/web/features/player/VideoPlayer.tsx`
  - `detailForPlaybackFailure` に media状態行を追加。
  - `enrichPlaybackFailureDetail` を変更し、
    - `probe status=valid ...`
    - `probe status=invalid ...`
    - `probe status=error ...`
    のいずれかを必ずdetailへ追記するようにした。

これにより、403が取れない場合でも
- validate側ではどう判定されたか
- media要素の状態
をログ詳細で切り分け可能になる。

## 検証

- `yarn typecheck` 成功。
