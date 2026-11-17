import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }

          const htmlPath = path.resolve(distDir, 'index.html');
          const bundledAssetsDir = path.resolve(distDir, 'assets');
          if (!fs.existsSync(htmlPath) || !fs.existsSync(bundledAssetsDir)) {
            return;
          }

          let html = fs.readFileSync(htmlPath, 'utf8');

          html = html.replace(
            /<script\b(?=[^>]*\bsrc="([^"]+)")[^>]*><\/script>/g,
            (tag, src: string) => {
              const match = src.match(/(?:^|\/)(index-[^/]+\.js)(?:[?#].*)?$/);
              if (!match) return tag;

              const bundlePath = path.resolve(bundledAssetsDir, match[1]);
              if (!fs.existsSync(bundlePath)) {
                throw new Error(`Missing JavaScript bundle referenced by index.html: ${bundlePath}`);
              }

              const source = fs.readFileSync(bundlePath, 'utf8').replace(/<\/script/gi, '<\\/script');
              return `<script type="module">${source}</script>`;
            },
          );
          html = html.replace(
            /<link\b(?=[^>]*\bhref="([^"]+)")[^>]*>/g,
            (tag, href: string) => {
              const match = href.match(/(?:^|\/)(index-[^/]+\.css)(?:[?#].*)?$/);
              if (!match) return tag;

              const bundlePath = path.resolve(bundledAssetsDir, match[1]);
              if (!fs.existsSync(bundlePath)) {
                throw new Error(`Missing CSS bundle referenced by index.html: ${bundlePath}`);
              }

              return `<style>${fs.readFileSync(bundlePath, 'utf8')}</style>`;
            },
          );
          fs.writeFileSync(htmlPath, html);

          for (const file of fs.readdirSync(bundledAssetsDir)) {
            if (/^index-.+\.(?:js|css)$/.test(file)) {
              fs.unlinkSync(path.resolve(bundledAssetsDir, file));
            }
          }
          if (fs.readdirSync(bundledAssetsDir).length === 0) {
            fs.rmdirSync(bundledAssetsDir);
          }
        },
      },
    ],
    build: {
      emptyOutDir: true,
      minify: false,
      cssMinify: false,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
