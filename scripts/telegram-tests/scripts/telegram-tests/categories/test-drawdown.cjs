#!/usr/bin/env node
/**
 * Test de Categoría: DRAWDOWN Y PÉRDIDAS
 */

const { testBatch, generateReport, cleanup } = require('../telegram-test-optimized.cjs');
const fs = require('fs');
const path = require('path');

const questions = [
  "cual es el drawdown maximo de cada cuenta?",
  "como funciona el trailing drawdown?",
  "cuando se congela el trailing en 100 dolares?",
  "hay limite de perdida diaria?",
  "que pasa si toco el drawdown maximo?",
  "el trailing sigue con trades abiertos?",
  "cual es el EOD drawdown vs trailing?",
  "las comisiones afectan al drawdown?",
  "como se calcula el drawdown en la static?",
  "puedo perder todo el drawdown en un dia?",
  "como se resetea el balance para el drawdown?",
  "que pasa con gaps y slippage en el drawdown?"
];

async function run() {
  console.log('💸 DRAWDOWN Y PÉRDIDAS TEST\n');
  console.log('=' .repeat(60));
  
  const results = await testBatch(questions, { 
    showProgress: true, 
    categoryName: 'Drawdown y Pérdidas' 
  });
  
  const report = generateReport(results, 'drawdown');
  
  // Guardar reporte
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const reportPath = path.join(__dirname, '..', '..', '..', 'logs', `telegram-test-drawdown-${timestamp}.json`);
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