# Research: たしざんタイムアタック

**Date**: 2026-07-07 | **Plan**: [plan.md](./plan.md)

Technical Context に NEEDS CLARIFICATION は残っていない。以下は実装方式の決定記録。
検証の一部は使い捨てプロトタイプ ([prototype.html](./prototype.html)) で実施済み。

## R1. おもちゃの slug と雛形生成

- **Decision**: slug は `addition-game`。
  `pnpm new-toy addition-game --title "たしざんタイムアタック"` で雛形と registry
  エントリを生成する。
- **Rationale**: 仕様ディレクトリ `001-addition-game` と一致し、AGENTS.md の
  kebab-case 規約を満たす。registry とトップ一覧の手編集禁止(憲法 I)に従う
  唯一の手段が `pnpm new-toy`。
- **Alternatives considered**: `tashizan`(ローマ字は英語話者に意味が通らず却下)、
  `addition-time-attack`(フリーモードも含むため過剰に限定的で却下)。

## R2. 状態管理 — 純粋 reducer + useReducer

- **Decision**: 画面 5 状態(mode-select / countdown / playing / feedback / result)を
  判別可能ユニオンで表す純粋 reducer を `game.ts` に置き、`page.tsx` の
  `useReducer` で使う。乱数(次の問題)と現在時刻は **アクションのペイロードで注入**
  する(reducer 内で `Math.random()` / `Date.now()` を呼ばない)。
- **Rationale**:
  - React 19 + React Compiler は reducer の純度を前提とする。StrictMode の二重実行でも
    問題生成が重複しない。
  - 正誤判定・進捗・重複判定防止 (FR-007/010/015) が DOM なしのユニットテストで
    網羅できる。
  - 状態がユニオンなので「カウントダウン中はキー無効」「feedback 中の Enter 連打無効」
    が型と分岐で自明になる(エッジケース 8 件の大半が reducer テストに落ちる)。
- **Alternatives considered**: 複数 `useState`(状態間の整合性を効果で縫うことになり
  重複判定防止が壊れやすい)、XState 等の導入(新規依存の追加は不要な複雑さ)。

## R3. 計時 — タイムスタンプ差分 + 100ms 表示タイマー

- **Decision**: タイマーは `startedAt`(カウントダウン終了時刻)と
  `finishedAt`(最終問題の正解時刻)のタイムスタンプ差分で確定する。値は
  `submit` / `countdown` アクションのペイロードとして `Date.now()` を渡す。
  表示だけを `setInterval` 100ms で再描画し、interval は計測に使わない。
- **Rationale**: FR-013(カウントダウン終了で 0 から開始、最終正解で停止)を
  interval の誤差と無関係に満たす。所要時間は正解した瞬間の時刻で確定するため、
  表示更新頻度 (FR-014: 0.1 秒単位) と計測精度が分離される。フェイクタイマーでの
  テストも決定的になる。
- **Alternatives considered**: interval の積算(ドリフトし SC-004 の計時一致を
  満たせない)、`requestAnimationFrame`(0.1 秒表示に対して過剰、タブ非表示で停止)。

## R4. 正誤フィードバックとカウントダウンの時間定数

- **Decision**: 正誤フィードバック表示は **800ms** の定数(`FEEDBACK_MS`)。
  カウントダウンは 3・2・1 を各 **1000ms**(FR-012)。いずれも効果側で
  `setTimeout`/`setInterval` を張り、完了アクションを dispatch する。
- **Rationale**: 800ms は FR-008/009 の「0.5 秒以上 1.5 秒以内」の中央付近。
  プロトタイプで体感を確認済み(テンポを損なわず、低学年でも読み取れる)。
- **Alternatives considered**: 500ms(読み取りが忙しい)、ユーザー設定化(Out of
  Scope の難易度調整に近づくため却下)。

## R5. キーボード入力の取り扱い

- **Decision**: `page.tsx` の効果で `window` に `keydown` リスナーを 1 本張る。
  `event.key` が `"0"`〜`"9"`(主キーボード・テンキーとも同じ値になる)、
  `"Enter"`、`"Escape"`、`"Backspace"` のときだけ処理し、該当キーは
  `preventDefault()` する。`metaKey`/`ctrlKey`/`altKey` 併用時は素通しして
  ブラウザショートカットを壊さない。playing 状態以外ではリスナーは何も
  dispatch しない(カウントダウン・feedback 中のキー無効はここと reducer の
  二重で保証)。
- **Rationale**: FR-004(主キーボードとテンキー)は `event.key` の数字文字比較で
  両方カバーできる(`event.code` は `Digit1`/`Numpad1` に分かれるため使わない)。
  FR-005(追加の選択操作なしで受け付け続ける)はフォーカス非依存の window
  リスナーが最も確実。Backspace 長押しのリピートは 1 打鍵 = 1 文字削除 (FR-021) の
  自然な繰り返しとしてそのまま許容。
- **Alternatives considered**: 隠し `<input>` へのフォーカス管理(フォーカス喪失で
  FR-005 が破れる、モバイル IME を誘発)、`keypress`(非推奨 API)。

## R6. レイアウト安定 (FR-023 / SC-007) — プロトタイプの不具合の恒久対策

- **Decision**: 画面シェルを「ヘッダー行(戻る操作)/ 本文」の行高固定 CSS グリッドに
  し、以下を規約とする:
  - 戻るボタンは全プレイ状態で**常に描画**し、モード選択画面では `invisible`
    (領域は保持)にする。`shrink-0` + `whitespace-nowrap` で縮み・折り返しを禁止。
  - 正誤フィードバックは絶対配置のオーバーレイで重ね、下の文書フローを動かさない。
  - タイマー・進捗は `tabular-nums` + `min-w-[Nch]` で数値の桁変動による幅の
    揺れを防ぐ。答え欄はじょうきゅうの 3 桁を基準に最小幅・高さを固定する。
  - E2E で戻るボタンと HUD の `boundingBox()` を状態遷移の前後で比較し、
    位置・寸法の一致をアサートする (SC-007)。
- **Rationale**: プロトタイプで「モードせんたくへ もどる」ボタンが縮んだ原因は、
  flex アイテムに `flex-shrink` 抑止と `white-space: nowrap` がなく、コンテンツ幅の
  変化に応じてボタンが圧縮・折り返されたこと。要素の出し入れ(条件付き描画)も
  リフローを誘発するため「常に描画して不可視化」に統一する。
- **Alternatives considered**: 画面ごとの ad-hoc な余白調整(検証不能で回帰しやすい)、
  `position: fixed` のヘッダー(320px 幅で本文と重なるリスク、SC-006 に不利)。

## R7. 問題生成と連続重複の禁止 (FR-020)

- **Decision**: `generateProblem(difficulty, exclude?, rng = Math.random)` を純関数として
  実装。直前に正解した問題と `a`・`b` が両方同じ場合は再抽選するループで除外する。
- **Rationale**: 除外対象は高々 1 組で、組み合わせ空間はきほん 100 通り・
  じょうきゅう 8100 通りのため再抽選は実質 O(1)。`rng` 注入でユニットテストが
  決定的になる(境界値 0+0、9+9、10+10、99+99 の生成も強制できる)。
- **Alternatives considered**: 全組み合わせのシャッフル配列(セッション間で問題順の
  再現が不要という Assumption に対して過剰)、除外なし再抽選の確率放置(FR-020 に
  違反)。

## R8. テスト戦略

- **Decision**: 3 層に分ける。
  - **`game.test.ts`(ユニット)**: reducer の全遷移と問題生成。エッジケース
    (空 Enter・空 Backspace・桁上限・カウントダウン/feedback 中のキー・重複判定
    防止・難易度別の出題範囲・再挑戦の難易度引き継ぎ)を FR ID を test 名に含めて
    網羅。
  - **`page.test.tsx`(コンポーネント)**: Testing Library + フェイクタイマーで、
    キーボードイベント(`fireEvent.keyDown(window, …)`)から画面表示(式・答え欄・
    〇×・ひらがなメッセージ・進捗)までを確認。
  - **`e2e/addition-game.spec.ts`(E2E)**: US1(フリーで正解→誤答→再回答→
    Backspace/Escape)、US2(10 問タイムアタック完走→結果→再挑戦)、US3
    (じょうきゅうで 2 桁出題と 3 桁入力)。加えて SC-006(viewport 320px と
    1440px で要素が重ならない)と SC-007(状態遷移前後の boundingBox 一致)。
- **Rationale**: 憲法の品質ゲート(「behavior changes MUST include tests at the
  narrowest useful level」)に従い、規則はユニット、配線はコンポーネント、
  ジャーニーと視覚安定だけを E2E に置く。E2E は `pnpm build` + `pnpm start` 前提
  (playwright.config.ts の webServer 設定)。
- **Alternatives considered**: E2E のみ(reducer のエッジケース網羅が遅く不安定)、
  スクリーンショット比較(閾値調整が脆く、boundingBox 比較で SC-007 は十分)。
