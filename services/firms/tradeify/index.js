const { createClient } = require('@supabase/supabase-js');
const winston = require('winston');

class TradeifyService {
    constructor() {
        // Tradeify-specific firm ID from Supabase
        this.TRADEIFY_FIRM_ID = '1a95b01e-4eef-48e2-bd05-6e2f79ca57a8';
        this.TRADEIFY_FIRM_NAME = 'Tradeify';
        
        // Simple in-memory cache for FAQs
        this.faqsCache = new Map();
        this.isInitialized = false;
        
        // Logger for debugging
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(({ timestamp, level, message }) => {
                    return `[TradeifyService] ${timestamp} ${level}: ${message}`;
                })
            ),
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({ filename: 'tradeify-service.log' })
            ]
        });
        
        // Add validation before creating client
        if (!process.env.SUPABASE_URL) {
            console.error('SUPABASE_URL not set!');
            console.log('Available env vars:', Object.keys(process.env));
            process.exit(1);
        }
        
        // Supabase client
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );
        
        this.logger.info('TradeifyService constructor initialized');
    }
    
    /**
     * Initialize the service by loading FAQs from Supabase
     */
    async initialize() {
        try {
            this.logger.info('Initializing TradeifyService...');
            
            // Query ONLY Tradeify FAQs from Supabase
            const { data: faqs, error } = await this.supabase
                .from('faqs')
                .select('*')
                .eq('firm_id', this.TRADEIFY_FIRM_ID);
                
            if (error) {
                throw new Error(`Failed to load Tradeify FAQs: ${error.message}`);
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
            this.logger.info(`TradeifyService loaded ${faqs.length} FAQs successfully`);
            
            return {
                success: true,
                faqsLoaded: faqs.length,
                firmId: this.TRADEIFY_FIRM_ID
            };
            
        } catch (error) {
            this.logger.error(`Initialization failed: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Process a user query and return Alpha-specific response
     */
    async processQuery(query) {
        try {
            if (!this.isInitialized) {
                throw new Error('TradeifyService not initialized. Call initialize() first.');
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
                    firmName: this.TRADEIFY_FIRM_NAME,
                    question: bestMatch.question,
                    response: validatedResponse
                };
            }
            
            // No FAQ match found - return default Tradeify response
            const defaultResponse = `Para información específica sobre ${this.TRADEIFY_FIRM_NAME}, visita tradeify.com para conocer más sobre nuestros planes de trading.`;
            
            this.logger.info('No FAQ match found. Returning default response.');
            return {
                success: true,
                source: 'default',
                firmName: this.TRADEIFY_FIRM_NAME,
                response: defaultResponse
            };
            
        } catch (error) {
            this.logger.error(`Query processing failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
                firmName: this.TRADEIFY_FIRM_NAME
            };
        }
    }
    
    /**
     * Find FAQ matches for a given query
     */
    findFAQMatches(query) {
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(' ');
        const matches = [];
        
        for (const [id, faq] of this.faqsCache) {
            const questionLower = faq.question.toLowerCase();
            const answerLower = faq.answer.toLowerCase();
            
            let score = 0;
            
            // Priority scoring: exact query match gets highest score
            if (questionLower.includes(queryLower)) {
                score = 1.0;
            }
            // Second priority: all query words present in question
            else if (queryWords.every(w => questionLower.includes(w))) {
                score = 0.8;
            }
            // Fallback to similarity calculation
            else {
                score = this.calculateSimilarity(queryLower, questionLower);
            }
            
            // Only include matches above threshold
            if (score > 0.4) {
                matches.push({
                    id,
                    question: faq.question,
                    answer: faq.answer,
                    slug: faq.slug,
                    score: score,
                    similarity: score
                });
            }
        }
        
        // Sort by score (highest first)
        matches.sort((a, b) => b.score - a.score);
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
     * CRITICAL: Ensure no other firm names appear in Tradeify responses
     */
    validateResponse(response) {
        const otherFirms = [
            'apex', 'bulenox', 'takeprofit', 'vision', 'alpha', 'myfunded',
            'apex trader funding', 'take profit', 'vision trade', 'alpha futures', 'my funded futures'
        ];
        
        const responseLower = response.toLowerCase();
        
        // Check for contamination
        for (const firm of otherFirms) {
            if (responseLower.includes(firm)) {
                this.logger.error(`Cross-contamination detected! Found "${firm}" in Tradeify response.`);
                throw new Error(`Cross-contamination detected: "${firm}" mentioned in Tradeify response`);
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
            service: 'TradeifyService',
            firmId: this.TRADEIFY_FIRM_ID,
            firmName: this.TRADEIFY_FIRM_NAME,
            isInitialized: this.isInitialized,
            faqsLoaded: this.faqsCache.size,
            uptime: process.uptime()
        };
    }
}

module.exports = TradeifyService;