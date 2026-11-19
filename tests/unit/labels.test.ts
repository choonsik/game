import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { labelName, type CityData } from '../../src/city';
import stages from '../../src/stages.json';

const load = (file: string): CityData => JSON.parse(readFileSync(`public/data/${file}`, 'utf8'));

describe('building label names', () => {
  it('[REQ-LBL-005] removes accents and changes typographic marks to ASCII', () => {
    expect(labelName('Hôtel Le Marois')).toBe('Hotel Le Marois');
    expect(labelName('Saint Patrick’s Cathedral')).toBe("Saint Patrick's Cathedral");
    expect(labelName('Chambers Street–World Trade Center')).toBe('Chambers Street-World Trade Center');
    expect(labelName('Empire State Building')).toBe('Empire State Building');
  });

  it('[REQ-LBL-005] hides a name that is not in Latin letters', () => {
    expect(labelName('工学院大学新宿キャンパス')).toBeUndefined();
    expect(labelName('山寺のHooters')).toBeUndefined();
    expect(labelName(undefined)).toBeUndefined();
    expect(labelName('   ')).toBeUndefined();
  });

  it('[REQ-LBL-005] gives only ASCII label names in all stages, and each stage keeps labels', () => {
    for (const s of stages) {
      const names = load(s.file).buildings.map(b => labelName(b.n)).filter((n): n is string => !!n);
      expect(names.length, s.id).toBeGreaterThan(50);
      for (const n of names) expect(n, s.id).toMatch(/^[\x20-\x7e]+$/);
    }
  });
});
