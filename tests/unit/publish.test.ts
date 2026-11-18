import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('publication files', () => {
  it('[REQ-PUB-001] has a LICENSE file with the MIT text and the owner name', () => {
    const t = readFileSync('LICENSE', 'utf8');
    expect(t).toMatch(/^MIT License/);
    expect(t).toMatch(/Copyright \(c\) 2026 \S+/);
  });

  it('[REQ-PUB-001] has a README with run steps, controls, and the data credit', () => {
    const t = readFileSync('README.md', 'utf8');
    for (const k of ['npm install', 'npm run dev', '## Controls', 'OpenStreetMap contributors', 'ODbL', 'NOTICE.md', 'LICENSE']) expect(t).toContain(k);
    expect(existsSync('docs/screenshot.png')).toBe(true);
  });

  it('[REQ-PUB-001] has a NOTICE that names the map data license and the derived file', () => {
    const t = readFileSync('NOTICE.md', 'utf8');
    expect(t).toContain('Open Database License');
    expect(t).toContain('public/data/manhattan.json');
    expect(t).toContain('three.js');
  });

  it('[REQ-PUB-001] declares the license in package.json', () => {
    expect(JSON.parse(readFileSync('package.json', 'utf8')).license).toBe('MIT');
  });
});
