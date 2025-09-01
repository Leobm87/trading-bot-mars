// scripts/aliases-mine.cjs
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function extractNGrams(text, n = 2) {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  const ngrams = [];
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(' '));
  }
  return ngrams;
}

function extractKeyTerms(text) {
  // Extract important single terms and bigrams
  const terms = text.toLowerCase()
    .split(/[^\w\sáéíóúü]/g)
    .join(' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .filter(w => !['que', 'cual', 'como', 'donde', 'cuando', 'para', 'con', 'por', 'una', 'las', 'los', 'del', 'en', 'de', 'la', 'el'].includes(w));
  
  const bigrams = extractNGrams(text, 2);
  const trigrams = extractNGrams(text, 3);
  
  return [...new Set([...terms, ...bigrams, ...trigrams])];
}

(async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  
  // Load failures from eval-off output
  console.log("PINNER_OFF=1 node scripts/eval-off.cjs");
  console.log("Ejecuta el comando de arriba primero y después ejecuta este script manualmente.");
  console.log("Para esta demo, voy a usar los failures conocidos...");
  
  const failures = [
    { q: "Cual es el safety Net umbral de una cuenta de 100k ?", expected_faq_id: "da173bf4-8852-4ffc-847f-67486bf3ffd7", intent: "account_specs" },
    { q: "Dime el safety Net de 25k 50k y 300k en una sola respuesta", expected_faq_id: "da173bf4-8852-4ffc-847f-67486bf3ffd7", intent: "account_specs" },
    { q: "cual es el umbral minimo en apex", expected_faq_id: "a7615c5a-9daa-49a7-8aaf-12499819b4cc", intent: "withdrawals" },
    { q: "cual es el safety net para retirar", expected_faq_id: "da173bf4-8852-4ffc-847f-67486bf3ffd7", intent: "withdrawals" },
    { q: "¿Cuál es el umbral mínimo (Safety Net) para poder retirar en APEX?", expected_faq_id: "da173bf4-8852-4ffc-847f-67486bf3ffd7", intent: "withdrawals" },
    { q: "umbral apex", expected_faq_id: "da173bf4-8852-4ffc-847f-67486bf3ffd7", intent: "withdrawals" },
    { q: "retiro apex umbral", expected_faq_id: "da173bf4-8852-4ffc-847f-67486bf3ffd7", intent: "withdrawals" },
    { q: "metodos de pago apex", expected_faq_id: "4c484cef-5715-480f-8c16-914610866a62", intent: "payment_methods" },
    { q: "cuanto cuesta activar apex", expected_faq_id: "695fe96b-19a3-4b05-b43b-b8c3833de569", intent: "pricing" },
    { q: "precio apex activacion", expected_faq_id: "695fe96b-19a3-4b05-b43b-b8c3833de569" },
    { q: "payouts apex", expected_faq_id: "4d45a7ec-0812-48cf-b9f0-117f42158615" },
    { q: "retiro apex payouts", expected_faq_id: "4d45a7ec-0812-48cf-b9f0-117f42158615" },
    { q: "tamanos apex", expected_faq_id: "93849616-e113-43ee-8319-e32d44c1baed" },
    { q: "que precios tiene apex?", expected_faq_id: "93849616-e113-43ee-8319-e32d44c1baed" },
    { q: "cual es el umbral / safety net de apex?", expected_faq_id: "da173bf4-8852-4ffc-847f-67486bf3ffd7" },
    { q: "que colchon tiene apex?", expected_faq_id: "da173bf4-8852-4ffc-847f-67486bf3ffd7" }
  ];

  const suggestionsByFaq = {};
  
  // Group failures by expected_faq_id
  const failuresByFaq = failures.reduce((acc, f) => {
    if (!acc[f.expected_faq_id]) acc[f.expected_faq_id] = [];
    acc[f.expected_faq_id].push(f);
    return acc;
  }, {});

  console.log(`Analizando ${Object.keys(failuresByFaq).length} FAQs con fallos...`);

  for (const [faqId, failureList] of Object.entries(failuresByFaq)) {
    // Get FAQ data
    const { data: faqData } = await supabase
      .from('faqs')
      .select('id, question, aliases, slug')
      .eq('id', faqId)
      .single();
    
    if (!faqData) {
      console.log(`FAQ ${faqId} no encontrada, saltando...`);
      continue;
    }

    const existingAliases = new Set((faqData.aliases || []).map(a => a.toLowerCase()));
    const faqQuestion = (faqData.question || '').toLowerCase();
    
    const suggestedAliases = new Set();
    const queryTerms = new Set();

    // Extract terms from all failed queries for this FAQ
    failureList.forEach(failure => {
      const terms = extractKeyTerms(failure.q);
      terms.forEach(term => {
        queryTerms.add(term);
        // Only suggest if not already in question or aliases
        if (!faqQuestion.includes(term.toLowerCase()) && !existingAliases.has(term.toLowerCase())) {
          suggestedAliases.add(term);
        }
      });
    });

    // Filter to high-value aliases (appear in multiple queries or are key terms)
    const highValueAliases = Array.from(suggestedAliases)
      .filter(alias => {
        // Keep if appears in multiple queries or is a key single term
        const appearances = failureList.filter(f => f.q.toLowerCase().includes(alias.toLowerCase())).length;
        return appearances > 1 || (alias.split(' ').length === 1 && alias.length > 3);
      })
      .slice(0, 7); // Max 7 per FAQ as requested

    if (highValueAliases.length > 0) {
      suggestionsByFaq[faqId] = {
        faq_id: faqId,
        slug: faqData.slug,
        question: faqData.question,
        current_aliases: faqData.aliases || [],
        failed_queries: failureList.map(f => f.q),
        aliases: highValueAliases,
        rationale: `Extracted from ${failureList.length} failed queries. High-signal terms not present in current question/aliases.`
      };
    }
  }

  const outputPath = path.join(__dirname, '..', 'logs', 'analysis', 'APEX-H6.alias_suggestions.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(suggestionsByFaq, null, 2));

  console.log(`\nGeneradas sugerencias para ${Object.keys(suggestionsByFaq).length} FAQs`);
  console.log(`Guardado en: ${outputPath}`);
  
  // Show top suggestions
  Object.values(suggestionsByFaq).slice(0, 5).forEach(suggestion => {
    console.log(`\n${suggestion.slug}: ${suggestion.aliases.join(', ')}`);
  });
})().catch(e => { console.error(e); process.exit(1); });