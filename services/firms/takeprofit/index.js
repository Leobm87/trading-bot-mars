const { createClient } = require('@supabase/supabase-js');
const winston = require('winston');

class TakeProfitService {
    constructor() {
        // TakeProfit-specific firm ID from Supabase
        this.TAKEPROFIT_FIRM_ID = '08a7b506-4836-486a-a6e9-df12059c55d3';
        this.TAKEPROFIT_FIRM_NAME = 'TakeProfit Trader';
        
        // Simple in-memory cache for FAQs
        this.faqsCache = new Map();
        this.isInitialized = false;
        
        // Logger for debugging
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(({ timestamp, level, message }) => {
                    return `[TakeProfitService] ${timestamp} ${level}: ${message}`;
                })
            ),
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({ filename: 'takeprofit-service.log' })
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
        
        this.logger.info('TakeProfitService constructor initialized');
    }
    
    /**
     * Initialize the service by loading FAQs from Supabase
     */
    async initialize() {
        try {
            this.logger.info('Initializing TakeProfitService...');
            
            // Query ONLY TakeProfit FAQs from Supabase
            const { data: faqs, error } = await this.supabase
                .from('faqs')
                .select('*')
                .eq('firm_id', this.TAKEPROFIT_FIRM_ID);
                
            if (error) {
                throw new Error(`Failed to load TakeProfit FAQs: ${error.message}`);
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
            this.logger.info(`TakeProfitService loaded ${faqs.length} FAQs successfully`);
            
            return {
                success: true,
                faqsLoaded: faqs.length,
                firmId: this.TAKEPROFIT_FIRM_ID
            };
            
        } catch (error) {
            this.logger.error(`Initialization failed: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Process a user query and return TakeProfit-specific response
     */
    async processQuery(query) {
        try {
            if (!this.isInitialized) {
                throw new Error('TakeProfitService not initialized. Call initialize() first.');
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
                    firmName: this.TAKEPROFIT_FIRM_NAME,
                    question: bestMatch.question,
                    response: validatedResponse
                };
            }
            
            // No FAQ match found - return default TakeProfit response
            const defaultResponse = `Para información específica sobre ${this.TAKEPROFIT_FIRM_NAME}, visita takeprofit.com con nuestro código de descuento.`;
            
            this.logger.info('No FAQ match found. Returning default response.');
            return {
                success: true,
                source: 'default',
                firmName: this.TAKEPROFIT_FIRM_NAME,
                response: defaultResponse
            };
            
        } catch (error) {
            this.logger.error(`Query processing failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
                firmName: this.TAKEPROFIT_FIRM_NAME
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
     * CRITICAL: Ensure no other firm names appear in TakeProfit responses
     */
    validateResponse(response) {
        const otherFirmFullNames = [
            'apex trader funding', 
            'bulenox', 
            'vision trade', 
            'my funded futures', 
            'alpha futures',
            'tradeify'
        ];
        
        const responseLower = response.toLowerCase();
        
        // Check for full firm name contamination (more specific)
        for (const firm of otherFirmFullNames) {
            if (responseLower.includes(firm)) {
                this.logger.error(`Cross-contamination detected! Found "${firm}" in TakeProfit response.`);
                throw new Error(`Cross-contamination detected: "${firm}" mentioned in TakeProfit response`);
            }
        }
        
        // Check for problematic patterns that indicate competitor mentions
        const problematicPatterns = [
            /\bapex\s+(trader|funding|firm)/i,
            /\bbulenox\s+(trader|trading|firm)/i,
            /\bvision\s+(trade|trading)/i,
            /\balpha\s+(futures|trading)/i,
            /\bmy\s+funded\s+futures/i,
            /\btradeify\s+(trader|trading)/i
        ];
        
        for (const pattern of problematicPatterns) {
            if (pattern.test(response)) {
                this.logger.error(`Cross-contamination pattern detected in TakeProfit response: ${pattern}`);
                throw new Error(`Cross-contamination pattern detected in TakeProfit response`);
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
            service: 'TakeProfitService',
            firmId: this.TAKEPROFIT_FIRM_ID,
            firmName: this.TAKEPROFIT_FIRM_NAME,
            isInitialized: this.isInitialized,
            faqsLoaded: this.faqsCache.size,
            uptime: process.uptime()
        };
    }
}

module.exports = TakeProfitService;