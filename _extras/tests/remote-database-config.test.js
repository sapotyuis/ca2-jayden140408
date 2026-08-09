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

  it('resets local file databases in place so running servers keep the same database handle', async () => {
    const source = await readSource('src/db/seed.js');

    expect(source).toMatch(/const isFileDatabase = dbUrl\.startsWith\('file:'\);/);
    expect(source).toContain('clearLocalDatabase');
    expect(source).not.toContain('fs.unlinkSync');
    expect(source).toContain("'user_events'");
  });

  it('maps generated primary keys instead of assuming users and catalogue rows start at one', async () => {
    const source = await readSource('src/db/seed.js');

    expect(source).toContain('returning({ user_id: users.user_id, username: users.username })');
    expect(source).toContain('returning({ item_type_id: item_types.item_type_id, item_name: item_types.item_name })');
    expect(source).toContain('userIdByUsername');
    expect(source).toContain('itemTypeIdByName');
    expect(source).not.toContain('const [JAY, OCEAN, RAFTER] = [1, 2, 3];');
    expect(source).not.toMatch(/user_id:\s*(JAY|OCEAN|RAFTER)/);
  });

  it('rolls back clearing and seeding together when a seed insert fails', async () => {
    const source = await readSource('src/db/seed.js');

    expect(source).toContain('await db.transaction(async (tx) => {');
    expect(source).toContain('await clearLocalDatabase(tx);');
    expect(source).toContain('await seedData(tx);');
  });

  it('documents the optional database token without exposing a secret', async () => {
    const envExample = await readSource('.env.example');

    expect(envExample).toMatch(/^DATABASE_AUTH_TOKEN=$/m);
  });
});
