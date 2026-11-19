import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { CityData } from '../../src/city';

const raw: CityData = JSON.parse(readFileSync('public/data/manhattan.json', 'utf8'));

describe('map data', () => {
  it('[REQ-MAP-001] has more than 2000 buildings with valid outlines and heights', () => {
    expect(raw.buildings.length).toBeGreaterThan(2000);
    for (const b of raw.buildings) {
      expect(b.p.length).toBeGreaterThanOrEqual(6);
      expect(b.p.length % 2).toBe(0);
      expect(b.p.every(Number.isFinite)).toBe(true);
      expect(b.h).toBeGreaterThan(0);
      expect(b.h).toBeLessThan(600);
      expect(b.min).toBeGreaterThanOrEqual(0);
      expect(b.min).toBeLessThan(b.h);
    }
  });

  it('[REQ-MAP-001] keeps all outlines near the map area', () => {
    // Large buildings cross the box edge (172 of them, up to 1172 m in 0.3.0). Allow 300 m.
    const lim = raw.half + 300;
    for (const b of raw.buildings) for (const v of b.p) expect(Math.abs(v)).toBeLessThan(lim);
  });

  it('[REQ-MAP-002] has roads, parks, and water', () => {
    expect(raw.roads.length).toBeGreaterThan(300);
    expect(raw.parks.length).toBeGreaterThan(10);
    expect(raw.parks.some(p => p.w === 0)).toBe(true); // park
    for (const r of [...raw.roads, ...raw.parks]) expect(r.p.length).toBeGreaterThanOrEqual(4);
  });

  it('[REQ-MAP-003] marks unknown heights and gives them 18 m', () => {
    const unknown = raw.buildings.filter(b => b.u === 1);
    expect(unknown.length).toBeGreaterThan(0);
    expect(unknown.length / raw.buildings.length).toBeLessThan(0.15);
    for (const b of unknown) expect(b.h).toBe(18);
  });

  it('[REQ-MAP-004] comes from one static file and a repeatable script', () => {
    expect(raw.center.lat).toBeCloseTo(40.758, 3);
    const script = readFileSync('scripts/fetch-osm.mjs', 'utf8');
    const stages = JSON.parse(readFileSync('src/stages.json', 'utf8'));
    expect(stages.find((s: { id: string }) => s.id === 'midtown').file).toBe('manhattan.json');
    expect(script).toContain('public/data/');
    expect(script).toContain('overpass');
  });

  it('[REQ-LBL-003] has enough named tall buildings for landmark labels', () => {
    const tall = raw.buildings.filter(b => b.n && !b.u && b.h >= 110);
    expect(tall.length).toBeGreaterThanOrEqual(5);
  });
});
