#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Forzar modificación temporal del apex service para permitir PINNER_OFF
async function patchApexService() {
  const apexPath = path.join(__dirname, '..', 'services', 'firms', 'apex', 'index.js');
  const content = fs.readFileSync(apexPath, 'utf8');
  
  // Buscar la línea del pinner y modificarla para considerar PINNER_OFF
  const patched = content.replace(
    'const pinId = resolvePin(\'apex\', query);',
    `const pinId = process.env.PINNER_OFF === '1' ? null : resolvePin('apex', query);`
  );
  
  if (patched === content) {
    throw new Error('No se pudo patchear el apex service para PINNER_OFF');
  }
  
  fs.writeFileSync(apexPath, patched);
  console.log('✓ Apex service parcheado temporalmente para PINNER_OFF');
  
  return () => {
    fs.writeFileSync(apexPath, content);
    console.log('✓ Apex service restaurado');
  };
}

async function runEvaluation(pinnerEnabled) {
  const goldenPath = path.join(__dirname, '..', 'tests', 'golden', 'apex.jsonl');
  const lines = fs.readFileSync(goldenPath, 'utf8').trim().split('\n');
  
  // Cargar .env
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars = envContent.split('\n').filter(line => line.includes('='));
      envVars.forEach(line => {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim();
        process.env[key] = value;
      });
    }
  } catch (e) {
    console.warn('Warning: .env not loaded:', e.message);
  }
  
  // Import dinámico para recargar el módulo (default export)
  const ApexServiceModule = await import(`../services/firms/apex/index.js?t=${Date.now()}`);
  const ApexService = ApexServiceModule.default;
  
  const apexService = new ApexService();
  await apexService.initialize();
  
  let exactMatches = 0;
  
  for (const line of lines) {
    const { q, expected_faq_id } = JSON.parse(line);
    const result = await apexService.processQuery(q);
    
    // Formato correcto: {ok: true, faq_id: ...}
    if (result.ok && result.faq_id === expected_faq_id) {
      exactMatches++;
    }
  }
  
  return exactMatches / lines.length;
}

async function main() {
  console.log('=== PIN-LIFT EVALUATION ===');
  
  const restore = await patchApexService();
  
  try {
    console.log('\n🔵 Evaluando con PINNER ACTIVADO...');
    process.env.PINNER_OFF = '0';
    const exactOn = await runEvaluation(true);
    console.log(`   Exact@1: ${exactOn.toFixed(4)}`);
    
    console.log('\n🔴 Evaluando con PINNER DESACTIVADO...');
    process.env.PINNER_OFF = '1';
    const exactOff = await runEvaluation(false);
    console.log(`   Exact@1: ${exactOff.toFixed(4)}`);
    
    const delta = exactOn - exactOff;
    
    const result = {
      exact_on: parseFloat(exactOn.toFixed(4)),
      exact_off: parseFloat(exactOff.toFixed(4)), 
      delta: parseFloat(delta.toFixed(4))
    };
    
    console.log('\n📊 RESULTADO PIN-LIFT:');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
    
  } finally {
    restore();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };