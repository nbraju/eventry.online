'use strict';
const { slugify, sha1 } = require('./util');

// Header aliases, so a renamed Google Sheet column does not silently produce "0 vendors".
const ALIASES = {
  uid: ['uid', 'id', 'vendor_id', 'vendorid', 'listing_id'],
  name: ['name', 'vendor_name', 'business_name', 'businessname', 'vendor', 'company', 'firm'],
  category: ['category', 'cat', 'vendor_category', 'type'],
  subcategory: ['subcategory', 'sub_category', 'subcat', 'sub_type'],
  city: ['city', 'town'],
  area: ['area', 'locality', 'neighbourhood', 'neighborhood', 'location'],
  services: ['services', 'offerings', 'service_list', 'tags', 'specialities', 'specialties'],
  description: ['description', 'about', 'bio', 'details'],
  phone: ['phone', 'mobile', 'contact', 'contact_number', 'phone_number'],
  whatsapp: ['whatsapp', 'whatsapp_number', 'wa'],
  status: ['status', 'approval', 'approval_status'],
  created: ['created', 'timestamp', 'created_at', 'added']
};
const normKey = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
const LOOKUP = {};
for (const [canon, list] of Object.entries(ALIASES)) for (const a of list) if (!LOOKUP[normKey(a)]) LOOKUP[normKey(a)] = canon;

function extractRows(payload) {
  let rows = payload;
  if (!Array.isArray(rows)) rows = payload.vendors || payload.data || payload.rows || payload.listings || payload.items || [];
  if (rows.length && Array.isArray(rows[0])) { // [[header...],[row...]]
    const [head, ...rest] = rows;
    rows = rest.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
  }
  return rows;
}

function mapRow(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const canon = LOOKUP[normKey(k)];
    if (canon && (out[canon] === undefined || out[canon] === '' || out[canon] === null)) out[canon] = v;
  }
  return out;
}

const splitList = (v) => (Array.isArray(v) ? v : String(v ?? '').split(/[,;|\n]/)).map((s) => String(s).trim()).filter(Boolean);

function waNumber(p) {
  let d = String(p ?? '').replace(/\D/g, '').replace(/^0+/, '');
  if (d.length === 10) d = '91' + d;
  return /^91\d{10}$/.test(d) ? d : null;
}

function normalizeVendors(payload, cityIndex, opts = {}) {
  const warnings = [];
  const unknownCities = new Map();
  const vendors = [];
  const rawRows = extractRows(payload);
  const mapped = rawRows.map(mapRow);
  const hasStatusCol = mapped.some((r) => r.status !== undefined);
  if (!hasStatusCol && opts.requireApproved) warnings.push('No status/approval column found in vendor data: all rows treated as approved. Check the backend response.');
  const seenUid = new Set(); const seenPhone = new Set();
  let dupes = 0; let unapproved = 0; let nameless = 0;

  for (const r of mapped) {
    const name = String(r.name ?? '').trim();
    if (!name) { nameless++; continue; }
    if (hasStatusCol && opts.requireApproved && !/^(approved|active|live|verified|published)$/i.test(String(r.status ?? '').trim())) { unapproved++; continue; }
    const cityRaw = String(r.city ?? '').trim();
    const cityKey = cityIndex.get(slugify(cityRaw.split(',')[0]));
    if (!cityKey) { unknownCities.set(cityRaw || '(blank)', (unknownCities.get(cityRaw || '(blank)') || 0) + 1); continue; }
    const wa = waNumber(r.whatsapp) || waNumber(r.phone);
    const uid = String(r.uid ?? '').trim() || `V-${sha1(name + (r.phone || '')).slice(0, 8)}`;
    if (seenUid.has(uid)) { dupes++; continue; }
    if (wa && seenPhone.has(wa)) { dupes++; continue; }
    seenUid.add(uid); if (wa) seenPhone.add(wa);
    vendors.push({
      uid,
      id: 'v-' + slugify(uid),
      name,
      category: String(r.category ?? '').trim(),
      subcategory: String(r.subcategory ?? '').trim(),
      cityKey,
      area: String(r.area ?? '').trim(),
      services: splitList(r.services),
      description: String(r.description ?? '').trim(),
      phone: wa,
      created: String(r.created ?? '')
    });
  }
  vendors.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  return { vendors, warnings, unknownCities, stats: { rows: rawRows.length, kept: vendors.length, dupes, unapproved, nameless } };
}

function matchesCategory(v, cat) {
  if (cat.match === 'all') return true;
  const term = (t) => new RegExp(t.length <= 3 ? `\\b${t}\\b` : `\\b${t}`, 'i');
  const catField = `${v.category} ${v.subcategory}`;
  const textField = `${catField} ${v.services.join(' ')} ${v.description}`;
  return cat.match.categories.some((t) => term(t).test(catField)) || cat.match.keywords.some((t) => term(t).test(textField));
}

module.exports = { normalizeVendors, matchesCategory, extractRows };
