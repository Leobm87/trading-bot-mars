#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Importar el servicio APEX
async function loadApexService() {
    const module = await import('../services/firms/apex/index.js');
    return new module.default();
}

async function evaluateBatch() {
    const goldenPath = path.join(__dirname, '../tests/golden/apex.jsonl');
    const lines = fs.readFileSync(goldenPath, 'utf8').trim().split('\n');
    
    const apexService = await loadApexService();
    const results = [];
    const misses = [];
    
    console.log(`Evaluando ${lines.length} queries...`);
    
    for (let i = 0; i < lines.length; i++) {
        const line = JSON.parse(lines[i]);
        const { q, expected_faq_id } = line;
        
        try {
            const start = Date.now();
            const result = await apexService.processQuery(q);
            const elapsed = Date.now() - start;
            
            const predicted = result?.faq_id || 'NONE';
            const match = predicted === expected_faq_id;
            
            const evaluation = {
                q,
                expected: expected_faq_id,
                predicted,
                match,
                ms: elapsed,
                source: result?.source || 'none'
            };
            
            results.push(evaluation);
            
            if (!match) {
                misses.push(evaluation);
            }
            
            if ((i + 1) % 10 === 0) {
                console.log(`Procesado: ${i + 1}/${lines.length}`);
            }
            
        } catch (error) {
            console.error(`Error en query "${q}":`, error.message);
            results.push({
                q,
                expected: expected_faq_id,
                predicted: 'ERROR',
                match: false,
                ms: -1,
                error: error.message
            });
        }
    }
    
    const exactAt1 = results.filter(r => r.match).length;
    const latencies = results.filter(r => r.ms > 0).map(r => r.ms);
    const p50 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.5)];
    
    const summary = {
        total: results.length,
        exact_at_1: `${exactAt1}/${results.length}`,
        p50_latency_ms: p50,
        misses_count: misses.length
    };
    
    console.log('\n=== SUMMARY ===');
    console.log(JSON.stringify(summary, null, 2));
    
    // Guardar misses detallados
    if (misses.length > 0) {
        const missesPath = path.join(__dirname, '../logs/analysis/APEX-misses.detail.json');
        fs.writeFileSync(missesPath, JSON.stringify(misses, null, 2));
        console.log(`\nMisses guardados en: ${missesPath}`);
    }
    
    return { summary, results, misses };
}

if (require.main === module) {
    evaluateBatch().catch(console.error);
}

module.exports = { evaluateBatch };