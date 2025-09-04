const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runGuards() {
  const results = {
    sql_guards: "working",
    sql_driver: "supabase_client",
    guard1_latency_ms: null,
    guard2_latency_ms: null,
    errors: []
  };

  try {
    // Guard 1: Basic connectivity
    const start1 = Date.now();
    const { data: guard1Data, error: guard1Error } = await supabase
      .from('faqs')
      .select('id')
      .limit(1);
    
    const guard1Latency = Date.now() - start1;
    
    if (guard1Error) {
      results.errors.push(`Guard 1 failed: ${guard1Error.message}`);
      results.sql_guards = "failed";
    } else {
      results.guard1_latency_ms = guard1Latency;
      console.log(`✓ Guard 1 (basic connectivity): ${guard1Latency}ms`);
    }

    // Guard 2: RPC test (using v2 with firm parameter)
    const start2 = Date.now();
    const { data: guard2Data, error: guard2Error } = await supabase
      .rpc('faq_retrieve_es_v2', {
        q: 'primer retiro',
        firm: '854bf730-8420-4297-86f8-3c4a972edcf2',
        cats: null,
        k: 5
      });
    
    const guard2Latency = Date.now() - start2;
    
    if (guard2Error) {
      results.errors.push(`Guard 2 failed: ${guard2Error.message}`);
      results.sql_guards = "failed";
    } else {
      results.guard2_latency_ms = guard2Latency;
      console.log(`✓ Guard 2 (RPC test): ${guard2Latency}ms`);
    }

    // Check latency requirements
    if (results.guard1_latency_ms > 1500 || results.guard2_latency_ms > 1500) {
      results.sql_guards = "slow";
      results.errors.push(`Latency exceeded 1500ms`);
    }

  } catch (error) {
    results.sql_guards = "error";
    results.errors.push(error.message);
  }

  console.log('\n=== SQL GUARDS RESULTS ===');
  console.log(JSON.stringify(results, null, 2));
  
  process.exit(results.sql_guards === "working" ? 0 : 1);
}

runGuards();