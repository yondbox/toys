# Data Model: たしざんタイムアタック

**Date**: 2026-07-07 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

すべてメモリ内の値。永続化なし(Assumptions)。実装は `src/app/(toys)/addition-game/game.ts` に置く。

## エンティティ

### Difficulty(難易度)

| 値 | 表示名 | オペランド範囲 | 答えの範囲 | 答えの最大桁数 |
|------------|------------|----------------|------------|----------------|
| `basic` | きほん | 0〜9 の整数 | 0〜18 | 2 |
| `advanced` | じょうきゅう | 10〜99 の整数 | 20〜198 | 3 |

- 由来: FR-001, FR-002, FR-022
- セッション開始時に確定し、セッション中は不変 (FR-024)。再挑戦へ引き継ぐ。

### GameMode(ゲームモード)

- `free` — 終了条件なし。カウントダウン・タイマー・進捗を持たない (FR-011)。
- `timeAttack` — 目標問題数 `target ∈ {10, 30, 50, 100}` を持つ (FR-001)。

### Problem(足し算問題)

```
Problem = { a: number, b: number, answer: number }   // answer = a + b
```

- 不変条件: `a`・`b` は難易度のオペランド範囲内 (FR-002)。
- 生成規則: 直前に正解した Problem と `a`・`b` が両方一致する組を出さない (FR-020)。
  比較は順序を含む(`3+4` の直後の `4+3` は許可)。

### AnswerAttempt(回答試行)

- `answer: string` — 入力中の答え。数字のみ、最大桁数は難易度に従う (FR-022)。
  空文字のとき Enter は無効 (FR-007)。
- 判定: `Number(answer) === problem.answer`。誤答は進捗を変えない (FR-015)。

### PlaySession(プレイセッション)= 状態機械

セッションは以下の判別可能ユニオンで表す。これが唯一の状態源。

```
GameState =
  | { screen: "mode-select" }
  | { screen: "countdown"; difficulty; target; remaining: 3 | 2 | 1 }
  | { screen: "playing";   difficulty; mode; problem; answer: string;
      solved: number; lastSolved: Problem | null; startedAt: number | null }
  | { screen: "feedback";  …playing と同じフィールド…; result: "correct" | "wrong";
      finishedAt: number | null }
  | { screen: "result";    difficulty; target; elapsedMs: number }
```

- `startedAt` はタイムアタックのみ非 null(カウントダウン終了時刻、FR-013)。
- `finishedAt` は最終問題の正解時刻。`elapsedMs = finishedAt - startedAt` (SC-004)。
- 経過時間の**表示**は状態に持たない(`startedAt` からの導出値。表示層が 100ms 毎に再描画、FR-014)。

## 状態遷移表

| # | 現在の画面 | イベント(アクション) | ガード | 次の画面 / 効果 | 由来 |
|---|-----------|----------------------|--------|-----------------|------|
| 1 | mode-select | `START_FREE {difficulty, problem}` | — | playing(free, solved=0, answer="") | FR-001, FR-011 |
| 2 | mode-select | `START_TIME_ATTACK {difficulty, target}` | — | countdown(remaining=3) | FR-001, FR-012 |
| 3 | countdown | `COUNTDOWN_TICK {now, problem}` | remaining > 1 | countdown(remaining−1) | FR-012 |
| 4 | countdown | `COUNTDOWN_TICK {now, problem}` | remaining = 1 | playing(startedAt=now, problem) | FR-012, FR-013 |
| 5 | playing | `DIGIT {d}` | answer の桁数 < 難易度上限 | answer 末尾に追加 | FR-004, FR-022 |
| 6 | playing | `DIGIT {d}` | 桁数上限に到達済み | 変化なし | FR-022 |
| 7 | playing | `BACKSPACE` | answer ≠ "" | answer 末尾 1 文字削除 | FR-021 |
| 8 | playing | `BACKSPACE` | answer = "" | 変化なし | FR-021 |
| 9 | playing | `CLEAR`(Escape) | — | answer = ""(問題・進捗は不変) | FR-006 |
| 10 | playing | `SUBMIT {now}` | answer = "" | 変化なし | FR-007 |
| 11 | playing | `SUBMIT {now}` | 正解・タイムアタック・solved+1 = target | feedback(correct, finishedAt=now) | FR-008, FR-013 |
| 12 | playing | `SUBMIT {now}` | 正解・上記以外 | feedback(correct) | FR-008 |
| 13 | playing | `SUBMIT {now}` | 誤答 | feedback(wrong)(タイマーは進み続ける) | FR-009, FR-015 |
| 14 | feedback | `FEEDBACK_DONE {problem?}` | correct・未完了 | playing(次の problem、TA は solved+1、answer="")。lastSolved を更新 | FR-008, FR-020 |
| 15 | feedback | `FEEDBACK_DONE` | correct・完了 | result(elapsedMs 確定) | FR-016 |
| 16 | feedback | `FEEDBACK_DONE` | wrong | playing(同じ problem、answer="") | FR-009 |
| 17 | result | `RETRY` | — | countdown(同じ difficulty・target、remaining=3) | FR-016, FR-024 |
| 18 | countdown / playing / feedback / result | `BACK_TO_MODE_SELECT` | — | mode-select(セッション破棄) | FR-017 |

### 無効イベント(明示的に「変化なし」)

- countdown 中の `DIGIT` / `SUBMIT` / `CLEAR` / `BACKSPACE`(エッジケース、FR-012)
- feedback 中の `DIGIT` / `SUBMIT` / `CLEAR` / `BACKSPACE`(Enter 連打の重複判定防止 = FR-010、数字等の先行入力禁止)
- mode-select / result 中のキー入力アクション全般

reducer は未知の (state, action) 組に対して現在の state をそのまま返す。

## バリデーションルールの対応表

| ルール | 実装箇所 | 由来 |
|--------|----------|------|
| オペランドは難易度の範囲内 | `generateProblem(difficulty, exclude?, rng)` | FR-002 |
| 直前正解問題と同一の式を出さない | `generateProblem` の再抽選ループ(`lastSolved` を exclude に渡す) | FR-020 |
| 答えは数字のみ・桁数上限 | `DIGIT` 遷移のガード | FR-004, FR-022 |
| 空の答えは判定しない | `SUBMIT` 遷移のガード | FR-007 |
| 誤答は進捗を増やさない | `SUBMIT`(誤答)で solved 不変 | FR-015 |
| 難易度はセッション中不変・再挑戦へ引き継ぐ | 状態に difficulty を保持し `RETRY` でコピー | FR-024 |
