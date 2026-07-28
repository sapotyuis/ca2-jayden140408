import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The frontend is its own npm project (per the CA2 brief's React option). In development
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
  plugins: [react()],
  server: { port: 5173, proxy },
  preview: { port: 4173, proxy },
});
