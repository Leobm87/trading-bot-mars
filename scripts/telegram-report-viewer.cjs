#!/usr/bin/env node
/**
 * Visualizador de reportes de tests de Telegram
 * Genera reportes en formato legible y con estadísticas visuales
 */

const fs = require('fs');
const path = require('path');

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Función para generar barra de progreso visual
function generateProgressBar(percentage, width = 30) {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  
  let color = colors.green;
  if (percentage < 50) color = colors.red;
  else if (percentage < 80) color = colors.yellow;
  
  return `${color}${bar}${colors.reset} ${percentage.toFixed(1)}%`;
}

// Función para formatear tiempo
function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Función para mostrar tabla de datos
function displayTable(title, data, columns) {
  console.log(`\n${colors.bright}${colors.cyan}${title}${colors.reset}`);
  console.log('─'.repeat(70));
  
  // Headers
  const headers = columns.map(col => col.header.padEnd(col.width || 20)).join(' │ ');
  console.log(headers);
  console.log('─'.repeat(70));
  
  // Data rows
  data.forEach(row => {
    const rowStr = columns.map(col => {
      const value = String(row[col.key] || '');
      return value.substring(0, col.width || 20).padEnd(col.width || 20);
    }).join(' │ ');
    console.log(rowStr);
  });
}

// Función para generar reporte HTML
function generateHTMLReport(report) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Telegram Bot Test Report - ${new Date().toLocaleDateString()}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 { color: #333; border-bottom: 3px solid #0088cc; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .stat-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      border-left: 4px solid #0088cc;
    }
    .stat-card.success { border-left-color: #28a745; }
    .stat-card.warning { border-left-color: #ffc107; }
    .stat-card.danger { border-left-color: #dc3545; }
    .stat-value { font-size: 2em; font-weight: bold; margin: 10px 0; }
    .stat-label { color: #666; font-size: 0.9em; }
    .progress-bar {
      width: 100%;
      height: 30px;
      background: #e9ecef;
      border-radius: 15px;
      overflow: hidden;
      margin: 20px 0;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #28a745, #20c997);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      text-align: left;
      padding: 12px;
      border-bottom: 1px solid #dee2e6;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #495057;
    }
    .category-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .category-card {
      background: #fff;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 15px;
    }
    .category-name {
      font-weight: bold;
      margin-bottom: 10px;
      color: #495057;
    }
    .mini-progress {
      height: 10px;
      background: #e9ecef;
      border-radius: 5px;
      overflow: hidden;
      margin: 5px 0;
    }
    .mini-progress-fill {
      height: 100%;
      background: #0088cc;
    }
    .recommendation {
      padding: 15px;
      margin: 10px 0;
      border-radius: 8px;
      border-left: 4px solid;
    }
    .recommendation.HIGH {
      background: #fff5f5;
      border-left-color: #dc3545;
    }
    .recommendation.MEDIUM {
      background: #fff8e1;
      border-left-color: #ffc107;
    }
    .recommendation.LOW {
      background: #e8f5e9;
      border-left-color: #28a745;
    }
    .queries-list {
      max-height: 300px;
      overflow-y: auto;
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🤖 Telegram Bot Test Report</h1>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    
    <h2>📊 Summary</h2>
    <div class="summary">
      <div class="stat-card">
        <div class="stat-label">Total Questions</div>
        <div class="stat-value">${report.summary.total}</div>
      </div>
      <div class="stat-card success">
        <div class="stat-label">Successful</div>
        <div class="stat-value">${report.summary.successful}</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-label">Not Found</div>
        <div class="stat-value">${report.summary.notFound}</div>
      </div>
      <div class="stat-card danger">
        <div class="stat-label">Failed</div>
        <div class="stat-value">${report.summary.failed}</div>
      </div>
    </div>
    
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${report.summary.successRate}">
        Success Rate: ${report.summary.successRate}
      </div>
    </div>
    
    <h2>📂 Category Analysis</h2>
    <div class="category-grid">
      ${Object.entries(report.categoryAnalysis || {}).map(([cat, stats]) => `
        <div class="category-card">
          <div class="category-name">${cat.toUpperCase()}</div>
          <div>Total: ${stats.total}</div>
          <div>Success: ${stats.successful} (${stats.successRate})</div>
          <div class="mini-progress">
            <div class="mini-progress-fill" style="width: ${stats.successRate}"></div>
          </div>
        </div>
      `).join('')}
    </div>
    
    <h2>💡 Recommendations</h2>
    ${(report.recommendations || []).map(rec => `
      <div class="recommendation ${rec.priority}">
        <strong>[${rec.priority}]</strong> ${rec.message}
      </div>
    `).join('')}
    
    <h2>⚠️ Queries Without Response</h2>
    <div class="queries-list">
      ${(report.notFound || []).slice(0, 50).map(q => `• ${q}`).join('<br>')}
      ${report.notFound && report.notFound.length > 50 ? `<br>... and ${report.notFound.length - 50} more` : ''}
    </div>
    
    <h2>⏱️ Performance Metrics</h2>
    <table>
      <tr>
        <th>Metric</th>
        <th>Value</th>
      </tr>
      <tr>
        <td>Average Response Time</td>
        <td>${report.summary.avgResponseTime}</td>
      </tr>
      <tr>
        <td>Questions with Titles</td>
        <td>${report.summary.withTitles || 'N/A'}</td>
      </tr>
      <tr>
        <td>Questions with Markdown</td>
        <td>${report.summary.withMarkdown || 'N/A'}</td>
      </tr>
      <tr>
        <td>Responses Too Long (>4096 chars)</td>
        <td>${report.summary.tooLong || 0}</td>
      </tr>
    </table>
  </div>
</body>
</html>
  `;
  
  return html;
}

// Función principal para ver reporte
function viewReport(reportPath) {
  if (!fs.existsSync(reportPath)) {
    console.error(`❌ Report file not found: ${reportPath}`);
    return;
  }
  
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  
  // Header
  console.clear();
  console.log('=' .repeat(70));
  console.log(`${colors.bright}${colors.cyan}   📊 TELEGRAM BOT TEST REPORT VIEWER${colors.reset}`);
  console.log('=' .repeat(70));
  console.log(`\n📅 Report Date: ${new Date(report.timestamp).toLocaleString()}\n`);
  
  // Summary con barras de progreso
  console.log(`${colors.bright}OVERALL PERFORMANCE${colors.reset}`);
  console.log('─'.repeat(70));
  
  const successRate = (report.summary.successful / report.summary.total) * 100;
  console.log(`Success Rate:  ${generateProgressBar(successRate)}`);
  console.log(`Total Tests:   ${report.summary.total}`);
  console.log(`✅ Successful: ${colors.green}${report.summary.successful}${colors.reset}`);
  console.log(`⚠️  Not Found:  ${colors.yellow}${report.summary.notFound}${colors.reset}`);
  console.log(`❌ Failed:     ${colors.red}${report.summary.failed}${colors.reset}`);
  console.log(`⏱️  Avg Time:   ${report.summary.avgResponseTime}`);
  
  // Análisis por categoría
  if (report.categoryAnalysis) {
    console.log(`\n${colors.bright}CATEGORY BREAKDOWN${colors.reset}`);
    console.log('─'.repeat(70));
    
    const categoryData = Object.entries(report.categoryAnalysis).map(([cat, stats]) => ({
      category: cat,
      total: stats.total,
      success: stats.successful,
      rate: stats.successRate,
      bar: generateProgressBar(parseFloat(stats.successRate), 20)
    }));
    
    displayTable('Categories Performance', categoryData, [
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Total', key: 'total', width: 8 },
      { header: 'Success', key: 'success', width: 8 },
      { header: 'Rate', key: 'rate', width: 8 },
      { header: 'Progress', key: 'bar', width: 25 }
    ]);
  }
  
  // Top palabras sin respuesta
  if (report.failurePatterns && report.failurePatterns.topMissingWords) {
    console.log(`\n${colors.bright}TOP MISSING WORDS${colors.reset}`);
    console.log('─'.repeat(70));
    
    report.failurePatterns.topMissingWords.slice(0, 10).forEach((word, i) => {
      const bar = '▪'.repeat(Math.min(word.count, 20));
      console.log(`${String(i + 1).padStart(2)}. ${word.word.padEnd(20)} ${colors.cyan}${bar}${colors.reset} (${word.count})`);
    });
  }
  
  // Recomendaciones
  if (report.recommendations && report.recommendations.length > 0) {
    console.log(`\n${colors.bright}RECOMMENDATIONS${colors.reset}`);
    console.log('─'.repeat(70));
    
    report.recommendations.forEach(rec => {
      let icon = '💡';
      let color = colors.blue;
      
      if (rec.priority === 'HIGH') {
        icon = '🔴';
        color = colors.red;
      } else if (rec.priority === 'MEDIUM') {
        icon = '🟡';
        color = colors.yellow;
      } else {
        icon = '🟢';
        color = colors.green;
      }
      
      console.log(`${icon} ${color}[${rec.priority}]${colors.reset} ${rec.message}`);
    });
  }
  
  // Queries más lentas
  if (report.slowestQueries) {
    console.log(`\n${colors.bright}SLOWEST QUERIES${colors.reset}`);
    console.log('─'.repeat(70));
    
    displayTable('Response Times', report.slowestQueries.slice(0, 5), [
      { header: 'Query', key: 'query', width: 45 },
      { header: 'Time', key: 'time', width: 10 },
      { header: 'Success', key: 'success', width: 10 }
    ]);
  }
  
  // Footer con opciones
  console.log('\n' + '=' .repeat(70));
  console.log(`${colors.bright}OPTIONS:${colors.reset}`);
  console.log(`  • Full JSON report: ${reportPath}`);
  
  // Generar HTML si se solicita
  if (process.argv.includes('--html')) {
    const htmlPath = reportPath.replace('.json', '.html');
    fs.writeFileSync(htmlPath, generateHTMLReport(report));
    console.log(`  • HTML report generated: ${htmlPath}`);
  }
  
  console.log('\n');
}

// Si se ejecuta directamente
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Buscar el reporte más reciente
    const logsDir = path.join(__dirname, '..', 'logs');
    const files = fs.readdirSync(logsDir)
      .filter(f => f.startsWith('telegram-test-full-'))
      .sort()
      .reverse();
    
    if (files.length > 0) {
      const latestReport = path.join(logsDir, files[0]);
      console.log(`📄 Using latest report: ${files[0]}\n`);
      viewReport(latestReport);
    } else {
      console.log('❌ No test reports found. Run telegram-test-runner.cjs first.');
    }
  } else {
    // Usar archivo especificado
    viewReport(args[0]);
  }
}

module.exports = { viewReport, generateHTMLReport };