import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { stepHeli, type HeliState } from '../../src/heli';

const fresh = (yaw = 0): HeliState => ({ pos: new THREE.Vector3(0, 100, 0), yaw, fwd: 0, vy: 0, yawRate: 0 });
const run = (s: HeliState, inp: { fwd: number; yaw: number; up: number }, seconds: number) => {
  for (let i = 0; i < seconds * 60; i++) stepHeli(s, inp, 1 / 60);
};

describe('flight', () => {
  it('[REQ-CTL-001] forward at yaw 0 moves north (negative z)', () => {
    const s = fresh(); run(s, { fwd: 1, yaw: 0, up: 0 }, 2);
    expect(s.pos.z).toBeLessThan(-10);
    expect(Math.abs(s.pos.x)).toBeLessThan(0.001);
  });

  it('[REQ-CTL-001] forward at yaw 90 degrees moves east (positive x)', () => {
    const s = fresh(Math.PI / 2); run(s, { fwd: 1, yaw: 0, up: 0 }, 2);
    expect(s.pos.x).toBeGreaterThan(10);
  });

  it('[REQ-CTL-001] back moves the helicopter backward', () => {
    const s = fresh(); run(s, { fwd: -1, yaw: 0, up: 0 }, 2);
    expect(s.pos.z).toBeGreaterThan(5);
  });

  it('[REQ-CTL-001] key D turns right and key A turns left', () => {
    const r = fresh(); run(r, { fwd: 0, yaw: 1, up: 0 }, 1);
    const l = fresh(); run(l, { fwd: 0, yaw: -1, up: 0 }, 1);
    expect(r.yaw).toBeGreaterThan(0.5);
    expect(l.yaw).toBeLessThan(-0.5);
  });

  it('[REQ-CTL-001] limits forward speed to 55 m/s and backward speed to 18 m/s', () => {
    const f = fresh(); run(f, { fwd: 1, yaw: 0, up: 0 }, 20);
    const b = fresh(); run(b, { fwd: -1, yaw: 0, up: 0 }, 20);
    expect(f.fwd).toBeLessThanOrEqual(55.001);
    expect(f.fwd).toBeGreaterThan(50);
    expect(b.fwd).toBeGreaterThanOrEqual(-18.001);
  });

  it('[REQ-CTL-002] climbs with up input and descends with down input', () => {
    const u = fresh(); run(u, { fwd: 0, yaw: 0, up: 1 }, 2);
    const d = fresh(); run(d, { fwd: 0, yaw: 0, up: -1 }, 2);
    expect(u.pos.y).toBeGreaterThan(110);
    expect(d.pos.y).toBeLessThan(90);
  });

  it('[REQ-CTL-001] stops after the keys are released', () => {
    const s = fresh(); run(s, { fwd: 1, yaw: 0, up: 0 }, 3); run(s, { fwd: 0, yaw: 0, up: 0 }, 8);
    expect(Math.abs(s.fwd)).toBeLessThan(0.5);
  });
});
