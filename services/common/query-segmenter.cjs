/**
 * QUERY SEGMENTER
 * Divide queries largas o múltiples en segmentos procesables
 */

// Umbral para considerar una query como "larga"
const LONG_QUERY_THRESHOLD = 100; // caracteres
const MAX_SEGMENTS = 3; // máximo de preguntas a procesar

// Palabras que indican separación de preguntas
const SEPARATORS = [
  /\s+y\s+también\s+/gi,
  /\s+además\s+/gi,
  /\s+también\s+/gi,
  /\s+y\s+(?=¿|cuánto|cómo|qué|cuál)/gi,
  /[,;]/g,
  /\.\s+/g
];

// Palabras de relleno a eliminar
const FILLER_WORDS = [
  'hola', 'buenas', 'tardes', 'días', 'noches',
  'por favor', 'gracias', 'necesito', 'quiero',
  'saber', 'información', 'sobre', 'acerca de',
  'me gustaría', 'podrías', 'decirme', 'explicarme',
  'tengo una duda', 'tengo una pregunta',
  'estoy interesado', 'quisiera'
];

/**
 * Detecta si una query necesita segmentación
 */
function needsSegmentation(query) {
  // Query muy larga
  if (query.length > LONG_QUERY_THRESHOLD) {
    return true;
  }
  
  // Múltiples signos de interrogación
  const questionMarks = (query.match(/\?/g) || []).length;
  if (questionMarks > 1) {
    return true;
  }
  
  // Contiene separadores obvios
  const hasSeparators = SEPARATORS.some(sep => sep.test(query));
  if (hasSeparators) {
    return true;
  }
  
  return false;
}

/**
 * Limpia una query de palabras de relleno
 */
function cleanQuery(query) {
  let cleaned = query.toLowerCase().trim();
  
  // Eliminar saludos y cortesías al inicio
  cleaned = cleaned.replace(/^(hola|buenas?|buenos días|buenas tardes|buenas noches)[,.]?\s*/gi, '');
  
  // Eliminar frases de relleno comunes
  const fillerPhrases = [
    /necesito saber\s+/gi,
    /quiero saber\s+/gi,
    /me gustaría saber\s+/gi,
    /podrías decirme\s+/gi,
    /tengo una duda sobre\s+/gi,
    /estoy interesado en\s+/gi,
    /quisiera información sobre\s+/gi,
    /todo lo relacionado con\s+/gi,
    /toda la información sobre\s+/gi
  ];
  
  fillerPhrases.forEach(phrase => {
    cleaned = cleaned.replace(phrase, '');
  });
  
  // Eliminar puntos suspensivos y caracteres repetidos
  cleaned = cleaned.replace(/\.{2,}/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  return cleaned.trim();
}

/**
 * Extrae las preguntas principales de una query larga
 */
function extractQuestions(query) {
  const questions = [];
  let remaining = cleanQuery(query);
  
  // Buscar preguntas explícitas (con ?)
  const explicitQuestions = remaining.match(/[^.?!]*\?/g);
  if (explicitQuestions && explicitQuestions.length > 0) {
    return explicitQuestions
      .map(q => cleanQuery(q.replace('?', '')))
      .filter(q => q.length > 3)
      .slice(0, MAX_SEGMENTS);
  }
  
  // Si no hay preguntas explícitas, dividir por separadores
  SEPARATORS.forEach(separator => {
    if (questions.length < MAX_SEGMENTS) {
      const parts = remaining.split(separator);
      parts.forEach(part => {
        const cleaned = cleanQuery(part);
        if (cleaned.length > 5 && !questions.includes(cleaned)) {
          questions.push(cleaned);
        }
      });
    }
  });
  
  // Si aún no hay segmentos, buscar keywords importantes
  if (questions.length === 0) {
    const keywordPatterns = [
      /(precios?|costos?|cuánto cuesta)[^,.;]*/gi,
      /(reglas?|requisitos?|restricciones?)[^,.;]*/gi,
      /(retiros?|pagos?|cobrar|sacar dinero)[^,.;]*/gi,
      /(cuentas?|evaluación|desafío)[^,.;]*/gi,
      /(métodos? de pago|formas? de pago)[^,.;]*/gi,
      /(overnight|consistencia|drawdown)[^,.;]*/gi
    ];
    
    keywordPatterns.forEach(pattern => {
      const matches = remaining.match(pattern);
      if (matches && questions.length < MAX_SEGMENTS) {
        matches.forEach(match => {
          const cleaned = cleanQuery(match);
          if (cleaned.length > 5 && !questions.includes(cleaned)) {
            questions.push(cleaned);
          }
        });
      }
    });
  }
  
  // Si todavía no hay nada, devolver la query limpia
  if (questions.length === 0 && remaining.length > 0) {
    questions.push(remaining);
  }
  
  return questions.slice(0, MAX_SEGMENTS);
}

/**
 * Segmenta una query larga en múltiples queries
 */
function segmentQuery(query) {
  if (!needsSegmentation(query)) {
    return {
      needs_segmentation: false,
      original: query,
      segments: [cleanQuery(query)]
    };
  }
  
  const segments = extractQuestions(query);
  
  return {
    needs_segmentation: true,
    original: query,
    cleaned: cleanQuery(query),
    segments: segments,
    segment_count: segments.length
  };
}

/**
 * Consolida múltiples respuestas en una sola
 */
function consolidateResponses(responses) {
  if (!responses || responses.length === 0) {
    return null;
  }
  
  if (responses.length === 1) {
    return responses[0];
  }
  
  // Filtrar respuestas válidas (no "no encontrado")
  const validResponses = responses.filter(r => 
    r && r.response && !r.response.includes('No encontré información')
  );
  
  if (validResponses.length === 0) {
    return responses[0]; // devolver la primera aunque sea "no encontrado"
  }
  
  // Si hay múltiples respuestas válidas, combinarlas
  const combinedResponse = validResponses
    .map((r, index) => {
      const header = validResponses.length > 1 ? `**${index + 1}. ${r.question || 'Respuesta'}:**\n` : '';
      return header + r.response;
    })
    .join('\n\n---\n\n');
  
  return {
    ok: true,
    source: 'multi-segment',
    response: combinedResponse,
    segment_count: validResponses.length
  };
}

module.exports = {
  needsSegmentation,
  cleanQuery,
  extractQuestions,
  segmentQuery,
  consolidateResponses,
  LONG_QUERY_THRESHOLD,
  MAX_SEGMENTS
};