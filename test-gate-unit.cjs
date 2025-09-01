const { gateIntent } = require('./services/common/intent-gate.cjs');

const tests = [
  'primer retiro',
  'primer payout', 
  '¿cuál es el mínimo para retirar?',
  'cuando cobro',
  'payout minimo',
  'como retiro'
];

console.log('=== UNIT GATE TEST ===');
let passed = 0;

tests.forEach(q => {
  const intents = gateIntent(q);
  const pass = intents.includes('withdrawals') && intents[0] === 'withdrawals';
  const status = pass ? '✓' : '✗';
  console.log(`${status} "${q}" -> [${intents.join(', ')}] (withdrawals=${intents.includes('withdrawals')}, first=${intents[0] === 'withdrawals'})`);
  if (pass) passed++;
});

console.log(`\n=== RESULT: ${passed}/${tests.length} passed ===`);
process.exit(passed === tests.length ? 0 : 1);