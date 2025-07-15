import esbuild from 'esbuild';
import process from 'process';
import fs from 'fs';
import path from 'path';

const isProd = process.argv.includes('--production');

esbuild
  .build({
    entryPoints: [
      { out: 'main', in: 'main.ts' }
    ],
    outdir: '.',
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'es2020',
    sourcemap: isProd ? false : 'both',
    minify: isProd,
    treeShaking: isProd,
    external: ['obsidian', 'child_process'],
    tsconfig: 'tsconfig.json'
  })
  .then(() => {
    // Copy js/ files to dist/js/ for export
    const jsDir = path.join(process.cwd(), 'js');
    const distJsDir = path.join(process.cwd(), 'dist', 'js');
    if (fs.existsSync(jsDir)) {
      fs.mkdirSync(distJsDir, { recursive: true });
      ['faceted-search.js', 'rdf-graph.js', 'rdf-render.js'].forEach(file => {
        const src = path.join(jsDir, file);
        const dest = path.join(distJsDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
          console.log(`Copied ${file} to ${distJsDir}`);
        } else {
          console.warn(`Warning: ${file} not found in ${jsDir}`);
        }
      });
    }
  })
  .catch((error) => {
    console.error('Build failed:', error);
    process.exit(1);
  });