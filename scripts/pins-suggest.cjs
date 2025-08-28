#!/usr/bin/env node
const fs = require('fs'); const path = require('path'); const minimist = require('minimist');

function latestReport(dir='logs/analysis'){
  const files = fs.readdirSync(dir).filter(f=>/apex-report\.json$/.test(f));
  if (!files.length) throw new Error('No analysis report found in logs/analysis');
  const withTime = files.map(f=>({f,t:fs.statSync(path.join(dir,f)).mtimeMs}));
  withTime.sort((a,b)=>b.t-a.t);
  return path.join(dir, withTime[0].f);
}
function norm(s){ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
const STOP = new Set(['apex','cuenta','trader','reglas','pregunta','respuesta','para','por','que','como','de','el','la','los','las','un','una','en','y','o','con','sin']);
function strongTokens(q){
  const w = norm(q).replace(/[^\p{L}\p{N}\s%-]/gu,' ').split(/\s+/).filter(Boolean);
  const toks = w.filter(x=>x.length>=4 && !STOP.has(x));
  return toks.slice(0,5);
}
function buildRegexFromQuery(q){
  const toks = strongTokens(q);
  if (toks.length>=2){
    const [a,b] = toks; return `(?i)${a}.*${b}`;
  }
  const txt = norm(q).replace(/\s+/g,' ').trim();
  if (txt.length>=10) return `(?i)${txt.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`;
  return null;
}

(function main(){
  const args = minimist(process.argv.slice(2));
  const repPath = args.report || latestReport();
  const pinsPath = 'data/pins/apex.json';
  const rep = JSON.parse(fs.readFileSync(repPath,'utf8'));
  const misses = rep.misses || [];
  if (!misses.length) { console.log(JSON.stringify({ok:true, added:0, reason:'no_misses'})); return; }

  let cfg = { firm:'apex', rules:[] };
  try { cfg = JSON.parse(fs.readFileSync(pinsPath,'utf8')); } catch {}
  cfg.rules = cfg.rules || [];

  let added=0, skipped=0, previews=[];
  for (const m of misses){
    const re = buildRegexFromQuery(m.q);
    if (!re) { skipped++; continue; }
    const rule = { re, faq_id: m.expected };
    const dup = cfg.rules.find(r=>r.faq_id===rule.faq_id && r.re===rule.re);
    if (dup) { skipped++; continue; }
    cfg.rules.push(rule); previews.push(rule); added++;
  }
  require('fs').mkdirSync('data/pins', { recursive:true });
  fs.writeFileSync(pinsPath, JSON.stringify(cfg,null,2));
  console.log(JSON.stringify({ok:true, report:path.basename(repPath), added, skipped, previews:previews.slice(0,5)}, null, 2));
})();