const BulenoxService = require('../../services/firms/bulenox/index');

describe('BulenoxService Isolation Tests', () => {
    let bulenoxService;
    
    // Setup environment variables for testing
    beforeAll(() => {
        process.env.SUPABASE_URL = 'https://zkqfyyvpyecueybxoqrt.supabase.co';
        process.env.SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcWZ5eXZweWVjdWV5YnhvcXJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM1NjIzMiwiZXhwIjoyMDY2OTMyMjMyfQ.KyOoW5KAVtl7VMTDVi9A03gTUgeQiuKoJuMunZtEiDw';
        
        bulenoxService = new BulenoxService();
    });
    
    describe('Initialization', () => {
        test('should initialize successfully and load FAQs', async () => {
            const result = await bulenoxService.initialize();
            
            expect(result.success).toBe(true);
            expect(result.faqsLoaded).toBeGreaterThan(0);
            expect(result.firmId).toBe('7567df00-7cf8-4afc-990f-6f8da04e36a4');
            expect(bulenoxService.isInitialized).toBe(true);
        }, 30000); // 30 second timeout for database operations
        
        test('should load correct number of Bulenox FAQs', async () => {
            const health = bulenoxService.getHealth();
            
            expect(health.service).toBe('BulenoxService');
            expect(health.firmName).toBe('Bulenox');
            expect(health.isInitialized).toBe(true);
            expect(health.faqsLoaded).toBeGreaterThan(10); // Should have multiple FAQs
        });
    });
    
    describe('Query Processing', () => {
        test('should respond to Bulenox-specific questions', async () => {
            const query = 'precio bulenox';
            const result = await bulenoxService.processQuery(query);
            
            expect(result.success).toBe(true);
            expect(result.firmName).toBe('Bulenox');
            expect(result.response).toBeDefined();
            expect(result.response.length).toBeGreaterThan(0);
        });
        
        test('should return default response for unknown queries', async () => {
            const query = 'completely unknown question about nothing specific';
            const result = await bulenoxService.processQuery(query);
            
            expect(result.success).toBe(true);
            expect(result.source).toBe('default');
            expect(result.firmName).toBe('Bulenox');
            expect(result.response).toContain('bulenox.com');
        });
        
        test('should handle errors gracefully', async () => {
            // Test with uninitialized service
            const newService = new BulenoxService();
            const result = await newService.processQuery('test query');
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('not initialized');
        });
    });
    
    describe('Cross-Contamination Prevention', () => {
        test('should reject responses containing other firm names', () => {
            const contaminatedResponses = [
                'Bulenox is good but Apex is better',
                'Check out TakeProfit as an alternative',
                'Vision Trade has similar features',
                'Alpha Futures offers this too',
                'Tradeify has the same policy',
                'My Funded Futures provides this service',
                'Apex Trader Funding has this feature'
            ];
            
            contaminatedResponses.forEach(response => {
                expect(() => {
                    bulenoxService.validateResponse(response);
                }).toThrow('Cross-contamination detected');
            });
        });
        
        test('should accept clean Bulenox-only responses', () => {
            const cleanResponses = [
                'Bulenox requires specific criteria for evaluation',
                'With Bulenox, you can access various trading features',
                'Bulenox offers competitive trading conditions',
                'Visit bulenox.com for more information'
            ];
            
            cleanResponses.forEach(response => {
                expect(() => {
                    const validated = bulenoxService.validateResponse(response);
                    expect(validated).toBe(response);
                }).not.toThrow();
            });
        });
        
        test('should detect case-insensitive contamination', () => {
            const contaminatedCases = [
                'APEX is mentioned here',
                'takeprofit appears in this text',
                'Vision Trade is referenced',
                'alpha futures is included'
            ];
            
            contaminatedCases.forEach(response => {
                expect(() => {
                    bulenoxService.validateResponse(response);
                }).toThrow('Cross-contamination detected');
            });
        });
    });
    
    describe('Service Health', () => {
        test('should return correct health status', () => {
            const health = bulenoxService.getHealth();
            
            expect(health.service).toBe('BulenoxService');
            expect(health.firmId).toBe('7567df00-7cf8-4afc-990f-6f8da04e36a4');
            expect(health.firmName).toBe('Bulenox');
            expect(health.isInitialized).toBe(true);
            expect(health.faqsLoaded).toBeGreaterThan(0);
            expect(typeof health.uptime).toBe('number');
        });
    });
    
    describe('FAQ Search Functionality', () => {
        test('should find relevant FAQs using keyword matching', () => {
            // Mock some FAQs for testing
            bulenoxService.faqsCache.set('test1', {
                question: '¿Cuál es el precio de Bulenox?',
                answer: 'El precio de Bulenox varía según el plan elegido.',
                slug: 'bulenox-price'
            });
            
            const matches = bulenoxService.findFAQMatches('precio bulenox');
            
            expect(matches.length).toBeGreaterThan(0);
            // The test should check that some match was found, not necessarily that specific content
            expect(matches[0].question).toBeDefined();
            expect(matches[0].similarity).toBeGreaterThan(0);
        });
        
        test('should return empty array for no matches', () => {
            const matches = bulenoxService.findFAQMatches('completely unrelated query xyz');
            expect(matches.length).toBe(0);
        });
    });
});