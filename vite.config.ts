import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

/**
 * Generates static route directories (e.g. dist/regions/index.html) during build
 * so that any static server (GitHub Pages, Cloudflare, S3, Nginx) responds with
 * HTTP 200 OK directly on page refresh, eliminating 404 errors for SPA routes.
 */
const generateSpaStaticRoutes = (): Plugin => ({
  name: 'generate-spa-static-routes',
  closeBundle() {
    const distDir = path.resolve(__dirname, 'dist');
    const indexHtmlPath = path.join(distDir, 'index.html');
    if (!fs.existsSync(indexHtmlPath)) return;
    const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

    const routes = [
      'rankings',
      'market-share',
      'financials',
      'decomposition',
      'regions',
      'regional',
      'compare',
      'comparison',
      'guidance',
      'outlook',
      'coverage',
      'sources',
      'history',
      'overview',
      'automotive',
      // OEM company routes
      'company/toyota_motor',
      'company/volkswagen_group',
      'company/hyundai_motor',
      'company/kia',
      'company/general_motors',
      'company/ford',
      'company/stellantis',
      'company/bmw_group',
      'company/mercedes_benz',
      'company/tesla',
      'company/byd',
      'company/geely',
      'company/honda_motor',
      'company/nissan_motor',
      'company/volvo_cars',
      'company/rivian',
    ];

    for (const r of routes) {
      const targetDir = path.join(distDir, r);
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(path.join(targetDir, 'index.html'), indexHtml, 'utf-8');
    }

    // Ensure 404.html also exists in dist (if not already copied from public)
    const dist404 = path.join(distDir, '404.html');
    if (!fs.existsSync(dist404)) {
      fs.writeFileSync(dist404, indexHtml, 'utf-8');
    }
  },
});

export default defineConfig({
  plugins: [react(), generateSpaStaticRoutes()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});

