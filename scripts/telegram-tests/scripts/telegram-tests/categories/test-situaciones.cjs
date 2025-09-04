#!/usr/bin/env node
/**
 * Test de Categoría: SITUACIONES Y SOPORTE
 */

const { testBatch, generateReport, cleanup } = require('../telegram-test-optimized.cjs');
const fs = require('fs');
const path = require('path');

const questions = [
  "que pasa si dejo un trade abierto por error overnight?",
  "a que hora exacta cierra el mercado?",
  "que pasa si pierdo mas del drawdown permitido?",
  "puedo recuperar una cuenta eliminada?",
  "como reporto problemas tecnicos?",
  "hay soporte en español?",
  "cuanto tarda el soporte en responder?",
  "que garantias tengo si hay problemas con la plataforma?",
  "puedo cambiar mi estrategia despues de empezar?",
  "hay auditoria de trades?",
  "cuando puedo empezar a tradear tras el pago?",
  "puedo pausar la evaluacion por vacaciones?"
];

async function run() {
  console.log('⚠️ SITUACIONES Y SOPORTE TEST\n');
  console.log('=' .repeat(60));
  
  const results = await testBatch(questions, { 
    showProgress: true, 
    categoryName: 'Situaciones y Soporte' 
  });
  
  const report = generateReport(results, 'situaciones');
  
  // Guardar reporte
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const reportPath = path.join(__dirname, '..', '..', '..', 'logs', `telegram-test-situaciones-${timestamp}.json`);
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