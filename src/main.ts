import * as THREE from 'three';
import { BG, CollisionGrid, buildCityMeshes, loadCity } from './city';
import { STR } from './strings';
import { HELI_RADIUS, HeliState, applyPose, buildHeliModel, stepHeli } from './heli';

const $ = (id: string) => document.getElementById(id)!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(BG);
scene.fog = new THREE.Fog(BG, 120, 1500);
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 2, 4000);
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

const keys = new Set<string>();
let phase: 'ready' | 'playing' | 'crashed' | 'won' = 'ready';
addEventListener('keydown', e => {
  keys.add(e.code);
  if (e.code === 'Space') e.preventDefault();
  if (phase === 'ready' && (e.code === 'Enter' || e.code === 'Space')) start();
  if (e.code === 'KeyR') restart();
  if (phase === 'won' && e.code === 'Enter') restart();
});
addEventListener('keyup', e => keys.delete(e.code));
const down = (...c: string[]) => c.some(k => keys.has(k));

// ---------- world ----------
const city = await loadCity('/data/manhattan.json');
scene.add(buildCityMeshes(city));
const grid = new CollisionGrid(city);

const heli = buildHeliModel();
scene.add(heli.root);

// find an open street spot near a desired location
function openSpot(x: number, z: number): THREE.Vector2 {
  for (let r = 0; r < 300; r += 6)
    for (let a = 0; a < 12; a++) {
      const px = x + Math.cos((a / 12) * 6.283) * r, pz = z + Math.sin((a / 12) * 6.283) * r;
      if (grid.isOpen(px, pz, 14)) return new THREE.Vector2(px, pz);
    }
  return new THREE.Vector2(x, z);
}

interface Waypoint { pos: THREE.Vector3; label: string; marker: THREE.Object3D; done: boolean; }
const WP_RADIUS = 28;
const wpDefs: [number, number, number, string][] = [
  [-300, 250, 110, STR.checkpoint(1)],
  [150, -50, 70, STR.checkpoint(2)],
  [420, -450, 40, STR.checkpoint(3)],
  [700, -700, 22, STR.destination],
];
const waypoints: Waypoint[] = wpDefs.map(([x, z, y, label]) => {
  const s = openSpot(x, z);
  const g = new THREE.Group();
  const m = new THREE.LineBasicMaterial({ color: 0xffb36b, fog: false });
  for (const r of [WP_RADIUS, WP_RADIUS * 0.6]) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 40; i++) pts.push(new THREE.Vector3(Math.cos((i / 40) * 6.283) * r, Math.sin((i / 40) * 6.283) * r, 0));
    g.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), m));
  }
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -y, 0), new THREE.Vector3(0, -WP_RADIUS, 0)]),
    new THREE.LineBasicMaterial({ color: 0xffb36b, transparent: true, opacity: 0.4, fog: false })));
  g.position.set(s.x, y, s.y);
  scene.add(g);
  return { pos: new THREE.Vector3(s.x, y, s.y), label, marker: g, done: false };
});

// ---------- building name labels ----------
// Declutter policy: a few landmark labels (tall, known height) + one "focus" label for the
// building nearest the view centre. Labels are sticky per building so they don't flicker.
interface Label { name: string; h: number; u: boolean; pos: THREE.Vector3; el?: HTMLDivElement; }
const labelDefs: Label[] = city.buildings.filter(b => b.n).map(b => {
  let cx = 0, cz = 0; const n = b.p.length / 2;
  for (let i = 0; i < b.p.length; i += 2) { cx += b.p[i]; cz += b.p[i + 1]; }
  return { name: b.n!, h: b.h, u: !!b.u, pos: new THREE.Vector3(cx / n, b.h, cz / n) };
});
const MAX_LANDMARKS = 4, LANDMARK_MIN_H = 110, LANDMARK_RANGE = 800, FOCUS_RANGE = 380;
let labelsOn = true;
addEventListener('keydown', e => { if (e.code === 'KeyL') labelsOn = !labelsOn; });
const active = new Set<Label>();
const tmp = new THREE.Vector3();
function showLabel(l: Label, x: number, y: number, focus: boolean, opacity: number) {
  if (!l.el) { l.el = document.createElement('div'); $('hud').appendChild(l.el); }
  const el = l.el;
  el.className = focus ? 'label focus' : 'label';
  el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
  el.style.opacity = String(opacity);
  const text = focus ? `${l.name}<small>${l.u ? STR.heightUnknown : l.h.toFixed(0) + ' m'}</small>` : l.name;
  if (el.dataset.t !== text) { el.innerHTML = text; el.dataset.t = text; }
}
function updateLabels() {
  const next = new Set<Label>();
  if (labelsOn && phase !== 'ready') {
    camera.updateMatrixWorld();
    type C = { l: Label; x: number; y: number; nx: number; ny: number; dist: number };
    const cands: C[] = [];
    for (const l of labelDefs) {
      const dist = camera.position.distanceTo(l.pos);
      if (dist > LANDMARK_RANGE) continue;
      tmp.copy(l.pos).project(camera);
      if (tmp.z > 1 || Math.abs(tmp.x) > 0.85 || Math.abs(tmp.y) > 0.8) continue;
      cands.push({ l, nx: tmp.x, ny: tmp.y, x: (tmp.x * 0.5 + 0.5) * innerWidth, y: (-tmp.y * 0.5 + 0.5) * innerHeight, dist });
    }
    // focus: closest to screen centre, within range
    let focus: C | undefined, best = 0.45;
    for (const c of cands) {
      if (c.dist > FOCUS_RANGE) continue;
      const d = Math.hypot(c.nx, c.ny * 1.2);
      if (d < best - (active.has(c.l) ? 0.08 : 0)) { best = d; focus = c; }
    }
    if (focus) { next.add(focus.l); showLabel(focus.l, focus.x, focus.y, true, 1); }
    // landmarks: tall + known height, sticky bonus, spaced out
    const placed = focus ? [focus] : [];
    const lm = cands
      .filter(c => !c.l.u && c.l.h >= LANDMARK_MIN_H && c !== focus)
      .sort((p, q) => (q.l.h - q.dist * 0.4 + (active.has(q.l) ? 80 : 0)) - (p.l.h - p.dist * 0.4 + (active.has(p.l) ? 80 : 0)));
    for (const c of lm) {
      if (next.size >= MAX_LANDMARKS + (focus ? 1 : 0)) break;
      if (placed.some(p => Math.abs(p.x - c.x) < 240 && Math.abs(p.y - c.y) < 34)) continue;
      placed.push(c); next.add(c.l);
      showLabel(c.l, c.x, c.y, false, Math.max(0.35, 0.85 - c.dist / LANDMARK_RANGE * 0.5));
    }
  }
  for (const l of active) if (!next.has(l) && l.el) l.el.style.opacity = '0';
  active.clear(); next.forEach(l => active.add(l));
}

// ---------- game state ----------
const startPos = openSpot(-650, 650);
const START = new THREE.Vector3(startPos.x, 130, startPos.y);
const heliState: HeliState = { pos: START.clone(), yaw: 0, fwd: 0, vy: 0, yawRate: 0 };
let current = 0, elapsed = 0, crashes = 0, crashTimer = 0, checkpoint = -1;

function yawToward(from: THREE.Vector3, to: THREE.Vector3) {
  return Math.atan2(to.x - from.x, -(to.z - from.z));
}
function respawn() {
  const from = checkpoint >= 0 ? waypoints[checkpoint].pos.clone() : START.clone();
  heliState.pos.copy(from);
  heliState.yaw = yawToward(from, waypoints[current].pos);
  heliState.fwd = heliState.vy = heliState.yawRate = 0;
  snapCamera();
}
function start() { phase = 'playing'; big(''); }
function restart() {
  waypoints.forEach(w => (w.done = false));
  current = 0; elapsed = 0; crashes = 0; checkpoint = -1; crashTimer = 0;
  respawn();
  phase = 'playing';
  big('');
}
function big(html: string) { $('big').innerHTML = html; }

// ---------- camera ----------
const camPos = new THREE.Vector3();
function camTarget(): THREE.Vector3 {
  const f = new THREE.Vector3(Math.sin(heliState.yaw), 0, -Math.cos(heliState.yaw));
  return heliState.pos.clone().addScaledVector(f, -30).add(new THREE.Vector3(0, 11, 0));
}
function snapCamera() { camPos.copy(camTarget()); }
function updateCamera(dt: number) {
  camPos.lerp(camTarget(), 1 - Math.exp(-dt * 5));
  camera.position.copy(camPos);
  const f = new THREE.Vector3(Math.sin(heliState.yaw), 0, -Math.cos(heliState.yaw));
  camera.lookAt(heliState.pos.clone().addScaledVector(f, 22).add(new THREE.Vector3(0, 3, 0)));
}

// ---------- loop ----------
respawn();
big(`<b>${STR.title}</b>${STR.titleBody}`);
if (location.search.includes('autostart')) start(); // dev: skip title screen
$('help').innerHTML = STR.help;
const clock = new THREE.Clock();
const arrowRot = $('arrowRot');

function update(dt: number) {
  heli.rotor.rotation.y += dt * 40;
  heli.tailRotor.rotation.x += dt * 50;
  waypoints.forEach((w, i) => { w.marker.visible = !w.done; w.marker.lookAt(camera.position); w.marker.scale.setScalar(i === current ? 1 : 0.6); });

  if (phase === 'playing') {
    elapsed += dt;
    stepHeli(heliState, {
      fwd: (down('KeyW', 'ArrowUp') ? 1 : 0) - (down('KeyS', 'ArrowDown') ? 1 : 0),
      yaw: (down('KeyD', 'ArrowRight') ? 1 : 0) - (down('KeyA', 'ArrowLeft') ? 1 : 0),
      up: (down('Space') ? 1 : 0) - (down('ShiftLeft', 'ShiftRight') ? 1 : 0),
    }, dt);

    const p = heliState.pos, lim = city.half + 60;
    p.x = THREE.MathUtils.clamp(p.x, -lim, lim);
    p.z = THREE.MathUtils.clamp(p.z, -lim, lim);
    p.y = Math.min(p.y, 450);

    if (p.y < HELI_RADIUS * 0.6 || grid.hit(p.x, p.y, p.z, HELI_RADIUS)) {
      phase = 'crashed'; crashes++; crashTimer = 1.6;
      big(`<b class="warn">${STR.crash}</b>${STR.crashBody}`);
    } else if (p.distanceTo(waypoints[current].pos) < WP_RADIUS) {
      waypoints[current].done = true;
      checkpoint = current;
      if (current === waypoints.length - 1) {
        phase = 'won';
        big(`<b>${STR.win}</b>${STR.winBody(elapsed.toFixed(1), crashes)}`);
      } else current++;
    }
  } else if (phase === 'crashed') {
    crashTimer -= dt;
    if (crashTimer <= 0) { respawn(); phase = 'playing'; big(''); }
  }

  applyPose(heli.root, heliState);
  updateCamera(dt);
  updateLabels();
  renderHud();
}

function renderHud() {
  const w = waypoints[current];
  const dist = heliState.pos.distanceTo(w.pos);
  $('stats').innerHTML =
    `${STR.hud.time} ${elapsed.toFixed(1)} s<br>${STR.hud.alt} ${heliState.pos.y.toFixed(0)} m<br>${STR.hud.speed} ${Math.abs(heliState.fwd * 3.6).toFixed(0)} km/h<br>${STR.hud.crashes} ${crashes}`;
  $('mission').innerHTML = `${w.label} (${current + 1}/${waypoints.length})<br>${STR.hud.dist} ${dist.toFixed(0)} m<br>${STR.hud.altDiff} ${(w.pos.y - heliState.pos.y).toFixed(0)} m`;
  const bearing = yawToward(heliState.pos, w.pos) - heliState.yaw;
  arrowRot.setAttribute('transform', `rotate(${(bearing * 180) / Math.PI})`);
}

// Test hook (only with ?test): lets the e2e harness drive the sim deterministically.
if (location.search.includes('test')) {
  (window as any).__game = {
    get phase() { return phase; },
    get current() { return current; },
    get crashes() { return crashes; },
    get labelCount() { return active.size; },
    get drawCalls() { return renderer.info.render.calls; },
    heli: heliState, waypoints, city, grid, scene, camera,
    get rotorAngle() { return heli.rotor.rotation.y; },
    teleport(x: number, y: number, z: number) { heliState.pos.set(x, y, z); heliState.fwd = heliState.vy = 0; },
    press(code: string) { keys.add(code); }, release(code: string) { keys.delete(code); },
    step(seconds: number) { for (let i = 0, n = Math.round(seconds * 60); i < n; i++) update(1 / 60); },
  };
}

renderer.setAnimationLoop(() => {
  update(Math.min(clock.getDelta(), 0.05));
  renderer.render(scene, camera);
});
