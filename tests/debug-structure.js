const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zkqfyyvpyecueybxoqrt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcWZ5eXZweWVjdWV5YnhvcXJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM1NjIzMiwiZXhwIjoyMDY2OTMyMjMyfQ.KyOoW5KAVtl7VMTDVi9A03gTUgeQiuKoJuMunZtEiDw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAccountPlans() {
  console.log('=== DEBUGGING ACCOUNT PLANS STRUCTURE ===\n');
  
  try {
    // Query all Apex plans
    const apexId = '854bf730-8420-4297-86f8-3c4a972edcf2';
    console.log(`Querying account_plans for Apex (${apexId})...\n`);
    
    const { data: plans, error } = await supabase
      .from('account_plans')
      .select('*')
      .eq('firm_id', apexId);
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    if (!plans || plans.length === 0) {
      console.log('No plans found for Apex');
      return;
    }
    
    console.log(`Found ${plans.length} plans for Apex\n`);
    
    // Show first 3 complete records
    console.log('=== FIRST 3 COMPLETE RECORDS ===');
    for (let i = 0; i < Math.min(3, plans.length); i++) {
      console.log(`\n--- Record ${i + 1} ---`);
      console.log(JSON.stringify(plans[i], null, 2));
    }
    
    // List all field names
    console.log('\n=== ALL FIELD NAMES ===');
    if (plans[0]) {
      const fieldNames = Object.keys(plans[0]);
      console.log('Field count:', fieldNames.length);
      fieldNames.forEach((field, index) => {
        console.log(`${index + 1}. ${field}`);
      });
    }
    
    // Show unique account sizes
    console.log('\n=== UNIQUE ACCOUNT SIZES ===');
    const accountSizes = [...new Set(plans.map(plan => plan.account_size).filter(Boolean))];
    console.log('Unique account sizes found:');
    accountSizes.sort((a, b) => {
      const numA = parseFloat(a.toString().replace(/[^\d.-]/g, ''));
      const numB = parseFloat(b.toString().replace(/[^\d.-]/g, ''));
      return numA - numB;
    });
    accountSizes.forEach((size, index) => {
      console.log(`${index + 1}. ${size}`);
    });
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

debugAccountPlans();