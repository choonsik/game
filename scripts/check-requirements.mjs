// Requirement traceability and version-coupling check.
// Usage: node scripts/check-requirements.mjs          (check)
//        node scripts/check-requirements.mjs --lock   (write verification.lock.json)
//        add --force to --lock to accept removed tests (only for deprecated requirements).
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const p = (...a) => join(root, ...a);
const errors = [], warnings = [];
const err = m => errors.push(m), warn = m => warnings.push(m);

// ---- versions ----
const pkgVersion = JSON.parse(readFileSync(p('package.json'), 'utf8')).version;
const reqText = readFileSync(p('docs/spec/requirements.md'), 'utf8');
const reqVersion = /^Spec version:\s*(\S+)/m.exec(reqText)?.[1];
const specVersion = /^Spec version:\s*(\S+)/m.exec(readFileSync(p('docs/spec/SPEC.md'), 'utf8'))?.[1];
const logVersion = /^## (\d+\.\d+\.\d+)/m.exec(readFileSync(p('docs/spec/CHANGELOG.md'), 'utf8'))?.[1];
const suiteVersion = JSON.parse(readFileSync(p('tests/suite.json'), 'utf8')).version;
const lockPath = p('docs/spec/verification.lock.json');
const lock = existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, 'utf8')) : null;

const versions = { 'package.json': pkgVersion, 'requirements.md': reqVersion, 'SPEC.md': specVersion, 'CHANGELOG.md': logVersion, 'tests/suite.json': suiteVersion };
if (new Set(Object.values(versions)).size !== 1) err(`Version mismatch: ${JSON.stringify(versions)}`);
const cmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };

// ---- requirements ----
const rows = [];
for (const line of reqText.split('\n')) {
  const m = /^\|\s*(REQ-[A-Z]+-\d{3})\s*\|(.+)\|\s*(implemented|planned|deprecated)\s*\|\s*(\d+\.\d+\.\d+)\s*\|\s*(auto\+manual|auto|manual)\s*\|\s*$/.exec(line);
  if (m) rows.push({ id: m[1], text: m[2].trim(), status: m[3], since: m[4], verify: m[5] });
  else if (/^\|\s*REQ-/.test(line)) err(`Unparsable requirement row: ${line.slice(0, 80)}`);
}
const byId = new Map();
for (const r of rows) { if (byId.has(r.id)) err(`Duplicate requirement ID ${r.id}`); byId.set(r.id, r); }
for (const r of rows) if (cmp(r.since, pkgVersion) > 0) err(`${r.id}: Since ${r.since} is newer than the current version ${pkgVersion}`);

// ---- tests ----
const files = [];
const walk = d => { for (const f of readdirSync(d)) { const q = join(d, f); statSync(q).isDirectory() ? walk(q) : /\.(ts|mjs)$/.test(f) && files.push(q); } };
walk(p('tests')); files.push(p('scripts/e2e.mjs'));
const found = new Map(); // id -> Set(title)
const re = /(['"`])\[(REQ-[A-Z]+-\d{3})\]\s*(.+?)\1/g;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(re)) {
    if (!byId.has(m[2])) { err(`Test tag ${m[2]} in ${f.replace(root, '')} has no requirement`); continue; }
    (found.get(m[2]) ?? found.set(m[2], new Set()).get(m[2])).add(m[3]);
  }
}
const manualText = readFileSync(p('docs/spec/MANUAL-CHECKS.md'), 'utf8');
for (const r of rows) {
  const n = found.get(r.id)?.size ?? 0;
  if (r.status === 'implemented' && r.verify !== 'manual' && n === 0) err(`${r.id} is implemented and needs an automatic test. Found none.`);
  if (r.verify !== 'auto' && r.status !== 'deprecated' && !manualText.includes(r.id)) err(`${r.id} needs an entry in MANUAL-CHECKS.md`);
  if (r.status === 'deprecated' && n > 0) warn(`${r.id} is deprecated but still has ${n} test(s)`);
}

// ---- lock (regression ratchet) ----
const hash = createHash('sha256').update(rows.map(r => `${r.id}|${r.text}|${r.status}|${r.verify}`).join('\n')).digest('hex').slice(0, 16);
const current = Object.fromEntries([...found].map(([id, s]) => [id, [...s].sort()]).sort());
const doLock = process.argv.includes('--lock'), force = process.argv.includes('--force');

if (lock) {
  for (const [id, titles] of Object.entries(lock.tests)) {
    const r = byId.get(id);
    if (!r) { err(`Locked requirement ${id} no longer exists. Deprecate it. Do not delete it.`); continue; }
    if (r.status === 'deprecated') continue;
    for (const t of titles) if (!current[id]?.includes(t)) err(`REGRESSION GUARD: locked test is missing: [${id}] ${t}`);
  }
  if (lock.requirementsHash !== hash && lock.version === pkgVersion && !doLock)
    err('Requirements changed but the version did not increase. Increase the version, then run npm run req:lock.');
  if (lock.version !== pkgVersion && !doLock) err(`Lock file is at ${lock.version}. Run npm run req:lock for ${pkgVersion}.`);
  if (!doLock) for (const [id, titles] of Object.entries(current)) for (const t of titles)
    if (!lock.tests[id]?.includes(t)) err(`New test is not locked: [${id}] ${t}. Run npm run req:lock.`);
}

if (doLock) {
  if (lock && lock.requirementsHash !== hash && lock.version === pkgVersion) err('Cannot lock: requirements changed and the version did not increase.');
  if (errors.length && !force) { console.error(errors.map(e => 'ERROR ' + e).join('\n')); process.exit(1); }
  writeFileSync(lockPath, JSON.stringify({ version: pkgVersion, requirementsHash: hash, tests: current }, null, 2) + '\n');
  console.log(`Locked ${Object.values(current).flat().length} tests for ${rows.length} requirements at ${pkgVersion}.`);
  process.exit(0);
}

for (const w of warnings) console.warn('WARN  ' + w);
for (const e of errors) console.error('ERROR ' + e);
const impl = rows.filter(r => r.status === 'implemented').length;
console.log(`${rows.length} requirements (${impl} implemented), ${Object.values(current).flat().length} tagged tests, version ${pkgVersion}.`);
process.exit(errors.length ? 1 : 0);
