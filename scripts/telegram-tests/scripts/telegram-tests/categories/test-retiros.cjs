#!/usr/bin/env node
/**
 * Test de Categoría: RETIROS Y PAGOS
 */

const { testBatch, generateReport, cleanup } = require('../telegram-test-optimized.cjs');
const fs = require('fs');
const path = require('path');

const questions = [
  "cuando puedo hacer mi primer retiro?",
  "cual es el minimo para retirar?",
  "cada cuanto puedo solicitar retiros?",
  "como funcionan los metodos de pago (wise/plane)?",
  "que porcentaje del profit me quedo?",
  "hay limite maximo de retiro mensual?",
  "que es el safety net o threshold?",
  "puedo hacer retiros parciales?",
  "que pasa si retiro todo el profit?",
  "puedo reinvertir ganancias en mas contratos?",
  "cuanto tarda en llegar el payout?",
  "hay fee por retiro?",
  "necesito mantener minimo en la cuenta?",
  "como se calculan los impuestos?",
  "puedo retirar en crypto o paypal?"
];

async function run() {
  console.log('💵 RETIROS Y PAGOS TEST\n');
  console.log('=' .repeat(60));
  
  const results = await testBatch(questions, { 
    showProgress: true, 
    categoryName: 'Retiros y Pagos' 
  });
  
  const report = generateReport(results, 'retiros');
  
  // Guardar reporte
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const reportPath = path.join(__dirname, '..', '..', '..', 'logs', `telegram-test-retiros-${timestamp}.json`);
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