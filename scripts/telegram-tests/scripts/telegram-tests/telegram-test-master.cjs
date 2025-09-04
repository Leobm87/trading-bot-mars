#!/usr/bin/env node
/**
 * Ejecutor Maestro de Tests de Telegram
 * Ejecuta todas las categorías y genera reporte consolidado
 */

const fs = require('fs');
const path = require('path');

// Importar todos los tests de categorías
const categories = [
  { name: 'Precios', runner: require('./categories/test-precios.cjs'), count: 10 },
  { name: 'Evaluación', runner: require('./categories/test-evaluacion.cjs'), count: 15 },
  { name: 'Drawdown', runner: require('./categories/test-drawdown.cjs'), count: 12 },
  { name: 'Reglas', runner: require('./categories/test-reglas.cjs'), count: 15 },
  { name: 'Retiros', runner: require('./categories/test-retiros.cjs'), count: 15 },
  { name: 'Instrumentos', runner: require('./categories/test-instrumentos.cjs'), count: 10 },
  { name: 'Plataformas', runner: require('./categories/test-plataformas.cjs'), count: 10 },
  { name: 'Reset', runner: require('./categories/test-reset.cjs'), count: 12 },
  { name: 'Países', runner: require('./categories/test-paises.cjs'), count: 8 },
  { name: 'Situaciones', runner: require('./categories/test-situaciones.cjs'), count: 12 },
  { name: 'Confianza', runner: require('./categories/test-confianza.cjs'), count: 11 },
  { name: 'General', runner: require('./categories/test-general.cjs'), count: 70 }
];

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function generateProgressBar(percentage, width = 30) {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  
  let color = colors.green;
  if (percentage < 50) color = colors.red;
  else if (percentage < 80) color = colors.yellow;
  
  return `${color}${bar}${colors.reset} ${percentage.toFixed(1)}%`;
}

async function runAllTests() {
  console.log('=' .repeat(70));
  console.log(`${colors.bright}${colors.cyan}🚀 TELEGRAM BOT MASTER TEST SUITE${colors.reset}`);
  console.log('=' .repeat(70));
  console.log('\n📋 Ejecutando tests por categorías para evitar timeouts...\n');
  
  const allReports = [];
  const startTime = Date.now();
  
  // Ejecutar cada categoría
  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];
    console.log(`\n${colors.bright}[${i + 1}/${categories.length}] Ejecutando: ${category.name} (${category.count} preguntas)${colors.reset}`);
    console.log('-'.repeat(60));
    
    try {
      const report = await category.runner.run();
      allReports.push(report);
      
      // Mostrar mini resumen
      const successRate = (report.summary.successful / report.summary.total) * 100;
      console.log(`   Resultado: ${generateProgressBar(successRate, 20)}`);
      console.log(`   ✅ ${report.summary.successful} | ⚠️  ${report.summary.notFound} | ❌ ${report.summary.failed}`);
    } catch (error) {
      console.error(`   ${colors.red}❌ Error en categoría ${category.name}: ${error.message}${colors.reset}`);
      allReports.push({
        category: category.name.toLowerCase(),
        summary: {
          total: category.count,
          successful: 0,
          failed: category.count,
          notFound: 0,
          successRate: '0%',
          avgResponseTime: '0ms'
        },
        error: error.message
      });
    }
    
    // Pequeña pausa entre categorías
    if (i < categories.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Generar reporte consolidado
  console.log('\n' + '=' .repeat(70));
  console.log(`${colors.bright}${colors.cyan}📊 GENERANDO REPORTE CONSOLIDADO${colors.reset}`);
  console.log('=' .repeat(70));
  
  const consolidatedReport = generateConsolidatedReport(allReports);
  const totalTime = Date.now() - startTime;
  consolidatedReport.totalExecutionTime = `${(totalTime / 1000).toFixed(1)}s`;
  
  // Guardar reporte consolidado
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const reportPath = path.join(__dirname, '..', '..', 'logs', `telegram-test-master-${timestamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(consolidatedReport, null, 2));
  
  // Mostrar resumen final
  displayFinalSummary(consolidatedReport);
  
  console.log(`\n📄 Reporte maestro guardado en: ${reportPath}\n`);
  
  // Generar lista de preguntas sin respuesta
  if (consolidatedReport.allNotFound.length > 0) {
    const notFoundPath = path.join(__dirname, '..', '..', 'logs', `telegram-master-notfound-${timestamp}.txt`);
    fs.writeFileSync(notFoundPath, consolidatedReport.allNotFound.join('\n'));
    console.log(`📝 Preguntas sin respuesta guardadas en: ${notFoundPath}\n`);
  }
  
  return consolidatedReport;
}

function generateConsolidatedReport(reports) {
  let totalQuestions = 0;
  let totalSuccessful = 0;
  let totalFailed = 0;
  let totalNotFound = 0;
  let totalResponseTime = 0;
  let responseCount = 0;
  
  const categoryBreakdown = {};
  const allNotFound = [];
  const allFailed = [];
  const faqUsage = {};
  
  reports.forEach(report => {
    if (report.error) {
      categoryBreakdown[report.category] = {
        error: report.error,
        ...report.summary
      };
      return;
    }
    
    totalQuestions += report.summary.total;
    totalSuccessful += report.summary.successful;
    totalFailed += report.summary.failed;
    totalNotFound += report.summary.notFound;
    
    const avgTime = parseFloat(report.summary.avgResponseTime);
    if (!isNaN(avgTime)) {
      totalResponseTime += avgTime * report.summary.total;
      responseCount += report.summary.total;
    }
    
    categoryBreakdown[report.category] = {
      ...report.summary,
      successRate: ((report.summary.successful / report.summary.total) * 100).toFixed(1) + '%'
    };
    
    if (report.notFound) {
      allNotFound.push(...report.notFound);
    }
    
    if (report.failed) {
      report.failed.forEach(f => allFailed.push(f.query));
    }
    
    if (report.successful) {
      report.successful.forEach(s => {
        if (s.faq_id) {
          faqUsage[s.faq_id] = (faqUsage[s.faq_id] || 0) + 1;
        }
      });
    }
  });
  
  const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;
  const overallSuccessRate = totalQuestions > 0 ? (totalSuccessful / totalQuestions) * 100 : 0;
  
  // Análisis de palabras comunes en queries sin respuesta
  const commonWordsInNotFound = {};
  allNotFound.forEach(q => {
    const words = q.toLowerCase().split(/\s+/);
    words.forEach(word => {
      if (word.length > 3) {
        commonWordsInNotFound[word] = (commonWordsInNotFound[word] || 0) + 1;
      }
    });
  });
  
  const topMissingWords = Object.entries(commonWordsInNotFound)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word, count]) => ({ word, count }));
  
  // FAQs más utilizadas
  const topFaqs = Object.entries(faqUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([faq_id, count]) => ({ faq_id, count }));
  
  return {
    summary: {
      total: totalQuestions,
      successful: totalSuccessful,
      failed: totalFailed,
      notFound: totalNotFound,
      successRate: `${overallSuccessRate.toFixed(1)}%`,
      avgResponseTime: `${avgResponseTime.toFixed(0)}ms`,
      categoriesTested: reports.length,
      categoriesSuccessful: reports.filter(r => !r.error).length
    },
    categoryBreakdown,
    topMissingWords,
    topFaqs,
    allNotFound,
    allFailed,
    timestamp: new Date().toISOString()
  };
}

function displayFinalSummary(report) {
  console.log(`\n${colors.bright}RESUMEN FINAL${colors.reset}`);
  console.log('─'.repeat(70));
  
  const successRate = parseFloat(report.summary.successRate);
  console.log(`Tasa de Éxito Global: ${generateProgressBar(successRate)}`);
  console.log(`Total Preguntas:      ${report.summary.total}`);
  console.log(`✅ Exitosas:          ${colors.green}${report.summary.successful}${colors.reset}`);
  console.log(`⚠️  No Encontradas:    ${colors.yellow}${report.summary.notFound}${colors.reset}`);
  console.log(`❌ Fallidas:          ${colors.red}${report.summary.failed}${colors.reset}`);
  console.log(`⏱️  Tiempo Promedio:   ${report.summary.avgResponseTime}`);
  console.log(`⏰ Tiempo Total:       ${report.totalExecutionTime}`);
  
  console.log(`\n${colors.bright}DESGLOSE POR CATEGORÍA${colors.reset}`);
  console.log('─'.repeat(70));
  
  Object.entries(report.categoryBreakdown).forEach(([category, stats]) => {
    if (stats.error) {
      console.log(`${category.padEnd(15)} ${colors.red}ERROR: ${stats.error}${colors.reset}`);
    } else {
      const rate = parseFloat(stats.successRate);
      let statusColor = colors.green;
      if (rate < 50) statusColor = colors.red;
      else if (rate < 80) statusColor = colors.yellow;
      
      console.log(
        `${category.padEnd(15)} ${statusColor}${stats.successRate.padEnd(8)}${colors.reset} ` +
        `(${stats.successful}/${stats.total}) ⚠️  ${stats.notFound} ❌ ${stats.failed}`
      );
    }
  });
  
  if (report.topMissingWords.length > 0) {
    console.log(`\n${colors.bright}TOP PALABRAS SIN RESPUESTA${colors.reset}`);
    console.log('─'.repeat(70));
    report.topMissingWords.slice(0, 10).forEach((word, i) => {
      console.log(`${String(i + 1).padStart(2)}. ${word.word.padEnd(20)} (${word.count} veces)`);
    });
  }
  
  // Recomendaciones
  console.log(`\n${colors.bright}💡 RECOMENDACIONES${colors.reset}`);
  console.log('─'.repeat(70));
  
  const recommendations = generateRecommendations(report);
  recommendations.forEach(rec => {
    let icon = '💡';
    let color = colors.blue;
    
    if (rec.priority === 'HIGH') {
      icon = '🔴';
      color = colors.red;
    } else if (rec.priority === 'MEDIUM') {
      icon = '🟡';
      color = colors.yellow;
    }
    
    console.log(`${icon} ${color}[${rec.priority}]${colors.reset} ${rec.message}`);
  });
}

function generateRecommendations(report) {
  const recommendations = [];
  const overallSuccessRate = parseFloat(report.summary.successRate);
  
  if (overallSuccessRate < 80) {
    recommendations.push({
      priority: 'HIGH',
      message: `Tasa de éxito global ${report.summary.successRate} < 80%. Requiere mejoras urgentes en FAQs y PINs.`
    });
  }
  
  // Categorías problemáticas
  Object.entries(report.categoryBreakdown).forEach(([category, stats]) => {
    if (!stats.error) {
      const rate = parseFloat(stats.successRate);
      if (rate < 60) {
        recommendations.push({
          priority: 'HIGH',
          message: `Categoría "${category}" con baja cobertura (${stats.successRate}). Necesita FAQs adicionales.`
        });
      } else if (rate < 80) {
        recommendations.push({
          priority: 'MEDIUM',
          message: `Categoría "${category}" puede mejorar (${stats.successRate}). Revisar queries no encontradas.`
        });
      }
    }
  });
  
  // Palabras frecuentes sin respuesta
  if (report.topMissingWords.length > 0) {
    const topWords = report.topMissingWords.slice(0, 5).map(w => w.word).join(', ');
    recommendations.push({
      priority: 'MEDIUM',
      message: `Términos frecuentes sin respuesta: ${topWords}. Considerar añadir FAQs específicas.`
    });
  }
  
  // Tiempo de respuesta
  const avgTime = parseFloat(report.summary.avgResponseTime);
  if (avgTime > 1000) {
    recommendations.push({
      priority: 'LOW',
      message: `Tiempo de respuesta promedio alto (${avgTime}ms). Optimizar consultas o índices de DB.`
    });
  }
  
  if (report.allNotFound.length > 30) {
    recommendations.push({
      priority: 'HIGH',
      message: `${report.allNotFound.length} preguntas sin respuesta. Revisar archivo de queries no encontradas.`
    });
  }
  
  return recommendations;
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runAllTests()
    .then(report => {
      const exitCode = report.summary.failed > 0 ? 1 : 0;
      console.log(`\n${colors.green}✅ Test maestro completado${colors.reset}\n`);
      process.exit(exitCode);
    })
    .catch(error => {
      console.error(`${colors.red}❌ Error fatal: ${error.message}${colors.reset}`);
      process.exit(1);
    });
}

module.exports = { runAllTests };