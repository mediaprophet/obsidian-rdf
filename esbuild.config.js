const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['main.ts'],
  bundle: true,
  outfile: 'main.js',
  platform: 'node',
  format: 'cjs',
  target: 'es2018',
  sourcemap: true,
  treeShaking: true,
  minify: false,
  external: ['obsidian']
}).catch(() => process.exit(1));