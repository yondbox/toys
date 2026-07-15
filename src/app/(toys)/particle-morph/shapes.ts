export type ShapeId = "sphere" | "torusKnot" | "galaxy" | "wave" | "text";

export type Shape = {
  id: ShapeId;
  label: string;
  generate: (count: number, seed: number) => Float32Array;
};

export type TextShapeOptions = {
  text?: string;
  createCanvas?: () => HTMLCanvasElement | null;
};

export const PARTICLE_COUNT = 24_000;
export const BOUNDING_RADIUS = 3;

const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function normalizedCount(count: number): number {
  return Math.max(0, Math.floor(count));
}

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

function createDefaultCanvas(): HTMLCanvasElement | null {
  if (typeof document === "undefined") {
    return null;
  }
  if (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent)) {
    return null;
  }
  return document.createElement("canvas");
}

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

export const SHAPES: readonly Shape[] = [
  { id: "sphere", label: "きゅうたい", generate: generateSphereShape },
  { id: "torusKnot", label: "むすびめ", generate: generateTorusKnotShape },
  { id: "galaxy", label: "ぎんが", generate: generateGalaxyShape },
  { id: "wave", label: "なみ", generate: generateWaveShape },
  { id: "text", label: "もじ「あっ」", generate: generateTextShape },
];

export function getShape(shapeId: ShapeId): Shape {
  const shape = SHAPES.find((candidate) => candidate.id === shapeId);
  if (!shape) {
    throw new Error(`Unknown shape: ${shapeId}`);
  }
  return shape;
}
