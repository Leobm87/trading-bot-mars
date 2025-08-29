import { createClient } from '@supabase/supabase-js';
import winston from 'winston';
import OpenAIMatcher from '../../ai/openai-matcher.js';

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
            
            // Warmup the retriever RPC
            await this.supabase.rpc('faq_retrieve_es', { q: 'warmup', cats: null, k: 1 }).catch(()=>{});
            
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
     * Extract relevant part of FAQ answer based on query context
     */
    extractRelevantAnswer(query, fullAnswer) {
        const queryLower = query.toLowerCase();
        
        // Keywords to section mapping
        const sectionKeywords = {
            'consistencia|consistency|30%': /•.*regla.*consistencia.*30%.*?\n/i,
            'drawdown|trailing': /\*\*.*Drawdown.*?\n\n/s,
            'overnight|swing': /❌.*overnight.*?\n/i,
            'umbral|threshold|safety': /•.*Safety Net.*?\n/i,
            'activar|activation|mensual': /\*\*.*Suscripción.*?\$85.*?\n\n/s,
            'reset|resetear': /\$80.*?\n/
        };
        
        // Find matching section
        for (const [keywords, regex] of Object.entries(sectionKeywords)) {
            if (new RegExp(keywords).test(queryLower)) {
                const match = fullAnswer.match(regex);
                if (match) {
                    return match[0].trim();
                }
            }
        }
        
        // If no specific section, return first paragraph only
        const firstParagraph = fullAnswer.split('\n\n')[0];
        return firstParagraph;
    }

    /**
     * Process a user query and return Apex-specific response
     */
    async processQuery(query) {
        const { resolvePin } = await import('../../common/pinner.cjs');
        const { gateIntent } = await import('../../common/intent-gate.cjs');
        const { retrieveTopK, confidentTop1 } = await import('../../common/retriever.cjs');
        const { llmSelectFAQ } = await import('../../common/llm-selector.cjs');
        const { formatFromFAQ, notFound } = await import('../../common/format.cjs');
        const { embedText } = await import('../../common/embeddings.cjs');

        const firmId = '854bf730-8420-4297-86f8-3c4a972edcf2';
        
        // 0) Pinner determinista
        const pinId = resolvePin('apex', query);
        if (pinId) {
            // devolver objeto equivalente a top-1 lexical para que el renderer use DB
            return await formatFromFAQ({ id: pinId, score: 1.0, rank: 1 });
        }

        const cats = gateIntent(query);
        const supa = this.supabase;
        if (!supa) return notFound();

        const cands = await retrieveTopK(supa, query, cats, firmId, embedText);
        if (!cands || cands.length === 0) return notFound();

        // Early-accept check for confident top1 based on lexical score
        const accepted = confidentTop1(Array.isArray(cands) ? cands : []);
        if (accepted) {
            return await formatFromFAQ(accepted);
        }

        const pick = await llmSelectFAQ(query, cands);
        if (pick && pick.type === 'FAQ_ID') {
            const hit = cands.find(c => c.id === pick.id);
            if (hit) return await formatFromFAQ(hit);
        }
        return notFound();
    }
    
    /**
     * Find FAQ matches for a given query
     */
    findFAQMatches(query) {
        const queryLower = query.toLowerCase();
        const matches = [];
        
        // Critical synonyms for production issues
        const expansions = {
            'activar': 'activacion mensual suscripcion mensualidad despues pasar financiada funded pa cuenta activation fee costo mantener',
            'umbral': 'threshold safety net minimo retiro withdrawal minimum retirar payout profit objetivo meta ganancia',
            'reglas': 'rules normas requisitos restricciones fase financiada funded pa cuenta real regulaciones condiciones',
            'fase': 'phase etapa step nivel financiada funded pa cuenta real live',
            'financiada': 'funded pa cuenta real live phase fase etapa',
            'consistencia': 'consistency regla 30 treinta porciento porcentaje'
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
            
            let similarity = matchCount / expandedWords.length;
            
            // Penalize if query has specific keywords not in FAQ
            const criticalWords = ['pago', 'umbral', 'financiada', 'reset'];
            for (const word of criticalWords) {
                if (queryWords.includes(word) && !questionLower.includes(word) && !answerLower.includes(word)) {
                    similarity = similarity * 0.5; // Reduce score by half
                }
            }
            
            if (similarity > 0.4) { // Higher threshold to prevent false positives
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

export default ApexService;