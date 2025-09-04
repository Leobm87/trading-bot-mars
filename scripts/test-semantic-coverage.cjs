#!/usr/bin/env node

/**
 * TEST DE COBERTURA SEMÁNTICA
 * Verifica que variantes coloquiales lleguen al FAQ correcto
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cargar variantes generadas
const variantsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'test-variants', 'query-variants.json'), 'utf8')
);

// Función para probar una query
async function testQuery(query) {
  try {
    const cmd = `RESPONSE_STYLE=short npm run try:apex -- --q "${query.replace(/"/g, '\\"')}"`;
    const output = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
    
    // Extraer el JSON del output
    const jsonMatch = output.match(/\{[\s\S]*"res":\s*\{[\s\S]*?\}\s*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        query,
        found: result.res && result.res.ok && !result.res.response.includes('No encontré información'),
        faq_id: result.res?.faq_id,
        latency_ms: result.ms
      };
    }
  } catch (error) {
    return {
      query,
      found: false,
      error: error.message
    };
  }
  
  return { query, found: false };
}

async function runCoverageTest() {
  console.log('🔬 INICIANDO TEST DE COBERTURA SEMÁNTICA\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    total: 0,
    found: 0,
    not_found: 0,
    errors: 0,
    by_category: {},
    critical_queries: [],
    failed_queries: []
  };
  
  // 1. Probar queries críticas (coloquialismos reportados)
  console.log('📋 Probando queries críticas...\n');
  const criticalQueries = [
    'como sacar dinero',
    'como sacar plata', 
    'cuando puedo cobrar',
    'primer payout minimo',
    'safty net',  // typo intencional
    'cuanto sale apex',
    'hay consistensia?',  // typo
    'overnight permitido?',
    'puedo retirar ya?',
    'minimo para sacar'
  ];
  
  for (const query of criticalQueries) {
    const result = await testQuery(query);
    results.critical_queries.push(result);
    results.total++;
    
    if (result.found) {
      results.found++;
      console.log(`✅ "${query}" → ENCONTRADO`);
    } else {
      results.not_found++;
      results.failed_queries.push(query);
      console.log(`❌ "${query}" → NO ENCONTRADO`);
    }
  }
  
  // 2. Probar muestra de cada categoría
  console.log('\n📊 Probando variantes por categoría...\n');
  for (const category of ['withdrawals', 'pricing', 'rules']) {
    const variants = variantsData.all_variants
      .filter(v => v.category === category)
      .map(v => v.variant)
      .slice(0, 5);  // Muestra de 5 por categoría
    
    results.by_category[category] = {
      tested: 0,
      found: 0,
      not_found: 0,
      examples_failed: []
    };
    
    for (const query of variants) {
      const result = await testQuery(query);
      results.total++;
      results.by_category[category].tested++;
      
      if (result.found) {
        results.found++;
        results.by_category[category].found++;
      } else {
        results.not_found++;
        results.by_category[category].not_found++;
        results.by_category[category].examples_failed.push(query);
        if (results.by_category[category].examples_failed.length <= 2) {
          results.failed_queries.push(query);
        }
      }
    }
    
    const catCoverage = (results.by_category[category].found / results.by_category[category].tested * 100).toFixed(1);
    console.log(`${category}: ${catCoverage}% cobertura (${results.by_category[category].found}/${results.by_category[category].tested})`);
  }
  
  // 3. Probar queries adversariales
  console.log('\n🎯 Probando queries adversariales...\n');
  const adversarialQueries = ['apex', 'info', '?', 'ayuda'];
  results.adversarial = [];
  
  for (const query of adversarialQueries) {
    const result = await testQuery(query);
    results.adversarial.push(result);
    // No contamos adversariales en el total para no sesgar cobertura
    console.log(`${result.found ? '✓' : '✗'} "${query}"`);
  }
  
  // Calcular métricas finales
  results.coverage_percent = (results.found / results.total * 100).toFixed(2);
  results.avg_latency_ms = Math.round(
    results.critical_queries
      .filter(r => r.latency_ms)
      .reduce((sum, r) => sum + r.latency_ms, 0) / 
    results.critical_queries.filter(r => r.latency_ms).length
  );
  
  // Guardar reporte
  const reportPath = path.join(__dirname, '..', 'logs', 'analysis', 'semantic-coverage-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  
  // Mostrar resumen
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMEN DE COBERTURA SEMÁNTICA');
  console.log('='.repeat(50));
  console.log(`\nCobertura Total: ${results.coverage_percent}% (${results.found}/${results.total})`);
  console.log(`Latencia Promedio: ${results.avg_latency_ms}ms`);
  
  console.log('\n📈 Por Categoría:');
  Object.entries(results.by_category).forEach(([cat, stats]) => {
    const coverage = (stats.found / stats.tested * 100).toFixed(1);
    console.log(`  - ${cat}: ${coverage}%`);
    if (stats.examples_failed.length > 0) {
      console.log(`    Fallos: ${stats.examples_failed.slice(0, 2).join(', ')}`);
    }
  });
  
  if (results.failed_queries.length > 0) {
    console.log('\n⚠️ QUERIES CRÍTICAS FALLIDAS:');
    results.failed_queries.slice(0, 5).forEach(q => {
      console.log(`  - "${q}"`);
    });
  }
  
  // Recomendaciones
  console.log('\n💡 RECOMENDACIONES:');
  if (parseFloat(results.coverage_percent) < 90) {
    console.log('  1. Agregar más aliases para coloquialismos');
  }
  if (results.avg_latency_ms > 500) {
    console.log('  2. Optimizar latencia (actual: ' + results.avg_latency_ms + 'ms)');
  }
  if (results.failed_queries.length > 0) {
    console.log('  3. Revisar queries fallidas y agregar a FAQs o aliases');
  }
  
  console.log(`\n✅ Reporte guardado en: ${reportPath}`);
  
  // Exit code basado en cobertura
  if (parseFloat(results.coverage_percent) < 80) {
    console.log('\n❌ FALLO: Cobertura < 80%');
    process.exit(1);
  } else {
    console.log('\n✅ ÉXITO: Cobertura aceptable');
  }
}

// Ejecutar
runCoverageTest().catch(console.error);