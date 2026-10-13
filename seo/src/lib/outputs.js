'use strict';
const fs = require('fs');
const path = require('path');
const { MARKER, esc } = require('./util');

const AI_AGENTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended'];

function sitemapXml(entries) {
  const rows = entries.map((e) => `  <url><loc>${esc(e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- ${MARKER} -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>\n`;
}

function robotsTxt(site) {
  const lines = [`# ${MARKER}`, 'User-agent: *', 'Allow: /'];
  for (const d of site.robots.extraDisallow || []) lines.push(`Disallow: ${d}`);
  lines.push('', '# AI and answer-engine crawlers');
  for (const a of AI_AGENTS) lines.push(`User-agent: ${a}`);
  lines.push(site.robots.allowAiCrawlers ? 'Allow: /' : 'Disallow: /');
  lines.push('', `Sitemap: ${site.baseUrl}/sitemap.xml`, '');
  return lines.join('\n');
}

/**
 * Never overwrites a file we did not generate. Ownership = the marker string inside the file.
 * Returns 'written' | 'unchanged' | 'collision' | 'protected'.
 */
function safeWrite({ outDir, rel, content, protectedFiles, dry }) {
  if (protectedFiles.has(rel)) return 'protected';
  const abs = path.join(outDir, rel);
  if (fs.existsSync(abs)) {
    const cur = fs.readFileSync(abs, 'utf8');
    if (!cur.includes(MARKER)) return 'collision';
    if (cur === content) return 'unchanged';
  }
  if (!dry) { fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, content); }
  return 'written';
}

function pruneFile(outDir, rel) {
  const abs = path.join(outDir, rel);
  if (!fs.existsSync(abs) || !fs.readFileSync(abs, 'utf8').includes(MARKER)) return false;
  fs.unlinkSync(abs);
  let dir = path.dirname(abs);
  while (dir !== outDir && fs.existsSync(dir) && fs.readdirSync(dir).length === 0) { fs.rmdirSync(dir); dir = path.dirname(dir); }
  return true;
}

module.exports = { sitemapXml, robotsTxt, safeWrite, pruneFile };
