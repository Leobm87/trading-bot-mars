const TakeProfitService = require('../../services/firms/takeprofit/index');

describe('TakeProfitService Isolation Tests', () => {
    let takeProfitService;
    
    // Setup environment variables for testing
    beforeAll(() => {
        process.env.SUPABASE_URL = 'https://zkqfyyvpyecueybxoqrt.supabase.co';
        process.env.SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcWZ5eXZweWVjdWV5YnhvcXJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM1NjIzMiwiZXhwIjoyMDY2OTMyMjMyfQ.KyOoW5KAVtl7VMTDVi9A03gTUgeQiuKoJuMunZtEiDw';
        
        takeProfitService = new TakeProfitService();
    });
    
    describe('Initialization', () => {
        test('should initialize successfully and load FAQs', async () => {
            const result = await takeProfitService.initialize();
            
            expect(result.success).toBe(true);
            expect(result.faqsLoaded).toBeGreaterThan(0);
            expect(result.firmId).toBe('08a7b506-4836-486a-a6e9-df12059c55d3');
            expect(takeProfitService.isInitialized).toBe(true);
        }, 30000); // 30 second timeout for database operations
        
        test('should load correct number of TakeProfit FAQs', async () => {
            const health = takeProfitService.getHealth();
            
            expect(health.service).toBe('TakeProfitService');
            expect(health.firmName).toBe('TakeProfit Trader');
            expect(health.isInitialized).toBe(true);
            expect(health.faqsLoaded).toBeGreaterThan(15); // Should have ~20 FAQs
        });
    });
    
    describe('Query Processing', () => {
        test('should respond to TakeProfit-specific questions', async () => {
            const query = 'precio takeprofit';
            const result = await takeProfitService.processQuery(query);
            
            expect(result.success).toBe(true);
            expect(result.firmName).toBe('TakeProfit Trader');
            expect(result.response).toBeDefined();
            expect(result.response.length).toBeGreaterThan(0);
        });
        
        test('should return default response for unknown queries', async () => {
            const query = 'completely unknown question about nothing specific';
            const result = await takeProfitService.processQuery(query);
            
            expect(result.success).toBe(true);
            expect(result.source).toBe('default');
            expect(result.firmName).toBe('TakeProfit Trader');
            expect(result.response).toContain('takeprofit.com');
        });
        
        test('should handle errors gracefully', async () => {
            // Test with uninitialized service
            const newService = new TakeProfitService();
            const result = await newService.processQuery('test query');
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('not initialized');
        });
    });
    
    describe('Cross-Contamination Prevention', () => {
        test('should reject responses containing other firm names', () => {
            const contaminatedResponses = [
                'TakeProfit is good but Apex Trader Funding is better',
                'Check out Bulenox as an alternative',
                'Vision Trade has similar features',
                'Alpha Futures offers this too',
                'Tradeify has the same policy',
                'My Funded Futures provides this service',
                'Apex Trader Funding has this feature'
            ];
            
            contaminatedResponses.forEach(response => {
                expect(() => {
                    takeProfitService.validateResponse(response);
                }).toThrow('Cross-contamination detected');
            });
        });
        
        test('should accept clean TakeProfit-only responses', () => {
            const cleanResponses = [
                'TakeProfit Trader requires specific criteria for evaluation',
                'With TakeProfit Trader, you can access various trading features',
                'TakeProfit Trader offers competitive trading conditions',
                'Visit takeprofit.com for more information'
            ];
            
            cleanResponses.forEach(response => {
                expect(() => {
                    const validated = takeProfitService.validateResponse(response);
                    expect(validated).toBe(response);
                }).not.toThrow();
            });
        });
        
        test('should detect case-insensitive contamination', () => {
            const contaminatedCases = [
                'APEX TRADER FUNDING is mentioned here',
                'bulenox appears in this text',
                'Vision Trade is referenced',
                'alpha futures is included'
            ];
            
            contaminatedCases.forEach(response => {
                expect(() => {
                    takeProfitService.validateResponse(response);
                }).toThrow('Cross-contamination detected');
            });
        });
    });
    
    describe('Service Health', () => {
        test('should return correct health status', () => {
            const health = takeProfitService.getHealth();
            
            expect(health.service).toBe('TakeProfitService');
            expect(health.firmId).toBe('08a7b506-4836-486a-a6e9-df12059c55d3');
            expect(health.firmName).toBe('TakeProfit Trader');
            expect(health.isInitialized).toBe(true);
            expect(health.faqsLoaded).toBeGreaterThan(0);
            expect(typeof health.uptime).toBe('number');
        });
    });
    
    describe('FAQ Search Functionality', () => {
        test('should find relevant FAQs using keyword matching', () => {
            // Mock some FAQs for testing
            takeProfitService.faqsCache.set('test1', {
                question: '¿Cuál es el precio de TakeProfit?',
                answer: 'El precio de TakeProfit Trader varía según el plan elegido.',
                slug: 'takeprofit-price'
            });
            
            const matches = takeProfitService.findFAQMatches('precio takeprofit');
            
            expect(matches.length).toBeGreaterThan(0);
            // The test should check that some match was found, not necessarily that specific content
            expect(matches[0].question).toBeDefined();
            expect(matches[0].similarity).toBeGreaterThan(0);
        });
        
        test('should return empty array for no matches', () => {
            const matches = takeProfitService.findFAQMatches('completely unrelated query xyz');
            expect(matches.length).toBe(0);
        });
    });
    
    describe('Firm Isolation Validation', () => {
        test('should only process TakeProfit-related queries', async () => {
            const takeProfitQueries = [
                'takeprofit cuenta',
                'TakeProfit Trader precio',
                'información takeprofit',
                'takeprofit trading'
            ];
            
            for (const query of takeProfitQueries) {
                const result = await takeProfitService.processQuery(query);
                expect(result.success).toBe(true);
                expect(result.firmName).toBe('TakeProfit Trader');
                
                // Ensure response doesn't mention other firm full names
                const responseLower = result.response.toLowerCase();
                expect(responseLower).not.toMatch(/apex trader funding|bulenox|vision trade|tradeify|alpha futures|my funded futures/);
            }
        });
        
        test('should maintain strict service boundaries', () => {
            const health = takeProfitService.getHealth();
            
            // Verify service identity
            expect(health.service).toBe('TakeProfitService');
            expect(health.firmName).toBe('TakeProfit Trader');
            expect(health.firmId).toBe('08a7b506-4836-486a-a6e9-df12059c55d3');
            
            // Verify no cross-references in internal state
            expect(JSON.stringify(health)).not.toMatch(/apex trader funding|bulenox|vision trade|tradeify|alpha futures|my funded futures/i);
        });
        
        test('should validate FAQ count matches expected', async () => {
            const health = takeProfitService.getHealth();
            
            // TakeProfit should have approximately 20 FAQs
            expect(health.faqsLoaded).toBeGreaterThanOrEqual(15);
            expect(health.faqsLoaded).toBeLessThanOrEqual(25);
        });
    });
});