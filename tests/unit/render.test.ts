import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { BG, buildCityMeshes, prepareCity, type CityData } from '../../src/city';
import { STR } from '../../src/strings';

const city = prepareCity(JSON.parse(readFileSync('public/data/manhattan.json', 'utf8')) as CityData);
const group = buildCityMeshes(city);
const fill = group.children.find(c => c instanceof THREE.Mesh && (c.material as THREE.MeshBasicMaterial).polygonOffset) as THREE.Mesh;
const edges = group.children.find(c => c instanceof THREE.LineSegments && (c.geometry as THREE.BufferGeometry).getAttribute('color')) as THREE.LineSegments;
const pos = edges.geometry.getAttribute('position');
const col = edges.geometry.getAttribute('color');

describe('line-art geometry', () => {
  it('[REQ-VIS-001] fills buildings with the background color and offsets the fill behind the lines', () => {
    const m = fill.material as THREE.MeshBasicMaterial;
    expect(m.color.getHex()).toBe(BG);
    expect(m.polygonOffset).toBe(true);
    expect(edges).toBeDefined();
  });

  it('[REQ-VIS-002] has no invalid or black edge color', () => {
    // One expect per value took more than 5 s. Collect first, then assert once.
    let min = Infinity, invalid = 0;
    for (const v of col.array as Float32Array) {
      if (!Number.isFinite(v)) invalid++;
      else min = Math.min(min, v);
    }
    expect(invalid).toBe(0);
    expect(min).toBeGreaterThanOrEqual(0.5); // black lines hid the vertical edges in 0.1.0
  });

  it('[REQ-VIS-002] draws top, vertical, and base edges', () => {
    let vertical = 0, base = 0, top = 0;
    for (let i = 0; i < pos.count; i += 2) {
      const y0 = pos.getY(i), y1 = pos.getY(i + 1);
      if (Math.abs(y0 - y1) > 1) vertical++;
      else if (y0 < 0.05) base++;
      else top++;
    }
    expect(vertical).toBeGreaterThan(1000);
    expect(base).toBeGreaterThan(1000);
    expect(top).toBeGreaterThan(1000);
  });

  it('[REQ-VIS-004] makes tall edges brighter than low edges', () => {
    let low = 0, high = 0;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) < 0.05) low = Math.max(low, col.getX(i));
      if (pos.getY(i) > 200) high = Math.max(high, col.getX(i));
    }
    expect(high).toBeGreaterThan(low);
  });

  it('[REQ-VIS-003] marks the building lines with the depth-cue shader', () => {
    expect((edges.material as THREE.Material).userData.depthCue).toBe(true);
  });
});

describe('text', () => {
  it('[REQ-TXT-001] keeps all player text in ASCII', () => {
    const all = JSON.stringify(STR, (_k, v) => (typeof v === 'function' ? v(1, 1) : v));
    expect(/[^\x00-\x7f]/.test(all)).toBe(false);
  });
});
