#!/usr/bin/env node
/**
 * Test Runner para el Bot de Telegram
 * Ejecuta todas las preguntas de la comunidad y genera reporte detallado
 */

const fs = require('fs');
const path = require('path');
const { testBatch, generateReport } = require('./telegram-bot-tester.cjs');

// Cargar preguntas de la comunidad
function loadCommunityQuestions() {
  const filePath = path.join(__dirname, '..', 'tests', 'apex-community-questions.txt');
  const content = fs.readFileSync(filePath, 'utf8');
  
  const questions = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    // Filtrar solo líneas con preguntas (que empiezan con número)
    if (/^\d+\.\s/.test(line)) {
      const question = line.replace(/^\d+\.\s/, '').trim();
      if (question && !question.startsWith('#')) {
        questions.push(question);
      }
    }
  }
  
  return questions;
}

// Categorizar preguntas para mejor análisis
function categorizeQuestions(questions) {
  return {
    precios: questions.filter(q => 
      /precio|costo|cuanto|sale|vale|barato|caro/i.test(q)
    ),
    evaluacion: questions.filter(q => 
      /evaluac|profit|target|ganar|pasar|fase|dias/i.test(q)
    ),
    drawdown: questions.filter(q => 
      /drawdown|perder|perdida|trailing|congela/i.test(q)
    ),
    reglas: questions.filter(q => 
      /regla|noche|overnight|swing|news|noticias|consistencia|30%/i.test(q)
    ),
    retiros: questions.filter(q => 
      /retir|sacar|cobrar|pagar|payout|wise|plane|safety/i.test(q)
    ),
    contratos: questions.filter(q => 
      /contrato|micro|mini|lote|nasdaq|oro|crypto/i.test(q)
    ),
    plataformas: questions.filter(q => 
      /plataforma|trading\s?view|ninja|rithmic|tradovate|mt4|mt5/i.test(q)
    ),
    reset: questions.filter(q => 
      /reset|activar|funded|pa\b|mensual|suscripcion/i.test(q)
    ),
    paises: questions.filter(q => 
      /pais|argentina|españa|venezuela|colombia|mexico|latino/i.test(q)
    ),
    general: questions.filter(q => 
      /apex|ftmo|scam|vale|pena|mejor|experiencia/i.test(q)
    )
  };
}

// Analizar patrones en respuestas fallidas
function analyzeFailurePatterns(results) {
  const notFoundQueries = results.filter(r => r.isNotFound).map(r => r.query);
  const failedQueries = results.filter(r => !r.success && !r.isNotFound).map(r => r.query);
  
  // Palabras comunes en queries sin respuesta
  const commonWordsInNotFound = {};
  notFoundQueries.forEach(q => {
    const words = q.toLowerCase().split(/\s+/);
    words.forEach(word => {
      if (word.length > 3) { // Ignorar palabras muy cortas
        commonWordsInNotFound[word] = (commonWordsInNotFound[word] || 0) + 1;
      }
    });
  });
  
  // Ordenar palabras por frecuencia
  const topMissingWords = Object.entries(commonWordsInNotFound)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));
  
  return {
    notFoundCount: notFoundQueries.length,
    failedCount: failedQueries.length,
    topMissingWords,
    sampleNotFound: notFoundQueries.slice(0, 10),
    sampleFailed: failedQueries.slice(0, 10)
  };
}

// Generar reporte detallado con categorías
function generateDetailedReport(results, categories) {
  const basicReport = generateReport(results);
  
  // Análisis por categoría
  const categoryAnalysis = {};
  for (const [category, questions] of Object.entries(categories)) {
    const categoryResults = results.filter(r => 
      questions.includes(r.query)
    );
    
    if (categoryResults.length > 0) {
      const successful = categoryResults.filter(r => r.success).length;
      const notFound = categoryResults.filter(r => r.isNotFound).length;
      const failed = categoryResults.filter(r => !r.success && !r.isNotFound).length;
      
      categoryAnalysis[category] = {
        total: categoryResults.length,
        successful,
        notFound,
        failed,
        successRate: `${((successful / categoryResults.length) * 100).toFixed(1)}%`
      };
    }
  }
  
  // Análisis de patrones de fallo
  const failurePatterns = analyzeFailurePatterns(results);
  
  // Queries más lentas
  const slowestQueries = [...results]
    .sort((a, b) => (b.responseTime || 0) - (a.responseTime || 0))
    .slice(0, 10)
    .map(r => ({
      query: r.query,
      time: `${r.responseTime}ms`,
      success: r.success
    }));
  
  // FAQs más utilizadas
  const faqUsage = {};
  results.forEach(r => {
    if (r.faq_id) {
      faqUsage[r.faq_id] = (faqUsage[r.faq_id] || 0) + 1;
    }
  });
  const topFaqs = Object.entries(faqUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([faq_id, count]) => ({ faq_id, count }));
  
  return {
    ...basicReport,
    categoryAnalysis,
    failurePatterns,
    slowestQueries,
    topFaqs,
    recommendations: generateRecommendations(basicReport, failurePatterns, categoryAnalysis)
  };
}

// Generar recomendaciones basadas en el análisis
function generateRecommendations(basicReport, failurePatterns, categoryAnalysis) {
  const recommendations = [];
  
  // Basado en tasa de éxito general
  if (basicReport.summary.successful / basicReport.summary.total < 0.8) {
    recommendations.push({
      priority: 'HIGH',
      type: 'coverage',
      message: 'La cobertura es menor al 80%. Se recomienda añadir más PINs y FAQs.'
    });
  }
  
  // Basado en palabras comunes sin respuesta
  if (failurePatterns.topMissingWords.length > 0) {
    const topWords = failurePatterns.topMissingWords.slice(0, 5).map(w => w.word).join(', ');
    recommendations.push({
      priority: 'MEDIUM',
      type: 'missing_topics',
      message: `Palabras frecuentes sin respuesta: ${topWords}. Considerar añadir FAQs sobre estos temas.`
    });
  }
  
  // Basado en categorías con bajo rendimiento
  for (const [category, stats] of Object.entries(categoryAnalysis)) {
    const successRate = parseFloat(stats.successRate);
    if (successRate < 70) {
      recommendations.push({
        priority: 'HIGH',
        type: 'category',
        message: `Categoría "${category}" con baja cobertura (${stats.successRate}). Requiere atención urgente.`
      });
    }
  }
  
  // Basado en tiempo de respuesta
  const avgTime = parseFloat(basicReport.summary.avgResponseTime);
  if (avgTime > 500) {
    recommendations.push({
      priority: 'LOW',
      type: 'performance',
      message: `Tiempo de respuesta promedio alto (${avgTime}ms). Considerar optimización.`
    });
  }
  
  return recommendations;
}

// Función principal
async function runFullTest() {
  console.log('🚀 TELEGRAM BOT FULL TEST SUITE\n');
  console.log('=' .repeat(70));
  console.log('\n📋 Loading community questions...');
  
  const allQuestions = loadCommunityQuestions();
  console.log(`   Found ${allQuestions.length} questions\n`);
  
  console.log('🔄 Categorizing questions...');
  const categories = categorizeQuestions(allQuestions);
  console.log(`   Categories: ${Object.keys(categories).join(', ')}\n`);
  
  console.log('🤖 Starting tests...\n');
  console.log('=' .repeat(70));
  
  // Ejecutar tests
  const results = await testBatch(allQuestions, { 
    showProgress: true, 
    delay: 10 // Delay mínimo para no saturar
  });
  
  console.log('\n' + '=' .repeat(70));
  console.log('\n📊 Generating detailed report...\n');
  
  // Generar reporte detallado
  const detailedReport = generateDetailedReport(results, categories);
  
  // Mostrar resumen en consola
  console.log('📈 SUMMARY:');
  console.log(`   Total Questions: ${detailedReport.summary.total}`);
  console.log(`   ✅ Successful: ${detailedReport.summary.successful} (${detailedReport.summary.successRate})`);
  console.log(`   ❌ Failed: ${detailedReport.summary.failed}`);
  console.log(`   ⚠️  Not Found: ${detailedReport.summary.notFound}`);
  console.log(`   ⏱️  Avg Response Time: ${detailedReport.summary.avgResponseTime}\n`);
  
  console.log('📂 CATEGORY BREAKDOWN:');
  for (const [category, stats] of Object.entries(detailedReport.categoryAnalysis)) {
    console.log(`   ${category}: ${stats.successRate} success (${stats.successful}/${stats.total})`);
  }
  
  console.log('\n🔍 FAILURE PATTERNS:');
  console.log(`   Questions without response: ${detailedReport.failurePatterns.notFoundCount}`);
  console.log(`   Failed queries: ${detailedReport.failurePatterns.failedCount}`);
  if (detailedReport.failurePatterns.topMissingWords.length > 0) {
    console.log(`   Top missing words: ${detailedReport.failurePatterns.topMissingWords.slice(0, 5).map(w => w.word).join(', ')}`);
  }
  
  console.log('\n💡 RECOMMENDATIONS:');
  detailedReport.recommendations.forEach(rec => {
    console.log(`   [${rec.priority}] ${rec.message}`);
  });
  
  // Guardar reporte completo
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const reportPath = path.join(__dirname, '..', 'logs', `telegram-test-full-${timestamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
  console.log(`\n📄 Full report saved to: ${reportPath}\n`);
  
  // Guardar queries sin respuesta para análisis
  if (detailedReport.notFound.length > 0) {
    const notFoundPath = path.join(__dirname, '..', 'logs', `telegram-notfound-${timestamp}.txt`);
    fs.writeFileSync(notFoundPath, detailedReport.notFound.join('\n'));
    console.log(`📝 Not found queries saved to: ${notFoundPath}\n`);
  }
  
  return detailedReport;
}

// Exportar para uso en otros scripts
module.exports = {
  loadCommunityQuestions,
  categorizeQuestions,
  analyzeFailurePatterns,
  generateDetailedReport,
  runFullTest
};

// Si se ejecuta directamente
if (require.main === module) {
  runFullTest()
    .then(report => {
      const exitCode = report.summary.failed > 0 ? 1 : 0;
      console.log('✅ Test completed\n');
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('❌ Error running tests:', error);
      process.exit(1);
    });
}