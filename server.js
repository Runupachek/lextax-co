const http = require('http');
const fs = require('fs');
const path = require('path');
const root = __dirname;
const types = { '.html': 'text/html', '.xml': 'application/xml', '.txt': 'text/plain', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp' };
const redirects = {
  // Old tool URL keeps working: renamed 2026-11-17 by Boss's order
  // (Gig Worker Deduction Finder -> Business Deduction Finder).
  '/tools/gig-deduction-finder': '/tools/business-deduction-finder'
};
const routes = {
  '/tools': '/tools/index.html',
  '/tools/refund-estimator': '/tools/refund-estimator.html',
  '/tools/business-deduction-finder': '/tools/business-deduction-finder.html',
  '/tools/do-i-need-to-file': '/tools/do-i-need-to-file.html',
  '/tools/ready-to-file-checklist': '/tools/ready-to-file-checklist.html'
};
// Only public site files are served: root pages, /assets/*, /tools/*.
// Everything else (server.js, package.json, Dockerfile, .git, design/) 404s.
const rootFiles = new Set(['/index.html', '/sitemap.xml', '/robots.txt', '/404.html']);
function send404(res) {
  fs.readFile(path.join(root, '404.html'), (err, data) => {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(err ? 'Not found' : data);
  });
}
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  if (redirects[p]) { res.writeHead(301, { 'Location': redirects[p] }); return res.end(); }
  if (routes[p]) p = routes[p];
  else if (p === '/') p = '/index.html';
  const allowed = rootFiles.has(p) || p.startsWith('/assets/') || p.startsWith('/tools/');
  const file = path.join(root, p);
  if (!allowed || !file.startsWith(root) || !types[path.extname(file)]) {
    return send404(res);
  }
  fs.readFile(file, (err, data) => {
    if (err) { return send404(res); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': p.startsWith('/assets/') ? 'public, max-age=86400' : 'public, max-age=3600' });
    res.end(data);
  });
});
const port = process.env.PORT || 3000;
server.listen(port, () => console.log('lextax.co serving on ' + port));
