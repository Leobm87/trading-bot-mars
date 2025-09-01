// scripts/extract-failures.cjs
require('dotenv').config();
const fs = require('fs');
const path = require('path');

function safeJSONL(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean);
  return lines.map(l => JSON.parse(l));
}

(async () => {
  const goldenPath = path.join(__dirname, '..', 'tests', 'golden', 'apex.jsonl');
  const golden = safeJSONL(goldenPath);

  // Use APEX service directly (ESM import)
  const { default: ApexService } = await import('../services/firms/apex/index.js');
  const apexService = new ApexService();

  const misses = [];
  let hits = 0;

  for (const { q, expected_faq_id, intent } of golden) {
    const res = await apexService.processQuery(q);
    const gotId = res && res.faq_id;
    const hit = !!(gotId && expected_faq_id && gotId === expected_faq_id);
    
    if (!hit) {
      // This is a miss - determine stage_derail
      let stage_derail;
      if (!expected_faq_id) {
        stage_derail = "golden_mismatch"; // invalid golden
      } else if (!gotId) {
        stage_derail = "selector"; // no FAQ selected
      } else if (gotId !== expected_faq_id) {
        stage_derail = "golden_mismatch"; // different FAQ than expected
      } else {
        stage_derail = "unknown";
      }

      misses.push({
        q,
        expected_faq_id,
        predicted_faq_id: gotId || null,
        prepin_top8_ids: [], // TODO: implement prepin analysis
        has_expected_in_top8: null,
        has_predicted_in_top8: null,
        stage_derail
      });
    } else {
      hits++;
    }
  }

  console.log(`\nFOUND ${misses.length} misses out of ${golden.length} total (${hits} hits)`);
  console.log(`Exact@1: ${(hits/golden.length).toFixed(4)}`);

  // Save detailed misses
  const outputPath = path.join(__dirname, '..', 'logs', 'analysis', 'APEX-misses.detail.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(misses, null, 2));
  
  console.log(`\nDetailed misses saved to: ${outputPath}`);
  
  // Summary by stage_derail
  const byStage = {};
  misses.forEach(m => {
    byStage[m.stage_derail] = (byStage[m.stage_derail] || 0) + 1;
  });
  
  console.log(`\nMisses by stage:`);
  Object.entries(byStage).forEach(([stage, count]) => {
    console.log(`  ${stage}: ${count}`);
  });

})().catch(e => { console.error(e); process.exit(1); });

// Forzar determinismo
process.env.LLM_SELECTOR_SHUFFLE = 'false';

async function main() {
  console.log('🔍 Extrayendo fallos del golden test...');
  
  // Cargar golden data
  const goldenPath = path.join(__dirname, '..', 'tests', 'golden', 'apex.jsonl');
  const golden = loadGoldenData(goldenPath);
  
  if (golden.length === 0) {
    console.error('❌ No se encontraron queries en el golden dataset');
    process.exit(1);
  }
  
  console.log(`📊 Evaluando ${golden.length} queries...`);
  
  const { evalQueriesMcp } = require('../services/eval/runMcpE2E.cjs');
  
  // Ejecutar evaluación
  const result = await evalQueriesMcp(golden, { pinnerOff: false });
  const failures = [];
  
  // Identificar fallos
  for (const queryResult of result.results) {
    if (!queryResult.hit) {
      // Buscar el slug esperado
      const goldenItem = golden.find(g => g.q === queryResult.q);
      let expectedSlug = 'UNKNOWN';
      
      if (goldenItem && goldenItem.expected_faq_id) {
        // Intentar extraer el slug del formato actual
        expectedSlug = goldenItem.expected_faq_id;
        if (typeof goldenItem.expected_faq_id === 'object' && goldenItem.expected_faq_id.id) {
          expectedSlug = goldenItem.expected_faq_id.id;
        }
      }
      
      failures.push({
        q: queryResult.q,
        expected_id: queryResult.expected_faq_id,
        expected_slug: expectedSlug,
        got_id: queryResult.got_faq_id,
        got_slug: queryResult.got_faq_id || 'NONE',
        intent: queryResult.intent,
        stage_where_it_derails: 'selector_or_retriever' // To be determined
      });
    }
  }
  
  console.log(`❌ Encontrados ${failures.length} fallos:`);
  failures.forEach((f, i) => {
    console.log(`${i+1}. "${f.q}"`);
    console.log(`   Intent: ${f.intent}`);
    console.log(`   Expected: ${f.expected_slug}`);
    console.log(`   Got: ${f.got_slug}`);
    console.log('');
  });
  
  // Categorizar por intent
  const byIntent = {};
  failures.forEach(f => {
    byIntent[f.intent] = byIntent[f.intent] || [];
    byIntent[f.intent].push(f);
  });
  
  console.log('📊 Fallos por intent:');
  Object.entries(byIntent).forEach(([intent, fails]) => {
    console.log(`${intent}: ${fails.length}`);
  });
  
  // Guardar fallos
  const outputPath = path.join(__dirname, '..', 'logs', 'analysis', 'APEX-DIFF.failures.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(failures, null, 2));
  
  console.log(`💾 Fallos guardados en: ${outputPath}`);
}

function loadGoldenData(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    return lines.map(line => JSON.parse(line));
  } catch (error) {
    console.error(`Error loading golden data from ${filePath}:`, error.message);
    return [];
  }
}

main().catch(error => {
  console.error('💥 Error extrayendo fallos:', error);
  process.exit(1);
});