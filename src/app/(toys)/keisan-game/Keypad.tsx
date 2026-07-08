"use client";

// 画面テンキー。タッチ端末だけで答えを入力・修正・確定できるようにする (FR-007)。
// 各キーは 48px 四方以上を確保する (FR-008)。キーボード入力との対応は
// page.tsx の keydown リスナーが同じアクションへ写像する (FR-009)。

type KeypadProps = {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSubmit: () => void;
};

// 押した感を出すボタン: 下辺の濃い縁を押下時に薄くして沈ませる。
const keyBase =
  "flex min-h-12 items-center justify-center rounded-2xl border border-b-4 font-bold select-none touch-manipulation active:translate-y-0.5 active:border-b sm:min-h-14";
const digitKey = `${keyBase} border-zinc-200 border-b-zinc-300 bg-white text-2xl text-zinc-800 dark:border-zinc-700 dark:border-b-zinc-600 dark:bg-zinc-800 dark:text-zinc-100`;
const editKey = `${keyBase} border-zinc-200 border-b-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:border-b-zinc-600 dark:bg-zinc-800 dark:text-zinc-300`;

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

export function Keypad({
  onDigit,
  onBackspace,
  onClear,
  onSubmit,
}: KeypadProps) {
  // グリッドの自動配置で電卓レイアウトを作る:
  // 7 8 9 ⌫ / 4 5 6 ぜんぶけす / 1 2 3 OK(縦2) / 0(横3)
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
