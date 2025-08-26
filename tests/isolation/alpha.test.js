const AlphaService = require('../../services/firms/alpha/index');

describe('AlphaService Isolation Tests', () => {
    let alphaService;
    
    // Setup environment variables for testing
    beforeAll(() => {
        process.env.SUPABASE_URL = 'https://zkqfyyvpyecueybxoqrt.supabase.co';
        process.env.SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcWZ5eXZweWVjdWV5YnhvcXJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM1NjIzMiwiZXhwIjoyMDY2OTMyMjMyfQ.KyOoW5KAVtl7VMTDVi9A03gTUgeQiuKoJuMunZtEiDw';
        
        alphaService = new AlphaService();
    });
    
    describe('Initialization', () => {
        test('should initialize successfully and load FAQs', async () => {
            const result = await alphaService.initialize();
            
            expect(result.success).toBe(true);
            expect(result.faqsLoaded).toBeGreaterThan(0);
            expect(result.firmId).toBe('2ff70297-718d-42b0-ba70-cde70d5627b5');
            expect(alphaService.isInitialized).toBe(true);
        }, 30000); // 30 second timeout for database operations
        
        test('should load correct number of Alpha FAQs', async () => {
            const health = alphaService.getHealth();
            
            expect(health.service).toBe('AlphaService');
            expect(health.firmName).toBe('Alpha Futures');
            expect(health.isInitialized).toBe(true);
            expect(health.faqsLoaded).toBe(28); // Should have exactly 28 FAQs as specified
        });
        
        test('should have correct firm ID and name constants', () => {
            expect(alphaService.ALPHA_FIRM_ID).toBe('2ff70297-718d-42b0-ba70-cde70d5627b5');
            expect(alphaService.ALPHA_FIRM_NAME).toBe('Alpha Futures');
        });
    });
    
    describe('Query Processing', () => {
        test('should respond to Alpha-specific questions', async () => {
            const query = 'alpha precio plan';
            const result = await alphaService.processQuery(query);
            
            expect(result.success).toBe(true);
            expect(result.firmName).toBe('Alpha Futures');
            expect(result.response).toBeDefined();
            expect(result.response.length).toBeGreaterThan(0);
        });
        
        test('should return default response for unknown queries', async () => {
            const query = 'completely unknown question about nothing specific';
            const result = await alphaService.processQuery(query);
            
            expect(result.success).toBe(true);
            expect(result.source).toBe('default');
            expect(result.firmName).toBe('Alpha Futures');
            expect(result.response).toContain('alpha-futures.com');
        });
        
        test('should handle errors gracefully', async () => {
            // Test with uninitialized service
            const newService = new AlphaService();
            const result = await newService.processQuery('test query');
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('not initialized');
        });
        
        test('should respond to futures-related queries', async () => {
            const query = 'futures trading rules';
            const result = await alphaService.processQuery(query);
            
            expect(result.success).toBe(true);
            expect(result.firmName).toBe('Alpha Futures');
        });
    });
    
    describe('Cross-Contamination Prevention', () => {
        test('should reject responses containing other firm names', () => {
            const contaminatedResponses = [
                'Alpha is good but Apex is better',
                'Check out Bulenox as an alternative',
                'TakeProfit has similar features',
                'Vision Trade offers this too',
                'My Funded Futures provides this service',
                'Tradeify has the same policy',
                'Apex Trader Funding has this feature'
            ];
            
            contaminatedResponses.forEach(response => {
                expect(() => {
                    alphaService.validateResponse(response);
                }).toThrow('Cross-contamination detected');
            });
        });
        
        test('should accept clean Alpha-only responses', () => {
            const cleanResponses = [
                'Alpha Futures requires specific criteria for evaluation',
                'With Alpha Futures, you can access various trading features',
                'Alpha Futures offers competitive trading conditions',
                'Visit alpha-futures.com for more information',
                'Alpha provides excellent futures trading opportunities'
            ];
            
            cleanResponses.forEach(response => {
                expect(() => {
                    const validated = alphaService.validateResponse(response);
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
                'TRADEIFY is referenced'
            ];
            
            contaminatedCases.forEach(response => {
                expect(() => {
                    alphaService.validateResponse(response);
                }).toThrow('Cross-contamination detected');
            });
        });
        
        test('should prevent subtle cross-contamination attempts', () => {
            const subtleContamination = [
                'Unlike apex, Alpha offers better conditions',
                'Alpha vs bulenox comparison shows...',
                'Better than takeprofit in many ways'
            ];
            
            subtleContamination.forEach(response => {
                expect(() => {
                    alphaService.validateResponse(response);
                }).toThrow('Cross-contamination detected');
            });
        });
    });
    
    describe('Service Health', () => {
        test('should return correct health status', () => {
            const health = alphaService.getHealth();
            
            expect(health.service).toBe('AlphaService');
            expect(health.firmId).toBe('2ff70297-718d-42b0-ba70-cde70d5627b5');
            expect(health.firmName).toBe('Alpha Futures');
            expect(health.isInitialized).toBe(true);
            expect(health.faqsLoaded).toBeGreaterThan(0);
            expect(typeof health.uptime).toBe('number');
        });
        
        test('should track initialization state correctly', () => {
            const uninitializedService = new AlphaService();
            const health = uninitializedService.getHealth();
            
            expect(health.isInitialized).toBe(false);
            expect(health.faqsLoaded).toBe(0);
        });
    });
    
    describe('FAQ Search Functionality', () => {
        test('should find relevant FAQs using keyword matching', () => {
            // Mock some FAQs for testing
            alphaService.faqsCache.set('test1', {
                question: '¿Cuál es el precio de Alpha Futures?',
                answer: 'El precio de Alpha Futures varía según el plan elegido.',
                slug: 'alpha-price'
            });
            
            const matches = alphaService.findFAQMatches('precio alpha');
            
            expect(matches.length).toBeGreaterThan(0);
            expect(matches[0].question).toBeDefined();
            expect(matches[0].similarity).toBeGreaterThan(0);
        });
        
        test('should return empty array for no matches', () => {
            const matches = alphaService.findFAQMatches('completely unrelated query xyz');
            expect(matches.length).toBe(0);
        });
        
        test('should prioritize better matches by similarity', () => {
            // Mock multiple FAQs with different relevance
            alphaService.faqsCache.set('test2', {
                question: 'Alpha futures trading rules',
                answer: 'Trading rules for Alpha futures',
                slug: 'trading-rules'
            });
            
            alphaService.faqsCache.set('test3', {
                question: 'Account requirements',
                answer: 'General account information',
                slug: 'account-info'
            });
            
            const matches = alphaService.findFAQMatches('alpha futures');
            
            if (matches.length > 1) {
                expect(matches[0].similarity).toBeGreaterThanOrEqual(matches[1].similarity);
            }
        });
    });
    
    describe('Error Handling', () => {
        test('should handle database connection errors gracefully', async () => {
            const serviceWithBadDB = new AlphaService();
            // Override supabase client with a mock that throws errors
            serviceWithBadDB.supabase = {
                from: () => ({
                    select: () => ({
                        eq: () => Promise.resolve({ data: null, error: { message: 'Connection failed' } })
                    })
                })
            };
            
            await expect(serviceWithBadDB.initialize()).rejects.toThrow('Failed to load Alpha FAQs');
        });
        
        test('should validate responses correctly under various conditions', () => {
            const edgeCases = [
                'Alpha Futures is the best platform',
                'Alpha provides excellent service',
                'Visit our website at alpha-futures.com'
            ];
            
            edgeCases.forEach(response => {
                expect(() => {
                    const validated = alphaService.validateResponse(response);
                    expect(typeof validated).toBe('string');
                }).not.toThrow();
            });
        });
    });
});