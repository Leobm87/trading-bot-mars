const fs = require('fs');
const path = require('path');

// Leer archivos necesarios
const goldenPath = path.join(__dirname, '../tests/golden/apex.jsonl');
const pinsPath = path.join(__dirname, '../data/pins/apex.json');
const reportDir = path.join(__dirname, '../logs/analysis');

// Asegurar directorio existe
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

// Leer data
const golden = fs.readFileSync(goldenPath, 'utf8')
  .trim()
  .split('\n')
  .map(line => JSON.parse(line));

const pinsData = JSON.parse(fs.readFileSync(pinsPath, 'utf8'));

function analyzePins(query, expectedId) {
  const q = query.toLowerCase();
  
  // Encontrar pins que coinciden
  const matchedPins = pinsData.rules.filter(rule => {
    try {
      const regex = new RegExp(rule.re, 'i');
      return regex.test(q);
    } catch (e) {
      return false;
    }
  }).map(rule => ({
    pattern: rule.re,
    target_id: rule.faq_id,
    name: rule.re.substring(0, 50) + '...'
  }));

  // Determinar pin ganador (primero que coincida)
  const winningPin = matchedPins.length > 0 ? matchedPins[0] : null;
  
  // Análisis de root cause
  let rootCause = 'other';
  
  if (!winningPin) {
    rootCause = 'missing_pin';
  } else if (winningPin.target_id !== expectedId) {
    // Verificar si es conflicto específico
    if (q.includes('precio') && winningPin.pattern.includes('comisi')) {
      rootCause = 'pin_too_broad';
    } else if (q.includes('safety') && winningPin.pattern.includes('retir')) {
      rootCause = 'pin_too_broad';  
    } else if (q.includes('umbral') && winningPin.pattern.includes('minim')) {
      rootCause = 'pin_too_broad';
    } else {
      rootCause = 'wrong_expected';
    }
  }

  return {
    pin: winningPin ? {
      matched: true,
      name: winningPin.name,
      pattern: winningPin.pattern,
      target_id: winningPin.target_id
    } : {
      matched: false,
      name: null,
      pattern: null,
      target_id: null
    },
    root_cause: rootCause
  };
}

// Analizar cada query del golden
const results = [];
const confusionMatrix = {};

for (const item of golden) {
  const analysis = analyzePins(item.q, item.expected_faq_id);
  
  const result = {
    q: item.q,
    expected_id: item.expected_faq_id,
    expected_slug: `unknown_slug_${item.expected_faq_id.substring(0, 8)}`,
    pin: analysis.pin,
    fused_top1: {
      id: analysis.pin.target_id,
      slug: analysis.pin.target_id ? `unknown_slug_${analysis.pin.target_id.substring(0, 8)}` : null,
      score: null,
      margin: null
    },
    final_id: analysis.pin.target_id,
    root_cause: analysis.root_cause
  };
  
  results.push(result);
  
  // Matriz de confusión
  const expectedSlug = result.expected_slug;
  const finalSlug = result.fused_top1.slug || 'NONE';
  
  if (!confusionMatrix[expectedSlug]) {
    confusionMatrix[expectedSlug] = {};
  }
  confusionMatrix[expectedSlug][finalSlug] = (confusionMatrix[expectedSlug][finalSlug] || 0) + 1;
}

// Guardar reporte
const reportPath = path.join(reportDir, 'APEX-H3.report.json');
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

// Guardar matriz de confusión como CSV
const csvPath = path.join(reportDir, 'APEX-H3.confusion.csv');
let csvContent = 'expected_slug,final_slug,count\\n';
for (const [expectedSlug, predictions] of Object.entries(confusionMatrix)) {
  for (const [finalSlug, count] of Object.entries(predictions)) {
    csvContent += `${expectedSlug},${finalSlug},${count}\\n`;
  }
}
fs.writeFileSync(csvPath, csvContent);

// Estadísticas resumen
const exactMatches = results.filter(r => r.expected_id === r.final_id).length;
const total = results.length;
const exactAt1 = exactMatches / total;

console.log(`\\n=== APEX PINS DIAGNOSIS ===`);
console.log(`Total queries: ${total}`);
console.log(`Exact matches: ${exactMatches}`);
console.log(`Exact@1: ${exactAt1.toFixed(3)}`);
console.log(`\\nRoot causes:`);

const rootCauses = {};
results.forEach(r => {
  rootCauses[r.root_cause] = (rootCauses[r.root_cause] || 0) + 1;
});

Object.entries(rootCauses).forEach(([cause, count]) => {
  console.log(`  ${cause}: ${count}`);
});

console.log(`\\nTop conflicts:`);
const conflicts = results.filter(r => r.root_cause === 'pin_too_broad');
conflicts.slice(0, 5).forEach(r => {
  console.log(`  "${r.q}" -> expected: ${r.expected_id.substring(0, 8)}, got: ${r.final_id?.substring(0, 8)}`);
});

// Generar archivos de utilidad
const missingPinCases = results.filter(r => r.root_cause === 'missing_pin').map(r => ({
  q: r.q,
  expected_slug: r.expected_slug,
  expected_id: r.expected_id
}));

const wrongExpectedCases = results.filter(r => r.root_cause === 'wrong_expected').map(r => ({
  q: r.q,
  expected_slug: r.expected_slug,
  expected_id: r.expected_id,
  final_id: r.final_id,
  final_slug: r.fused_top1.slug
}));

// Guardar archivos de utilidad
const missingPinPath = path.join(reportDir, 'APEX-H3.missing_pin.json');
const wrongExpectedPath = path.join(reportDir, 'APEX-H3.wrong_expected.json');

fs.writeFileSync(missingPinPath, JSON.stringify(missingPinCases, null, 2));
fs.writeFileSync(wrongExpectedPath, JSON.stringify(wrongExpectedCases, null, 2));

console.log(`\\nReports saved:`);
console.log(`  ${reportPath}`);
console.log(`  ${csvPath}`);
console.log(`  ${missingPinPath} (${missingPinCases.length} cases)`);
console.log(`  ${wrongExpectedPath} (${wrongExpectedCases.length} cases)`);