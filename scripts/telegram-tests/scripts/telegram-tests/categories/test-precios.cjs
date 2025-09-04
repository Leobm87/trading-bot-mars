#!/usr/bin/env node
/**
 * Test de Categoría: PRECIOS Y CUENTAS
 */

const { testBatch, generateReport, cleanup } = require('../telegram-test-optimized.cjs');
const fs = require('fs');
const path = require('path');

const questions = [
  "cuanto cuesta la cuenta de 25k?",
  "cuanto sale la cuenta de 50k?",
  "que precio tiene la de 100k?",
  "cual es la cuenta mas barata?",
  "cuanto cuesta la static de 50k?",
  "que diferencia hay entre normal y static?",
  "hay descuentos disponibles?",
  "cual cuenta me conviene con 500 dolares?",
  "puedo tener varias cuentas a la vez?",
  "como funcionan los precios de las cuentas grandes (150k, 250k, 300k)?"
];

async function run() {
  console.log('💰 PRECIOS Y CUENTAS TEST\n');
  console.log('=' .repeat(60));
  
  const results = await testBatch(questions, { 
    showProgress: true, 
    categoryName: 'Precios y Cuentas' 
  });
  
  const report = generateReport(results, 'precios');
  
  // Guardar reporte
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const reportPath = path.join(__dirname, '..', '..', '..', 'logs', `telegram-test-precios-${timestamp}.json`);
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