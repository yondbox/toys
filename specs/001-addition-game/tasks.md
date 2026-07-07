# Tasks: たしざんタイムアタック

**Input**: Design documents from `/specs/001-addition-game/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/ui-contract.md, quickstart.md

**Tests**: 憲法の品質ゲートによりテストは必須。各スライス内で「テストを先に書いて赤にする → 実装で緑にする」の順に並べている。

**Organization**: US1(フリーモード)→ US2(タイムアタック)→ US3(じょうきゅう難易度)の垂直スライス。各スライス完了時点でアプリは利用可能な状態を保つ。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Toy-specific code and tests**: `src/app/(toys)/addition-game/`
- **Toy registry**: `src/toys/registry.ts`(T001 の `pnpm new-toy` 経由でのみ更新。手編集しない)
- **End-to-end tests**: `e2e/addition-game.spec.ts`
- 共有コード(`src/components/`・`src/lib/`)への配置なし(plan.md の Structure Decision)

---

## Phase 1: Setup (Minimal Shared Prerequisites)

**Purpose**: 雛形生成。US1〜US3 すべてをアンブロックする。

- [X] T001 Run `pnpm new-toy addition-game --title "たしざんタイムアタック" --description "きほんは1桁・じょうきゅうは2桁の足し算を、フリーモードとタイムアタックで解くゲーム。"` to create `src/app/(toys)/addition-game/page.tsx` and the registry entry in `src/toys/registry.ts`(確認: `pnpm typecheck` が通り、トップページ一覧にリンクが出る)

---

## Phase 2: Foundational (Use Only When Truly Blocking)

**Purpose**: 全ストーリーが共有するゲーム規則の土台(型・難易度定義・問題生成)。US1〜US3 をアンブロックする。

**⚠️ CRITICAL**: このフェーズ完了までユーザーストーリーの実装を開始しない。

- [X] T002 Write failing unit tests for problem generation in `src/app/(toys)/addition-game/game.test.ts`: 難易度別オペランド範囲(きほん 0–9 / じょうきゅう 10–99、FR-002)、注入 rng による境界値(0+0・9+9・10+10・99+99)、直前正解問題と同一の式を再抽選で除外・順序違い(4+3 直後の 3+4)は許可(FR-020)(確認: `pnpm test:unit` が import エラーではなくアサーション失敗で赤)
- [X] T003 Implement types and problem generation in `src/app/(toys)/addition-game/game.ts`: `Difficulty`(basic/advanced)と難易度定義(オペランド範囲・答えの最大桁数 = data-model.md の表)、`Problem`・`GameMode`・`GameState` 判別可能ユニオン・`Action` ユニオン、`FEEDBACK_MS = 800`、初期状態、`generateProblem(difficulty, exclude?, rng = Math.random)`(再抽選ループに FR-020 の意図コメント)、未知の (state, action) には現状態を返す reducer の骨格(確認: T002 のテストが緑)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 自分のペースで足し算を練習する (Priority: P1) 🎯 MVP

**Goal**: フリーモード(きほん難易度)で、数字・Enter・Escape・バックスペースだけで無限に練習できる。

**Independent Test**: quickstart.md「US1」の手順。フリーモードを開始し、入力・1文字削除・全消去・誤答再回答・正解後の自動遷移・もどる操作を確認できる。

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T004 [US1] Add failing reducer tests for free mode in `src/app/(toys)/addition-game/game.test.ts`: START_FREE で playing(free)へ、DIGIT 追加と桁上限で無視(FR-004/022)、BACKSPACE 末尾1文字削除・空なら不変(FR-021)、CLEAR 全消去で問題不変(FR-006)、空 answer の SUBMIT 無効(FR-007)、正解 SUBMIT → feedback(correct)(FR-008)、誤答 SUBMIT → feedback(wrong)(FR-009)、feedback 中の SUBMIT/DIGIT/BACKSPACE/CLEAR 無効(FR-010)、FEEDBACK_DONE: correct→次問題・answer 空 / wrong→同一問題・answer 空(FR-009/020)、free は何問でも終了しない(FR-011)
- [X] T005 [P] [US1] Add failing component tests in `src/app/(toys)/addition-game/page.test.tsx`(Testing Library + フェイクタイマー、`fireEvent.keyDown(window, …)`): `mode-free` クリック→ `equation`/`answer` 表示、数字キー入力が即時反映、正解 Enter → `feedback` に「〇」と「せいかい」→ 800ms 後に別の式(FR-008/019)、誤答 Enter → 「×」と「もういちど」→ 同じ式・空欄(FR-009)、Backspace/Escape の表示反映、修飾キー付き・数字以外のキー無視、`back-button` でモード選択へ(FR-017)。data-testid は contracts/ui-contract.md に従う

### Implementation for User Story 1

- [X] T006 [US1] Implement free-mode reducer transitions in `src/app/(toys)/addition-game/game.ts`(data-model.md 遷移表 #1, #5–#16 の free 分)(確認: T004 が緑)
- [X] T007 [US1] Build the stable layout shell and mode-select screen in `src/app/(toys)/addition-game/page.tsx`: "use client" + `useReducer`、行高固定グリッド(ヘッダー行 = `back-button` を常時描画・モード選択時は `invisible` で領域保持・`shrink-0 whitespace-nowrap`、FR-023 の意図コメント)、`mode-free` ボタン(FR-001 の一部。タイムアタックボタンは US2、難易度は US3 で追加)
- [X] T008 [US1] Implement playing screen, keyboard wiring, and feedback overlay in `src/app/(toys)/addition-game/page.tsx`: window `keydown` 効果(数字は `event.key` 比較で主キーボード/テンキー両対応、Enter/Escape/Backspace、該当キーのみ `preventDefault()`、修飾キー併用は素通し = research.md R5)、`equation`・`answer`(じょうきゅう3桁基準の固定最小幅・`tabular-nums`)、絶対配置の `feedback` オーバーレイ(〇/×+ひらがな、FEEDBACK_MS 後に FEEDBACK_DONE を dispatch、次問題は `generateProblem` で生成して action に載せる)(確認: T005 が緑)
- [X] T009 [US1] Add the US1 journey to `e2e/addition-game.spec.ts`: トップ一覧 → `/addition-game` → フリーモード開始 → 式を読んで正答入力 → 「〇 せいかい」→ 次の式 → 誤答 → 「× もういちど」→ 同じ式 → Backspace/Escape の挙動 → `back-button` でモード選択(確認: `pnpm build && pnpm test:e2e` で緑)
- [X] T010 [US1] Verify US1 acceptance scenarios: `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build && pnpm test:e2e` を実行し、quickstart.md「US1」を `pnpm dev` で手動確認。Conventional Commits(scope: addition-game)でコミット

**Checkpoint**: フリーモード(きほん)が単独で完全に動作・検証可能。MVP。

---

## Phase 4: User Story 2 - 決めた問題数の回答速度に挑戦する (Priority: P2)

**Goal**: 10・30・50・100問のタイムアタック。3秒カウントダウン → 計時・進捗表示 → 結果 → 再挑戦。レイアウトは全遷移で不動。

**Independent Test**: quickstart.md「US2」の手順。10問を選び、カウントダウン → 完走 → 結果(完了数・所要時間)→ 再挑戦を確認できる。

### Tests for User Story 2

- [X] T011 [US2] Add failing reducer tests for time attack in `src/app/(toys)/addition-game/game.test.ts`: START_TIME_ATTACK → countdown(3)、COUNTDOWN_TICK ×3 → playing(startedAt=now)(FR-012/013)、countdown 中の DIGIT/SUBMIT/CLEAR/BACKSPACE 無効(FR-012)、正解で solved+1・誤答で不変(FR-015)、最終問題の正解 SUBMIT → feedback(finishedAt=now)(FR-013)、FEEDBACK_DONE → result(elapsedMs = finishedAt−startedAt)(FR-016)、feedback 連打で進捗が重複しない(FR-010)、RETRY → 同じ target で countdown(3)(FR-016/024)、BACK_TO_MODE_SELECT でセッション破棄(FR-017)
- [X] T012 [P] [US2] Add failing component tests in `src/app/(toys)/addition-game/page.test.tsx`(フェイクタイマー): `mode-10` クリック → `countdown-number` が 3→2→1(各1秒)→ `equation` と `hud`(`progress`「0 / 10もん」・`timer`「0.0びょう」)、正解ごとに progress 増加、timer が 100ms 刻みで表示更新(FR-014)、完走 → `result-count`・`result-time`・`retry`・`back-to-modes`、`retry` でカウントダウン再開

### Implementation for User Story 2

- [X] T013 [US2] Implement time-attack reducer transitions in `src/app/(toys)/addition-game/game.ts`(data-model.md 遷移表 #2–#4, #11, #15, #17–#18。時刻は action payload の `now` のみ使用 = research.md R3)(確認: T011 が緑)
- [X] T014 [US2] Implement countdown, HUD, and result screens in `src/app/(toys)/addition-game/page.tsx`: `mode-10/30/50/100` ボタン(FR-001 完成)、カウントダウン効果(1000ms 間隔で COUNTDOWN_TICK)、`hud`(`tabular-nums` + 最小幅確保で数値変動の幅揺れ防止 = research.md R6)、タイムアタック playing 中のみ 100ms 表示専用 interval、`result-count`/`result-time`/`retry`/`back-to-modes`(確認: T012 が緑)
- [X] T015 [US2] Add the US2 journey and layout-stability assertions to `e2e/addition-game.spec.ts`: 10問タイムアタック完走(式を読んで正答入力)→ 結果の完了数「10もん」と所要時間表示 → `retry` でカウントダウン再開。加えて SC-007: countdown → playing → feedback → result の各状態で `back-button` と `hud` の `boundingBox()` を取得し位置・寸法が全一致することをアサート(FR-023)(確認: `pnpm build && pnpm test:e2e` で緑)
- [X] T016 [US2] Verify US2 acceptance scenarios: 品質ゲート一式を実行し、quickstart.md「US2」を手動確認(カウントダウン中のキー無効・誤答でタイマー継続を含む)。コミット

**Checkpoint**: US1 と US2 がともに独立して動作。タイムアタックが完全に遊べる。

---

## Phase 5: User Story 3 - 上級者向けの2桁の足し算に挑戦する (Priority: P3)

**Goal**: 難易度「じょうきゅう」(2桁同士・答え最大3桁)を、フリーモードと全タイムアタックで選べる。

**Independent Test**: quickstart.md「US3」の手順。じょうきゅうを選んで全問題が2桁同士・3桁入力可能なこと、再挑戦で難易度が引き継がれることを確認できる。

### Tests for User Story 3

- [X] T017 [US3] Add failing reducer tests for advanced difficulty in `src/app/(toys)/addition-game/game.test.ts`: advanced の START_FREE / START_TIME_ATTACK で problem が 10–99(FR-002)、DIGIT が3桁まで入り4桁目は無視(FR-022)、RETRY が difficulty=advanced を引き継ぐ(FR-024)、basic に戻すと桁上限2(FR-022)
- [X] T018 [P] [US3] Add failing component tests in `src/app/(toys)/addition-game/page.test.tsx`: `difficulty-advanced` 選択状態の表示(FR-001)、じょうきゅうでフリーモード開始 → 式の両オペランドが2桁、3桁入力が `answer` に表示、じょうきゅうのタイムアタック完走 → `retry` 後もじょうきゅうのまま

### Implementation for User Story 3

- [X] T019 [US3] Close any difficulty plumbing gaps in `src/app/(toys)/addition-game/game.ts`: すべての開始・再挑戦遷移が `difficulty` を保持し、DIGIT ガードが難易度定義の桁数上限を参照することを確認・修正(確認: T017 が緑)
- [X] T020 [US3] Add the difficulty selector to the mode-select screen in `src/app/(toys)/addition-game/page.tsx`: `difficulty-basic` / `difficulty-advanced`(選択状態が色以外でも判別可能)、選択値を START_* アクションへ、`equation`/`answer` が「99 + 99 =」と3桁の答えでも 320px でレイアウトシフトしないこと(FR-023/SC-006)(確認: T018 が緑)
- [X] T021 [US3] Add the US3 journey to `e2e/addition-game.spec.ts`: じょうきゅう選択 → フリーモードで両オペランド ≥10 をアサート → 3桁の答えで正解 → じょうきゅうの10問タイムアタック完走 → `retry` 後もじょうきゅう(式が2桁同士)(確認: `pnpm build && pnpm test:e2e` で緑)
- [X] T022 [US3] Verify US3 acceptance scenarios: 品質ゲート一式を実行し、quickstart.md「US3」を手動確認。コミット

**Checkpoint**: 全ユーザーストーリーが独立して機能する。

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 複数ストーリーにまたがる仕上げと最終検証。

- [X] T023 [P] Add responsive assertions (SC-006) to `e2e/addition-game.spec.ts`: viewport 320×568 と 1440×900 で、`equation`・`answer`・`feedback`・`hud`・`back-button` が重なり・見切れなく表示されることを確認
- [X] T024 [P] Audit intent comments in `src/app/(toys)/addition-game/game.ts` and `page.tsx`: FEEDBACK_MS の 0.5〜1.5 秒制約(FR-008/009)、FR-020 再抽選ループ、レイアウト固定(FR-023)の理由が説明され、コードの逐語的説明や実装と矛盾するコメントがないこと(憲法 V)
- [X] T025 Run the full merge quality gates and quickstart validation: `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build && pnpm test:e2e` 全緑 + quickstart.md の全シナリオ手動確認(SC-001〜SC-007 の確認ポイントを含む)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし。即開始可能
- **Foundational (Phase 2)**: T001 完了後。**全ユーザーストーリーをブロックする**
- **User Stories (Phase 3–5)**: Phase 2 完了後。推奨は優先度順の逐次実施(P1 → P2 → P3)
- **Polish (Phase 6)**: 全ストーリー完了後

### User Story Dependencies

- **US1 (P1)**: Phase 2 のみに依存。他ストーリーへの依存なし
- **US2 (P2)**: US1 の `page.tsx` シェル(T007)と回答画面・キーボード配線(T008)を再利用する。US1 完了後の着手を推奨
- **US3 (P3)**: US1 のモード選択画面と US2 の再挑戦フローに難易度を通す。US1・US2 完了後の着手を推奨

(注: 1人で逐次実施する前提の依存。US2/US3 はテスト(T011/T012/T017/T018)の作成だけなら US1 実装と並行可能)

### Within Each User Story

- テストを先に書き、赤を確認してから実装で緑にする
- `game.ts`(規則)→ `page.tsx`(配線・表示)→ `e2e`(ジャーニー)→ 検証・コミット の順
- 同一ファイルに触るタスクは [P] にしない

### Parallel Opportunities

- T004 ∥ T005(game.test.ts と page.test.tsx は別ファイル)
- T011 ∥ T012、T017 ∥ T018(同上)
- T023 ∥ T024(e2e とコメント監査は別ファイル)

---

## Parallel Example: User Story 1

```bash
# US1 のテスト作成は並行できる(別ファイル・相互依存なし):
Task: "T004 free モードの reducer テストを src/app/(toys)/addition-game/game.test.ts に追加"
Task: "T005 キーボード操作のコンポーネントテストを src/app/(toys)/addition-game/page.test.tsx に追加"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup(T001)
2. Phase 2: Foundational(T002–T003。全ストーリーをブロック)
3. Phase 3: US1(T004–T010)
4. **STOP and VALIDATE**: quickstart.md「US1」で独立検証。この時点で「きほんのフリーモード」だけのおもちゃとして公開可能
5. デモ・レビュー

### Incremental Delivery

1. Setup + Foundational → 土台完成
2. US1 追加 → 独立テスト → MVP としてデモ可能
3. US2 追加 → 独立テスト → タイムアタックが遊べる
4. US3 追加 → 独立テスト → じょうきゅう難易度が選べる
5. Polish → SC-006 検証・コメント監査・品質ゲート全緑
6. 各ストーリーは前のストーリーを壊さずに価値を積む(コミットは 1 タスク 1 関心事)

---

## Notes

- [P] tasks = different files, no dependencies
- data-testid・タイミング・キーボードの期待値は contracts/ui-contract.md が唯一の根拠
- 状態遷移の期待値は data-model.md の遷移表(#1〜#18)を参照
- テストは実装前に赤を確認する
- コミットは Conventional Commits、scope は `addition-game`(例: `feat(addition-game): add free mode reducer`)
- 各チェックポイントで停止してストーリーを独立検証できる
