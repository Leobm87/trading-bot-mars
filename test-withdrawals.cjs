require('dotenv').config();

async function test() {
  const { resolvePin } = require('./services/common/pinner.cjs');
  const { formatFromFAQ } = require('./services/common/format.cjs');
  
  const queries = [
    "cual es el safety net para retirar",
    "¿Cuál es el umbral mínimo (Safety Net) para poder retirar en APEX?",
    "retiro apex umbral",
    "umbral para retirar en apex"
  ];
  
  console.log('Testing withdrawal queries that were failing:');
  console.log('Expected FAQ: 385d0f21-fee7-4acb-9f69-a70051e3ad38 (limites-retiro)\n');
  
  for (const query of queries) {
    const pinId = resolvePin('apex', query);
    console.log(`Query: "${query}"`);
    console.log(`Pin ID: ${pinId}`);
    
    if (pinId === '385d0f21-fee7-4acb-9f69-a70051e3ad38') {
      console.log('✅ CORRECTO - Va a limites-retiro');
    } else if (pinId === 'b8cae97b-9fa7-48cb-895b-cfbb81720724') {
      console.log('❌ INCORRECTO - Va a safety-net-tamaños');
    } else {
      console.log(`🔍 OTRO - Va a ${pinId}`);
    }
    console.log('');
  }
}

test().catch(console.error);