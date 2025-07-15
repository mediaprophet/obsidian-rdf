const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['main.ts'],
  bundle: true,
  outfile: 'main.js',
  platform: 'node',
  format: 'cjs',
  target: 'es2018',
  sourcemap: true,
  external: [], // Explicitly include all dependencies in the bundle
}).catch(() => process.exit(1));