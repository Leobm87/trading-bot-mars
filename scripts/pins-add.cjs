#!/usr/bin/env node
const fs = require('fs');
const path = 'data/pins/apex.json';

// Simple arg parsing
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--id') args.id = process.argv[++i];
  if (process.argv[i] === '--re') args.re = process.argv[++i];
}

// --id <uuid> --re "<regex>"
const id = args.id, re = args.re;
if (!id || !re){ 
  console.error('Usage: node scripts/pins-add.cjs --id <uuid> --re "<regex>"'); 
  process.exit(2); 
}

let obj = { firm:'apex', rules: [] };
try { obj = JSON.parse(fs.readFileSync(path,'utf8')); } catch {}

if (obj.firm!=='apex') obj.firm='apex';
obj.rules = obj.rules || [];

// de-dup por faq_id+re
if (!obj.rules.find(r => r.faq_id===id && r.re===re)){
  obj.rules.push({ re, faq_id: id });
  fs.mkdirSync('data/pins', { recursive: true });
  fs.writeFileSync(path, JSON.stringify(obj, null, 2));
  console.log(JSON.stringify({ ok:true, added:{ re, faq_id:id }, total: obj.rules.length }, null, 2));
} else {
  console.log(JSON.stringify({ ok:true, skipped:'duplicate', re, faq_id:id }, null, 2));
}