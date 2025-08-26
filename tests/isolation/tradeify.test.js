const TradeifyService = require('../../services/firms/tradeify/index');

describe('TradeifyService Isolation Tests', () => {
    let tradeifyService;
    
    // Setup environment variables for testing
    beforeAll(() => {
        process.env.SUPABASE_URL = 'https://zkqfyyvpyecueybxoqrt.supabase.co';
        process.env.SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcWZ5eXZweWVjdWV5YnhvcXJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM1NjIzMiwiZXhwIjoyMDY2OTMyMjMyfQ.KyOoW5KAVtl7VMTDVi9A03gTUgeQiuKoJuMunZtEiDw';
        
        tradeifyService = new TradeifyService();
    });
    
    describe('Initialization', () => {
        test('should initialize successfully and load FAQs', async () => {
            const result = await tradeifyService.initialize();
            
            expect(result.success).toBe(true);
            expect(result.faqsLoaded).toBeGreaterThan(0);
            expect(result.firmId).toBe('1a95b01e-4eef-48e2-bd05-6e2f79ca57a8');
            expect(tradeifyService.isInitialized).toBe(true);
        }, 30000); // 30 second timeout for database operations
        
        test('should load correct number of Tradeify FAQs', async () => {
            const health = tradeifyService.getHealth();
            
            expect(health.service).toBe('TradeifyService');
            expect(health.firmName).toBe('Tradeify');
            expect(health.isInitialized).toBe(true);
            expect(health.faqsLoaded).toBe(36); // Should have exactly 36 FAQs as specified
        });
        
        test('should have correct firm ID and name constants', () => {
            expect(tradeifyService.TRADEIFY_FIRM_ID).toBe('1a95b01e-4eef-48e2-bd05-6e2f79ca57a8');
            expect(tradeifyService.TRADEIFY_FIRM_NAME).toBe('Tradeify');
        });
    });
    
    describe('Query Processing', () => {
        test('should respond to Tradeify-specific questions', async () => {
            const query = 'tradeify precio plan';
            const result = await tradeifyService.processQuery(query);
            
            expect(result.success).toBe(true);
            expect(result.firmName).toBe('Tradeify');
            expect(result.response).toBeDefined();
            expect(result.response.length).toBeGreaterThan(0);
        });
        
        test('should return default response for unknown queries', async () => {
            const query = 'completely unknown question about nothing specific';
            const result = await tradeifyService.processQuery(query);
            
            expect(result.success).toBe(true);
            expect(result.source).toBe('default');
            expect(result.firmName).toBe('Tradeify');
            expect(result.response).toContain('tradeify.com');
        });
        
        test('should handle errors gracefully', async () => {
            // Test with uninitialized service
            const newService = new TradeifyService();
            const result = await newService.processQuery('test query');
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('not initialized');
        });
        
        test('should respond to futures-related queries', async () => {
            const query = 'futures trading rules';
            const result = await tradeifyService.processQuery(query);
            
            expect(result.success).toBe(true);
            expect(result.firmName).toBe('Tradeify');
        });
    });
    
    describe('Cross-Contamination Prevention', () => {
        test('should reject responses containing other firm names', () => {
            const contaminatedResponses = [
                'Tradeify is good but Apex is better',
                'Check out Bulenox as an alternative',
                'TakeProfit has similar features',
                'Vision Trade offers this too',
                'My Funded Futures provides this service',
                'Alpha has the same policy',
                'Apex Trader Funding has this feature'
            ];
            
            contaminatedResponses.forEach(response => {
                expect(() => {
                    tradeifyService.validateResponse(response);
                }).toThrow('Cross-contamination detected');
            });
        });
        
        test('should accept clean Tradeify-only responses', () => {
            const cleanResponses = [
                'Tradeify requires specific criteria for evaluation',
                'With Tradeify, you can access various trading features',
                'Tradeify offers competitive trading conditions',
                'Visit tradeify.com for more information',
                'Tradeify provides excellent futures trading opportunities'
            ];
            
            cleanResponses.forEach(response => {
                expect(() => {
                    const validated = tradeifyService.validateResponse(response);
                    expect(validated).toBe(response);
                }).not.toThrow();
            });
        });
        
        test('should detect case-insensitive contamination', () => {
            const contaminatedCases = [
                'APEX is mentioned here',
                'bulenox appears in this text',
                'TakeProfit is referenced',
                'vision trade is included',
                'My Funded Futures is mentioned',
                'ALPHA is referenced'
            ];
            
            contaminatedCases.forEach(response => {
                expect(() => {
                    tradeifyService.validateResponse(response);
                }).toThrow('Cross-contamination detected');
            });
        });
        
        test('should prevent subtle cross-contamination attempts', () => {
            const subtleContamination = [
                'Unlike apex, Tradeify offers better conditions',
                'Tradeify vs bulenox comparison shows...',
                'Better than takeprofit in many ways'
            ];
            
            subtleContamination.forEach(response => {
                expect(() => {
                    tradeifyService.validateResponse(response);
                }).toThrow('Cross-contamination detected');
            });
        });
    });
    
    describe('Service Health', () => {
        test('should return correct health status', () => {
            const health = tradeifyService.getHealth();
            
            expect(health.service).toBe('TradeifyService');
            expect(health.firmId).toBe('1a95b01e-4eef-48e2-bd05-6e2f79ca57a8');
            expect(health.firmName).toBe('Tradeify');
            expect(health.isInitialized).toBe(true);
            expect(health.faqsLoaded).toBeGreaterThan(0);
            expect(typeof health.uptime).toBe('number');
        });
        
        test('should track initialization state correctly', () => {
            const uninitializedService = new TradeifyService();
            const health = uninitializedService.getHealth();
            
            expect(health.isInitialized).toBe(false);
            expect(health.faqsLoaded).toBe(0);
        });
    });
    
    describe('FAQ Search Functionality', () => {
        test('should find relevant FAQs using keyword matching', () => {
            // Mock some FAQs for testing
            tradeifyService.faqsCache.set('test1', {
                question: '¿Cuál es el precio de Tradeify?',
                answer: 'El precio de Tradeify varía según el plan elegido.',
                slug: 'alpha-price'
            });
            
            const matches = tradeifyService.findFAQMatches('precio alpha');
            
            expect(matches.length).toBeGreaterThan(0);
            expect(matches[0].question).toBeDefined();
            expect(matches[0].similarity).toBeGreaterThan(0);
        });
        
        test('should return empty array for no matches', () => {
            const matches = tradeifyService.findFAQMatches('completely unrelated query xyz');
            expect(matches.length).toBe(0);
        });
        
        test('should prioritize better matches by similarity', () => {
            // Mock multiple FAQs with different relevance
            tradeifyService.faqsCache.set('test2', {
                question: 'Alpha futures trading rules',
                answer: 'Trading rules for Alpha futures',
                slug: 'trading-rules'
            });
            
            tradeifyService.faqsCache.set('test3', {
                question: 'Account requirements',
                answer: 'General account information',
                slug: 'account-info'
            });
            
            const matches = tradeifyService.findFAQMatches('alpha futures');
            
            if (matches.length > 1) {
                expect(matches[0].similarity).toBeGreaterThanOrEqual(matches[1].similarity);
            }
        });
    });
    
    describe('Error Handling', () => {
        test('should handle database connection errors gracefully', async () => {
            const serviceWithBadDB = new TradeifyService();
            // Override supabase client with a mock that throws errors
            serviceWithBadDB.supabase = {
                from: () => ({
                    select: () => ({
                        eq: () => Promise.resolve({ data: null, error: { message: 'Connection failed' } })
                    })
                })
            };
            
            await expect(serviceWithBadDB.initialize()).rejects.toThrow('Failed to load Tradeify FAQs');
        });
        
        test('should validate responses correctly under various conditions', () => {
            const edgeCases = [
                'Tradeify is the best platform',
                'Tradeify provides excellent service',
                'Visit our website at tradeify.com'
            ];
            
            edgeCases.forEach(response => {
                expect(() => {
                    const validated = tradeifyService.validateResponse(response);
                    expect(typeof validated).toBe('string');
                }).not.toThrow();
            });
        });
    });
});