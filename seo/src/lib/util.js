'use strict';
const fs = require('fs');
const crypto = require('crypto');

const MARKER = 'eventry-seo-generated';

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex');

const listJoin = (arr, conj = 'and') => {
  if (arr.length <= 1) return arr[0] || '';
  if (arr.length === 2) return `${arr[0]} ${conj} ${arr[1]}`;
  return `${arr.slice(0, -1).join(', ')}, ${conj} ${arr[arr.length - 1]}`;
};

const article = (word) => (/^[aeiou]/i.test(word) ? 'an' : 'a');
const lc = (s) => String(s).toLowerCase();
const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
const jsonLd = (obj) => JSON.stringify(obj)
  .replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

module.exports = { MARKER, esc, slugify, readJson, sha1, listJoin, article, lc, fill, jsonLd };
