const axios = require('axios');
const winston = require('winston');
const FirmRouter = require('../router');
const ApexService = require('../firms/apex');
const BulenoxService = require('../firms/bulenox');

class TelegramGateway {
    constructor(options = {}) {
        // Configuration
        this.botToken = options.botToken || process.env.TELEGRAM_BOT_TOKEN;
        this.mockMode = options.mockMode || process.env.NODE_ENV === 'test';
        this.apexServiceUrl = options.apexServiceUrl || 'http://localhost:3010';
        
        // Initialize services
        this.router = new FirmRouter();
        this.apexService = new ApexService();
        this.bulenoxService = new BulenoxService();
        
        // Telegram API configuration
        this.telegramAPI = this.botToken ? 
            `https://api.telegram.org/bot${this.botToken}` : null;
        
        // Logger for debugging
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(({ timestamp, level, message }) => {
                    return `[TelegramGateway] ${timestamp} ${level}: ${message}`;
                })
            ),
            transports: [
                new winston.transports.Console()
            ]
        });
        
        // Message processing statistics
        this.stats = {
            totalMessages: 0,
            firmDetections: 0,
            apexQueries: 0,
            bulenoxQueries: 0,
            unknownQueries: 0,
            errors: 0
        };
        
        // Store mock responses for testing
        this.mockResponses = [];
        this.isInitialized = false;
        
        this.logger.info(`TelegramGateway initialized (mockMode: ${this.mockMode})`);
    }
    
    /**
     * Initialize the gateway service
     */
    async initialize() {
        try {
            this.logger.info('Initializing TelegramGateway...');
            
            // Initialize services
            await this.apexService.initialize();
            await this.bulenoxService.initialize();
            
            this.isInitialized = true;
            this.logger.info('TelegramGateway initialized successfully');
            
            return {
                success: true,
                mockMode: this.mockMode,
                apexServiceReady: this.apexService.isInitialized,
                bulenoxServiceReady: this.bulenoxService.isInitialized
            };
            
        } catch (error) {
            this.logger.error(`Initialization failed: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Process a message (main entry point)
     * @param {string} message - User message text
     * @param {string} chatId - Telegram chat ID (or mock user ID)
     * @returns {object} - Response object
     */
    async processMessage(message, chatId) {
        try {
            if (!this.isInitialized) {
                throw new Error('TelegramGateway not initialized. Call initialize() first.');
            }
            
            this.stats.totalMessages++;
            this.logger.info(`Processing message from chat ${chatId}: "${message}"`);
            
            // 1. Use Router to detect firm
            const detectedFirm = this.router.detectFirm(message, chatId.toString());
            
            if (detectedFirm) {
                this.stats.firmDetections++;
                this.logger.info(`Router detected firm: ${detectedFirm}`);
                
                // 2. Route to appropriate service
                if (detectedFirm === 'apex') {
                    return await this.handleApexQuery(message, chatId);
                } else if (detectedFirm === 'bulenox') {
                    return await this.handleBulenoxQuery(message, chatId);
                } else {
                    // Other firms not implemented yet
                    return await this.handleUnimplementedFirm(detectedFirm, chatId);
                }
            } else {
                // 3. No firm detected - ask for clarification
                this.stats.unknownQueries++;
                return await this.handleUnknownFirm(message, chatId);
            }
            
        } catch (error) {
            this.stats.errors++;
            this.logger.error(`Message processing failed: ${error.message}`);
            
            return {
                success: false,
                error: error.message,
                chatId,
                response: 'Error procesando tu mensaje. Por favor intenta de nuevo.'
            };
        }
    }
    
    /**
     * Handle Apex queries using ApexService
     */
    async handleApexQuery(message, chatId) {
        try {
            this.stats.apexQueries++;
            this.logger.info(`Processing Apex query: "${message}"`);
            
            // Call ApexService directly (since it's running locally)
            const apexResponse = await this.apexService.processQuery(message);
            
            if (apexResponse.success) {
                const formattedResponse = this.formatResponse(apexResponse);
                
                // Send response (mock or real)
                const sentResponse = await this.sendMessage(chatId, formattedResponse);
                
                return {
                    success: true,
                    firm: 'apex',
                    chatId,
                    source: apexResponse.source,
                    response: formattedResponse,
                    sent: sentResponse.success
                };
            } else {
                throw new Error(`ApexService error: ${apexResponse.error}`);
            }
            
        } catch (error) {
            this.logger.error(`Apex query failed: ${error.message}`);
            
            const errorResponse = `Lo siento, hubo un problema procesando tu consulta sobre Apex. ${error.message}`;
            await this.sendMessage(chatId, errorResponse);
            
            return {
                success: false,
                firm: 'apex',
                chatId,
                error: error.message,
                response: errorResponse
            };
        }
    }
    
    /**
     * Handle Bulenox queries using BulenoxService
     */
    async handleBulenoxQuery(message, chatId) {
        try {
            this.stats.bulenoxQueries++;
            this.logger.info(`Processing Bulenox query: "${message}"`);
            
            // Call BulenoxService directly (since it's running locally)
            const bulenoxResponse = await this.bulenoxService.processQuery(message);
            
            if (bulenoxResponse.success) {
                const formattedResponse = this.formatResponse(bulenoxResponse);
                
                // Send response (mock or real)
                const sentResponse = await this.sendMessage(chatId, formattedResponse);
                
                return {
                    success: true,
                    firm: 'bulenox',
                    chatId,
                    source: bulenoxResponse.source,
                    response: formattedResponse,
                    sent: sentResponse.success
                };
            } else {
                throw new Error(`BulenoxService error: ${bulenoxResponse.error}`);
            }
            
        } catch (error) {
            this.logger.error(`Bulenox query failed: ${error.message}`);
            
            const errorResponse = `Lo siento, hubo un problema procesando tu consulta sobre Bulenox. ${error.message}`;
            await this.sendMessage(chatId, errorResponse);
            
            return {
                success: false,
                firm: 'bulenox',
                chatId,
                error: error.message,
                response: errorResponse
            };
        }
    }
    
    /**
     * Handle queries for unimplemented firms
     */
    async handleUnimplementedFirm(firmName, chatId) {
        const firmDisplayNames = {
            'takeprofit': 'TakeProfit',
            'myfunded': 'MyFundedFutures',
            'alpha': 'Alpha Futures',
            'tradeify': 'Tradeify',
            'vision': 'Vision Trade'
        };
        
        const displayName = firmDisplayNames[firmName] || firmName;
        const response = `Detecté que preguntas sobre <b>${displayName}</b>. Esta función estará disponible pronto. Por ahora, puedo ayudarte con consultas sobre <b>Apex Trader Funding</b> y <b>Bulenox</b>.`;
        
        await this.sendMessage(chatId, response);
        
        return {
            success: true,
            firm: firmName,
            chatId,
            status: 'unimplemented',
            response
        };
    }
    
    /**
     * Handle queries when no firm is detected
     */
    async handleUnknownFirm(message, chatId) {
        const response = `¿Sobre qué firma necesitas información?
        
<b>Firmas disponibles:</b>
• <b>Apex</b> - Apex Trader Funding (completamente disponible)
• <b>Bulenox</b> - Completamente disponible
• TakeProfit (próximamente)
• MyFundedFutures (próximamente)
• Alpha Futures (próximamente)
• Tradeify (próximamente)
• Vision Trade (próximamente)

Por favor, menciona el nombre de la firma en tu próximo mensaje.`;
        
        await this.sendMessage(chatId, response);
        
        return {
            success: true,
            firm: null,
            chatId,
            status: 'unknown',
            response
        };
    }
    
    /**
     * Format response for Telegram (HTML)
     */
    formatResponse(apexResponse) {
        if (!apexResponse.success) {
            return apexResponse.error || 'Error procesando consulta';
        }
        
        let formatted = `<b>🏢 ${apexResponse.firmName}</b>\n\n`;
        
        if (apexResponse.source === 'faq') {
            formatted += `<b>❓ ${apexResponse.question}</b>\n\n`;
            formatted += apexResponse.response;
        } else {
            formatted += apexResponse.response;
        }
        
        // Add source indicator
        const sourceEmoji = apexResponse.source === 'faq' ? '📋' : '💡';
        formatted += `\n\n${sourceEmoji} <i>Fuente: ${apexResponse.source === 'faq' ? 'FAQ oficial' : 'Información general'}</i>`;
        
        return formatted;
    }
    
    /**
     * Send message to Telegram (or store for mock)
     */
    async sendMessage(chatId, message) {
        try {
            if (this.mockMode) {
                // Mock mode: store response instead of sending
                const mockResponse = {
                    chatId,
                    message,
                    timestamp: new Date().toISOString(),
                    messageId: this.mockResponses.length + 1
                };
                
                this.mockResponses.push(mockResponse);
                this.logger.info(`Mock response stored for chat ${chatId}`);
                
                return {
                    success: true,
                    messageId: mockResponse.messageId,
                    mode: 'mock'
                };
            } else {
                // Real mode: send to Telegram API
                if (!this.telegramAPI) {
                    throw new Error('Telegram bot token not configured');
                }
                
                const response = await axios.post(`${this.telegramAPI}/sendMessage`, {
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML'
                });
                
                this.logger.info(`Message sent to Telegram chat ${chatId}`);
                
                return {
                    success: true,
                    messageId: response.data.result.message_id,
                    mode: 'telegram'
                };
            }
            
        } catch (error) {
            this.logger.error(`Send message failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Start long polling for Telegram updates (production mode only)
     */
    async startPolling() {
        if (this.mockMode) {
            this.logger.info('Mock mode: polling not started');
            return;
        }
        
        if (!this.telegramAPI) {
            throw new Error('Cannot start polling: Telegram bot token not configured');
        }
        
        this.logger.info('Starting Telegram polling...');
        let offset = 0;
        
        const poll = async () => {
            try {
                const response = await axios.get(`${this.telegramAPI}/getUpdates`, {
                    params: {
                        offset,
                        limit: 100,
                        timeout: 10
                    }
                });
                
                const updates = response.data.result;
                
                for (const update of updates) {
                    offset = update.update_id + 1;
                    
                    if (update.message && update.message.text) {
                        await this.processMessage(
                            update.message.text,
                            update.message.chat.id
                        );
                    }
                }
                
            } catch (error) {
                this.logger.error(`Polling error: ${error.message}`);
                // Continue polling despite errors
            }
            
            // Schedule next poll
            setTimeout(poll, 1000);
        };
        
        poll();
    }
    
    /**
     * Get gateway health and statistics
     */
    getHealth() {
        return {
            service: 'TelegramGateway',
            mode: this.mockMode ? 'mock' : 'production',
            isInitialized: this.isInitialized,
            router: this.router.getHealth(),
            apex: this.apexService.getHealth(),
            bulenox: this.bulenoxService.getHealth(),
            stats: this.stats,
            mockResponses: this.mockMode ? this.mockResponses.length : null,
            uptime: process.uptime()
        };
    }
    
    /**
     * Get mock responses (for testing)
     */
    getMockResponses() {
        return this.mockResponses;
    }
    
    /**
     * Clear mock responses (for testing)
     */
    clearMockResponses() {
        const count = this.mockResponses.length;
        this.mockResponses = [];
        this.logger.info(`Cleared ${count} mock responses`);
        return count;
    }
    
    /**
     * Clear all contexts (for testing)
     */
    clearAllContexts() {
        return this.router.clearAllContexts();
    }
}

module.exports = TelegramGateway;