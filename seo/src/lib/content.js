'use strict';
const { rng, pick, pickN } = require('./rng');
const { listJoin, article, lc, fill } = require('./util');

function topCounts(values, n) {
  const m = new Map();
  for (const raw of values) {
    const k = raw.trim().toLowerCase(); if (!k) continue;
    const e = m.get(k) || { label: raw.trim(), n: 0 }; e.n++; m.set(k, e);
  }
  return [...m.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label)).slice(0, n).map((e) => e.label);
}

/**
 * Builds all copy for one city x category page.
 * Uniqueness comes from three sources: hand-written city + category content,
 * live vendor data (counts, areas, services), and seeded selection among variants.
 */
function buildContent({ site, city, cat, vendors, breakdown }) {
  const R = rng(`${city.key}/${cat.slug}`);
  const n = vendors.length;
  const brand = site.brand;
  const plural = lc(cat.label);
  const noun = n === 1 ? cat.singular : plural;
  const vars = { city: city.name, brand, singular: cat.singular, plural };

  const areas = topCounts(vendors.map((v) => v.area), 6);
  const services = topCounts(vendors.flatMap((v) => v.services), 5);
  const indexable = n >= site.minVendorsToIndex;

  // Title (<= 62 chars) and meta description (<= 155 chars)
  const t0 = `${cat.label} in ${city.name} | ${brand}`;
  const titles = [t0, indexable ? `${n} ${cat.label} in ${city.name} | ${brand}` : null, `${cat.label} in ${city.name}: Compare and Contact | ${brand}`]
    .filter(Boolean).filter((t) => t.length <= 62);
  const title = pick(R, titles) || t0;

  let meta;
  if (n > 0) {
    meta = `Browse ${n} ${noun} in ${city.name} on ${brand}. Compare services, contact vendors directly, zero commission.`;
    if (areas.length >= 2 && (meta + ` Areas: ${areas.slice(0, 3).join(', ')}.`).length <= 155) meta += ` Areas: ${areas.slice(0, 3).join(', ')}.`;
  } else {
    meta = `${brand} is building its ${city.name} directory of ${plural}. Read how to choose, and list your business with zero commission.`;
  }
  if (meta.length > 155) meta = meta.slice(0, 152).replace(/\s+\S*$/, '') + '...';

  // Intro
  const p1 = `${city.intro} On this page: ${plural} for ${cat.eventsFor}.`;
  const p2 = cat.intro;
  let pData;
  if (n === 0) {
    pData = `${brand} has no approved ${plural} listed in ${city.name} yet. If you run one, you can list your business and appear here once approved. Until then, the guidance below applies to any vendor you shortlist.`;
  } else if (cat.match === 'all') {
    pData = `${brand} currently lists ${n} ${n === 1 ? 'vendor' : 'vendors'} serving ${city.name}${breakdown.length ? `: ${listJoin(breakdown)}` : ''}${areas.length ? `, covering ${listJoin(areas)}` : ''}.`;
  } else {
    pData = `${brand} currently lists ${n} ${noun} serving ${city.name}${areas.length ? `, covering ${listJoin(areas)}` : ''}. ` +
      (services.length ? `Services offered by these vendors include ${listJoin(services)}.` : `Typical services include ${listJoin(pickN(R, cat.services, 4))}.`);
  }
  const p3 = `Listings on ${brand} are reviewed before they appear. Vendors list with zero commission, so you speak to them directly and agree the terms yourself.`;

  // Tips: 5 of 8, plus one city-specific tip
  const tips = pickN(R, cat.tips, 5);
  const cityTip = city.tips[cat.group] || city.tips.general;
  if (cityTip) tips.push(cityTip);

  // FAQ: data-driven + category + commission + listing + areas
  const faq = [];
  faq.push({
    q: pick(R, [`How many ${plural} are listed in ${city.name} on ${brand}?`, `How many ${plural} can I compare in ${city.name}?`]),
    a: n > 0
      ? `${brand} currently lists ${n} ${noun} serving ${city.name}${areas.length ? `, in areas including ${listJoin(areas)}` : ''}. The directory grows as new vendors are approved.`
      : `No approved ${plural} are listed for ${city.name} yet. ${brand} adds vendors as they are reviewed and approved.`
  });
  for (const f of cat.faq) faq.push({ q: fill(pick(R, f.q), vars), a: fill(f.a, vars) });
  const nearAreas = city.localities.slice(0, 5);
  faq.push({
    q: `Which areas of ${city.name} do these vendors serve?`,
    a: (areas.length ? `Vendors listed on ${brand} for ${city.name} serve areas including ${listJoin(areas)}. ` : '') +
      `Events in ${city.name} also take place in areas such as ${listJoin(nearAreas)}; ask each vendor about travel and delivery charges to your venue.`
  });
  faq.push({
    q: `Does ${brand} charge a commission on bookings?`,
    a: `No. ${brand} does not charge commission on bookings. You contact vendors directly and agree the terms with them.`
  });
  faq.push({
    q: `How can ${article(cat.singular)} ${cat.singular} list their business in ${city.name}?`,
    a: `Use the list your business option on ${brand} and submit your details. Listings are reviewed and approved before they appear, and no commission is taken on enquiries.`
  });

  return {
    title,
    metaDescription: meta,
    h1: `${cat.label} in ${city.name}`,
    lead: n > 0
      ? `${n} listed ${n === 1 ? 'vendor' : 'vendors'}. Contact them directly; ${brand} takes no commission.`
      : `Be among the first ${plural} listed in ${city.name}. ${brand} takes no commission.`,
    intro: [p1, p2, pData, p3],
    tipsHeading: `How to choose ${article(cat.singular)} ${cat.singular} in ${city.name}`,
    tips,
    faq,
    areas,
    services,
    indexable
  };
}

module.exports = { buildContent };
