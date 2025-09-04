const { execSync } = require('child_process');

console.log('🚀 APEX Quick Test - Verificación Real\n');

const queries = [
  '¿cuanto cuesta la cuenta de 50k?',
  '¿como puedo retirar mi dinero?',
  '¿hay regla de consistencia?',
  '¿puedo dejar posiciones overnight?',
  '¿cuales son las comisiones?',
  '¿que es el safety net?',
  '¿cuanto cuesta activar la pa?',
  '¿que plataformas puedo usar?',
  '¿cuantos contratos puedo usar en 100k?',
  '¿cual es el profit target de 50k?'
];

queries.forEach(q => {
  try {
    const result = execSync(
      `RESPONSE_STYLE=short npm run try:apex -- --q "${q}"`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    
    const lines = result.split('\n');
    const jsonLine = lines.find(line => line.includes('"ok":'));
    
    if (jsonLine) {
      const parsed = JSON.parse(jsonLine);
      
      if (parsed.res && parsed.res.ok) {
        const response = parsed.res.response || '';
        console.log(`\n✅ "${q}"`);
        
        // Mostrar primeras 2 líneas de la respuesta
        const firstLines = response.split('\n').slice(0, 3).join('\n');
        console.log(`   → ${firstLines.substring(0, 150)}...`);
      } else {
        console.log(`\n❌ "${q}" - No encontrado`);
      }
    }
  } catch (error) {
    console.log(`\n❌ "${q}" - Error`);
  }
});

console.log('\n' + '='.repeat(60));
console.log('✅ Test completado\n');