import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const publicRoot = new URL('../../public/', import.meta.url);
const file = (relativePath) => new URL(relativePath, publicRoot);

describe('Express-served public frontend', () => {
  it('defines clean gameplay page paths in Express', () => {
    const serverSource = readFileSync(new URL('../../index.js', import.meta.url), 'utf8');
    for (const [path, page] of [
      ['/camp', 'camp.html'],
      ['/leaderboard', 'leaderboard.html'],
      ['/voyage', 'voyage.html'],
      ['/login', 'login.html'],
      ['/register', 'register.html'],
    ]) {
      expect(serverSource).toContain(`app.get('${path}'`);
      expect(serverSource).toContain(`'${page}'`);
    }
  });

  it('keeps all page documents organized under public/html', () => {
    for (const page of ['index.html', 'login.html', 'register.html', 'camp.html', 'leaderboard.html', 'voyage.html']) {
      expect(existsSync(file(`html/${page}`))).toBe(true);
    }
    expect(existsSync(file('index.html'))).toBe(false);
    expect(existsSync(new URL('../../frontend/html', import.meta.url))).toBe(false);
  });

  it('keeps browser source files and static assets under public', () => {
    expect(existsSync(file('css/global.css'))).toBe(true);
    expect(existsSync(file('css/tokens.css'))).toBe(true);
    expect(existsSync(file('js/page-startup/login.js'))).toBe(true);
    expect(existsSync(file('js/helpers/cssClassNames.js'))).toBe(true);
    expect(existsSync(file('assets/pixel-icons/raft.png'))).toBe(true);
    expect(existsSync(new URL('../../frontend/css', import.meta.url))).toBe(false);
    expect(existsSync(new URL('../../frontend/js', import.meta.url))).toBe(false);
  });

  it('maps CSS module property names to stable browser class names', async () => {
    const { createClassNames } = await import('../../public/js/helpers/cssClassNames.js');
    const styles = createClassNames('button');
    expect(styles.lantern).toBe('button-lantern');
    expect(styles.ghost).toBe('button-ghost');
  });

  it('links direct CSS and module entry scripts from every page', () => {
    for (const page of ['index.html', 'login.html', 'register.html', 'camp.html', 'leaderboard.html', 'voyage.html']) {
      const html = readFileSync(file(`html/${page}`), 'utf8');
      expect(html).toContain('/css/tokens.css');
      expect(html).toContain('/css/global.css');
      expect(html).toMatch(/<script type="module" src="\/js\/page-startup\/[^"/]+\.js"><\/script>/);
    }
    expect(readFileSync(file('css/Button.module.css'), 'utf8')).toContain('.button-btn');
    expect(readFileSync(file('css/Button.module.css'), 'utf8')).not.toMatch(/\.btn\s*\{/);
  });

  it('keeps the Three.js runtime local to public/vendor', () => {
    for (const relativePath of [
      'vendor/three/three.module.js',
      'vendor/three/examples/jsm/postprocessing/EffectComposer.js',
      'vendor/three/examples/jsm/postprocessing/RenderPass.js',
      'vendor/three/examples/jsm/postprocessing/UnrealBloomPass.js',
      'vendor/three/examples/jsm/postprocessing/OutputPass.js',
    ]) {
      expect(existsSync(file(relativePath))).toBe(true);
    }
    expect(readFileSync(file('js/voyage/voyageWorld.js'), 'utf8')).toContain('../../vendor/three/three.module.js');
  });
});
