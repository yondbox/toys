// アプリ内の localStorage アクセスを一手に引き受ける薄いラッパ。
// 消費者: テーマ設定(アプリ全体)と keisan-game の自己ベスト記録。
//
// - すべてのキーに接頭辞 `toys:` を付け、他のおもちゃ・他アプリの保存データと
//   名前空間で分離する (FR-031)。呼び出し側は接頭辞なしのキーを渡す。
// - プライベートブラウズや容量超過で localStorage が使えない場合や、保存値が
//   壊れている場合は、例外を投げずに null / 何もしない へフォールバックし、
//   プレイや表示を止めない (FR-032)。SSR(window なし)でも安全に null を返す。

const NAMESPACE = "toys:";

function namespacedKey(key: string): string {
  return `${NAMESPACE}${key}`;
}

export function readString(key: string): string | null {
  try {
    return window.localStorage.getItem(namespacedKey(key));
  } catch {
    return null;
  }
}

export function writeString(key: string, value: string): void {
  try {
    window.localStorage.setItem(namespacedKey(key), value);
  } catch {
    // 保存できない環境では記録・設定を諦め、動作は継続する (FR-032)。
  }
}

/**
 * JSON として保存した値を読み出す。パース結果が `isValid` を通らない値
 * (手で書き換えられた・別バージョンの形式など)は破損として null を返す。
 */
export function readJSON<T>(
  key: string,
  isValid: (value: unknown) => value is T,
): T | null {
  const raw = readString(key);
  if (raw === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeJSON(key: string, value: unknown): void {
  writeString(key, JSON.stringify(value));
}
