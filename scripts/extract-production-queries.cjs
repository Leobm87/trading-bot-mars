#!/usr/bin/env node

/**
 * EXTRACTOR DE QUERIES DE PRODUCCIÓN
 * Simula queries reales basadas en patrones comunes de usuarios
 */

const fs = require('fs');
const path = require('path');

// Queries reales reportadas como problemáticas
const PROBLEMATIC_QUERIES = [
  "como puedo sacar dinero con apex?",
  "como sacar plata",
  "puedo retirar ya?",
  "cuando cobro mi primer payout",
  "hay regla de consistencia con apex?",
  "cuanto es el minimo para sacar",
  "info apex",
  "precios",
  "apex",
  "ayuda"
];

// Variantes coloquiales comunes en español/latam
const COLLOQUIAL_PATTERNS = [
  // Retiros
  "sacar dinero", "sacar plata", "cobrar ganancias", "retirar fondos",
  "cash out", "hacer withdraw", "payout minimo", "primer cobro",
  
  // Preguntas informales
  "como funciona?", "que tal apex?", "es bueno apex?", "vale la pena?",
  "experiencias con apex", "opiniones apex", "apex scam?",
  
  // Typos y errores comunes
  "retiro minimo", "minimo retiro", "cuanto scar", "regla consistensia",
  "safty net", "safetty net", "sefety net",
  
  // Mezcla inglés/español
  "withdrawal minimo", "minimum para withdraw", "trading rules apex",
  "overnight rules", "consistency regla",
  
  // Queries muy cortas
  "apex", "info", "ayuda", "precios", "reglas", "retiros",
  
  // Queries muy largas
  "hola buenas tardes necesito saber como puedo retirar dinero de mi cuenta de apex porque ya pase la evaluacion y no se como hacer para cobrar mis ganancias",
  "tengo una duda sobre apex quiero saber si hay regla de consistencia y si puedo retirar cuando quiera o hay algun minimo"
];

// Simular queries con diferentes intents
const QUERIES_BY_INTENT = {
  withdrawals: [
    "como sacar dinero",
    "minimo para retirar",
    "primer payout cuanto",
    "safety net para cobrar",
    "puedo retirar ya?",
    "cuando puedo sacar plata"
  ],
  
  pricing: [
    "cuanto cuesta apex",
    "precios de las cuentas",
    "hay descuentos?",
    "formas de pago",
    "se puede pagar con crypto?"
  ],
  
  rules: [
    "reglas de apex",
    "hay consistencia?",
    "overnight permitido?",
    "max loss diario",
    "trailing drawdown"
  ],
  
  general: [
    "info apex",
    "como funciona",
    "es confiable?",
    "experiencias",
    "apex vs ftmo"
  ],
  
  ambiguous: [
    "apex",
    "ayuda",
    "info",
    "?",
    "hola"
  ]
};

// Generar dataset de queries de producción simuladas
function generateProductionQueries() {
  const allQueries = [
    ...PROBLEMATIC_QUERIES,
    ...COLLOQUIAL_PATTERNS,
    ...Object.values(QUERIES_BY_INTENT).flat()
  ];
  
  // Eliminar duplicados
  const uniqueQueries = [...new Set(allQueries)];
  
  // Agregar timestamp simulado y metadata
  const productionData = uniqueQueries.map((query, index) => ({
    timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    query: query,
    user_id: `user_${Math.floor(Math.random() * 1000)}`,
    source: Math.random() > 0.7 ? 'telegram' : 'web',
    session_id: `session_${Math.floor(Math.random() * 500)}`,
    response_status: Math.random() > 0.8 ? 'not_found' : 'found'
  }));
  
  // Ordenar por timestamp
  productionData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  return productionData;
}

// Guardar queries
const queries = generateProductionQueries();
const outputPath = path.join(__dirname, '..', 'logs', 'production-queries-simulated.json');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(queries, null, 2));

// También generar archivo de solo queries para testing rápido
const queriesOnly = queries.map(q => q.query);
fs.writeFileSync(
  path.join(__dirname, '..', 'logs', 'production-queries-list.txt'),
  queriesOnly.join('\n')
);

// Estadísticas
const stats = {
  total_queries: queries.length,
  not_found_count: queries.filter(q => q.response_status === 'not_found').length,
  not_found_rate: (queries.filter(q => q.response_status === 'not_found').length / queries.length * 100).toFixed(2) + '%',
  unique_users: new Set(queries.map(q => q.user_id)).size,
  sources: {
    telegram: queries.filter(q => q.source === 'telegram').length,
    web: queries.filter(q => q.source === 'web').length
  }
};

console.log('📊 Production Queries Extracted:');
console.log(JSON.stringify(stats, null, 2));
console.log(`\n✅ Saved ${queries.length} queries to ${outputPath}`);