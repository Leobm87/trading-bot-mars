#!/usr/bin/env node

/**
 * TEST COMPLETO DE COBERTURA CON COMPONENTES MEJORADOS
 */

const { preprocessSimple } = require('../services/common/query-preprocessor.cjs');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test cases del 8% que fallaba
const EDGE_CASES = [
  // Ambiguas
  { query: 'apex', type: 'ambiguous' },
  { query: 'info', type: 'ambiguous' },
  { query: '?', type: 'ambiguous' },
  { query: 'hola', type: 'ambiguous' },
  
  // Inglés/mezclado
  { query: 'how to withdraw money', type: 'english' },
  { query: 'minimum withdrawal apex', type: 'english' },
  { query: 'overnight trading allowed?', type: 'english' },
  { query: 'what is the safety net', type: 'english' },
  
  // Typos
  { query: 'safty net', type: 'typo' },
  { query: 'regla consistensia', type: 'typo' },
  { query: 'drawdawn maximo', type: 'typo' },
  
  // Largas
  { query: 'hola necesito toda la informacion sobre apex incluyendo precios reglas retiros y todo lo demas', type: 'long' },
  
  // Especiales
  { query: 'apex!!!???', type: 'special' },
  { query: '💰 retiros 🚀', type: 'emoji' },
  
  // Control: queries que SÍ funcionaban
  { query: 'como sacar dinero', type: 'control' },
  { query: 'precio apex', type: 'control' },
  { query: 'regla de consistencia', type: 'control' }
];

async function testWithPreprocessing(query) {
  console.log(`\n📝 Testing: "${query.substring(0, 50)}..."`);
  
  // 1. Preprocesar
  const preprocessed = preprocessSimple(query);
  console.log(`  Preprocessed: "${preprocessed?.query || 'INVALID'}"`);
  
  if (preprocessed?.skip_retrieval) {
    console.log(`  ✅ Handled by ambiguous handler`);
    return { success: true, type: 'ambiguous_handled' };
  }
  
  if (preprocessed?.multi_segment) {
    console.log(`  ✅ Segmented into ${preprocessed.additional_queries?.length + 1} parts`);
    return { success: true, type: 'multi_segment' };
  }
  
  // 2. Probar query procesada con el sistema actual
  try {
    const cmd = `export RESPONSE_STYLE=short && npm run try:apex -- --q "${preprocessed.query.replace(/"/g, '\\"')}" 2>&1`;
    const output = execSync(cmd, { 
      encoding: 'utf8', 
      stdio: 'pipe', 
      timeout: 5000 
    });
    
    if (output.includes('"ok":true') && !output.includes('No encontré información')) {
      console.log(`  ✅ Found in DB`);
      return { success: true, type: 'found' };
    } else {
      console.log(`  ❌ Not found`);
      return { success: false, type: 'not_found' };
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message.substring(0, 50)}`);
    return { success: false, type: 'error', error: error.message };
  }
}

async function runTest() {
  console.log('🎯 TESTING EDGE CASES WITH ENHANCED PREPROCESSING\n');
  console.log('=' .repeat(60));
  
  const results = {
    total: 0,
    success: 0,
    by_type: {}
  };
  
  for (const testCase of EDGE_CASES) {
    results.total++;
    
    const result = await testWithPreprocessing(testCase.query);
    
    if (!results.by_type[testCase.type]) {
      results.by_type[testCase.type] = { total: 0, success: 0 };
    }
    results.by_type[testCase.type].total++;
    
    if (result.success) {
      results.success++;
      results.by_type[testCase.type].success++;
    }
  }
  
  // Resumen
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RESULTADOS FINALES');
  console.log('=' .repeat(60));
  
  const coverage = (results.success / results.total * 100).toFixed(2);
  console.log(`\n🎯 Cobertura Total: ${coverage}%`);
  console.log(`✅ Success: ${results.success}/${results.total}`);
  
  console.log('\n📈 Por Tipo:');
  Object.entries(results.by_type).forEach(([type, stats]) => {
    const typeCoverage = (stats.success / stats.total * 100).toFixed(1);
    console.log(`  ${type}: ${typeCoverage}% (${stats.success}/${stats.total})`);
  });
  
  // Comparación con baseline (92%)
  const baseline = 92;
  const improvement = parseFloat(coverage) - baseline;
  
  if (improvement > 0) {
    console.log(`\n📈 MEJORA: +${improvement.toFixed(2)}% vs baseline (${baseline}%)`);
  }
  
  if (parseFloat(coverage) >= 100) {
    console.log('\n🏆 ¡OBJETIVO ALCANZADO! 100% DE COBERTURA');
  } else if (parseFloat(coverage) >= 98) {
    console.log('\n✅ EXCELENTE: Casi perfecto');
  } else if (parseFloat(coverage) >= 95) {
    console.log('\n✅ MUY BUENO: Objetivo superado');
  }
  
  // Guardar reporte
  const report = {
    timestamp: new Date().toISOString(),
    coverage_percent: coverage,
    baseline_percent: baseline,
    improvement_percent: improvement,
    results: results
  };
  
  const reportPath = path.join(__dirname, '..', 'logs', 'analysis', 'enhanced-coverage-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📁 Reporte guardado: ${reportPath}`);
}

runTest().catch(console.error);