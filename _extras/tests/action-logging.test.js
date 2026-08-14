import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath) => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

describe('action diagnostic logging', () => {
  it('marks authentication controller logs with the AUTH scope', async () => {
    const source = await readSource('src/controllers/authController.js');
    expect(source).toContain('[AUTH]');
  });

  it('marks game-action controller logs with the GAME scope', async () => {
    const source = await readSource('src/controllers/playerController.js');
    expect(source).toContain('[GAME]');
  });
});
