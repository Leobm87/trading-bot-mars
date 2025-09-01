const fs = require('fs');

const FIRM_ID = '854bf730-8420-4297-86f8-3c4a972edcf2';

async function main() {
  // Read misses file
  const missesRaw = fs.readFileSync('logs/analysis/APEX-misses.detail.json', 'utf8');
  const misses = JSON.parse(missesRaw);
  
  // Extract unique IDs to validate
  const idsToValidate = new Set();
  const patches = [];
  
  for (const miss of misses) {
    if (miss.expected && miss.expected !== 'NONE' && miss.predicted && miss.predicted !== 'NONE') {
      idsToValidate.add(miss.expected);
      idsToValidate.add(miss.predicted);
      
      // Store potential patch
      patches.push({
        q: miss.q,
        expected: miss.expected,
        predicted: miss.predicted,
        stage_derail: miss.stage_derail
      });
    }
  }
  
  console.log(`Found ${patches.length} potential patches to validate`);
  console.log(`Total unique IDs to check: ${idsToValidate.size}`);
  
  // Output validation queries for manual execution
  console.log('\n-- SQL QUERIES TO VALIDATE:');
  for (const id of idsToValidate) {
    console.log(`SELECT id, slug, title FROM faqs WHERE id='${id}' AND firm_id='${FIRM_ID}' LIMIT 1;`);
  }
  
  // Output patches for later use
  fs.writeFileSync('logs/analysis/APEX-misses.patches.json', JSON.stringify(patches, null, 2));
  
  return {
    patches_count: patches.length,
    unique_ids: idsToValidate.size
  };
}

if (require.main === module) {
  main().then(console.log).catch(console.error);
}

module.exports = { main };