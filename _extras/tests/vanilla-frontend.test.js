import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const root = new URL('../../public/', import.meta.url);

describe('vanilla frontend architecture', () => {
  it('redirects signed-out users before rendering protected pages', () => {
    const app = readFileSync(new URL('js/app.js', root), 'utf8');
    const guardIndex = app.indexOf("if (protectedPage && !auth.getState().isAuthed)");
    const worldClockIndex = app.indexOf('const worldClock = createWorldClockStore(auth);');
    const renderIndex = app.indexOf('renderPage({ root, auth, toast, worldClock });');

    expect(guardIndex).toBeGreaterThanOrEqual(0);
    expect(app).toContain("window.location.replace('/login');");
    expect(guardIndex).toBeLessThan(worldClockIndex);
    expect(guardIndex).toBeLessThan(renderIndex);
  });

  it('provides the expected root npm start command', () => {
    const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

    expect(packageJson.scripts.start).toBe('node index.js');
  });

  it('uses the vanilla entrypoint and removes the React runtime', () => {
    const app = readFileSync(new URL('js/app.js', root), 'utf8');

    expect(existsSync(new URL('package.json', root))).toBe(false);
    expect(app).toContain('createPageApp');
    expect(readFileSync(new URL('html/index.html', root), 'utf8')).toContain('/js/page-startup/login.js');
    expect(existsSync(new URL('js/main.jsx', root))).toBe(false);
  });

  it('has separate HTML entrypoints for each frontend screen', () => {
    for (const page of ['login.html', 'register.html', 'camp.html', 'leaderboard.html', 'voyage.html']) {
      expect(existsSync(new URL(`html/${page}`, root))).toBe(true);
      expect(readFileSync(new URL(`html/${page}`, root), 'utf8')).toContain('<div id="root"></div>');
    }
    expect(readFileSync(new URL('html/camp.html', root), 'utf8')).toContain('/js/page-startup/camp.js');
    expect(readFileSync(new URL('html/voyage.html', root), 'utf8')).toContain('/js/page-startup/voyage.js');
  });

  it('passes the shared world clock into the auth shell using one consistent name', () => {
    const authShell = readFileSync(new URL('js/screens/accountLayout.js', root), 'utf8');
    const loginPage = readFileSync(new URL('js/screens/loginPage.js', root), 'utf8');
    const registerPage = readFileSync(new URL('js/screens/registerPage.js', root), 'utf8');

    expect(authShell).toMatch(/renderAuthShell = \(\{ root, auth, worldClockStore,/);
    expect(authShell).toContain('worldClock(worldClockStore.getState())');
    expect(loginPage).toContain('root, auth, worldClockStore: worldClock,');
    expect(registerPage).toContain('root, auth, worldClockStore: worldClock,');
  });
});
