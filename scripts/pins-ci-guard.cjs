#!/usr/bin/env node
const fs = require('fs');
const MAX_PINS = Number(process.env.MAX_PINS || 40);
const raw = fs.readFileSync('data/pins/apex.json','utf8');
const cfg = JSON.parse(raw); const n = (cfg?.rules || []).length;
if (n > MAX_PINS) {
  console.error(`Too many pins: ${n} > ${MAX_PINS}. Refactor aliases/coverage instead.`);
  process.exit(2);
}
console.log(JSON.stringify({ ok:true, pins:n, max:MAX_PINS }, null, 2));