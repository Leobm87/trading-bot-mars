#!/usr/bin/env node

// Test single query para debug completo
async function debugSingleQuery() {
    console.log('=== DEBUG SINGLE QUERY ===');
    
    try {
        console.log('1. Importando APEX service...');
        const ApexModule = await import('./services/firms/apex/index.js');
        const ApexService = ApexModule.default;
        
        console.log('2. Creando instancia APEX...');
        const apex = new ApexService();
        
        console.log('3. Procesando query: "primer retiro"');
        const result = await apex.processQuery('primer retiro');
        
        console.log('4. Resultado:', JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.error('ERROR COMPLETO:', error);
        console.error('Stack trace:', error.stack);
    }
}

debugSingleQuery();