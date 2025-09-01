#!/usr/bin/env node

const { execSync } = require('child_process');

const queries = [
  "monto minimo primer retiro",
  "cuanto cobrar primer payout", 
  "minimo retiro apex",
  "cuando puedo retirar primera vez",
  "primer cobro cuanto",
  "monto minimo retirar",
  "importe mínimo retiro",
  "mínimo para cobrar",
  "primer pago mínimo",
  "primer pago en apex",
  "cuánto es el mínimo para retirar"
];

const TARGET = "385d0f21-fee7-4acb-9f69-a70051e3ad38";

queries.forEach(query => {
  try {
    console.log(`Testing: "${query}"`);
    const cmd = `env RESPONSE_STYLE=short npm run try:apex -- --q "${query}"`;
    const output = execSync(cmd, { encoding: 'utf8', timeout: 10000 });
    
    // Extract JSON
    const lines = output.split('\n');
    const jsonLine = lines.find(line => line.trim().startsWith('{"q":'));
    
    if (jsonLine) {
      const result = JSON.parse(jsonLine);
      const faqId = result.res?.faq_id;
      const isCorrect = faqId === TARGET;
      console.log(`  → ${isCorrect ? '✅' : '❌'} FAQ: ${faqId ? faqId.substring(0, 8) + '...' : 'none'}`);
    } else {
      console.log('  → ❌ No JSON found');
    }
  } catch (err) {
    console.log(`  → ❌ Error: ${err.message.substring(0, 50)}`);
  }
  console.log('');
});