#!/usr/bin/env node
/**
 * Test de Categoría: EVALUACIÓN
 */

const { testBatch, generateReport, cleanup } = require('../telegram-test-optimized.cjs');
const fs = require('fs');
const path = require('path');

const questions = [
  "cual es el profit target para pasar?",
  "en cuanto tiempo maximo tengo que pasar?",
  "cuantos dias minimo de trading necesito?",
  "puedo pasar solo con micros?",
  "que pasa si paso pero no activo la PA?",
  "puedo elegir cuando empezar la evaluacion?",
  "se puede pausar o extender la evaluacion?",
  "puedo tradear los fines de semana?",
  "es evaluacion de una o dos fases?",
  "que pasa si no llego al profit target?",
  "necesito dias ganadores consecutivos?",
  "cual es el profit target de cada cuenta?",
  "puedo cambiar de cuenta durante la evaluacion?",
  "hay fee por reset de evaluacion?",
  "cuantas veces puedo resetear?"
];

async function run() {
  console.log('📊 EVALUACIÓN TEST\n');
  console.log('=' .repeat(60));
  
  const results = await testBatch(questions, { 
    showProgress: true, 
    categoryName: 'Evaluación' 
  });
  
  const report = generateReport(results, 'evaluacion');
  
  // Guardar reporte
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const reportPath = path.join(__dirname, '..', '..', '..', 'logs', `telegram-test-evaluacion-${timestamp}.json`);
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