#!/usr/bin/env node
/**
 * Test de Categoría: INSTRUMENTOS Y CONTRATOS
 */

const { testBatch, generateReport, cleanup } = require('../telegram-test-optimized.cjs');
const fs = require('fs');
const path = require('path');

const questions = [
  "que instrumentos puedo tradear?",
  "cuantos contratos puedo usar al inicio?",
  "cuando puedo usar el maximo de contratos?",
  "puedo tradear nasdaq y sp500?",
  "esta disponible el oro y petroleo?",
  "puedo operar crypto futuros?",
  "cual es la diferencia entre micros y minis?",
  "que es mejor para principiantes, micros o minis?",
  "como se escalan los contratos segun el balance?",
  "puedo tradear forex futuros?"
];

async function run() {
  console.log('🎮 INSTRUMENTOS Y CONTRATOS TEST\n');
  console.log('=' .repeat(60));
  
  const results = await testBatch(questions, { 
    showProgress: true, 
    categoryName: 'Instrumentos y Contratos' 
  });
  
  const report = generateReport(results, 'instrumentos');
  
  // Guardar reporte
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const reportPath = path.join(__dirname, '..', '..', '..', 'logs', `telegram-test-instrumentos-${timestamp}.json`);
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