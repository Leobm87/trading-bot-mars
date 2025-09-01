// scripts/apply-patch-golden.cjs
const fs = require('fs');
const path = require('path');

function safeJSONL(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean);
  return lines.map(l => JSON.parse(l));
}

function writeJSONL(filePath, data) {
  const lines = data.map(obj => JSON.stringify(obj));
  fs.writeFileSync(filePath, lines.join('\n') + '\n');
}

const goldenPath = path.join(__dirname, '..', 'tests', 'golden', 'apex.jsonl');
const patchPath = path.join(__dirname, '..', 'tests', 'golden', 'apex.patch.json');

const golden = safeJSONL(goldenPath);
const patches = JSON.parse(fs.readFileSync(patchPath, 'utf8'));

let applied = 0;

// Apply patches
patches.forEach(patch => {
  const entry = golden.find(g => g.q === patch.q);
  if (entry && entry.expected_faq_id === patch.from) {
    console.log(`✅ PATCHING: "${patch.q}"`);
    console.log(`   FROM: ${patch.from}`);
    console.log(`   TO:   ${patch.to}`);
    console.log(`   REASON: ${patch.reason}`);
    entry.expected_faq_id = patch.to;
    applied++;
  } else if (entry) {
    console.log(`❌ MISMATCH: "${patch.q}" has expected_faq_id ${entry.expected_faq_id}, not ${patch.from}`);
  } else {
    console.log(`❌ NOT FOUND: "${patch.q}"`);
  }
});

console.log(`\n📊 Applied ${applied}/${patches.length} patches`);

// Write updated golden
writeJSONL(goldenPath, golden);
console.log(`✅ Updated golden saved to: ${goldenPath}`);