#!/usr/bin/env node
/**
 * Test de Categoría: REGLAS Y RESTRICCIONES
 */

const { testBatch, generateReport, cleanup } = require('../telegram-test-optimized.cjs');
const fs = require('fs');
const path = require('path');

const questions = [
  "puedo dejar trades abiertos overnight?",
  "se puede tradear durante noticias importantes?",
  "puedo operar durante FOMC y NFP?",
  "que es la regla de consistencia del 30%?",
  "como funciona la regla one direction?",
  "puedo usar EA o robots de trading?",
  "esta permitido el copy trading?",
  "puedo compartir cuenta con otro trader?",
  "que pasa si violo una regla?",
  "hay blacklist de estrategias prohibidas?",
  "puedo hacer hedging en la misma cuenta?",
  "esta permitido el HFT?",
  "hay limite maximo de trades por dia?",
  "puedo tradear todos los instrumentos desde el dia 1?",
  "que pasa con rollovers de contratos?"
];

async function run() {
  console.log('🚫 REGLAS Y RESTRICCIONES TEST\n');
  console.log('=' .repeat(60));
  
  const results = await testBatch(questions, { 
    showProgress: true, 
    categoryName: 'Reglas y Restricciones' 
  });
  
  const report = generateReport(results, 'reglas');
  
  // Guardar reporte
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const reportPath = path.join(__dirname, '..', '..', '..', 'logs', `telegram-test-reglas-${timestamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Mostrar resumen
  console.log('\n📊 RESUMEN:');
  console.log(`   Total: ${report.summary.total}`);
  console.log(`   ✅ Exitosas: ${report.summary.successful}`);
  console.log(`   ⚠️  No encontradas: ${report.summary.notFound}`);
  console.log(`   ❌ Fallidas: ${report.summary.failed}`);
  console.log(`   📈 Tasa de éxito: ${report.summary.successRate}`);
  console.log(`   ⏱️  Tiempo promedio: ${report.summary.avgResponseTime}`);
  
  await cleanup();
  return report;
}

if (require.main === module) {
  run().then(() => process.exit(0)).catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

module.exports = { run };