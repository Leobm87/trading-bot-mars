const ApexService = require('../../services/firms/apex/index');

describe('ApexService Isolation Tests', () => {
    let apexService;
    
    // Setup environment variables for testing
    beforeAll(() => {
        process.env.SUPABASE_URL = 'https://zkqfyyvpyecueybxoqrt.supabase.co';
        process.env.SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcWZ5eXZweWVjdWV5YnhvcXJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM1NjIzMiwiZXhwIjoyMDY2OTMyMjMyfQ.KyOoW5KAVtl7VMTDVi9A03gTUgeQiuKoJuMunZtEiDw';
        
        apexService = new ApexService();
    });
    
    describe('Initialization', () => {
        test('should initialize successfully and load FAQs', async () => {
            const result = await apexService.initialize();
            
            expect(result.success).toBe(true);
            expect(result.faqsLoaded).toBeGreaterThan(0);
            expect(result.firmId).toBe('854bf730-8420-4297-86f8-3c4a972edcf2');
            expect(apexService.isInitialized).toBe(true);
        }, 30000); // 30 second timeout for database operations
        
        test('should load correct number of Apex FAQs', async () => {
            const health = apexService.getHealth();
            
            expect(health.service).toBe('ApexService');
            expect(health.firmName).toBe('Apex Trader Funding');
            expect(health.isInitialized).toBe(true);
            expect(health.faqsLoaded).toBeGreaterThan(10); // Should have multiple FAQs
        });
    });
    
    describe('Query Processing', () => {
        test('should respond to Apex-specific questions', async () => {
            const query = 'días mínimos evaluación';
            const result = await apexService.processQuery(query);
            
            expect(result.success).toBe(true);
            expect(result.firmName).toBe('Apex Trader Funding');
            expect(result.response).toBeDefined();
            expect(result.response.length).toBeGreaterThan(0);
        });
        
        test('should return default response for unknown queries', async () => {
            const query = 'completely unknown question about nothing specific';
            const result = await apexService.processQuery(query);
            
            expect(result.success).toBe(true);
            expect(result.source).toBe('default');
            expect(result.firmName).toBe('Apex Trader Funding');
            expect(result.response).toContain('apex.com');
        });
        
        test('should handle errors gracefully', async () => {
            // Test with uninitialized service
            const newService = new ApexService();
            const result = await newService.processQuery('test query');
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('not initialized');
        });
    });
    
    describe('Cross-Contamination Prevention', () => {
        test('should reject responses containing other firm names', () => {
            const contaminatedResponses = [
                'Apex is good but Bulenox is better',
                'Check out TakeProfit as an alternative',
                'Vision Trade has similar features',
                'Alpha Futures offers this too',
                'Tradeify has the same policy',
                'My Funded Futures provides this service'
            ];
            
            contaminatedResponses.forEach(response => {
                expect(() => {
                    apexService.validateResponse(response);
                }).toThrow('Cross-contamination detected');
            });
        });
        
        test('should accept clean Apex-only responses', () => {
            const cleanResponses = [
                'Apex Trader Funding requires 1 minimum day for evaluation',
                'With Apex, you can trade futures and forex',
                'Apex offers competitive drawdown limits',
                'Visit apex.com for more information'
            ];
            
            cleanResponses.forEach(response => {
                expect(() => {
                    const validated = apexService.validateResponse(response);
                    expect(validated).toBe(response);
                }).not.toThrow();
            });
        });
        
        test('should detect case-insensitive contamination', () => {
            const contaminatedCases = [
                'BULENOX is mentioned here',
                'takeprofit appears in this text',
                'Vision Trade is referenced',
                'alpha futures is included'
            ];
            
            contaminatedCases.forEach(response => {
                expect(() => {
                    apexService.validateResponse(response);
                }).toThrow('Cross-contamination detected');
            });
        });
    });
    
    describe('Service Health', () => {
        test('should return correct health status', () => {
            const health = apexService.getHealth();
            
            expect(health.service).toBe('ApexService');
            expect(health.firmId).toBe('854bf730-8420-4297-86f8-3c4a972edcf2');
            expect(health.firmName).toBe('Apex Trader Funding');
            expect(health.isInitialized).toBe(true);
            expect(health.faqsLoaded).toBeGreaterThan(0);
            expect(typeof health.uptime).toBe('number');
        });
    });
    
    describe('FAQ Search Functionality', () => {
        test('should find relevant FAQs using keyword matching', () => {
            // Mock some FAQs for testing
            apexService.faqsCache.set('test1', {
                question: '¿Cuántos días mínimos necesito para pasar la evaluación?',
                answer: '1 día mínimo para completar la evaluación.',
                slug: 'apex-evaluation-days'
            });
            
            const matches = apexService.findFAQMatches('días evaluación');
            
            expect(matches.length).toBeGreaterThan(0);
            expect(matches[0].question).toContain('días');
            expect(matches[0].similarity).toBeGreaterThan(0);
        });
        
        test('should return empty array for no matches', () => {
            const matches = apexService.findFAQMatches('completely unrelated query xyz');
            expect(matches.length).toBe(0);
        });
    });
});