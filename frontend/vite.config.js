import { defineConfig } from 'vite';
import { existsSync, readdirSync, renameSync, rmdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const flattenHtmlOutput = () => ({
  name: 'flatten-html-output',
  closeBundle() {
    const projectDir = dirname(fileURLToPath(import.meta.url));
    const publicDir = resolve(projectDir, '../public');
    const htmlDir = join(publicDir, 'html');
    if (!existsSync(htmlDir)) return;
    for (const fileName of readdirSync(htmlDir)) {
      renameSync(join(htmlDir, fileName), join(publicDir, fileName));
    }
    rmdirSync(htmlDir);
  },
});

// The frontend is its own npm project. In development
// it runs on Vite's dev server and proxies every /api call through to the Express backend
// on :3000, so the browser only ever talks to one origin and there are no CORS surprises.
// The same proxy is set for `vite preview` so a production build can be exercised locally
// against the real API too.
const proxy = {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [flattenHtmlOutput()],
  server: { port: 5173, proxy },
  preview: { port: 4173, proxy },
  build: {
    outDir: '../public',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: 'html/index.html',
        login: 'html/login.html',
        register: 'html/register.html',
        camp: 'html/camp.html',
        leaderboard: 'html/leaderboard.html',
        voyage: 'html/voyage.html',
      },
      output: {
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => assetInfo.name?.endsWith('.css')
          ? 'css/[name]-[hash][extname]'
          : 'assets/[name]-[hash][extname]',
      },
    },
  },
});
