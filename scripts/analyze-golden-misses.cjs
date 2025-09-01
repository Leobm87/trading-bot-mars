#!/usr/bin/env node

const fs = require('fs');
const { processQueryFirm } = require('../services/firms/apex/index.js');

async function analyzeGoldenMisses() {
  try {
    const lines = fs.readFileSync('tests/golden/apex.jsonl', 'utf8').trim().split('\n');
    const goldenQueries = lines.map(line => JSON.parse(line));
    
    const misses = [];
    let completed = 0;
    
    console.log(`Analyzing ${goldenQueries.length} queries...`);
    
    for (const golden of goldenQueries) {
      try {
        const result = await processQueryFirm(golden.q);
        const predicted = result.faq_id || 'NONE';
        
        if (predicted !== golden.expected_faq_id) {
          // Verificar si expected está en Top-8 
          const retrieveTop8 = result.debug?.candidates || [];
          const hasExpectedInTop8 = retrieveTop8.some(c => c.faq_id === golden.expected_faq_id);
          const hasPredictedInTop8 = retrieveTop8.some(c => c.faq_id === predicted);
          
          let stageDeRail = 'unknown';
          if (!hasExpectedInTop8) {
            stageDeRail = 'retriever';
          } else if (hasExpectedInTop8 && predicted === 'NONE') {
            stageDeRail = 'selector';
          } else if (hasExpectedInTop8 && predicted !== golden.expected_faq_id) {
            stageDeRail = 'rerank';
          }
          
          misses.push({
            q: golden.q,
            expected: golden.expected_faq_id,
            predicted: predicted,
            has_expected_in_top8: hasExpectedInTop8,
            has_predicted_in_top8: hasPredictedInTop8,
            stage_derail: stageDeRail,
            intent: golden.intent
          });
        }
        
        completed++;
        if (completed % 10 === 0) {
          console.log(`Progress: ${completed}/${goldenQueries.length}`);
        }
        
      } catch (err) {
        console.error(`Error processing '${golden.q}': ${err.message}`);
      }
    }
    
    fs.writeFileSync('logs/analysis/APEX-misses.detail.json', JSON.stringify(misses, null, 2));
    
    const summary = {
      total_queries: goldenQueries.length,
      total_misses: misses.length,
      exact_at_1: ((goldenQueries.length - misses.length) / goldenQueries.length * 100).toFixed(1) + '%',
      by_stage: {
        retriever: misses.filter(m => m.stage_derail === 'retriever').length,
        rerank: misses.filter(m => m.stage_derail === 'rerank').length,
        selector: misses.filter(m => m.stage_derail === 'selector').length
      },
      by_intent: {}
    };
    
    // Group by intent
    for (const miss of misses) {
      if (!summary.by_intent[miss.intent]) {
        summary.by_intent[miss.intent] = [];
      }
      summary.by_intent[miss.intent].push(miss.q);
    }
    
    console.log(JSON.stringify(summary, null, 2));
    
  } catch (error) {
    console.error('Analysis failed:', error.message);
  }
}

analyzeGoldenMisses();