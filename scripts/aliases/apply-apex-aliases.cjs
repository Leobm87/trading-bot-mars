#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function applyApexAliases() {
  console.log('🚀 Aplicando aliases de APEX...');
  
  const aliasesPath = path.join(__dirname, '../../data/aliases/apex.aliases.json');
  
  if (!fs.existsSync(aliasesPath)) {
    console.error('❌ Archivo de aliases no encontrado:', aliasesPath);
    process.exit(1);
  }

  const rows = JSON.parse(fs.readFileSync(aliasesPath, 'utf8'));
  
  let totalAliases = 0;
  let successCount = 0;
  let errorCount = 0;

  for (const { faq_id, aliases } of rows) {
    console.log(`\n📝 Procesando FAQ ${faq_id}...`);
    
    for (const alias of aliases) {
      const normalizedAlias = alias.trim().toLowerCase();
      totalAliases++;
      
      // No procesamos alias individual, se añaden en batch
    }
    
    try {
      // Obtener aliases existentes
      const { data: existingFaq, error: fetchError } = await supabase
        .from('faqs')
        .select('aliases')
        .eq('id', faq_id)
        .single();
        
      if (fetchError) {
        console.error(`   ❌ Error obteniendo FAQ ${faq_id}:`, fetchError.message);
        errorCount += aliases.length;
        continue;
      }
      
      // Combinar aliases existentes con nuevos (sin duplicados)
      const existingAliases = existingFaq?.aliases || [];
      const normalizedAliases = aliases.map(a => a.trim().toLowerCase());
      const combinedAliases = [...new Set([...existingAliases, ...normalizedAliases])];
      
      // Actualizar la columna aliases
      const { error } = await supabase
        .from('faqs')
        .update({ aliases: combinedAliases })
        .eq('id', faq_id);
        
      if (error) {
        console.error(`   ❌ Error actualizando FAQ ${faq_id}:`, error.message);
        errorCount += aliases.length;
      } else {
        console.log(`   ✅ ${aliases.length} aliases aplicados`);
        successCount += aliases.length;
      }
    } catch (err) {
      console.error(`   ❌ Exception con FAQ ${faq_id}:`, err.message);
      errorCount += aliases.length;
    }
  }
  
  console.log(`\n📊 Resumen:`);
  console.log(`   Total aliases: ${totalAliases}`);
  console.log(`   Éxitos: ${successCount}`);
  console.log(`   Errores: ${errorCount}`);
  
  if (errorCount > 0) {
    console.log('⚠️  Se encontraron errores. Revisar configuración de Supabase.');
    process.exitCode = 1;
  } else {
    console.log('🎉 APEX aliases aplicados exitosamente!');
  }
}

applyApexAliases().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});