/**
 * QUERY PREPROCESSOR
 * Pipeline integrado para procesar queries antes del retrieval
 * Combina: Sanitizer → Language Normalizer → Ambiguous Handler → Segmenter
 */

const { sanitizeInput } = require('./input-sanitizer.cjs');
const { normalizeLanguage } = require('./language-normalizer.cjs');
const { handleAmbiguous, isAmbiguous } = require('./ambiguous-handler.cjs');
const { segmentQuery, needsSegmentation } = require('./query-segmenter.cjs');

/**
 * Pipeline de preprocesamiento completo
 */
async function preprocessQuery(query, options = {}) {
  const result = {
    original: query,
    processed: null,
    steps: [],
    requires_special_handling: false,
    ambiguous_response: null,
    segments: null
  };
  
  // PASO 1: Sanitización
  const sanitized = sanitizeInput(query);
  result.steps.push({
    step: 'sanitize',
    input: query,
    output: sanitized.sanitized,
    changed: sanitized.changed,
    warning: sanitized.warning
  });
  
  if (!sanitized.valid) {
    result.error = sanitized.error;
    return result;
  }
  
  // PASO 2: Normalización de idiomas
  const normalized = normalizeLanguage(sanitized.sanitized);
  result.steps.push({
    step: 'normalize_language',
    input: sanitized.sanitized,
    output: normalized,
    changed: normalized !== sanitized.sanitized
  });
  
  // PASO 3: Detección de queries ambiguas
  const ambiguousCheck = handleAmbiguous(normalized);
  if (ambiguousCheck.handled) {
    result.steps.push({
      step: 'ambiguous_detection',
      detected: true,
      type: ambiguousCheck.type
    });
    
    result.requires_special_handling = true;
    result.ambiguous_response = ambiguousCheck.response;
    result.processed = normalized;
    return result; // Terminar aquí si es ambigua
  }
  
  // PASO 4: Segmentación si es necesaria
  const segmentation = segmentQuery(normalized);
  if (segmentation.needs_segmentation && segmentation.segments.length > 1) {
    result.steps.push({
      step: 'segmentation',
      needed: true,
      segment_count: segmentation.segments.length,
      segments: segmentation.segments
    });
    
    result.requires_special_handling = true;
    result.segments = segmentation.segments;
    result.processed = segmentation.segments[0]; // Primera pregunta como principal
  } else {
    result.processed = normalized;
  }
  
  // Log para debugging
  if (options.debug) {
    console.log('[PREPROCESSOR] Pipeline result:', JSON.stringify(result, null, 2));
  }
  
  return result;
}

/**
 * Versión simplificada para uso directo
 */
function preprocessSimple(query) {
  // Pipeline rápido sin logging
  let processed = query;
  
  // 1. Sanitizar
  const sanitized = sanitizeInput(processed);
  if (!sanitized.valid) return null;
  processed = sanitized.sanitized;
  
  // 2. Normalizar idioma
  processed = normalizeLanguage(processed);
  
  // 3. Check ambiguo
  if (isAmbiguous(processed)) {
    const response = handleAmbiguous(processed);
    if (response.handled) {
      return {
        query: processed,
        special_response: response.response,
        skip_retrieval: true
      };
    }
  }
  
  // 4. Segmentar si es muy larga
  if (needsSegmentation(processed)) {
    const segments = segmentQuery(processed);
    if (segments.segments.length > 1) {
      return {
        query: segments.segments[0],
        additional_queries: segments.segments.slice(1),
        multi_segment: true
      };
    }
  }
  
  return {
    query: processed,
    skip_retrieval: false
  };
}

module.exports = {
  preprocessQuery,
  preprocessSimple
};