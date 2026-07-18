# Tasks: particle-morph（パーティクル・モーフィング）

**Input**: Design documents from `/specs/003-particle-morph/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contract.md, quickstart.md

**Tests**: 憲法の品質ゲートに従い、挙動を持つスライスは最も狭い有用なレベルのテストを同じ
スライス内に含める。純関数（shapes / morph / palette）は Vitest、ページ骨格は Testing
Library、WebGL の実描画・ジャーニーは Playwright（research.md R11 のテスト境界）。

**Organization**: US1（表示と手動変形・MVP）→ US2（ポインタ反発・視差）→ US3（自動変形)
→ US4（テーマ連動）の垂直スライス。真にブロッキングな基盤フェーズはないため Foundational
フェーズは置かない。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並行実行可（別ファイル・未完了タスクへの依存なし）
- **[Story]**: 対応するユーザーストーリー（US1〜US4）
- 各タスクに正確なファイルパスを含む

## Path Conventions

- **Toy-specific code and tests**: `src/app/(toys)/particle-morph/`
- **Toy registry**: `src/toys/registry.ts`（`pnpm new-toy` 経由でのみ更新）
- **End-to-end tests**: `e2e/`
- 共有コード（`src/components/`・`src/lib/`）への追加はなし（plan.md Structure Decision）

---

## Phase 1: Setup (Minimal Shared Prerequisites)

**Purpose**: US1〜US4 すべてを解放する、避けられない前提のみ

- [X] T001 Run `pnpm new-toy particle-morph` to scaffold `src/app/(toys)/particle-morph/page.tsx`
      and auto-register the toy in `src/toys/registry.ts`; set title
      「パーティクル・モーフィング」and the one-line description from spec.md in the generated
      registry entry（unblocks US1–US4）
- [X] T002 [P] Add Three.js with `pnpm add three` (updates `package.json`, `pnpm-lock.yaml`;
      types are bundled, no `@types/three`)（unblocks US1–US4）

**Checkpoint**: `pnpm dev` で `/particle-morph` に雛形ページが表示され、トップ一覧に載る

---

## Phase 2: User Story 1 - 開いて眺め、操作ひとつで次の形へ変形させる (Priority: P1) 🎯 MVP

**Goal**: 24,000 粒子が球体を作って動き続け、クリック／タップ／Space で 5 造形
（きゅうたい→むすびめ→ぎんが→なみ→もじ「あっ」）を stagger 変形で循環する。造形名ラベル・
ヒント・戻るリンク・WebGL フォールバックを含む、独立して成立する鑑賞体験。

**Independent Test**: quickstart.md 手順 1〜5（一覧から遷移、初期表示、クリック変形、連打
耐性、一巡）+ `pnpm test:unit` + `pnpm test:e2e`

### Tests for User Story 1

> **NOTE: 純関数のテストは実装と同じタスク列で先に書き、失敗を確認してから実装する**

- [X] T003 [P] [US1] Add shape-generator tests (length = count×3, bounding radius, seed
      determinism, text-shape fallback when Canvas 2D is unavailable) in
      `src/app/(toys)/particle-morph/shapes.test.ts`
- [X] T004 [P] [US1] Add morph-logic tests (sequence cycling sphere→…→text→sphere, progress
      range/monotonicity, stagger completion invariant at progress=1, morph requests ignored
      while `phase="morphing"`) in `src/app/(toys)/particle-morph/morph.test.ts`

### Implementation for User Story 1

- [X] T005 [P] [US1] Implement the five deterministic shape generators (sphere, torusKnot,
      galaxy, wave, text via Canvas 2D pixel sampling with sphere fallback; data-model.md
      Shape invariants) in `src/app/(toys)/particle-morph/shapes.ts`
- [X] T006 [P] [US1] Implement ShapeSequence and MorphTransition pure logic (fixed cyclic
      order, easing, `DELAY_MAX=0.4` stagger rule, duration constant 1–3s, ignore-while-morphing;
      data-model.md 状態遷移) in `src/app/(toys)/particle-morph/morph.ts`
- [X] T007 [US1] Write vertex/fragment shaders (attributes `aPositionFrom`/`aPositionTo`/
      `aDelay`/`aRandom`, uniform `uProgress`, per-particle effective progress shared with
      morph.ts, swirl offset during transition, `gl_PointCoord` glow; research.md R3/R4) in
      `src/app/(toys)/particle-morph/shaders.ts` (depends on T006 stagger rule)
- [X] T008 [US1] Build the Three.js scene layer (renderer with try/catch WebGL detection,
      DPR clamp 2, Points geometry + attributes, morph trigger that rewrites `aPositionFrom`
      and resets progress, rAF loop with clamped timestamps, resize handling, full dispose;
      research.md R8/R9) in `src/app/(toys)/particle-morph/scene.ts` (depends on T005–T007)
- [X] T009 [US1] Create the client component bridging React and the scene (useEffect
      lifecycle, click/tap/Space handlers, shape-name callback into React state, fallback
      flag when WebGL init fails; research.md R2) in
      `src/app/(toys)/particle-morph/ParticleCanvas.tsx` (depends on T008)
- [X] T010 [US1] Compose the page per contracts/ui-contract.md (h1 heading, `aria-live`
      shape label with ひらがな names, operation hint, back link to `/`, fallback message
      branch) in `src/app/(toys)/particle-morph/page.tsx` (depends on T009)
- [X] T011 [P] [US1] Add page-skeleton tests with ParticleCanvas mocked (heading, label,
      hint, back link, fallback branch) in `src/app/(toys)/particle-morph/page.test.tsx`
      (depends on T010)
- [X] T012 [US1] Add journey smoke test (canvas visible within 3s, click advances label
      through all five names back to きゅうたい, repeated clicks during morph do not break,
      no console errors, WebGL-disabled context shows fallback message) in
      `e2e/particle-morph.spec.ts` (depends on T010)
- [X] T013 [US1] Verify US1 acceptance: quickstart.md 手順 1〜5 を `pnpm dev` で手動確認し、
      `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build && pnpm test:e2e` を通す

**Checkpoint**: US1 が単独で成立（MVP）。ここでデモ可能

---

## Phase 3: User Story 2 - ポインタで粒子に触れて遊ぶ (Priority: P2)

**Goal**: ポインタ周辺の粒子が押し出されるように避け、離すと滑らかに戻る。ポインタ位置に
応じた視差でカメラが微動する。基準位置を汚さない表示上の変位として実装し、変形と独立に合成
される。

**Independent Test**: quickstart.md 手順 6（重ねる→避ける、離す→戻る、視差)を手動確認し、
既存ユニット・E2E が緑のまま

### Implementation for User Story 2

- [X] T014 [US2] Add pointer-repulsion displacement to the vertex shader (uniforms
      `uPointer`/`uRepelStrength`, smooth radial falloff, zero effect when strength is 0;
      research.md R6) in `src/app/(toys)/particle-morph/shaders.ts`
- [X] T015 [US2] Wire pointer tracking into the scene and component (pointermove → NDC →
      Raycaster projection onto Z=0 plane, strength ease-in/out on enter/leave, camera
      parallax lerp; PointerState per data-model.md) in
      `src/app/(toys)/particle-morph/scene.ts` and
      `src/app/(toys)/particle-morph/ParticleCanvas.tsx` (depends on T014)
- [X] T016 [US2] Verify US2 acceptance: quickstart.md 手順 6 を手動確認し、ポインタ操作中の
      変形（US1 受け入れ 4）が壊れないことと `pnpm test:e2e` の全件成功を確認する

**Checkpoint**: US1 + US2 が独立して動作

---

## Phase 4: User Story 3 - 放置していても変形が続く (Priority: P3)

**Goal**: 無操作 8 秒で自動的に次の造形へ変形し、操作すると計測が仕切り直される。判定は
rAF タイムスタンプ基準の純関数で、変形中は発火しない。

**Independent Test**: おもちゃを開いて無操作で待ち自動変形を確認、クリック直後に自動変形が
重ならないことを確認（quickstart.md 手順 7）。判定境界は `pnpm test:unit` で決定的に検証

### Tests for User Story 3

- [X] T017 [P] [US3] Add auto-advance judgment tests (fires only when `phase="idle"` and
      elapsed ≥ 8,000ms, any interaction resets `lastInteractionAt`, firing updates the
      timestamp so it does not re-fire immediately; data-model.md AutoAdvance invariants) in
      `src/app/(toys)/particle-morph/morph.test.ts`

### Implementation for User Story 3

- [X] T018 [US3] Implement AutoAdvance pure logic (injectable now/lastInteractionAt,
      `intervalMs=8000`; research.md R10) in `src/app/(toys)/particle-morph/morph.ts`
      (depends on T017 written first)
- [X] T019 [US3] Query auto-advance from the rAF loop and update `lastInteractionAt` on
      click/Space/pointer interaction in `src/app/(toys)/particle-morph/scene.ts` and
      `src/app/(toys)/particle-morph/ParticleCanvas.tsx` (depends on T018)
- [X] T020 [US3] Verify US3 acceptance: quickstart.md 手順 7 を手動確認し、
      `pnpm test:unit` と `pnpm test:e2e` を通す

**Checkpoint**: US1〜US3 が独立して動作

---

## Phase 5: User Story 4 - アプリのテーマと雰囲気が連動する (Priority: P4)

**Goal**: `html[data-theme]` に追従して背景・粒子配色・ブレンドモードが再読み込みなしで
切り替わる。ダーク＝深宇宙＋加算グロー、ライト＝明背景＋濃色粒子。

**Independent Test**: 表示中に ThemeToggle を操作して 1 秒以内に配色が変わることを確認
（quickstart.md 手順 8）。パレット解決は `pnpm test:unit`、切替追従は `pnpm test:e2e`

### Tests for User Story 4

- [X] T021 [P] [US4] Add palette-resolution tests (light/dark ごとの background・colorInner・
      colorOuter・blending) in `src/app/(toys)/particle-morph/palette.test.ts`

### Implementation for User Story 4

- [X] T022 [P] [US4] Implement `resolvePalette(theme)` referencing the shared `Theme` type
      from `src/lib/theme.ts` (read-only dependency; research.md R7) in
      `src/app/(toys)/particle-morph/palette.ts`
- [X] T023 [US4] Apply the palette in the scene (background/color uniforms, additive vs
      normal blending switch) and observe theme changes (initial `dataset.theme` read +
      `MutationObserver` with `attributeFilter: ["data-theme"]`, disconnect on cleanup) in
      `src/app/(toys)/particle-morph/scene.ts` and
      `src/app/(toys)/particle-morph/ParticleCanvas.tsx` (depends on T021–T022)
- [X] T024 [US4] Extend the journey test with theme switching (toggle → canvas/page colors
      change without reload, no console errors) in `e2e/particle-morph.spec.ts`
      (depends on T023)
- [X] T025 [US4] Verify US4 acceptance: quickstart.md 手順 8 を手動確認し、
      `pnpm test:unit` と `pnpm test:e2e` を通す

**Checkpoint**: 全ユーザーストーリーが独立して動作

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 複数ストーリーに跨る仕上げ（FR-012 の reduced-motion は US2/US3 の挙動を
横断するためここで実装する）

- [X] T026 Honor `prefers-reduced-motion: reduce` (disable auto-advance and pointer
      repulsion, keep gentle rotation and manual morph; FR-012, research.md R8) in
      `src/app/(toys)/particle-morph/ParticleCanvas.tsx` and
      `src/app/(toys)/particle-morph/scene.ts`
- [X] T027 [P] Confirm resize/orientation behavior and no horizontal page scroll at 375px
      width (FR-014) using Playwright viewport checks in `e2e/particle-morph.spec.ts`
- [X] T028 [P] Review intent comments against plan.md の Comments 方針（stagger 完了不変条件・
      テキスト造形のサンプリング理由・DPR/dispose・MutationObserver 採用理由のみ残し、逐語
      コメントを除去）across `src/app/(toys)/particle-morph/`
- [X] T029 Run full quickstart.md validation (手順 1〜10 + 品質ゲート
      `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build && pnpm test:e2e`)
      and record results in `specs/003-particle-morph/quickstart.md` の期待最終状態に照らして
      confirm 変更範囲が plan.md Structure Decision の 3 点に閉じていること

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし。T001 と T002 は並行可
- **User Stories (Phase 2–5)**: Setup 完了後に開始可。US2〜US4 は US1 の scene/shaders/
  ParticleCanvas を拡張するため、**同一ファイル編集の衝突を避ける目的で US1 完了後を推奨**
  （検証はストーリーごとに独立）
- **Polish (Phase 6)**: 対象ストーリー（US2/US3 を含む）完了後

### User Story Dependencies

- **US1 (P1)**: Setup のみに依存。単独で MVP
- **US2 (P2)**: US1 の `shaders.ts`/`scene.ts` を拡張（表示上の変位のみで US1 の挙動は不変）
- **US3 (P3)**: US1 の `morph.ts`/`scene.ts` を拡張。US2 とはファイルが一部重なるのみで
  論理依存なし
- **US4 (P4)**: US1 の `scene.ts` を拡張。US2/US3 と論理依存なし

### Within Each User Story

- 純関数のテスト（T003/T004/T017/T021）を実装より先に書き、失敗を確認してから実装する
- shapes/morph（純関数）→ shaders → scene → ParticleCanvas → page の順に統合する
- 各ストーリー末尾の Verify タスクで受け入れシナリオと品質ゲートを確認してから次へ進む

### Parallel Opportunities

- Phase 1: T001 ∥ T002
- US1: T003 ∥ T004（テスト先行）、その後 T005 ∥ T006、T011 は T012 と並行可
- US3 の T017 と US4 の T021/T022 は、US1 完了後であれば互いに並行可（別ファイル）
- Polish: T027 ∥ T028

---

## Parallel Example: User Story 1

```bash
# テストを先行して並行着手:
Task: "shapes.test.ts に造形生成テストを追加"        # T003
Task: "morph.test.ts に変形ロジックテストを追加"      # T004
# その後、純関数実装を並行:
Task: "shapes.ts に 5 造形の生成関数を実装"           # T005
Task: "morph.ts にシーケンス・変形進行を実装"         # T006
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup（T001–T002）
2. Phase 2: US1（T003–T013）
3. **STOP and VALIDATE**: quickstart.md 手順 1〜5 と品質ゲート 5 コマンド
4. この時点でデモ可能（造形の循環変形だけで驚き体験が成立する）

### Incremental Delivery

1. Setup → US1 → 検証 → デモ（MVP）
2. US2（触れる楽しさ）→ 検証 → デモ
3. US3（自動変形）→ 検証 → デモ
4. US4（テーマ連動）→ 検証 → デモ
5. Polish（reduced-motion・375px 検証・コメント精査・最終ゲート）

各ストーリーは前のストーリーを壊さずに価値を追加する。コミットは 1 タスクまたは小さな論理
グループごとに Conventional Commits（scope: `particle-morph`。例:
`feat(particle-morph): add staggered morph between sphere and torus knot`）で行う。

---

## Notes

- [P] タスク＝別ファイルかつ未完了タスクへの依存なし
- US2〜US4 は `scene.ts`・`ParticleCanvas.tsx` を共有編集するため、並行着手する場合は
  ストーリー単位でブランチを分けず順次実施を推奨
- 造形の表示名・順序は contracts/ui-contract.md の表が唯一の正（E2E はラベル文字列で検証）
- `src/toys/registry.ts` を手で編集しない（T001 の `pnpm new-toy` 経由のみ）
- 保存データを追加しない（localStorage 新規キーなし。ui-contract.md 非機能）
