const { createClient } = require('@supabase/supabase-js');
const winston = require('winston');

class AlphaService {
    constructor() {
        // Alpha-specific firm ID from Supabase
        this.ALPHA_FIRM_ID = '2ff70297-718d-42b0-ba70-cde70d5627b5';
        this.ALPHA_FIRM_NAME = 'Alpha Futures';
        
        // Simple in-memory cache for FAQs
        this.faqsCache = new Map();
        this.isInitialized = false;
        
        // Logger for debugging
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(({ timestamp, level, message }) => {
                    return `[AlphaService] ${timestamp} ${level}: ${message}`;
                })
            ),
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({ filename: 'alpha-service.log' })
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
        
        this.logger.info('AlphaService constructor initialized');
    }
    
    /**
     * Initialize the service by loading FAQs from Supabase
     */
    async initialize() {
        try {
            this.logger.info('Initializing AlphaService...');
            
            // Query ONLY Alpha FAQs from Supabase
            const { data: faqs, error } = await this.supabase
                .from('faqs')
                .select('*')
                .eq('firm_id', this.ALPHA_FIRM_ID);
                
            if (error) {
                throw new Error(`Failed to load Alpha FAQs: ${error.message}`);
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
            this.logger.info(`AlphaService loaded ${faqs.length} FAQs successfully`);
            
            return {
                success: true,
                faqsLoaded: faqs.length,
                firmId: this.ALPHA_FIRM_ID
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
                throw new Error('AlphaService not initialized. Call initialize() first.');
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
                    firmName: this.ALPHA_FIRM_NAME,
                    question: bestMatch.question,
                    response: validatedResponse
                };
            }
            
            // No FAQ match found - return default Alpha response
            const defaultResponse = `Para información específica sobre ${this.ALPHA_FIRM_NAME}, visita alpha-futures.com para conocer más sobre nuestros planes de trading.`;
            
            this.logger.info('No FAQ match found. Returning default response.');
            return {
                success: true,
                source: 'default',
                firmName: this.ALPHA_FIRM_NAME,
                response: defaultResponse
            };
            
        } catch (error) {
            this.logger.error(`Query processing failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
                firmName: this.ALPHA_FIRM_NAME
            };
        }
    }
    
    /**
     * Find FAQ matches for a given query
     */
    findFAQMatches(query) {
        console.log('Query:', query);
        console.log('FAQs in cache:', this.faqsCache.size);
        console.log('First 3 FAQ questions:', Array.from(this.faqsCache.values()).slice(0,3).map(f => f.question));
        
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(' ');
        const matches = [];
        
        for (const [id, faq] of this.faqsCache) {
            const queryNorm = this.normalizeText(query);
            const questionNorm = this.normalizeText(faq.question);
            
            let score = 0;
            
            // Debug: Log each FAQ being checked
            if (questionNorm.includes('cuesta') || questionNorm.includes('precio') || questionNorm.includes('costo')) {
                console.log(`Checking price FAQ: "${faq.question}"`);
                console.log(`Query normalized: "${queryNorm}"`);
                console.log(`Question normalized: "${questionNorm}"`);
            }
            
            // Priority scoring: exact query match gets highest score
            if (questionNorm.includes(queryNorm)) {
                score = 1.0;
                console.log(`Exact match found! Score: ${score}`);
            }
            // Improved matching: check if ANY important word matches (not ALL)
            else {
                const importantWords = queryNorm.split(' ').filter(w => w.length > 3);
                const wordMatches = importantWords.filter(word => questionNorm.includes(word));
                if (wordMatches.length > 0) {
                    score = wordMatches.length / importantWords.length;
                    console.log(`Word matches: ${wordMatches.join(', ')} - Score: ${score}`);
                }
                // Fallback to similarity calculation if no important words match
                if (score === 0) {
                    score = this.calculateSimilarity(queryNorm, questionNorm);
                    if (score > 0.1) {
                        console.log(`Similarity score: ${score} for "${faq.question}"`);
                    }
                }
            }
            
            // Only include matches above threshold
            if (score > 0.2) {
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
     * Normalize text for better Spanish matching
     */
    normalizeText(text) {
        return text.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[¿?¡!.,]/g, '') // Remove punctuation
            .trim();
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
     * CRITICAL: Ensure no other firm names appear in Alpha responses
     */
    validateResponse(response) {
        const otherFirms = [
            'apex', 'bulenox', 'takeprofit', 'vision', 'tradeify', 'myfunded',
            'apex trader funding', 'take profit', 'vision trade', 'tradeify funding', 'my funded futures'
        ];
        
        const responseLower = response.toLowerCase();
        
        // Check for contamination
        for (const firm of otherFirms) {
            if (responseLower.includes(firm)) {
                this.logger.error(`Cross-contamination detected! Found "${firm}" in Alpha response.`);
                throw new Error(`Cross-contamination detected: "${firm}" mentioned in Alpha response`);
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
            service: 'AlphaService',
            firmId: this.ALPHA_FIRM_ID,
            firmName: this.ALPHA_FIRM_NAME,
            isInitialized: this.isInitialized,
            faqsLoaded: this.faqsCache.size,
            uptime: process.uptime()
        };
    }
}

module.exports = AlphaService;