# パーティクル・モーフィング 技術メモ

`particle-morph` は、React のページ上に Three.js の imperative な描画ループを載せ、複数の粒子形状を GPU シェーダで補間するおもちゃです。React はマウント、アンマウント、テーマ、reduced motion、ラベル表示だけを担当し、毎フレーム更新される状態は `scene.ts` の `ParticleSceneController` に閉じ込めています。

## ファイル構成

- `page.tsx`: ページ UI。現在の造形ラベルと WebGL 非対応時の fallback を管理します。
- `ParticleCanvas.tsx`: React と Three.js シーンの接続層。DOM テーマ、reduced motion、キーボード、ポインタ入力を `ParticleScene` に渡します。
- `scene.ts`: Three.js renderer、geometry、shader uniforms、requestAnimationFrame、破棄処理を所有します。
- `morph.ts`: 造形順序、モーフィング進捗、自動進行の純粋関数群です。
- `shapes.ts`: 各造形の `Float32Array` 座標を生成します。すべて `count * 3` 要素の x/y/z 配列を返します。
- `palette.ts`: アプリテーマから Three.js 用の背景色、粒子色、ブレンド方式を解決します。
- `shaders.ts`: GPU 側の頂点補間、揺らぎ、ポインタ反発、粒子の描画を定義します。
- `*.test.ts(x)`: 状態遷移、座標契約、fallback、ページ表示のユニットテストです。

## データの流れ

1. `ParticleCanvas` が `createParticleScene` を呼び、ホスト要素へ canvas を追加します。
2. `scene.ts` が `SHAPES` の全造形を `PARTICLE_COUNT` 分だけ事前計算し、`ShapePositionMap` に保持します。
3. 初期状態では現在造形の座標を `position`、`aPositionFrom`、`aPositionTo` に入れます。
4. クリック、スペースキー、自動進行で `morphToNext` が呼ばれると、`aPositionFrom` と `aPositionTo` を次の組に差し替えます。
5. 描画ループが `uProgress` を更新し、vertex shader が各粒子の `aDelay` を加味して座標を補間します。
6. モーフィング完了後も CPU 側の `sequence` は次の造形を現在状態として保持し、表示ラベルを更新します。

## 重要な契約

`PARTICLE_COUNT` は全造形で共通です。形状ごとに配列長が異なると、BufferAttribute のコピー先と長さがずれます。新しい形状を追加するときは、必ず `count * 3` 要素の `Float32Array` を返してください。

`SHAPES` と `SHAPE_SEQUENCE` は ID が一致している必要があります。`SHAPES` は生成器と表示ラベル、`SHAPE_SEQUENCE` は巡回順序を担います。追加や順序変更をした場合は、ユニットテストと `e2e/particle-morph.spec.ts` のラベル巡回も更新します。

`DELAY_MAX` は CPU 側の `getParticleProgress` と shader 文字列の `DELAY_MAX` の両方で使います。値を変えた場合は、粒子ごとの遅延が最後まで完了することを `morph.test.ts` で確認してください。

`BOUNDING_RADIUS` は形状生成、geometry の `boundingSphere`、カメラ距離の前提です。大きくする場合は、デスクトップと 375px 幅の viewport で見切れや横スクロールがないことを確認します。

## シーンのライフサイクル

`ParticleSceneController` は renderer、geometry、material、canvas、resize listener、requestAnimationFrame を所有します。React Strict Mode の再マウントでも破棄漏れを起こさないよう、`dispose` は二重呼び出しを無視します。

`render` は毎フレーム呼ばれるため、配列生成や React state 更新を入れないでください。形状座標、遅延、乱数は初期化時に生成し、モーフィング開始時は既存の BufferAttribute へコピーします。

`lastFrameAt` と `FRAME_DELTA_LIMIT_MS` は、タブ復帰直後に見た目用の時刻が大きく飛ぶのを抑えるためのものです。自動進行判定には rAF の実 timestamp を使い、呼吸アニメーション用の `uTime` だけを制限しています。

## 入力とアクセシビリティ

canvas のホストは `button` です。クリック操作に加えてスペースキーで `morphToNext` を呼びます。現在の造形ラベルは `aria-live="polite"` のテキストでページ側に表示され、canvas だけに依存しない状態確認ができます。

reduced motion が有効な場合、自動進行とポインタ反発を止めます。手動クリックのモーフィングは残します。これは「操作した結果としての変化」は許容しつつ、予期しない動きを減らすためです。

## テーマ

テーマは `document.documentElement.dataset.theme` を `MutationObserver` で監視します。暗色テーマは加算合成で発光感を出し、明色テーマは通常合成で白飛びを避けます。palette を変更した場合は、`palette.test.ts` と E2E のテーマ切り替えテストを確認してください。

## 形状追加の手順

1. `ShapeId` に ID を追加します。
2. `generateXxxShape(count, seed)` を追加し、`Float32Array(count * 3)` を返します。
3. `SHAPES` に ID、ラベル、生成器を登録します。
4. `SHAPE_SEQUENCE` に巡回順序を追加します。
5. `morph.test.ts`、`shapes.test.ts`、`e2e/particle-morph.spec.ts` の期待値を更新します。
6. `pnpm test:unit -- src/app/(toys)/particle-morph` と、必要に応じて `pnpm test:e2e -- e2e/particle-morph.spec.ts` を実行します。

## 検証の目安

- `pnpm test:unit -- src/app/(toys)/particle-morph`
- `pnpm typecheck`
- `pnpm lint`
- WebGL や viewport を触った場合は `pnpm build` 後に `pnpm test:e2e -- e2e/particle-morph.spec.ts`