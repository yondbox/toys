# ブランチ保護 / 必須ステータスチェック

`main` ブランチに対する保護方針。GitHub の Web UI（Settings > Branches / Rules）で設定する。
リポジトリ設定のためコードでは強制できないが、Dependabot auto-merge を安全に動かす前提となる。

## 推奨設定（standard）

`main` に対して以下を有効化する。

- Require a pull request before merging
- Require status checks to pass before merging
  - 必須チェック: `checks`, `e2e`（`.github/workflows/ci.yml` のジョブ名）
- Require branches to be up to date before merging
- （任意）Require linear history

## auto-merge の前提

- Settings > General > Pull Requests > **Allow auto-merge** を有効化する。
- 上記の必須ステータスチェックが設定されていること。
  - これが無いと `.github/workflows/dependabot-auto-merge.yml` が CI 通過前にマージしてしまう。

## メモ

- Dependabot は minor + patch を自動マージ、major は人手レビュー（workflow 側で分岐）。
