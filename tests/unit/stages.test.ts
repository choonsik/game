import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { CityData } from '../../src/city';
import STAGES from '../../src/stages.json';

describe('stages', () => {
  it('[REQ-GAME-013] has four stages in the set order', () => {
    expect(STAGES.map(s => s.id)).toEqual(['midtown', 'lower', 'paris', 'tokyo']);
    for (const s of STAGES) {
      expect(s.name).toMatch(/^[A-Z ]+$/);
      expect(s.goals.length).toBe(4);
      for (const [x, z, y] of [s.start, ...s.goals]) {
        expect(Math.abs(x)).toBeLessThan(s.half);
        expect(Math.abs(z)).toBeLessThan(s.half);
        expect(y).toBeGreaterThan(10);
        expect(y).toBeLessThan(450);
      }
    }
  });

  it('[REQ-MAP-006] has one data file for each stage with the stage center and size', () => {
    for (const s of STAGES) {
      const f = `public/data/${s.file}`;
      expect(existsSync(f), f).toBe(true);
      const d: CityData = JSON.parse(readFileSync(f, 'utf8'));
      expect(d.center).toEqual(s.center);
      expect(d.half).toBe(s.half);
      expect(d.buildings.length, s.id).toBeGreaterThan(500);
      expect(d.roads.length, s.id).toBeGreaterThan(300);
      for (const b of d.buildings) {
        expect(b.p.length).toBeGreaterThanOrEqual(6);
        expect(b.p.every(Number.isFinite)).toBe(true);
        expect(b.min).toBeGreaterThanOrEqual(0);
        expect(b.min).toBeLessThan(b.h);
        expect(b.h).toBeLessThan(600);
        if (b.u) expect(b.h).toBe(18);
      }
    }
  });

  it('[REQ-MAP-006] makes all stage files with the same script', () => {
    const script = readFileSync('scripts/fetch-osm.mjs', 'utf8');
    expect(script).toContain('src/stages.json');
    expect(script).toContain('public/data/${stage.file}');
  });

  it('[REQ-MAP-007] stacks a tower as smaller prisms that do not grow upward', () => {
    const paris: CityData = JSON.parse(readFileSync('public/data/paris.json', 'utf8'));
    const parts = paris.buildings.filter(b => b.h > 250);
    expect(parts.length).toBeGreaterThanOrEqual(1);
    const top = parts.sort((a, b) => b.h - a.h)[0];
    expect(top.min).toBeGreaterThan(200);
    const width = (b: { p: number[] }) => { const xs = b.p.filter((_, i) => i % 2 === 0); return Math.max(...xs) - Math.min(...xs); };
    const below = paris.buildings.filter(b => b.h === top.min && Math.abs(b.p[0] - top.p[0]) < 200);
    expect(below.length).toBe(1);
    expect(width(top)).toBeLessThan(width(below[0]));
  });
});
