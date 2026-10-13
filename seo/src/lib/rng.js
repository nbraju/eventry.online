'use strict';
// Deterministic randomness: the same page always gets the same wording,
// so rebuilds produce identical files (no git churn, stable <lastmod>).
function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let a = hash32(String(seed));
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
function pickN(r, arr, n) {
  const idx = arr.map((_, i) => i);
  const out = [];
  while (idx.length && out.length < n) out.push(idx.splice(Math.floor(r() * idx.length), 1)[0]);
  return out.sort((a, b) => a - b).map((i) => arr[i]); // keep original (logical) order
}
module.exports = { rng, pick, pickN };
