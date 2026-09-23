"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { nodeAnims } from "@/lib/choreo";
import { DUR, Tween3, now } from "@/lib/motion";
import { YOU_ID, type V3 } from "@/lib/layout";
import { useSonora, type SonoraState } from "@/lib/store";

const UP = new THREE.Vector3(0, 1, 0);
const ELEVATION = THREE.MathUtils.degToRad(35);

// Landing: the universe sits to the right of the copy, seen from far away.
const LANDING = { pos: [-11, 25, 56] as V3, target: [-16.5, -1, 1] as V3 };

/**
 * The resting view of the whole universe. By default it keeps the current
 * azimuth; after a fresh build it turns so the uncharted sector sits at the
 * upper right of the frame, visible but at the edge.
 */
function overview(camera: THREE.Camera, s: SonoraState, faceSector = false) {
  const az =
    faceSector && s.layout ? -s.layout.sectorAngle - 0.75 : Math.atan2(camera.position.x, camera.position.z);
  // Aim slightly toward the near side, lifting the disc clear of the controls at the bottom.
  const lift = 3;
  const at = (dist: number) => ({
    pos: [Math.sin(az) * (Math.cos(ELEVATION) * dist + lift), Math.sin(ELEVATION) * dist, Math.cos(az) * (Math.cos(ELEVATION) * dist + lift)] as V3,
    target: [Math.sin(az) * lift, 0, Math.cos(az) * lift] as V3,
  });
  let dist = Math.max(38, (s.layout?.radius ?? 20) * 2.2);
  let view = at(dist);
  // A large universe, or a star that lands on the near side, can reach the controls.
  // Pull back only as far as it takes for every artist to clear the frame.
  for (let i = 0; i < 8 && !artistsFit(view, camera, s); i++) view = at((dist *= 1.05));
  return view;
}

const probe = new THREE.PerspectiveCamera();
const pv = new THREE.Vector3();

/** Does every artist (and its label, to the right) sit inside the frame, above the controls band? */
function artistsFit(view: { pos: V3; target: V3 }, camera: THREE.Camera, s: SonoraState) {
  if (!s.layout || !(camera instanceof THREE.PerspectiveCamera)) return true;
  probe.copy(camera);
  probe.position.set(...view.pos);
  probe.lookAt(...view.target);
  probe.updateMatrixWorld();
  return s.layout.nodes.every((n) => {
    if (n.kind !== "artist") return true;
    pv.set(...n.pos).project(probe);
    return pv.x > -0.86 && pv.x < 0.8 && pv.y > -0.76 && pv.y < 0.84;
  });
}

// The idle drift keeps OrbitControls' old auto-rotate pace (0.22), in radians per second.
const DRIFT_SPEED = ((2 * Math.PI) / 60) * 0.22;
const DRIFT_STEP = THREE.MathUtils.degToRad(5);

/**
 * How far the current view can turn either way around its target while every
 * artist stays inside the frame and clear of the controls. The drift sways
 * within this range instead of carrying stars under the UI.
 */
function driftRange(camera: THREE.Camera, target: THREE.Vector3, s: SonoraState): [number, number] {
  const view = (th: number) => ({
    pos: camera.position.clone().sub(target).applyAxisAngle(UP, th).add(target).toArray() as V3,
    target: target.toArray() as V3,
  });
  if (!artistsFit(view(0), camera, s)) return [0, 0];
  const reach = (dir: number) => {
    let th = 0;
    while (Math.abs(th) < Math.PI && artistsFit(view(th + dir * DRIFT_STEP), camera, s)) th += dir * DRIFT_STEP;
    return th;
  };
  return [reach(-1), reach(1)];
}

/** Frame a node with the universe behind it, leaving room for the panel on the right. */
function focusOn(id: string, camera: THREE.Camera, s: SonoraState) {
  const n = s.layout?.byId.get(id);
  const a = nodeAnims.get(id);
  if (!n || !a) return null;
  const p = new THREE.Vector3(a.pos.x.target, a.pos.y.target, a.pos.z.target);

  if (id === YOU_ID) {
    const o = overview(camera, s);
    const v = new THREE.Vector3(...o.pos).multiplyScalar(0.62);
    const fwd = v.clone().negate().normalize();
    const right = new THREE.Vector3().crossVectors(fwd, UP).normalize().multiplyScalar(5);
    return { pos: v.add(right).toArray() as V3, target: right.toArray() as V3 };
  }

  // Stand outside the object, looking back toward YOU, so its neighbourhood
  // fills the frame behind it.
  const out = new THREE.Vector3(p.x, 0, p.z);
  if (out.lengthSq() < 1e-3) out.set(camera.position.x, 0, camera.position.z);
  out.normalize();
  const look = p.clone().lerp(new THREE.Vector3(), 0.08);
  const dist = n.kind === "genre" ? 27 : n.kind === "trait" ? 20 : 26;
  // Discovery is seen from the known side, looking out into the uncharted region.
  const dir = out.clone().multiplyScalar(n.kind === "discovery" ? -0.8 : 0.8).addScaledVector(UP, 0.62).normalize();
  const pos = look.clone().addScaledVector(dir, dist);
  const fwd = look.clone().sub(pos).normalize();
  // Shift the view so the object sits left of the detail panel.
  const right = new THREE.Vector3().crossVectors(fwd, UP).normalize().multiplyScalar(dist * 0.2);
  return { pos: pos.add(right).toArray() as V3, target: look.add(right).toArray() as V3 };
}

/** Frame every node on a connection path, from the current side of the universe. */
function framePath(ids: string[], camera: THREE.Camera) {
  const pts = ids.map((id) => nodeAnims.get(id)).filter((a): a is NonNullable<typeof a> => !!a).map((a) => new THREE.Vector3(a.pos.x.target, a.pos.y.target, a.pos.z.target));
  const center = pts.reduce((c, p) => c.add(p), new THREE.Vector3()).divideScalar(Math.max(1, pts.length));
  const span = Math.max(10, ...pts.map((p) => p.distanceTo(center)));
  const az = Math.atan2(camera.position.x - center.x, camera.position.z - center.z);
  // Higher and further than a single focus, so the near end of the path clears the controls.
  const dist = span * 3.1;
  const elev = THREE.MathUtils.degToRad(56);
  const lift = new THREE.Vector3(Math.sin(az), 0, Math.cos(az)).multiplyScalar(span * 0.3);
  center.add(lift);
  const pos = new THREE.Vector3(
    center.x + Math.sin(az) * Math.cos(elev) * dist,
    center.y + Math.sin(elev) * dist,
    center.z + Math.cos(az) * Math.cos(elev) * dist,
  );
  // Leave room on the right for the annotation.
  const fwd = center.clone().sub(pos).normalize();
  const right = new THREE.Vector3().crossVectors(fwd, UP).normalize().multiplyScalar(span * 0.35);
  return { pos: pos.add(right).toArray() as V3, target: center.add(right).toArray() as V3 };
}

/** Look across your universe toward the uncharted region: known space below, the unknown ahead. */
function discoveryView(s: SonoraState) {
  const c = new THREE.Vector3(...(s.layout?.sectorCenter ?? [40, 0, 0]));
  const dir = new THREE.Vector3(c.x, 0, c.z).normalize();
  const target = c.clone().multiplyScalar(0.62);
  const pos = dir.clone().multiplyScalar(-14).addScaledVector(UP, 25);
  // Slide the view so the territory sits right of the readout column.
  const fwd = target.clone().sub(pos).normalize();
  const right = new THREE.Vector3().crossVectors(fwd, UP).normalize().multiplyScalar(-7);
  return { pos: pos.add(right).toArray() as V3, target: target.add(right).toArray() as V3 };
}

export default function CameraRig() {
  const camera = useThree((s) => s.camera);
  const controls = useRef<OrbitControlsImpl>(null);
  const move = useRef({ pos: new Tween3(LANDING.pos), target: new Tween3(LANDING.target), until: 0 });
  const drift = useRef({ on: false, lo: 0, hi: 0, angle: 0, v: 0, dir: -1, dragging: false, layout: null as SonoraState["layout"] });

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const start = () => (drift.current.dragging = true);
    const end = () => {
      drift.current.dragging = false;
      drift.current.on = false; // measure the range again from wherever the visitor left the view
    };
    c.addEventListener("start", start);
    c.addEventListener("end", end);
    return () => {
      c.removeEventListener("start", start);
      c.removeEventListener("end", end);
    };
  }, []);

  useEffect(() => {
    camera.position.set(...LANDING.pos);
    camera.lookAt(...LANDING.target);
    controls.current?.target.set(...LANDING.target);
  }, [camera]);

  useEffect(() => {
    const go = (goal: { pos: V3; target: V3 } | null, dur: number, delay = 0) => {
      const c = controls.current;
      if (!goal || !c) return;
      const m = move.current;
      m.pos.jump([camera.position.x, camera.position.y, camera.position.z]);
      m.target.jump([c.target.x, c.target.y, c.target.z]);
      m.pos.set(goal.pos, dur, delay);
      m.target.set(goal.target, dur, delay);
      m.until = now() + dur + delay;
      c.enabled = false;
    };

    return useSonora.subscribe((s, prev) => {
      if (s.phase === "building" && prev.phase === "landing") {
        // The dive: from the landing vantage into the space where YOU forms.
        go(overview(camera, s), 3.4);
        return;
      }
      if (s.buildId !== prev.buildId) {
        // The universe unfolds while the camera turns to face its uncharted edge.
        go(overview(camera, s, true), 3.6, 0.2);
        return;
      }
      if (s.phase !== "ready" && s.phase !== "building") return;
      if (s.phase === "ready" && prev.phase === "building") return;

      if (s.mode !== prev.mode) {
        // Top-down, with the composition shifted right of the DNA readout.
        // High enough that the outer artist orbit clears the screen edges and the controls.
        if (s.mode === "dna") go({ pos: [-9, 66, 13], target: [-9, 0, 0.5] }, DUR.camera);
        else if (s.mode === "discovery") go(discoveryView(s), DUR.camera + 0.4);
        else go(overview(camera, s), DUR.camera);
        return;
      }

      if (s.connect?.ids && s.connect !== prev.connect) {
        go(framePath(s.connect.ids, camera), DUR.focus + 0.4);
        return;
      }
      if (!s.connect && prev.connect?.ids && !s.selectedId) {
        go(overview(camera, s), DUR.focus);
        return;
      }

      if (s.selectedId !== prev.selectedId) {
        if (s.mode === "dna") return; // DNA stays composed; the panel does the talking.
        if (s.selectedId) go(focusOn(s.selectedId, camera, s), DUR.focus);
        else go(s.mode === "discovery" ? discoveryView(s) : overview(camera, s), DUR.focus);
        return;
      }

      if (s.layout !== prev.layout && s.layout && prev.layout && !s.selectedId && controls.current) {
        // The universe grew: pull back if the new star would land outside the current frame.
        const o = overview(camera, s);
        const need = new THREE.Vector3(...o.pos).distanceTo(new THREE.Vector3(...o.target));
        if (need > camera.position.distanceTo(controls.current.target) + 0.5) go(o, DUR.mode);
      }
    });
  }, [camera]);

  useFrame((_, delta) => {
    const c = controls.current;
    if (!c) return;
    const m = move.current;
    const s = useSonora.getState();
    if (m.until > 0) {
      const t = now();
      m.pos.update(t);
      m.target.update(t);
      camera.position.set(m.pos.x.value, m.pos.y.value, m.pos.z.value);
      c.target.set(m.target.x.value, m.target.y.value, m.target.z.value);
      // Disabled controls skip update(), so aim the camera ourselves.
      camera.lookAt(c.target);
      if (t >= m.until) {
        m.until = 0;
        c.enabled = s.phase === "ready";
      }
    } else {
      c.enabled = s.phase === "ready";
      if (s.phase === "building" && !s.dataReady) {
        // While Claude listens, the camera slowly circles YOU.
        camera.position.applyAxisAngle(UP, delta * 0.06);
        camera.lookAt(c.target);
      }
    }
    // A very slow drift while the visitor is simply looking.
    const d = drift.current;
    const idle = s.phase === "ready" && s.mode === "universe" && !s.selectedId && !s.hoveredId && m.until === 0 && !d.dragging;
    if (!idle || d.layout !== s.layout) {
      d.on = false;
      d.v = 0;
    }
    if (idle) {
      if (!d.on) {
        [d.lo, d.hi] = driftRange(camera, c.target, s);
        Object.assign(d, { on: true, angle: 0, layout: s.layout });
      }
      // Turn back just before an artist would reach the edge or the controls; the turn eases.
      if (d.angle <= d.lo + DRIFT_STEP) d.dir = 1;
      else if (d.angle >= d.hi - DRIFT_STEP) d.dir = -1;
      const goal = d.hi - d.lo > DRIFT_STEP * 2 ? d.dir * DRIFT_SPEED : 0;
      d.v += (goal - d.v) * Math.min(1, delta * 0.5);
      const th = d.v * delta;
      d.angle += th;
      camera.position.sub(c.target).applyAxisAngle(UP, th).add(c.target);
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.06}
      rotateSpeed={0.45}
      zoomSpeed={0.6}
      minDistance={8}
      maxDistance={110}
      maxPolarAngle={1.42}
    />
  );
}
