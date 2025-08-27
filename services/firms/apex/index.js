const { createClient } = require('@supabase/supabase-js');
const winston = require('winston');
const OpenAIMatcher = require('../../ai/openai-matcher');

class ApexService {
    constructor() {
        // Apex-specific firm ID from Supabase
        this.APEX_FIRM_ID = '854bf730-8420-4297-86f8-3c4a972edcf2';
        this.APEX_FIRM_NAME = 'Apex Trader Funding';
        
        // Simple in-memory cache for FAQs
        this.faqsCache = new Map();
        this.plansCache = new Map();
        this.firmInfo = null;
        this.lastUpdated = null;
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
            
            // Query ONLY Apex account_plans from Supabase
            const { data: plans, error: plansError } = await this.supabase
                .from('account_plans')
                .select('*')
                .eq('firm_id', this.APEX_FIRM_ID);
                
            if (plansError) {
                throw new Error(`Failed to load Apex account_plans: ${plansError.message}`);
            }
            
            // Load account_plans into memory cache
            this.plansCache.clear();
            plans.forEach(plan => {
                this.plansCache.set(plan.id, {
                    name: plan.name,
                    price: plan.price,
                    account_size: plan.account_size,
                    profit_target: plan.profit_target,
                    max_daily_loss: plan.max_daily_loss,
                    max_total_drawdown: plan.max_total_drawdown,
                    description: plan.description
                });
            });
            
            // Set last updated timestamp
            this.lastUpdated = new Date().toISOString();
            
            // Query ONLY Apex prop_firms data from Supabase
            const { data: firmData, error: firmError } = await this.supabase
                .from('prop_firms')
                .select('*')
                .eq('id', this.APEX_FIRM_ID)
                .single();
                
            if (firmError) {
                throw new Error(`Failed to load Apex prop_firms data: ${firmError.message}`);
            }
            
            // Populate firmInfo object with prop_firms data
            this.firmInfo = {
                name: firmData.name,
                website: firmData.website,
                discount_code: firmData.discount_code,
                description: firmData.description,
                features: firmData.features
            };
            
            this.isInitialized = true;
            this.logger.info(`ApexService loaded ${faqs.length} FAQs, ${plans.length} plans, and firm info successfully - ${this.firmInfo ? 'LOADED' : 'NOT_LOADED'}`);
            
            return {
                success: true,
                faqsLoaded: faqs.length,
                plansLoaded: plans.length,
                firmInfoLoaded: this.firmInfo ? true : false,
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
            
            // Classify query type
            const classification = this.classifyQuery(query);
            this.logger.info(`Query classification: ${JSON.stringify(classification)}`);
            
            // Debug: Log classification details
            console.log('=== APEX DEBUG: Classification Details ===');
            console.log('Query:', query);
            console.log('Classification JSON:', JSON.stringify(classification, null, 2));
            console.log('Pricing boolean:', classification.pricing);
            console.log('Account boolean:', classification.account);
            console.log('Info boolean:', classification.info);
            
            // Debug: Log before pricing condition
            console.log('=== APEX DEBUG: Before Pricing Check ===');
            console.log('About to check if classification.pricing is true');
            console.log('classification.pricing value:', classification.pricing);
            
            // Route to appropriate handler based on classification
            if (classification.pricing) {
                console.log('=== APEX DEBUG: Inside Pricing Condition ===');
                console.log('Pricing condition met, handling pricing query');
                const pricingResponse = this.handlePricingQuery();
                console.log('=== APEX DEBUG: After handlePricingQuery Call ===');
                console.log('handlePricingQuery returned successfully');
                return {
                    success: true,
                    source: 'pricing',
                    firmName: this.APEX_FIRM_NAME,
                    response: pricingResponse
                };
            }
            
            if (classification.account) {
                return {
                    success: true,
                    source: 'account',
                    firmName: this.APEX_FIRM_NAME,
                    response: this.handleAccountQuery()
                };
            }
            
            if (classification.info) {
                return {
                    success: true,
                    source: 'info',
                    firmName: this.APEX_FIRM_NAME,
                    response: this.handleFirmInfoQuery()
                };
            }
            
            // Debug: Check for price-related FAQs
            const priceFAQs = Array.from(this.faqsCache.values()).filter(f => 
                f.question.toLowerCase().includes('precio') || 
                f.question.toLowerCase().includes('costo') ||
                f.question.toLowerCase().includes('cuenta'));
            console.log('Price-related FAQs found:', priceFAQs.length);
            
            // Try AI matching first if available
            if (this.aiMatcher) {
                const aiResult = await this.aiMatcher.findBestFAQ(query, this.faqsCache, this.APEX_FIRM_NAME);
                if (aiResult.found) {
                    this.logger.info(`AI matched FAQ with confidence ${aiResult.confidence}`);
                    return {
                        success: true,
                        source: 'ai-faq',
                        firmName: this.APEX_FIRM_NAME,
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
                    firmName: this.APEX_FIRM_NAME,
                    question: bestMatch.question,
                    response: validatedResponse
                };
            }
            
            // No FAQ match found - return default Apex response
            const defaultResponse = `Para información específica sobre ${this.APEX_FIRM_NAME}, te recomendamos visitar apex.com con nuestro código de descuento para obtener las mejores tarifas.`;
            
            // Log unmatched query for analytics
            const fs = require('fs').promises;
            const logEntry = `${new Date().toISOString()}|${this.APEX_FIRM_NAME}|${query}|NO_MATCH\n`;
            fs.appendFile('logs/failed_matches.log', logEntry).catch(() => {});
            
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
            console.log(`[${this.APEX_FIRM_NAME}] Query: "${query}"`);
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
     * Classify query type based on content
     */
    classifyQuery(query) {
        const queryLower = this.normalizeText(query.toLowerCase());
        
        // Pricing terms
        const pricingTerms = ['precio', 'costo', 'price', 'cuanto'];
        const hasPricingTerms = pricingTerms.some(term => queryLower.includes(term));
        
        // Account terms
        const accountTerms = ['cuenta', 'size'];
        const hasAccountTerms = accountTerms.some(term => queryLower.includes(term));
        
        // Info terms
        const infoTerms = ['website', 'discount'];
        const hasInfoTerms = infoTerms.some(term => queryLower.includes(term));
        
        return {
            pricing: hasPricingTerms,
            account: hasAccountTerms,
            info: hasInfoTerms,
            classification: hasPricingTerms ? 'pricing' : 
                          hasAccountTerms ? 'account' : 
                          hasInfoTerms ? 'info' : 'general'
        };
    }
    
    /**
     * Handle pricing query using account_plans data
     */
    handlePricingQuery() {
        if (this.plansCache.size === 0) {
            return 'No hay información de precios disponible en este momento.';
        }
        
        let response = `💰 **Precios de cuentas ${this.APEX_FIRM_NAME}:**\n\n`;
        
        // Sort plans by account size
        const sortedPlans = Array.from(this.plansCache.values())
            .sort((a, b) => a.account_size - b.account_size);
        
        sortedPlans.forEach(plan => {
            response += `📊 **${plan.name}**\n`;
            response += `• Tamaño de cuenta: $${plan.account_size?.toLocaleString() || 'N/A'}\n`;
            response += `• Precio: $${plan.price || 'N/A'}\n`;
            if (plan.profit_target) {
                response += `• Meta de ganancia: $${plan.profit_target.toLocaleString()}\n`;
            }
            if (plan.max_daily_loss) {
                response += `• Pérdida diaria máx: $${plan.max_daily_loss.toLocaleString()}\n`;
            }
            if (plan.max_total_drawdown) {
                response += `• Drawdown máximo: $${plan.max_total_drawdown.toLocaleString()}\n`;
            }
            response += '\n';
        });
        
        // Include discount code if available
        if (this.firmInfo && this.firmInfo.discount_code) {
            response += `🎯 **Código de descuento:** ${this.firmInfo.discount_code}\n`;
        }
        
        if (this.firmInfo && this.firmInfo.website) {
            response += `🌐 **Más información:** ${this.firmInfo.website}`;
        }
        
        // Debug: Log response before returning (first 500 chars)
        console.log('=== APEX DEBUG: Pricing Handler Response ===');
        console.log('Response (first 500 chars):', response.substring(0, 500));
        
        return response;
    }
    
    /**
     * Handle account query using account_plans data
     */
    handleAccountQuery() {
        if (this.plansCache.size === 0) {
            return 'No hay información de cuentas disponible en este momento.';
        }
        
        let response = `📊 **Tamaños de cuenta disponibles en ${this.APEX_FIRM_NAME}:**\n\n`;
        
        // Sort plans by account size
        const sortedPlans = Array.from(this.plansCache.values())
            .sort((a, b) => a.account_size - b.account_size);
        
        sortedPlans.forEach(plan => {
            response += `💰 **$${plan.account_size?.toLocaleString() || 'N/A'}** - ${plan.name}\n`;
            if (plan.description) {
                response += `   ${plan.description}\n`;
            }
            response += '\n';
        });
        
        if (this.firmInfo && this.firmInfo.website) {
            response += `🌐 **Más detalles:** ${this.firmInfo.website}`;
        }
        
        return response;
    }
    
    /**
     * Handle firm info query using prop_firms data
     */
    handleFirmInfoQuery() {
        if (!this.firmInfo) {
            return `No hay información específica sobre ${this.APEX_FIRM_NAME} disponible en este momento.`;
        }
        
        let response = `ℹ️ **${this.firmInfo.name}**\n\n`;
        
        if (this.firmInfo.description) {
            response += `📝 **Descripción:** ${this.firmInfo.description}\n\n`;
        }
        
        if (this.firmInfo.website) {
            response += `🌐 **Sitio web:** ${this.firmInfo.website}\n`;
        }
        
        if (this.firmInfo.discount_code) {
            response += `🎯 **Código de descuento:** ${this.firmInfo.discount_code}\n`;
        }
        
        if (this.firmInfo.features) {
            response += `\n🚀 **Características:**\n${this.firmInfo.features}`;
        }
        
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