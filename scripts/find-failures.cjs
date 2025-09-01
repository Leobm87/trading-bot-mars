// scripts/find-failures.cjs
require('dotenv').config();
const fs = require('fs');
const path = require('path');

function safeJSONL(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean);
  return lines.map(l => JSON.parse(l));
}

async function findFailures() {
  // Load golden test data
  const goldenPath = path.join(__dirname, '..', 'tests', 'golden', 'apex.jsonl');
  const golden = safeJSONL(goldenPath);

  console.log(`Checking ${golden.length} golden queries...`);

  // Use unified MCP runner
  const { evalQueriesMcp } = require('../services/eval/runMcpE2E.cjs');
  
  const failures = [];
  
  for (let i = 0; i < golden.length; i++) {
    const testCase = golden[i];
    
    try {
      console.log(`Checking ${i+1}/${golden.length}: "${testCase.q}"`);
      
      const result = await evalQueriesMcp([testCase], {});
      
      const actualId = result[0]?.actual_faq_id;
      const expectedId = testCase.expected_faq_id;
      
      if (actualId !== expectedId) {
        failures.push({
          query: testCase.q,
          expected_faq_id: expectedId,
          actual_faq_id: actualId,
          intent: testCase.intent || 'undefined'
        });
        console.log(`❌ FAIL: Expected ${expectedId} but got ${actualId}`);
      } else {
        console.log(`✅ PASS`);
      }
      
    } catch (error) {
      failures.push({
        query: testCase.q,
        expected_faq_id: testCase.expected_faq_id,
        actual_faq_id: null,
        intent: testCase.intent || 'undefined',
        error: error.message
      });
      console.log(`❌ ERROR: ${error.message}`);
    }
  }
  
  // Save failures for analysis
  const failuresPath = path.join(__dirname, '..', 'logs', 'analysis', 'APEX-DIFF.failures.json');
  fs.mkdirSync(path.dirname(failuresPath), { recursive: true });
  fs.writeFileSync(failuresPath, JSON.stringify(failures, null, 2));
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total queries: ${golden.length}`);
  console.log(`Failures: ${failures.length}`);
  console.log(`Success rate: ${((golden.length - failures.length) / golden.length * 100).toFixed(2)}%`);
  
  if (failures.length > 0) {
    console.log(`\nFailures saved to: ${failuresPath}`);
    console.log('\nFailing queries:');
    failures.forEach((f, idx) => {
      console.log(`${idx+1}. "${f.query}" -> Expected: ${f.expected_faq_id}, Got: ${f.actual_faq_id}`);
    });
  }
  
  return failures;
}

if (require.main === module) {
  findFailures().catch(console.error);
}

module.exports = { findFailures };