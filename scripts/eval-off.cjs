// scripts/eval-off.cjs
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function safeJSONL(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean);
  return lines.map(l => JSON.parse(l));
}

(async () => {
  // Force PINNER_OFF=1 environment
  process.env.PINNER_OFF = '1';
  
  const goldenPath = path.join(__dirname, '..', 'tests', 'golden', 'apex.jsonl');
  const golden = safeJSONL(goldenPath);

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // Create service with PINNER_OFF=1
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
      // 0) Pinner determinista - SKIP with PINNER_OFF=1
      const pinId = resolvePin('apex', query);
      if (pinId && process.env.PINNER_OFF !== '1') {
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

  let hits = 0;
  const failures = [];

  for (const { q, expected_faq_id, intent } of golden) {
    const res = await service.processQuery(q);
    const gotId = res && res.faq_id;
    const hit = !!(gotId && expected_faq_id && gotId === expected_faq_id);
    
    if (hit) {
      hits += 1;
    } else {
      // Collect failures with expected slug for alias mining
      failures.push({
        q,
        expected_faq_id,
        expected_slug: res && res.slug || 'unknown',
        got_faq_id: gotId || null,
        intent
      });
    }
  }

  const off_exact = golden.length ? +(hits / golden.length).toFixed(4) : 0;

  const report = {
    prd: "PRD-APEX-HARDENING-6",
    off_exact,
    failures_count: failures.length,
    failures
  };

  console.log(JSON.stringify(report, null, 2));
})().catch(e => { console.error(e); process.exit(1); });