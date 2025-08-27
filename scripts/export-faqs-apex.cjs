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
    console.log('Fetching APEX FAQs from database...');
    
    // Fetch all FAQs for APEX
    const { data: faqs, error } = await supabase
      .from('faqs')
      .select('id, slug, question')
      .eq('firm_id', APEX_FIRM_ID)
      .order('slug');

    if (error) {
      throw error;
    }

    console.log(`Found ${faqs.length} FAQs for APEX`);

    // Create export directory if needed
    const exportDir = path.join(__dirname, '..', 'data', 'export');
    fs.mkdirSync(exportDir, { recursive: true });

    // Export to JSON
    const exportPath = path.join(exportDir, 'apex-faqs.json');
    const exportData = {
      firm_id: APEX_FIRM_ID,
      exported_at: new Date().toISOString(),
      count: faqs.length,
      faqs: faqs
    };

    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    
    console.log(`\nExported to: ${exportPath}`);
    console.log('\nSample FAQs:');
    faqs.slice(0, 5).forEach(faq => {
      console.log(`  - ${faq.slug}: ${faq.question.substring(0, 50)}...`);
    });

  } catch (error) {
    console.error('Error exporting FAQs:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}