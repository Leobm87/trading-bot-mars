#!/usr/bin/env node
/**
 * Test de Categoría: PREGUNTAS GENERALES Y VARIADAS
 */

const { testBatch, generateReport, cleanup } = require('../telegram-test-optimized.cjs');
const fs = require('fs');
const path = require('path');

const questions = [
  // Situaciones específicas
  "que pasa si dejo un trade abierto por error?",
  "puedo tradear el domingo?",
  "a que hora cierra el mercado?",
  "me eliminan si pierdo un dia 2k?",
  "puedo recuperar mi cuenta si la pierdo?",
  "dan segundas oportunidades?",
  "que es el ratio 5:1?",
  "puedo arriesgar todo el drawdown?",
  "hay auditoria?",
  "me pueden quitar la cuenta funded?",
  
  // Preguntas frecuentes coloquiales
  "vale la pena apex?",
  "es mejor que ftmo?",
  "pagan de verdad?",
  "cuanto tarda el payout?",
  "hay gente cobrando?",
  "es scam?",
  "cuanto puedo ganar al mes?",
  "necesito experiencia?",
  "con cuanto empiezo?",
  "que cuenta me recomiendan?",
  
  // Detalles técnicos
  "cual es el apalancamiento?",
  "hay slippage?",
  "que spread tienen?",
  "los gaps cuentan?",
  "puedo usar indicadores?",
  "hay vps gratis?",
  "que latencia tienen?",
  "puedo usar multiple pantallas?",
  "hay api para trading?",
  "soportan webhooks?",
  
  // Comparaciones y dudas
  "que diferencia hay con topstep?",
  "es mas facil que otras props?",
  "por que no hay perdida diaria?",
  "por que el trailing para en 100?",
  "puedo pasar en un dia?",
  "cual es el truco?",
  "hay letra pequeña?",
  "que no me estan diciendo?",
  "cual es el catch?",
  "por que tan barato?",
  
  // Estrategias y consejos
  "puedo hacer hft?",
  "funciona el martingala?",
  "puedo hacer grid?",
  "se puede hedging?",
  "puedo promediar?",
  "hay limite de lotes?",
  "cuanto riesgo por trade?",
  "cuantos trades al dia maximo?",
  "puedo tradear indices?",
  "funciona en forex?",
  
  // Proceso y tiempo
  "cuanto tardan en aprobarme?",
  "cuando me dan la cuenta pa?",
  "cuanto tarda el reset?",
  "en cuanto tiempo pagan?",
  "hay soporte 24/7?",
  "hablan español?",
  "cuanto tarda la verificacion?",
  "cuando puedo empezar a tradear?",
  "hay demo antes?",
  "puedo pausar la evaluacion?",
  
  // Bonus: Preguntas muy coloquiales
  "apex es confiable bro?",
  "estan pagando ahorita?",
  "me clavan con las comisiones?",
  "puedo tradear btc?",
  "que onda con los impuestos?",
  "me van a joder si gano mucho?",
  "puedo meter a mi primo?",
  "sirve para vivir de esto?",
  "cuanta gente pasa la prueba?",
  "me la puedo jugar toda en un trade?"
];

async function run() {
  console.log('🤔 PREGUNTAS GENERALES TEST\n');
  console.log('=' .repeat(60));
  
  const results = await testBatch(questions, { 
    showProgress: true, 
    categoryName: 'Preguntas Generales' 
  });
  
  const report = generateReport(results, 'general');
  
  // Guardar reporte
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const reportPath = path.join(__dirname, '..', '..', '..', 'logs', `telegram-test-general-${timestamp}.json`);
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