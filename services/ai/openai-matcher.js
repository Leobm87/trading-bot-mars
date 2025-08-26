const OpenAI = require('openai');

class OpenAIMatcher {
    constructor() {
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || 'sk-proj-xxx' // Replace in production
        });
    }

    async findBestFAQ(query, faqs, firmName) {
        try {
            console.log(`[OpenAI] Processing query: "${query}" for ${firmName}`);
            
            const faqList = Array.from(faqs.values()).map((faq, i) => 
                `${i}. Q: ${faq.question}\n   Keywords: ${this.extractKeywords(faq.question)}`
            ).join('\n');

            const prompt = `You are an expert FAQ matcher for ${firmName} prop trading firm.

CRITICAL MATCHING RULES:
- "precio", "cuanto vale", "cuanto cuesta", "cost" → MUST match pricing/cost FAQs
- "dias minimos", "minimum days" → MUST match day requirements FAQs  
- "drawdown", "limites de perdida", "loss limits" → MUST match drawdown FAQs
- "evaluacion", "evaluation", "assessment" → MUST match evaluation process FAQs
- "requisitos", "requirements" → MUST match requirement FAQs

User Query: "${query}"

Available FAQs:
${faqList}

Instructions:
1. Understand the semantic intent of the query
2. Match based on meaning, not just keywords
3. If query asks about price/cost, ONLY return pricing FAQs
4. Return the FAQ number (0-${faqs.size-1}) that BEST answers the query
5. Return -1 ONLY if absolutely no FAQ is relevant

Response: [number only]`;

            const response = await this.client.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0,
                max_tokens: 10
            });

            const faqIndex = parseInt(response.choices[0].message.content.trim());
            console.log(`[OpenAI] Selected FAQ index: ${faqIndex}`);
            
            if (faqIndex >= 0 && faqIndex < faqs.size) {
                const faqArray = Array.from(faqs.values());
                console.log(`[OpenAI] Matched: "${faqArray[faqIndex].question.substring(0, 60)}..."`);
                return {
                    found: true,
                    faq: faqArray[faqIndex],
                    confidence: 0.95
                };
            }
            
            console.log('[OpenAI] No suitable FAQ found, using fallback');
            return { found: false };
        } catch (error) {
            console.error('[OpenAI] Error:', error.message);
            return { found: false };
        }
    }

    extractKeywords(text) {
        const keywords = ['precio', 'costo', 'cuanto', 'drawdown', 'dias', 'minimo', 'evaluacion', 'requisito', 'limite', 'perdida'];
        return keywords.filter(k => text.toLowerCase().includes(k)).join(', ') || 'general';
    }
}

module.exports = OpenAIMatcher;