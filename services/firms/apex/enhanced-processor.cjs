#!/usr/bin/env node

/**
 * ENHANCED PROCESSOR FOR APEX
 * Versión mejorada con preprocesamiento para alcanzar 100% cobertura
 */

const { preprocessSimple } = require('../../common/query-preprocessor.cjs');

/**
 * Procesa una query con el pipeline mejorado
 */
async function processQueryEnhanced(query) {
  // 1. Preprocesar query
  const preprocessed = preprocessSimple(query);
  
  if (!preprocessed) {
    return {
      ok: false,
      error: 'Invalid query after preprocessing',
      response: 'La consulta no es válida. Por favor, reformula tu pregunta.'
    };
  }
  
  // 2. Si requiere respuesta especial (query ambigua)
  if (preprocessed.skip_retrieval && preprocessed.special_response) {
    return {
      ok: true,
      source: 'ambiguous_handler',
      response: preprocessed.special_response,
      message: preprocessed.special_response
    };
  }
  
  // 3. Si es multi-segmento, procesar cada uno
  if (preprocessed.multi_segment && preprocessed.additional_queries) {
    const results = [];
    
    // Procesar query principal
    const mainResult = await processNormalQuery(preprocessed.query);
    results.push(mainResult);
    
    // Procesar queries adicionales
    for (const additionalQuery of preprocessed.additional_queries) {
      const result = await processNormalQuery(additionalQuery);
      results.push(result);
    }
    
    // Combinar resultados
    return combineResults(results);
  }
  
  // 4. Procesar query normal
  return await processNormalQuery(preprocessed.query);
}

/**
 * Procesa una query normal (ya preprocesada)
 */
async function processNormalQuery(query) {
  // Usar el procesador existente de APEX
  const { processQueryFirm } = require('./index.js');
  
  try {
    const result = await processQueryFirm(query);
    return result;
  } catch (error) {
    console.error('[ENHANCED] Error processing query:', error);
    return {
      ok: false,
      error: error.message,
      response: 'Ocurrió un error al procesar tu consulta. Por favor, intenta de nuevo.'
    };
  }
}

/**
 * Combina múltiples resultados en uno
 */
function combineResults(results) {
  const validResults = results.filter(r => r && r.ok && r.response);
  
  if (validResults.length === 0) {
    return results[0] || {
      ok: false,
      response: 'No encontré información específica para tu consulta.'
    };
  }
  
  if (validResults.length === 1) {
    return validResults[0];
  }
  
  // Combinar respuestas
  const combinedResponse = validResults
    .map((r, i) => `**Parte ${i + 1}:**\n${r.response}`)
    .join('\n\n---\n\n');
  
  return {
    ok: true,
    source: 'multi_segment',
    response: combinedResponse,
    message: combinedResponse,
    segment_count: validResults.length
  };
}

// Si se ejecuta directamente, probar con ejemplos
if (require.main === module) {
  const testQueries = [
    'apex', // ambigua
    'how to withdraw money', // inglés
    'safty net', // typo
    'hola quiero saber todo sobre apex precios reglas y como retirar', // larga
    'como sacar dinero', // coloquial
    '¿¿¿apex???', // caracteres especiales
    'withdraw minimo apex' // mezclado
  ];
  
  async function testEnhanced() {
    console.log('🧪 TESTING ENHANCED PROCESSOR\n');
    
    for (const query of testQueries) {
      console.log(`\n📝 Query: "${query}"`);
      const result = await processQueryEnhanced(query);
      
      if (result.ok) {
        console.log(`✅ SUCCESS - Source: ${result.source}`);
        console.log(`Response preview: ${result.response.substring(0, 100)}...`);
      } else {
        console.log(`❌ FAILED - Error: ${result.error}`);
      }
    }
  }
  
  testEnhanced().catch(console.error);
}

module.exports = {
  processQueryEnhanced
};