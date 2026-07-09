"use client";

/**
 * 画面テンキーから親へ通知する入力操作。
 *
 * キーボード入力は `page.tsx` が同じ reducer action へ写像するため、このコンポーネントは
 * タッチ操作だけに責務を絞る。
 */
type KeypadProps = {
  /** 数字キーを押したときに、押された1桁を通知する。 */
  onDigit: (digit: string) => void;
  /** 1文字削除キーを押したときに通知する。 */
  onBackspace: () => void;
  /** 入力全消去キーを押したときに通知する。 */
  onClear: () => void;
  /** OK キーで現在の入力を確定するときに通知する。 */
  onSubmit: () => void;
};

/**
 * テンキー全体で共有するボタンの土台スタイル。
 *
 * 48px 以上のタッチターゲットと押下時の沈み込みをまとめ、数字キーと編集キーのサイズ差を防ぐ。
 */
const keyBase =
  "flex min-h-12 items-center justify-center rounded-2xl border border-b-4 font-bold select-none touch-manipulation active:translate-y-0.5 active:border-b sm:min-h-14";

/**
 * 数字キー用の強調スタイル。
 *
 * 入力の主操作なので背景を白系にして、編集キーより視認性を高くする。
 */
const digitKey = `${keyBase} border-zinc-200 border-b-zinc-300 bg-white text-2xl text-zinc-800 dark:border-zinc-700 dark:border-b-zinc-600 dark:bg-zinc-800 dark:text-zinc-100`;

/**
 * 削除・全消去キー用の控えめなスタイル。
 *
 * 数字入力との押し間違いを減らすため、同じサイズを保ちながら色だけ弱める。
 */
const editKey = `${keyBase} border-zinc-200 border-b-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:border-b-zinc-600 dark:bg-zinc-800 dark:text-zinc-300`;

/**
 * 1つの数字キーを描画する小さな部品。
 *
 * 10個の数字キーで data-testid とクリック動作を揃え、テストとアクセシビリティ上の差異を避ける。
 */
function DigitKey({
  digit,
  onDigit,
}: {
  digit: string;
  onDigit: (digit: string) => void;
}) {
  return (
    <button
      type="button"
      data-testid={`key-${digit}`}
      onClick={() => onDigit(digit)}
      className={digitKey}
    >
      {digit}
    </button>
  );
}

/**
 * 計算ゲーム用の画面テンキー。
 *
 * タッチ端末だけで答えを入力・修正・確定できるよう、数字・削除・全消去・OK を1画面に収める。
 */
export function Keypad({
  onDigit,
  onBackspace,
  onClear,
  onSubmit,
}: KeypadProps) {
  /**
   * グリッドの自動配置で作る電卓レイアウト。
   *
   * 7 8 9 ⌫ / 4 5 6 ぜんぶけす / 1 2 3 OK(縦2) / 0(横3) の順に置き、
   * 小さな画面でも主要キーが指で押しやすい配置にする。
   */
  return (
    <div
      data-testid="keypad"
      className="mx-auto grid w-full max-w-sm grid-cols-4 gap-1.5 sm:gap-2"
    >
      <DigitKey digit="7" onDigit={onDigit} />
      <DigitKey digit="8" onDigit={onDigit} />
      <DigitKey digit="9" onDigit={onDigit} />
      <button
        type="button"
        data-testid="key-backspace"
        aria-label="1もじけす"
        onClick={onBackspace}
        className={`${editKey} text-xl`}
      >
        ⌫
      </button>
      <DigitKey digit="4" onDigit={onDigit} />
      <DigitKey digit="5" onDigit={onDigit} />
      <DigitKey digit="6" onDigit={onDigit} />
      <button
        type="button"
        data-testid="key-clear"
        aria-label="ぜんぶけす"
        onClick={onClear}
        className={`${editKey} text-xs leading-tight`}
      >
        ぜんぶ
        <br />
        けす
      </button>
      <DigitKey digit="1" onDigit={onDigit} />
      <DigitKey digit="2" onDigit={onDigit} />
      <DigitKey digit="3" onDigit={onDigit} />
      <button
        type="button"
        data-testid="key-submit"
        onClick={onSubmit}
        className={`${keyBase} row-span-2 border-blue-700 border-b-blue-900 bg-blue-600 text-xl text-white dark:border-blue-500 dark:border-b-blue-800 dark:bg-blue-600`}
      >
        OK
      </button>
      <div className="col-span-3">
        <button
          type="button"
          data-testid="key-0"
          onClick={() => onDigit("0")}
          className={`${digitKey} w-full`}
        >
          0
        </button>
      </div>
    </div>
  );
}
