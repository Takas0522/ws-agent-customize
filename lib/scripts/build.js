#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * lib/scripts/build.js
 *
 * esbuild を使って src/ → dist/ にビルドする。
 *  - dist/custom-controls.js       … 開発用 (非ミニファイ)
 *  - dist/custom-controls.min.js   … 本番用 (ミニファイ + sourcemap)
 *  - dist/custom-controls.css      … CSS そのままコピー
 *  - dist/custom-controls.min.css  … CSS をミニファイ
 *
 * 第一引数に `--watch` を渡すとファイル変更を監視して再ビルドする。
 */
'use strict';

const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const banner = `/*! ${pkg.name} v${pkg.version} | (c) ${new Date().getFullYear()} | ${pkg.license} */`;

const watch = process.argv.includes('--watch');

fs.mkdirSync(DIST, { recursive: true });

/** @type {esbuild.BuildOptions[]} */
const targets = [
  // 開発用 JS (非ミニファイ・整形済み)
  {
    entryPoints: [path.join(SRC, 'custom-controls.js')],
    outfile: path.join(DIST, 'custom-controls.js'),
    bundle: false,
    minify: false,
    sourcemap: false,
    target: ['es2017'],
    banner: { js: banner },
    legalComments: 'inline',
    logLevel: 'info'
  },
  // 本番用 JS (ミニファイ + sourcemap)
  {
    entryPoints: [path.join(SRC, 'custom-controls.js')],
    outfile: path.join(DIST, 'custom-controls.min.js'),
    bundle: false,
    minify: true,
    sourcemap: true,
    target: ['es2017'],
    banner: { js: banner },
    legalComments: 'none',
    logLevel: 'info'
  },
  // 開発用 CSS
  {
    entryPoints: [path.join(SRC, 'custom-controls.css')],
    outfile: path.join(DIST, 'custom-controls.css'),
    bundle: false,
    minify: false,
    sourcemap: false,
    loader: { '.css': 'css' },
    logLevel: 'info'
  },
  // 本番用 CSS (ミニファイ)
  {
    entryPoints: [path.join(SRC, 'custom-controls.css')],
    outfile: path.join(DIST, 'custom-controls.min.css'),
    bundle: false,
    minify: true,
    sourcemap: true,
    loader: { '.css': 'css' },
    logLevel: 'info'
  }
];

async function run() {
  if (watch) {
    const ctxs = await Promise.all(targets.map((opts) => esbuild.context(opts)));
    await Promise.all(ctxs.map((c) => c.watch()));
    console.log('[build] watching for changes... (Ctrl+C to stop)');
  } else {
    const start = Date.now();
    await Promise.all(targets.map((opts) => esbuild.build(opts)));
    console.log(`[build] done in ${Date.now() - start}ms`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
