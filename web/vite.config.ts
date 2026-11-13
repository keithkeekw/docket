import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const rootPackage = JSON.parse(
  readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'),
) as { version: string };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The sidebar shows the version without an extra API round-trip.
  define: {
    __APP_VERSION__: JSON.stringify(rootPackage.version),
  },
  server: {
    // NFR-3: reachable from this machine only.
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:9000',
        changeOrigin: false,
      },
    },
  },
});
