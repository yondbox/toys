# Research: particle-morph（パーティクル・モーフィング）

**Date**: 2026-07-15 | **Plan**: [plan.md](./plan.md)

Technical Context に未解決の NEEDS CLARIFICATION はない。本書は技術選定の決定・根拠・
検討した代替案を記録する。

## R1. 描画ライブラリ: Three.js（`three` 単体）

- **Decision**: `pnpm add three` で `three` のみ追加する（型定義同梱のため `@types/three`
  不要）。ラッパーライブラリは導入しない。
- **Rationale**: 数万粒子の 3D 表示・カスタムシェーダー・WebGL リソース管理を最小の学習
  コストで満たす事実上の標準。1 依存で完結し、憲法の固定スタックと競合しない。
- **Alternatives considered**:
  - **Canvas 2D / CSS アニメーション**: 数千要素で CPU バウンドになり、24,000 粒子の
    3D 変形（SC-005: カクつきなし）が成立しない。却下。
  - **素の WebGL / WebGPU 直書き**: 依存ゼロだがカメラ・行列・リサイズ・リソース管理を
    自前実装することになり、おもちゃ 1 つの規模に対して可読性コストが過大。WebGPU は
    Safari の普及が途上でフォールバック実装が二重になる。却下。
  - **@react-three/fiber + drei**: 宣言的で書きやすいが、React Compiler との組み合わせは
    公式にサポート表明がなく、依存も 2 つ以上増える。命令的な 1 キャンバスのおもちゃには
    過剰。却下。

## R2. React 19 との統合: Client Component + `useEffect` の命令的境界

- **Decision**: `ParticleCanvas.tsx`（Client Component）の `useEffect` 内で renderer /
  scene / rAF ループを生成し、クリーンアップで rAF 停止と dispose を行う。React の state
  には「現在の造形名」「フォールバック有無」などページ表示に必要な値だけを持たせ、毎フレーム
  変わる値（進行度・ポインタ座標）は ref / three 側に置いて再レンダーを起こさない。
- **Rationale**: 毎フレーム更新を React の再レンダーに乗せると Compiler の最適化対象外の
  ホットパスになる。命令的リソースは effect 境界に閉じるのが React 19 の推奨パターン。
- **Alternatives considered**: 進行度を useState で持つ（60fps の setState は無駄な再レンダー
  で電池と CPU を浪費。却下）。

## R3. 変形の実現方式: 頂点シェーダーによる stagger 補間

- **Decision**: ジオメトリに `aPositionFrom` / `aPositionTo` / `aDelay`（粒子ごとの遅延
  0〜0.4）/ `aRandom` の attribute を持たせ、uniform `uProgress`（0〜1、CPU 側で easing 済み）
  から粒子ごとの実効進行度 `clamp((uProgress - aDelay) / (1 - maxDelay), 0, 1)` を計算して
  from→to を補間する。補間中は `aRandom` ベースの渦状オフセットを加え、「ほどけて渦を巻いて
  集まる」見え方（FR-004）を作る。造形切替時は CPU 側で from 属性へ現在の to（反発中でも
  基準位置）を書き戻し、`uProgress` を 0 に戻す。
- **Rationale**: CPU で 24,000 粒子 × 3 座標を毎フレーム lerp して attribute を更新すると
  転送コストで低スペック端末の 60fps が危うい。GPU 補間なら CPU の毎フレーム処理は uniform
  1 個の更新だけで、SC-005 を満たす余裕が大きい。
- **Alternatives considered**: CPU lerp + `needsUpdate`（実装は単純だが性能余裕がなく、
  反発との合成も CPU 側で複雑化。却下）。GPGPU（FBO）パーティクル（本件の粒子数では過剰。
  却下）。

## R4. 粒子の描画: `THREE.Points` + `ShaderMaterial` + 加算合成

- **Decision**: 1 つの `THREE.Points` に全粒子を載せ、フラグメントシェーダーで
  `gl_PointCoord` の中心距離から柔らかい円形グローを描く。ブレンドは加算
  （`AdditiveBlending`）、`depthWrite: false`。粒子色は中心距離（原点からの半径）で
  内側色→外側色をグラデーションさせる。
- **Rationale**: ドローコール 1 回で全粒子を描け、グロー表現に後段のポストプロセスが不要。
  ライトテーマでは加算合成が白背景に沈むため、パレット側で乗算的な濃色（R7）を使い分ける。
- **Alternatives considered**: `PointsMaterial` + テクスチャスプライト(自前シェーダーが
  どのみち必要になり二重管理。却下)、InstancedMesh(粒子形状が円で足りるため過剰。却下)。

## R5. テキスト造形「あっ」の生成: Canvas 2D ピクセルサンプリング

- **Decision**: オフスクリーンの Canvas 2D に system-ui フォントで文字を描画し、
  `getImageData` の不透明ピクセルから粒子数ぶんの座標を抽出して XY 平面に配置（Z は微小
  ジッター）。Canvas 2D が使えない環境（jsdom 等）では決定的なフォールバック造形（球体）を
  返す純関数として実装する。
- **Rationale**: フォントファイル（typeface JSON / WOFF 解析）の読み込みなしで日本語を
  含む任意の文字列を粒子化でき、Assumptions の「文言は将来変更可」も文字列定数の変更だけで
  満たせる。
- **Alternatives considered**: `TextGeometry` + typeface フォント（日本語グリフを含む
  フォントデータが数 MB 級でロード時間が SC-001 を圧迫。却下）、SVG パスサンプリング
  （文字ごとにパスデータを用意する手間。却下）。

## R6. ポインタ反発と視差: uniform `uPointer` によるシェーダー変位

- **Decision**: pointermove で NDC 座標を取り、`Raycaster` で原点を通る Z=0 平面へ投影した
  ワールド座標を uniform `uPointer` として渡す。頂点シェーダーで粒子との距離が反発半径内の
  とき放射状に押し出す（滑らかな減衰）。ポインタ不在時は影響 0 へ滑らかに戻す。視差は
  カメラ位置をポインタ NDC に応じて微小オフセットし、毎フレーム lerp で追従させる。
- **Rationale**: 反発を GPU 側の純粋な「表示上の変位」として扱えば、基準位置（from/to）を
  汚さず、変形と反発が独立に合成できる（FR-007 の「進行中も表示が壊れない」を構造的に保証）。
- **Alternatives considered**: CPU で近傍粒子の位置を書き換える（変形との合成で基準位置の
  管理が複雑化し、戻り動作のバグ源になる。却下）。

## R7. テーマ連動: `html[data-theme]` の初期読取 + `MutationObserver`

- **Decision**: 初期化時に `document.documentElement.dataset.theme` を読み、以後は
  `MutationObserver`（`attributeFilter: ["data-theme"]`）で変更を検知して uniform の配色
  （背景・内側色・外側色）とブレンドモードを切り替える。パレット定義は `palette.ts` の
  純関数 `resolvePalette(theme)` に置く。ダーク: 深宇宙背景 + シアン〜マゼンタの加算グロー。
  ライト: 明背景 + 藍〜橙の濃色粒子（通常ブレンド）。
- **Rationale**: 既存設計はテーマ状態を各ページが持たず `html[data-theme]` が唯一の真実
  （`src/lib/theme.ts` のコメントに明記）。属性監視なら ThemeToggle 側の実装に依存せず
  再読み込みなしの追従（FR-011, SC-006）ができる。
- **Alternatives considered**: React Context でテーマを配る（ルートレイアウトと全おもちゃに
  跨る共有コントラクト変更になり、本フィーチャーの分離原則に反する。却下）。

## R8. reduced-motion と非対応環境フォールバック

- **Decision**: `matchMedia("(prefers-reduced-motion: reduce)")` が真なら自動変形タイマーと
  ポインタ反発を無効化し、緩やかな回転のみ残す（FR-012）。WebGL 可否は `WebGLRenderer`
  生成を try/catch で検出し、失敗時はキャンバスの代わりに説明メッセージを表示する
  （FR-013）。ページ骨格（見出し・戻るリンク）は常に表示する。
- **Rationale**: 生成 try/catch は「コンテキスト取得はできるが初期化で落ちる」環境も拾える
  最も確実な検出。フォールバックを page の表示分岐に置くことで e2e / ユニット両方から検証
  できる。
- **Alternatives considered**: `canvas.getContext("webgl2")` の事前プローブのみ（検出漏れ
  あり。renderer 生成の try/catch と併用する意味が薄いため単独採用は却下）。

## R9. 性能予算: 約 24,000 粒子・DPR クランプ 2

- **Decision**: 粒子数は 24,000 固定で開始する。`renderer.setPixelRatio(min(devicePixelRatio, 2))`
  で高 DPI 端末のフィルレートを抑える。タブ非表示時は rAF が止まるため追加のスロットリングは
  不要だが、経過時間は rAF タイムスタンプ基準で計算し、復帰時に変形が飛ばないよう進行度を
  クランプする。
- **Rationale**: 24,000 は R3 の GPU 補間なら 5 年前のミドルレンジスマホでも余裕がある規模
  （頂点シェーダーの負荷が支配的で、フィルレートは DPR クランプで制御）。実測で問題があれば
  粒子数の段階調整を追加する余地を Assumptions が確保している。
- **Alternatives considered**: 端末性能の動的検出で粒子数を変える（初版では過剰。実測後に
  必要なら追加。保留）。

## R10. 自動変形タイマー: rAF タイムスタンプ基準の純ロジック

- **Decision**: 自動変形（FR-010）は `setInterval` ではなく、`morph.ts` の純関数
  「最終操作時刻と現在時刻から自動変形すべきかを返す」で判定し、rAF ループから毎フレーム
  問い合わせる。手動変形・ポインタ操作で最終操作時刻を更新する。
- **Rationale**: タイマーと描画ループの二重管理を避け、テストでは時刻を注入して決定的に
  検証できる（変形中に自動変形が重ならない、という FR-007/US3 の境界条件を含む）。
- **Alternatives considered**: `setInterval`（変形中の抑止やリセットの状態が散らばり、
  テストに実時間が要る。却下）。

## R11. テスト戦略: 純関数ユニット + Playwright スモーク

- **Decision**: `shapes.ts`（座標数・バウンディング・シード決定性・Canvas 不在フォール
  バック）、`morph.ts`（シーケンス循環・進行度の値域・stagger 完了不変条件・自動変形判定）、
  `palette.ts`（テーマ→配色）を Vitest で検証する。`page.test.tsx` は `ParticleCanvas` を
  モックして骨格（見出し・ヒント・戻るリンク）を検証する。WebGL の実描画・変形操作・造形名
  切替・コンソールエラーなしは `e2e/particle-morph.spec.ts`（headless Chromium は
  SwiftShader で WebGL 実行可能）で担保する。
- **Rationale**: jsdom に WebGL がないため、テスト境界＝「three に依存するか」で引くのが
  最小コストで最大の網羅。憲法の「最も狭い有用なレベルでテストする」に一致する。
- **Alternatives considered**: WebGL のモックライブラリ導入（描画結果を検証できず労力対
  効果が低い。却下）。
