// Check FAQ 4d45a7ec - The competing FAQ
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  
  const { data: faq } = await supabase
    .from('faqs')
    .select('id, slug, question, answer_md, aliases')
    .eq('id', '4d45a7ec-0812-48cf-b9f0-117f42158615')
    .single();
  
  console.log('=== FAQ 4d45a7ec (Competing with limites-retiro) ===');
  console.log(`Slug: ${faq.slug}`);
  console.log(`Question: ${faq.question}`);
  console.log(`Answer preview: ${faq.answer_md.substring(0, 200)}...`);
  console.log(`Aliases (${faq.aliases?.length || 0}):`, faq.aliases);
})().catch(console.error);