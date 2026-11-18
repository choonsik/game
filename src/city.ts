import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface Building { h: number; min: number; p: number[]; bb: [number, number, number, number]; n?: string; u?: 1; }
export interface Poly { w: number; p: number[]; }
export interface CityData { center: { lat: number; lon: number }; half: number; buildings: Building[]; roads: Poly[]; parks: Poly[]; }

export const BG = 0x0a1018;
const CELL = 64;

export async function loadCity(url: string): Promise<CityData> {
  return prepareCity(await (await fetch(url)).json());
}

/** Compute per-building bounding boxes (shared by the browser loader and tests). */
export function prepareCity(raw: CityData): CityData {
  for (const b of raw.buildings as Building[]) {
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (let i = 0; i < b.p.length; i += 2) {
      x0 = Math.min(x0, b.p[i]); x1 = Math.max(x1, b.p[i]);
      z0 = Math.min(z0, b.p[i + 1]); z1 = Math.max(z1, b.p[i + 1]);
    }
    b.bb = [x0, z0, x1, z1];
  }
  return raw;
}

/** Depth cue for lines: near lines blend toward white (crisp, bright), far lines dim before fog swallows them. */
function depthStyle<T extends THREE.LineBasicMaterial>(m: T, nearBoost: number): T {
  m.userData.depthCue = true; // checked by e2e (REQ-VIS-003)
  m.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      #ifdef USE_FOG
      float nearK = 1.0 - smoothstep(15.0, 380.0, vFogDepth);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), nearK * ${nearBoost.toFixed(2)});
      diffuseColor.rgb *= mix(1.0, 0.6, smoothstep(250.0, 1000.0, vFogDepth));
      #endif`);
  };
  return m;
}

/** Hidden-line style city: bg-coloured solid fill + height-shaded edge lines. */
export function buildCityMeshes(city: CityData): THREE.Object3D {
  const geos: THREE.BufferGeometry[] = [];
  for (const b of city.buildings) {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i < b.p.length; i += 2) pts.push(new THREE.Vector2(b.p[i], -b.p[i + 1]));
    if (Math.abs(THREE.ShapeUtils.area(pts)) < 4 || b.h - b.min < 0.5) continue;
    try {
      const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: b.h - b.min, bevelEnabled: false });
      g.translate(0, 0, b.min);
      g.rotateX(-Math.PI / 2);
      g.deleteAttribute('uv');
      geos.push(g);
    } catch { /* skip degenerate footprint */ }
  }
  const merged = mergeGeometries(geos, false)!;
  geos.forEach(g => g.dispose());

  const group = new THREE.Group();
  group.add(new THREE.Mesh(merged, new THREE.MeshBasicMaterial({
    color: BG, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  })));

  const edges = new THREE.EdgesGeometry(merged, 25);
  const pos = edges.getAttribute('position');
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(Math.max(pos.getY(i) / 250, 0), 1); // clamp: rotateX leaves y≈-1e-7 at the base -> sqrt(NaN) -> black
    const v = 0.6 + 0.4 * Math.sqrt(t);
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v;
  }
  edges.setAttribute('color', new THREE.BufferAttribute(col, 3));
  group.add(new THREE.LineSegments(edges, depthStyle(new THREE.LineBasicMaterial({ color: 0x8fe8ff, vertexColors: true }), 0.75)));

  // roads, parks, water (flat lines on the ground)
  const segs = (polys: Poly[], y: number) => {
    const v: number[] = [];
    for (const { p } of polys) for (let i = 0; i + 3 < p.length; i += 2) v.push(p[i], y, p[i + 1], p[i + 2], y, p[i + 3]);
    return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  };
  const mk = (polys: Poly[], color: number) => new THREE.LineSegments(segs(polys, 0.3), depthStyle(new THREE.LineBasicMaterial({ color }), 0.35));
  group.add(mk(city.roads.filter(r => r.w < 2), 0x2f6178));
  group.add(mk(city.roads.filter(r => r.w >= 2), 0x5db4d4));
  group.add(mk(city.parks.filter(r => r.w === 0), 0x3f9a7a));
  group.add(mk(city.parks.filter(r => r.w === 1), 0x4a86c4));

  // ground + boundary
  const s = city.half * 2;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(s * 3, s * 3).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: BG }));
  ground.position.y = -0.6;
  group.add(ground);
  const h = city.half;
  const outline = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([[-h, -h], [h, -h], [h, h], [-h, h]].map(([x, z]) => new THREE.Vector3(x, 0.2, z))),
    new THREE.LineBasicMaterial({ color: 0x3a6a80 }));
  group.add(outline);
  return group;
}

/** Uniform grid for footprint collision queries. */
export class CollisionGrid {
  private cells = new Map<number, Building[]>();
  constructor(city: CityData) {
    for (const b of city.buildings) {
      for (let cx = Math.floor(b.bb[0] / CELL); cx <= Math.floor(b.bb[2] / CELL); cx++)
        for (let cz = Math.floor(b.bb[1] / CELL); cz <= Math.floor(b.bb[3] / CELL); cz++) {
          const k = key(cx, cz);
          let arr = this.cells.get(k);
          if (!arr) this.cells.set(k, (arr = []));
          arr.push(b);
        }
    }
  }
  private near(x: number, z: number, r: number): Building[] {
    const out = new Set<Building>();
    for (let cx = Math.floor((x - r) / CELL); cx <= Math.floor((x + r) / CELL); cx++)
      for (let cz = Math.floor((z - r) / CELL); cz <= Math.floor((z + r) / CELL); cz++)
        this.cells.get(key(cx, cz))?.forEach(b => out.add(b));
    return [...out];
  }
  /** True if a sphere of radius r at (x,y,z) touches any building. */
  hit(x: number, y: number, z: number, r: number): boolean {
    for (const b of this.near(x, z, r)) {
      if (y > b.h + r || y < b.min - r) continue;
      if (x < b.bb[0] - r || x > b.bb[2] + r || z < b.bb[1] - r || z > b.bb[3] + r) continue;
      if (distToPolygon(x, z, b.p) < r) return true;
    }
    return false;
  }
  /** Horizontal clearance: true if no building footprint within r (any height). */
  isOpen(x: number, z: number, r: number): boolean {
    for (const b of this.near(x, z, r)) if (distToPolygon(x, z, b.p) < r) return false;
    return true;
  }
}

const key = (cx: number, cz: number) => (cx + 4096) * 8192 + (cz + 4096);

/** Distance from point to polygon; 0 if inside. */
function distToPolygon(x: number, z: number, p: number[]): number {
  let inside = false, best = Infinity;
  const n = p.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = p[i * 2], zi = p[i * 2 + 1], xj = p[j * 2], zj = p[j * 2 + 1];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    const dx = xj - xi, dz = zj - zi, l2 = dx * dx + dz * dz;
    const t = l2 ? Math.max(0, Math.min(1, ((x - xi) * dx + (z - zi) * dz) / l2)) : 0;
    best = Math.min(best, Math.hypot(x - (xi + t * dx), z - (zi + t * dz)));
  }
  return inside ? 0 : best;
}
