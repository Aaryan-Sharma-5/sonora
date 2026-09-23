// GLSL for SONORA's celestial objects. All materials use premultiplied
// additive blending so light accumulates like light, never like paint.

export const billboardVertex = /* glsl */ `
  uniform float uSize;
  uniform float uNearClamp;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    // Up close, bodies stop growing: stars stay points of light instead of flooding the frame.
    float near = uNearClamp > 0.0 ? clamp(-mv.z / uNearClamp, 0.5, 1.0) : 1.0;
    mv.xy += position.xy * uSize * near;
    gl_Position = projectionMatrix * mv;
  }
`;

// uKind: 0 artist star, 1 genre body, 2 trait ring, 3 discovery.
export const nodeFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uGlow;
  uniform float uKind;
  uniform float uTime;
  uniform float uSeed;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float d = length(p);
    vec3 col = uColor;
    float a = 0.0;

    if (uKind < 0.5) {
      float core = exp(-d * d * 420.0);
      float inner = exp(-d * d * 55.0) * 0.5;
      float halo = exp(-d * 6.5) * 0.2 * (1.0 + uGlow * 1.6);
      float sx = exp(-abs(p.y) * 120.0) * exp(-abs(p.x) * 4.2);
      float sy = exp(-abs(p.x) * 120.0) * exp(-abs(p.y) * 4.2);
      float spikes = (sx + sy) * (0.06 + 0.55 * uGlow);
      float twinkle = 0.93 + 0.07 * sin(uTime * 1.2 + uSeed * 40.0);
      col = mix(uColor, vec3(1.0), clamp(core * 1.5 + inner * 0.5, 0.0, 1.0));
      a = (core * 1.6 + inner + halo + spikes) * twinkle;
    } else if (uKind < 1.5) {
      float ang = atan(p.y, p.x);
      float wob = 0.78 + 0.14 * sin(ang * 2.0 + uSeed * 20.0 + uTime * 0.06) + 0.08 * sin(ang * 5.0 - uSeed * 13.0);
      vec2 q = p * vec2(1.0 + 0.25 * sin(uSeed * 31.0), 1.0 - 0.2 * cos(uSeed * 17.0));
      float cloud = exp(-dot(q, q) * 5.5 / wob) * 0.12;
      float veil = exp(-d * 2.8) * 0.035;
      float core = exp(-d * d * 900.0) * 0.4;
      a = (cloud + veil) * (1.0 + uGlow * 1.2) + core;
      col = mix(uColor, vec3(1.0), core);
    } else if (uKind < 2.5) {
      float ring = exp(-pow((d - 0.34) * 34.0, 2.0)) * 0.5 * uGlow;
      float dotc = exp(-d * d * 520.0) * 0.95;
      float inner = exp(-d * d * 60.0) * 0.16;
      float halo = exp(-d * 7.0) * 0.06 * (1.0 + uGlow * 3.0);
      col = mix(uColor, vec3(1.0), dotc * 0.5);
      a = ring + dotc + inner + halo;
    } else {
      float core = exp(-d * d * 380.0);
      float inner = exp(-d * d * 40.0) * 0.35;
      float halo = exp(-d * 5.5) * 0.16 * (1.0 + uGlow);
      float ring = exp(-pow((d - 0.36 - 0.02 * sin(uTime * 0.8 + uSeed * 9.0)) * 40.0, 2.0)) * (0.05 + 0.12 * uGlow);
      col = mix(uColor, vec3(1.0), clamp(core * 1.2, 0.0, 1.0));
      a = core * 1.4 + inner + halo + ring;
    }

    a *= uOpacity * smoothstep(1.0, 0.75, d);
    gl_FragColor = vec4(col * a, a);
  }
`;

export const youFragment = /* glsl */ `
  uniform float uOpacity;
  uniform float uTime;
  uniform float uGlow;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float d = length(p);
    // A slow, six-second breath.
    float pulse = 0.5 + 0.5 * sin(uTime * 1.047);
    float core = exp(-d * d * 1400.0);
    float bloom = exp(-d * d * 110.0) * 0.55;
    float halo = exp(-d * 4.2) * (0.2 + 0.05 * pulse) * (1.0 + uGlow * 0.6);
    float wide = exp(-d * 1.6) * 0.05;
    float ring = exp(-pow((d - 0.5 - 0.012 * pulse) * 40.0, 2.0)) * (0.045 + 0.02 * pulse);
    vec3 warm = vec3(0.98, 0.97, 0.95);
    vec3 blue = vec3(0.478, 0.655, 1.0);
    vec3 col = warm * (core * 2.2 + bloom) + blue * (halo + wide + ring);
    float a = clamp(core * 2.2 + bloom + halo + wide + ring, 0.0, 1.0);
    float fade = smoothstep(1.0, 0.7, d) * uOpacity;
    gl_FragColor = vec4(col * fade, a * fade);
  }
`;

export const orbitVertex = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uPixelRatio;
  attribute float aRadius;
  attribute float aSpeed;
  attribute float aPhase;
  attribute float aTilt;
  attribute float aSize;
  varying float vAlpha;
  void main() {
    float ang = aPhase + uTime * aSpeed;
    vec3 p = vec3(cos(ang) * aRadius, 0.0, sin(ang) * aRadius);
    float c = cos(aTilt);
    float s = sin(aTilt);
    p = vec3(p.x, p.z * s, p.z * c);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (40.0 / -mv.z);
    vAlpha = uOpacity * (0.25 + 0.75 * fract(aPhase * 7.31));
  }
`;

export const pointFragment = /* glsl */ `
  varying float vAlpha;
  uniform vec3 uColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a = a * a * vAlpha;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

export const starVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uNear;
  attribute float aSize;
  attribute float aBright;
  attribute float aPhase;
  attribute vec3 aColor;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = uNear > 0.5 ? aSize * (60.0 / -mv.z) : aSize;
    gl_PointSize = max(size * uPixelRatio, 1.0);
    vAlpha = aBright * (0.82 + 0.18 * sin(uTime * (0.4 + aPhase * 0.6) + aPhase * 30.0));
    vColor = aColor;
  }
`;

export const starFragment = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d) * vAlpha;
    gl_FragColor = vec4(vColor * a, a);
  }
`;

export const nebulaFragment = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uSeed;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      v += amp * noise(p);
      p = p * 2.03 + vec2(1.7, 9.2);
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float d = length(p * vec2(0.8, 1.15));
    float n = fbm(p * 2.4 + uSeed + vec2(uTime * 0.012, -uTime * 0.008));
    float n2 = fbm(p * 5.0 - uSeed * 1.7 + uTime * 0.01);
    float mask = exp(-d * d * 2.6) * smoothstep(1.0, 0.55, length(p));
    float density = smoothstep(0.38, 0.9, n) * mask + smoothstep(0.55, 0.95, n2) * mask * 0.35;
    vec3 violet = vec3(0.655, 0.545, 0.98);
    vec3 magenta = vec3(0.91, 0.475, 0.976);
    vec3 col = mix(violet, magenta, smoothstep(0.4, 0.8, n2));
    float a = density * uIntensity;
    gl_FragColor = vec4(col * a, a);
  }
`;

export const lineVertex = /* glsl */ `
  attribute float aT;
  attribute float aAlpha;
  attribute float aReveal;
  attribute vec3 aColor;
  varying float vT;
  varying float vAlpha;
  varying float vReveal;
  varying vec3 vColor;
  void main() {
    vT = aT;
    vAlpha = aAlpha;
    vReveal = aReveal;
    vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const lineFragment = /* glsl */ `
  varying float vT;
  varying float vAlpha;
  varying float vReveal;
  varying vec3 vColor;
  void main() {
    if (vT > vReveal || vAlpha < 0.002) discard;
    // Lines dissolve into the bodies they connect instead of touching them.
    float ends = smoothstep(0.0, 0.16, vT) * smoothstep(1.0, 0.84, vT);
    // A brighter leading edge while the connection draws itself.
    float head = vReveal < 0.999 ? exp(-pow((vReveal - vT) * 18.0, 2.0)) * 0.8 : 0.0;
    float a = vAlpha * (0.15 + 0.85 * ends) + head * vAlpha;
    gl_FragColor = vec4(vColor * a, a);
  }
`;
