import * as THREE from 'three';

const ACCENT = 0xffb36b;

export function buildHeliModel(): { root: THREE.Group; rotor: THREE.Object3D; tailRotor: THREE.Object3D } {
  const root = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color: ACCENT, fog: false });
  const line = (pts: number[][]) =>
    new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p[0], p[1], p[2]))), mat);

  // body (nose toward -z)
  const bodyGeo = new THREE.SphereGeometry(1, 14, 8);
  bodyGeo.scale(1.5, 1.35, 3.0);
  root.add(new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo, 5), mat));
  // tail boom, fin, skids
  root.add(line([[0, 0.4, 2.6], [0, 1.0, 9]]));
  root.add(line([[0, 1.0, 9], [0, 2.8, 9.6], [0, 1.0, 7.6]]));
  for (const sx of [-1.5, 1.5]) {
    root.add(line([[sx, -1.9, -2.6], [sx, -1.9, 2.6]]));
    root.add(line([[sx * 0.8, -0.9, -1.2], [sx, -1.9, -1.2]]));
    root.add(line([[sx * 0.8, -0.9, 1.2], [sx, -1.9, 1.2]]));
  }
  // main rotor
  const rotor = new THREE.Group();
  rotor.position.y = 1.9;
  root.add(line([[0, 1.3, 0], [0, 1.9, 0]]));
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    rotor.add(line([[0, 0, 0], [Math.cos(a) * 7.5, 0, Math.sin(a) * 7.5]]));
  }
  const ring: THREE.Vector3[] = [];
  for (let i = 0; i < 48; i++) ring.push(new THREE.Vector3(Math.cos((i / 48) * Math.PI * 2) * 7.5, 0, Math.sin((i / 48) * Math.PI * 2) * 7.5));
  rotor.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ring),
    new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.25, fog: false })));
  root.add(rotor);
  // tail rotor
  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.35, 1.9, 9.3);
  tailRotor.add(line([[0, -1.1, 0], [0, 1.1, 0]]));
  tailRotor.add(line([[0, 0, -1.1], [0, 0, 1.1]]));
  root.add(tailRotor);
  root.scale.setScalar(0.8);
  return { root, rotor, tailRotor };
}

export interface HeliState {
  pos: THREE.Vector3;
  yaw: number;       // 0 = facing -z (north)
  fwd: number;       // forward speed m/s
  vy: number;
  yawRate: number;
}

export const HELI_RADIUS = 4;
const MAX_FWD = 55, MAX_BACK = 18, MAX_UP = 30, YAW_RATE = 1.5;

export interface Input { fwd: number; yaw: number; up: number; }

export function stepHeli(s: HeliState, inp: Input, dt: number) {
  const targetFwd = inp.fwd > 0 ? MAX_FWD : inp.fwd < 0 ? -MAX_BACK : 0;
  s.fwd += (targetFwd - s.fwd) * (1 - Math.exp(-dt * (inp.fwd === 0 ? 1.2 : 1.8)));
  s.vy += (inp.up * MAX_UP - s.vy) * (1 - Math.exp(-dt * 3));
  s.yawRate += (inp.yaw * YAW_RATE - s.yawRate) * (1 - Math.exp(-dt * 5));
  s.yaw += s.yawRate * dt;
  s.pos.x += Math.sin(s.yaw) * s.fwd * dt;
  s.pos.z += -Math.cos(s.yaw) * s.fwd * dt;
  s.pos.y += s.vy * dt;
}

export function applyPose(root: THREE.Object3D, s: HeliState) {
  root.position.copy(s.pos);
  root.rotation.order = 'YXZ';
  root.rotation.y = -s.yaw;
  root.rotation.x = -(s.fwd / MAX_FWD) * 0.22;
  root.rotation.z = -s.yawRate * 0.25;
}
