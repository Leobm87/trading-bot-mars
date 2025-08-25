const { createClient } = require('@supabase/supabase-js');
const winston = require('winston');

class ApexService {
    constructor() {
        // Apex-specific firm ID from Supabase
        this.APEX_FIRM_ID = '854bf730-8420-4297-86f8-3c4a972edcf2';
        this.APEX_FIRM_NAME = 'Apex Trader Funding';
        
        // Simple in-memory cache for FAQs
        this.faqsCache = new Map();
        this.isInitialized = false;
        
        // Logger for debugging
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(({ timestamp, level, message }) => {
                    return `[ApexService] ${timestamp} ${level}: ${message}`;
                })
            ),
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({ filename: 'apex-service.log' })
            ]
        });
        
        // Supabase client
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );
        
        this.logger.info('ApexService constructor initialized');
    }
    
    /**
     * Initialize the service by loading FAQs from Supabase
     */
    async initialize() {
        try {
            this.logger.info('Initializing ApexService...');
            
            // Query ONLY Apex FAQs from Supabase
            const { data: faqs, error } = await this.supabase
                .from('faqs')
                .select('*')
                .eq('firm_id', this.APEX_FIRM_ID);
                
            if (error) {
                throw new Error(`Failed to load Apex FAQs: ${error.message}`);
            }
            
            // Load FAQs into memory cache
            this.faqsCache.clear();
            faqs.forEach(faq => {
                this.faqsCache.set(faq.id, {
                    question: faq.question,
                    answer: faq.answer_md,
                    slug: faq.slug,
                    category: faq.category
                });
            });
            
            this.isInitialized = true;
            this.logger.info(`ApexService loaded ${faqs.length} FAQs successfully`);
            
            return {
                success: true,
                faqsLoaded: faqs.length,
                firmId: this.APEX_FIRM_ID
            };
            
        } catch (error) {
            this.logger.error(`Initialization failed: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Process a user query and return Apex-specific response
     */
    async processQuery(query) {
        try {
            if (!this.isInitialized) {
                throw new Error('ApexService not initialized. Call initialize() first.');
            }
            
            this.logger.info(`Processing query: "${query}"`);
            
            // Search for exact matches in cached FAQs
            const matches = this.findFAQMatches(query);
            
            if (matches.length > 0) {
                const bestMatch = matches[0];
                const response = bestMatch.answer;
                
                // Validate response before returning
                const validatedResponse = this.validateResponse(response);
                
                this.logger.info(`Found match for query. Returning validated response.`);
                return {
                    success: true,
                    source: 'faq',
                    firmName: this.APEX_FIRM_NAME,
                    question: bestMatch.question,
                    response: validatedResponse
                };
            }
            
            // No FAQ match found - return default Apex response
            const defaultResponse = `Para información específica sobre ${this.APEX_FIRM_NAME}, te recomendamos visitar apex.com con nuestro código de descuento para obtener las mejores tarifas.`;
            
            this.logger.info('No FAQ match found. Returning default response.');
            return {
                success: true,
                source: 'default',
                firmName: this.APEX_FIRM_NAME,
                response: defaultResponse
            };
            
        } catch (error) {
            this.logger.error(`Query processing failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
                firmName: this.APEX_FIRM_NAME
            };
        }
    }
    
    /**
     * Find FAQ matches for a given query
     */
    findFAQMatches(query) {
        const queryLower = query.toLowerCase();
        const matches = [];
        
        for (const [id, faq] of this.faqsCache) {
            const questionLower = faq.question.toLowerCase();
            const answerLower = faq.answer.toLowerCase();
            
            // Split query into keywords for better matching
            const queryWords = queryLower.split(' ');
            const questionWords = questionLower.split(' ');
            
            // Check if each query word appears in the question or answer
            const keywordMatches = queryWords.filter(word => 
                word.length > 2 && (questionLower.includes(word) || answerLower.includes(word))
            ).length;
            
            const hasKeywordMatch = keywordMatches > 0 || questionLower.includes(queryLower) || answerLower.includes(queryLower);
            const similarity = this.calculateSimilarity(queryLower, questionLower);
            
            if (hasKeywordMatch || similarity > 0.3) {
                
                matches.push({
                    id,
                    question: faq.question,
                    answer: faq.answer,
                    slug: faq.slug,
                    similarity: similarity
                });
            }
        }
        
        // Sort by similarity (highest first)
        matches.sort((a, b) => b.similarity - a.similarity);
        return matches;
    }
    
    /**
     * Simple similarity calculation
     */
    calculateSimilarity(str1, str2) {
        const words1 = str1.split(' ');
        const words2 = str2.split(' ');
        
        let matches = 0;
        words1.forEach(word => {
            if (words2.includes(word) && word.length > 2) {
                matches++;
            }
        });
        
        return matches / Math.max(words1.length, words2.length);
    }
    
    /**
     * Validate response for cross-contamination
     * CRITICAL: Ensure no other firm names appear in Apex responses
     */
    validateResponse(response) {
        const otherFirms = [
            'bulenox', 'takeprofit', 'vision', 'tradeify', 'alpha', 'myfunded',
            'take profit', 'vision trade', 'my funded futures', 'alpha futures'
        ];
        
        const responseLower = response.toLowerCase();
        
        // Check for contamination
        for (const firm of otherFirms) {
            if (responseLower.includes(firm)) {
                this.logger.error(`Cross-contamination detected! Found "${firm}" in Apex response.`);
                throw new Error(`Cross-contamination detected: "${firm}" mentioned in Apex response`);
            }
        }
        
        // Response is clean
        return response;
    }
    
    /**
     * Get service health information
     */
    getHealth() {
        return {
            service: 'ApexService',
            firmId: this.APEX_FIRM_ID,
            firmName: this.APEX_FIRM_NAME,
            isInitialized: this.isInitialized,
            faqsLoaded: this.faqsCache.size,
            uptime: process.uptime()
        };
    }
}

module.exports = ApexService;