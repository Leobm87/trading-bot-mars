#!/usr/bin/env node
/**
 * Test COMPLETO con TODAS las variaciones léxicas
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Cargar funciones del bot
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const { gateIntent } = require('../services/common/intent-gate.cjs');
const { retrieveTopK, confidentTop1 } = require('../services/common/retriever.cjs');
const { llmSelectFAQ } = require('../services/common/llm-selector.cjs');
const { formatFromFAQ, notFound } = require('../services/common/format.cjs');
const { embedText } = require('../services/common/embeddings.cjs');
const { resolvePin } = require('../services/common/pinner.cjs');

const firmId = '854bf730-8420-4297-86f8-3c4a972edcf2'; // APEX

async function processQuery(query) {
  const pinId = resolvePin('apex', query);
  if (pinId) {
    return formatFromFAQ({ id: pinId, score: 1.0, rank: 1 });
  }

  const cats = gateIntent(query);
  if (!supabase) return notFound();

  const cands = await retrieveTopK(supabase, query, cats, firmId, embedText);
  if (!cands || cands.length === 0) return notFound();

  const top1 = confidentTop1(cands);
  if (top1) return formatFromFAQ(top1);

  const pick = await llmSelectFAQ(query, cands);
  if (pick && pick.type === 'FAQ_ID') {
    const hit = cands.find(c => c.id === pick.id);
    if (hit) return formatFromFAQ(hit);
  }
  return notFound();
}

async function testVariation(question) {
  try {
    const startTime = Date.now();
    const result = await processQuery(question);
    const responseTime = Date.now() - startTime;
    
    return {
      question,
      success: result?.ok === true,
      source: result?.source || 'unknown',
      faq_id: result?.faq_id || null,
      responseTime
    };
  } catch (error) {
    return {
      question,
      success: false,
      error: error.message,
      responseTime: 0
    };
  }
}

async function runCompleteTest() {
  console.log('🔬 TEST COMPLETO DE VARIACIONES LÉXICAS\n');
  console.log('=' .repeat(70));
  
  // Cargar TODAS las variaciones
  const variationsPath = path.join(__dirname, '..', 'tests', 'apex-variations.json');
  const variations = JSON.parse(fs.readFileSync(variationsPath, 'utf-8'));
  
  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    byCategory: {},
    failedQuestions: [],
    uniqueFailures: new Map(), // Para agrupar fallas por patrón
    timestamp: new Date().toISOString()
  };
  
  let allVariations = [];
  
  // Recopilar TODAS las variaciones
  for (const [category, data] of Object.entries(variations.categories)) {
    const catVariations = data.variations || [];
    if (catVariations.length === 0) continue;
    
    for (const item of catVariations) {
      if (item?.variants) {
        for (const variant of item.variants) {
          allVariations.push({ 
            category, 
            original: item.original, 
            variant 
          });
        }
      }
    }
  }
  
  console.log(`📊 Probando ${allVariations.length} variaciones COMPLETAS\n`);
  console.log('Esto puede tomar varios minutos...\n');
  
  // Procesar por lotes para mejor feedback
  const BATCH_SIZE = 25;
  let processedCount = 0;
  
  for (let batch = 0; batch * BATCH_SIZE < allVariations.length; batch++) {
    const start = batch * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, allVariations.length);
    const batchItems = allVariations.slice(start, end);
    
    console.log(`\n📦 Procesando lote ${batch + 1} (${start + 1}-${end} de ${allVariations.length})`);
    console.log('-'.repeat(60));
    
    for (const { category, original, variant } of batchItems) {
      processedCount++;
      process.stdout.write(`[${processedCount}/${allVariations.length}] Testing... `);
      
      const result = await testVariation(variant);
      
      if (!results.byCategory[category]) {
        results.byCategory[category] = { 
          total: 0, 
          successful: 0, 
          failed: 0,
          failures: []
        };
      }
      
      results.byCategory[category].total++;
      results.total++;
      
      if (result.success) {
        results.byCategory[category].successful++;
        results.successful++;
        process.stdout.write(`✅\n`);
      } else {
        results.byCategory[category].failed++;
        results.failed++;
        
        const failureData = {
          category,
          original,
          variant,
          error: result.error
        };
        
        results.failedQuestions.push(failureData);
        results.byCategory[category].failures.push(failureData);
        
        // Agrupar por pregunta original
        if (!results.uniqueFailures.has(original)) {
          results.uniqueFailures.set(original, []);
        }
        results.uniqueFailures.get(original).push(variant);
        
        process.stdout.write(`❌ "${variant.substring(0, 40)}..."\n`);
      }
    }
    
    // Resumen parcial
    const partialRate = ((results.successful / results.total) * 100).toFixed(1);
    console.log(`\nParcial: ${results.successful}/${results.total} (${partialRate}%)`);
  }
  
  // Resumen final detallado
  console.log('\n' + '=' .repeat(70));
  console.log('📊 RESUMEN FINAL COMPLETO');
  console.log('=' .repeat(70));
  
  const successRate = ((results.successful / results.total) * 100).toFixed(1);
  console.log(`\n🎯 TOTALES:`);
  console.log(`   ✅ Exitosas:     ${results.successful}/${results.total} (${successRate}%)`);
  console.log(`   ❌ Fallidas:     ${results.failed}/${results.total}`);
  
  console.log(`\n📂 POR CATEGORÍA:`);
  console.log('-'.repeat(70));
  
  for (const [category, stats] of Object.entries(results.byCategory)) {
    const catRate = ((stats.successful / stats.total) * 100).toFixed(1);
    const emoji = catRate >= 90 ? '✅' : catRate >= 70 ? '⚠️' : '❌';
    console.log(`${emoji} ${category}`);
    console.log(`   ${stats.successful}/${stats.total} (${catRate}%)`);
    if (stats.failed > 0) {
      console.log(`   Fallas: ${stats.failed}`);
    }
  }
  
  // Análisis de patrones de falla
  console.log(`\n🔍 PATRONES DE FALLA ÚNICOS:`);
  console.log('-'.repeat(70));
  console.log(`Preguntas originales con fallas: ${results.uniqueFailures.size}`);
  
  let patternCount = 0;
  for (const [original, variants] of results.uniqueFailures.entries()) {
    patternCount++;
    if (patternCount <= 10) {
      console.log(`\n[${patternCount}] Original: "${original}"`);
      console.log(`    Variantes fallidas (${variants.length}):`);
      variants.slice(0, 3).forEach(v => {
        console.log(`    - "${v}"`);
      });
      if (variants.length > 3) {
        console.log(`    ... y ${variants.length - 3} más`);
      }
    }
  }
  
  if (results.uniqueFailures.size > 10) {
    console.log(`\n... y ${results.uniqueFailures.size - 10} patrones más`);
  }
  
  // Guardar reporte detallado
  const timestamp = Date.now();
  const reportPath = path.join(__dirname, '..', 'logs', `complete-variations-test-${timestamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Reporte completo guardado en: logs/complete-variations-test-${timestamp}.json`);
  
  // Guardar lista de fallas para procesamiento
  if (results.failed > 0) {
    const failuresPath = path.join(__dirname, '..', 'logs', `variations-failures-${timestamp}.txt`);
    const failuresList = Array.from(results.uniqueFailures.entries())
      .map(([orig, vars]) => `ORIGINAL: ${orig}\nVARIANTES FALLIDAS:\n${vars.join('\n')}\n`)
      .join('\n' + '='.repeat(50) + '\n');
    
    fs.writeFileSync(failuresPath, failuresList);
    console.log(`📝 Lista de fallas guardada en: logs/variations-failures-${timestamp}.txt`);
  }
  
  // Recomendaciones
  console.log(`\n💡 RECOMENDACIONES:`);
  if (successRate >= 95) {
    console.log(`   ✅ Excelente cobertura (>95%)`);
  } else if (successRate >= 85) {
    console.log(`   ⚠️  Buena cobertura, pero hay margen de mejora`);
    console.log(`   → Revisar los ${results.uniqueFailures.size} patrones de falla`);
    console.log(`   → Considerar agregar más PINs o aliases`);
  } else {
    console.log(`   ❌ Cobertura insuficiente (<85%)`);
    console.log(`   → Urgente: crear FAQs para los ${results.uniqueFailures.size} patrones fallidos`);
    console.log(`   → Actualizar PINs y aliases`);
  }
  
  return results;
}

// Ejecutar
if (require.main === module) {
  runCompleteTest()
    .then(results => {
      console.log('\n✅ Test completo finalizado\n');
      const exitCode = results.failed > 50 ? 1 : 0; // Falla si hay más de 50 errores
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { runCompleteTest };