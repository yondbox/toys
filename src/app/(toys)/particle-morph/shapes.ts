/**
 * パーティクルで表現する造形の識別子。
 */
export type ShapeId = "sphere" | "torusKnot" | "galaxy" | "wave" | "text";

/**
 * 1 つの造形定義。
 */
export type Shape = {
  /** モーフィング順序や座標キャッシュのキーに使う安定 ID。 */
  id: ShapeId;
  /** UI に表示する日本語ラベル。E2E はこの文字列で巡回を確認する。 */
  label: string;
  /** 指定した粒子数と seed から x/y/z 座標配列を生成する。 */
  generate: (count: number, seed: number) => Float32Array;
};

/**
 * テキスト造形を生成するときの差し替え可能な依存。
 */
export type TextShapeOptions = {
  /** canvas に描画する文字列。未指定時は「あっ」を使う。 */
  text?: string;
  /** テストや非ブラウザ環境で Canvas 生成を差し替えるための factory。 */
  createCanvas?: () => HTMLCanvasElement | null;
};

/**
 * 1 造形あたりの粒子数。
 *
 * 24,000 はフルスクリーンでも密度を保ちつつ、DPR 上限 2 の renderer で操作できる負荷に収める値。
 */
export const PARTICLE_COUNT = 24_000;

/**
 * すべての形状が収まる想定半径。
 *
 * camera 距離と geometry の boundingSphere はこの値を前提にしているため、変更時は表示の見切れを確認する。
 */
export const BOUNDING_RADIUS = 3;

/** 円周率の 2 倍。角度計算で同じ値を再利用するための定数。 */
const TAU = Math.PI * 2;

/**
 * 球面上に粒子を偏りにくく配置する黄金角。
 */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * 再現性のある軽量な疑似乱数生成器を作る。
 *
 * @param seed - 32bit 符号なし整数として扱う seed。
 * @returns 0 以上 1 未満の値を返す関数。
 */
function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * 呼び出し側が渡した粒子数を配列生成に使える整数へ丸める。
 *
 * @param count - 任意の数値。負数や小数を許容する。
 * @returns 0 以上の整数。
 */
function normalizedCount(count: number): number {
  return Math.max(0, Math.floor(count));
}

/**
 * 黄金角配置で球体状の座標を生成する。
 *
 * @param count - 生成する粒子数。負数は 0、小数は切り捨てる。
 * @param seed - 微細な揺らぎの再現に使う seed。
 * @returns `count * 3` 要素の x/y/z 座標配列。
 */
export function generateSphereShape(count: number, seed: number): Float32Array {
  const particleCount = normalizedCount(count);
  const positions = new Float32Array(particleCount * 3);
  const rng = createRng(seed);
  const denominator = Math.max(1, particleCount - 1);

  for (let index = 0; index < particleCount; index++) {
    const y = 1 - (index / denominator) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = index * GOLDEN_ANGLE + rng() * 0.04;
    const radius = BOUNDING_RADIUS * (0.74 + rng() * 0.16);
    const offset = index * 3;

    positions[offset] = Math.cos(theta) * radiusAtY * radius;
    positions[offset + 1] = y * radius;
    positions[offset + 2] = Math.sin(theta) * radiusAtY * radius;
  }

  return positions;
}

/**
 * 結び目状のトーラス座標を生成する。
 *
 * @param count - 生成する粒子数。負数は 0、小数は切り捨てる。
 * @param seed - チューブ半径と微細な奥行き揺らぎの再現に使う seed。
 * @returns `count * 3` 要素の x/y/z 座標配列。
 */
export function generateTorusKnotShape(
  count: number,
  seed: number,
): Float32Array {
  const particleCount = normalizedCount(count);
  const positions = new Float32Array(particleCount * 3);
  const rng = createRng(seed);

  for (let index = 0; index < particleCount; index++) {
    const t = (index / Math.max(1, particleCount)) * TAU;
    const tubeAngle = rng() * TAU;
    const tubeRadius = 0.18 + rng() * 0.16;
    const knotRadius = 1.35 + 0.48 * Math.cos(3 * t);
    const offset = index * 3;

    positions[offset] =
      Math.cos(2 * t) * knotRadius + Math.cos(tubeAngle) * tubeRadius;
    positions[offset + 1] =
      Math.sin(2 * t) * knotRadius + Math.sin(tubeAngle) * tubeRadius;
    positions[offset + 2] = 0.58 * Math.sin(3 * t) + (rng() - 0.5) * 0.18;
  }

  return positions;
}

/**
 * 5 本腕の銀河状座標を生成する。
 *
 * @param count - 生成する粒子数。負数は 0、小数は切り捨てる。
 * @param seed - 腕の散らばりと奥行き揺らぎの再現に使う seed。
 * @returns `count * 3` 要素の x/y/z 座標配列。
 */
export function generateGalaxyShape(count: number, seed: number): Float32Array {
  const particleCount = normalizedCount(count);
  const positions = new Float32Array(particleCount * 3);
  const rng = createRng(seed);
  const armCount = 5;

  for (let index = 0; index < particleCount; index++) {
    const branch = index % armCount;
    const distance = Math.sqrt((index + rng()) / Math.max(1, particleCount));
    const angle =
      branch * (TAU / armCount) + distance * 5.8 + (rng() - 0.5) * 0.42;
    const radius = distance * 2.65;
    const offset = index * 3;

    positions[offset] = Math.cos(angle) * radius;
    positions[offset + 1] = Math.sin(angle) * radius;
    positions[offset + 2] = (rng() - 0.5) * 0.34 * (1 - distance);
  }

  return positions;
}

/**
 * 格子上に波面を持つ座標を生成する。
 *
 * @param count - 生成する粒子数。負数は 0、小数は切り捨てる。
 * @param seed - 波の位相を決める seed。
 * @returns `count * 3` 要素の x/y/z 座標配列。
 */
export function generateWaveShape(count: number, seed: number): Float32Array {
  const particleCount = normalizedCount(count);
  const positions = new Float32Array(particleCount * 3);
  const columns = Math.max(1, Math.ceil(Math.sqrt(particleCount)));
  const rows = Math.max(1, Math.ceil(particleCount / columns));
  const phase = (seed % 360) * (Math.PI / 180);

  for (let index = 0; index < particleCount; index++) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = (column / Math.max(1, columns - 1) - 0.5) * 3.8;
    const y = (row / Math.max(1, rows - 1) - 0.5) * 3.8;
    const z =
      Math.sin(x * 1.7 + phase) * 0.34 + Math.cos(y * 1.3 - phase) * 0.24;
    const offset = index * 3;

    positions[offset] = x;
    positions[offset + 1] = y;
    positions[offset + 2] = z;
  }

  return positions;
}

/**
 * ブラウザ実行時の既定 Canvas を作る。
 *
 * jsdom では Canvas 2D の実装が不足するため null を返し、テキスト造形を球体 fallback にする。
 *
 * @returns 利用可能な Canvas。非ブラウザまたは jsdom では null。
 */
function createDefaultCanvas(): HTMLCanvasElement | null {
  if (typeof document === "undefined") {
    return null;
  }
  if (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent)) {
    return null;
  }
  return document.createElement("canvas");
}

/**
 * 文字を Canvas に描き、不透明ピクセルの座標を抽出する。
 *
 * @param text - 描画する文字列。
 * @param createCanvas - Canvas factory。null や 2D context 不在を許容する。
 * @returns 抽出できたピクセル座標。描画できない場合や空の場合は null。
 */
function drawTextPixels(
  text: string,
  createCanvas: () => HTMLCanvasElement | null,
): Array<[number, number]> | null {
  const canvas = createCanvas();
  const context = canvas?.getContext("2d");
  if (!canvas || !context) {
    return null;
  }

  canvas.width = 240;
  canvas.height = 140;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "800 92px system-ui, sans-serif";
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 4);

  const pixels: Array<[number, number]> = [];
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y += 2) {
    for (let x = 0; x < canvas.width; x += 2) {
      const alpha = image.data[(y * canvas.width + x) * 4 + 3];
      if (alpha > 24) {
        pixels.push([x, y]);
      }
    }
  }

  return pixels.length > 0 ? pixels : null;
}

/**
 * Canvas で描いた文字のピクセルからテキスト造形の座標を生成する。
 *
 * Canvas が使えない環境では球体へ fallback する。SSR、jsdom、WebGL は使えるが 2D Canvas が
 * 使えないブラウザ拡張環境でもページを壊さないための契約。
 *
 * @param count - 生成する粒子数。負数は 0、小数は切り捨てる。
 * @param seed - ピクセル選択と微細な散らばりの再現に使う seed。
 * @param options - テキストや Canvas factory の差し替え。
 * @returns `count * 3` 要素の x/y/z 座標配列。
 */
export function generateTextShape(
  count: number,
  seed: number,
  options: TextShapeOptions = {},
): Float32Array {
  let pixels: Array<[number, number]> | null = null;
  try {
    pixels = drawTextPixels(
      options.text ?? "あっ",
      options.createCanvas ?? createDefaultCanvas,
    );
  } catch {
    pixels = null;
  }

  if (!pixels) {
    return generateSphereShape(count, seed);
  }

  const particleCount = normalizedCount(count);
  const positions = new Float32Array(particleCount * 3);
  const rng = createRng(seed);

  for (let index = 0; index < particleCount; index++) {
    const pixel = pixels[Math.floor(rng() * pixels.length)] ?? pixels[0];
    const offset = index * 3;
    const x = ((pixel[0] - 120) / 120) * 2.35 + (rng() - 0.5) * 0.035;
    const y = -((pixel[1] - 70) / 70) * 1.42 + (rng() - 0.5) * 0.035;

    positions[offset] = x;
    positions[offset + 1] = y;
    positions[offset + 2] = (rng() - 0.5) * 0.1;
  }

  return positions;
}

/**
 * 画面で巡回できる造形一覧。
 *
 * `morph.ts` の `SHAPE_SEQUENCE` と ID を一致させる必要がある。順序変更時は表示ラベルの E2E も更新する。
 */
export const SHAPES: readonly Shape[] = [
  { id: "sphere", label: "きゅうたい", generate: generateSphereShape },
  { id: "torusKnot", label: "むすびめ", generate: generateTorusKnotShape },
  { id: "galaxy", label: "ぎんが", generate: generateGalaxyShape },
  { id: "wave", label: "なみ", generate: generateWaveShape },
  { id: "text", label: "もじ「あっ」", generate: generateTextShape },
];

/**
 * 造形 ID から造形定義を取得する。
 *
 * @param shapeId - `SHAPES` に登録済みの ID。
 * @returns 対応する造形定義。
 * @throws 未登録の ID が渡された場合。
 */
export function getShape(shapeId: ShapeId): Shape {
  const shape = SHAPES.find((candidate) => candidate.id === shapeId);
  if (!shape) {
    throw new Error(`Unknown shape: ${shapeId}`);
  }
  return shape;
}
