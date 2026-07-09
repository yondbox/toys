/**
 * このアプリが localStorage に保存するキーの接頭辞。
 *
 * すべての呼び出し側に共通で付け、他のおもちゃや外部アプリの保存値と衝突しないようにする。
 */
const NAMESPACE = "toys:";

/**
 * 呼び出し側の論理キーを localStorage 上の実キーへ変換する。
 *
 * namespace の付け忘れを防ぐため、公開関数は必ずこの関数を通してアクセスする。
 */
function namespacedKey(key: string): string {
  return `${NAMESPACE}${key}`;
}

/**
 * 文字列値を localStorage から読み出す。
 *
 * プライベートブラウズや SSR 相当の環境で例外が出ても、ゲームやテーマ表示を止めないため
 * `null` へフォールバックする。
 */
export function readString(key: string): string | null {
  try {
    return window.localStorage.getItem(namespacedKey(key));
  } catch {
    return null;
  }
}

/**
 * 文字列値を localStorage へ保存する。
 *
 * 容量超過や storage 無効化はユーザー操作を止めるほど重大ではないため、例外は握りつぶす。
 */
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
 *
 * 呼び出し側が型ガードを渡す設計にし、共有 storage 層が特定機能の保存形式に依存しないようにする。
 */
export function readJSON<T>(
  key: string,
  isValid: (value: unknown) => value is T,
): T | null {
  /** namespace 付きキーから読んだ未パースの保存値。未保存・読み出し失敗は null。 */
  const raw = readString(key);
  if (raw === null) {
    return null;
  }
  try {
    /** JSON.parse の戻り値は信用せず、必ず呼び出し側の型ガードを通す。 */
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * 任意の値を JSON 文字列として localStorage へ保存する。
 *
 * 保存可否の例外処理は `writeString` に集約し、呼び出し側は失敗時も通常どおり処理を続ける。
 */
export function writeJSON(key: string, value: unknown): void {
  writeString(key, JSON.stringify(value));
}
