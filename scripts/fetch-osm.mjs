// Fetch OSM buildings for a bbox and convert to local metre coords (x=east, z=south).
import { writeFileSync } from 'node:fs';

const CENTER = { lat: 40.758, lon: -73.9855 }; // Times Square
const R = 900; // metres half-size
const dLat = R / 111320, dLon = R / (111320 * Math.cos(CENTER.lat * Math.PI / 180));
const bbox = [CENTER.lat - dLat, CENTER.lon - dLon, CENTER.lat + dLat, CENTER.lon + dLon].join(',');
const query = `[out:json][timeout:120];(way["building"](${bbox});relation["building"](${bbox});way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|pedestrian|living_street|service)$"](${bbox});way["leisure"="park"](${bbox});way["natural"="water"](${bbox}););out geom;`;
const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

async function fetchData() {
  for (let attempt = 0; attempt < 6; attempt++) {
    for (const url of MIRRORS) {
      try {
        console.log('try', url);
        const res = await fetch(url, { method: 'POST', headers: { 'User-Agent': 'manhattan-heli-game/0.1', 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(query) });
        if (res.ok) return await res.json();
        console.log(' status', res.status);
      } catch (e) { console.log(' err', e.message); }
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error('all mirrors failed');
}

const mx = 111320 * Math.cos(CENTER.lat * Math.PI / 180), my = 111320;
const toXY = p => [+((p.lon - CENTER.lon) * mx).toFixed(1), +(-(p.lat - CENTER.lat) * my).toFixed(1)];
const parseH = v => { if (!v) return null; const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? (/ft|'/.test(v) ? n * 0.3048 : n) : null; };
function heightOf(t) {
  const h = parseH(t.height); if (h) return { h, known: true };
  const l = parseFloat(t['building:levels']); if (l) return { h: l * 3.4 + 2, known: true };
  return { h: 18, known: false };
}

const data = await fetchData();
const buildings = [], roads = [], parks = [];
const ROAD_W = { motorway: 3, trunk: 3, primary: 3, secondary: 2, tertiary: 2 };
let unknown = 0;
for (const el of data.elements) {
  const t = el.tags || {};
  if (el.type === 'way' && el.geometry && t.highway) { roads.push({ w: ROAD_W[t.highway] || 1, p: el.geometry.map(toXY).flat() }); continue; }
  if (el.type === 'way' && el.geometry && (t.leisure === 'park' || t.natural === 'water')) { parks.push({ w: t.natural ? 1 : 0, p: el.geometry.map(toXY).flat() }); continue; }
  if (!t.building) continue;
  const { h, known } = heightOf(t);
  const rings = [];
  if (el.type === 'way' && el.geometry) rings.push(el.geometry);
  else if (el.type === 'relation') for (const m of el.members || []) if (m.role === 'outer' && m.geometry) rings.push(m.geometry);
  for (const g of rings) {
    const pts = g.map(toXY);
    if (pts.length < 4) continue;
    pts.pop(); // drop closing duplicate
    const b = { h: +h.toFixed(1), min: +(parseH(t.min_height) || 0).toFixed(1), p: pts.flat() };
    const name = t.name || t['addr:housename'];
    if (name) b.n = name;
    if (!known) b.u = 1;
    buildings.push(b);
    if (!known) unknown++;
  }
}
console.log(`buildings: ${buildings.length} (named ${buildings.filter(b => b.n).length}), unknown height: ${unknown}, roads: ${roads.length}, parks/water: ${parks.length}`);
writeFileSync('public/data/manhattan.json', JSON.stringify({ center: CENTER, half: R, buildings, roads, parks }));
