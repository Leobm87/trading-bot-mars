#!/usr/bin/env node

/**
 * GENERADOR DE VARIANTES COLOQUIALES
 * Genera automáticamente variantes de queries para mejorar cobertura
 */

const fs = require('fs');
const path = require('path');

// Mapeo de sinónimos y coloquialismos
const SYNONYM_MAPPINGS = {
  // Acciones
  "retirar": ["sacar", "cobrar", "withdrawar", "hacer cash out", "retirar fondos"],
  "pagar": ["abonar", "depositar", "hacer el pago"],
  "ganar": ["hacer profit", "generar ganancias", "sacar beneficio"],
  
  // Objetos
  "dinero": ["plata", "fondos", "ganancias", "profits", "beneficios", "cash"],
  "cuenta": ["account", "cuenta financiada", "PA", "cuenta PA"],
  "regla": ["rule", "norma", "requisito", "condición"],
  
  // Modificadores
  "mínimo": ["minimo", "menor", "más bajo", "minimum", "límite inferior"],
  "primero": ["primer", "inicial", "first", "1er"],
  "cuánto": ["cuanto", "qué monto", "qué cantidad", "cuánto es"],
  
  // Preguntas comunes
  "cómo": ["como", "de qué forma", "qué pasos", "cómo hago"],
  "cuándo": ["cuando", "en qué momento", "qué día"],
  "puedo": ["se puede", "es posible", "está permitido"]
};

// Plantillas de queries base
const BASE_QUERIES = {
  withdrawals: [
    "¿Cuál es el mínimo para retirar?",
    "¿Cómo puedo retirar dinero?",
    "¿Cuándo puedo hacer mi primer retiro?",
    "¿Qué es el safety net para retiros?"
  ],
  
  pricing: [
    "¿Cuánto cuesta apex?",
    "¿Qué precios tienen las cuentas?",
    "¿Hay descuentos disponibles?",
    "¿Cómo puedo pagar?"
  ],
  
  rules: [
    "¿Hay regla de consistencia?",
    "¿Puedo mantener posiciones overnight?",
    "¿Cuál es el drawdown máximo?",
    "¿Qué reglas tiene apex?"
  ]
};

// Generar variantes para una query
function generateVariants(query) {
  const variants = new Set([query]);
  const lowerQuery = query.toLowerCase();
  
  // 1. Aplicar sinónimos
  Object.entries(SYNONYM_MAPPINGS).forEach(([original, synonyms]) => {
    if (lowerQuery.includes(original)) {
      synonyms.forEach(synonym => {
        const variant = lowerQuery.replace(new RegExp(original, 'gi'), synonym);
        variants.add(variant);
      });
    }
  });
  
  // 2. Remover tildes
  const noAccents = lowerQuery
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/ñ/g, 'n');
  if (noAccents !== lowerQuery) variants.add(noAccents);
  
  // 3. Versiones coloquiales
  const colloquialTransforms = [
    // Remover signos de interrogación
    { pattern: /^¿(.+)\?$/, replacement: '$1' },
    { pattern: /^¿(.+)\?$/, replacement: '$1?' },
    
    // Versiones informales
    { pattern: /¿cómo puedo (.+)\?/, replacement: 'como $1' },
    { pattern: /¿cómo puedo (.+)\?/, replacement: 'quiero $1' },
    { pattern: /¿cuál es (.+)\?/, replacement: 'cual es $1' },
    { pattern: /¿cuál es (.+)\?/, replacement: 'dime $1' },
    
    // Typos comunes
    { pattern: /consistencia/, replacement: 'consistensia' },
    { pattern: /safety net/, replacement: 'safty net' },
    { pattern: /mínimo/, replacement: 'minimo' }
  ];
  
  colloquialTransforms.forEach(({ pattern, replacement }) => {
    if (pattern.test(lowerQuery)) {
      variants.add(lowerQuery.replace(pattern, replacement));
    }
  });
  
  // 4. Versiones muy cortas
  const keywords = lowerQuery.match(/\b(apex|retiro|pago|precio|regla|cuenta)\b/gi);
  if (keywords && keywords.length > 0) {
    variants.add(keywords[0]);
  }
  
  return Array.from(variants);
}

// Generar dataset completo
function generateFullDataset() {
  const allVariants = [];
  const variantsByCategory = {};
  
  Object.entries(BASE_QUERIES).forEach(([category, queries]) => {
    variantsByCategory[category] = [];
    
    queries.forEach(baseQuery => {
      const variants = generateVariants(baseQuery);
      variants.forEach(variant => {
        allVariants.push({
          original: baseQuery,
          variant: variant,
          category: category
        });
        variantsByCategory[category].push(variant);
      });
    });
  });
  
  // Agregar queries extremas para testing adversarial
  const adversarialQueries = [
    // Muy cortas
    "apex", "info", "?", "ayuda", "hola",
    
    // Muy largas
    "hola buenas tardes quiero saber toda la informacion sobre apex trading porque estoy interesado en empezar pero no se como funciona ni cuales son los requisitos ni los costos ni nada",
    
    // Mezcla de idiomas
    "what is el safety net para withdraw",
    "como hacer un withdrawal del account",
    
    // Múltiples preguntas
    "cuanto cuesta apex y como pago y cuando puedo retirar",
    
    // Ambiguas
    "dime todo", "explícame", "no entiendo"
  ];
  
  adversarialQueries.forEach(query => {
    allVariants.push({
      original: "ADVERSARIAL",
      variant: query,
      category: "adversarial"
    });
  });
  
  return {
    total_variants: allVariants.length,
    by_category: variantsByCategory,
    all_variants: allVariants,
    unique_queries: [...new Set(allVariants.map(v => v.variant))]
  };
}

// Ejecutar generación
const dataset = generateFullDataset();

// Guardar resultados
const outputDir = path.join(__dirname, '..', 'data', 'test-variants');
fs.mkdirSync(outputDir, { recursive: true });

// Guardar dataset completo
fs.writeFileSync(
  path.join(outputDir, 'query-variants.json'),
  JSON.stringify(dataset, null, 2)
);

// Guardar lista simple para testing
fs.writeFileSync(
  path.join(outputDir, 'query-variants.txt'),
  dataset.unique_queries.join('\n')
);

// Mostrar estadísticas
console.log('📊 VARIANTES GENERADAS:\n');
console.log(`Total variantes: ${dataset.total_variants}`);
console.log(`Queries únicas: ${dataset.unique_queries.length}`);
console.log('\nPor categoría:');
Object.entries(dataset.by_category).forEach(([cat, variants]) => {
  console.log(`  - ${cat}: ${variants.length} variantes`);
});
console.log(`  - adversarial: ${dataset.all_variants.filter(v => v.category === 'adversarial').length} variantes`);

console.log(`\n✅ Guardado en: ${outputDir}/query-variants.json`);

// Mostrar ejemplos
console.log('\n📝 EJEMPLOS DE VARIANTES:\n');
const examples = dataset.all_variants.slice(0, 10);
examples.forEach(({ original, variant, category }) => {
  if (original !== variant) {
    console.log(`[${category}] "${original.substring(0, 40)}..." → "${variant}"`);
  }
});