#!/usr/bin/env node
/* Inline critical CSS/JS into every lextax.co page (2026-11-17).
   Why: Boss found buttons dead and layout warped on a slow connection.
   Root cause was external-asset load failure: if /assets/style.css stalls,
   the page renders unstyled; if /assets/lead-pipeline.js or tools.js stalls,
   every button on the page does nothing. Inlining makes each page
   self-contained — layout and buttons work even with zero asset loads.
   Source of truth stays in /assets/*; run `node check-inline.js` to verify
   the inlined copies match, and re-run this script after editing a source. */
const fs = require('fs');
const path = require('path');

const ROOT = '/home/hatch/workspace/lextax-co';
const css = fs.readFileSync(path.join(ROOT, 'assets', 'style.css'), 'utf8');
const toolsJs = fs.readFileSync(path.join(ROOT, 'assets', 'tools.js'), 'utf8');
const pipeJs = fs.readFileSync(path.join(ROOT, 'assets', 'lead-pipeline.js'), 'utf8');

const IMG_RETRY = `<script>
/* Image retry (2026-11-17): if an image fails on a slow connection, retry once with a cache-buster so a stalled download never leaves a broken image. */
(function(){function retry(im){var s=im.getAttribute('src');if(!s||s.indexOf('retry=1')>-1)return;im.setAttribute('src',s+(s.indexOf('?')>-1?'&':'?')+'retry=1');}
document.querySelectorAll('img').forEach(function(im){im.addEventListener('error',function(){setTimeout(function(){retry(im);},800);});if(im.complete&&im.naturalWidth===0){setTimeout(function(){retry(im);},800);}});})();
</script>`;

const PAGES = [
  'index.html',
  'tools/index.html',
  'tools/refund-estimator.html',
  'tools/business-deduction-finder.html',
  'tools/do-i-need-to-file.html',
  'tools/ready-to-file-checklist.html',
  '404.html',
];

function stripInlineMarkers(html) {
  // Remove previously inlined blocks (idempotent re-runs).
  html = html.replace(/<style>\n\/\* Inlined from assets\/style\.css[\s\S]*?\n<\/style>/, '<link rel="stylesheet" href="/assets/style.css">');
  html = html.replace(/<script>\n\/\* Inlined from assets\/lead-pipeline\.js[\s\S]*?\n<\/script>/, '<script src="/assets/lead-pipeline.js"></script>');
  html = html.replace(/<script>\n\/\* Inlined from assets\/tools\.js[\s\S]*?\n<\/script>/, '<script src="/assets/tools.js"></script>');
  html = html.replace(IMG_RETRY + '\n', '');
  return html;
}

for (const rel of PAGES) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { console.log(`skip ${rel} (missing)`); continue; }
  let html = stripInlineMarkers(fs.readFileSync(file, 'utf8'));
  let changed = false;
  if (html.includes('<link rel="stylesheet" href="/assets/style.css">')) {
    html = html.replace('<link rel="stylesheet" href="/assets/style.css">', () =>
      `<style>\n/* Inlined from assets/style.css — source of truth; run node check-inline.js to verify. */\n${css}\n</style>`);
    changed = true;
  }
  if (html.includes('<script src="/assets/lead-pipeline.js"></script>')) {
    html = html.replace('<script src="/assets/lead-pipeline.js"></script>', () =>
      `<script>\n/* Inlined from assets/lead-pipeline.js — source of truth; run node check-inline.js to verify. */\n${pipeJs}\n</script>`);
    changed = true;
  }
  if (html.includes('<script src="/assets/tools.js"></script>')) {
    html = html.replace('<script src="/assets/tools.js"></script>', () =>
      `<script>\n/* Inlined from assets/tools.js — source of truth; run node check-inline.js to verify. */\n${toolsJs}\n</script>`);
    changed = true;
  }
  if (!html.includes('Image retry (2026-11-17)') && html.includes('</body>')) {
    html = html.replace('</body>', () => IMG_RETRY + '\n</body>');
    changed = true;
  }
  if (changed) { fs.writeFileSync(file, html); console.log(`inlined ${rel}`); }
  else console.log(`unchanged ${rel}`);
}
console.log('DONE — run: node check-inline.js');
