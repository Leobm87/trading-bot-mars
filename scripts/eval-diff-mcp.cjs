/**
 * scripts/eval-diff-mcp.cjs
 * Ejecuta 68 queries del golden en modo "unit" y "batch" y reporta diferencias
 * Verifica que ambos modos usen el mismo runner MCP y produzcan resultados idénticos
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Forzar determinismo
process.env.LLM_SELECTOR_SHUFFLE = 'false';

async function main() {
  console.log('🔍 EVAL DIFF MCP - Verificando consistencia unit vs batch...');
  
  // Cargar golden data
  const goldenPath = path.join(__dirname, '..', 'tests', 'golden', 'apex.jsonl');
  const golden = loadGoldenData(goldenPath);
  
  if (golden.length === 0) {
    console.error('❌ No se encontraron queries en el golden dataset');
    process.exit(1);
  }
  
  console.log(`📊 Evaluando ${golden.length} queries en ambos modos...`);
  
  const { evalQueriesMcp } = require('../services/eval/runMcpE2E.cjs');
  
  // Ejecutar en modo "unit" (query por query)
  console.log('🔄 Modo UNIT: procesando queries individuales...');
  const unitResults = [];
  for (const query of golden) {
    const result = await evalQueriesMcp([query], { pinnerOff: false });
    unitResults.push(result.results[0]);
  }
  
  // Ejecutar en modo "batch" (todas las queries juntas)
  console.log('🔄 Modo BATCH: procesando todas las queries...');
  const batchResult = await evalQueriesMcp(golden, { pinnerOff: false });
  const batchResults = batchResult.results;
  
  // Comparar resultados
  const differences = [];
  
  for (let i = 0; i < golden.length; i++) {
    const unit = unitResults[i];
    const batch = batchResults[i];
    const query = golden[i];
    
    if (!unit || !batch) {
      differences.push({
        q: query.q,
        expected: query.expected_faq_id,
        issue: 'Missing result',
        unit_result: unit || null,
        batch_result: batch || null
      });
      continue;
    }
    
    // Comparar campos clave
    const unitId = unit.got_faq_id;
    const batchId = batch.got_faq_id;
    const unitSource = unit.source;
    const batchSource = batch.source;
    
    if (unitId !== batchId || unitSource !== batchSource) {
      differences.push({
        q: query.q,
        expected: query.expected_faq_id,
        unit_got: unitId,
        batch_got: batchId,
        unit_source: unitSource,
        batch_source: batchSource,
        stage: 'final_result'
      });
    }
  }
  
  // Generar reporte
  const report = {
    timestamp: new Date().toISOString(),
    prd: 'PRD-APEX-DISAMBIG-UMBRAL-2',
    total_queries: golden.length,
    differences_found: differences.length,
    consistency_check: differences.length === 0 ? 'PASS' : 'FAIL',
    unit_metrics: {
      exact_at_1: unitResults.filter(r => r.hit).length / golden.length,
      avg_latency: unitResults.reduce((acc, r) => acc + r.latency, 0) / unitResults.length
    },
    batch_metrics: {
      exact_at_1: batchResult.exact_at_1,
      avg_latency: batchResult.latency.mean
    },
    differences: differences.slice(0, 10) // Solo primeras 10 diferencias
  };
  
  // Guardar reporte
  const outputPath = path.join(__dirname, '..', 'logs', 'analysis', 'APEX-DIFF.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  
  // Imprimir resumen
  console.log('\n📋 RESUMEN:');
  console.log(`Total queries: ${report.total_queries}`);
  console.log(`Diferencias encontradas: ${report.differences_found}`);
  console.log(`Consistencia: ${report.consistency_check}`);
  console.log(`Unit Exact@1: ${report.unit_metrics.exact_at_1.toFixed(4)}`);
  console.log(`Batch Exact@1: ${report.batch_metrics.exact_at_1.toFixed(4)}`);
  console.log(`Reporte guardado en: ${outputPath}`);
  
  if (differences.length > 0) {
    console.log('\n❌ DIFERENCIAS ENCONTRADAS:');
    differences.slice(0, 5).forEach((diff, i) => {
      console.log(`${i+1}. Query: "${diff.q}"`);
      console.log(`   Expected: ${diff.expected}`);
      console.log(`   Unit: ${diff.unit_got} (${diff.unit_source})`);
      console.log(`   Batch: ${diff.batch_got} (${diff.batch_source})`);
      console.log('');
    });
    process.exit(1);
  } else {
    console.log('\n✅ No se encontraron diferencias. Runner único funcionando correctamente.');
    process.exit(0);
  }
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
  console.error('💥 Error ejecutando eval-diff-mcp:', error);
  process.exit(1);
});