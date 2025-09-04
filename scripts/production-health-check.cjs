#!/usr/bin/env node

/**
 * PRODUCTION HEALTH CHECK COMPLETO
 * Análisis integral del sistema en producción
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Lista de queries críticas para probar
const CRITICAL_QUERIES = [
  // Coloquialismos reportados
  "como sacar dinero",
  "como sacar plata",
  "puedo retirar ya",
  "cuando cobro",
  "minimo para sacar",
  
  // Typos comunes
  "safty net",
  "regla consistensia",
  "retiro minimo",
  
  // Queries ambiguas
  "apex",
  "info",
  
  // Mezcla de idiomas
  "withdraw minimo",
  "overnight trading"
];

async function testQuery(query) {
  try {
    const cmd = `export RESPONSE_STYLE=short && npm run try:apex -- --q "${query.replace(/"/g, '\\"')}" 2>&1`;
    const output = execSync(cmd, { encoding: 'utf8', stdio: 'pipe', timeout: 5000 });
    
    const jsonMatch = output.match(/\{[\s\S]*"res":\s*\{[\s\S]*?\}\s*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        query,
        found: result.res?.ok && !result.res?.response?.includes('No encontré información'),
        latency_ms: result.ms,
        response_length: result.res?.response?.length || 0,
        faq_id: result.res?.faq_id
      };
    }
    return { query, found: false, error: 'No JSON output' };
  } catch (error) {
    return { query, found: false, error: error.message.substring(0, 50) };
  }
}

async function runHealthCheck() {
  console.log('🏥 PRODUCTION HEALTH CHECK - APEX\n');
  console.log('=' .repeat(50));
  
  const report = {
    timestamp: new Date().toISOString(),
    environment: 'production',
    service: 'apex',
    metrics: {
      total_tested: 0,
      success_count: 0,
      failure_count: 0,
      success_rate: 0,
      avg_latency_ms: 0,
      p95_latency_ms: 0,
      avg_response_length: 0
    },
    critical_queries: [],
    failures: [],
    warnings: [],
    recommendations: []
  };
  
  // 1. TEST DE QUERIES CRÍTICAS
  console.log('\n1️⃣ TESTING CRITICAL QUERIES...\n');
  
  const latencies = [];
  const responseLengths = [];
  
  for (const query of CRITICAL_QUERIES) {
    const result = await testQuery(query);
    report.metrics.total_tested++;
    report.critical_queries.push(result);
    
    if (result.found) {
      report.metrics.success_count++;
      console.log(`✅ "${query}" → OK (${result.latency_ms}ms)`);
      
      if (result.latency_ms) {
        latencies.push(result.latency_ms);
      }
      if (result.response_length) {
        responseLengths.push(result.response_length);
      }
      
      // Detectar respuestas muy largas
      if (result.response_length > 1000) {
        report.warnings.push({
          type: 'long_response',
          query,
          length: result.response_length
        });
      }
    } else {
      report.metrics.failure_count++;
      report.failures.push(query);
      console.log(`❌ "${query}" → NOT FOUND`);
    }
    
    // Detectar queries lentas
    if (result.latency_ms > 500) {
      report.warnings.push({
        type: 'slow_query',
        query,
        latency_ms: result.latency_ms
      });
    }
  }
  
  // 2. CALCULAR MÉTRICAS
  report.metrics.success_rate = (report.metrics.success_count / report.metrics.total_tested * 100).toFixed(2);
  
  if (latencies.length > 0) {
    report.metrics.avg_latency_ms = Math.round(latencies.reduce((a, b) => a + b) / latencies.length);
    latencies.sort((a, b) => a - b);
    report.metrics.p95_latency_ms = latencies[Math.floor(latencies.length * 0.95)];
  }
  
  if (responseLengths.length > 0) {
    report.metrics.avg_response_length = Math.round(responseLengths.reduce((a, b) => a + b) / responseLengths.length);
  }
  
  // 3. ANÁLISIS DE SALUD
  console.log('\n2️⃣ HEALTH ANALYSIS...\n');
  
  const healthScore = calculateHealthScore(report);
  report.health_score = healthScore;
  
  // 4. GENERAR RECOMENDACIONES
  if (report.metrics.success_rate < 90) {
    report.recommendations.push('🔴 CRÍTICO: Tasa de éxito < 90% - Agregar aliases urgente');
  }
  
  if (report.metrics.avg_latency_ms > 400) {
    report.recommendations.push('⚠️ Optimizar latencia (actual: ' + report.metrics.avg_latency_ms + 'ms)');
  }
  
  if (report.metrics.avg_response_length > 800) {
    report.recommendations.push('📝 Implementar answer_short_md para respuestas largas');
  }
  
  if (report.failures.length > 0) {
    report.recommendations.push('🔧 Agregar aliases para: ' + report.failures.slice(0, 3).join(', '));
  }
  
  // 5. GUARDAR REPORTE
  const reportPath = path.join(__dirname, '..', 'logs', 'analysis', 'production-health-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // 6. MOSTRAR RESUMEN
  console.log('=' .repeat(50));
  console.log('📊 HEALTH CHECK SUMMARY');
  console.log('=' .repeat(50));
  
  console.log('\n🎯 METRICS:');
  console.log(`  Success Rate: ${report.metrics.success_rate}%`);
  console.log(`  Avg Latency: ${report.metrics.avg_latency_ms}ms`);
  console.log(`  P95 Latency: ${report.metrics.p95_latency_ms}ms`);
  console.log(`  Avg Response Length: ${report.metrics.avg_response_length} chars`);
  
  console.log('\n🏥 HEALTH SCORE: ' + healthScore + '/100');
  
  if (healthScore >= 90) {
    console.log('  ✅ EXCELLENT - System is healthy');
  } else if (healthScore >= 70) {
    console.log('  ⚠️ GOOD - Minor issues detected');
  } else if (healthScore >= 50) {
    console.log('  ⚠️ FAIR - Multiple issues need attention');
  } else {
    console.log('  🔴 CRITICAL - Immediate action required');
  }
  
  if (report.failures.length > 0) {
    console.log('\n❌ FAILED QUERIES:');
    report.failures.forEach(q => console.log(`  - "${q}"`));
  }
  
  if (report.warnings.length > 0) {
    console.log('\n⚠️ WARNINGS:');
    report.warnings.slice(0, 5).forEach(w => {
      if (w.type === 'slow_query') {
        console.log(`  - Slow: "${w.query}" (${w.latency_ms}ms)`);
      } else if (w.type === 'long_response') {
        console.log(`  - Long response: "${w.query}" (${w.length} chars)`);
      }
    });
  }
  
  if (report.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    report.recommendations.forEach(r => console.log(`  ${r}`));
  }
  
  console.log(`\n📁 Full report: ${reportPath}`);
  
  // 7. GENERAR ARCHIVO DE ACCIONES
  if (report.failures.length > 0) {
    generateActionItems(report);
  }
  
  return report;
}

function calculateHealthScore(report) {
  let score = 100;
  
  // Penalizar por tasa de éxito baja
  const successRate = parseFloat(report.metrics.success_rate);
  if (successRate < 100) score -= (100 - successRate) * 0.5;
  if (successRate < 90) score -= 20;
  if (successRate < 80) score -= 20;
  
  // Penalizar por latencia alta
  if (report.metrics.avg_latency_ms > 500) score -= 10;
  if (report.metrics.avg_latency_ms > 1000) score -= 20;
  
  // Penalizar por respuestas muy largas
  if (report.metrics.avg_response_length > 1000) score -= 10;
  
  // Penalizar por warnings
  score -= report.warnings.length * 2;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

function generateActionItems(report) {
  const actionsPath = path.join(__dirname, '..', 'logs', 'analysis', 'ACTION_ITEMS.md');
  
  const content = `# ACTION ITEMS - Production Health Check
Generated: ${new Date().toISOString()}

## 🔴 CRITICAL FIXES NEEDED

### Failed Queries to Fix:
${report.failures.map(q => `- [ ] Add alias for: "${q}"`).join('\n')}

### SQL to Add Aliases:
\`\`\`sql
-- Add to faq_aliases table
${report.failures.map(q => `
INSERT INTO faq_aliases (query_pattern, faq_id, firm_id)
VALUES ('${q}', 'TARGET_FAQ_ID', (SELECT id FROM firms WHERE slug = 'apex'));`).join('\n')}
\`\`\`

### Performance Issues:
${report.warnings
  .filter(w => w.type === 'slow_query')
  .map(w => `- [ ] Optimize: "${w.query}" (${w.latency_ms}ms)`)
  .join('\n')}

## 📋 Next Steps:
1. Review failed queries and identify correct FAQ mappings
2. Add aliases to database
3. Test with \`npm run try:apex\`
4. Run health check again to verify fixes
`;
  
  fs.writeFileSync(actionsPath, content);
  console.log(`\n📝 Action items: ${actionsPath}`);
}

// Ejecutar
runHealthCheck().catch(console.error);