import esbuild from 'esbuild';
import process from 'process';

const isProd = process.argv.includes('--production');

esbuild
  .build({
    entryPoints: ['main.ts', 'libs/markdown-ld/src/index.ts'],
    outdir: 'dist',
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'es2020',
    sourcemap: isProd ? false : 'both',
    minify: isProd,
    treeShaking: isProd,
    external: ['obsidian'],
    tsconfig: 'tsconfig.json'
  })
  .catch(() => process.exit(1));