// scripts/eval-adversarial.cjs
require('dotenv').config();
const fs = require('fs');
const path = require('path');

function safeJSONL(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean);
  return lines.map(l => JSON.parse(l));
}

async function evalAdversarial() {
  // Load adversarial test data
  const adversarialPath = path.join(__dirname, '..', 'tests', 'golden', 'apex_conflicts.adversarial.jsonl');
  const adversarial = safeJSONL(adversarialPath);

  console.log(`Evaluating ${adversarial.length} adversarial queries...`);

  // Use unified MCP runner
  const { evalQueriesMcp } = require('../services/eval/runMcpE2E.cjs');
  
  const results = await evalQueriesMcp(adversarial, {});
  
  // Calculate metrics
  let exact_hits = 0;
  const failures = [];
  const latencies = [];
  
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const testCase = adversarial[i];
    
    const isExact = result.actual_faq_id === testCase.expected_faq_id;
    if (isExact) {
      exact_hits++;
    } else {
      failures.push({
        query: testCase.q,
        expected: testCase.expected_faq_id,
        actual: result.actual_faq_id,
        intent: testCase.intent
      });
    }
    
    if (result.latency_ms) {
      latencies.push(result.latency_ms);
    }
  }
  
  const exact_at_1 = exact_hits / adversarial.length;
  
  const report = {
    prd: "PRD-APEX-PIN-TRIM-1",
    dataset: "adversarial", 
    n: adversarial.length,
    exact_at_1,
    exact_hits,
    failures: failures.length,
    latency_ms: {
      p50: latencies.length > 0 ? Math.round(latencies.sort()[Math.floor(latencies.length * 0.5)]) : 0
    }
  };
  
  console.log(JSON.stringify(report, null, 2));
  
  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach((f, idx) => {
      console.log(`${idx+1}. "${f.query}" -> Expected: ${f.expected}, Got: ${f.actual}`);
    });
  }
  
  return report;
}

if (require.main === module) {
  evalAdversarial().catch(console.error);
}

module.exports = { evalAdversarial };