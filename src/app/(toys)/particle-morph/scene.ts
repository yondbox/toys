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

/**
 * パーティクルシーンを DOM に接続するための入力。
 */
export type ParticleSceneOptions = {
  /** canvas を追加するホスト要素。サイズ計算にも使うため、レイアウト済みの要素を渡す。 */
  container: HTMLElement;
  /** 初期描画に使うテーマ。変更は `setTheme` で反映する。 */
  theme: Theme;
  /** true の場合、ポインタ反発と自動進行を止めて予期しない動きを抑える。 */
  reducedMotion: boolean;
  /** 現在造形のラベルが変わったときに呼ばれる。aria-live 表示の更新に使う。 */
  onShapeChange: (label: string) => void;
};

/**
 * React コンポーネントから操作する Three.js シーンの公開インターフェース。
 */
export type ParticleScene = {
  /** DOM に追加された描画 canvas。破棄後は参照してはならない。 */
  canvas: HTMLCanvasElement;
  /** 次の造形へ手動で遷移する。遷移中は false を返して多重開始を拒否する。 */
  morphToNext: (now?: number) => boolean;
  /** ポインタ座標を canvas ローカルの反発中心へ変換する。client 座標を渡す。 */
  movePointer: (clientX: number, clientY: number) => void;
  /** ポインタ反発とカメラ追従を自然に停止する。 */
  leavePointer: () => void;
  /** OS の reduced motion 変更を反映する。true では進行中の入力効果を即座に消す。 */
  setReducedMotion: (reducedMotion: boolean) => void;
  /** テーマ変更を背景色・粒子色・ブレンド方式へ反映する。 */
  setTheme: (theme: Theme) => void;
  /** ホスト要素の現在サイズに合わせて renderer と camera を更新する。 */
  resize: () => void;
  /** rAF・イベントリスナー・GPU リソースを解放する。複数回呼んでも安全。 */
  dispose: () => void;
};

/**
 * カメラの Z 位置。
 *
 * すべての造形を `BOUNDING_RADIUS` 付近に収める前提で、全体が初期表示に入る距離にしている。
 */
const CAMERA_Z = 8;

/**
 * renderer の最大 device pixel ratio。
 *
 * 高 DPR 端末で 24,000 粒子を描画しても GPU 負荷が跳ね上がりすぎないよう 2 で止める。
 */
const MAX_DPR = 2;

/**
 * フレーム間隔の上限（ミリ秒）。
 *
 * タブ復帰直後の巨大な timestamp 差で呼吸アニメーションが跳ばないよう、見た目用の時刻だけを制限する。
 */
const FRAME_DELTA_LIMIT_MS = 48;

/**
 * 各造形の粒子位置生成に使う基準 seed。
 *
 * 形状間の対応点を安定させ、テストと E2E のスクリーンショット差分を抑えるため固定する。
 */
const POSITION_SEED = 20260715;

/**
 * 造形 ID ごとに事前計算した x/y/z 座標配列。
 */
type ShapePositionMap = Map<ShapeId, Float32Array>;

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
 * 現在のブラウザで WebGL コンテキストを取得できるか判定する。
 *
 * @returns WebGL2 または WebGL が使える場合は true。
 */
function hasWebGLSupport(): boolean {
  const canvas = document.createElement("canvas");
  return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
}

/**
 * すべての造形の粒子座標を初期化時に生成する。
 *
 * モーフィング中に配列を生成すると GC がフレーム落ちの原因になるため、形状ごとに一度だけ作る。
 *
 * @returns 造形 ID をキーにした座標配列。
 */
function createShapePositions(): ShapePositionMap {
  return new Map(
    SHAPES.map((shape, index) => [
      shape.id,
      shape.generate(PARTICLE_COUNT, POSITION_SEED + index * 101),
    ]),
  );
}

/**
 * 指定した造形の座標配列を取得する。
 *
 * @param positionsByShape - `createShapePositions` で生成した座標キャッシュ。
 * @param shapeId - 取得する造形 ID。
 * @returns `PARTICLE_COUNT * 3` 要素の座標配列。
 * @throws `shapeId` に対応する座標が存在しない場合。
 */
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

/**
 * 粒子ごとの開始遅延属性を生成する。
 *
 * @returns 各粒子の遅延。値域は 0 以上 0.4 未満。
 */
function createDelayAttribute(): Float32Array {
  const rng = createRng(73);
  const delays = new Float32Array(PARTICLE_COUNT);
  for (let index = 0; index < delays.length; index++) {
    delays[index] = rng() * 0.4;
  }
  return delays;
}

/**
 * シェーダ上の揺らぎに使う粒子ごとの固定乱数を生成する。
 *
 * @returns 各粒子の乱数。値域は 0 以上 1 未満。
 */
function createRandomAttribute(): Float32Array {
  const rng = createRng(29);
  const randoms = new Float32Array(PARTICLE_COUNT);
  for (let index = 0; index < randoms.length; index++) {
    randoms[index] = rng();
  }
  return randoms;
}

/**
 * 既存の BufferAttribute 配列へ座標を書き戻す。
 *
 * GPU バッファを差し替えず中身だけ更新することで、モーフィング開始時の割り当てを避ける。
 *
 * @param attribute - `Float32Array` を内包する Three.js の属性。
 * @param positions - 属性と同じ長さの座標配列。
 */
function updateAttribute(
  attribute: THREE.BufferAttribute,
  positions: Float32Array,
) {
  (attribute.array as Float32Array).set(positions);
  attribute.needsUpdate = true;
}

/**
 * パーティクルシーンを生成する。
 *
 * WebGL 非対応や renderer 初期化失敗時は UI 側でフォールバック文言を出すため null を返す。
 *
 * @param options - DOM 接続先、テーマ、モーション設定、ラベル更新コールバック。
 * @returns 操作用のシーンインスタンス。初期化できない場合は null。
 */
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

/**
 * Three.js と requestAnimationFrame のライフサイクルを閉じ込める controller。
 *
 * React 側に mutable な描画状態を置くと毎フレーム再レンダリングが発生するため、ここで DOM と GPU
 * リソースの所有権を持つ。
 */
class ParticleSceneController implements ParticleScene {
  /** DOM に追加する renderer の canvas。 */
  readonly canvas: HTMLCanvasElement;

  /** すべての Three.js オブジェクトを載せるルートシーン。 */
  private readonly scene = new THREE.Scene();
  /** 造形全体を見下ろす透視カメラ。resize 時に aspect だけ更新する。 */
  private readonly camera = new THREE.PerspectiveCamera(46, 1, 0.1, 80);
  /** client 座標から z=0 平面上の pointer 位置を求めるための raycaster。 */
  private readonly raycaster = new THREE.Raycaster();
  /** ポインタイベントを正規化デバイス座標へ変換した一時ベクトル。 */
  private readonly pointerNdc = new THREE.Vector2();
  /** 粒子反発を計算する基準平面。造形は z=0 周辺に収める。 */
  private readonly pointerPlane = new THREE.Plane(
    new THREE.Vector3(0, 0, 1),
    0,
  );
  /** ポインタが canvas 外にあるときも uniform として安全に渡す退避位置。 */
  private readonly pointerWorld = new THREE.Vector3(99, 99, 0);
  /** GPU 描画を担当する renderer。dispose までこの controller が所有する。 */
  private readonly renderer: THREE.WebGLRenderer;
  /** 粒子の現在位置・遷移元・遷移先・遅延・乱数を保持する geometry。 */
  private readonly geometry = new THREE.BufferGeometry();
  /** CPU からシェーダへ毎フレーム渡す値。オブジェクト参照を固定して更新コストを抑える。 */
  private readonly uniforms = {
    uProgress: { value: 1 },
    uTime: { value: 0 },
    uPointSize: { value: 28 },
    uPointer: { value: new THREE.Vector3(99, 99, 0) },
    uRepelStrength: { value: 0 },
    uColorInner: { value: new THREE.Color("#ffffff") },
    uColorOuter: { value: new THREE.Color("#67e8f9") },
  };
  /** パーティクル専用シェーダ。テーマ変更時は blending だけ切り替える。 */
  private readonly material = new THREE.ShaderMaterial({
    uniforms: this.uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  /** シーンに追加する点群オブジェクト。geometry と material は個別に破棄する。 */
  private readonly points: THREE.Points;
  /** 各造形の座標キャッシュ。モーフィング開始時に BufferAttribute へコピーする。 */
  private readonly positionsByShape = createShapePositions();
  /** 現在造形と次造形を持つ巡回状態。 */
  private sequence: ShapeSequence = createShapeSequence();
  /** 現在のモーフィング進行状態。idle か morphing のどちらか。 */
  private transition: MorphTransition = createIdleTransition();
  /** 自動進行の待機状態。手動操作やポインタ操作で基準時刻を更新する。 */
  private autoAdvance: AutoAdvance = createAutoAdvance(performance.now());
  /** 現在予約している requestAnimationFrame の ID。 */
  private frameId = 0;
  /** dispose 済みかどうか。二重破棄と破棄後 render を防ぐ。 */
  private disposed = false;
  /** 見た目用時刻の前フレーム値。タブ復帰時の跳びを抑える。 */
  private lastFrameAt: number | null = null;
  /** ポインタが canvas 上で有効かどうか。reduced motion 時は false に固定する。 */
  private pointerActive = false;
  /** シェーダへ渡す反発強度。フレームごとに補間して急な跳ねを避ける。 */
  private repelStrength = 0;
  /** ポインタ位置から求めたカメラ X 方向の追従目標。 */
  private cameraTargetX = 0;
  /** ポインタ位置から求めたカメラ Y 方向の追従目標。 */
  private cameraTargetY = 0;
  /** OS やブラウザの reduced motion 設定。入力効果と自動進行の抑制に使う。 */
  private reducedMotion: boolean;

  /**
   * renderer、geometry、初期属性、イベントをまとめて準備する。
   *
   * @param options - DOM 接続先と初期表示設定。constructor 中で canvas を container に追加する。
   */
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

  /**
   * ユーザー操作として次の造形へ遷移する。
   *
   * @param now - テストで時刻を固定するための任意時刻。省略時は `performance.now()`。
   * @returns 遷移を開始できた場合は true。すでに遷移中なら false。
   */
  morphToNext = (now = performance.now()): boolean => {
    this.autoAdvance = recordInteraction(this.autoAdvance, now);
    return this.startMorph(now);
  };

  /**
   * GPU 属性を次の造形へ差し替え、モーフィングを開始する。
   *
   * @param now - 遷移開始時刻（ミリ秒）。
   * @returns 開始できた場合は true。遷移中は false。
   */
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

  /**
   * 現在時刻へ遷移状態と shader uniform を同期する。
   *
   * @param now - `performance.now()` と同じ時刻系の現在時刻（ミリ秒）。
   */
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

  /**
   * ポインタの client 座標を Three.js ワールド座標へ変換し、反発とカメラ追従を有効化する。
   *
   * @param clientX - PointerEvent の clientX。
   * @param clientY - PointerEvent の clientY。
   */
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

  /**
   * ポインタ離脱時に入力効果を停止する。
   */
  leavePointer = () => {
    this.autoAdvance = recordInteraction(this.autoAdvance, performance.now());
    this.pointerActive = false;
    this.cameraTargetX = 0;
    this.cameraTargetY = 0;
  };

  /**
   * reduced motion 設定を反映する。
   *
   * @param reducedMotion - true の場合、現在の反発効果を即座にリセットする。
   */
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

  /**
   * テーマに合わせて背景色、粒子色、ブレンド方式を更新する。
   *
   * @param theme - `resolvePalette` が扱うアプリテーマ。
   */
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

  /**
   * ホスト要素の現在サイズへ renderer と camera を合わせる。
   *
   * container がまだ 0px の場合でも canvas が消えないよう、1px 以上へ丸める。
   */
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

  /**
   * アニメーション、DOM、GPU リソースを解放する。
   *
   * React Strict Mode の再マウントでも安全にするため、二重呼び出しは無視する。
   */
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

  /**
   * requestAnimationFrame から呼ばれる描画ループ。
   *
   * @param timestamp - rAF が渡す高精度時刻（ミリ秒）。自動進行判定と見た目用時刻の両方に使う。
   */
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
