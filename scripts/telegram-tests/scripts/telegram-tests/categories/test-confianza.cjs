#!/usr/bin/env node
/**
 * Test de Categoría: CONFIANZA Y COMPARACIÓN
 */

const { testBatch, generateReport, cleanup } = require('../telegram-test-optimized.cjs');
const fs = require('fs');
const path = require('path');

const questions = [
  "por que elegir apex sobre otras props?",
  "que ventajas tiene apex vs ftmo?",
  "como es apex comparado con topstep?",
  "apex paga consistentemente?",
  "cuantos traders activos tienen?",
  "que porcentaje pasa la evaluacion?",
  "tienen regulacion o garantias?",
  "cuanto puedo ganar realisticamente al mes?",
  "necesito experiencia previa?",
  "es apex bueno para principiantes?",
  "apex es sostenible a largo plazo?"
];

async function run() {
  console.log('🏆 CONFIANZA Y COMPARACIÓN TEST\n');
  console.log('=' .repeat(60));
  
  const results = await testBatch(questions, { 
    showProgress: true, 
    categoryName: 'Confianza y Comparación' 
  });
  
  const report = generateReport(results, 'confianza');
  
  // Guardar reporte
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const reportPath = path.join(__dirname, '..', '..', '..', 'logs', `telegram-test-confianza-${timestamp}.json`);
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