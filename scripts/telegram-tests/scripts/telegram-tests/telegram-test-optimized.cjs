#!/usr/bin/env node
/**
 * Telegram Bot Tester Optimizado
 * Reutiliza conexiones para evitar overhead de inicialización
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Singleton para ApexService
let apexServiceInstance = null;
let supabaseInstance = null;

async function getApexService() {
  if (!apexServiceInstance) {
    const { processQueryFirm } = require('../../services/firms/apex/index.js');
    apexServiceInstance = { processQuery: processQueryFirm };
  }
  return apexServiceInstance;
}

function getSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      process.env.SUPABASE_URL, 
      process.env.SUPABASE_SERVICE_KEY
    );
  }
  return supabaseInstance;
}

async function processQueryFirm(q) {
  const svc = await getApexService();
  const supa = getSupabase();
  
  const out = await svc.processQuery(q);
  
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

async function testQuery(query, expectedTerms = []) {
  const startTime = Date.now();
  
  try {
    const result = await processQueryFirm(query);
    const responseTime = Date.now() - startTime;
    
    const response = result.md || '';
    const isNotFound = response === 'No encontrado.' || response.includes('No encontrado');
    const hasTitle = response.includes('###');
    const hasMarkdown = response.includes('**') || response.includes('- ');
    const responseLength = response.length;
    const exceedsMaxLength = responseLength > 4096;
    
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
      response: response.substring(0, 200),
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

async function testBatch(questions, options = {}) {
  const results = [];
  const { showProgress = true, delay = 10, categoryName = '' } = options;
  
  if (categoryName) {
    console.log(`\n🤖 Testing ${categoryName}: ${questions.length} questions...\n`);
  } else {
    console.log(`\n🤖 Testing ${questions.length} questions...\n`);
  }
  
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
    
    if (delay > 0 && i < questions.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return results;
}

function generateReport(results, categoryName = '') {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success && !r.isNotFound);
  const notFound = results.filter(r => r.isNotFound);
  
  const avgResponseTime = results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length;
  const withTitles = results.filter(r => r.hasTitle).length;
  const withMarkdown = results.filter(r => r.hasMarkdown).length;
  const tooLong = results.filter(r => r.exceedsMaxLength).length;
  
  return {
    category: categoryName,
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

// Limpiar conexiones al terminar
async function cleanup() {
  apexServiceInstance = null;
  supabaseInstance = null;
}

module.exports = {
  processQueryFirm,
  testQuery,
  testBatch,
  generateReport,
  cleanup
};