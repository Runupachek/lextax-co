#!/usr/bin/env node
/* Verify the inlined CSS/JS copies in every lextax.co page match the
   source files in /assets/*. Exits nonzero on drift. Run after any edit
   to assets/style.css, assets/tools.js, or assets/lead-pipeline.js —
   and re-run inline-assets.js to refresh the copies. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const css = fs.readFileSync(path.join(ROOT, 'assets', 'style.css'), 'utf8');
const toolsJs = fs.readFileSync(path.join(ROOT, 'assets', 'tools.js'), 'utf8');
const pipeJs = fs.readFileSync(path.join(ROOT, 'assets', 'lead-pipeline.js'), 'utf8');

const PAGES = [
  'index.html',
  'tools/index.html',
  'tools/refund-estimator.html',
  'tools/business-deduction-finder.html',
  'tools/do-i-need-to-file.html',
  'tools/ready-to-file-checklist.html',
  '404.html',
];

function extract(html, marker) {
  const re = new RegExp(`<style>\\n/\\* Inlined from ${marker}[\\s\\S]*?\\n</style>|<script>\\n/\\* Inlined from ${marker}[\\s\\S]*?\\n</script>`);
  const m = html.match(re);
  if (!m) return null;
  // Strip the wrapper + marker comment line, return the payload.
  return m[0].replace(/^<(style|script)>\n\/\* Inlined from [^*]+\*\/\n/, '').replace(/\n<\/(style|script)>$/, '');
}

let bad = 0;
for (const rel of PAGES) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  const checks = [
    ['assets/style.css', css],
    ['assets/tools.js', toolsJs],
    ['assets/lead-pipeline.js', pipeJs],
  ];
  for (const [name, src] of checks) {
    const got = extract(html, name.replace('/', '\\/'));
    if (got === null) continue; // page doesn't inline this file (e.g. tools/index has no tools.js)
    if (got.trim() !== src.trim()) { console.log(`DRIFT ${rel}: inlined ${name} != source`); bad++; }
  }
  if (!html.includes('Image retry (2026-11-17)')) { console.log(`MISSING image-retry ${rel}`); bad++; }
}
if (bad) { console.log(`${bad} problem(s) — run: node /tmp/lexqa/inline-assets.js (or the repo copy)`); process.exit(1); }
console.log('check-inline: all inlined copies match their sources');
