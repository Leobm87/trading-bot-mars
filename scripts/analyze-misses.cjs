#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function analyzeMisses() {
    console.log('=== ANALIZANDO MISSES APEX ===');
    
    const missesPath = path.join(__dirname, '../logs/analysis/APEX-misses.detail.json');
    const misses = JSON.parse(fs.readFileSync(missesPath, 'utf8'));
    
    console.log(`Total misses a analizar: ${misses.length}`);
    
    const analysis = {
        golden_mismatch: [],
        retriever_fail: [],
        selector_fail: [],
        unknown: []
    };
    
    for (let i = 0; i < misses.length; i++) {
        const miss = misses[i];
        const { q, expected, predicted } = miss;
        
        try {
            // Clasificación simple basada en si predicted tiene respuesta válida
            if (predicted && predicted !== 'NONE' && predicted.length > 10) {
                // Si predicted devuelve algo válido, probablemente sea golden_mismatch
                // (el pipeline funcionó pero golden esperaba otro FAQ)
                analysis.golden_mismatch.push({
                    q,
                    expected,
                    predicted,
                    reason: "Pipeline returned valid FAQ, potential golden mismatch"
                });
            } else if (predicted === 'NONE' || !predicted) {
                // Si predicted es NONE, el pipeline falló en algún stage
                // Sin más info, clasificamos como retriever_fail (más común)
                analysis.retriever_fail.push({
                    q,
                    expected,
                    predicted,
                    reason: "Pipeline returned NONE - likely retriever failed to find expected in top candidates"
                });
            } else {
                analysis.unknown.push({
                    q,
                    expected, 
                    predicted,
                    reason: "Unclear classification"
                });
            }
            
            if ((i + 1) % 10 === 0) {
                console.log(`Analizados: ${i + 1}/${misses.length}`);
            }
            
        } catch (error) {
            console.error(`Error analizando miss "${q}":`, error.message);
            analysis.unknown.push({
                q,
                expected,
                predicted,
                reason: `Analysis error: ${error.message}`
            });
        }
    }
    
    // Generar reporte
    const report = {
        summary: {
            total_misses: misses.length,
            golden_mismatch: analysis.golden_mismatch.length,
            retriever_fail: analysis.retriever_fail.length,
            selector_fail: analysis.selector_fail.length,
            unknown: analysis.unknown.length
        },
        details: analysis
    };
    
    // Guardar análisis completo
    const analysisPath = path.join(__dirname, '../logs/analysis/APEX-misses.analysis.json');
    fs.writeFileSync(analysisPath, JSON.stringify(report, null, 2));
    
    console.log('\n=== RESUMEN ANÁLISIS ===');
    console.log(JSON.stringify(report.summary, null, 2));
    console.log(`\nAnálisis completo guardado en: ${analysisPath}`);
    
    return report;
}

if (require.main === module) {
    analyzeMisses().catch(console.error);
}

module.exports = { analyzeMisses };