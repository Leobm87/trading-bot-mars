const fs = require('fs');
const { processQueryFirm } = require('./services/firms/apex/index.js');

async function debugWithdrawals() {
  const golden = fs.readFileSync('tests/golden/apex.jsonl', 'utf8')
    .trim()
    .split('\n')
    .map(line => JSON.parse(line))
    .filter(item => item.intent === 'withdrawals');

  console.log('Total withdrawal cases:', golden.length);

  for (let i = 0; i < golden.length; i++) {
    const { q, expected_faq_id } = golden[i];
    try {
      const result = await processQueryFirm(q);
      const isCorrect = result.faq_id === expected_faq_id;
      
      if (!isCorrect) {
        console.log(`MISS ${i+1}: "${q}"`);
        console.log(`  Expected: ${expected_faq_id}`);
        console.log(`  Got: ${result.faq_id || 'NONE'}`);
        console.log(`  Source: ${result.source}`);
      }
    } catch (error) {
      console.log(`ERROR ${i+1}: "${q}" - ${error.message}`);
    }
  }
}

debugWithdrawals().catch(console.error);