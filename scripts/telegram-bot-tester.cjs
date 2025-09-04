#!/usr/bin/env node
/**
 * Telegram Bot Tester - Simula interacciones con el bot sin necesitar Telegram real
 * Usa la misma función processQueryFirm que el bot real
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Función idéntica a la del bot real
async function processQueryFirm(q) {
  const { default: ApexService } = await import('../services/firms/apex/index.js');
  const svc = new ApexService();
  await svc.initialize(); // Importante: inicializar el servicio
  const out = await svc.processQuery(q);
  
  const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  
  async function renderById(id) {
    const { data } = await supa.from('faqs').select('id,answer_short_md,answer_md').eq('id', id).single();
    if (!data) return { faq_id: null, md: 'No encontrado.' };
    return { faq_id: data.id, md: data.answer_short_md || data.answer_md || 'No encontrado.' };
  }
  
  if (Array.isArray(out) && out[0]?.id) return renderById(out[0].id);
  if (out?.faq_id && !out?.md) return renderById(out.faq_id);
  if (out?.response?.faq_id && !out?.response?.md) return renderById(out.response.faq_id);
  if (out?.response?.md) return { faq_id: out.response.faq_id || null, md: out.response.md };
  if (out?.md) return { faq_id: out.faq_id || null, md: out.md };
  return { faq_id: null, md: 'No encontrado.' };
}

// Función para testear una pregunta individual
async function testQuery(query, expectedTerms = []) {
  const startTime = Date.now();
  
  try {
    const result = await processQueryFirm(query);
    const responseTime = Date.now() - startTime;
    
    // Análisis de la respuesta
    const response = result.md || '';
    const isNotFound = response === 'No encontrado.' || response.includes('No encontrado');
    const hasTitle = response.includes('###');
    const hasMarkdown = response.includes('**') || response.includes('- ');
    const responseLength = response.length;
    const exceedsMaxLength = responseLength > 4096; // Límite de Telegram
    
    // Verificar términos esperados si se proporcionan
    let hasExpectedContent = true;
    if (expectedTerms.length > 0) {
      hasExpectedContent = expectedTerms.some(term => 
        response.toLowerCase().includes(term.toLowerCase())
      );
    }
    
    return {
      success: !isNotFound && hasExpectedContent,
      query,
      faq_id: result.faq_id,
      response: response.substring(0, 200), // Primeros 200 chars para el reporte
      fullResponse: response,
      responseTime,
      isNotFound,
      hasTitle,
      hasMarkdown,
      responseLength,
      exceedsMaxLength,
      hasExpectedContent
    };
  } catch (error) {
    return {
      success: false,
      query,
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

// Función para testear múltiples preguntas
async function testBatch(questions, options = {}) {
  const results = [];
  const { showProgress = true, delay = 100 } = options;
  
  console.log(`\n🤖 Testing ${questions.length} questions...\n`);
  
  for (let i = 0; i < questions.length; i++) {
    const q = typeof questions[i] === 'string' ? questions[i] : questions[i].q;
    const expected = questions[i].expect || [];
    
    if (showProgress) {
      process.stdout.write(`[${i + 1}/${questions.length}] Testing: "${q.substring(0, 50)}..."  `);
    }
    
    const result = await testQuery(q, expected);
    results.push(result);
    
    if (showProgress) {
      if (result.success) {
        console.log('✅');
      } else if (result.isNotFound) {
        console.log('⚠️  Not found');
      } else {
        console.log('❌ Failed');
      }
    }
    
    // Pequeño delay entre queries para no saturar
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return results;
}

// Función para generar reporte
function generateReport(results) {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success && !r.isNotFound);
  const notFound = results.filter(r => r.isNotFound);
  
  const avgResponseTime = results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length;
  const withTitles = results.filter(r => r.hasTitle).length;
  const withMarkdown = results.filter(r => r.hasMarkdown).length;
  const tooLong = results.filter(r => r.exceedsMaxLength).length;
  
  return {
    summary: {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      notFound: notFound.length,
      successRate: `${((successful.length / results.length) * 100).toFixed(1)}%`,
      avgResponseTime: `${avgResponseTime.toFixed(0)}ms`,
      withTitles: withTitles,
      withMarkdown: withMarkdown,
      tooLong: tooLong
    },
    successful: successful.map(r => ({
      query: r.query,
      faq_id: r.faq_id,
      responseTime: r.responseTime,
      preview: r.response
    })),
    failed: failed.map(r => ({
      query: r.query,
      error: r.error || 'Missing expected content',
      response: r.response
    })),
    notFound: notFound.map(r => r.query),
    timestamp: new Date().toISOString()
  };
}

// Exportar funciones para uso en otros scripts
module.exports = {
  processQueryFirm,
  testQuery,
  testBatch,
  generateReport
};

// Si se ejecuta directamente, hacer un test rápido
if (require.main === module) {
  const testQuestions = [
    { q: "cuanto cuesta la cuenta de 50k?", expect: ["167", "$167"] },
    { q: "puedo dejar trades abiertos de noche?", expect: ["NO", "no permitido"] },
    { q: "hay regla de consistencia?", expect: ["30%"] },
    { q: "como puedo retirar dinero?", expect: ["WISE", "PLANE"] },
    { q: "que plataformas puedo usar?", expect: ["NinjaTrader", "TradingView"] }
  ];
  
  (async () => {
    console.log('🚀 Telegram Bot Tester - Quick Test\n');
    console.log('=' .repeat(60));
    
    const results = await testBatch(testQuestions, { showProgress: true });
    const report = generateReport(results);
    
    console.log('\n' + '=' .repeat(60));
    console.log('\n📊 RESULTS:');
    console.log(`   Total: ${report.summary.total}`);
    console.log(`   ✅ Successful: ${report.summary.successful}`);
    console.log(`   ❌ Failed: ${report.summary.failed}`);
    console.log(`   ⚠️  Not Found: ${report.summary.notFound}`);
    console.log(`   📈 Success Rate: ${report.summary.successRate}`);
    console.log(`   ⏱️  Avg Response Time: ${report.summary.avgResponseTime}`);
    
    // Guardar reporte
    const reportPath = path.join(__dirname, '..', 'logs', 'telegram-test-quick.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}\n`);
    
    process.exit(report.summary.failed > 0 ? 1 : 0);
  })();
}