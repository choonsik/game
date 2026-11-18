import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const wf = readFileSync('.github/workflows/deploy.yml', 'utf8');

describe('deployment pipeline', () => {
  it('[REQ-DEP-002] runs the full verification before the deploy job', () => {
    expect(wf).toContain('npm run verify');
    expect(wf).toMatch(/deploy:[\s\S]*needs: verify/);
  });

  it('[REQ-DEP-002] deploys only from main and not from a pull request', () => {
    expect(wf).toContain("github.ref == 'refs/heads/main'");
    expect(wf).toContain("github.event_name != 'pull_request'");
  });

  it('[REQ-DEP-001] builds with the repository name as the base path', () => {
    expect(wf).toContain('BASE_PATH: /${{ github.event.repository.name }}/');
    expect(readFileSync('vite.config.ts', 'utf8')).toContain('process.env.BASE_PATH');
  });

  it('[REQ-DEP-001] reads the map data through the base URL and not through a root path', () => {
    const main = readFileSync('src/main.ts', 'utf8');
    expect(main).toContain('import.meta.env.BASE_URL');
    expect(main).not.toMatch(/loadCity\(['"]\//);
  });
});
