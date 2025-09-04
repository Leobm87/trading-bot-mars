const fs = require('fs');

// Load data
const pins = JSON.parse(fs.readFileSync('./data/pins/apex.json', 'utf8'));
const golden = fs.readFileSync('./tests/golden/apex.jsonl', 'utf8')
  .split('\n').filter(Boolean).map(l=>JSON.parse(l));

// Helper to test with a subset of PINs
function testWithPins(pinIndices) {
  const testPins = {
    firm: 'apex',
    rules: pinIndices.map(i => pins.rules[i])
  };
  
  // Temporary test function
  const norm = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function resolveWithPins(q) {
    const text = norm(q);
    for (const r of testPins.rules) {
      if (!r) continue;
      try {
        const re = new RegExp(r.re, 'i');
        if (re.test(text)) return r.faq_id || null;
      } catch {}
    }
    return null;
  }
  
  let correct = 0;
  let pinned = 0;
  golden.forEach(test => {
    const result = resolveWithPins(test.q);
    if (result) {
      pinned++;
      if (result === test.expected_faq_id) correct++;
    }
  });
  
  return { pinned, correct, accuracy: pinned > 0 ? correct/pinned : 0 };
}

// Test removing each PIN one by one
console.log('=== ABLATION STUDY: REMOVING ONE PIN AT A TIME ===');
const allIndices = [...Array(pins.rules.length).keys()];

let criticalPins = [];
let redundantPins = [];

allIndices.forEach(removeIdx => {
  const remainingIndices = allIndices.filter(i => i !== removeIdx);
  const result = testWithPins(remainingIndices);
  const baseline = testWithPins(allIndices);
  
  const impact = baseline.correct - result.correct;
  if (impact > 0) {
    criticalPins.push({ index: removeIdx + 1, impact, rule: pins.rules[removeIdx].re.substring(0, 40) });
  } else {
    redundantPins.push({ index: removeIdx + 1, rule: pins.rules[removeIdx].re.substring(0, 40) });
  }
});

console.log('\nCRITICAL PINs (removing breaks tests):');
criticalPins.sort((a,b) => b.impact - a.impact).forEach(p => {
  console.log('  PIN #' + p.index + ' [breaks ' + p.impact + ' tests]: /' + p.rule + '.../');
});

console.log('\nREDUNDANT PINs (can be removed without impact):');
redundantPins.forEach(p => {
  console.log('  PIN #' + p.index + ': /' + p.rule + '.../');
});

// Test progressive removal of redundant PINs
console.log('\n=== PROGRESSIVE REMOVAL TEST ===');
let currentIndices = allIndices;
let removed = [];

redundantPins.forEach(p => {
  const testIndices = currentIndices.filter(i => i !== (p.index - 1));
  const result = testWithPins(testIndices);
  
  if (result.accuracy === 1.0 && result.correct === testWithPins(currentIndices).correct) {
    currentIndices = testIndices;
    removed.push(p.index);
  }
});

console.log('Can safely remove ' + removed.length + ' PINs: #' + removed.join(', #'));
console.log('Final PIN count: ' + currentIndices.length + ' (from ' + pins.rules.length + ')');

const finalResult = testWithPins(currentIndices);
console.log('Performance with ' + currentIndices.length + ' PINs:');
console.log('  - Tests resolved by PIN: ' + finalResult.pinned + '/' + golden.length);
console.log('  - Accuracy: ' + (finalResult.accuracy * 100).toFixed(1) + '%');
console.log('  - Correctly resolved: ' + finalResult.correct);