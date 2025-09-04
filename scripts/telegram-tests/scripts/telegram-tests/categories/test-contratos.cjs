#!/usr/bin/env node
/**
 * Test de Categoría: TRADING Y CONTRATOS
 */

const { testBatch, generateReport, cleanup } = require('../telegram-test-optimized.cjs');
const fs = require('fs');
const path = require('path');

const questions = [
  "cuantos contratos puedo usar?",
  "cuando puedo usar todos los contratos?",
  "puedo tradear nasdaq?",
  "que instrumentos hay?",
  "puedo operar crypto?",
  "cuantos micros son un mini?",
  "hay oro y petroleo?",
  "que es mejor para principiantes?",
  "puedo hacer scalping?",
  "hay limit de trades por dia?"
];

async function run() {
  console.log('🎮 TRADING Y CONTRATOS TEST\n');
  console.log('=' .repeat(60));
  
  const results = await testBatch(questions, { 
    showProgress: true, 
    categoryName: 'Trading y Contratos' 
  });
  
  const report = generateReport(results, 'contratos');
  
  // Guardar reporte
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const reportPath = path.join(__dirname, '..', '..', '..', 'logs', `telegram-test-contratos-${timestamp}.json`);
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