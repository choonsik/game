import { describe, expect, it } from 'vitest';
import { CollisionGrid, prepareCity, type CityData } from '../../src/city';

// One 20 m x 20 m tower (x,z in -10..10, height 50) and one raised block (min 20, height 40) at x 100.
const city = prepareCity({
  center: { lat: 0, lon: 0 }, half: 500, roads: [], parks: [],
  buildings: [
    { h: 50, min: 0, p: [-10, -10, 10, -10, 10, 10, -10, 10], bb: [0, 0, 0, 0] },
    { h: 40, min: 20, p: [90, -10, 110, -10, 110, 10, 90, 10], bb: [0, 0, 0, 0] },
  ],
} as CityData);
const grid = new CollisionGrid(city);
const R = 4;

describe('collision', () => {
  it('[REQ-COL-001] hits inside the outline', () => {
    expect(grid.hit(0, 25, 0, R)).toBe(true);
  });

  it('[REQ-COL-001] hits within the radius of a wall and misses beyond it', () => {
    expect(grid.hit(13, 25, 0, R)).toBe(true);   // 3 m from the wall
    expect(grid.hit(15, 25, 0, R)).toBe(false);  // 5 m from the wall
  });

  it('[REQ-COL-001] misses above the roof and hits just below the roof line', () => {
    expect(grid.hit(0, 55, 0, R)).toBe(false);
    expect(grid.hit(0, 53, 0, R)).toBe(true);
  });

  it('[REQ-COL-001] respects the minimum height of a raised block', () => {
    expect(grid.hit(100, 5, 0, R)).toBe(false);  // under the block
    expect(grid.hit(100, 30, 0, R)).toBe(true);
  });

  it('[REQ-COL-001] reports open ground away from outlines', () => {
    expect(grid.isOpen(50, 0, 14)).toBe(true);
    expect(grid.isOpen(0, 0, 14)).toBe(false);
  });
});
