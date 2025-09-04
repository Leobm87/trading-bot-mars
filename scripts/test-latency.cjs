#!/usr/bin/env node
/**
 * Test de latencia del bot APEX
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Cargar funciones necesarias
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

// Preguntas de diferentes tipos para medir latencia
const testQuestions = [
  // PINs directos (más rápidos)
  "cuanto cuesta apex",
  "precio 50k",
  "drawdown maximo",
  
  // Búsqueda en DB (velocidad media)
  "como funciona el trailing drawdown?",
  "que plataformas puedo usar?",
  "cuando puedo retirar?",
  "puedo tradear noticias?",
  "necesito kyc?",
  
  // Queries complejas que requieren LLM (más lentas)
  "puedo hacer swing trading con micros en cuenta de 50k durante noticias?",
  "cual es la mejor estrategia para principiantes con poco capital?",
  "como maximizar ganancias manteniendo riesgo bajo?",
  
  // Queries ambiguas
  "ayuda",
  "info",
  "apex"
];

async function measureLatency() {
  console.log('⏱️ TEST DE LATENCIA - BOT APEX\n');
  console.log('=' .repeat(70));
  console.log('Ejecutando 15 queries de diferentes tipos...\n');
  
  const latencies = [];
  const results = [];
  
  // Calentar el sistema
  console.log('🔥 Calentando sistema...');
  await processQuery("test");
  console.log('✅ Sistema listo\n');
  
  console.log('📊 MEDICIONES:');
  console.log('-'.repeat(70));
  
  for (let i = 0; i < testQuestions.length; i++) {
    const query = testQuestions[i];
    const displayQuery = query.length > 50 ? query.substring(0, 47) + '...' : query;
    
    const startTime = Date.now();
    try {
      const result = await processQuery(query);
      const latency = Date.now() - startTime;
      
      latencies.push(latency);
      results.push({
        query: displayQuery,
        latency,
        source: result?.source || 'unknown',
        success: result?.ok === true
      });
      
      const status = result?.ok ? '✅' : '❌';
      const source = result?.source === 'pin' ? '📌' : result?.source === 'db' ? '🔍' : '🤖';
      console.log(`[${String(i+1).padStart(2)}] ${status} ${source} ${String(latency).padStart(5)}ms | ${displayQuery}`);
      
    } catch (error) {
      const latency = Date.now() - startTime;
      console.log(`[${String(i+1).padStart(2)}] ❌ ⚠️  ${String(latency).padStart(5)}ms | ${displayQuery} (Error)`);
    }
  }
  
  // Calcular estadísticas
  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const min = Math.min(...latencies);
  const max = Math.max(...latencies);
  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const median = sortedLatencies[Math.floor(sortedLatencies.length / 2)];
  const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
  const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];
  
  console.log('\n' + '=' .repeat(70));
  console.log('📈 ESTADÍSTICAS DE LATENCIA');
  console.log('=' .repeat(70));
  
  console.log(`\n⚡ TIEMPOS DE RESPUESTA:`);
  console.log(`   Mínimo:    ${min}ms`);
  console.log(`   Promedio:  ${avg}ms`);
  console.log(`   Mediana:   ${median}ms`);
  console.log(`   Máximo:    ${max}ms`);
  
  console.log(`\n📊 PERCENTILES:`);
  console.log(`   P50:       ${median}ms`);
  console.log(`   P95:       ${p95}ms`);
  console.log(`   P99:       ${p99}ms`);
  
  // Análisis por tipo de respuesta
  const pinResponses = results.filter(r => r.source === 'pin');
  const dbResponses = results.filter(r => r.source === 'db');
  const llmResponses = results.filter(r => r.source === 'llm' || r.latency > 1000);
  
  console.log(`\n🔍 ANÁLISIS POR TIPO:`);
  if (pinResponses.length > 0) {
    const pinAvg = Math.round(pinResponses.reduce((a, b) => a + b.latency, 0) / pinResponses.length);
    console.log(`   📌 PINs (${pinResponses.length}):     ~${pinAvg}ms`);
  }
  if (dbResponses.length > 0) {
    const dbAvg = Math.round(dbResponses.reduce((a, b) => a + b.latency, 0) / dbResponses.length);
    console.log(`   🔍 DB (${dbResponses.length}):       ~${dbAvg}ms`);
  }
  if (llmResponses.length > 0) {
    const llmAvg = Math.round(llmResponses.reduce((a, b) => a + b.latency, 0) / llmResponses.length);
    console.log(`   🤖 LLM (${llmResponses.length}):      ~${llmAvg}ms`);
  }
  
  console.log(`\n✅ RESUMEN EJECUTIVO:`);
  console.log(`   • Respuesta típica: ${median}ms`);
  console.log(`   • 95% responden en: <${p95}ms`);
  console.log(`   • Rango esperado: ${min}-${max}ms`);
  
  // Evaluación de calidad
  console.log(`\n🏆 EVALUACIÓN:`);
  if (avg < 500) {
    console.log(`   ⚡ EXCELENTE - Respuestas muy rápidas (<500ms promedio)`);
  } else if (avg < 1000) {
    console.log(`   ✅ BUENO - Respuestas rápidas (<1s promedio)`);
  } else if (avg < 2000) {
    console.log(`   ⚠️  ACEPTABLE - Respuestas moderadas (<2s promedio)`);
  } else {
    console.log(`   ❌ LENTO - Necesita optimización (>${avg}ms promedio)`);
  }
  
  return {
    min,
    avg,
    median,
    max,
    p95,
    p99,
    samples: latencies.length
  };
}

// Ejecutar
if (require.main === module) {
  measureLatency()
    .then(stats => {
      console.log('\n✅ Test de latencia completado\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { measureLatency };