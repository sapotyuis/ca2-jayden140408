import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath) => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

describe('voyage camera mode', () => {
  it('keeps the voyage page third-person only', async () => {
    const [page, scene, viewport] = await Promise.all([
      readSource('frontend/js/pages/OceanPage.js'),
      readSource('frontend/js/ocean/createOceanScene.js'),
      readSource('frontend/js/components/oceanViewport.js'),
    ]);
    const source = `${page}\n${scene}\n${viewport}`;

    expect(source).not.toContain('togglePov');
    expect(source).not.toContain('firstPerson');
    expect(source).not.toContain('onPovChange');
    expect(source).not.toContain('povMode');
  });
});
