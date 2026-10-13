#!/usr/bin/env node
'use strict';
/*
 * Pulls approved vendor rows from the Eventry Google Apps Script backend into data/vendors.json.
 * Set EVENTRY_API_URL to the full web-app URL that returns the vendor list as JSON,
 * e.g. https://script.google.com/macros/s/XXXX/exec?action=<your-list-action>
 * Fails loudly (non-zero exit) on HTML error pages, empty lists or bad JSON, so a broken
 * backend can never turn into an empty site.
 */
const fs = require('fs');
const path = require('path');
const { extractRows } = require('../src/lib/normalize');

const die = (m) => { console.error(`fetch-vendors: ${m}`); process.exit(1); };
const url = process.env.EVENTRY_API_URL;
if (!url) die('EVENTRY_API_URL is not set.');

(async () => {
  const res = await fetch(url, { redirect: 'follow', headers: { accept: 'application/json' } });
  const text = (await res.text()).trim();
  if (!res.ok) die(`HTTP ${res.status} from backend.`);
  if (!/^[\[{]/.test(text)) die(`Response is not JSON (Apps Script often returns an HTML error/login page). First 200 chars: ${text.slice(0, 200)}`);
  let json;
  try { json = JSON.parse(text); } catch (e) { die(`JSON.parse failed: ${e.message}`); }
  if (json && json.error) die(`Backend reported an error: ${JSON.stringify(json.error).slice(0, 200)}`);
  const rows = extractRows(json);
  if (!rows.length) die('Backend returned 0 vendor rows.');
  const out = path.join(__dirname, '../data/vendors.json');
  fs.writeFileSync(out, JSON.stringify({ fetchedAt: new Date().toISOString(), vendors: rows }, null, 2));
  console.log(`fetch-vendors: saved ${rows.length} rows to data/vendors.json (git-ignored, contains phone numbers)`);
})().catch((e) => die(e.message));
