import esbuild from 'esbuild';
import process from 'process';

const isProd = process.argv.includes('--production');

esbuild.build({
  entryPoints: ['main.ts'],
  bundle: true,
  outfile: 'main.js',
  external: ['obsidian'],
  format: 'cjs',
  platform: 'node',
  sourcemap: isProd ? false : 'inline',
  minify: isProd,
  target: 'es2020',
  logLevel: 'info'
}).catch(() => process.exit(1));