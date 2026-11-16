const http = require('http');
const fs = require('fs');
const path = require('path');
const root = __dirname;
const types = { '.html': 'text/html', '.xml': 'application/xml', '.txt': 'text/plain', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const routes = {
  '/gig-workers': '/gig-workers.html',
  '/tools': '/tools/index.html',
  '/tools/refund-estimator': '/tools/refund-estimator.html',
  '/tools/gig-deduction-finder': '/tools/gig-deduction-finder.html',
  '/tools/do-i-need-to-file': '/tools/do-i-need-to-file.html',
  '/tools/ready-to-file-checklist': '/tools/ready-to-file-checklist.html'
};
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  if (routes[p]) p = routes[p];
  else if (p === '/') p = '/index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});
const port = process.env.PORT || 3000;
server.listen(port, () => console.log('lextax.co serving on ' + port));
