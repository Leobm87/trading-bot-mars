// scripts/pins-usage.cjs
require('dotenv').config();
const fs = require('fs');
const path = require('path');

function safeJSONL(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean);
  return lines.map(l => JSON.parse(l));
}

async function analyzePinsUsage() {
  // Load pins
  const pinsPath = path.join(__dirname, '..', 'data', 'pins', 'apex.json');
  const pinsData = JSON.parse(fs.readFileSync(pinsPath, 'utf8'));
  const pins = pinsData.rules;

  // Load test datasets
  const goldenPath = path.join(__dirname, '..', 'tests', 'golden', 'apex.jsonl');
  const adversarialPath = path.join(__dirname, '..', 'tests', 'golden', 'apex_conflicts.adversarial.jsonl');
  
  const golden = safeJSONL(goldenPath);
  const adversarial = safeJSONL(adversarialPath);
  const allQueries = [...golden, ...adversarial];

  // Use unified MCP runner to simulate the full pipeline for each query
  const { evalQueriesMcp } = require('../services/eval/runMcpE2E.cjs');

  console.log(`Analyzing ${pins.length} pins against ${allQueries.length} queries...`);

  // Initialize usage tracking
  const pinsUsage = pins.map((pin, idx) => ({
    pin_index: idx,
    pin_name: `pin_${idx}`,
    regex: pin.re,
    target_faq_id: pin.faq_id,
    fires: 0,
    unique_queries: [],
    overlaps_with: []
  }));

  // Track which pins fired for each query
  const queryResults = [];
  
  for (let i = 0; i < allQueries.length; i++) {
    const query = allQueries[i];
    console.log(`Processing query ${i+1}/${allQueries.length}: "${query.q}"`);
    
    try {
      // Run full pipeline and capture intermediary pin firing
      const result = await evalQueriesMcp([query], { debug: true });
      
      // Extract pin firing information (this will depend on debug output structure)
      const firedPins = [];
      
      // For now, manually check each pin regex against the query
      pins.forEach((pin, idx) => {
        try {
          const regex = new RegExp(pin.re, 'i');
          if (regex.test(query.q)) {
            firedPins.push(idx);
            pinsUsage[idx].fires++;
            if (!pinsUsage[idx].unique_queries.includes(query.q)) {
              pinsUsage[idx].unique_queries.push(query.q);
            }
          }
        } catch (e) {
          console.warn(`Invalid regex for pin ${idx}: ${pin.re}`);
        }
      });

      queryResults.push({
        query: query.q,
        expected_faq_id: query.expected_faq_id,
        fired_pins: firedPins,
        actual_faq_id: result[0]?.actual_faq_id || null
      });

    } catch (error) {
      console.error(`Error processing query "${query.q}":`, error.message);
      queryResults.push({
        query: query.q,
        expected_faq_id: query.expected_faq_id,
        fired_pins: [],
        actual_faq_id: null,
        error: error.message
      });
    }
  }

  // Identify overlaps - pins that target the same FAQ and have similar regex patterns
  pinsUsage.forEach((pinA, idxA) => {
    pinsUsage.forEach((pinB, idxB) => {
      if (idxA !== idxB && pinA.target_faq_id === pinB.target_faq_id) {
        // Check for query overlap
        const commonQueries = pinA.unique_queries.filter(q => pinB.unique_queries.includes(q));
        if (commonQueries.length > 0) {
          pinA.overlaps_with.push({
            pin_index: idxB,
            common_queries: commonQueries,
            overlap_ratio: commonQueries.length / Math.max(pinA.unique_queries.length, 1)
          });
        }
      }
    });
  });

  // Generate analysis report
  const analysis = {
    timestamp: new Date().toISOString(),
    total_pins: pins.length,
    total_queries: allQueries.length,
    pins_usage: pinsUsage,
    summary: {
      unused_pins: pinsUsage.filter(p => p.fires === 0).length,
      low_yield_pins: pinsUsage.filter(p => p.fires <= 1 && p.overlaps_with.length > 0).length,
      high_overlap_pins: pinsUsage.filter(p => p.overlaps_with.some(o => o.overlap_ratio > 0.5)).length
    },
    candidates_for_removal: pinsUsage.filter(p => 
      p.fires === 0 || 
      (p.fires <= 1 && p.overlaps_with.length > 0)
    ).map(p => ({
      pin_index: p.pin_index,
      reason: p.fires === 0 ? 'UNUSED' : 'LOW_YIELD_WITH_OVERLAP',
      fires: p.fires,
      overlaps: p.overlaps_with.length
    }))
  };

  // Save results
  const outputPath = path.join(__dirname, '..', 'logs', 'analysis', 'APEX-PINS.usage.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));

  console.log(`\nAnalysis complete:`);
  console.log(`- Total pins: ${analysis.total_pins}`);
  console.log(`- Unused pins: ${analysis.summary.unused_pins}`);
  console.log(`- Low-yield pins: ${analysis.summary.low_yield_pins}`);
  console.log(`- High-overlap pins: ${analysis.summary.high_overlap_pins}`);
  console.log(`- Candidates for removal: ${analysis.candidates_for_removal.length}`);
  console.log(`\nResults saved to: ${outputPath}`);

  return analysis;
}

if (require.main === module) {
  analyzePinsUsage().catch(console.error);
}

module.exports = { analyzePinsUsage };