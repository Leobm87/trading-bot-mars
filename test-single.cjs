require('dotenv').config();

async function test() {
  const { evalQueriesMcp } = require('./services/eval/runMcpE2E.cjs');
  
  const queries = [
    {"q":"cual es el safety net para retirar","expected_faq_id":"385d0f21-fee7-4acb-9f69-a70051e3ad38","intent":"withdrawals","auto_mapped":"aliases"}
  ];
  
  const result = await evalQueriesMcp(queries, { pinnerOff: false });
  console.log(JSON.stringify(result, null, 2));
}

test().catch(console.error);