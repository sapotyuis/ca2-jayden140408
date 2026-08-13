import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const publicRoot = new URL('../../public/', import.meta.url);
const file = (relativePath) => new URL(relativePath, publicRoot);

describe('Express-served public frontend', () => {
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
    expect(existsSync(file('js/entries/login.js'))).toBe(true);
    expect(existsSync(file('js/lib/classNames.js'))).toBe(true);
    expect(existsSync(file('assets/pixel-icons/raft.png'))).toBe(true);
    expect(existsSync(new URL('../../frontend/css', import.meta.url))).toBe(false);
    expect(existsSync(new URL('../../frontend/js', import.meta.url))).toBe(false);
  });

  it('maps CSS module property names to stable browser class names', async () => {
    const { createClassNames } = await import('../../public/js/lib/classNames.js');
    const styles = createClassNames('button');
    expect(styles.primary).toBe('button-primary');
    expect(styles.loading).toBe('button-loading');
  });

  it('links direct CSS and module entry scripts from every page', () => {
    for (const page of ['index.html', 'login.html', 'register.html', 'camp.html', 'leaderboard.html', 'voyage.html']) {
      const html = readFileSync(file(`html/${page}`), 'utf8');
      expect(html).toContain('/css/tokens.css');
      expect(html).toContain('/css/global.css');
      expect(html).toMatch(/<script type="module" src="\/js\/entries\/[^"/]+\.js"><\/script>/);
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
    expect(readFileSync(file('js/ocean/createOceanScene.js'), 'utf8')).toContain('../../vendor/three/three.module.js');
  });
});
