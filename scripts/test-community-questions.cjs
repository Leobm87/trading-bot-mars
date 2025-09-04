#!/usr/bin/env node
/**
 * Test de preguntas reales de la comunidad para APEX
 * Verifica que el bot responda correctamente a preguntas coloquiales
 */

const { execSync } = require('child_process');

// Selección de las preguntas más importantes y frecuentes
const criticalQuestions = [
  // Precios básicos
  { q: "cuanto sale la cuenta de 50k?", expect: ["167", "$167"] },
  { q: "cual es la mas barata?", expect: ["25,000", "147"] },
  { q: "que diferencia hay entre la normal y la static?", expect: ["Static", "trailing", "625"] },
  
  // Evaluación
  { q: "cuanto tengo que ganar para pasar?", expect: ["profit target", "objetivo"] },
  { q: "en cuanto tiempo tengo que pasar la evaluacion?", expect: ["ilimitado", "sin límite"] },
  { q: "es una o dos fases?", expect: ["una", "1", "one", "single"] },
  
  // Drawdown
  { q: "cuanto puedo perder en la de 100k?", expect: ["3,000", "3000"] },
  { q: "cuando se congela el drawdown?", expect: ["100", "balance inicial"] },
  { q: "hay limite de perdida diaria?", expect: ["no", "sin límite diario"] },
  
  // Reglas críticas
  { q: "puedo dejar trades abiertos de noche?", expect: ["NO", "no permitido", "prohibido", "5PM", "5:00 PM"] },
  { q: "puedo hacer swing trading?", expect: ["NO", "no permitido", "prohibido"] },
  { q: "hay regla de consistencia?", expect: ["30%", "consistencia"] },
  
  // Retiros
  { q: "cuando puedo sacar plata?", expect: ["8 días", "5 días", "$50"] },
  { q: "cuanto es lo minimo que puedo retirar?", expect: ["500", "$500"] },
  { q: "como me pagan?", expect: ["WISE", "PLANE"] },
  { q: "que es el safety net?", expect: ["umbral", "threshold", "52,600"] },
  
  // Contratos
  { q: "cuantos contratos puedo usar?", expect: ["contratos", "50%", "Safety Net"] },
  { q: "cuando puedo usar todos los contratos?", expect: ["Safety Net", "alcanzar", "umbral"] },
  
  // Plataformas
  { q: "que plataformas puedo usar?", expect: ["NinjaTrader", "Tradovate", "TradingView"] },
  { q: "tradingview funciona?", expect: ["sí", "TradingView", "disponible"] },
  { q: "que es mejor rithmic o tradovate?", expect: ["Tradovate", "15-25%", "barato"] },
  
  // Reset y PA
  { q: "cuanto cuesta resetear si pierdo?", expect: ["80", "$80"] },
  { q: "tengo que pagar mensual despues de pasar?", expect: ["85", "$85", "mensual", "pago único"] },
  { q: "cuanto cuesta activar la funded?", expect: ["85", "140", "mensual", "único"] },
  
  // Países
  { q: "funciona en argentina?", expect: ["sí", "disponible", "permitido"] },
  { q: "aceptan venezolanos?", expect: ["NO", "Venezuela", "restringido", "prohibido"] },
  { q: "que paises estan prohibidos?", expect: ["Cuba", "Venezuela", "Rusia"] },
  
  // Situaciones específicas
  { q: "que pasa si dejo un trade abierto por error?", expect: ["advertencia", "eliminación", "violación"] },
  { q: "puedo tradear el domingo?", expect: ["domingo", "lunes", "6PM"] },
  { q: "a que hora cierra el mercado?", expect: ["5PM ET", "5:00 PM", "4:59"] },
  
  // Copy trading
  { q: "se puede copytrade?", expect: ["prohibido", "NO", "no permitido"] },
  { q: "puedo usar EA o robots?", expect: ["prohibido", "NO", "automatización"] }
];

console.log('🚀 TEST DE PREGUNTAS DE LA COMUNIDAD APEX\n');
console.log('=' .repeat(60));

let passed = 0;
let failed = 0;
const errors = [];

// Función para testear una pregunta
function testQuestion(question, expectedTerms) {
  try {
    const result = execSync(
      `RESPONSE_STYLE=short npm run try:apex -- --q "${question}"`,
      { encoding: 'utf8', stdio: 'pipe', timeout: 10000 }
    );
    
    const lines = result.split('\n');
    const jsonLine = lines.find(line => line.includes('"ok":'));
    
    if (!jsonLine) {
      return { success: false, error: 'No JSON response' };
    }
    
    const parsed = JSON.parse(jsonLine);
    
    if (!parsed.res || !parsed.res.ok) {
      return { success: false, error: 'Response not OK' };
    }
    
    const response = (parsed.res.response || '').toLowerCase();
    
    // Verificar si contiene alguno de los términos esperados
    const hasExpectedContent = expectedTerms.some(term => 
      response.includes(term.toLowerCase())
    );
    
    return {
      success: hasExpectedContent,
      response: parsed.res.response,
      error: hasExpectedContent ? null : 'Missing expected content'
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Ejecutar tests
console.log('\n📋 Ejecutando tests...\n');

criticalQuestions.forEach(({ q, expect: expected }, index) => {
  process.stdout.write(`[${index + 1}/${criticalQuestions.length}] "${q.substring(0, 40)}..."  `);
  
  const result = testQuestion(q, expected);
  
  if (result.success) {
    console.log('✅');
    passed++;
  } else {
    console.log('❌');
    failed++;
    errors.push({
      question: q,
      expected,
      error: result.error,
      response: result.response ? result.response.substring(0, 100) : null
    });
  }
});

// Resumen
console.log('\n' + '=' .repeat(60));
console.log('\n📊 RESULTADOS:');
console.log(`   ✅ Pasadas: ${passed}/${criticalQuestions.length}`);
console.log(`   ❌ Fallidas: ${failed}/${criticalQuestions.length}`);
console.log(`   📈 Tasa de éxito: ${((passed / criticalQuestions.length) * 100).toFixed(1)}%`);

// Mostrar errores si hay
if (errors.length > 0) {
  console.log('\n❌ PREGUNTAS FALLIDAS:');
  console.log('=' .repeat(60));
  
  errors.forEach(({ question, expected, error, response }) => {
    console.log(`\n❓ "${question}"`);
    console.log(`   Esperado: ${expected.join(' | ')}`);
    console.log(`   Error: ${error}`);
    if (response) {
      console.log(`   Respuesta: "${response}..."`);
    }
  });
}

// Sugerencias
console.log('\n💡 SUGERENCIAS:');
if (failed > 0) {
  console.log('   - Revisar PINs para las preguntas fallidas');
  console.log('   - Verificar que las FAQs tengan respuestas cortas');
  console.log('   - Considerar añadir aliases para términos coloquiales');
} else {
  console.log('   ✅ ¡Excelente! Todas las preguntas críticas funcionan correctamente');
}

console.log('\n✅ Test completado\n');
process.exit(failed > 0 ? 1 : 0);