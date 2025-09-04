#!/usr/bin/env node
/**
 * Generador de variaciones léxicas para test de cobertura
 */

const fs = require('fs');
const path = require('path');

// Diccionario de sinónimos y variaciones comunes
const variations = {
  // Verbos de acción
  'cuanto cuesta': ['cual es el precio', 'que precio tiene', 'cuanto sale', 'cuanto vale', 'que costo tiene'],
  'puedo': ['se puede', 'es posible', 'puedes', 'podria', 'me dejan'],
  'necesito': ['tengo que', 'es necesario', 'requiero', 'hace falta', 'es obligatorio'],
  'como funciona': ['como es', 'como trabaja', 'cual es el funcionamiento', 'explicame', 'como va'],
  'cuando': ['en que momento', 'a que hora', 'que dia', 'en cuanto tiempo'],
  'hay': ['existe', 'tienen', 'ofrecen', 'esta disponible', 'cuentan con'],
  
  // Sustantivos clave
  'cuenta': ['account', 'cuenta de trading', 'cuenta fondeada'],
  'evaluacion': ['eval', 'challenge', 'prueba', 'examen', 'fase de evaluacion'],
  'drawdown': ['dd', 'perdida maxima', 'limite de perdida', 'max loss'],
  'profit target': ['objetivo', 'meta', 'profit', 'ganancia objetivo', 'target'],
  'reset': ['resetear', 'reiniciar', 'empezar de nuevo', 'restart', 'comenzar otra vez'],
  'retiro': ['payout', 'withdrawal', 'cobro', 'sacar dinero', 'retirar fondos'],
  'mensualidad': ['suscripcion', 'pago mensual', 'cuota', 'fee mensual', 'subscription'],
  
  // Empresas/Productos
  'apex': ['apex trader', 'apextrader', 'apex trading', 'apex funded'],
  'static': ['cuenta static', 'static account', 'estatica'],
  'normal': ['regular', 'standard', 'comun', 'no static'],
  
  // Interrogativos
  'que': ['cual', 'cuales'],
  'cual es': ['que es', 'dime', 'me puedes decir'],
  
  // Preposiciones y conectores
  'para': ['de cara a', 'con el fin de', 'para poder'],
  'con': ['usando', 'mediante', 'a traves de'],
  'en': ['dentro de', 'durante'],
  
  // Tamaños de cuenta
  '25k': ['25 mil', '25000', 'veinticinco mil'],
  '50k': ['50 mil', '50000', 'cincuenta mil'],
  '100k': ['100 mil', '100000', 'cien mil'],
  '150k': ['150 mil', '150000', 'ciento cincuenta mil'],
};

// Función para generar variaciones de una pregunta
function generateVariations(question) {
  const variations_list = [question]; // Original siempre incluida
  const lowerQ = question.toLowerCase();
  
  // Variación 1: Reemplazar términos clave
  let variant1 = lowerQ;
  for (const [original, replacements] of Object.entries(variations)) {
    if (lowerQ.includes(original)) {
      const replacement = replacements[Math.floor(Math.random() * replacements.length)];
      variant1 = variant1.replace(original, replacement);
      if (variant1 !== lowerQ && !variations_list.includes(variant1)) {
        variations_list.push(variant1);
      }
      break; // Solo una sustitución por variante
    }
  }
  
  // Variación 2: Cambiar estructura de pregunta
  if (lowerQ.startsWith('cuanto')) {
    const variant2 = lowerQ.replace(/^cuanto/, 'cual es el precio');
    if (!variations_list.includes(variant2)) variations_list.push(variant2);
  } else if (lowerQ.startsWith('puedo')) {
    const variant2 = lowerQ.replace(/^puedo/, 'se puede');
    if (!variations_list.includes(variant2)) variations_list.push(variant2);
  } else if (lowerQ.startsWith('que')) {
    const variant2 = lowerQ.replace(/^que/, 'cual');
    if (!variations_list.includes(variant2)) variations_list.push(variant2);
  }
  
  // Variación 3: Forma más coloquial
  if (lowerQ.includes('?')) {
    const withoutQ = lowerQ.replace('?', '');
    const variant3 = `me puedes decir ${withoutQ}?`;
    if (!variations_list.includes(variant3) && variations_list.length < 4) {
      variations_list.push(variant3);
    }
  }
  
  // Variación 4: Simplificada (quitar palabras extra)
  const simplified = lowerQ
    .replace(/\bpuedo\b/, '')
    .replace(/\bnecesito\b/, '')
    .replace(/\bque\b/, '')
    .replace(/\bcual\b/, '')
    .replace(/\bes\b/, '')
    .replace(/\bel\b/, '')
    .replace(/\bla\b/, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (simplified.length > 10 && !variations_list.includes(simplified)) {
    variations_list.push(simplified + '?');
  }
  
  // Limitar a 5 variaciones máximo
  return variations_list.slice(0, 5);
}

// Función principal
function generateTestVariations() {
  console.log('📝 Generando variaciones léxicas para test de cobertura\n');
  
  // Leer archivo original de preguntas
  const questionsFile = fs.readFileSync(
    path.join(__dirname, '..', 'tests', 'apex-optimized-questions.txt'), 
    'utf-8'
  );
  
  const categories = {};
  let currentCategory = null;
  
  // Parsear preguntas originales
  questionsFile.split('\n').forEach(line => {
    if (line.startsWith('##')) {
      currentCategory = line.replace(/##\s*/, '').trim();
      categories[currentCategory] = [];
    } else if (line.trim() && !line.startsWith('#') && currentCategory) {
      categories[currentCategory].push(line.trim());
    }
  });
  
  // Generar variaciones
  let output = '# APEX TRADING BOT - TEST CON VARIACIONES LÉXICAS\n';
  output += '# Generado automáticamente con 3-5 variaciones por pregunta\n\n';
  
  let totalOriginal = 0;
  let totalWithVariations = 0;
  
  for (const [category, questions] of Object.entries(categories)) {
    if (questions.length === 0) continue;
    
    output += `## ${category}\n`;
    output += `# Originales: ${questions.length} | Con variaciones: ~${questions.length * 4}\n\n`;
    
    totalOriginal += questions.length;
    
    for (const question of questions) {
      const variants = generateVariations(question);
      totalWithVariations += variants.length;
      
      output += `# ORIGINAL: ${question}\n`;
      variants.forEach((v, i) => {
        output += `${v}\n`;
      });
      output += '\n';
    }
  }
  
  output += `# TOTAL: ${totalOriginal} preguntas originales → ${totalWithVariations} con variaciones\n`;
  
  // Guardar archivo
  const outputPath = path.join(__dirname, '..', 'tests', 'apex-variations-test.txt');
  fs.writeFileSync(outputPath, output);
  
  console.log(`✅ Generadas ${totalWithVariations} variaciones desde ${totalOriginal} preguntas originales`);
  console.log(`📄 Archivo guardado en: tests/apex-variations-test.txt`);
  
  // También generar versión JSON para procesamiento
  const jsonOutput = {
    generated: new Date().toISOString(),
    original_count: totalOriginal,
    variation_count: totalWithVariations,
    categories: {}
  };
  
  for (const [category, questions] of Object.entries(categories)) {
    jsonOutput.categories[category] = {
      original: questions,
      variations: questions.map(q => ({
        original: q,
        variants: generateVariations(q)
      }))
    };
  }
  
  const jsonPath = path.join(__dirname, '..', 'tests', 'apex-variations.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2));
  console.log(`📄 JSON guardado en: tests/apex-variations.json`);
  
  return { totalOriginal, totalWithVariations };
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  generateTestVariations();
}

module.exports = { generateVariations, generateTestVariations };