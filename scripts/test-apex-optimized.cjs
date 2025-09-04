#!/usr/bin/env node
/**
 * Test Simplificado con preguntas optimizadas para APEX
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Cargar preguntas optimizadas
const questionsFile = fs.readFileSync(path.join(__dirname, '..', 'tests', 'apex-optimized-questions.txt'), 'utf-8');
const categories = {};
let currentCategory = null;

questionsFile.split('\n').forEach(line => {
  if (line.startsWith('##')) {
    currentCategory = line.replace(/##\s*/, '').trim();
    categories[currentCategory] = [];
  } else if (line.trim() && !line.startsWith('#') && currentCategory) {
    categories[currentCategory].push(line.trim());
  }
});

// Inicializar servicio una sola vez
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Cargar funciones necesarias
const { gateIntent } = require('../services/common/intent-gate.cjs');
const { retrieveTopK, confidentTop1 } = require('../services/common/retriever.cjs');
const { llmSelectFAQ } = require('../services/common/llm-selector.cjs');
const { formatFromFAQ, notFound } = require('../services/common/format.cjs');
const { embedText } = require('../services/common/embeddings.cjs');
const { resolvePin } = require('../services/common/pinner.cjs');

const firmId = '854bf730-8420-4297-86f8-3c4a972edcf2'; // APEX firm ID

// Función para procesar una query
async function processQuery(query) {
  // 0) Pinner determinista
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

// Función para probar una pregunta
async function testQuestion(question) {
  try {
    const startTime = Date.now();
    const result = await processQuery(question);
    const responseTime = Date.now() - startTime;
    
    return {
      question,
      success: result?.ok === true,
      faq_id: result?.faq_id || null,
      source: result?.source || 'unknown',
      responseTime,
      response: result?.response ? result.response.substring(0, 100) + '...' : null
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

// Función principal
async function runTest() {
  console.log('🚀 APEX OPTIMIZED TEST - 131 PREGUNTAS\n');
  console.log('=' .repeat(70));
  
  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    byCategory: {},
    timestamp: new Date().toISOString()
  };
  
  // Procesar cada categoría
  for (const [categoryName, questions] of Object.entries(categories)) {
    if (questions.length === 0) continue;
    
    console.log(`\n📂 ${categoryName} (${questions.length} preguntas)`);
    console.log('-'.repeat(60));
    
    const categoryResults = {
      total: questions.length,
      successful: 0,
      failed: 0,
      questions: []
    };
    
    // Procesar cada pregunta
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      process.stdout.write(`[${i+1}/${questions.length}] Testing: "${question.substring(0, 40)}..." `);
      
      const result = await testQuestion(question);
      categoryResults.questions.push(result);
      
      if (result.success) {
        categoryResults.successful++;
        results.successful++;
        console.log(`✅ (${result.responseTime}ms)`);
      } else {
        categoryResults.failed++;
        results.failed++;
        console.log(`❌ ${result.error ? `(${result.error})` : ''}`);
      }
      
      results.total++;
      
      // Sin pausa para ir más rápido
    }
    
    // Resumen de categoría
    const successRate = ((categoryResults.successful / categoryResults.total) * 100).toFixed(1);
    console.log(`   Resumen: ${categoryResults.successful}/${categoryResults.total} (${successRate}%)`);
    
    results.byCategory[categoryName] = categoryResults;
  }
  
  // Resumen final
  console.log('\n' + '=' .repeat(70));
  console.log('📊 RESUMEN FINAL');
  console.log('=' .repeat(70));
  
  const overallSuccessRate = ((results.successful / results.total) * 100).toFixed(1);
  console.log(`Total preguntas:     ${results.total}`);
  console.log(`✅ Exitosas:         ${results.successful}`);
  console.log(`❌ Fallidas:         ${results.failed}`);
  console.log(`📈 Tasa de éxito:    ${overallSuccessRate}%`);
  
  console.log('\n📂 DESGLOSE POR CATEGORÍA:');
  console.log('-'.repeat(70));
  
  for (const [category, stats] of Object.entries(results.byCategory)) {
    const rate = ((stats.successful / stats.total) * 100).toFixed(1);
    console.log(`${category.padEnd(40)} ${rate.padStart(6)}% (${stats.successful}/${stats.total})`);
  }
  
  // Guardar resultados
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const reportPath = path.join(__dirname, '..', 'logs', `apex-optimized-test-${timestamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Reporte guardado en: ${reportPath}`);
  
  // Guardar preguntas fallidas
  const failedQuestions = [];
  for (const [category, stats] of Object.entries(results.byCategory)) {
    stats.questions.forEach(q => {
      if (!q.success) {
        failedQuestions.push(`[${category}] ${q.question}`);
      }
    });
  }
  
  if (failedQuestions.length > 0) {
    const failedPath = path.join(__dirname, '..', 'logs', `apex-failed-questions-${timestamp}.txt`);
    fs.writeFileSync(failedPath, failedQuestions.join('\n'));
    console.log(`📝 Preguntas fallidas guardadas en: ${failedPath}`);
  }
  
  return results;
}

// Ejecutar test
if (require.main === module) {
  runTest()
    .then(results => {
      const exitCode = results.failed > 0 ? 1 : 0;
      console.log(`\n✅ Test completado\n`);
      process.exit(exitCode);
    })
    .catch(error => {
      console.error(`❌ Error fatal: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { runTest };