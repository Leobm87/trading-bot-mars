// scripts/eval-apex-misses.cjs - Generate detailed misses analysis
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function percentile(arr, p) {
  if (!arr.length) return 0;
  const a = [...arr].sort((x,y)=>x-y);
  const idx = Math.ceil((p/100)*a.length)-1;
  return a[Math.max(0, Math.min(a.length-1, idx))];
}
function safeJSONL(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean);
  return lines.map(l => JSON.parse(l));
}

(async () => {
  const goldenPath = path.join(__dirname, '..', 'tests', 'golden', 'apex.jsonl');
  const golden = safeJSONL(goldenPath);

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // Use same inline pipeline as try-apex.cjs for consistency
  const { gateIntent } = require('../services/common/intent-gate.cjs');
  const { retrieveTopK, confidentTop1 } = require('../services/common/retriever.cjs');
  const { llmSelectFAQ } = require('../services/common/llm-selector.cjs');
  const { formatFromFAQ, notFound } = require('../services/common/format.cjs');
  const { embedText } = require('../services/common/embeddings.cjs');

  const service = {
    supabase,
    firmId: '854bf730-8420-4297-86f8-3c4a972edcf2', // APEX firm ID
    async processQuery(query) {
      const { resolvePin } = require('../services/common/pinner.cjs');
      
      // 0) Pinner determinista
      const pinId = resolvePin('apex', query);
      if (pinId) {
        return {
          faq_id: pinId,
          debug: { source: 'pin', candidates: [] }
        };
      }

      const cats = gateIntent(query);
      if (!this.supabase) return { faq_id: null, debug: { source: 'no_supabase', candidates: [] } };

      const cands = await retrieveTopK(this.supabase, query, cats, this.firmId, embedText);
      if (!cands || cands.length === 0) return { faq_id: null, debug: { source: 'no_candidates', candidates: [] } };

      const top1 = confidentTop1(cands);
      if (top1) return { 
        faq_id: top1.id, 
        debug: { source: 'confident_top1', candidates: cands.slice(0, 8) } 
      };

      // LLM selector
      const selector_candidates = cands.slice(0, 4);
      const choice = await llmSelectFAQ(query, selector_candidates);
      if (choice?.faq_id) {
        return { 
          faq_id: choice.faq_id, 
          debug: { source: 'llm_select', candidates: cands.slice(0, 8), selector_input: selector_candidates } 
        };
      }

      return { faq_id: null, debug: { source: 'none', candidates: cands.slice(0, 8) } };
    }
  };

  const misses = [];
  let latencies = [];
  let completed = 0;

  console.log(`Processing ${golden.length} queries for detailed miss analysis...`);

  for (const item of golden) {
    try {
      const start = Date.now();
      const result = await service.processQuery(item.q);
      const latency = Date.now() - start;
      latencies.push(latency);

      const predicted = result.faq_id || 'NONE';
      
      if (predicted !== item.expected_faq_id) {
        const retrieveTop8 = result.debug?.candidates || [];
        const hasExpectedInTop8 = retrieveTop8.some(c => c.id === item.expected_faq_id);
        const hasPredictedInTop8 = retrieveTop8.some(c => c.id === predicted);
        
        let stageDeRail = 'unknown';
        if (!hasExpectedInTop8) {
          stageDeRail = 'retriever'; // Expected no aparece en Top-8
        } else if (hasExpectedInTop8 && predicted === 'NONE') {
          stageDeRail = 'selector'; // Expected en Top-8 pero selector no eligió nada
        } else if (hasExpectedInTop8 && predicted !== item.expected_faq_id && predicted !== 'NONE') {
          stageDeRail = 'rerank'; // Expected en Top-8 pero otro candidato ganó
        }
        
        misses.push({
          q: item.q,
          expected: item.expected_faq_id,
          predicted: predicted,
          has_expected_in_top8: hasExpectedInTop8,
          has_predicted_in_top8: hasPredictedInTop8,
          stage_derail: stageDeRail,
          intent: item.intent,
          debug: result.debug
        });
      }

      completed++;
      if (completed % 10 === 0) {
        console.log(`Progress: ${completed}/${golden.length}`);
      }

    } catch (err) {
      console.error(`Error processing '${item.q}': ${err.message}`);
      misses.push({
        q: item.q,
        expected: item.expected_faq_id,
        predicted: 'ERROR',
        has_expected_in_top8: false,
        has_predicted_in_top8: false,
        stage_derail: 'error',
        intent: item.intent,
        error: err.message
      });
    }
  }

  // Save detailed misses
  const outputPath = 'logs/analysis/APEX-misses.detail.json';
  fs.writeFileSync(outputPath, JSON.stringify(misses, null, 2));

  // Generate summary
  const summary = {
    total_queries: golden.length,
    total_misses: misses.length,
    exact_at_1_pct: ((golden.length - misses.length) / golden.length * 100).toFixed(1),
    by_stage: {
      retriever: misses.filter(m => m.stage_derail === 'retriever').length,
      rerank: misses.filter(m => m.stage_derail === 'rerank').length,
      selector: misses.filter(m => m.stage_derail === 'selector').length,
      error: misses.filter(m => m.stage_derail === 'error').length
    },
    by_intent: {},
    withdrawals_specific: misses.filter(m => m.intent === 'withdrawals'),
    safety_net_specific: misses.filter(m => m.intent === 'safety_net'),
    p50_latency_ms: percentile(latencies, 50)
  };

  // Group by intent
  for (const miss of misses) {
    if (!summary.by_intent[miss.intent]) {
      summary.by_intent[miss.intent] = 0;
    }
    summary.by_intent[miss.intent]++;
  }

  console.log('\n=== DETAILED MISSES ANALYSIS ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nDetailed analysis saved to: ${outputPath}`);

})().catch(console.error);