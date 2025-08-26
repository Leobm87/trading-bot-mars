const { createClient } = require('@supabase/supabase-js');
const winston = require('winston');
const OpenAIMatcher = require('../../ai/openai-matcher');

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
        
        this.aiMatcher = process.env.OPENAI_API_KEY ? new OpenAIMatcher() : null;
        
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
            
            // Try AI matching first if available
            if (this.aiMatcher) {
                const aiResult = await this.aiMatcher.findBestFAQ(query, this.faqsCache, this.TRADEIFY_FIRM_NAME);
                if (aiResult.found) {
                    this.logger.info(`AI matched FAQ with confidence ${aiResult.confidence}`);
                    return {
                        success: true,
                        source: 'ai-faq',
                        firmName: this.TRADEIFY_FIRM_NAME,
                        question: aiResult.faq.question,
                        response: aiResult.faq.answer
                    };
                }
            }
            
            // Fall back to keyword matching
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
        const queryLower = this.normalizeText(query.toLowerCase());
        const matches = [];
        
        // CRITICAL FIX: If query contains priority word, filter FAQs to only those containing it
        const criticalWords = ['precio', 'costo', 'cuanto', 'drawdown', 'evaluacion', 'dias', 'minimo', 'requisito'];
        let queryHasCritical = criticalWords.some(word => queryLower.includes(word));
        
        if (queryHasCritical) {
            // Only consider FAQs that contain at least one critical word
            for (const [id, faq] of this.faqsCache) {
                const questionLower = this.normalizeText(faq.question.toLowerCase());
                const answerLower = this.normalizeText(faq.answer.toLowerCase());
                
                // Check if FAQ contains any critical word from query
                const hasCriticalMatch = criticalWords.some(word => 
                    queryLower.includes(word) && (questionLower.includes(word) || answerLower.includes(word))
                );
                
                if (hasCriticalMatch) {
                    matches.push({
                        id,
                        question: faq.question,
                        answer: faq.answer,
                        slug: faq.slug,
                        similarity: 1.0  // Force high score for critical matches
                    });
                }
            }
        } else {
            // Original matching logic for non-critical queries
            const queryWords = queryLower.split(' ');
            
            for (const [id, faq] of this.faqsCache) {
                const queryNorm = this.normalizeText(query);
                const questionNorm = this.normalizeText(faq.question);
                const questionLower = faq.question.toLowerCase();
                
                let similarity = 0;
                
                // Check for exact phrase matches first
                if (questionLower.includes(queryLower)) {
                    similarity += 1.0;
                }
                
                // Priority scoring: exact query match gets highest score
                if (questionNorm.includes(queryNorm)) {
                    similarity = 1.0;
                }
                // Improved matching: check if ANY important word matches (not ALL)
                else {
                    const importantWords = queryNorm.split(' ').filter(w => w.length > 3);
                    const wordMatches = importantWords.filter(word => questionNorm.includes(word));
                    if (wordMatches.length > 0) {
                        similarity = wordMatches.length / importantWords.length;
                    }
                    // Fallback to similarity calculation if no important words match
                    if (similarity === 0) {
                        similarity = this.calculateSimilarity(queryNorm, questionNorm);
                    }
                }
                
                // Priority keywords get higher scores
                const priorityWords = ['precio', 'costo', 'cuanto', 'drawdown', 'evaluacion', 'dias', 'minimo', 'requisito', 'cuenta', 'plan'];
                let priorityScore = 0;
                queryWords.forEach(word => {
                    if (priorityWords.includes(word) && questionLower.includes(word)) {
                        priorityScore += 0.5;
                    }
                });
                
                // Update similarity calculation to include priority
                similarity = similarity + priorityScore;
                
                // Only include matches above threshold
                if (similarity > 0.2) {
                    matches.push({
                        id,
                        question: faq.question,
                        answer: faq.answer,
                        slug: faq.slug,
                        score: similarity,
                        similarity: similarity
                    });
                }
            }
        }
        
        // DEBUG: Log top 3 matches for analysis
        if (matches.length > 0) {
            console.log(`[${this.TRADEIFY_FIRM_NAME}] Query: "${query}"`);
            console.log('Top 3 matches:');
            matches.slice(0, 3).forEach((match, i) => {
                console.log(`${i+1}. Score: ${match.similarity.toFixed(2)} - ${match.question.substring(0, 60)}...`);
            });
        }
        
        // Sort by score (highest first)
        matches.sort((a, b) => b.similarity - a.similarity);
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