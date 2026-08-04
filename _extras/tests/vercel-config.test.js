import { readFile } from 'node:fs/promises';

describe('Vercel deployment configuration', () => {
  it('defines the exact frontend build output and SPA rewrite', async () => {
    const config = JSON.parse(
      await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'),
    );

    expect(config.$schema).toBe('https://openapi.vercel.sh/vercel.json');
    expect(config.buildCommand).toBe('npm --prefix frontend run build');
    expect(config.installCommand).toBe('npm install && npm --prefix frontend install');
    expect(config.outputDirectory).toBeNull();
    expect(config.functions).toEqual({
      'index.js': {
        includeFiles: 'public/**',
      },
    });
    expect(config.rewrites).toEqual([
      {
        source: '/((?!api(?:/|$)).*)',
        destination: '/index.html',
      },
    ]);
  });
});
