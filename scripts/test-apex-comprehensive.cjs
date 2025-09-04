/**
 * Test completo para APEX basado en informacion-apex.txt
 * Verifica que el bot pueda responder todas las preguntas importantes sobre APEX
 */

const { execSync } = require('child_process');

console.log('🚀 Running APEX Comprehensive Test...\n');

const criticalQueries = [
  // Precios y tamaños
  { q: 'cuanto cuesta la cuenta de 50k?', expect: ['$167', 'Evaluación'] },
  { q: 'que tamaños de cuenta tiene apex?', expect: ['$25,000', '$300,000'] },
  { q: 'cual es el precio de la cuenta static?', expect: ['$137', 'Static'] },
  
  // Profit targets
  { q: 'cual es el profit target de la cuenta de 100k?', expect: ['$6,000'] },
  { q: 'cuantos dias minimos para pasar evaluacion?', expect: ['1 día'] },
  { q: 'cuanto tiempo tengo para la evaluacion?', expect: ['ilimitado', 'Ilimitado'] },
  
  // Drawdown
  { q: 'como funciona el trailing drawdown?', expect: ['congela', '$100'] },
  { q: 'cual es el drawdown de la cuenta de 50k?', expect: ['$2,500'] },
  
  // Reglas
  { q: 'hay regla de consistencia en apex?', expect: ['30%', 'retiro'] },
  { q: 'puedo dejar posiciones overnight?', expect: ['NO', 'no permitido', '5PM ET'] },
  { q: 'cuantas cuentas puedo tener?', expect: ['20'] },
  
  // Contratos
  { q: 'cuantos contratos en cuenta 100k?', expect: ['14'] },
  { q: 'cuando puedo usar 100% contratos?', expect: ['Safety Net'] },
  
  // Retiros
  { q: 'como puedo retirar dinero?', expect: ['WISE', 'PLANE'] },
  { q: 'que necesito para retirar?', expect: ['8 días', '5 días', '$50'] },
  { q: 'cual es el safety net 50k?', expect: ['$52,600'] },
  { q: 'como es el profit split?', expect: ['100%', '$25,000', '90'] },
  
  // Activación y reset
  { q: 'cuanto cuesta activar la pa?', expect: ['$85', 'mensual', 'Pago'] },
  { q: 'cuanto cuesta resetear cuenta?', expect: ['$80'] },
  
  // Comisiones
  { q: 'cuales son las comisiones?', expect: ['support.apextraderfunding.com', 'Rithmic', 'Tradovate'] },
  { q: 'que plataformas puedo usar?', expect: ['NinjaTrader', 'Tradovate', 'TradingView'] },
  
  // Países
  { q: 'que paises no puedo operar apex?', expect: ['Cuba', 'Venezuela'] },
  { q: 'puedo hacer copy trading?', expect: ['prohibido', 'no permitido'] }
];

let passed = 0;
let failed = 0;
const failedTests = [];

criticalQueries.forEach(({ q, expect: expected }) => {
  try {
    const result = execSync(
      `RESPONSE_STYLE=short npm run try:apex -- --q "${q}"`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    
    // Parse JSON from output
    const lines = result.split('\n');
    const jsonLine = lines.find(line => line.includes('"ok":'));
    
    if (jsonLine) {
      const parsed = JSON.parse(jsonLine);
      
      if (parsed.res && parsed.res.ok) {
        const response = parsed.res.response || parsed.res.text || '';
        
        // Check if response contains expected content
        const hasExpectedContent = expected.some(exp => 
          response.toLowerCase().includes(exp.toLowerCase())
        );
        
        if (hasExpectedContent) {
          console.log(`✅ PASS: "${q}"`);
          passed++;
        } else {
          console.log(`❌ FAIL: "${q}" - Missing expected content: ${expected.join(', ')}`);
          failed++;
          failedTests.push({ query: q, expected, got: response.substring(0, 100) });
        }
      } else {
        console.log(`❌ FAIL: "${q}" - Response not OK`);
        failed++;
        failedTests.push({ query: q, expected, error: 'Response not OK' });
      }
    } else {
      console.log(`❌ FAIL: "${q}" - No valid JSON response`);
      failed++;
      failedTests.push({ query: q, expected, error: 'No JSON response' });
    }
  } catch (error) {
    console.log(`❌ ERROR: "${q}" - ${error.message}`);
    failed++;
    failedTests.push({ query: q, expected, error: error.message });
  }
});

console.log(`\n${'='.repeat(60)}`);
console.log(`📊 RESULTS: ${passed} passed, ${failed} failed`);
console.log(`📈 Success rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

if (failedTests.length > 0) {
  console.log(`\n❌ FAILED TESTS DETAILS:`);
  failedTests.forEach(({ query, expected, got, error }) => {
    console.log(`\nQuery: "${query}"`);
    console.log(`Expected: ${expected ? expected.join(', ') : 'N/A'}`);
    if (got) console.log(`Got: ${got}...`);
    if (error) console.log(`Error: ${error}`);
  });
}

// Test title formatting
console.log(`\n${'='.repeat(60)}`);
console.log('📝 TESTING TITLE FORMATTING...\n');

const titleQueries = [
  'que tipos de drawdown hay?',
  'como retirar dinero?',
  'cuales son los requisitos para retirar?',
  'que comisiones cobra apex?'
];

let titlesOk = 0;
titleQueries.forEach(query => {
  try {
    const result = execSync(
      `RESPONSE_STYLE=short npm run try:apex -- --q "${query}"`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    
    const lines = result.split('\n');
    const jsonLine = lines.find(line => line.includes('"ok":'));
    
    if (jsonLine) {
      const parsed = JSON.parse(jsonLine);
      if (parsed.res && parsed.res.response && parsed.res.response.includes('###')) {
        console.log(`✅ Has title: "${query}"`);
        titlesOk++;
      } else {
        console.log(`⚠️  No title: "${query}"`);
      }
    }
  } catch (error) {
    console.log(`❌ Error: "${query}"`);
  }
});

console.log(`\n📊 Titles: ${titlesOk}/${titleQueries.length} queries have descriptive titles`);

console.log(`\n${'='.repeat(60)}`);
console.log('✅ TEST COMPLETE\n');

process.exit(failed > 0 ? 1 : 0);