// SONORA's single motion language. Every animated value in the scene (node
// position, scale, opacity, emphasis, edge reveal, camera) is a Tween eased with
// easeOutCubic. The UI layer uses the same curve through EASE.

export const EASE = [0.33, 1, 0.68, 1] as const;

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export const now = () => performance.now() / 1000;

export const DUR = {
  hover: 0.45,
  focus: 1.6,
  mode: 1.9,
  emerge: 1.7,
  camera: 2.2,
};

export class Tween {
  private from: number;
  private to: number;
  private start = 0;
  private dur = 0;
  value: number;

  constructor(v: number) {
    this.from = this.to = this.value = v;
  }

  get target() {
    return this.to;
  }

  /** Animate to a new target from wherever the value currently is. */
  set(to: number, dur: number, delay = 0, force = false) {
    if (!force && to === this.to && dur > 0) return;
    this.from = this.value;
    this.to = to;
    this.start = now() + delay;
    this.dur = dur;
    if (dur <= 0 && delay <= 0) this.value = to;
  }

  jump(v: number) {
    this.from = this.to = this.value = v;
    this.dur = 0;
  }

  update(t: number) {
    if (this.dur <= 0) {
      if (t >= this.start) this.value = this.to;
      return this.value;
    }
    const p = Math.min(1, Math.max(0, (t - this.start) / this.dur));
    this.value = this.from + (this.to - this.from) * easeOutCubic(p);
    return this.value;
  }

  get done() {
    return this.value === this.to;
  }
}

export class Tween3 {
  x: Tween;
  y: Tween;
  z: Tween;
  constructor(v: readonly [number, number, number]) {
    this.x = new Tween(v[0]);
    this.y = new Tween(v[1]);
    this.z = new Tween(v[2]);
  }
  set(v: readonly [number, number, number], dur: number, delay = 0) {
    // Retarget all axes together so the path stays a straight eased line.
    if (v[0] === this.x.target && v[1] === this.y.target && v[2] === this.z.target && dur > 0) return;
    this.x.set(v[0], dur, delay, true);
    this.y.set(v[1], dur, delay, true);
    this.z.set(v[2], dur, delay, true);
  }
  jump(v: readonly [number, number, number]) {
    this.x.jump(v[0]);
    this.y.jump(v[1]);
    this.z.jump(v[2]);
  }
  update(t: number) {
    this.x.update(t);
    this.y.update(t);
    this.z.update(t);
  }
}
