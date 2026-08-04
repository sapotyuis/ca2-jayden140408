import { readFile } from 'node:fs/promises';

const readSource = (relativePath) => readFile(
  new URL(`../../${relativePath}`, import.meta.url),
  'utf8',
);

describe('remote libSQL database configuration', () => {
  it('passes an optional auth token to the runtime client while preserving the local default', async () => {
    const source = await readSource('src/db/connection.js');

    expect(source).toMatch(/url:\s*process\.env\.DATABASE_URL\s*\|\|\s*'file:local\.db'/);
    expect(source).toMatch(/authToken:\s*process\.env\.DATABASE_AUTH_TOKEN/);
    expect(source).toMatch(/export const db = drizzle\(client\)/);
  });

  it('selects Turso credentials only for remote database URLs', async () => {
    const source = await readSource('drizzle.config.js');

    expect(source).toMatch(/const databaseUrl = process\.env\.DATABASE_URL \|\| 'file:local\.db';/);
    expect(source).toContain("const isRemoteDatabase = /^(libsql|https?):\\/\\//.test(databaseUrl);");
    expect(source).toMatch(/dialect:\s*isRemoteDatabase\s*\?\s*'turso'\s*:\s*'sqlite'/);
    expect(source).toMatch(/\.\.\.\(isRemoteDatabase && process\.env\.DATABASE_AUTH_TOKEN\s*\?\s*\{ authToken: process\.env\.DATABASE_AUTH_TOKEN \}\s*:\s*\{\}\)/);
  });

  it('only resolves and deletes local file database URLs during seeding', async () => {
    const source = await readSource('src/db/seed.js');

    expect(source).toMatch(/const isFileDatabase = dbUrl\.startsWith\('file:'\);/);
    expect(source).toMatch(/if \(isFileDatabase\) \{\s*const dbPath = dbUrl\.slice\('file:'\.length\);\s*const absoluteDbPath = path\.resolve\(projectRoot, dbPath\);\s*if \(fs\.existsSync\(absoluteDbPath\)\)/s);
  });

  it('documents the optional database token without exposing a secret', async () => {
    const envExample = await readSource('.env.example');

    expect(envExample).toMatch(/^DATABASE_AUTH_TOKEN=$/m);
  });
});
