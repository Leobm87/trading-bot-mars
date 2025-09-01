require('dotenv').config();

async function test() {
  const { resolvePin } = require('./services/common/pinner.cjs');
  
  const failing_queries = [
    "colchon de seguridad para payout",
    "primer retiro payout minimo", 
    "balance requerido para payout",
    "valor minimo retiro primera vez",
    "cuanto retiro en mi primer payout",
    "threshold payout no trading"
  ];
  
  console.log('Testing failing adversarial queries:');
  
  for (const query of failing_queries) {
    const pinId = resolvePin('apex', query);
    console.log(`Query: "${query}"`);
    console.log(`Pin ID: ${pinId || 'NO PIN'}`);
    console.log('');
  }
}

test().catch(console.error);