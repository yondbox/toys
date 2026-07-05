# Security Policy

## サポート対象

本リポジトリは常に `main` ブランチの最新状態のみをサポートします。過去の状態やフォークに対する修正提供は行いません。

## 脆弱性の報告

脆弱性を発見した場合は、**公開 Issue を作成せず**に非公開で報告してください。

- GitHub の「Security」タブ →「Report a vulnerability」（Private vulnerability reporting）を利用してください。
- 利用できない場合はリポジトリオーナーに非公開で連絡してください。

修正がリリースされるまで、脆弱性の詳細を公開しないでください。

## シークレットの取り扱い

- トークン・秘密鍵・実際の `.env` ファイルをコミットしないでください（`.gitignore` で `.env*` を除外済み）。
- 必要な環境変数は `.env.example` に**値を伏せて**記載してください。

## 依存関係のセキュリティ

- 依存関係は Dependabot（`.github/dependabot.yml`）により毎週更新されます。
- セキュリティ更新は CI（lint / typecheck / test / build）通過を前提にマージします。
