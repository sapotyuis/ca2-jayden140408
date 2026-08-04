import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('serverless entry point', () => {
  it('imports without starting a listener', () => {
    const result = spawnSync(
      process.execPath,
      ['--input-type=module', '-e', "import('./index.js').then(() => console.log('loaded'))"],
      {
        cwd: projectRoot,
        env: { ...process.env, PORT: '0' },
        encoding: 'utf8',
        timeout: 5000,
      },
    );

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('loaded');
  });
});
