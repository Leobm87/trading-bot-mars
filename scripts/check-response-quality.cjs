#!/usr/bin/env node

/**
 * VERIFICADOR DE CALIDAD DE RESPUESTAS
 * Analiza longitud, relevancia y completitud de las respuestas en BD
 */

const fs = require('fs');
const path = require('path');

// Conexión a Supabase
async function checkResponseQuality() {
  console.log('📊 ANÁLISIS DE CALIDAD DE RESPUESTAS EN BD\n');
  
  // Usar el comando SQL directo para obtener FAQs
  const { execSync } = require('child_process');
  
  try {
    // Obtener todas las FAQs de APEX
    const sqlQuery = `
      SELECT 
        id,
        question,
        answer_md,
        answer_short_md,
        LENGTH(answer_md) as answer_length,
        LENGTH(answer_short_md) as short_length
      FROM faqs 
      WHERE firm_id = (SELECT id FROM firms WHERE slug = 'apex')
      ORDER BY LENGTH(answer_md) DESC
    `;
    
    const cmd = `PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -c "${sqlQuery}" -t -A -F'|'`;
    const output = execSync(cmd, { encoding: 'utf8' });
    
    const faqs = output.trim().split('\n')
      .filter(line => line.length > 0)
      .map(line => {
        const parts = line.split('|');
        return {
          id: parts[0],
          question: parts[1],
          answer_length: parseInt(parts[4]) || 0,
          short_length: parseInt(parts[5]) || 0,
          has_short: parts[5] && parts[5] !== ''
        };
      });
    
    // Análisis de métricas
    const metrics = {
      total_faqs: faqs.length,
      avg_answer_length: 0,
      max_answer_length: 0,
      min_answer_length: Infinity,
      faqs_too_long: [],
      faqs_too_short: [],
      faqs_without_short: [],
      length_distribution: {
        very_short: 0,  // < 100 chars
        short: 0,       // 100-300 chars  
        medium: 0,      // 300-600 chars
        long: 0,        // 600-1000 chars
        very_long: 0    // > 1000 chars
      }
    };
    
    // Calcular métricas
    let totalLength = 0;
    faqs.forEach(faq => {
      totalLength += faq.answer_length;
      
      // Actualizar min/max
      if (faq.answer_length > metrics.max_answer_length) {
        metrics.max_answer_length = faq.answer_length;
      }
      if (faq.answer_length < metrics.min_answer_length) {
        metrics.min_answer_length = faq.answer_length;
      }
      
      // Clasificar por longitud
      if (faq.answer_length < 100) {
        metrics.length_distribution.very_short++;
        metrics.faqs_too_short.push({
          id: faq.id,
          question: faq.question.substring(0, 50),
          length: faq.answer_length
        });
      } else if (faq.answer_length < 300) {
        metrics.length_distribution.short++;
      } else if (faq.answer_length < 600) {
        metrics.length_distribution.medium++;
      } else if (faq.answer_length < 1000) {
        metrics.length_distribution.long++;
      } else {
        metrics.length_distribution.very_long++;
        metrics.faqs_too_long.push({
          id: faq.id,
          question: faq.question.substring(0, 50),
          length: faq.answer_length
        });
      }
      
      // FAQs sin respuesta corta
      if (!faq.has_short) {
        metrics.faqs_without_short.push({
          id: faq.id,
          question: faq.question.substring(0, 50)
        });
      }
    });
    
    metrics.avg_answer_length = Math.round(totalLength / faqs.length);
    
    // Métricas de calidad
    metrics.quality_score = calculateQualityScore(metrics);
    
    // Guardar reporte
    const reportPath = path.join(__dirname, '..', 'logs', 'analysis', 'response-quality-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(metrics, null, 2));
    
    // Mostrar resultados
    console.log('📈 MÉTRICAS DE CALIDAD:\n');
    console.log(`Total FAQs: ${metrics.total_faqs}`);
    console.log(`Longitud promedio: ${metrics.avg_answer_length} caracteres`);
    console.log(`Rango: ${metrics.min_answer_length} - ${metrics.max_answer_length} caracteres`);
    
    console.log('\n📊 DISTRIBUCIÓN DE LONGITUDES:');
    console.log(`  Muy cortas (<100): ${metrics.length_distribution.very_short}`);
    console.log(`  Cortas (100-300): ${metrics.length_distribution.short}`);
    console.log(`  Medias (300-600): ${metrics.length_distribution.medium}`);
    console.log(`  Largas (600-1000): ${metrics.length_distribution.long}`);
    console.log(`  Muy largas (>1000): ${metrics.length_distribution.very_long}`);
    
    if (metrics.faqs_too_long.length > 0) {
      console.log('\n⚠️ FAQs MUY LARGAS (>1000 chars):');
      metrics.faqs_too_long.slice(0, 5).forEach(faq => {
        console.log(`  - "${faq.question}..." (${faq.length} chars)`);
      });
    }
    
    if (metrics.faqs_without_short.length > 0) {
      console.log(`\n❌ FAQs SIN answer_short_md: ${metrics.faqs_without_short.length}`);
      metrics.faqs_without_short.slice(0, 5).forEach(faq => {
        console.log(`  - "${faq.question}..."`);
      });
    }
    
    console.log('\n🎯 SCORE DE CALIDAD: ' + metrics.quality_score + '/100');
    
    // Recomendaciones
    console.log('\n💡 RECOMENDACIONES:');
    
    if (metrics.faqs_too_long.length > 0) {
      console.log('1. Crear answer_short_md para FAQs largas');
    }
    
    if (metrics.faqs_without_short.length > 0) {
      console.log('2. Agregar answer_short_md faltantes');
    }
    
    if (metrics.avg_answer_length > 600) {
      console.log('3. Considerar respuestas más concisas');
    }
    
    console.log(`\n✅ Reporte guardado en: ${reportPath}`);
    
    // Generar SQL para agregar answer_short_md faltantes
    if (metrics.faqs_without_short.length > 0) {
      generateShortAnswerSQL(metrics.faqs_without_short);
    }
    
  } catch (error) {
    console.error('Error al analizar calidad:', error.message);
  }
}

function calculateQualityScore(metrics) {
  let score = 100;
  
  // Penalizar FAQs muy largas
  score -= metrics.length_distribution.very_long * 2;
  
  // Penalizar FAQs sin respuesta corta
  score -= metrics.faqs_without_short.length * 3;
  
  // Penalizar promedio muy alto
  if (metrics.avg_answer_length > 800) score -= 10;
  if (metrics.avg_answer_length > 1000) score -= 10;
  
  // Bonificar distribución balanceada
  if (metrics.length_distribution.medium > metrics.total_faqs * 0.4) {
    score += 5;
  }
  
  return Math.max(0, Math.min(100, score));
}

function generateShortAnswerSQL(faqsWithoutShort) {
  const sqlPath = path.join(__dirname, '..', 'logs', 'analysis', 'add-short-answers.sql');
  
  const sql = `-- SQL para agregar answer_short_md faltantes
-- Generado: ${new Date().toISOString()}

${faqsWithoutShort.slice(0, 10).map(faq => `
-- FAQ: ${faq.question}
UPDATE faqs 
SET answer_short_md = '-- TODO: Crear versión corta --'
WHERE id = '${faq.id}';
`).join('\n')}
`;
  
  fs.writeFileSync(sqlPath, sql);
  console.log(`\n📝 SQL para agregar respuestas cortas: ${sqlPath}`);
}

// Ejecutar
checkResponseQuality().catch(console.error);