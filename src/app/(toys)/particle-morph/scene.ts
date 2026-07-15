import * as THREE from "three";
import type { Theme } from "@/lib/theme";
import {
  type AutoAdvance,
  advanceShapeSequence,
  createAutoAdvance,
  createIdleTransition,
  createShapeSequence,
  evaluateAutoAdvance,
  type MorphTransition,
  recordInteraction,
  requestMorph,
  type ShapeSequence,
  updateMorphTransition,
} from "./morph";
import { resolvePalette } from "./palette";
import { fragmentShader, vertexShader } from "./shaders";
import {
  BOUNDING_RADIUS,
  PARTICLE_COUNT,
  SHAPES,
  type ShapeId,
} from "./shapes";

export type ParticleSceneOptions = {
  container: HTMLElement;
  theme: Theme;
  reducedMotion: boolean;
  onShapeChange: (label: string) => void;
};

export type ParticleScene = {
  canvas: HTMLCanvasElement;
  morphToNext: (now?: number) => boolean;
  movePointer: (clientX: number, clientY: number) => void;
  leavePointer: () => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  setTheme: (theme: Theme) => void;
  resize: () => void;
  dispose: () => void;
};

const CAMERA_Z = 8;
const MAX_DPR = 2;
const FRAME_DELTA_LIMIT_MS = 48;
const POSITION_SEED = 20260715;

type ShapePositionMap = Map<ShapeId, Float32Array>;

function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function hasWebGLSupport(): boolean {
  const canvas = document.createElement("canvas");
  return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
}

function createShapePositions(): ShapePositionMap {
  return new Map(
    SHAPES.map((shape, index) => [
      shape.id,
      shape.generate(PARTICLE_COUNT, POSITION_SEED + index * 101),
    ]),
  );
}

function positionFor(
  positionsByShape: ShapePositionMap,
  shapeId: ShapeId,
): Float32Array {
  const positions = positionsByShape.get(shapeId);
  if (!positions) {
    throw new Error(`Missing positions for shape: ${shapeId}`);
  }
  return positions;
}

function createDelayAttribute(): Float32Array {
  const rng = createRng(73);
  const delays = new Float32Array(PARTICLE_COUNT);
  for (let index = 0; index < delays.length; index++) {
    delays[index] = rng() * 0.4;
  }
  return delays;
}

function createRandomAttribute(): Float32Array {
  const rng = createRng(29);
  const randoms = new Float32Array(PARTICLE_COUNT);
  for (let index = 0; index < randoms.length; index++) {
    randoms[index] = rng();
  }
  return randoms;
}

function updateAttribute(
  attribute: THREE.BufferAttribute,
  positions: Float32Array,
) {
  (attribute.array as Float32Array).set(positions);
  attribute.needsUpdate = true;
}

export function createParticleScene(
  options: ParticleSceneOptions,
): ParticleScene | null {
  if (!hasWebGLSupport()) {
    return null;
  }

  try {
    return new ParticleSceneController(options);
  } catch {
    return null;
  }
}

class ParticleSceneController implements ParticleScene {
  readonly canvas: HTMLCanvasElement;

  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(46, 1, 0.1, 80);
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2();
  private readonly pointerPlane = new THREE.Plane(
    new THREE.Vector3(0, 0, 1),
    0,
  );
  private readonly pointerWorld = new THREE.Vector3(99, 99, 0);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly geometry = new THREE.BufferGeometry();
  private readonly uniforms = {
    uProgress: { value: 1 },
    uTime: { value: 0 },
    uPointSize: { value: 28 },
    uPointer: { value: new THREE.Vector3(99, 99, 0) },
    uRepelStrength: { value: 0 },
    uColorInner: { value: new THREE.Color("#ffffff") },
    uColorOuter: { value: new THREE.Color("#67e8f9") },
  };
  private readonly material = new THREE.ShaderMaterial({
    uniforms: this.uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  private readonly points: THREE.Points;
  private readonly positionsByShape = createShapePositions();
  private sequence: ShapeSequence = createShapeSequence();
  private transition: MorphTransition = createIdleTransition();
  private autoAdvance: AutoAdvance = createAutoAdvance(performance.now());
  private frameId = 0;
  private disposed = false;
  private lastFrameAt: number | null = null;
  private pointerActive = false;
  private repelStrength = 0;
  private cameraTargetX = 0;
  private cameraTargetY = 0;
  private reducedMotion: boolean;

  constructor(private readonly options: ParticleSceneOptions) {
    this.reducedMotion = options.reducedMotion;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.canvas = this.renderer.domElement;
    this.canvas.setAttribute("aria-label", "パーティクル・モーフィングの描画");
    this.canvas.style.display = "block";
    this.canvas.style.height = "100%";
    this.canvas.style.width = "100%";

    this.setTheme(this.options.theme);
    this.camera.position.set(0, 0, CAMERA_Z);
    this.camera.lookAt(0, 0, 0);

    const initialPositions = positionFor(
      this.positionsByShape,
      this.sequence.current.id,
    );
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(Float32Array.from(initialPositions), 3),
    );
    this.geometry.setAttribute(
      "aPositionFrom",
      new THREE.BufferAttribute(Float32Array.from(initialPositions), 3),
    );
    this.geometry.setAttribute(
      "aPositionTo",
      new THREE.BufferAttribute(Float32Array.from(initialPositions), 3),
    );
    this.geometry.setAttribute(
      "aDelay",
      new THREE.BufferAttribute(createDelayAttribute(), 1),
    );
    this.geometry.setAttribute(
      "aRandom",
      new THREE.BufferAttribute(createRandomAttribute(), 1),
    );
    this.geometry.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(0, 0, 0),
      BOUNDING_RADIUS + 1,
    );

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
    this.options.container.appendChild(this.canvas);
    this.options.onShapeChange(this.sequence.current.label);
    this.resize();
    window.addEventListener("resize", this.resize);
    this.frameId = window.requestAnimationFrame(this.render);
  }

  morphToNext = (now = performance.now()): boolean => {
    this.autoAdvance = recordInteraction(this.autoAdvance, now);
    return this.startMorph(now);
  };

  private startMorph(now: number): boolean {
    this.refreshTransition(now);
    const request = requestMorph(this.transition, now);
    if (!request.accepted) {
      return false;
    }

    const nextSequence = advanceShapeSequence(this.sequence);
    const fromPositions = positionFor(
      this.positionsByShape,
      this.sequence.current.id,
    );
    const toPositions = positionFor(
      this.positionsByShape,
      nextSequence.current.id,
    );

    updateAttribute(
      this.geometry.getAttribute("aPositionFrom") as THREE.BufferAttribute,
      fromPositions,
    );
    updateAttribute(
      this.geometry.getAttribute("aPositionTo") as THREE.BufferAttribute,
      toPositions,
    );
    updateAttribute(
      this.geometry.getAttribute("position") as THREE.BufferAttribute,
      toPositions,
    );

    this.sequence = nextSequence;
    this.transition = request.transition;
    this.uniforms.uProgress.value = 0;
    this.options.onShapeChange(this.sequence.current.label);
    return true;
  }

  private refreshTransition(now: number) {
    if (this.transition.phase !== "morphing") {
      return;
    }

    const nextTransition = updateMorphTransition(this.transition, now);
    if (nextTransition.phase === "idle") {
      this.uniforms.uProgress.value = 1;
    } else {
      this.uniforms.uProgress.value = nextTransition.progress;
    }
    this.transition = nextTransition;
  }

  movePointer = (clientX: number, clientY: number) => {
    this.autoAdvance = recordInteraction(this.autoAdvance, performance.now());
    if (this.reducedMotion) {
      this.pointerActive = false;
      this.cameraTargetX = 0;
      this.cameraTargetY = 0;
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    this.pointerNdc.set(x, y);
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    this.raycaster.ray.intersectPlane(this.pointerPlane, this.pointerWorld);
    this.uniforms.uPointer.value.copy(this.pointerWorld);
    this.pointerActive = true;
    this.cameraTargetX = x * 0.32;
    this.cameraTargetY = y * 0.22;
  };

  leavePointer = () => {
    this.autoAdvance = recordInteraction(this.autoAdvance, performance.now());
    this.pointerActive = false;
    this.cameraTargetX = 0;
    this.cameraTargetY = 0;
  };

  setReducedMotion = (reducedMotion: boolean) => {
    this.reducedMotion = reducedMotion;
    if (!reducedMotion) {
      return;
    }

    this.pointerActive = false;
    this.cameraTargetX = 0;
    this.cameraTargetY = 0;
    this.repelStrength = 0;
    this.uniforms.uRepelStrength.value = 0;
  };

  setTheme = (theme: Theme) => {
    const palette = resolvePalette(theme);
    this.scene.background = new THREE.Color(palette.background);
    this.uniforms.uColorInner.value.set(palette.colorInner);
    this.uniforms.uColorOuter.value.set(palette.colorOuter);
    this.material.blending =
      palette.blending === "additive"
        ? THREE.AdditiveBlending
        : THREE.NormalBlending;
    this.material.needsUpdate = true;
  };

  resize = () => {
    const width = Math.max(
      1,
      this.options.container.clientWidth || window.innerWidth,
    );
    const height = Math.max(
      1,
      this.options.container.clientHeight || window.innerHeight,
    );
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, MAX_DPR),
    );
    this.renderer.setSize(width, height, false);
  };

  dispose = () => {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    window.cancelAnimationFrame(this.frameId);
    window.removeEventListener("resize", this.resize);
    this.options.container.removeChild(this.canvas);
    this.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
  };

  private render = (timestamp: number) => {
    if (this.disposed) {
      return;
    }

    const animationNow =
      this.lastFrameAt === null
        ? timestamp
        : Math.min(timestamp, this.lastFrameAt + FRAME_DELTA_LIMIT_MS);
    this.lastFrameAt = animationNow;
    this.uniforms.uTime.value = animationNow / 1000;

    this.refreshTransition(timestamp);

    const targetStrength = this.pointerActive && !this.reducedMotion ? 1 : 0;
    const autoAdvance = evaluateAutoAdvance(
      this.autoAdvance,
      this.transition,
      timestamp,
      this.reducedMotion,
    );
    this.autoAdvance = autoAdvance.autoAdvance;
    if (autoAdvance.shouldAdvance) {
      this.startMorph(timestamp);
    }
    this.repelStrength += (targetStrength - this.repelStrength) * 0.12;
    this.uniforms.uRepelStrength.value = this.repelStrength;
    this.camera.position.x +=
      (this.cameraTargetX - this.camera.position.x) * 0.06;
    this.camera.position.y +=
      (this.cameraTargetY - this.camera.position.y) * 0.06;
    this.camera.lookAt(0, 0, 0);

    this.points.rotation.y += 0.0016;
    this.points.rotation.x = Math.sin(animationNow * 0.00018) * 0.08;
    this.renderer.render(this.scene, this.camera);
    this.frameId = window.requestAnimationFrame(this.render);
  };
}
