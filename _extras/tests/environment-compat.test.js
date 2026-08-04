import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const entryPoint = new URL('../../index.js', import.meta.url).href;
const environmentModule = new URL('../../src/config/environment.js', import.meta.url).href;

describe('legacy Vercel environment names', () => {
  it('maps existing legacy names to the canonical runtime names', () => {
    const testEnvironment = {
      ...process.env,
      VERCEL: '1',
      turso_db_url: 'libsql://example.turso.io',
      token: 'database-token',
      jwt_secret_key: 'jwt-secret',
    };
    delete testEnvironment.DATABASE_URL;
    delete testEnvironment.DATABASE_AUTH_TOKEN;
    delete testEnvironment.JWT_SECRET_KEY;

    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
          const { existsSync, mkdtempSync } = await import('node:fs');
          const { join } = await import('node:path');
          const { tmpdir } = await import('node:os');
          process.chdir(mkdtempSync(tmpdir() + '/castaway-env-'));
          await import(${JSON.stringify(entryPoint)});
          console.log(JSON.stringify({
            databaseUrl: process.env.DATABASE_URL,
            databaseAuthToken: process.env.DATABASE_AUTH_TOKEN,
            jwtSecretKey: process.env.JWT_SECRET_KEY,
            localDbExists: existsSync(join(process.cwd(), 'local.db')),
          }));
        `,
      ],
      {
        cwd: projectRoot,
        env: testEnvironment,
        encoding: 'utf8',
      },
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      databaseUrl: 'libsql://example.turso.io',
      databaseAuthToken: 'database-token',
      jwtSecretKey: 'jwt-secret',
      localDbExists: false,
    });
  });

  it('preserves explicitly configured canonical names', () => {
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
          await import(${JSON.stringify(environmentModule)});
          console.log(JSON.stringify({
            databaseUrl: process.env.DATABASE_URL,
            databaseAuthToken: process.env.DATABASE_AUTH_TOKEN,
            jwtSecretKey: process.env.JWT_SECRET_KEY,
          }));
        `,
      ],
      {
        cwd: projectRoot,
        env: {
          ...process.env,
          DATABASE_URL: '',
          DATABASE_AUTH_TOKEN: '',
          JWT_SECRET_KEY: '',
          VERCEL: '1',
          turso_db_url: 'libsql://stale.turso.io',
          token: 'stale-database-token',
          jwt_secret_key: 'stale-jwt-secret',
        },
        encoding: 'utf8',
      },
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      databaseUrl: '',
      databaseAuthToken: '',
      jwtSecretKey: '',
    });
  });
});
