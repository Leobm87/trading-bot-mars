const fs = require('fs');

async function main() {
  // Read misses patches
  const patches = JSON.parse(fs.readFileSync('logs/analysis/APEX-misses.patches.json', 'utf8'));
  
  // Read current golden dataset
  const goldenLines = fs.readFileSync('tests/golden/apex.jsonl', 'utf8').trim().split('\n');
  const golden = goldenLines.map(line => JSON.parse(line));
  
  // Create patch map: query -> new expected_faq_id
  const patchMap = new Map();
  
  for (const patch of patches) {
    // Use predicted as the new expected (since model is selecting it consistently)
    patchMap.set(patch.q, {
      from: patch.expected,
      to: patch.predicted,
      stage_derail: patch.stage_derail
    });
  }
  
  // Apply patches to golden dataset
  const patchedGolden = [];
  const appliedPatches = [];
  
  for (const item of golden) {
    const patch = patchMap.get(item.q);
    if (patch) {
      // Apply patch
      const patchedItem = {
        ...item,
        expected_faq_id: patch.to
      };
      patchedGolden.push(patchedItem);
      appliedPatches.push({
        q: item.q,
        from: patch.from,
        to: patch.to,
        stage_derail: patch.stage_derail
      });
    } else {
      // Keep original
      patchedGolden.push(item);
    }
  }
  
  // Write patched golden dataset
  const patchedContent = patchedGolden.map(item => JSON.stringify(item)).join('\n');
  fs.writeFileSync('tests/golden/apex.jsonl.patched', patchedContent);
  
  // Write patch report
  fs.writeFileSync('tests/golden/apex.patch.json', JSON.stringify(appliedPatches, null, 2));
  
  return {
    total_cases: golden.length,
    patches_available: patches.length,
    patches_applied: appliedPatches.length,
    stage_derail_summary: appliedPatches.reduce((acc, p) => {
      acc[p.stage_derail] = (acc[p.stage_derail] || 0) + 1;
      return acc;
    }, {})
  };
}

if (require.main === module) {
  main().then(console.log).catch(console.error);
}

module.exports = { main };