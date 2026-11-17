// SEO discoverability tests for lextax.co — node:test, no dependencies.
// Spawns server.js on a scratch port and asserts first-byte SEO facts per route.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 3199;
const BASE = `http://127.0.0.1:${PORT}`;
let child;

function get(p) {
  return new Promise((resolve, reject) => {
    http.get(BASE + p, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    }).on('error', reject);
  });
}

function ldJsonBlocks(html) {
  const out = [];
  const re = /<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/g;
  let m;
  while ((m = re.exec(html))) out.push(JSON.parse(m[1]));
  return out;
}

function meta(html, name) {
  const m = html.match(new RegExp(`<meta name="${name}" content="([^"]*)">`));
  return m ? m[1] : null;
}

function og(html, prop) {
  const m = html.match(new RegExp(`<meta property="${prop}" content="([^"]*)">`));
  return m ? m[1] : null;
}

const PAGES = [
  { path: '/', title: 'Lexurious Taxes — Less Taxes, More Returns in 2027 | Alexis Bryant | Atlanta Tax Preparation', h1: 'Less Taxes,', canonical: 'https://lextax.co/' },
  { path: '/tools', title: 'Free Tax Tools — Refund Estimator, Deduction Finder & More | Lexurious Taxes', h1: 'Free Tax Tools', canonical: 'https://lextax.co/tools' },
  { path: '/tools/refund-estimator', title: 'Free Refund Estimator — Less Taxes, More Returns in 2027 | Lexurious Taxes', h1: 'Refund Estimator', canonical: 'https://lextax.co/tools/refund-estimator' },
  { path: '/tools/gig-deduction-finder', title: 'Gig Worker Deduction Finder — Lyft, Uber, DoorDash | Lexurious Taxes Atlanta', h1: 'Gig-Worker Deduction Finder', canonical: 'https://lextax.co/tools/gig-deduction-finder' },
  { path: '/tools/do-i-need-to-file', title: 'Do I Need to File Taxes? Free Checker | Lexurious Taxes Atlanta', h1: 'Do I Need to File?', canonical: 'https://lextax.co/tools/do-i-need-to-file' },
  { path: '/tools/ready-to-file-checklist', title: 'Ready to File Checklist — 13 Items | Lexurious Taxes Atlanta', h1: 'Ready to File Checklist', canonical: 'https://lextax.co/tools/ready-to-file-checklist' },
];

const TOOL_APPS = {
  '/tools/refund-estimator': 'Refund Estimator',
  '/tools/gig-deduction-finder': 'Gig Worker Deduction Finder',
  '/tools/do-i-need-to-file': 'Do I Need to File?',
  '/tools/ready-to-file-checklist': 'Ready to File Checklist',
};

test.before(async () => {
  child = spawn('node', ['server.js'], { cwd: __dirname, env: { ...process.env, PORT: String(PORT) } });
  for (let i = 0; i < 30; i++) {
    try { const r = await get('/robots.txt'); if (r.status === 200) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('server did not come up');
});

test.after(() => { child.kill(); });

for (const page of PAGES) {
  test(`${page.path}: first-byte SEO (title, h1, canonical, OG/Twitter, one h1)`, async () => {
    const r = await get(page.path);
    assert.equal(r.status, 200);
    assert.match(r.body, new RegExp(`<title>${page.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</title>`));
    assert.ok(meta(r.body, 'description'), 'meta description present');
    assert.ok(r.body.includes(`<link rel="canonical" href="${page.canonical}">`), 'self-referencing canonical');
    assert.equal(og(r.body, 'og:url'), page.canonical);
    assert.ok(og(r.body, 'og:title'), 'og:title present');
    assert.ok(og(r.body, 'og:description'), 'og:description present');
    assert.ok(og(r.body, 'og:image'), 'og:image present');
    assert.equal(og(r.body, 'og:image:width'), '2192');
    assert.equal(og(r.body, 'og:image:height'), '1152');
    assert.ok(meta(r.body, 'twitter:card'), 'twitter:card present');
    assert.ok(r.body.includes('<h1'), 'h1 present in first-byte HTML');
    assert.equal((r.body.match(/<h1/g) || []).length, 1, 'exactly one h1');
    assert.ok(r.body.includes(page.h1), `h1 text ${page.h1}`);
    assert.ok(!r.body.toLowerCase().includes('iminewise'), 'no iminewise mention (lane separation)');
  });
}

test('homepage: Organization + WebSite JSON-LD', async () => {
  const r = await get('/');
  const blocks = ldJsonBlocks(r.body);
  const types = blocks.flatMap((b) => (Array.isArray(b['@type']) ? b['@type'] : [b['@type']]));
  assert.ok(types.includes('Organization'), 'Organization type present');
  assert.ok(types.includes('AccountingService'), 'AccountingService type kept');
  assert.ok(types.includes('WebSite'), 'WebSite type present');
  const site = blocks.find((b) => b['@type'] === 'WebSite');
  assert.equal(site.url, 'https://lextax.co/');
  assert.equal(site.publisher['@id'], 'https://lextax.co/#business');
});

for (const [path, name] of Object.entries(TOOL_APPS)) {
  test(`${path}: SoftwareApplication JSON-LD for the tool itself`, async () => {
    const r = await get(path);
    const blocks = ldJsonBlocks(r.body);
    const app = blocks.find((b) => b['@type'] === 'SoftwareApplication');
    assert.ok(app, 'SoftwareApplication block present');
    assert.equal(app.name, name);
    assert.equal(app.url, `https://lextax.co${path}`);
    assert.equal(app.applicationCategory, 'FinanceApplication');
    assert.equal(app.operatingSystem, 'Web');
    assert.equal(app.offers.price, '0');
    assert.equal(app.offers.priceCurrency, 'USD');
    assert.equal(app.description, meta(r.body, 'description'), 'app description matches meta description');
    assert.ok(!blocks.some((b) => b['@type'] === 'AccountingService'), 'no duplicated business block on tool page');
  });
}

test('/tools: ItemList JSON-LD of the four tools', async () => {
  const r = await get('/tools');
  const blocks = ldJsonBlocks(r.body);
  const list = blocks.find((b) => b['@type'] === 'ItemList');
  assert.ok(list, 'ItemList block present');
  assert.equal(list.itemListElement.length, 4);
  assert.deepEqual(list.itemListElement.map((i) => i.item.name), Object.values(TOOL_APPS));
});

test('sitemap: 6 public URLs, lastmod 2026-11-17, nothing backstage', async () => {
  const r = await get('/sitemap.xml');
  assert.equal(r.status, 200);
  const locs = [...r.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.equal(locs.length, 6);
  for (const p of ['/', '/tools', '/tools/refund-estimator', '/tools/gig-deduction-finder', '/tools/do-i-need-to-file', '/tools/ready-to-file-checklist']) {
    assert.ok(locs.includes(`https://lextax.co${p}`), `sitemap has ${p}`);
  }
  assert.ok(!/<lastmod>2026-11-14/.test(r.body), 'no stale lastmod');
  assert.equal((r.body.match(/<lastmod>2026-11-17<\/lastmod>/g) || []).length, 6);
  assert.ok(!/admin|api|backstage|login|dashboard/i.test(r.body), 'no backstage URLs in sitemap');
});

test('robots: allow public, Sitemap directive', async () => {
  const r = await get('/robots.txt');
  assert.equal(r.status, 200);
  assert.ok(r.body.includes('Allow: /'));
  assert.ok(r.body.includes('Sitemap: https://lextax.co/sitemap.xml'));
});

test('404: branded page, noindex, 404 status', async () => {
  const r = await get('/no-such-page');
  assert.equal(r.status, 404);
  assert.ok(r.body.includes('That page isn\'t here.'));
  assert.ok(r.body.includes('noindex, nofollow'));
  assert.ok(r.body.includes('href="/"'), '404 links home');
});

test('source files are not served', async () => {
  for (const p of ['/server.js', '/package.json', '/Dockerfile', '/.git/config', '/design/gig-workers-page-design-2026-11-15.md', '/README.md']) {
    const r = await get(p);
    assert.equal(r.status, 404, `${p} must 404`);
  }
});

test('static assets still serve', async () => {
  for (const p of ['/assets/style.css', '/assets/tools.js', '/assets/lead-pipeline.js', '/assets/share-tax.jpg']) {
    const r = await get(p);
    assert.equal(r.status, 200, `${p} must 200`);
  }
});
