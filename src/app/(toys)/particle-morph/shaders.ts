import { DELAY_MAX } from "./morph";

/**
 * 粒子位置の補間、揺らぎ、ポインタ反発を GPU で計算する vertex shader。
 *
 * `DELAY_MAX` は CPU 側の進捗計算と同じ値を文字列へ埋め込み、ユニットテストで契約を確認できるようにする。
 */
export const vertexShader = /* glsl */ `
attribute vec3 aPositionFrom;
attribute vec3 aPositionTo;
attribute float aDelay;
attribute float aRandom;

uniform float uProgress;
uniform float uTime;
uniform float uPointSize;
uniform vec3 uPointer;
uniform float uRepelStrength;

varying float vProgress;
varying float vRandom;
varying float vDepth;

const float DELAY_MAX = ${DELAY_MAX.toFixed(1)};
const float PI = 3.141592653589793;

void main() {
  float localProgress = clamp((uProgress - aDelay) / (1.0 - DELAY_MAX), 0.0, 1.0);
  vec3 morphed = mix(aPositionFrom, aPositionTo, localProgress);
  float transitionEnergy = sin(localProgress * PI);
  vec3 swirlAxis = normalize(vec3(-morphed.y, morphed.x, 0.45));
  vec3 swirl = swirlAxis * transitionEnergy * (0.18 + aRandom * 0.28);
  vec3 breathing = normalize(morphed + vec3(0.001)) * sin(uTime * 0.6 + aRandom * 6.28318) * 0.025;
  vec3 finalPosition = morphed + swirl + breathing;
  vec3 pointerDelta = finalPosition - uPointer;
  float pointerDistance = length(pointerDelta.xy);
  float repel = smoothstep(1.15, 0.0, pointerDistance) * uRepelStrength;
  finalPosition += normalize(pointerDelta + vec3(0.001, 0.001, 0.08)) * repel * (0.42 + aRandom * 0.22);

  vec4 modelViewPosition = modelViewMatrix * vec4(finalPosition, 1.0);
  gl_Position = projectionMatrix * modelViewPosition;
  gl_PointSize = uPointSize * (1.0 + aRandom * 0.35) / max(0.2, -modelViewPosition.z);

  vProgress = localProgress;
  vRandom = aRandom;
  vDepth = clamp((-modelViewPosition.z - 4.0) / 5.0, 0.0, 1.0);
}
`;

/**
 * 円形粒子の core/halo とテーマ色の混色を行う fragment shader。
 *
 * 透明度がほぼ 0 の fragment は discard して、点群の四角い外枠が見えないようにする。
 */
export const fragmentShader = /* glsl */ `
precision mediump float;

uniform vec3 uColorInner;
uniform vec3 uColorOuter;

varying float vProgress;
varying float vRandom;
varying float vDepth;

void main() {
  vec2 centered = gl_PointCoord - vec2(0.5);
  float distanceFromCenter = length(centered);
  float core = smoothstep(0.5, 0.06, distanceFromCenter);
  float halo = smoothstep(0.5, 0.18, distanceFromCenter) * 0.34;
  float alpha = core + halo;

  if (alpha < 0.02) {
    discard;
  }

  vec3 color = mix(uColorOuter, uColorInner, core);
  color += vec3(0.12, 0.16, 0.22) * sin(vProgress * 3.14159) * (0.4 + vRandom);
  color = mix(color, uColorOuter, vDepth * 0.28);

  gl_FragColor = vec4(color, alpha);
}
`;
