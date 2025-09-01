const fs = require('fs');
const path = require('path');

// Leer missing_pin cases
const reportDir = path.join(__dirname, '../logs/analysis');
const missingPinPath = path.join(reportDir, 'APEX-H3.missing_pin.json');
const missingPinCases = JSON.parse(fs.readFileSync(missingPinPath, 'utf8'));

// Políticas de generación de regex por slug
function generatePinSuggestions(cases) {
  const suggestions = [];
  
  // Agrupar cases por expected_slug para detectar patrones comunes
  const groupedBySlug = {};
  cases.forEach(c => {
    if (!groupedBySlug[c.expected_slug]) {
      groupedBySlug[c.expected_slug] = [];
    }
    groupedBySlug[c.expected_slug].push(c.q);
  });
  
  Object.entries(groupedBySlug).forEach(([slug, queries]) => {
    const allQueries = queries.join(' ').toLowerCase();
    
    // Determinar categoría basada en contenido de queries
    let category = 'general';
    let pattern = '';
    let rationale = '';
    
    // Pricing - incluir ≥2 términos de precio, excluir comisiones
    if (containsAtLeast(allQueries, ['precio', 'precios', 'cuesta', 'coste', 'mensual', 'plan', 'planes', 'tarifa', 'descuento', 'código', 'cupon', 'suscrip'], 2)) {
      category = 'pricing';
      pattern = '(?=.*\\\\b(precio|precios|cuesta|coste|mensual|plan|planes|tarifa|descuento|c(ó|o)digo|cup(o|ó)n|suscrip)\\\\b)(?=.*\\\\b(precio|precios|cuesta|coste|mensual|plan|planes|tarifa|descuento|c(ó|o)digo|cup(o|ó)n|suscrip)\\\\b)(?!.*\\\\b(comisi|fee|por\\\\s+contrato|rithmic|tradovate|split|payout)\\\\b)';
      rationale = 'Pricing pattern: requires 2+ price terms, excludes commissions';
    }
    // Comisiones - incluir ≥2 términos de comisión, excluir precios
    else if (containsAtLeast(allQueries, ['comisi', 'fee', 'fees', 'por contrato', 'rithmic', 'tradovate', 'split', 'payout fee', 'porcentaje', 'reparto'], 2)) {
      category = 'comisiones';
      pattern = '(?=.*\\\\b(comisi|fee|fees|por\\\\s+contrato|rithmic|tradovate|split|payout\\\\s+fee|porcentaje|reparto)\\\\b)(?=.*\\\\b(comisi|fee|fees|por\\\\s+contrato|rithmic|tradovate|split|payout\\\\s+fee|porcentaje|reparto)\\\\b)(?!.*\\\\b(precio|precios|cuesta|coste|mensual|plan|planes|tarifa|descuento|c(ó|o)digo|cup(o|ó)n)\\\\b)';
      rationale = 'Commissions pattern: requires 2+ commission terms, excludes pricing';
    }
    // Safety net - incluir ≥1 término safety, excluir mínimo/retiro
    else if (containsAny(allQueries, ['safety net', 'colchón', 'colchon', 'red de seguridad', 'umbral'])) {
      category = 'safety_net';
      pattern = '(?=.*\\\\b(safety\\\\s*net|colch(ó|o)n|red\\\\s+de\\\\s+seguridad|umbral)\\\\b)(?!.*\\\\b(mínim|minim|payout|retiro|withdraw)\\\\b)';
      rationale = 'Safety net pattern: includes safety terms, excludes minimum/withdraw';
    }
    // Mínimo retiro - patrón ordenado específico
    else if (allQueries.includes('retir') && (allQueries.includes('mínim') || allQueries.includes('minim'))) {
      category = 'min_payout';
      pattern = '(mínim|minim).*(retiro|withdraw|payout)|(payout).*(mínim|minim)';
      rationale = 'Minimum payout pattern: ordered minimum + payout terms';
    }
    // Horario domingo→lunes
    else if (containsAny(allQueries, ['domingo lunes', 'dom lun', 'fin de semana apertura'])) {
      category = 'sunday_monday';
      pattern = '(domingo.*lunes|dom.*lun|fin\\\\s+de\\\\s+semana.*apertura)';
      rationale = 'Sunday-Monday schedule pattern';
    }
    // Plataformas abiertas
    else if (containsAny(allQueries, ['r-trader', 'tradovate abierta', 'tradovate abiertas', 'plataforma abierta'])) {
      category = 'platforms_open';
      pattern = '(r-?trader|tradovate.*abiert[oa]s|plataforma.*abierta)';
      rationale = 'Platform opening pattern';
    }
    // Saldos iniciales
    else if (containsAny(allQueries, ['saldo inicial', 'saldos iniciales', 'starting balance', 'arranque'])) {
      category = 'initial_balance';
      pattern = '(saldo(s)?\\\\s+inicial(es)?|starting\\\\s+balance|arranque)';
      rationale = 'Initial balance pattern';
    }
    // Noticias evaluación
    else if (containsAny(allQueries, ['noticia', 'noticias', 'news evaluación'])) {
      category = 'news_evaluation';
      pattern = '(notici(a|as)|news.*evaluaci(ó|o)n)';
      rationale = 'News evaluation pattern';
    }
    // Patterns específicos detectados en queries
    else {
      // Analizar queries específicas para patrones únicos
      const uniqueTerms = extractKeyTerms(queries);
      if (uniqueTerms.length > 0) {
        pattern = '\\\\b(' + uniqueTerms.join('|') + ')\\\\b';
        rationale = `Specific terms pattern: ${uniqueTerms.join(', ')}`;
      }
    }
    
    if (pattern) {
      suggestions.push({
        slug: slug,
        pattern: pattern,
        rationale: rationale,
        category: category,
        queries: queries.length,
        sample_query: queries[0]
      });
    }
  });
  
  return suggestions;
}

function containsAtLeast(text, terms, count) {
  const matches = terms.filter(term => text.includes(term.toLowerCase()));
  return matches.length >= count;
}

function containsAny(text, terms) {
  return terms.some(term => text.includes(term.toLowerCase()));
}

function extractKeyTerms(queries) {
  // Extraer términos clave únicos de las queries
  const allWords = queries.join(' ').toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !['apex', 'cual', 'cuales', 'donde', 'como', 'cuando', 'puedo', 'debo', 'tiene'].includes(word));
  
  const wordCounts = {};
  allWords.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });
  
  // Devolver palabras que aparecen en al menos 50% de queries
  const threshold = Math.max(1, Math.floor(queries.length * 0.5));
  return Object.entries(wordCounts)
    .filter(([word, count]) => count >= threshold)
    .map(([word, count]) => word)
    .slice(0, 5);
}

// Ejecutar análisis
const suggestions = generatePinSuggestions(missingPinCases);

// Guardar sugerencias
const outputPath = path.join(reportDir, 'APEX-H3.pins_suggested.json');
fs.writeFileSync(outputPath, JSON.stringify(suggestions, null, 2));

console.log(`\n=== APEX PINS SUGGESTIONS ===`);
console.log(`Analyzed: ${missingPinCases.length} missing pin cases`);
console.log(`Generated: ${suggestions.length} pin suggestions`);

// Mostrar categorías
const categories = {};
suggestions.forEach(s => {
  categories[s.category] = (categories[s.category] || 0) + 1;
});

console.log(`\nCategories:`);
Object.entries(categories).forEach(([cat, count]) => {
  console.log(`  ${cat}: ${count}`);
});

console.log(`\nTop suggestions:`);
suggestions.slice(0, 10).forEach(s => {
  console.log(`  ${s.slug}: "${s.sample_query}" -> ${s.pattern.substring(0, 60)}...`);
});

console.log(`\nSuggestions saved: ${outputPath}`);