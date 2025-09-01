#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const APEX_FIRM_ID = "854bf730-8420-4297-86f8-3c4a972edcf2";

const PROBES = [
  "precio apex",
  "safety net", 
  "primer retiro"
];

async function healthCheck() {
  const startTime = Date.now();
  let result = {
    ok: false,
    latency_ms: 0,
    probes: [],
    env_ok: false,
    details: ""
  };

  // 1) Validar variables de entorno
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    result.details = `Missing env vars: ${!supabaseUrl ? 'SUPABASE_URL ' : ''}${!supabaseKey ? 'SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY' : ''}`;
    return result;
  }

  // Validar formato básico de URL
  try {
    new URL(supabaseUrl);
  } catch (e) {
    result.details = "Invalid SUPABASE_URL format";
    return result;
  }

  result.env_ok = true;

  // 2) Crear cliente y ejecutar probes
  let supabase;
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    result.details = `Supabase client creation failed: ${e.message}`;
    return result;
  }

  let allProbesOk = true;
  
  for (const probe of PROBES) {
    const probeStart = Date.now();
    let probeResult = { q: probe, count: 0, latency_ms: 0 };
    
    try {
      // Intentar con faq_retrieve_es_v3 primero, fallback a v2
      let { data, error } = await supabase.rpc('faq_retrieve_es_v3', {
        q: probe,
        firm_id: APEX_FIRM_ID
      });
      
      // Si falla v3, intentar v2
      if (error) {
        ({ data, error } = await supabase.rpc('faq_retrieve_es_v2', {
          q: probe,
          firm: APEX_FIRM_ID,
          cats: null,
          k: 5
        }));
      }
      
      probeResult.latency_ms = Date.now() - probeStart;
      
      if (error) {
        result.details = `Probe "${probe}" failed: ${error.message}`;
        allProbesOk = false;
      } else {
        probeResult.count = (data || []).length;
        if (probeResult.count === 0) {
          result.details = `Probe "${probe}" returned 0 results`;
          allProbesOk = false;
        }
      }
    } catch (e) {
      probeResult.latency_ms = Date.now() - probeStart;
      result.details = `Probe "${probe}" exception: ${e.message}`;
      allProbesOk = false;
    }
    
    result.probes.push(probeResult);
  }

  result.latency_ms = Date.now() - startTime;
  result.ok = result.env_ok && allProbesOk;
  
  return result;
}

async function main() {
  try {
    const result = await healthCheck();
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  } catch (e) {
    console.log(JSON.stringify({
      ok: false,
      latency_ms: 0,
      probes: [],
      env_ok: false,
      details: `Unexpected error: ${e.message}`
    }, null, 2));
    process.exit(2);
  }
}

if (require.main === module) {
  main();
}

module.exports = { healthCheck };