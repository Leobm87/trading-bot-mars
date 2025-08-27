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
        
        this.aiMatcher = null; // Temporarily disabled
        
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
                this.plansCache.set(`${plan.id}_${plan.phase}`, {
                    display_name: plan.display_name,
                    price_monthly: plan.price_monthly,
                    phase: plan.phase,
                    profit_target: plan.profit_target,
                    drawdown_max: plan.drawdown_max,
                    account_size: plan.account_size
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
                support_url: firmData.support_url
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
            
            // PRIORITY 1: Try AI matching first if available
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
            
            // PRIORITY 2: Try keyword FAQ matching
            const matches = this.findFAQMatches(query);
            
            if (matches.length > 0) {
                const bestMatch = matches[0];
                const response = bestMatch.answer;
                
                // Validate response before returning
                const validatedResponse = this.validateResponse(response);
                
                this.logger.info(`Found FAQ match for query. Returning validated response.`);
                return {
                    success: true,
                    source: 'faq',
                    firmName: this.APEX_FIRM_NAME,
                    question: bestMatch.question,
                    response: validatedResponse
                };
            }
            
            // PRIORITY 3: Check for classification-based queries (if no FAQ match found)
            const classification = this.classifyQuery(query);
            
            if (classification.pricing) {
                const pricingResponse = this.handlePricingQuery();
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
            
            // No FAQ match found - return default Apex response
            const defaultResponse = `Para información específica sobre ${this.APEX_FIRM_NAME}, te recomendamos visitar nuestro sitio web para obtener las mejores tarifas.`;
            
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
        const queryLower = query.toLowerCase();
        const matches = [];
        
        // Critical synonyms for production issues
        const expansions = {
            'activar': 'activacion mensual suscripcion mensualidad despues pasar financiada',
            'precio': 'costo cuanto vale tarifa pagar',
            'umbral': 'threshold objetivo target profit ganancia',
            'reglas': 'normas requisitos condiciones restricciones',
            'fase': 'etapa step nivel phase',
            'financiada': 'funded pa cuenta real live'
        };
        
        // Expand query - only expand exact word matches
        const queryWords = queryLower.split(' ');
        let expandedQuery = queryLower;
        for (const [key, expansion] of Object.entries(expansions)) {
            if (queryWords.includes(key)) {
                expandedQuery += ' ' + expansion;
            }
        }
        
        for (const [id, faq] of this.faqsCache) {
            const questionLower = faq.question.toLowerCase();
            const answerLower = faq.answer.toLowerCase();
            
            // Check expanded terms
            const expandedWords = expandedQuery.split(' ');
            const matchCount = expandedWords.filter(word => 
                word.length > 2 && (questionLower.includes(word) || answerLower.includes(word))
            ).length;
            
            const similarity = matchCount / expandedWords.length;
            
            if (similarity > 0.5) {
                matches.push({
                    id,
                    question: faq.question,
                    answer: faq.answer,
                    slug: faq.slug,
                    similarity: similarity
                });
            }
        }
        
        matches.sort((a, b) => b.similarity - a.similarity);
        return matches.slice(0, 5); // Top 5 matches only
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
        const infoTerms = ['website', 'support'];
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
        
        // Filter and sort evaluation phase plans by account size
        const evaluationPlans = Array.from(this.plansCache.values())
            .filter(plan => plan.phase === 'evaluation')
            .sort((a, b) => a.account_size - b.account_size);
        
        evaluationPlans.forEach(plan => {
            response += `📊 **${plan.display_name}**\n`;
            response += `• Tamaño de cuenta: $${plan.account_size?.toLocaleString() || 'N/A'}\n`;
            response += `• Precio mensual: $${plan.price_monthly || 'N/A'}\n`;
            if (plan.profit_target) {
                response += `• Meta de ganancia: $${plan.profit_target.toLocaleString()}\n`;
            }
            if (plan.drawdown_max) {
                response += `• Drawdown máximo: $${plan.drawdown_max.toLocaleString()}\n`;
            }
            response += '\n';
        });
        
        
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
        
        // Filter and sort evaluation phase plans by account size
        const evaluationPlans = Array.from(this.plansCache.values())
            .filter(plan => plan.phase === 'evaluation')
            .sort((a, b) => a.account_size - b.account_size);
        
        evaluationPlans.forEach(plan => {
            response += `💰 **$${plan.account_size?.toLocaleString() || 'N/A'}** - ${plan.display_name}\n`;
            if (plan.profit_target) {
                response += `   Meta: $${plan.profit_target.toLocaleString()}\n`;
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
        
        
        if (this.firmInfo.support_url) {
            response += `🛠️ **Soporte:** ${this.firmInfo.support_url}\n`;
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