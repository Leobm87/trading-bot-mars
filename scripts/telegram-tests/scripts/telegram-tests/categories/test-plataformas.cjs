#!/usr/bin/env node
/**
 * Test de Categoría: PLATAFORMAS Y TECNOLOGÍA
 */

const { testBatch, generateReport, cleanup } = require('../telegram-test-optimized.cjs');
const fs = require('fs');
const path = require('path');

const questions = [
  "que plataformas puedo usar?",
  "tradingview esta disponible para apex?",
  "ninjatrader tiene costo adicional?",
  "que diferencia hay entre rithmic y tradovate?",
  "cuanto son las comisiones por contrato?",
  "necesito pagar data feed aparte?",
  "cual plataforma tiene menor latencia?",
  "puedo usar sierra chart o quantower?",
  "puedo tradear desde movil?",
  "que pasa si tengo problemas de conexion?"
];

async function run() {
  console.log('💻 PLATAFORMAS Y TECNOLOGÍA TEST\n');
  console.log('=' .repeat(60));
  
  const results = await testBatch(questions, { 
    showProgress: true, 
    categoryName: 'Plataformas y Tecnología' 
  });
  
  const report = generateReport(results, 'plataformas');
  
  // Guardar reporte
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const reportPath = path.join(__dirname, '..', '..', '..', 'logs', `telegram-test-plataformas-${timestamp}.json`);
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