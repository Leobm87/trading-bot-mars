require('dotenv').config();

async function test() {
  const { resolvePin } = require('./services/common/pinner.cjs');
  
  const query = "cual es el safety net para retirar";
  const pinId = resolvePin('apex', query);
  
  console.log('Query:', query);
  console.log('Pin ID:', pinId);
  
  if (pinId) {
    const { formatFromFAQ } = require('./services/common/format.cjs');
    const result = await formatFromFAQ({ id: pinId, score: 1.0, rank: 1 });
    console.log('Formatted result:', JSON.stringify(result, null, 2));
  } else {
    console.log('No pin found, will go through retrieval');
  }
}

test().catch(console.error);