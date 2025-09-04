#!/usr/bin/env node

/**
 * ANALIZADOR DE QUERIES FALLIDAS
 * Identifica patrones en queries que devuelven "not found"
 */

const fs = require('fs');
const path = require('path');

// Cargar el procesador de APEX
const { processQueryFirm } = require('../services/firms/apex/index.js');

// Cargar queries de producción
const productionQueries = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'logs', 'production-queries-simulated.json'), 'utf8')
);

async function analyzeFailures() {
  console.log('🔍 Analizando queries de producción...\n');
  
  const results = {
    total: 0,
    found: 0,
    not_found: 0,
    errors: 0,
    failed_queries: [],
    success_rate_by_category: {},
    common_failure_patterns: []
  };
  
  // Procesar cada query
  for (const item of productionQueries) {
    results.total++;
    
    try {
      const response = await processQueryFirm(item.query);
      
      if (response && response.message && !response.message.includes('No encontré información')) {
        results.found++;
      } else {
        results.not_found++;
        results.failed_queries.push({
          query: item.query,
          timestamp: item.timestamp,
          source: item.source,
          response_snippet: response?.message?.substring(0, 100)
        });
      }
    } catch (error) {
      results.errors++;
      results.failed_queries.push({
        query: item.query,
        error: error.message
      });
    }
  }
  
  // Analizar patrones en fallos
  const failurePatterns = analyzePatterns(results.failed_queries);
  results.common_failure_patterns = failurePatterns;
  
  // Calcular estadísticas
  results.success_rate = ((results.found / results.total) * 100).toFixed(2) + '%';
  results.failure_rate = ((results.not_found / results.total) * 100).toFixed(2) + '%';
  results.error_rate = ((results.errors / results.total) * 100).toFixed(2) + '%';
  
  return results;
}

function analyzePatterns(failedQueries) {
  const patterns = {
    colloquialisms: [],
    typos: [],
    ambiguous: [],
    mixed_language: [],
    too_short: [],
    too_long: []
  };
  
  failedQueries.forEach(item => {
    const query = item.query.toLowerCase();
    
    // Detectar coloquialismos
    if (query.includes('sacar') || query.includes('plata') || query.includes('cobrar')) {
      patterns.colloquialisms.push(query);
    }
    
    // Detectar queries muy cortas
    if (query.split(' ').length <= 2) {
      patterns.too_short.push(query);
    }
    
    // Detectar queries muy largas
    if (query.length > 100) {
      patterns.too_long.push(query);
    }
    
    // Detectar mezcla de idiomas
    if (/[a-z]+/.test(query) && /withdraw|payout|trading|overnight/.test(query)) {
      patterns.mixed_language.push(query);
    }
    
    // Detectar queries ambiguas
    if (query === 'apex' || query === 'info' || query === 'ayuda' || query === '?') {
      patterns.ambiguous.push(query);
    }
  });
  
  // Eliminar duplicados y limitar a top 5 por categoría
  Object.keys(patterns).forEach(key => {
    patterns[key] = [...new Set(patterns[key])].slice(0, 5);
  });
  
  return patterns;
}

// Ejecutar análisis
async function main() {
  console.log('🚀 Starting production queries analysis...\n');
  
  const results = await analyzeFailures();
  
  // Guardar resultados
  const outputPath = path.join(__dirname, '..', 'logs', 'analysis', 'failed-queries-analysis.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  // Mostrar resumen
  console.log('\n📊 ANÁLISIS COMPLETO:\n');
  console.log(`Total queries: ${results.total}`);
  console.log(`✅ Found: ${results.found} (${results.success_rate})`);
  console.log(`❌ Not found: ${results.not_found} (${results.failure_rate})`);
  console.log(`⚠️ Errors: ${results.errors} (${results.error_rate})`);
  
  console.log('\n🔍 PATRONES DE FALLO DETECTADOS:\n');
  Object.entries(results.common_failure_patterns).forEach(([pattern, queries]) => {
    if (queries.length > 0) {
      console.log(`\n${pattern.toUpperCase()}:`);
      queries.forEach(q => console.log(`  - "${q}"`));
    }
  });
  
  console.log(`\n💾 Resultados guardados en: ${outputPath}`);
  
  // Generar recomendaciones
  console.log('\n💡 RECOMENDACIONES:\n');
  
  if (results.common_failure_patterns.colloquialisms.length > 0) {
    console.log('1. Agregar aliases para coloquialismos:');
    console.log('   - "sacar" → "retirar"');
    console.log('   - "plata" → "dinero"');
    console.log('   - "cobrar" → "retirar"');
  }
  
  if (results.common_failure_patterns.too_short.length > 0) {
    console.log('\n2. Mejorar manejo de queries cortas/ambiguas');
    console.log('   - Implementar respuesta de clarificación');
  }
  
  if (results.common_failure_patterns.mixed_language.length > 0) {
    console.log('\n3. Soportar queries bilingües');
    console.log('   - Normalizar términos inglés → español');
  }
  
  if (results.failure_rate > 10) {
    console.log('\n⚠️ ALERTA: Tasa de fallo > 10% - Requiere acción inmediata');
  }
}

main().catch(console.error);