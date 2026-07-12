---

description: "Task list for けいさん れんしゅうゲーム（四則演算への再構成）"
---

# Tasks: けいさん れんしゅうゲーム（四則演算への再構成）

**Input**: Design documents from `/specs/002-math-game-redesign/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/ui-contract.md](./contracts/ui-contract.md)

**Tests**: 憲法「振る舞い変更は最も狭い有効なレベルでテスト」に従い、各スライスにテストを含める。
コンポーネント／ユニットでジャーニーを立証できない非機能（モバイル寸法・テーマ横断）は Playwright で担保する。

**Slug 決定（plan/research 参照）**: 既存 `addition-game` を四則演算対応の新スラッグ
`keisan-game` へ発展的に置き換え、`addition-game` は撤去する。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 別ファイルで依存が無く並行可能
- **[Story]**: 対応するユーザーストーリー（US1/US2/US3）
- 説明に正確なファイルパスを含める

## Path Conventions

- おもちゃ固有: `src/app/(toys)/keisan-game/`
- 共有 UI: `src/components/`（複数消費者のみ）／共有非 UI: `src/lib/`（複数消費者のみ）
- registry: `src/toys/registry.ts`（新規は `pnpm new-toy` 経由）／E2E: `e2e/`

---

## Phase 1: Setup（最小限の共有前提）

**Purpose**: 複数スライスをブロックする不可避の準備のみ

- [x] T001 `pnpm new-toy keisan-game --title "けいさんゲーム" --description "＋−×÷ を、れんしゅうとタイムアタックで解く計算ゲーム。"` を実行し、`src/app/(toys)/keisan-game/page.tsx` と `src/toys/registry.ts` のエントリを生成する
- [x] T002 addition-game を撤去する：`src/app/(toys)/addition-game/` を削除し、`src/toys/registry.ts` から addition-game エントリを除去する（存在すれば `e2e/addition-game.spec.ts` も削除）。T001 の後に実行（registry 同一ファイル）
- [x] T003 [P] 名前空間付き localStorage ヘルパ `src/lib/storage.ts` を追加する（接頭辞 `toys:` を強制、保存不能・JSON 破損を握りつぶし既定へフォールバック、`readString/writeString`・`readJSON<T>(key, guard)/writeJSON` を提供）。**US2・US3 を解放する**
- [x] T004 [P] `src/lib/storage.test.ts` を追加する（接頭辞強制、未保存時の既定、破損値フォールバック、他キーを触らないこと）。T003 の API に対して先に失敗するテストを書く

**Checkpoint**: 雛形と共有ストレージ土台が用意でき、各ストーリーに着手できる

---

## Phase 2: User Story 1 - 演算とレベルを選んで練習する（Priority: P1）🎯 MVP

**Goal**: 5 演算 × 3 レベルを選び、タイマー無しの練習を画面テンキー（＋キーボード）で解けるようにする。四則演算対応・タッチ対応・時間プレッシャー無しの中核。

**Independent Test**: `/keisan-game` でひきざん・やさしい・れんしゅうを開始し、キーボードを使わずテンキーだけで入力・削除・誤答後の再回答・正解後の次問題を確認。かけざん・わりざん（あまり2欄含む）・ミックスでも成立し、「おわる」で正解数の成果が出ることを確認する。

### Tests for User Story 1

> 先にテストを書き、失敗を確認してから実装する

- [x] T005 [P] [US1] `src/app/(toys)/keisan-game/operations.test.ts`：演算×レベルの出題範囲、ひき算 answer≥0、わり算の割り切れ・0除算禁止、hard わり算のあまり生成、ミックスの実体化、直前と同一問題の非再現（FR-003/004/005）
- [x] T006 [P] [US1] `src/app/(toys)/keisan-game/game.test.ts`：reducer の練習フロー遷移（選択→playing、DIGIT/BACKSPACE/CLEAR/SUBMIT、feedback→次問題、誤答→同問再挑戦、あまり2欄のフォーカス切替と両欄一致判定、practice 終了の成果）（FR-006/012/013/016）
- [x] T007 [P] [US1] `src/app/(toys)/keisan-game/page.test.tsx`：ホームの演算/レベル/モード選択、テンキー入力と2欄フォーカス、正誤表示、practice 成果表示（contracts の data-testid に準拠）
- [x] T008 [P] [US1] `e2e/keisan-game.spec.ts`：US1 ジャーニー（タッチのみで4演算＋あまり算を解く）と 375×667 たて向きで playing が縦スクロールなしに収まること（SC-001/003/010）

### Implementation for User Story 1

- [x] T009 [P] [US1] `src/app/(toys)/keisan-game/operations.ts`：`Operation`・`Level` 型、演算×レベルの範囲、共通シグネチャの生成器ストラテジ、ミックス、除外（直前問題）を純関数で実装（rng 注入）
- [x] T010 [US1] `src/app/(toys)/keisan-game/game.ts`：`SessionState` 判別ユニオンと reducer（練習フロー・単一/あまり2欄の入力と判定・最大桁数制御・practice 終了）を実装。問題生成は operations.ts を注入。T009 に依存
- [x] T011 [P] [US1] `src/app/(toys)/keisan-game/Keypad.tsx`：画面テンキー（0-9・けす・ぜんぶけす・OK）。タッチターゲット 48px 四方以上、`onKey` コールバック（FR-007/008）
- [x] T012 [US1] `src/app/(toys)/keisan-game/page.tsx`：ホーム（演算/レベル/モード＋演算の識別色・記号 FR-014）とプレイ（式・単一/あまり2欄の答え・Keypad 配線・キーボード listener FR-009・practice 成果・もどる・トップへのリンク）を実装。T009/T010/T011 に依存
- [x] T013 [US1] `src/app/(toys)/keisan-game/page.tsx`・`Keypad.tsx`：たて向き1画面レイアウト（`min-h-[100dvh]` の縦フレックス、テンキー最下部固定、`clamp()` 文字、全体 `overflow-x` 禁止）。T012 に依存（FR-036）
- [x] T014 [US1] US1 を検証：`pnpm test:unit` と US1 の E2E、タッチのみのジャーニーを手動確認（quickstart「US1」）

**Checkpoint**: US1 単体で四則演算の練習が成立し、独立に検証できる（MVP）

---

## Phase 3: User Story 2 - タイムアタックで自己ベストに挑戦する（Priority: P2）

**Goal**: 10・30・50 問のタイムアタックを、カウントダウン・進捗バー・経過時間つきで実施し、演算×レベル×問題数ごとの自己ベストを端末に保存・比較し、更新時にお祝いする。

**Independent Test**: たしざん・やさしい・10もんを2回続けて実施し、1回目で記録が保存、2回目で自己ベスト比較が表示、速ければ更新演出が出る。別の演算・レベル・問題数で記録が混ざらず、再読み込み後も残ることを確認する。

### Tests for User Story 2

- [x] T015 [P] [US2] `src/app/(toys)/keisan-game/records.test.ts`：`toys:keisan-game:best:{op}:{level}:{target}` のキー独立、read/write、破損・未保存フォールバック、より速い時のみ更新（FR-021/023/025/032）
- [x] T016 [US2] `src/app/(toys)/keisan-game/game.test.ts` にケース追加：カウントダウン tick、タイムアタックの正解のみ加算、最終正解での `finishedAt` 確定、result の `elapsedMs`（FR-018/019/020）。T006 と同一ファイル
- [x] T017 [US2] `src/app/(toys)/keisan-game/page.test.tsx` にケース追加：HUD 進捗バー・タイマー表示、result の今回/ベスト比較、更新演出（FR-019/022/023）。T007 と同一ファイル
- [x] T018 [P] [US2] `e2e/keisan-game.spec.ts` に追加：タイムアタックのジャーニー、再読み込み後のベスト保持、組み合わせごとの記録独立（SC-006）

### Implementation for User Story 2

- [x] T019 [P] [US2] `src/app/(toys)/keisan-game/records.ts`：ベストのキー生成と read/write、`updateIfFaster`。`src/lib/storage.ts`（T003）に委譲
- [x] T020 [US2] `src/app/(toys)/keisan-game/game.ts` 拡張：countdown・timeAttack・result の reducer 分岐と所要時間算出、再挑戦（RETRY）。T010 に依存
- [x] T021 [US2] `src/app/(toys)/keisan-game/page.tsx` 拡張：カウントダウン画面、HUD（進捗バー＋0.1秒タイマー）、結果画面（今回/ベスト比較・更新演出・もういちど・ホーム）。T020/T019/T012 に依存
- [x] T022 [US2] US2 を検証：`pnpm test:unit` と US2 の E2E、記録の保持・独立を手動確認（quickstart「US2」）

**Checkpoint**: US1 と US2 が両立し、記録が独立して保持される

---

## Phase 4: User Story 3 - アプリ全体のダーク／ライトを切り替える（Priority: P3）

**Goal**: 初回はブラウザ設定に追従し、手動トグルでライト/ダークを切り替え、トップ＋全おもちゃに一貫適用。設定を `toys:theme` に保存して再訪維持。他のおもちゃの保存データを壊さない。

**Independent Test**: OS をダークにして初回表示がダーク、手動でライトへ→トップや `counter` でもライト、再読み込みで保持、`localStorage` の書き込みが `toys:` 接頭辞のみで他おもちゃのキーが無傷、を確認する。

### Tests for User Story 3

- [x] T023 [P] [US3] `src/lib/theme.test.ts`：`toys:theme` の read/write、system 解決、破損フォールバック、名前空間（FR-026/029/031/032）
- [x] T024 [P] [US3] `src/components/ThemeToggle.test.tsx`：トグルで light⇄dark、`aria` と `data-testid="theme-toggle"`、`data-theme` 反映
- [x] T025 [P] [US3] `e2e/theme.spec.ts`：`colorScheme` によるダーク初期化、手動切替のトップ＋`counter`＋`keisan-game` 横断反映、再読み込み保持、初回フラッシュ無し、書き込みが `toys:` のみで他おもちゃのキーが無傷（SC-007/008、FR-030）

### Implementation for User Story 3

- [x] T026 [P] [US3] `src/lib/theme.ts`：`Theme = "light" | "dark"`、`toys:theme` の read/write（storage 経由）、`matchMedia` による system 解決。T003 に依存
- [x] T027 [P] [US3] `src/components/ThemeToggle.tsx`：client のトグル UI（`data-testid="theme-toggle"`、`aria-label`）。T026 に依存
- [x] T028 [US3] `src/app/globals.css`：dark 変種を属性ベースへ切替（`@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));`）。既存 `dark:` スタイルが `data-theme` で解決されることを確認
- [x] T029 [US3] `src/app/layout.tsx`：初回描画前の同期インライン script（`toys:theme`→無ければ `matchMedia` で `data-theme` 初期化、FOUC 防止）と、全ルートに表示する `ThemeToggle` の配置。T027/T026/T028 に依存
- [x] T030 [US3] US3 を検証：`pnpm test:unit` と `e2e/theme.spec.ts`、トップ＋counter＋keisan-game 横断・再訪保持・localStorage 分離を手動確認（quickstart「US3」）

**Checkpoint**: 3 ストーリーが独立して機能し、テーマがアプリ全体に適用される

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 複数ストーリーに跨る仕上げ

- [x] T031 [P] 横スクロール禁止のアプリ横断検証：`e2e/theme.spec.ts` または新規 `e2e/responsive.spec.ts` に、幅 375px でトップ・`counter`・`keisan-game` の各画面に横スクロールが出ないアサーションを追加し、崩れがあれば該当画面を修正（FR-037/SC-011）
- [x] T032 子ども向けタイポグラフィ：`src/app/layout.tsx` に丸ゴシック（`next/font` の M PLUS Rounded 1c 等）を導入し全体へ適用（可読性向上・任意の見た目改善）
- [x] T033 `src/toys/registry.ts` の keisan-game のタイトル・説明文言を最終調整（四則演算・レベル・モードが伝わる表現に）
- [x] T034 `specs/002-math-game-redesign/quickstart.md` の全シナリオを通し検証
- [x] T035 品質ゲート一括：`pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build && pnpm test:e2e` を通す

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup（Phase 1）**: 依存なし。T001→T002（registry 同一ファイル）。T003・T004 は [P]
- **User Stories（Phase 2-4）**: いずれも Setup 後に着手可能
  - US1 は共有ストレージに依存しない（純粋なゲーム中核）。**US1 は Setup の T001 のみに実質依存し、単独で MVP を構成**
  - US2 は T003（storage）と US1 の playing 画面（T012/T010）に依存
  - US3 は T003（storage）に依存。US1/US2 とは独立にテスト可能
- **Polish（Phase 5）**: 対象ストーリー完了後

### User Story Dependencies

- **US1（P1）**: Setup 後に単独で完結（他ストーリー非依存）
- **US2（P2）**: US1 のプレイ基盤の上に積む（記録・タイマー）。記録は独立検証可能
- **US3（P3）**: 共有基盤（storage）以外は独立。テーマはアプリ横断の共有コントラクト変更

### Within Each User Story

- 変更する振る舞いのテストは同一スライスに含める（先に失敗を確認）
- 依存は具体的な境界に従う：operations→game→page、storage→records/theme
- コア実装→配線→検証の順。ストーリー完了後に次の優先度へ

### Parallel Opportunities

- Setup: T003・T004 は T001/T002 と別ファイルで並行可能
- US1 テスト（T005/T006/T007/T008）は相互に別ファイルで並行可能
- US1 実装: T009（operations）と T011（Keypad）は並行可能。T010→T012→T013 は順次
- US2: T015・T018・T019 は並行可能。T016/T017 は既存テストファイルへの追記で順次
- US3: T023/T024/T025 と T026/T027 は概ね並行可能。T028→T029 は順次
- Foundational（storage）完了後、US1・US3 は別担当で並行着手できる（US2 は US1 の playing に依存）

---

## Parallel Example: User Story 1

```bash
# US1 のテストと独立コンポーネントを同時に着手:
Task: "operations.test.ts を追加（生成範囲・制約）"        # T005
Task: "game.test.ts を追加（練習フロー・あまり2欄）"        # T006
Task: "operations.ts を実装（演算×レベルの生成器）"        # T009
Task: "Keypad.tsx を実装（画面テンキー・48px）"            # T011
```

---

## Implementation Strategy

### MVP First（User Story 1 のみ）

1. Phase 1 Setup を完了（最低限 T001。US1 は storage 非依存）
2. Phase 2（US1）を完了 — 四則演算の練習がテンキーで成立
3. **停止して検証**：US1 を単独でテスト（タッチのみ・4演算・あまり2欄・モバイル1画面）
4. 問題なければデモ／デプロイ

### Incremental Delivery

1. Setup（＋storage）→ 土台完成
2. US1 → 独立検証 → デモ（MVP）
3. US2 → 独立検証 → デモ（タイムアタック＋自己ベスト）
4. US3 → 独立検証 → デモ（アプリ全体テーマ）
5. Polish → 横スクロール検証・タイポ・文言・品質ゲート

### Parallel Team Strategy

1. Setup を全員で完了
2. 完了後：担当 A=US1、担当 C=US3 を並行（US2 は US1 の playing 完了後）
3. 各ストーリーは独立に結合・検証

---

## Notes

- [P] = 別ファイル・依存なし。[Story] ラベルでトレーサビリティを確保
- 各ストーリーは独立に完了・検証できること。テストは実装前に失敗を確認
- コミットは小さく Conventional Commits、scope に `keisan-game`（共有変更は適切な scope）
- 避ける：曖昧タスク・水平レイヤ分割・不当な共有ファイル・同一ファイルの [P] 競合・ストーリー間の独立性を壊す依存
