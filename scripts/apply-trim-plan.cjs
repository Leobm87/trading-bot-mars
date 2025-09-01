// scripts/apply-trim-plan.cjs
const fs = require('fs');
const path = require('path');

function applyTrimPlan() {
  // Load current pins
  const pinsPath = path.join(__dirname, '..', 'data', 'pins', 'apex.json');
  const pinsData = JSON.parse(fs.readFileSync(pinsPath, 'utf8'));
  const originalRules = pinsData.rules;
  
  // Load trim plan
  const planPath = path.join(__dirname, '..', 'data', 'pins', 'apex.trim.plan.json');
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  
  console.log(`Applying trim plan to ${originalRules.length} pins...`);
  
  // Collect pins to remove by index
  const toRemoveIndices = new Set();
  
  plan.actions.forEach(action => {
    if (action.type === 'remove') {
      const pinIndex = parseInt(action.pin.replace('pin_', ''));
      toRemoveIndices.add(pinIndex);
      console.log(`- Remove pin ${pinIndex}: ${action.reason}`);
    } else if (action.type === 'merge') {
      // For merges, remove all but the first pin in the merge list
      const fromIndices = action.from.map(p => parseInt(p.replace('pin_', '')));
      // Remove all except the first one (which becomes the merged pin)
      for (let i = 1; i < fromIndices.length; i++) {
        toRemoveIndices.add(fromIndices[i]);
        console.log(`- Remove pin ${fromIndices[i]} (merged into pin ${fromIndices[0]})`);
      }
    }
  });
  
  // Create new rules array excluding removed pins
  const newRules = originalRules.filter((rule, index) => !toRemoveIndices.has(index));
  
  console.log(`\nReduction: ${originalRules.length} -> ${newRules.length} pins (removed ${toRemoveIndices.size})`);
  
  if (newRules.length > 60) {
    console.error(`ERROR: Still have ${newRules.length} pins (target: ≤60)`);
    process.exit(1);
  }
  
  // Update pins data
  const newPinsData = {
    ...pinsData,
    rules: newRules
  };
  
  // Write updated pins file
  fs.writeFileSync(pinsPath, JSON.stringify(newPinsData, null, 2));
  console.log(`\nTrim plan applied successfully. New pins file saved.`);
  
  return {
    original_count: originalRules.length,
    new_count: newRules.length,
    removed_count: toRemoveIndices.size
  };
}

if (require.main === module) {
  applyTrimPlan();
}

module.exports = { applyTrimPlan };