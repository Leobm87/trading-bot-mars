const { processQueryFirm } = require('../services/firms/apex/index.js');
const fs = require('fs');

async function main() {
  // Read golden dataset
  const goldenLines = fs.readFileSync('tests/golden/apex.jsonl', 'utf8').trim().split('\n');
  const golden = goldenLines.map(line => JSON.parse(line));
  
  const failures = [];
  let hits = 0;
  
  for (const item of golden) {
    try {
      const res = await processQueryFirm(item.q);
      const predicted = res.faq_id || 'NONE';
      const expected = item.expected_faq_id;
      
      if (predicted === expected) {
        hits++;
      } else {
        failures.push({
          q: item.q,
          expected: expected,
          predicted: predicted,
          intent: item.intent,
          source: item.source
        });
      }
    } catch (e) {
      failures.push({
        q: item.q,
        expected: item.expected_faq_id,
        predicted: 'ERROR',
        error: e.message,
        intent: item.intent,
        source: item.source
      });
    }
  }
  
  // Save failures
  fs.writeFileSync('logs/analysis/APEX-current-failures.json', JSON.stringify(failures, null, 2));
  
  console.log(`Hits: ${hits}/${golden.length}`);
  console.log(`Failures: ${failures.length}`);
  
  return { hits, total: golden.length, failures: failures.length };
}

if (require.main === module) {
  main().then(console.log).catch(console.error);
}