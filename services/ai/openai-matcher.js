const OpenAI = require('openai');

class OpenAIMatcher {
    constructor() {
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || 'sk-proj-xxx' // Replace in production
        });
    }

    async findBestFAQ(query, faqs, firmName) {
        try {
            const faqList = Array.from(faqs.values()).map((faq, i) => 
                `${i}. ${faq.question}`
            ).join('\n');

            const prompt = `You are a FAQ matcher for ${firmName}. Find the BEST matching FAQ for this query.
            
Query: "${query}"

Available FAQs:
${faqList}

Return ONLY the number of the best matching FAQ (0-${faqs.size-1}). If no FAQ matches well, return -1.
Consider semantic meaning, not just keywords. For example "cuanto vale" matches "precio" FAQs.`;

            const response = await this.client.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0,
                max_tokens: 10
            });

            const faqIndex = parseInt(response.choices[0].message.content.trim());
            
            if (faqIndex >= 0 && faqIndex < faqs.size) {
                const faqArray = Array.from(faqs.values());
                return {
                    found: true,
                    faq: faqArray[faqIndex],
                    confidence: 0.95
                };
            }
            
            return { found: false };
        } catch (error) {
            console.error('OpenAI error:', error.message);
            return { found: false }; // Fallback to basic matching
        }
    }
}

module.exports = OpenAIMatcher;