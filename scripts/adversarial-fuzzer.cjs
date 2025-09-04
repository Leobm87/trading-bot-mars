#!/usr/bin/env node

/**
 * FUZZER ADVERSARIAL
 * Prueba queries malformadas, ambiguas y casos extremos
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Categorías de ataques adversariales
const ADVERSARIAL_PATTERNS = {
  // 1. TYPOS Y ERRORES ORTOGRÁFICOS
  typos: [
    'retiro minimo apex',  // sin tildes
    'cual es el safty net',  // typo común
    'regla de consistensia',  // error ortográfico
    'overnight permitdo',  // letra faltante
    'drawdawn maximo',  // error común
    'comisones apex',  // falta i
    'requistios para retirar'  // error común
  ],
  
  // 2. MEZCLA DE IDIOMAS
  mixed_language: [
    'como hacer withdraw en apex',
    'what is el safety net',
    'puedo make trades overnight?',
    'minimum para el withdrawal',
    'trading rules de apex',
    'profit target cuanto es'
  ],
  
  // 3. QUERIES MUY CORTAS / AMBIGUAS
  ambiguous: [
    'apex',
    '?',
    'info',
    'ayuda',
    'hola',
    'si',
    'no',
    'ok',
    '...'
  ],
  
  // 4. QUERIES MUY LARGAS
  verbose: [
    'hola buenas tardes mi nombre es juan y estoy interesado en saber toda la información posible sobre apex trading porque quiero empezar a hacer trading pero no se nada sobre los requisitos ni los costos ni como funciona el proceso de evaluación ni nada',
    'necesito que me expliques absolutamente todo sobre apex incluyendo precios costos requisitos reglas limitaciones beneficios ventajas desventajas y todo lo que necesite saber antes de empezar'
  ],
  
  // 5. CARACTERES ESPECIALES Y EMOJIS
  special_chars: [
    '¿¿¿apex???',
    'apex!!!!',
    'apex 🚀🚀🚀',
    '### APEX ###',
    '<script>alert("test")</script>',
    'apex\'; DROP TABLE faqs; --',
    '../../../../etc/passwd'
  ],
  
  // 6. MÚLTIPLES PREGUNTAS EN UNA
  multiple_questions: [
    'cuanto cuesta apex y como pago y cuando puedo retirar',
    'reglas de apex, precios, metodos de pago, todo',
    'info completa: costos, requisitos, pagos, retiros'
  ],
  
  // 7. CONTRADICCIONES Y NONSENSE
  nonsense: [
    'apex sin apex',
    'retiro sin retirar',
    'gratis pero pagando',
    'asdfghjkl',
    '12345678',
    'null undefined NaN'
  ],
  
  // 8. CASOS DE FORMATO EXTRAÑO
  formatting: [
    'APEX EN MAYÚSCULAS',
    'apex en minúsculas',
    'ApEx En CaMeLcAsE',
    'a p e x  e s p a c i a d o',
    'apex\napex\napex',
    '\tapex\t'
  ]
};

// Función para probar una query
async function fuzzQuery(query, category) {
  try {
    const sanitized = query.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/`/g, '\\`');
    const cmd = `RESPONSE_STYLE=short npm run try:apex -- --q "${sanitized}" 2>&1`;
    const startTime = Date.now();
    
    let output;
    try {
      output = execSync(cmd, { 
        encoding: 'utf8', 
        stdio: 'pipe',
        timeout: 5000  // 5 segundos máximo
      });
    } catch (execError) {
      // Capturar timeout o error de ejecución
      return {
        query,
        category,
        status: 'error',
        error: execError.message.substring(0, 100),
        latency_ms: Date.now() - startTime,
        crashed: execError.status !== 0
      };
    }
    
    const latency = Date.now() - startTime;
    
    // Detectar diferentes tipos de respuesta
    const result = {
      query,
      category,
      latency_ms: latency,
      status: 'unknown'
    };
    
    // Analizar output
    if (output.includes('No encontré información')) {
      result.status = 'not_found';
    } else if (output.includes('"ok":true')) {
      result.status = 'found';
      
      // Verificar calidad de respuesta
      const jsonMatch = output.match(/\{[\s\S]*"res":\s*\{[\s\S]*?\}\s*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result.response_length = parsed.res?.response?.length || 0;
        
        // Detectar respuestas excesivamente largas
        if (result.response_length > 1000) {
          result.warning = 'response_too_long';
        }
      }
    } else if (output.includes('error') || output.includes('Error')) {
      result.status = 'error';
      result.error = output.substring(0, 200);
    }
    
    // Detectar problemas de rendimiento
    if (latency > 1000) {
      result.performance_issue = true;
      result.warning = (result.warning ? result.warning + ', ' : '') + 'slow_response';
    }
    
    return result;
  } catch (error) {
    return {
      query,
      category,
      status: 'crash',
      error: error.message.substring(0, 100)
    };
  }
}

async function runAdversarialFuzzing() {
  console.log('🎯 INICIANDO FUZZING ADVERSARIAL\n');
  console.log('Probando resistencia del sistema a queries malformadas...\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    total: 0,
    by_category: {},
    crashes: [],
    slow_queries: [],
    security_issues: [],
    quality_issues: []
  };
  
  // Probar cada categoría
  for (const [category, queries] of Object.entries(ADVERSARIAL_PATTERNS)) {
    console.log(`\n📦 ${category.toUpperCase()}:`);
    results.by_category[category] = {
      total: 0,
      found: 0,
      not_found: 0,
      errors: 0,
      crashes: 0
    };
    
    for (const query of queries.slice(0, 5)) { // Limitar a 5 por categoría para rapidez
      const result = await fuzzQuery(query, category);
      results.total++;
      results.by_category[category].total++;
      
      // Clasificar resultado
      switch (result.status) {
        case 'found':
          results.by_category[category].found++;
          console.log(`  ✅ "${query.substring(0, 30)}..." → OK`);
          break;
        case 'not_found':
          results.by_category[category].not_found++;
          console.log(`  ⚪ "${query.substring(0, 30)}..." → No encontrado`);
          break;
        case 'error':
          results.by_category[category].errors++;
          console.log(`  ⚠️ "${query.substring(0, 30)}..." → Error`);
          break;
        case 'crash':
          results.by_category[category].crashes++;
          results.crashes.push(query);
          console.log(`  ❌ "${query.substring(0, 30)}..." → CRASH!`);
          break;
      }
      
      // Detectar problemas
      if (result.performance_issue) {
        results.slow_queries.push({
          query: query.substring(0, 50),
          latency_ms: result.latency_ms
        });
      }
      
      if (result.warning === 'response_too_long') {
        results.quality_issues.push({
          query: query.substring(0, 50),
          issue: 'response_too_long',
          length: result.response_length
        });
      }
      
      // Detectar posibles problemas de seguridad
      if (category === 'special_chars' && result.status === 'error') {
        results.security_issues.push({
          query: query.substring(0, 50),
          type: 'potential_injection'
        });
      }
    }
    
    // Resumen de categoría
    const stats = results.by_category[category];
    const robustness = ((stats.found + stats.not_found) / stats.total * 100).toFixed(1);
    console.log(`  Robustez: ${robustness}% (${stats.crashes} crashes, ${stats.errors} errors)`);
  }
  
  // Calcular métricas globales
  results.robustness_score = Object.values(results.by_category)
    .reduce((sum, cat) => sum + ((cat.found + cat.not_found) / cat.total), 0) / 
    Object.keys(results.by_category).length * 100;
  
  results.crash_rate = (results.crashes.length / results.total * 100).toFixed(2);
  results.slow_query_rate = (results.slow_queries.length / results.total * 100).toFixed(2);
  
  // Guardar reporte
  const reportPath = path.join(__dirname, '..', 'logs', 'analysis', 'adversarial-fuzzing-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  
  // Mostrar resumen
  console.log('\n' + '='.repeat(50));
  console.log('🛡️ RESUMEN DE FUZZING ADVERSARIAL');
  console.log('='.repeat(50));
  console.log(`\n📊 Métricas Generales:`);
  console.log(`  - Queries probadas: ${results.total}`);
  console.log(`  - Score de robustez: ${results.robustness_score.toFixed(1)}%`);
  console.log(`  - Tasa de crashes: ${results.crash_rate}%`);
  console.log(`  - Queries lentas: ${results.slow_query_rate}%`);
  
  if (results.crashes.length > 0) {
    console.log('\n⚠️ CRASHES DETECTADOS:');
    results.crashes.slice(0, 3).forEach(q => {
      console.log(`  - "${q.substring(0, 50)}..."`);
    });
  }
  
  if (results.slow_queries.length > 0) {
    console.log('\n🐌 QUERIES LENTAS (>1000ms):');
    results.slow_queries.slice(0, 3).forEach(({ query, latency_ms }) => {
      console.log(`  - "${query}..." (${latency_ms}ms)`);
    });
  }
  
  if (results.security_issues.length > 0) {
    console.log('\n🔒 POSIBLES PROBLEMAS DE SEGURIDAD:');
    results.security_issues.forEach(({ query, type }) => {
      console.log(`  - ${type}: "${query}..."`);
    });
  }
  
  // Evaluación final
  console.log('\n🎯 EVALUACIÓN FINAL:');
  
  const issues = [];
  if (results.robustness_score < 90) issues.push('Robustez < 90%');
  if (results.crashes.length > 0) issues.push(`${results.crashes.length} crashes`);
  if (parseFloat(results.crash_rate) > 5) issues.push('Alta tasa de crashes');
  if (parseFloat(results.slow_query_rate) > 10) issues.push('Muchas queries lentas');
  
  if (issues.length === 0) {
    console.log('  ✅ Sistema ROBUSTO - Maneja bien queries adversariales');
  } else {
    console.log('  ⚠️ Problemas detectados:');
    issues.forEach(issue => console.log(`    - ${issue}`));
  }
  
  console.log(`\n💾 Reporte guardado en: ${reportPath}`);
}

// Ejecutar
runAdversarialFuzzing().catch(console.error);