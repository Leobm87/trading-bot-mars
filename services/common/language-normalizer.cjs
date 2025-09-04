/**
 * LANGUAGE NORMALIZER
 * Normaliza términos en inglés a español para mejor matching
 */

// Mapeo de términos financieros y de trading EN → ES
const BILINGUAL_MAPPINGS = {
  // Acciones principales
  'withdraw': 'retirar',
  'withdrawal': 'retiro',
  'withdrawals': 'retiros',
  'payout': 'pago',
  'payouts': 'pagos',
  'cash out': 'retirar',
  'deposit': 'depositar',
  'fund': 'fondear',
  'funding': 'fondeo',
  
  // Conceptos de trading
  'trading': 'trading', // mantener, es común en español
  'trade': 'operación',
  'trades': 'operaciones',
  'profit': 'ganancia',
  'profits': 'ganancias',
  'loss': 'pérdida',
  'losses': 'pérdidas',
  'drawdown': 'drawdown', // término técnico, mantener
  'overnight': 'nocturno',
  'consistency': 'consistencia',
  'scaling': 'escalamiento',
  
  // Cuentas y evaluación
  'account': 'cuenta',
  'accounts': 'cuentas',
  'evaluation': 'evaluación',
  'challenge': 'desafío',
  'funded': 'financiada',
  'funded account': 'cuenta financiada',
  'prop account': 'cuenta fondeada',
  'PA': 'cuenta PA', // mantener abreviación
  
  // Reglas y límites
  'rule': 'regla',
  'rules': 'reglas',
  'minimum': 'mínimo',
  'maximum': 'máximo',
  'limit': 'límite',
  'limits': 'límites',
  'threshold': 'umbral',
  'requirement': 'requisito',
  'requirements': 'requisitos',
  
  // Safety net y conceptos específicos
  'safety net': 'umbral de seguridad',
  'safty net': 'umbral de seguridad', // typo común
  'buffer': 'colchón',
  'cushion': 'colchón',
  'daily loss': 'pérdida diaria',
  'max loss': 'pérdida máxima',
  'profit target': 'objetivo de ganancia',
  
  // Precios y pagos
  'price': 'precio',
  'prices': 'precios',
  'cost': 'costo',
  'costs': 'costos',
  'fee': 'tarifa',
  'fees': 'tarifas',
  'commission': 'comisión',
  'commissions': 'comisiones',
  'discount': 'descuento',
  'discounts': 'descuentos',
  
  // Métodos de pago
  'wire': 'transferencia',
  'wire transfer': 'transferencia bancaria',
  'crypto': 'cripto',
  'cryptocurrency': 'criptomoneda',
  'bitcoin': 'bitcoin',
  'WISE': 'WISE', // mantener nombre del servicio
  'PLANE': 'PLANE', // mantener nombre del servicio
  
  // Preguntas comunes
  'how': 'cómo',
  'how to': 'cómo',
  'how much': 'cuánto',
  'when': 'cuándo',
  'what': 'qué',
  'what is': 'qué es',
  'which': 'cuál',
  'can i': 'puedo',
  'is it possible': 'es posible',
  'allowed': 'permitido'
};

// Frases completas comunes
const PHRASE_MAPPINGS = {
  'how to withdraw': 'como retirar',
  'how to get paid': 'como cobrar',
  'minimum withdrawal': 'retiro mínimo',
  'minimum payout': 'pago mínimo',
  'first payout': 'primer pago',
  'withdrawal methods': 'métodos de retiro',
  'payment methods': 'métodos de pago',
  'trading rules': 'reglas de trading',
  'overnight trading': 'trading nocturno',
  'consistency rule': 'regla de consistencia',
  'profit split': 'división de ganancias',
  'scaling plan': 'plan de escalamiento'
};

function normalizeLanguage(query) {
  let normalized = query.toLowerCase().trim();
  
  // 1. Normalizar frases completas primero
  Object.entries(PHRASE_MAPPINGS).forEach(([en, es]) => {
    const regex = new RegExp(`\\b${en}\\b`, 'gi');
    normalized = normalized.replace(regex, es);
  });
  
  // 2. Normalizar palabras individuales
  Object.entries(BILINGUAL_MAPPINGS).forEach(([en, es]) => {
    // Use word boundaries para evitar reemplazos parciales
    const regex = new RegExp(`\\b${en}\\b`, 'gi');
    normalized = normalized.replace(regex, es);
  });
  
  // 3. Limpiar espacios múltiples
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

// Detectar si una query tiene mezcla de idiomas
function hasMixedLanguages(query) {
  const englishTerms = Object.keys(BILINGUAL_MAPPINGS);
  const lowerQuery = query.toLowerCase();
  
  // Check if contains English terms
  const hasEnglish = englishTerms.some(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    return regex.test(lowerQuery);
  });
  
  // Check if also has Spanish indicators
  const hasSpanish = /[áéíóúñ¿¡]/.test(query) || 
                     /\b(cómo|cuánto|qué|cuál|puedo|quiero|necesito)\b/i.test(lowerQuery);
  
  return hasEnglish && hasSpanish;
}

// Obtener sugerencia de normalización para debug
function getNormalizationSuggestion(query) {
  const normalized = normalizeLanguage(query);
  if (normalized !== query.toLowerCase()) {
    return {
      original: query,
      normalized: normalized,
      changed: true,
      mixed_languages: hasMixedLanguages(query)
    };
  }
  return {
    original: query,
    normalized: query,
    changed: false,
    mixed_languages: false
  };
}

module.exports = {
  normalizeLanguage,
  hasMixedLanguages,
  getNormalizationSuggestion,
  BILINGUAL_MAPPINGS,
  PHRASE_MAPPINGS
};