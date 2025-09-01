// scripts/check-aliases-target.cjs - Verificar aliases aplicadas
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const targetId = '385d0f21-fee7-4acb-9f69-a70051e3ad38';
  const competitorId = '4d45a7ec-0812-48cf-b9f0-117f42158615';

  console.log('=== FAQ Target (limites-retiro) ===');
  const { data: target } = await supabase
    .from('faqs')
    .select('id, slug, question, aliases')
    .eq('id', targetId)
    .single();
  
  console.log(`Slug: ${target.slug}`);
  console.log(`Question: ${target.question}`);
  console.log(`Aliases (${target.aliases?.length || 0}):`, target.aliases);

  console.log('\n=== FAQ Competitor (payout frequency) ===');
  const { data: comp } = await supabase
    .from('faqs')
    .select('id, slug, question, aliases')
    .eq('id', competitorId)
    .single();
  
  console.log(`Slug: ${comp.slug}`);
  console.log(`Question: ${comp.question}`);
  console.log(`Aliases (${comp.aliases?.length || 0}):`, comp.aliases);

  console.log('\n=== Query Test ===');
  const testQuery = 'cuanto cobrar primer payout';
  const { data: results } = await supabase.rpc('faq_retrieve_es_v2', {
    q: testQuery,
    firm: '854bf730-8420-4297-86f8-3c4a972edcf2',
    cats: null,
    k: 5
  });

  console.log(`Query: "${testQuery}"`);
  console.log('Top-5 Results:');
  results.slice(0, 5).forEach((r, i) => {
    console.log(`  ${i+1}. ${r.id} (${r.slug}) - Score: ${r.score}`);
  });
})().catch(console.error);