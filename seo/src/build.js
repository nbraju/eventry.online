#!/usr/bin/env node
'use strict';
/*
 * Eventry SEO page generator.
 *   node src/build.js [--data file] [--out dir] [--prune] [--force] [--dry]
 * Writes ONLY: /<city>/<category>/index.html, /<city>/index.html, /<directoryPath>/index.html,
 * sitemap.xml, robots.txt. Never overwrites a file it did not generate (marker check).
 */
const fs = require('fs');
const path = require('path');
const { readJson, slugify, sha1, lc } = require('./lib/util');
const { normalizeVendors, matchesCategory } = require('./lib/normalize');
const { buildContent } = require('./lib/content');
const { buildGraph } = require('./lib/schema');
const render = require('./lib/render');
const { sitemapXml, robotsTxt, safeWrite, pruneFile } = require('./lib/outputs');

const ROOT = path.resolve(__dirname, '..');
const die = (m, code = 1) => { console.error(`\nERROR: ${m}`); process.exit(code); };

function parseArgs(a) {
  const o = { prune: false, force: false, dry: false };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--prune') o.prune = true;
    else if (a[i] === '--force') o.force = true;
    else if (a[i] === '--dry') o.dry = true;
    else if (a[i] === '--data') o.data = a[++i];
    else if (a[i] === '--out') o.out = a[++i];
    else die(`Unknown argument ${a[i]}`);
  }
  return o;
}

const argv = parseArgs(process.argv.slice(2));
const site = readJson(path.join(ROOT, 'config/site.json'));
const citiesCfg = readJson(path.join(ROOT, 'config/cities.json'));
const catsCfg = readJson(path.join(ROOT, 'config/categories.json'));
const pagesCfg = readJson(path.join(ROOT, 'config/pages.json'));

const defaultOut = path.join(ROOT, 'out');
const outDir = argv.out ? path.resolve(process.cwd(), argv.out) : defaultOut;
const livePath = path.join(ROOT, 'data/vendors.json');
const dataPath = argv.data ? path.resolve(process.cwd(), argv.data) : (fs.existsSync(livePath) ? livePath : path.join(ROOT, 'data/vendors.sample.json'));
if (!fs.existsSync(dataPath)) die(`Vendor data not found: ${dataPath}. Run "npm run fetch" first.`);
if (outDir !== defaultOut && !fs.existsSync(outDir)) die(`Output directory does not exist: ${outDir}`);

const payload = readJson(dataPath);
if (payload._sample && outDir !== defaultOut) die('Sample (fake) vendor data can only be built into ./out for preview. It must never reach the live site.');

// ---- config validation -------------------------------------------------------------------
const SLUG = /^[a-z0-9-]+$/;
const reserved = new Set([...site.reservedPaths, site.directoryPath]);
const cities = {}; const cityIndex = new Map();
for (const [key, c] of Object.entries(citiesCfg)) {
  if (!SLUG.test(key)) die(`City key "${key}" must match ${SLUG}`);
  if (reserved.has(key) && key !== site.directoryPath) die(`City key "${key}" collides with a reserved path`);
  cities[key] = { ...c, key };
  for (const alias of [key, c.name, ...(c.aliases || [])]) cityIndex.set(slugify(alias), key);
}
const cats = {};
for (const [slug, c] of Object.entries(catsCfg)) { if (!SLUG.test(slug)) die(`Category slug "${slug}" invalid`); cats[slug] = { ...c, slug }; }
if (reserved.has(site.directoryPath) && Object.keys(cities).includes(site.directoryPath)) die('directoryPath collides with a city');

// ---- vendors ------------------------------------------------------------------------------
const norm = normalizeVendors(payload, cityIndex, { requireApproved: site.requireApproved });
const warnings = [...norm.warnings];
if (norm.unknownCities.size) warnings.push(`Vendors skipped, city not in config/cities.json: ${[...norm.unknownCities].map(([c, n]) => `${c} (${n})`).join(', ')}`);
if (norm.stats.rows === 0) die('Vendor data has 0 rows. Refusing to build (would wipe the pages).');

const statePath = path.join(ROOT, 'state/manifest.json');
const manifest = fs.existsSync(statePath) ? readJson(statePath) : { meta: {}, pages: {} };
const prevCount = payload._sample ? 0 : (manifest.meta.vendorCount || 0);
if (!argv.force && prevCount >= 10 && norm.vendors.length < prevCount * 0.5) {
  die(`Vendor count fell from ${prevCount} to ${norm.vendors.length}. This looks like a backend/column-mapping failure. Re-run with --force if it is real.`, 2);
}

const byCity = {};
for (const v of norm.vendors) (byCity[v.cityKey] ||= []).push(v);

// ---- decide which pages exist -------------------------------------------------------------
const required = new Set(pagesCfg.required || []);
for (const k of required) { const [c, s] = k.split('/'); if (!cities[c] || !cats[s]) warnings.push(`pages.json "required" entry "${k}" does not match a city/category in config`); }
const pages = [];
for (const city of Object.values(cities)) {
  for (const cat of Object.values(cats)) {
    const list = (byCity[city.key] || []).filter((v) => matchesCategory(v, cat));
    const key = `${city.key}/${cat.slug}`;
    const indexable = list.length >= site.minVendorsToIndex;
    if (!(required.has(key) || indexable)) continue;
    if (!indexable && site.thinPagePolicy === 'skip') continue;
    pages.push({ key, city, cat, vendors: list, indexable, rel: `${key}/index.html`, url: `${site.baseUrl}/${key}/` });
  }
}
const pageByKey = new Map(pages.map((p) => [p.key, p]));

// ---- render -------------------------------------------------------------------------------
const today = new Date().toISOString().slice(0, 10);
const outputsList = []; // {rel,url,html,indexable}

for (const p of pages) {
  const { city, cat } = p;
  const breakdown = cat.match === 'all'
    ? Object.values(cats).filter((c) => c.match !== 'all').map((c) => [c, p.vendors.filter((v) => matchesCategory(v, c)).length]).filter(([, n]) => n > 0).map(([c, n]) => `${n} ${n === 1 ? c.singular : lc(c.label)}`)
    : [];
  const content = buildContent({ site, city, cat, vendors: p.vendors, breakdown });
  const sameCity = pages.filter((q) => q.city.key === city.key && q.cat.slug !== cat.slug && q.indexable).map((q) => ({ label: q.cat.label, href: `/${q.key}/` }));
  const nearby = (city.nearby || []).map((k) => pageByKey.get(`${k}/${cat.slug}`)).filter((q) => q && q.indexable).map((q) => ({ label: cat.label, cityName: q.city.name, href: `/${q.key}/` }));
  const shown = p.vendors.slice(0, site.maxVendorsPerPage);
  const graph = buildGraph({
    site, url: p.url, name: content.h1, description: content.metaDescription,
    breadcrumbs: [{ name: 'Home', url: `${site.baseUrl}/` }, { name: city.name, url: `${site.baseUrl}/${city.key}/` }, { name: cat.label, url: p.url }],
    vendors: shown, faq: content.faq, cityName: city.name, state: city.state
  });
  const html = render.categoryPage({ site, city, cat, vendors: shown, content, url: p.url, related: { sameCity, nearby }, indexable: p.indexable, graph });
  outputsList.push({ rel: p.rel, url: p.url, html, indexable: p.indexable });
}

// city hubs
const hubs = [];
for (const city of Object.values(cities)) {
  const cityPages = pages.filter((p) => p.city.key === city.key && p.indexable);
  const total = (byCity[city.key] || []).length;
  if (!pages.some((p) => p.city.key === city.key)) continue;
  const url = `${site.baseUrl}/${city.key}/`;
  const indexable = total >= site.minVendorsToIndex && cityPages.length > 0;
  const title = `Event Vendors in ${city.name} | ${site.brand}`;
  let description = `Browse event vendors in ${city.name}: ${cityPages.map((p) => lc(p.cat.label)).join(', ') || 'tent houses, caterers, decorators and more'}. Zero commission, contact vendors directly.`;
  if (description.length > 155) description = description.slice(0, 152).replace(/[,\s]+\S*$/, '') + '...';
  const graph = buildGraph({ site, url, name: `Event vendors in ${city.name}`, description, breadcrumbs: [{ name: 'Home', url: `${site.baseUrl}/` }, { name: city.name, url }], vendors: [], faq: [], cityName: city.name, state: city.state });
  const items = cityPages.map((p) => ({ label: p.cat.label, href: `/${p.key}/`, count: p.vendors.length }));
  const html = render.hubPage({ site, city, items, intro: city.intro, url, indexable, graph, title, description });
  outputsList.push({ rel: `${city.key}/index.html`, url, html, indexable });
  hubs.push({ name: city.name, href: `/${city.key}/`, count: total, indexable });
}

// locations directory
if (hubs.length) {
  const url = `${site.baseUrl}/${site.directoryPath}/`;
  const indexable = hubs.some((h) => h.indexable);
  const title = `Event Vendors by City | ${site.brand}`;
  const description = `Find event vendors city by city on ${site.brand}: ${hubs.map((h) => h.name).join(', ')}. Zero commission, contact vendors directly.`.slice(0, 155);
  const graph = buildGraph({ site, url, name: 'Event vendors by city', description, breadcrumbs: [{ name: 'Home', url: `${site.baseUrl}/` }, { name: 'Cities', url }], vendors: [], faq: [], cityName: '', state: '' });
  outputsList.push({ rel: `${site.directoryPath}/index.html`, url, html: render.directoryPage({ site, cities: hubs, url, indexable, graph, title, description }), indexable });
}

// ---- write, track lastmod -----------------------------------------------------------------
const protectedFiles = new Set(site.protectedFiles);
const report = { builtAt: new Date().toISOString(), dataFile: path.relative(ROOT, dataPath), outDir, vendorStats: norm.stats, written: [], unchanged: 0, collisions: [], thin: [], indexable: 0, warnings };
const newManifestPages = {};
const sitemapEntries = site.existingUrls.map((u) => ({ loc: `${site.baseUrl}${u}` }));

for (const o of outputsList) {
  const hash = sha1(o.html);
  const prev = manifest.pages[o.url];
  const lastmod = prev && prev.hash === hash ? prev.lastmod : today;
  const res = safeWrite({ outDir, rel: o.rel, content: o.html, protectedFiles, dry: argv.dry });
  if (res === 'collision' || res === 'protected') { report.collisions.push(o.rel); continue; }
  if (res === 'written') report.written.push(o.rel); else report.unchanged++;
  newManifestPages[o.url] = { rel: o.rel, hash, lastmod, indexable: o.indexable };
  if (o.indexable) { sitemapEntries.push({ loc: o.url, lastmod }); report.indexable++; } else report.thin.push(o.rel);
}

// sitemap.xml and robots.txt (same ownership rule; foreign files are left alone, proposal goes to reports/)
const reportsDir = path.join(ROOT, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });
for (const [rel, content] of [['sitemap.xml', sitemapXml(sitemapEntries)], ['robots.txt', robotsTxt(site)]]) {
  const res = safeWrite({ outDir, rel, content, protectedFiles: new Set(), dry: argv.dry });
  if (res === 'collision') {
    fs.writeFileSync(path.join(reportsDir, `${rel}.proposed`), content);
    report.collisions.push(`${rel} (existing file kept; proposal saved to reports/${rel}.proposed)`);
  } else if (res === 'written') report.written.push(rel); else report.unchanged++;
}

// prune pages we generated before but no longer produce
const pruned = [];
if (argv.prune && !argv.dry) {
  for (const [url, e] of Object.entries(manifest.pages)) if (!newManifestPages[url] && pruneFile(outDir, e.rel)) pruned.push(e.rel);
}
report.pruned = pruned;

if (!argv.dry && !payload._sample) { // previews on fake data never touch persistent state
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify({ meta: { vendorCount: norm.vendors.length, builtAt: report.builtAt }, pages: newManifestPages }, null, 2) + '\n');
  const touched = new Set(['sitemap.xml', 'robots.txt', 'seo/state/manifest.json']);
  for (const o of outputsList) touched.add(o.rel.split('/')[0]);
  fs.writeFileSync(path.join(ROOT, 'state/touched.txt'), [...touched].join('\n') + '\n');
  fs.writeFileSync(path.join(reportsDir, 'last-build.json'), JSON.stringify(report, null, 2));
}

// ---- summary ------------------------------------------------------------------------------
console.log(`Vendors: ${norm.stats.kept} kept of ${norm.stats.rows} rows (${norm.stats.unapproved} unapproved, ${norm.stats.dupes} duplicates)`);
console.log(`Pages: ${outputsList.length} generated, ${report.indexable} indexable (in sitemap), ${report.thin.length} noindex (thin)`);
console.log(`Files: ${report.written.length} written, ${report.unchanged} unchanged${argv.dry ? ' (dry run, nothing written)' : ''}`);
if (report.thin.length) console.log(`Thin pages (fewer than ${site.minVendorsToIndex} vendors, noindex, not in sitemap):\n  ${report.thin.join('\n  ')}`);
if (pruned.length) console.log(`Pruned: ${pruned.join(', ')}`);
if (report.collisions.length) console.log(`SKIPPED, existing file not generated by this tool:\n  ${report.collisions.join('\n  ')}`);
for (const w of warnings) console.log(`WARNING: ${w}`);
