#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Supabase config
const supabaseUrl = process.env.SUPABASE_URL || 'https://zkqfyyvpyecueybxoqrt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcWZ5eXZweWVjdWV5YnhvcXJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM1NjIzMiwiZXhwIjoyMDY2OTMyMjMyfQ.KyOoW5KAVtl7VMTDVi9A03gTUgeQiuKoJuMunZtEiDw';
const supabase = createClient(supabaseUrl, supabaseKey);

const APEX_FIRM_ID = '854bf730-8420-4297-86f8-3c4a972edcf2';

async function main() {
  try {
    // Load coverage spec
    const specPath = path.join(__dirname, '..', 'data', 'specs', 'apex-coverage.json');
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    
    const results = {
      inserted: 0,
      updated: 0,
      unchanged: 0,
      errors: []
    };

    console.log(`Processing ${spec.faqs.length} FAQs for APEX...`);

    for (const faq of spec.faqs) {
      try {
        // Check if FAQ with this slug exists
        const { data: existing, error: selectError } = await supabase
          .from('faqs')
          .select('id, slug')
          .eq('firm_id', APEX_FIRM_ID)
          .eq('slug', faq.slug)
          .single();

        if (selectError && selectError.code !== 'PGRST116') {
          throw selectError;
        }

        if (!existing) {
          // Insert new FAQ
          const { error: insertError } = await supabase
            .from('faqs')
            .insert({
              firm_id: APEX_FIRM_ID,
              slug: faq.slug,
              question: faq.question,
              answer_md: faq.answer_md,
              effective_from: new Date().toISOString(),
              source_url: 'https://eltraderfinanciado.com/apex-trader-funding/'
            });

          if (insertError) throw insertError;
          
          results.inserted++;
          console.log(`✓ Inserted: ${faq.slug}`);
        } else {
          // For now, always update answer_md and question
          const needsUpdate = true;

          if (needsUpdate) {
            const { error: updateError } = await supabase
              .from('faqs')
              .update({
                question: faq.question,
                answer_md: faq.answer_md
              })
              .eq('id', existing.id);

            if (updateError) throw updateError;
            
            results.updated++;
            console.log(`↻ Updated: ${faq.slug}`);
          } else {
            results.unchanged++;
            console.log(`- Unchanged: ${faq.slug}`);
          }
        }
      } catch (error) {
        results.errors.push({ slug: faq.slug, error: error.message });
        console.error(`✗ Error with ${faq.slug}:`, error.message);
      }
    }

    // Print summary
    console.log('\n=== Coverage Import Summary ===');
    console.log(`Inserted: ${results.inserted}`);
    console.log(`Updated: ${results.updated}`);
    console.log(`Unchanged: ${results.unchanged}`);
    console.log(`Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('\nErrors:');
      results.errors.forEach(e => console.log(`  - ${e.slug}: ${e.error}`));
    }

    // Write results to log
    const logPath = path.join(__dirname, '..', 'logs', 'coverage-import.json');
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.writeFileSync(logPath, JSON.stringify(results, null, 2));
    
    console.log(`\nResults saved to: ${logPath}`);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}