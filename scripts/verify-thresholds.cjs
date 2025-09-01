#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== VERIFICACIÓN THRESHOLDS ===');

const retrieverPath = path.join(__dirname, '..', 'services', 'common', 'retriever.cjs');

if (!fs.existsSync(retrieverPath)) {
  console.error('❌ NO ENCONTRADO: services/common/retriever.cjs');
  process.exit(1);
}

const content = fs.readFileSync(retrieverPath, 'utf8');

// Buscar los thresholds críticos
const scoreThreshold = content.match(/score\s*>=\s*(0\.45)/);
const marginThreshold = content.match(/score\s*-\s*[\w.]+\)\s*>=\s*(0\.12)/);

console.log('📍 Analizando retriever.cjs...');

if (!scoreThreshold) {
  console.error('❌ THRESHOLD SCORE >=0.45 NO ENCONTRADO');
  process.exit(1);
}

if (!marginThreshold) {
  console.error('❌ THRESHOLD MARGIN >=0.12 NO ENCONTRADO');
  process.exit(1);
}

const foundScore = parseFloat(scoreThreshold[1]);
const foundMargin = parseFloat(marginThreshold[1]);

console.log(`✓ Score threshold encontrado: ${foundScore}`);
console.log(`✓ Margin threshold encontrado: ${foundMargin}`);

if (foundScore !== 0.45) {
  console.error(`❌ SCORE THRESHOLD INCORRECTO: esperado 0.45, encontrado ${foundScore}`);
  process.exit(1);
}

if (foundMargin !== 0.12) {
  console.error(`❌ MARGIN THRESHOLD INCORRECTO: esperado 0.12, encontrado ${foundMargin}`);
  process.exit(1);
}

// Verificar también el otro threshold en línea 59
const altThreshold = content.match(/sA\s*>=\s*(0\.45)/);
const altMargin = content.match(/sA\s*-\s*sB\)\s*>=\s*(0\.12)/);

if (!altThreshold || parseFloat(altThreshold[1]) !== 0.45) {
  console.error('❌ THRESHOLD ALTERNATIVO SCORE INCORRECTO');
  process.exit(1);
}

if (!altMargin || parseFloat(altMargin[1]) !== 0.12) {
  console.error('❌ THRESHOLD ALTERNATIVO MARGIN INCORRECTO');
  process.exit(1);
}

console.log('✅ TODOS LOS THRESHOLDS CORRECTOS:');
console.log('   • Score ≥ 0.45 ✓');
console.log('   • Margin ≥ 0.12 ✓');
console.log('   • Thresholds alternativos ✓');