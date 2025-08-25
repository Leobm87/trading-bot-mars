const TelegramGateway = require('../index');

// Mock external dependencies
jest.mock('@supabase/supabase-js');

// Test environment setup
const TEST_BOT_TOKEN = 'test-token-123';
const MOCK_CHAT_ID = '12345';

describe('TelegramGateway', () => {
    let gateway;
    
    beforeEach(async () => {
        // Clear any existing environment variables
        delete process.env.TELEGRAM_BOT_TOKEN;
        delete process.env.NODE_ENV;
        
        // Create gateway in mock mode
        gateway = new TelegramGateway({
            mockMode: true,
            botToken: TEST_BOT_TOKEN
        });
        
        // Mock the Supabase responses for ApexService initialization
        const mockSupabaseClient = {
            from: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockResolvedValue({
                        data: [
                            {
                                id: 'faq-1',
                                question: '¿Cuánto cuesta Apex?',
                                answer_md: 'Apex cuesta $150 por el plan básico.',
                                slug: 'apex-pricing',
                                category: 'pricing'
                            },
                            {
                                id: 'faq-2', 
                                question: '¿Qué es el drawdown en Apex?',
                                answer_md: 'El drawdown máximo es 5% en Apex.',
                                slug: 'apex-drawdown',
                                category: 'rules'
                            }
                        ],
                        error: null
                    })
                })
            })
        };
        
        // Override the Supabase client creation
        gateway.apexService.supabase = mockSupabaseClient;
        
        await gateway.initialize();
    });
    
    afterEach(() => {
        // Clear mock responses between tests
        if (gateway) {
            gateway.clearMockResponses();
            gateway.clearAllContexts();
        }
    });
    
    describe('Initialization', () => {
        test('should initialize in mock mode successfully', () => {
            expect(gateway.mockMode).toBe(true);
            expect(gateway.isInitialized).toBe(true);
            expect(gateway.botToken).toBe(TEST_BOT_TOKEN);
        });
        
        test('should initialize ApexService successfully', () => {
            expect(gateway.apexService.isInitialized).toBe(true);
            expect(gateway.apexService.faqsCache.size).toBeGreaterThan(0);
        });
        
        test('should have router ready', () => {
            const routerHealth = gateway.router.getHealth();
            expect(routerHealth.firmsSupported).toBe(7);
            expect(routerHealth.service).toBe('FirmRouter');
        });
        
        test('should provide health information', () => {
            const health = gateway.getHealth();
            expect(health.service).toBe('TelegramGateway');
            expect(health.mode).toBe('mock');
            expect(health.isInitialized).toBe(true);
            expect(health.stats).toBeDefined();
        });
    });
    
    describe('Message Processing', () => {
        test('should detect Apex and process query successfully', async () => {
            const message = '¿Cuánto cuesta Apex?';
            const result = await gateway.processMessage(message, MOCK_CHAT_ID);
            
            expect(result.success).toBe(true);
            expect(result.firm).toBe('apex');
            expect(result.source).toBe('faq');
            expect(result.response).toContain('Apex Trader Funding');
            expect(result.response).toContain('$150');
        });
        
        test('should handle explicit Apex mentions', async () => {
            const message = 'apex drawdown rules';
            const result = await gateway.processMessage(message, MOCK_CHAT_ID);
            
            expect(result.success).toBe(true);
            expect(result.firm).toBe('apex');
            expect(result.response).toContain('drawdown');
        });
        
        test('should handle case-insensitive Apex detection', async () => {
            const message = 'APEX pricing information';
            const result = await gateway.processMessage(message, MOCK_CHAT_ID);
            
            expect(result.success).toBe(true);
            expect(result.firm).toBe('apex');
            expect(gateway.stats.apexQueries).toBeGreaterThan(0);
        });
        
        test('should store mock responses correctly', async () => {
            const message = 'apex information';
            await gateway.processMessage(message, MOCK_CHAT_ID);
            
            const mockResponses = gateway.getMockResponses();
            expect(mockResponses).toHaveLength(1);
            expect(mockResponses[0].chatId).toBe(MOCK_CHAT_ID);
            expect(mockResponses[0].message).toContain('Apex');
        });
        
        test('should handle unimplemented firms', async () => {
            const message = 'bulenox pricing';
            const result = await gateway.processMessage(message, MOCK_CHAT_ID);
            
            expect(result.success).toBe(true);
            expect(result.firm).toBe('bulenox');
            expect(result.status).toBe('unimplemented');
            expect(result.response).toContain('Bulenox');
            expect(result.response).toContain('pronto');
        });
        
        test('should handle unknown firm queries', async () => {
            const message = 'general trading question';
            const result = await gateway.processMessage(message, MOCK_CHAT_ID);
            
            expect(result.success).toBe(true);
            expect(result.firm).toBe(null);
            expect(result.status).toBe('unknown');
            expect(result.response).toContain('¿Sobre qué firma');
            expect(result.response).toContain('Apex');
        });
        
        test('should maintain user context between messages', async () => {
            // First message: establish Apex context
            const firstMessage = 'Tell me about apex';
            await gateway.processMessage(firstMessage, MOCK_CHAT_ID);
            
            // Second message: should use context (no explicit firm mention)
            const secondMessage = 'What are the pricing plans?';
            const result = await gateway.processMessage(secondMessage, MOCK_CHAT_ID);
            
            expect(result.success).toBe(true);
            expect(result.firm).toBe('apex'); // Should use context
        });
    });
    
    describe('Response Formatting', () => {
        test('should format FAQ responses with HTML', async () => {
            const message = '¿Cuánto cuesta Apex?';
            await gateway.processMessage(message, MOCK_CHAT_ID);
            
            const mockResponses = gateway.getMockResponses();
            const response = mockResponses[0].message;
            
            expect(response).toContain('<b>🏢 Apex Trader Funding</b>');
            expect(response).toContain('<b>❓');
            expect(response).toContain('<i>Fuente: FAQ oficial</i>');
        });
        
        test('should format default responses correctly', async () => {
            // Force a non-FAQ response by using query that won't match
            const message = 'apex xyz random nonexistent query that definitely wont match any FAQ';
            
            // Mock ApexService to return default response
            const originalProcessQuery = gateway.apexService.processQuery;
            gateway.apexService.processQuery = jest.fn().mockResolvedValue({
                success: true,
                source: 'default',
                firmName: 'Apex Trader Funding',
                response: 'Para información específica sobre Apex Trader Funding, te recomendamos visitar apex.com'
            });
            
            await gateway.processMessage(message, MOCK_CHAT_ID);
            
            const mockResponses = gateway.getMockResponses();
            const response = mockResponses[0].message;
            
            expect(response).toContain('<b>🏢 Apex Trader Funding</b>');
            expect(response).toContain('<i>Fuente: Información general</i>');
            
            // Restore original method
            gateway.apexService.processQuery = originalProcessQuery;
        });
    });
    
    describe('Error Handling', () => {
        test('should handle ApexService errors gracefully', async () => {
            // Mock ApexService to throw an error
            gateway.apexService.processQuery = jest.fn().mockRejectedValue(
                new Error('Database connection failed')
            );
            
            const message = 'apex pricing';
            const result = await gateway.processMessage(message, MOCK_CHAT_ID);
            
            expect(result.success).toBe(false);
            expect(result.firm).toBe('apex');
            expect(result.error).toContain('Database connection failed');
        });
        
        test('should handle uninitialized gateway', async () => {
            const uninitializedGateway = new TelegramGateway({ mockMode: true });
            
            const result = await uninitializedGateway.processMessage('test', MOCK_CHAT_ID);
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('not initialized');
        });
        
        test('should track error statistics for unhandled errors', async () => {
            // Clear stats first
            gateway.stats.errors = 0;
            
            // Force an unhandled error by making processMessage throw
            // We'll break the router to cause an unhandled error
            const originalDetectFirm = gateway.router.detectFirm;
            gateway.router.detectFirm = jest.fn().mockImplementation(() => {
                throw new Error('Router crashed');
            });
            
            const result = await gateway.processMessage('test message', MOCK_CHAT_ID);
            
            expect(result.success).toBe(false);
            expect(gateway.stats.errors).toBeGreaterThan(0);
            
            // Restore original method
            gateway.router.detectFirm = originalDetectFirm;
        });
    });
    
    describe('Router Integration', () => {
        test('should properly integrate with Router service', async () => {
            const message = 'apex trader funding information';
            await gateway.processMessage(message, MOCK_CHAT_ID);
            
            // Check that router detected the firm correctly
            const userContext = gateway.router.getUserContext(MOCK_CHAT_ID);
            expect(userContext.firmName).toBe('apex');
            expect(userContext.source).toBe('explicit');
        });
        
        test('should handle different firm patterns correctly', async () => {
            const firmTests = [
                { message: 'bulenox info', expectedFirm: 'bulenox' },
                { message: 'takeprofit rules', expectedFirm: 'takeprofit' },
                { message: 'mff pricing', expectedFirm: 'myfunded' },
                { message: 'alpha futures info', expectedFirm: 'alpha' },
                { message: 'tradeify account', expectedFirm: 'tradeify' },
                { message: 'vision company', expectedFirm: 'vision' } // Fixed: avoid words containing "atf"
            ];
            
            for (const test of firmTests) {
                // Use unique chat ID for each test to avoid context contamination
                const uniqueChatId = `${MOCK_CHAT_ID}_${test.expectedFirm}`;
                gateway.router.clearUserContext(uniqueChatId); // Clear context before test
                
                const result = await gateway.processMessage(test.message, uniqueChatId);
                expect(result.firm).toBe(test.expectedFirm);
                expect(result.status).toBe('unimplemented');
            }
        });
    });
    
    describe('Statistics and Health', () => {
        test('should track message processing statistics', async () => {
            // Reset stats first
            gateway.stats = {
                totalMessages: 0,
                firmDetections: 0,
                apexQueries: 0,
                unknownQueries: 0,
                errors: 0
            };
            
            await gateway.processMessage('apex test 1', `${MOCK_CHAT_ID}_stats1`);
            await gateway.processMessage('bulenox test', `${MOCK_CHAT_ID}_stats2`);
            await gateway.processMessage('unknown query', `${MOCK_CHAT_ID}_stats3`);
            
            const stats = gateway.stats;
            expect(stats.totalMessages).toBe(3);
            expect(stats.firmDetections).toBe(2); // apex + bulenox
            expect(stats.apexQueries).toBe(1);
            expect(stats.unknownQueries).toBe(1);
        });
        
        test('should provide comprehensive health check', () => {
            const health = gateway.getHealth();
            
            expect(health).toHaveProperty('service');
            expect(health).toHaveProperty('mode');
            expect(health).toHaveProperty('isInitialized');
            expect(health).toHaveProperty('router');
            expect(health).toHaveProperty('apex');
            expect(health).toHaveProperty('stats');
            expect(health).toHaveProperty('mockResponses');
            expect(health).toHaveProperty('uptime');
        });
    });
    
    describe('Mock Mode Operations', () => {
        test('should clear mock responses correctly', () => {
            // Add some mock responses
            gateway.mockResponses.push({ test: 'response1' });
            gateway.mockResponses.push({ test: 'response2' });
            
            const clearedCount = gateway.clearMockResponses();
            
            expect(clearedCount).toBe(2);
            expect(gateway.getMockResponses()).toHaveLength(0);
        });
        
        test('should provide mock responses for testing', async () => {
            await gateway.processMessage('apex test', MOCK_CHAT_ID);
            await gateway.processMessage('bulenox test', MOCK_CHAT_ID);
            
            const responses = gateway.getMockResponses();
            expect(responses).toHaveLength(2);
            expect(responses[0]).toHaveProperty('chatId');
            expect(responses[0]).toHaveProperty('message');
            expect(responses[0]).toHaveProperty('timestamp');
            expect(responses[0]).toHaveProperty('messageId');
        });
    });
    
    describe('Validation Rules', () => {
        test('should never mix firm information in responses', async () => {
            const message = 'apex pricing';
            await gateway.processMessage(message, MOCK_CHAT_ID);
            
            const mockResponses = gateway.getMockResponses();
            const response = mockResponses[0].message.toLowerCase();
            
            // Check that response doesn't contain other firm names
            const otherFirms = ['bulenox', 'takeprofit', 'vision', 'tradeify', 'alpha', 'myfunded'];
            for (const firm of otherFirms) {
                expect(response).not.toContain(firm);
            }
        });
        
        test('should always include firm name in responses', async () => {
            const message = 'apex information';
            await gateway.processMessage(message, MOCK_CHAT_ID);
            
            const mockResponses = gateway.getMockResponses();
            const response = mockResponses[0].message;
            
            expect(response).toContain('Apex');
        });
    });
});