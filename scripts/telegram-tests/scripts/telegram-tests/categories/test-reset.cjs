#!/usr/bin/env node
/**
 * Test de Categoría: RESET Y PA
 */

const { testBatch, generateReport, cleanup } = require('../telegram-test-optimized.cjs');
const fs = require('fs');
const path = require('path');

const questions = [
  "cuanto cuesta resetear la evaluacion?",
  "hay reset gratis disponible?",
  "que es la activacion PA?",
  "cuanto cuesta activar la cuenta PA?",
  "tengo que pagar mensualidad despues de pasar?",
  "cuanto es la mensualidad por tamaño de cuenta?",
  "que pasa si no pago la mensualidad?",
  "puedo pausar la cuenta PA?",
  "hay descuento en la activacion PA?",
  "cuanto tiempo tengo para activar despues de pasar?",
  "pierdo la cuenta si no pago un mes?",
  "puedo reactivar una cuenta pausada?"
];

async function run() {
  console.log('🔄 RESET Y PA TEST\n');
  console.log('=' .repeat(60));
  
  const results = await testBatch(questions, { 
    showProgress: true, 
    categoryName: 'Reset y PA' 
  });
  
  const report = generateReport(results, 'reset');
  
  // Guardar reporte
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const reportPath = path.join(__dirname, '..', '..', '..', 'logs', `telegram-test-reset-${timestamp}.json`);
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