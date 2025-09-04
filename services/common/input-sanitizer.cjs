/**
 * INPUT SANITIZER
 * Limpia y valida inputs para prevenir inyecciones y normalizar queries
 */

// Límites de seguridad
const MAX_QUERY_LENGTH = 500; // caracteres máximos
const MIN_QUERY_LENGTH = 1;   // mínimo para procesar

// Patrones sospechosos de inyección
const INJECTION_PATTERNS = [
  /(\b|;|\||&)(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|EXEC|EXECUTE|UNION|SELECT)\s/gi,
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // onclick=, onload=, etc.
  /\.\.[\/\\]/g, // path traversal
  /['"`;]/g // comillas y punto y coma sospechosos en exceso
];

// Caracteres permitidos (alfanuméricos + español + puntuación básica)
const ALLOWED_CHARS_REGEX = /[^a-záéíóúñü0-9\s\-.,!?¿¡()$%]/gi;

// Emojis y caracteres Unicode especiales a eliminar
const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;

/**
 * Detecta posibles intentos de inyección
 */
function detectInjection(query) {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(query)) {
      return {
        detected: true,
        pattern: pattern.toString(),
        type: 'potential_injection'
      };
    }
  }
  
  // Detectar exceso de caracteres especiales
  const specialChars = (query.match(/['"`;|<>{}[\]]/g) || []).length;
  const ratio = specialChars / query.length;
  if (ratio > 0.2) { // más del 20% son caracteres especiales
    return {
      detected: true,
      type: 'suspicious_characters',
      ratio: ratio
    };
  }
  
  return {
    detected: false
  };
}

/**
 * Limpia caracteres no permitidos
 */
function cleanCharacters(query) {
  let cleaned = query;
  
  // 1. Eliminar emojis
  cleaned = cleaned.replace(EMOJI_REGEX, ' ');
  
  // 2. Eliminar caracteres de control y no imprimibles
  cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  
  // 3. Convertir HTML entities básicas
  const htmlEntities = {
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' '
  };
  
  Object.entries(htmlEntities).forEach(([entity, char]) => {
    cleaned = cleaned.replace(new RegExp(entity, 'gi'), char);
  });
  
  // 4. Eliminar tags HTML/XML
  cleaned = cleaned.replace(/<[^>]*>/g, ' ');
  
  // 5. Eliminar URLs
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/gi, ' ');
  cleaned = cleaned.replace(/www\.[^\s]+/gi, ' ');
  
  // 6. Eliminar caracteres no permitidos (pero mantener español)
  // Mantener solo: letras, números, espacios, y puntuación básica
  cleaned = cleaned.replace(/[^a-záéíóúñü0-9\s\-.,!?¿¡()$%]/gi, ' ');
  
  // 7. Normalizar espacios múltiples
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // 8. Eliminar espacios al inicio y final
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Normaliza la query para procesamiento seguro
 */
function normalizeQuery(query) {
  let normalized = query;
  
  // 1. Convertir a minúsculas
  normalized = normalized.toLowerCase();
  
  // 2. Normalizar caracteres Unicode (NFD -> NFC)
  normalized = normalized.normalize('NFC');
  
  // 3. Reemplazar caracteres similares
  const replacements = {
    '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
    '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
    '＄': '$', '％': '%', '＆': '&',
    'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', // etc... (full-width to normal)
  };
  
  Object.entries(replacements).forEach(([from, to]) => {
    normalized = normalized.replace(new RegExp(from, 'g'), to);
  });
  
  // 4. Eliminar puntuación repetida
  normalized = normalized.replace(/([.,!?])\1+/g, '$1');
  
  // 5. Normalizar signos de interrogación españoles
  normalized = normalized.replace(/¿+/g, '¿');
  normalized = normalized.replace(/\?+/g, '?');
  
  // Si hay ¿ sin ?, agregar ?
  if (normalized.includes('¿') && !normalized.includes('?')) {
    normalized += '?';
  }
  
  return normalized;
}

/**
 * Función principal de sanitización
 */
function sanitizeInput(query) {
  // Validación básica
  if (!query || typeof query !== 'string') {
    return {
      valid: false,
      error: 'Invalid input type',
      sanitized: ''
    };
  }
  
  // Verificar longitud antes de procesar
  if (query.length > MAX_QUERY_LENGTH) {
    query = query.substring(0, MAX_QUERY_LENGTH);
  }
  
  // Detectar inyecciones antes de limpiar
  const injectionCheck = detectInjection(query);
  if (injectionCheck.detected) {
    // Log para monitoreo pero continuar con limpieza
    console.warn('Potential injection detected:', injectionCheck);
  }
  
  // Pipeline de limpieza
  let sanitized = query;
  sanitized = cleanCharacters(sanitized);
  sanitized = normalizeQuery(sanitized);
  
  // Validación final
  if (sanitized.length < MIN_QUERY_LENGTH) {
    return {
      valid: false,
      error: 'Query too short after sanitization',
      original: query,
      sanitized: sanitized,
      warning: injectionCheck.detected ? 'potential_injection' : null
    };
  }
  
  return {
    valid: true,
    original: query,
    sanitized: sanitized,
    changed: query !== sanitized,
    length: sanitized.length,
    warning: injectionCheck.detected ? 'potential_injection_cleaned' : null
  };
}

/**
 * Validación rápida sin modificación
 */
function isValidInput(query) {
  if (!query || typeof query !== 'string') return false;
  if (query.length < MIN_QUERY_LENGTH || query.length > MAX_QUERY_LENGTH) return false;
  if (detectInjection(query).detected) return false;
  return true;
}

module.exports = {
  sanitizeInput,
  isValidInput,
  detectInjection,
  cleanCharacters,
  normalizeQuery,
  MAX_QUERY_LENGTH,
  MIN_QUERY_LENGTH
};