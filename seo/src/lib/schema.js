'use strict';
// JSON-LD @graph. Deliberately contains NO ratings, reviews or prices:
// only facts that exist in the vendor data.
function localBusiness(v, url, cityName, state, site) {
  const lb = {
    '@type': 'LocalBusiness',
    '@id': `${url}#${v.id}`,
    name: v.name,
    url: `${url}#${v.id}`,
    identifier: v.uid,
    areaServed: { '@type': 'City', name: cityName },
    address: { '@type': 'PostalAddress', addressLocality: v.area ? `${v.area}, ${cityName}` : cityName, addressRegion: state, addressCountry: 'IN' }
  };
  const desc = [v.subcategory || v.category, v.services.length ? `Services: ${v.services.slice(0, 5).join(', ')}` : ''].filter(Boolean).join('. ');
  if (desc) lb.description = desc;
  if (site.privacy.phoneInJsonLd && v.phone) lb.telephone = `+${v.phone}`;
  return lb;
}

function buildGraph({ site, url, name, description, breadcrumbs, vendors, faq, cityName, state }) {
  const base = site.baseUrl;
  const orgId = `${base}/#org`;
  const graph = [{ '@type': 'Organization', '@id': orgId, name: site.brand, url: `${base}/` }];
  const page = {
    '@type': 'CollectionPage', '@id': `${url}#page`, url, name, description,
    inLanguage: site.locale, publisher: { '@id': orgId }, breadcrumb: { '@id': `${url}#breadcrumb` }
  };
  if (vendors && vendors.length) page.mainEntity = { '@id': `${url}#list` };
  graph.push(page);
  graph.push({
    '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`,
    itemListElement: breadcrumbs.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b.name, item: b.url }))
  });
  if (vendors && vendors.length) {
    graph.push({
      '@type': 'ItemList', '@id': `${url}#list`, numberOfItems: vendors.length,
      itemListElement: vendors.map((v, i) => ({ '@type': 'ListItem', position: i + 1, item: localBusiness(v, url, cityName, state, site) }))
    });
  }
  if (faq && faq.length) {
    graph.push({
      '@type': 'FAQPage', '@id': `${url}#faq`,
      mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

module.exports = { buildGraph };
