#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { evalQueriesMcp } = require('../services/eval/runMcpE2E.cjs');

function loadGolden(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean);
  return lines.map(l => JSON.parse(l));
}

(async () => {
  const goldenPath = path.join(__dirname, '..', 'tests', 'golden', 'apex.jsonl');
  const golden = loadGolden(goldenPath);
  const result = await evalQueriesMcp(golden);
  const misses = result.results.filter(r => !r.hit);
  console.log('Misses:', misses.length);
  for (const m of misses) {
    console.log('-', m.q, 'expected=', m.expected_faq_id, 'got=', m.got_faq_id);
  }
})();

