#!/usr/bin/env node
/**
 * Test de las variaciones restantes (456-544)
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

async function runRemainingTest() {
  console.log('🔬 TEST DE VARIACIONES RESTANTES (456-544)\n');
  console.log('=' .repeat(70));
  
  // Cargar todas las variaciones
  const variationsPath = path.join(__dirname, '..', 'tests', 'apex-variations.json');
  const variations = JSON.parse(fs.readFileSync(variationsPath, 'utf-8'));
  
  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    byCategory: {},
    failedQuestions: [],
    uniqueFailures: new Map(),
    timestamp: new Date().toISOString(),
    startIndex: 455 // Empezamos desde donde quedó el test anterior
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
  
  // Tomar solo las restantes (desde índice 455)
  const remainingVariations = allVariations.slice(455);
  
  console.log(`📊 Probando ${remainingVariations.length} variaciones restantes\n`);
  console.log(`(Continuando desde pregunta #456 de 544)\n`);
  
  // Procesar todas las restantes
  const BATCH_SIZE = 25;
  let processedCount = 455; // Contador global
  
  for (let batch = 0; batch * BATCH_SIZE < remainingVariations.length; batch++) {
    const start = batch * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, remainingVariations.length);
    const batchItems = remainingVariations.slice(start, end);
    
    const batchNum = Math.ceil((455 + start + 1) / BATCH_SIZE);
    console.log(`\n📦 Procesando lote ${batchNum} (${455 + start + 1}-${455 + end} de 544)`);
    console.log('-'.repeat(60));
    
    for (const { category, original, variant } of batchItems) {
      processedCount++;
      process.stdout.write(`[${processedCount}/544] Testing... `);
      
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
          error: result.error,
          index: processedCount
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
  
  // Resumen final
  console.log('\n' + '=' .repeat(70));
  console.log('📊 RESUMEN DE VARIACIONES RESTANTES');
  console.log('=' .repeat(70));
  
  const successRate = ((results.successful / results.total) * 100).toFixed(1);
  console.log(`\n🎯 RESULTADOS (preguntas 456-544):`);
  console.log(`   ✅ Exitosas:     ${results.successful}/${results.total} (${successRate}%)`);
  console.log(`   ❌ Fallidas:     ${results.failed}/${results.total}`);
  
  console.log(`\n📂 POR CATEGORÍA (solo restantes):`);
  console.log('-'.repeat(70));
  
  for (const [category, stats] of Object.entries(results.byCategory)) {
    const catRate = ((stats.successful / stats.total) * 100).toFixed(1);
    const emoji = catRate >= 90 ? '✅' : catRate >= 70 ? '⚠️' : '❌';
    console.log(`${emoji} ${category}`);
    console.log(`   ${stats.successful}/${stats.total} (${catRate}%)`);
  }
  
  // Análisis de fallas únicas
  console.log(`\n🔍 PATRONES DE FALLA EN RESTANTES:`);
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
    }
  }
  
  // Guardar reporte
  const timestamp = Date.now();
  const reportPath = path.join(__dirname, '..', 'logs', `remaining-variations-test-${timestamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Reporte guardado en: logs/remaining-variations-test-${timestamp}.json`);
  
  // Combinar con resultados anteriores (si queremos el total)
  console.log(`\n🔄 COMBINANDO CON RESULTADOS ANTERIORES:`);
  console.log(`   Preguntas 1-455:   405/455 (89.0%)`);
  console.log(`   Preguntas 456-544: ${results.successful}/${results.total} (${successRate}%)`);
  
  const totalQuestions = 455 + results.total;
  const totalSuccess = 405 + results.successful;
  const totalRate = ((totalSuccess / totalQuestions) * 100).toFixed(1);
  console.log(`   📊 TOTAL GLOBAL:    ${totalSuccess}/${totalQuestions} (${totalRate}%)`);
  
  return results;
}

// Ejecutar
if (require.main === module) {
  runRemainingTest()
    .then(results => {
      console.log('\n✅ Test de variaciones restantes completado\n');
      const exitCode = results.failed > 20 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { runRemainingTest };