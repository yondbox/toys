# ✨ 新しいおもちゃを追加：パーティクル・モーフィング

## 概要

数万個の光る粒子が、球体・トーラス結び目・渦巻銀河・波打つ平面・テキスト「あっ」へと変形し続ける、鑑賞・体験型の新しいおもちゃを追加しました。

開いた瞬間に視覚的な驚きを提供し、クリック／タップで次の形へ変形、マウスを近づけると粒子が避け、放置すると自動で変形が進みます。アプリ全体のライト／ダークテーマにも連動します。

**アクセス先**: `/particle-morph`

## 🎯 実装内容

### 主な機能

- **24,000個の粒子による5種の造形**
  - 🔵 球体（きゅうたい）
  - 🔗 トーラス結び目（むすびめ）
  - 🌌 渦巻銀河（ぎんが）
  - 〰️ 波打つ平面（なみ）
  - 💬 テキスト「あっ」（もじ）

- **操作方法**
  - クリック／タップ／スペースキーで次の形へ変形
  - マウスを近づけると粒子が避ける（repulsion）
  - マウス位置に応じた視差効果（parallax）

- **自動変形**
  - 約8秒間操作がないと自動で次の形へ遷移
  - 操作時は自動変形のタイマーがリセット

- **テーマ連動**
  - ライト／ダークモードに応じて粒子の色が変化
  - システム設定の変更にリアルタイム対応

- **アクセシビリティ**
  - `prefers-reduced-motion` 対応（モーション制限時は滑らかな変形）
  - WebGL非対応環境でのフォールバック表示
  - 現在の造形名を `aria-live` で通知

## 🏗️ 技術的な詳細

### アーキテクチャ

**依存性逆転原則（DIP）に基づいた層分離**:
- **純粋ロジック層**: 形状生成・モーフィング・パレット（Three.js非依存）
- **レンダリング層**: Three.js シーン管理・シェーダー実装
- **UI層**: Reactコンポーネント・ライフサイクル管理

### 新規ファイル

#### メイン実装 (`src/app/(toys)/particle-morph/`)
- `page.tsx` - ページコンポーネント（見出し、ラベル、ヒント、戻るリンク）
- `ParticleCanvas.tsx` - Three.jsシーンのReactブリッジ
- `scene.ts` - シーン管理・アニメーションループ・イベント処理
- `shaders.ts` - カスタムGLSLシェーダー（頂点・フラグメント）
- `shapes.ts` - 5種の形状生成ロジック（決定的・再現可能）
- `morph.ts` - モーフィング制御・イージング・stagger処理
- `palette.ts` - テーマカラーパレット解決

#### テスト
- `src/app/(toys)/particle-morph/*.test.ts` / `*.test.tsx` - ユニットテスト
- `e2e/particle-morph.spec.ts` - Playwright E2Eテスト

### 依存関係の追加

```json
{
  "dependencies": {
    "three": "^0.185.1"
  },
  "devDependencies": {
    "@types/three": "^0.185.0"
  }
}
```

### シェーダー実装の特徴

- **Staggered morph**: 各粒子が個別のタイミングで変形（`aDelay` attribute）
- **Pointer repulsion**: マウス近傍の粒子を押し出し
- **Glow effect**: 距離に応じたブルームエフェクト
- **Smooth interpolation**: Smoothstep イージングによる滑らかな補間

## ✅ テスト

### ユニットテスト (Vitest)
- ✅ 形状生成ロジック（決定的・24,000点生成）
- ✅ モーフィング制御（シーケンス・イージング・stagger）
- ✅ パレット解決（light/dark テーマ）
- ✅ ページコンポーネント骨格

### E2Eテスト (Playwright)
- ✅ キャンバス表示とジャーニー（5形状の循環）
- ✅ クリック／タップ操作
- ✅ WebGL非対応時のフォールバック
- ✅ 自動変形（8秒待機）
- ✅ テーマ切り替え連動
- ✅ `prefers-reduced-motion` 対応
- ✅ レスポンシブレイアウト（横スクロールなし）

### 検証済み

```bash
✓ pnpm lint       # Biome - 56 files checked
✓ pnpm typecheck  # TypeScript strict - no errors
✓ pnpm test:unit  # 13 files / 102 tests passed
✓ pnpm build      # Next.js production build - success
✓ pnpm test:e2e   # Playwright - 23 tests passed
```

## 📋 チェックリスト

- [x] 新しいおもちゃのルート `/particle-morph` を追加
- [x] `src/toys/registry.ts` に「パーティクル・モーフィング」を登録
- [x] Three.js の依存関係を追加（`three` + `@types/three`）
- [x] 5種の形状生成ロジックを実装（決定的・テスト可能）
- [x] カスタムシェーダーを実装（staggered morph + repulsion + glow）
- [x] シーン管理・アニメーションループを実装
- [x] クリック／タップ／Space 操作を実装
- [x] ポインタ反発・視差効果を実装
- [x] 自動変形（約8秒）を実装
- [x] ライト／ダークテーマ連動を実装
- [x] WebGL非対応時のフォールバックを実装
- [x] `prefers-reduced-motion` 対応を実装
- [x] レスポンシブレイアウト対応
- [x] ユニットテスト追加（shapes, morph, palette, page）
- [x] E2Eテスト追加（journey, fallback, auto-advance, theme, a11y）
- [x] 全検証ゲートをパス（lint / typecheck / unit / build / e2e）
- [x] ローカル環境で動作確認済み

## 🎨 スクリーンショット

（実際のスクリーンショットがあれば追加してください）

---

**Relates to**: `specs/003-particle-morph/`

**Testing**: 手動テストは `pnpm dev` で `/particle-morph` にアクセスして確認できます
