// End-to-end harness. Starts the dev server, drives the game through the ?test hook in headless Chrome,
// and checks behavior and pixels. Every check title starts with a requirement tag, for example [REQ-GAME-001].
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';

const PORT = 5199;
const BASE = `http://localhost:${PORT}/`;
const CHROME = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => p && existsSync(p));
if (!CHROME) { console.error('No Chrome or Edge found. Set CHROME_PATH.'); process.exit(2); }

const results = [];
async function check(title, fn) {
  try { await fn(); results.push([true, title]); console.log('PASS ' + title); }
  catch (e) { results.push([false, title]); console.log('FAIL ' + title + '\n     ' + String(e.message).split('\n')[0]); }
}
const assert = (c, m) => { if (!c) throw new Error(m); };

// ---- server ----
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { shell: true, stdio: 'ignore' });
const stopServer = () => { try { spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { shell: true, stdio: 'ignore' }); } catch {} server.kill(); };
for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise(r => setTimeout(r, 500)); }

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--window-size=1400,800'],
  defaultViewport: { width: 1400, height: 800 },
});
const errorsSeen = [];

async function open(query) {
  const page = await browser.newPage();
  page.on('pageerror', e => errorsSeen.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errorsSeen.push('console: ' + m.text()); });
  await page.goto(BASE + query, { waitUntil: 'load' });
  await page.waitForFunction('window.__game && window.__game.city', { timeout: 90000 });
  return page;
}
// Runs one or more statements in the page. Returns the value of the last statement.
const G = (page, code) => page.evaluate(`(() => { const g = window.__game; return eval(${JSON.stringify(code)}); })()`);
const key = async (page, code, seconds) => { await page.keyboard.down(code); await G(page, `g.step(${seconds})`); await page.keyboard.up(code); };

try {
  const suite = JSON.parse(readFileSync('tests/suite.json', 'utf8')).version;
  console.log(`Suite version ${suite}. Browser ${CHROME}`);

  // ---------- title screen ----------
  const title = await open('?test');
  await check('[REQ-LBL-004] shows no building names on the title screen', async () => {
    await G(title, 'g.step(0.5)');
    assert((await G(title, 'g.phase')) === 'ready', 'phase is not ready');
    assert((await G(title, 'g.labelCount')) === 0, 'labels visible on title screen');
    await title.keyboard.press('Enter');
    await G(title, 'g.step(1)');
    assert((await G(title, 'g.phase')) === 'playing', 'ENTER did not start the game');
    assert((await G(title, 'g.labelCount')) > 0, 'labels never appear in this view, so the hiding test proves nothing');
  });
  await check('[REQ-MAP-005] shows the credit on the title screen', async () => {
    const t = await title.evaluate(() => document.getElementById('credit').innerText);
    assert(/OpenStreetMap contributors/.test(t), 'credit: ' + t);
  });
  await title.close();

  // ---------- main play page ----------
  const page = await open('?test&autostart');

  await check('[REQ-PLAT-001] loads a WebGL canvas and static data without errors', async () => {
    assert(await page.$('canvas'), 'no canvas');
    assert((await G(page, 'g.city.buildings.length')) > 2000, 'city not loaded');
    assert(errorsSeen.length === 0, errorsSeen.join(' | '));
  });

  await check('[REQ-GAME-001] starts in play mode at the start altitude', async () => {
    assert((await G(page, 'g.phase')) === 'playing', 'not playing');
    const y = await G(page, 'g.heli.pos.y');
    assert(Math.abs(y - 130) < 1, `altitude ${y}`);
  });

  await check('[REQ-GAME-005] shows all HUD fields and the direction arrow', async () => {
    await G(page, 'g.step(0.2)');
    const hud = await page.evaluate(() => document.getElementById('stats').innerText + '\n' + document.getElementById('mission').innerText);
    for (const k of ['TIME', 'ALT', 'SPD', 'CRASHES', 'DIST', 'ALT DIFF']) assert(hud.includes(k), `HUD lacks ${k}`);
    assert(await page.$('#arrowRot'), 'no arrow');
  });

  await check('[REQ-CTL-001] key W moves the helicopter forward', async () => {
    const before = await G(page, '[g.heli.pos.x, g.heli.pos.z, g.heli.yaw]');
    await key(page, 'KeyW', 2);
    const after = await G(page, '[g.heli.pos.x, g.heli.pos.z]');
    const moved = (after[0] - before[0]) * Math.sin(before[2]) - (after[1] - before[1]) * Math.cos(before[2]);
    assert(moved > 10, `moved ${moved.toFixed(1)} m forward`);
  });

  await check('[REQ-CTL-001] key D turns right and key A turns left', async () => {
    const y0 = await G(page, 'g.heli.yaw');
    await key(page, 'KeyD', 0.8);
    const y1 = await G(page, 'g.heli.yaw');
    await key(page, 'KeyA', 1.6);
    const y2 = await G(page, 'g.heli.yaw');
    assert(y1 > y0 && y2 < y1, `yaw ${y0.toFixed(2)} ${y1.toFixed(2)} ${y2.toFixed(2)}`);
  });

  await check('[REQ-CTL-002] SPACE climbs and SHIFT descends', async () => {
    const a = await G(page, 'g.heli.pos.y');
    await key(page, 'Space', 1);
    const b = await G(page, 'g.heli.pos.y');
    await key(page, 'ShiftLeft', 1);
    const c = await G(page, 'g.heli.pos.y');
    assert(b > a + 5 && c < b - 5, `alt ${a.toFixed(0)} ${b.toFixed(0)} ${c.toFixed(0)}`);
  });

  await check('[REQ-CTL-004] puts the camera behind and above the helicopter', async () => {
    await G(page, 'g.teleport(-650, 200, 650); g.step(3)');
    const [dx, dy, dz, yaw] = await G(page, '[g.camera.position.x - g.heli.pos.x, g.camera.position.y - g.heli.pos.y, g.camera.position.z - g.heli.pos.z, g.heli.yaw]');
    const ahead = dx * Math.sin(yaw) - dz * Math.cos(yaw);
    assert(ahead < -5 && dy > 3, `ahead ${ahead.toFixed(1)}, above ${dy.toFixed(1)}`);
  });

  await check('[REQ-VIS-005] turns the rotor', async () => {
    const a = await G(page, 'g.rotorAngle');
    await G(page, 'g.step(0.1)');
    assert((await G(page, 'g.rotorAngle')) !== a, 'rotor angle did not change');
  });

  await check('[REQ-COL-002] crashes when the helicopter touches the ground', async () => {
    await G(page, 'g.teleport(-650, 1, 650); g.step(0.05)');
    assert((await G(page, 'g.phase')) === 'crashed', 'no crash');
    await G(page, 'g.step(2)');
  });

  await check('[REQ-COL-003] keeps the helicopter inside the map limit and the altitude limit', async () => {
    await G(page, 'g.teleport(9000, 900, -9000); g.step(0.05)');
    const [x, y, z, half] = await G(page, '[g.heli.pos.x, g.heli.pos.y, g.heli.pos.z, g.city.half]');
    assert(x <= half + 60.1 && z >= -(half + 60.1) && y <= 450.1, `pos ${x} ${y} ${z}`);
  });

  await check('[REQ-GAME-002] passes the goals in order', async () => {
    await page.keyboard.press('KeyR');
    await G(page, 'g.step(0.1)');
    assert((await G(page, 'g.current')) === 0, 'not at goal 0');
    await G(page, 'g.teleport(g.waypoints[1].pos.x, g.waypoints[1].pos.y, g.waypoints[1].pos.z); g.step(0.05)');
    assert((await G(page, 'g.current')) === 0, 'goal 1 counted before goal 0');
    for (let i = 0; i < 3; i++) {
      await G(page, `{ const w = g.waypoints[${i}].pos; g.teleport(w.x, w.y, w.z); g.step(0.05); }`);
      assert((await G(page, 'g.current')) === i + 1, `goal ${i} not counted`);
    }
  });

  await check('[REQ-GAME-003] restarts at the last checkpoint and counts the crash', async () => {
    const c0 = await G(page, 'g.crashes');
    // crash into a real building
    await G(page, `{ const b = g.city.buildings.find(b => b.h > 60); g.teleport(b.p[0], b.h / 2, b.p[1]); g.step(0.05); }`);
    assert((await G(page, 'g.phase')) === 'crashed', 'no crash at building');
    assert((await G(page, 'g.crashes')) === c0 + 1, 'crash count did not increase');
    await G(page, 'g.step(2)');
    assert((await G(page, 'g.phase')) === 'playing', 'did not restart');
    const d = await G(page, 'Math.hypot(g.heli.pos.x - g.waypoints[2].pos.x, g.heli.pos.z - g.waypoints[2].pos.z)');
    assert(d < 5, `restart is ${d.toFixed(1)} m from checkpoint 3`);
  });

  await check('[REQ-GAME-004] shows time and crashes at the destination', async () => {
    await G(page, '{ const w = g.waypoints[3].pos; g.teleport(w.x, w.y, w.z); g.step(0.05); }');
    // the 4th goal is current index 3 after goals 0..2 were counted
    assert((await G(page, 'g.phase')) === 'won', 'phase is ' + (await G(page, 'g.phase')));
    const txt = await page.evaluate(() => document.getElementById('big').innerText);
    assert(/DESTINATION REACHED/.test(txt) && /TIME/.test(txt) && /CRASHES/.test(txt), txt);
  });

  await check('[REQ-CTL-003] key R restarts the mission', async () => {
    const before = await G(page, '[g.phase, g.crashes]');
    assert(before[0] === 'won' && before[1] > 0, 'precondition failed: ' + before);
    await page.keyboard.press('KeyR');
    await G(page, 'g.step(0.1)');
    assert((await G(page, 'g.phase')) === 'playing' && (await G(page, 'g.current')) === 0 && (await G(page, 'g.crashes')) === 0, 'not reset');
  });

  await check('[REQ-LBL-001] shows at most five labels in any view', async () => {
    let max = 0;
    for (const [x, z, y] of [[-650, 650, 130], [0, 0, 200], [200, -200, 120], [-200, 300, 90], [400, -400, 160], [0, 300, 250]]) {
      await G(page, `g.teleport(${x}, ${y}, ${z}); g.step(2)`);
      max = Math.max(max, await G(page, 'g.labelCount'));
    }
    assert(max >= 1 && max <= 5, `${max} labels (expected 1 to 5)`);
  });

  await check('[REQ-LBL-002] shows name and height, or HEIGHT UNKNOWN, on the focus label', async () => {
    const cands = await G(page, `g.city.buildings.filter(b => b.n && b.h > 40).slice(0, 12).map(b => {
      let cx = 0, cz = 0, n = b.p.length / 2; for (let i = 0; i < b.p.length; i += 2) { cx += b.p[i]; cz += b.p[i + 1]; }
      return [cx / n, cz / n, b.h, b.n]; })`);
    let seen = null;
    for (const [cx, cz, h] of cands) {
      // stand 90 m south of the building, 25 m above the roof, and face north
      await G(page, `g.teleport(${cx}, ${h + 30}, ${cz + 90}); g.heli.yaw = 0; g.step(3)`);
      seen = await page.evaluate(() => document.querySelector('.label.focus')?.innerText ?? null);
      if (seen) break;
    }
    assert(seen && (/\d+ m/.test(seen) || /HEIGHT UNKNOWN/.test(seen)), `focus label: ${seen}`);
  });

  await check('[REQ-CTL-003] key L hides and shows building names', async () => {
    await G(page, 'g.teleport(-650, 130, 650); g.heli.yaw = 0; g.step(3)');
    assert((await G(page, 'g.labelCount')) > 0, 'precondition failed: no labels in view');
    await page.keyboard.press('KeyL');
    await G(page, 'g.step(1)');
    assert((await G(page, 'g.labelCount')) === 0, 'labels still visible after L');
    await page.keyboard.press('KeyL');
    await G(page, 'g.step(1)');
    assert((await G(page, 'g.labelCount')) > 0, 'labels did not return after second L');
  });

  await check('[REQ-VIS-003] uses depth-cue lines and a fog that ends within 1600 m', async () => {
    const r = await G(page, `(() => { let cue = 0; g.scene.traverse(o => { if (o.isLineSegments && o.material.userData.depthCue) cue++; });
      return [cue, g.scene.fog.far, g.scene.fog.near]; })()`);
    assert(r[0] >= 1 && r[1] <= 1600 && r[2] < r[1], JSON.stringify(r));
  });

  await check('[REQ-PERF-001] uses at most 100 draw calls for each frame', async () => {
    await G(page, "g.teleport(0, 150, 0); g.step(1)");
    await new Promise(r => setTimeout(r, 300));
    const calls = await G(page, 'g.drawCalls');
    assert(calls > 0 && calls <= 100, `${calls} draw calls`);
  });

  await check('[REQ-MAP-005] shows the OpenStreetMap credit with a link to the license page', async () => {
    const r = await page.evaluate(() => { const a = document.querySelector('#credit a'); return a ? [a.innerText, a.href, getComputedStyle(a).display] : null; });
    assert(r && /OpenStreetMap contributors/.test(r[0]) && /ODbL/.test(r[0]), 'credit text: ' + r);
    assert(r[1] === 'https://www.openstreetmap.org/copyright', 'link: ' + r[1]);
  });

  await check('[REQ-TXT-001] shows only ASCII player text', async () => {
    const txt = await page.evaluate(() => { const c = document.body.cloneNode(true); c.querySelectorAll('.label').forEach(e => e.remove()); return c.innerText; });
    assert(!/[^\x00-\x7f]/.test(txt), 'non-ASCII: ' + [...txt].filter(c => c.charCodeAt(0) > 127).join(''));
  });

  await check('[REQ-VIS-002] draws no black edges and shows cyan and orange lines on screen', async () => {
    await G(page, "g.teleport(-650, 130, 650); g.heli.yaw = 0.5; g.step(3)");
    await new Promise(r => setTimeout(r, 400));
    mkdirSync('artifacts', { recursive: true });
    const buf = await page.screenshot({ type: 'png' });
    writeFileSync('artifacts/screenshot.png', buf);
    const png = PNG.sync.read(buf);
    let dark = 0, cyan = 0, orange = 0; const n = png.width * png.height;
    for (let i = 0; i < n; i++) {
      const r = png.data[i * 4], g = png.data[i * 4 + 1], b = png.data[i * 4 + 2];
      if (r + g + b < 20) dark++;                          // below the background color: a black line
      if (b > 170 && g > 140 && r < 170) cyan++;            // building lines
      if (r > 200 && g > 120 && g < 210 && b < 150) orange++; // helicopter
    }
    assert(dark / n < 0.0005, `black pixels ${(100 * dark / n).toFixed(3)} percent`);
    assert(cyan / n > 0.001, `cyan pixels ${(100 * cyan / n).toFixed(3)} percent`);
    assert(orange / n > 0.00005, `orange pixels ${(100 * orange / n).toFixed(3)} percent`);
  });

  await check('[REQ-PLAT-001] shows no page errors during the whole run', async () => {
    assert(errorsSeen.length === 0, errorsSeen.slice(0, 3).join(' | '));
  });
} finally {
  await browser.close();
  stopServer();
}

const failed = results.filter(r => !r[0]);
console.log(`\nE2E: ${results.length - failed.length}/${results.length} passed.`);
process.exit(failed.length ? 1 : 0);
