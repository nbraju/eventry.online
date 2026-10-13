'use strict';
const { MARKER, esc, jsonLd, fill } = require('./util');

const CSS = `
:root{--indigo:#2A2868;--ink:#191933;--marigold:#F4A300;--mist:#F6F5FB;--line:#DAD8EA;--leaf:#2E6B4D;--muted:#55557A}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;font:1rem/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:#fff}
.wrap{max-width:62rem;margin:0 auto;padding:0 1.25rem}
.skip{position:absolute;left:-999px}.skip:focus{left:1rem;top:1rem;background:#fff;padding:.5rem 1rem;z-index:9}
a{color:var(--leaf)}
a:focus-visible,summary:focus-visible,.btn:focus-visible{outline:3px solid var(--marigold);outline-offset:2px}
.top{background:var(--indigo);color:#fff}
.top .wrap{display:flex;gap:1rem;align-items:center;justify-content:space-between;flex-wrap:wrap;padding-top:.9rem;padding-bottom:.9rem}
.brand,h1,h2,h3{font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;line-height:1.2}
.brand{font-weight:700;font-size:1.35rem;color:#fff;text-decoration:none}
.crumbs{font-size:.9rem;margin:0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:.35rem}
.crumbs li+li::before{content:"/";margin-right:.35rem;opacity:.6}
.crumbs a{color:#fff;text-underline-offset:3px}
.hero{background:var(--indigo);color:#fff;padding:2.2rem 0 2.4rem}
h1{font-size:clamp(1.9rem,4.6vw,3.1rem);margin:.2rem 0 .8rem;max-width:24ch}
.lead{font-size:1.1rem;max-width:44rem;margin:0 0 1.4rem;color:#E6E4FA}
.ctas{display:flex;gap:.75rem;flex-wrap:wrap}
.btn{display:inline-block;padding:.65rem 1.1rem;border-radius:6px;border:2px solid currentColor;text-decoration:none;font-weight:600;color:#fff}
.btn.primary{background:var(--marigold);border-color:var(--marigold);color:var(--ink)}
.btn.small{padding:.4rem .8rem;font-size:.92rem;color:var(--leaf);border-color:var(--leaf);white-space:nowrap}
.garland{height:22px;background:
radial-gradient(circle at 12px 10px,#C25E00 0 2.5px,transparent 3px) 0 0/24px 22px repeat-x,
radial-gradient(circle at 12px 10px,#E88A00 0 5.5px,transparent 6px) 0 0/24px 22px repeat-x,
radial-gradient(circle at 12px 10px,var(--marigold) 0 8px,transparent 8.5px) 0 0/24px 22px repeat-x,
linear-gradient(var(--marigold),var(--marigold)) 0 0/100% 2px no-repeat}
main{padding-bottom:3rem}
section.s{margin:2.4rem 0}
h2{font-size:1.5rem;margin:0 0 .8rem}h3{font-size:1.1rem;margin:0 0 .15rem}
.copy p,.copy li{max-width:46rem}
.vendors{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}
.vendor{display:flex;gap:1rem;justify-content:space-between;align-items:flex-start;padding:1rem 0;border-bottom:1px solid var(--line)}
.vendor p{margin:0;font-size:.95rem;color:var(--muted)}
.uid{font-size:.8rem}
.empty{background:var(--mist);border-left:4px solid var(--marigold);padding:1rem 1.25rem;max-width:46rem}
.tips{padding-left:1.2rem}.tips li{margin:.45rem 0}
details{border-bottom:1px solid var(--line);padding:.8rem 0;max-width:46rem}
summary{cursor:pointer;font-weight:600}details p{margin:.6rem 0 0}
.links{display:grid;grid-template-columns:repeat(auto-fill,minmax(16rem,1fr));gap:.4rem 1.5rem;list-style:none;padding:0;margin:0}
footer{background:var(--mist);border-top:1px solid var(--line);padding:1.5rem 0;font-size:.92rem;color:var(--muted)}
@media (max-width:560px){.vendor{flex-direction:column}}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}
`.replace(/\n/g, '');

function head({ site, title, description, url, indexable }) {
  const og = [
    ['og:type', 'website'], ['og:site_name', site.brand], ['og:title', title], ['og:description', description],
    ['og:url', url], ['og:locale', site.locale.replace('-', '_')]
  ];
  if (site.ogImage) og.push(['og:image', site.ogImage]);
  return `<meta charset="utf-8">
<!-- ${MARKER} -->
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta name="robots" content="${indexable ? 'index,follow,max-image-preview:large' : 'noindex,follow'}">
<meta name="theme-color" content="${site.themeColor}">
${og.map(([p, c]) => `<meta property="${p}" content="${esc(c)}">`).join('\n')}
<meta name="twitter:card" content="summary">
<style>${CSS}</style>`;
}

function shell({ site, headHtml, graph, crumbs, h1, lead, ctas, body }) {
  const crumbHtml = crumbs.map((c, i) => (i === crumbs.length - 1 ? `<li aria-current="page">${esc(c.name)}</li>` : `<li><a href="${esc(c.href)}">${esc(c.name)}</a></li>`)).join('');
  return `<!doctype html>
<html lang="${site.locale}">
<head>
${headHtml}
<script type="application/ld+json">${jsonLd(graph)}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="wrap"><a class="brand" href="/">${esc(site.brand)}</a><nav aria-label="Breadcrumb"><ol class="crumbs">${crumbHtml}</ol></nav></div></header>
<section class="hero"><div class="wrap"><h1>${esc(h1)}</h1><p class="lead">${esc(lead)}</p><div class="ctas">${ctas}</div></div></section>
<div class="garland" aria-hidden="true"></div>
<main id="main" class="wrap">
${body}
</main>
<footer><div class="wrap"><p>${esc(site.brand)} is an event vendor directory with zero commission. <a href="${esc(site.listVendorUrl)}">List your business</a>. <a href="/${esc(site.directoryPath)}/">All cities</a>.</p></div></footer>
</body>
</html>
`;
}

const defaultCtas = (site, browseLabel) =>
  `<a class="btn primary" href="${esc(site.appUrl)}">${esc(browseLabel)}</a><a class="btn" href="${esc(site.listVendorUrl)}">List your business</a>`;

function vendorRow(v, site, cat, city, withCategory) {
  const meta = [withCategory ? (v.subcategory || v.category) : '', v.area].filter(Boolean).join(', ');
  const svc = v.services.slice(0, 4).join(', ');
  const actions = [];
  if (site.privacy.showWhatsAppLink && v.phone) {
    const msg = `Hi, I found your listing on ${site.brand} (${v.uid}) and want to enquire about an event in ${city.name}.`;
    actions.push(`<a class="btn small" rel="nofollow noopener" href="https://wa.me/${v.phone}?text=${encodeURIComponent(msg)}">WhatsApp</a>`);
  }
  if (site.vendorLinkTemplate) actions.push(`<a class="btn small" href="${esc(fill(site.vendorLinkTemplate, { uid: encodeURIComponent(v.uid) }))}">View on ${esc(site.brand)}</a>`);
  return `<li class="vendor" id="${esc(v.id)}"><div><h3>${esc(v.name)}</h3>${meta ? `<p>${esc(meta)}</p>` : ''}${svc ? `<p>${esc(svc)}</p>` : ''}<p class="uid">ID ${esc(v.uid)}</p></div><div>${actions.join(' ')}</div></li>`;
}

function categoryPage(ctx) {
  const { site, city, cat, vendors, content, url, related, indexable, graph } = ctx;
  const vendorsHtml = vendors.length
    ? `<ol class="vendors">${vendors.map((v) => vendorRow(v, site, cat, city, cat.match === 'all')).join('')}</ol>`
    : `<div class="empty"><p>No approved ${esc(cat.label.toLowerCase())} are listed in ${esc(city.name)} yet. <a href="${esc(site.listVendorUrl)}">List your business</a> and appear here once approved.</p></div>`;
  const links = [
    ...related.sameCity.map((r) => `<li><a href="${esc(r.href)}">${esc(r.label)} in ${esc(city.name)}</a></li>`),
    ...related.nearby.map((r) => `<li><a href="${esc(r.href)}">${esc(r.label)} in ${esc(r.cityName)}</a></li>`)
  ];
  const body = `
<section class="s copy" aria-label="About this page">${content.intro.map((p) => `<p>${esc(p)}</p>`).join('')}</section>
<section class="s" aria-labelledby="vendors-h"><h2 id="vendors-h">${esc(cat.label)} in ${esc(city.name)}</h2>${vendorsHtml}</section>
<section class="s copy"><h2>${esc(content.tipsHeading)}</h2><ul class="tips">${content.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></section>
<section class="s copy"><h2>Frequently asked questions</h2>${content.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</section>
<section class="s"><h2>More vendors</h2><ul class="links"><li><a href="/${esc(city.key)}/">All event vendors in ${esc(city.name)}</a></li>${links.join('')}</ul></section>`;
  return shell({
    site, graph,
    headHtml: head({ site, title: content.title, description: content.metaDescription, url, indexable }),
    crumbs: [{ name: 'Home', href: '/' }, { name: city.name, href: `/${city.key}/` }, { name: cat.label }],
    h1: content.h1, lead: content.lead,
    ctas: defaultCtas(site, `Browse all on ${site.brand}`),
    body
  });
}

function hubPage(ctx) {
  const { site, city, items, intro, url, indexable, graph, title, description } = ctx;
  const body = `
<section class="s copy"><p>${esc(intro)}</p><p>Choose a category to see the vendors listed in ${esc(city.name)}, with practical guidance on how to choose and what to ask.</p></section>
<section class="s"><h2>Categories in ${esc(city.name)}</h2><ul class="links">${items.map((i) => `<li><a href="${esc(i.href)}">${esc(i.label)}</a> (${i.count})</li>`).join('')}</ul></section>`;
  return shell({
    site, graph,
    headHtml: head({ site, title, description, url, indexable }),
    crumbs: [{ name: 'Home', href: '/' }, { name: city.name }],
    h1: `Event vendors in ${city.name}`,
    lead: `Tent houses, caterers, decorators, photographers and more. Zero commission, direct contact.`,
    ctas: defaultCtas(site, `Browse all on ${site.brand}`),
    body
  });
}

function directoryPage(ctx) {
  const { site, cities, url, indexable, graph, title, description } = ctx;
  const body = `
<section class="s copy"><p>${esc(site.brand)} lists event vendors city by city. Pick a city to browse tent houses, caterers, decorators, photographers, lighting and sound, and entertainers.</p></section>
<section class="s"><h2>Cities</h2><ul class="links">${cities.map((c) => `<li><a href="${esc(c.href)}">${esc(c.name)}</a> (${c.count} ${c.count === 1 ? 'vendor' : 'vendors'})</li>`).join('')}</ul></section>`;
  return shell({
    site, graph,
    headHtml: head({ site, title, description, url, indexable }),
    crumbs: [{ name: 'Home', href: '/' }, { name: 'Cities' }],
    h1: 'Event vendors by city',
    lead: `Find local vendors for weddings and events. ${site.brand} takes no commission.`,
    ctas: defaultCtas(site, `Browse all on ${site.brand}`),
    body
  });
}

module.exports = { categoryPage, hubPage, directoryPage };
