const winston = require('winston');

class FirmRouter {
    constructor() {
        // Firm detection patterns
        this.patterns = {
            apex: /apex|atf|trader\s*funding/i,
            bulenox: /bulenox|bule/i,
            takeprofit: /take\s*profit|tpt/i,
            myfunded: /mff|my\s*funded/i,
            alpha: /alpha/i,
            tradeify: /tradeify/i,
            vision: /vision/i
        };
        
        // User context management (userId -> firmContext)
        // Context includes: firmName, timestamp, confidence
        this.userContext = new Map();
        
        // Context TTL: 5 minutes (300,000ms)
        this.contextTTL = 5 * 60 * 1000;
        
        // Logger for debugging
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(({ timestamp, level, message }) => {
                    return `[FirmRouter] ${timestamp} ${level}: ${message}`;
                })
            ),
            transports: [
                new winston.transports.Console()
            ]
        });
        
        // Firm ID mappings from database
        this.firmIds = {
            apex: '854bf730-8420-4297-86f8-3c4a972edcf2',
            bulenox: '7567df00-7cf8-4afc-990f-6f8da04e36a4',
            takeprofit: '08a7b506-4836-486a-a6e9-df12059c55d3',
            myfunded: '1b40dc38-91ff-4a35-be46-1bf2d5749433',
            alpha: '2ff70297-718d-42b0-ba70-cde70d5627b5',
            tradeify: '1a95b01e-4eef-48e2-bd05-6e2f79ca57a8',
            vision: '2e82148c-9646-4dde-8240-f1871334a676'
        };
        
        this.logger.info('FirmRouter initialized with 7 firm patterns');
        
        // Start cleanup interval for expired contexts
        this.startContextCleanup();
    }
    
    /**
     * Calculate Levenshtein distance between two strings
     * @param {string} a - First string
     * @param {string} b - Second string
     * @returns {number} - Edit distance between strings
     */
    levenshtein(a, b) {
        const matrix = [];
        for(let i = 0; i <= b.length; i++) matrix[i] = [i];
        for(let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for(let i = 1; i <= b.length; i++) {
            for(let j = 1; j <= a.length; j++) {
                if(b.charAt(i-1) === a.charAt(j-1)) matrix[i][j] = matrix[i-1][j-1];
                else matrix[i][j] = Math.min(matrix[i-1][j-1]+1, matrix[i][j-1]+1, matrix[i-1][j]+1);
            }
        }
        return matrix[b.length][a.length];
    }
    
    /**
     * Detect which firm the user is asking about
     * @param {string} message - User message to analyze
     * @param {string} userId - Unique user identifier
     * @returns {string|null} - Firm name or null if no match
     */
    detectFirm(message, userId) {
        try {
            this.logger.info(`Detecting firm for user ${userId}: "${message}"`);
            
            // 1. Check for explicit firm mentions in message
            const explicitMatch = this.findExplicitMatch(message);
            if (explicitMatch) {
                this.logger.info(`Explicit firm match found: ${explicitMatch}`);
                this.updateUserContext(userId, explicitMatch, 'explicit');
                return explicitMatch;
            }
            
            // 1.5. Check for typos/misspellings with edit distance
            const messageLower = message.toLowerCase().trim();
            const firms = Object.keys(this.patterns);
            for (const firm of firms) {
                if (this.levenshtein(messageLower, firm) <= 2) {
                    this.logger.info(`Typo tolerance match found: "${messageLower}" -> ${firm}`);
                    this.updateUserContext(userId, firm, 'typo');
                    return firm;
                }
            }
            
            // 2. Check user's recent context (if within TTL)
            const contextFirm = this.getUserContextFirm(userId);
            if (contextFirm) {
                this.logger.info(`Using context firm for user ${userId}: ${contextFirm}`);
                return contextFirm;
            }
            
            // 3. No match found
            this.logger.info(`No firm detected for message: "${message}"`);
            return null;
            
        } catch (error) {
            this.logger.error(`Error detecting firm: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Find explicit firm mentions in message using patterns
     * @param {string} message - Message to analyze
     * @returns {string|null} - Matched firm name or null
     */
    findExplicitMatch(message) {
        // Handle non-string messages
        if (!message || typeof message !== 'string') {
            return null;
        }
        
        const messageLower = message.toLowerCase().trim();
        
        // Check each firm pattern
        for (const [firmName, pattern] of Object.entries(this.patterns)) {
            if (pattern.test(messageLower)) {
                return firmName;
            }
        }
        
        return null;
    }
    
    /**
     * Get firm from user context if valid and not expired
     * @param {string} userId - User identifier
     * @returns {string|null} - Context firm name or null
     */
    getUserContextFirm(userId) {
        const context = this.userContext.get(userId);
        
        if (!context) {
            return null;
        }
        
        // Check if context is expired
        const now = Date.now();
        if (now - context.timestamp > this.contextTTL) {
            this.logger.info(`Context expired for user ${userId}`);
            this.userContext.delete(userId);
            return null;
        }
        
        return context.firmName;
    }
    
    /**
     * Update user context with detected firm
     * @param {string} userId - User identifier
     * @param {string} firmName - Detected firm name
     * @param {string} source - Detection source (explicit/context)
     */
    updateUserContext(userId, firmName, source = 'context') {
        const context = {
            firmName,
            timestamp: Date.now(),
            source,
            firmId: this.firmIds[firmName] || null
        };
        
        this.userContext.set(userId, context);
        this.logger.info(`Updated context for user ${userId}: ${firmName} (${source})`);
    }
    
    /**
     * Get firm UUID by firm name
     * @param {string} firmName - Firm name (e.g., 'apex', 'bulenox')
     * @returns {string|null} - Firm UUID or null
     */
    getFirmId(firmName) {
        return this.firmIds[firmName] || null;
    }
    
    /**
     * Clear expired user contexts
     */
    clearExpiredContexts() {
        const now = Date.now();
        let cleared = 0;
        
        for (const [userId, context] of this.userContext) {
            if (now - context.timestamp > this.contextTTL) {
                this.userContext.delete(userId);
                cleared++;
            }
        }
        
        if (cleared > 0) {
            this.logger.info(`Cleared ${cleared} expired user contexts`);
        }
    }
    
    /**
     * Start automatic cleanup of expired contexts
     */
    startContextCleanup() {
        // Clean up every 2 minutes
        setInterval(() => {
            this.clearExpiredContexts();
        }, 2 * 60 * 1000);
        
        this.logger.info('Context cleanup scheduler started (2-minute interval)');
    }
    
    /**
     * Get router health and statistics
     * @returns {object} - Health information
     */
    getHealth() {
        return {
            service: 'FirmRouter',
            firmsSupported: Object.keys(this.patterns).length,
            activeContexts: this.userContext.size,
            contextTTL: this.contextTTL,
            patterns: Object.keys(this.patterns),
            uptime: process.uptime()
        };
    }
    
    /**
     * Get user context information (for debugging)
     * @param {string} userId - User identifier
     * @returns {object|null} - Context information or null
     */
    getUserContext(userId) {
        const context = this.userContext.get(userId);
        
        if (!context) {
            return null;
        }
        
        return {
            firmName: context.firmName,
            firmId: context.firmId,
            source: context.source,
            age: Date.now() - context.timestamp,
            isExpired: (Date.now() - context.timestamp) > this.contextTTL
        };
    }
    
    /**
     * Clear context for specific user (for testing/debugging)
     * @param {string} userId - User identifier
     */
    clearUserContext(userId) {
        const deleted = this.userContext.delete(userId);
        if (deleted) {
            this.logger.info(`Cleared context for user ${userId}`);
        }
        return deleted;
    }
    
    /**
     * Clear all contexts (for testing)
     */
    clearAllContexts() {
        const size = this.userContext.size;
        this.userContext.clear();
        this.logger.info(`Cleared all ${size} user contexts`);
        return size;
    }
}

module.exports = FirmRouter;