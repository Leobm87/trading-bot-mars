const fs = require('fs'); 
const path = require('path');
const { performance } = require('perf_hooks');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// loader robusto
function loadGolden() {
  const p = process.env.GOLDEN_APEX_PATH || 'tests/golden/apex.jsonl';
  const raw = fs.readFileSync(p,'utf8');
  if (p.endsWith('.jsonl')) return raw.split(/\r?\n/).filter(Boolean).map(JSON.parse);
  return JSON.parse(raw);
}

(async () => {
  const golden = loadGolden();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  
  // Create service with inline functionality matching apex/index.js structure
  const { resolvePin } = require('../services/common/pinner.cjs');
  const { gateIntent } = require('../services/common/intent-gate.cjs');
  const { retrieveTopK, confidentTop1 } = require('../services/common/retriever.cjs');
  const { llmSelectFAQ } = require('../services/common/llm-selector.cjs');
  const { formatFromFAQ, notFound } = require('../services/common/format.cjs');
  const { embedText } = require('../services/common/embeddings.cjs');

  const service = {
    supabase,
    firmId: '854bf730-8420-4297-86f8-3c4a972edcf2', // APEX firm ID
    async processQuery(query) {
      // 0) Pinner determinista
      const pinId = resolvePin('apex', query);
      if (pinId) {
        return formatFromFAQ({ id: pinId, score: 1.0, rank: 1 });
      }

      const cats = gateIntent(query);
      if (!this.supabase) return notFound();

      const cands = await retrieveTopK(this.supabase, query, cats, this.firmId, embedText);
      if (!cands || cands.length === 0) return notFound();

      // Early-accept check for confident top1 based on lexical score
      const accepted = confidentTop1(Array.isArray(cands) ? cands : []);
      if (accepted) {
        return formatFromFAQ(accepted);
      }

      const pick = await llmSelectFAQ(query, cands);
      if (pick && pick.type === 'FAQ_ID') {
        const hit = cands.find(c => c.id === pick.id);
        if (hit) return formatFromFAQ(hit);
      }
      return notFound();
    }
  };

  const lat = []; 
  let hits=0; 
  const misses=[];
  for (const g of golden) {
    const t0 = performance.now();
    const res = await service.processQuery(g.q);
    const ms = Math.round(performance.now() - t0);
    lat.push(ms);
    const got = res && (res.faq_id || res.id);
    const ok = !!(got && g.expected_faq_id && got === g.expected_faq_id);
    if (ok) hits++; else misses.push({ q: g.q, got, expected: g.expected_faq_id, ms });
  }
  lat.sort((a,b)=>a-b);
  const p50 = lat[Math.floor(0.5*lat.length)] || 0;
  const exact = golden.length ? +(hits/golden.length).toFixed(4) : 0;

  const report = { firm: 'apex', n: golden.length, exact_at_1: exact, p50_ms: p50, misses, ts: new Date().toISOString() };
  fs.mkdirSync('logs/analysis', { recursive: true });
  fs.writeFileSync('logs/analysis/PRD-005a-apex-report.json', JSON.stringify(report,null,2));
  fs.mkdirSync('logs/agent', { recursive: true });
  fs.appendFileSync('logs/agent/AGENT_HANDOFF.jsonl', JSON.stringify({ prd:'PRD-005a', step:'analyze', report }) + '\n');
  console.log(JSON.stringify(report, null, 2));
})().catch(e => { console.error(e); process.exit(1); });