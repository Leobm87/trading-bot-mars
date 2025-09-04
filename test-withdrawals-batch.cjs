#!/usr/bin/env node
const { execSync } = require('child_process');

const queries = [
  'retirar dinero', 'retiro fondos', 'payout', 'withdraw', 'sacar dinero', 
  'cobro', 'withdrawal', 'retirada', 'cuanto cobrar', 'monto retiro', 
  'limites retiro', 'retiro ganancias', 'solicitar retiro', 'proceso retiro', 
  'cómo retirar', 'retirada de fondos', 'primer retiro', 'minimo retiro', 'primer cobro'
];

let success = 0;
let results = [];

for (const q of queries) {
  try {
    const result = execSync(`RESPONSE_STYLE=short npm run try:apex -- --q "${q}"`, { 
      encoding: 'utf8', 
      timeout: 15000,
      stdio: ['pipe', 'pipe', 'ignore']
    });
    
    const okMatch = result.match(/"ok":\s*true/);
    const isOk = !!okMatch;
    
    if (isOk) success++;
    results.push({ q, ok: isOk });
    console.log(`${isOk ? '✓' : '✗'} ${q}`);
    
  } catch (e) {
    results.push({ q, ok: false, error: e.message });
    console.log(`✗ ${q}: ERROR`);
  }
}

console.log(`\nSUCCESS RATE: ${success}/${queries.length}`);
console.log(`HIT RATE: ${success}/${queries.length} = ${(success/queries.length*100).toFixed(1)}%`);

// Save results
const fs = require('fs');
fs.writeFileSync('logs/analysis/withdrawals-hit-rate.json', JSON.stringify({
  success_count: success,
  total: queries.length,
  hit_rate: `${success}/${queries.length}`,
  results
}, null, 2));