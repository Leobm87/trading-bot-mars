#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== CONTEO DE PINS APEX ===');

const pinsPath = path.join(__dirname, '..', 'data', 'pins', 'apex.json');

if (!fs.existsSync(pinsPath)) {
  console.error('❌ NO ENCONTRADO: data/pins/apex.json');
  process.exit(1);
}

let pinsData;
try {
  pinsData = JSON.parse(fs.readFileSync(pinsPath, 'utf8'));
} catch (e) {
  console.error('❌ ERROR PARSING JSON:', e.message);
  process.exit(1);
}

if (!pinsData.rules || !Array.isArray(pinsData.rules)) {
  console.error('❌ FORMATO INCORRECTO: esperado {rules: [...]}');
  process.exit(1);
}

const totalPins = pinsData.rules.length;
console.log(`📍 Pins encontrados: ${totalPins}`);

// Mostrar algunos pins para verificar
console.log('\n📋 Primeros 3 pins:');
pinsData.rules.slice(0, 3).forEach((rule, i) => {
  console.log(`${i+1}. ${rule.re} → ${rule.id}`);
});

if (totalPins > 60) {
  console.error(`❌ LÍMITE EXCEDIDO: ${totalPins} pins > 60`);
  console.log('\n🔧 Se necesita MERGE de pins para reducir a ≤60');
  process.exit(1);
} else {
  console.log(`✅ LÍMITE OK: ${totalPins} pins ≤ 60`);
}

console.log(`\n📊 RESULTADO: ${totalPins} pins total`);