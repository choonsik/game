// Fetch OSM buildings for each stage box and convert them to local metre coords (x=east, z=south).
// Usage: node scripts/fetch-osm.mjs <stage id ...>   (no argument: all stages)
// The stage list is src/stages.json. Each stage writes public/data/<file>.
import { readFileSync, writeFileSync } from 'node:fs';

const STAGES = JSON.parse(readFileSync('src/stages.json', 'utf8'));
const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const ROAD_RE = '^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|pedestrian|living_street|service)$';
const ROAD_W = { motorway: 3, trunk: 3, primary: 3, secondary: 2, tertiary: 2 };

async function fetchData(query) {
  for (let attempt = 0; attempt < 6; attempt++) {
    for (const url of MIRRORS) {
      try {
        console.log('try', url);
        const res = await fetch(url, { method: 'POST', headers: { 'User-Agent': 'manhattan-heli-game/0.7', 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(query), signal: AbortSignal.timeout(240000) });
        if (res.ok) return await res.json();
        console.log(' status', res.status);
      } catch (e) { console.log(' err', e.message); }
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error('all mirrors failed');
}

const parseH = v => { if (!v) return null; const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? (/ft|'/.test(v) ? n * 0.3048 : n) : null; };
function heightOf(t) {
  const h = parseH(t.height); if (h) return { h, known: true };
  const l = parseFloat(t['building:levels']); if (l) return { h: l * 3.4 + 2, known: true };
  return { h: 18, known: false };
}

// A tower outline is its base. A solid prism of the full height looks wrong, so stack four smaller prisms.
const TAPER = [[0, 0.18, 1], [0.18, 0.35, 0.6], [0.35, 0.84, 0.3], [0.84, 1, 0.12]];
function taperTower(pts, h, name) {
  const cx = pts.reduce((a, q) => a + q[0], 0) / pts.length, cz = pts.reduce((a, q) => a + q[1], 0) / pts.length;
  return TAPER.map(([lo, hi, k], i) => {
    const b = { h: +(h * hi).toFixed(1), min: +(h * lo).toFixed(1), p: pts.map(([x, z]) => [+(cx + (x - cx) * k).toFixed(1), +(cz + (z - cz) * k).toFixed(1)]).flat() };
    if (name && i === TAPER.length - 1) b.n = name; // one label, at the top
    return b;
  });
}

async function fetchStage(stage) {
  const { center: CENTER, half: R } = stage;
  const dLat = R / 111320, dLon = R / (111320 * Math.cos(CENTER.lat * Math.PI / 180));
  const bbox = [CENTER.lat - dLat, CENTER.lon - dLon, CENTER.lat + dLat, CENTER.lon + dLon].join(',');
  // Towers with a height (for example the Eiffel Tower) count as buildings when OSM has no building tag.
  const query = `[out:json][timeout:180];(way["building"](${bbox});relation["building"](${bbox});way["man_made"="tower"]["height"](${bbox});way["highway"~"${ROAD_RE}"](${bbox});way["leisure"="park"](${bbox});way["natural"="water"](${bbox}););out geom;`;
  const mx = 111320 * Math.cos(CENTER.lat * Math.PI / 180), my = 111320;
  const toXY = p => [+((p.lon - CENTER.lon) * mx).toFixed(1), +(-(p.lat - CENTER.lat) * my).toFixed(1)];

  const data = await fetchData(query);
  const buildings = [], roads = [], parks = [];
  let unknown = 0;
  for (const el of data.elements) {
    const t = el.tags || {};
    if (el.type === 'way' && el.geometry && t.highway) { roads.push({ w: ROAD_W[t.highway] || 1, p: el.geometry.map(toXY).flat() }); continue; }
    if (el.type === 'way' && el.geometry && (t.leisure === 'park' || t.natural === 'water')) { parks.push({ w: t.natural ? 1 : 0, p: el.geometry.map(toXY).flat() }); continue; }
    if (!t.building && t.man_made !== 'tower') continue;
    const { h, known } = heightOf(t);
    const rings = [];
    if (el.type === 'way' && el.geometry) rings.push(el.geometry);
    else if (el.type === 'relation') for (const m of el.members || []) if (m.role === 'outer' && m.geometry) rings.push(m.geometry);
    for (const g of rings) {
      const pts = g.map(toXY);
      if (pts.length < 4) continue;
      pts.pop(); // drop closing duplicate
      const name = t['name:en'] || t.name || t['addr:housename'];
      if (t.man_made === 'tower' && known) { buildings.push(...taperTower(pts, h, name)); continue; }
      const b = { h: +h.toFixed(1), min: +(parseH(t.min_height) || 0).toFixed(1), p: pts.flat() };
      if (b.min >= b.h) b.min = 0;
      if (name) b.n = name;
      if (!known) b.u = 1;
      buildings.push(b);
      if (!known) unknown++;
    }
  }
  console.log(`${stage.id}: buildings ${buildings.length} (named ${buildings.filter(b => b.n).length}), unknown height ${unknown}, roads ${roads.length}, parks/water ${parks.length}`);
  writeFileSync(`public/data/${stage.file}`, JSON.stringify({ center: CENTER, half: R, buildings, roads, parks }));
}

const ids = process.argv.slice(2);
for (const s of STAGES) if (!ids.length || ids.includes(s.id)) await fetchStage(s);
