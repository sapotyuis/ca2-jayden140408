import { readFile } from 'node:fs/promises';

describe('Vercel deployment configuration', () => {
  it('defines the direct public frontend rewrite', async () => {
    const config = JSON.parse(
      await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'),
    );

    expect(config.$schema).toBe('https://openapi.vercel.sh/vercel.json');
    expect(config.buildCommand).toBeUndefined();
    expect(config.installCommand).toBe('npm install');
    expect(config.outputDirectory).toBeNull();
    expect(config.rewrites).toEqual([
      {
        source: '/((?!api(?:/|$)).*)',
        destination: '/html/index.html',
      },
    ]);
  });
});
