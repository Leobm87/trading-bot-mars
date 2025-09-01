const fs = require('fs');
const data = require('./logs/analysis/APEX-misses.detail.json');

const misses = data.filter(item => 
  item.predicted === 'NONE' || 
  (item.expected !== item.predicted && item.predicted !== 'NONE')
);

console.log('Total misses:', misses.length);

// Generate F7 targets
const f7_targets = misses.map(item => ({
  cluster: 'undefined',
  q: item.q,
  expected: item.expected,
  predicted: item.predicted,
  prepin_top8: item.retriever_top8 ? item.retriever_top8.map(r => r.id) : [],
  stage_derail: item.predicted === 'NONE' ? 'selector' : 'golden_mismatch'
}));

fs.writeFileSync('logs/analysis/APEX-F7.targets.json', JSON.stringify(f7_targets, null, 2));
console.log('Generated APEX-F7.targets.json with', f7_targets.length, 'items');

// Show first few for inspection
console.log('\nFirst 3 targets:');
f7_targets.slice(0, 3).forEach((t, i) => {
  console.log(`${i+1}. "${t.q}" -> expected: ${t.expected}, predicted: ${t.predicted}`);
});