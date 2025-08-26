const MyFundedService = require('../../services/firms/myfunded/index');

describe('MyFundedService Isolation Tests', () => {
    let myFundedService;
    
    // Setup environment variables for testing
    beforeAll(() => {
        process.env.SUPABASE_URL = 'https://zkqfyyvpyecueybxoqrt.supabase.co';
        process.env.SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcWZ5eXZweWVjdWV5YnhvcXJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM1NjIzMiwiZXhwIjoyMDY2OTMyMjMyfQ.KyOoW5KAVtl7VMTDVi9A03gTUgeQiuKoJuMunZtEiDw';
        
        myFundedService = new MyFundedService();
    });
    
    describe('Initialization', () => {
        test('should initialize successfully and load FAQs', async () => {
            const result = await myFundedService.initialize();
            
            expect(result.success).toBe(true);
            expect(result.faqsLoaded).toBeGreaterThan(0);
            expect(result.firmId).toBe('1b40dc38-91ff-4a35-be46-1bf2d5749433');
            expect(myFundedService.isInitialized).toBe(true);
        }, 30000); // 30 second timeout for database operations
        
        test('should load correct number of MyFunded FAQs', async () => {
            const health = myFundedService.getHealth();
            
            expect(health.service).toBe('MyFundedService');
            expect(health.firmName).toBe('My Funded Futures');
            expect(health.isInitialized).toBe(true);
            expect(health.faqsLoaded).toBe(14); // Should have exactly 14 FAQs as specified
        });
        
        test('should have correct firm ID and name constants', () => {
            expect(myFundedService.MYFUNDED_FIRM_ID).toBe('1b40dc38-91ff-4a35-be46-1bf2d5749433');
            expect(myFundedService.MYFUNDED_FIRM_NAME).toBe('My Funded Futures');
        });
    });
    
    describe('Query Processing', () => {
        test('should respond to MyFunded-specific questions', async () => {
            const query = 'myfunded precio plan';
            const result = await myFundedService.processQuery(query);
            
            expect(result.success).toBe(true);
            expect(result.firmName).toBe('My Funded Futures');
            expect(result.response).toBeDefined();
            expect(result.response.length).toBeGreaterThan(0);
        });
        
        test('should return default response for unknown queries', async () => {
            const query = 'completely unknown question about nothing specific';
            const result = await myFundedService.processQuery(query);
            
            expect(result.success).toBe(true);
            expect(result.source).toBe('default');
            expect(result.firmName).toBe('My Funded Futures');
            expect(result.response).toContain('myfundedfx.com');
        });
        
        test('should handle errors gracefully', async () => {
            // Test with uninitialized service
            const newService = new MyFundedService();
            const result = await newService.processQuery('test query');
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('not initialized');
        });
        
        test('should respond to futures-related queries', async () => {
            const query = 'futures trading rules';
            const result = await myFundedService.processQuery(query);
            
            expect(result.success).toBe(true);
            expect(result.firmName).toBe('My Funded Futures');
        });
    });
    
    describe('Cross-Contamination Prevention', () => {
        test('should reject responses containing other firm names', () => {
            const contaminatedResponses = [
                'MyFunded is good but Apex is better',
                'Check out Bulenox as an alternative',
                'TakeProfit has similar features',
                'Vision Trade offers this too',
                'Alpha Futures provides this service',
                'Tradeify has the same policy',
                'Apex Trader Funding has this feature'
            ];
            
            contaminatedResponses.forEach(response => {
                expect(() => {
                    myFundedService.validateResponse(response);
                }).toThrow('Cross-contamination detected');
            });
        });
        
        test('should accept clean MyFunded-only responses', () => {
            const cleanResponses = [
                'My Funded Futures requires specific criteria for evaluation',
                'With My Funded Futures, you can access various trading features',
                'My Funded Futures offers competitive trading conditions',
                'Visit myfundedfx.com for more information',
                'MyFunded provides excellent futures trading opportunities'
            ];
            
            cleanResponses.forEach(response => {
                expect(() => {
                    const validated = myFundedService.validateResponse(response);
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
                'Alpha futures is mentioned',
                'TRADEIFY is referenced'
            ];
            
            contaminatedCases.forEach(response => {
                expect(() => {
                    myFundedService.validateResponse(response);
                }).toThrow('Cross-contamination detected');
            });
        });
        
        test('should prevent subtle cross-contamination attempts', () => {
            const subtleContamination = [
                'Unlike apex, MyFunded offers better conditions',
                'MyFunded vs bulenox comparison shows...',
                'Better than takeprofit in many ways'
            ];
            
            subtleContamination.forEach(response => {
                expect(() => {
                    myFundedService.validateResponse(response);
                }).toThrow('Cross-contamination detected');
            });
        });
    });
    
    describe('Service Health', () => {
        test('should return correct health status', () => {
            const health = myFundedService.getHealth();
            
            expect(health.service).toBe('MyFundedService');
            expect(health.firmId).toBe('1b40dc38-91ff-4a35-be46-1bf2d5749433');
            expect(health.firmName).toBe('My Funded Futures');
            expect(health.isInitialized).toBe(true);
            expect(health.faqsLoaded).toBeGreaterThan(0);
            expect(typeof health.uptime).toBe('number');
        });
        
        test('should track initialization state correctly', () => {
            const uninitializedService = new MyFundedService();
            const health = uninitializedService.getHealth();
            
            expect(health.isInitialized).toBe(false);
            expect(health.faqsLoaded).toBe(0);
        });
    });
    
    describe('FAQ Search Functionality', () => {
        test('should find relevant FAQs using keyword matching', () => {
            // Mock some FAQs for testing
            myFundedService.faqsCache.set('test1', {
                question: '¿Cuál es el precio de My Funded Futures?',
                answer: 'El precio de My Funded Futures varía según el plan elegido.',
                slug: 'myfunded-price'
            });
            
            const matches = myFundedService.findFAQMatches('precio myfunded');
            
            expect(matches.length).toBeGreaterThan(0);
            expect(matches[0].question).toBeDefined();
            expect(matches[0].similarity).toBeGreaterThan(0);
        });
        
        test('should return empty array for no matches', () => {
            const matches = myFundedService.findFAQMatches('completely unrelated query xyz');
            expect(matches.length).toBe(0);
        });
        
        test('should prioritize better matches by similarity', () => {
            // Mock multiple FAQs with different relevance
            myFundedService.faqsCache.set('test2', {
                question: 'MyFunded futures trading rules',
                answer: 'Trading rules for MyFunded futures',
                slug: 'trading-rules'
            });
            
            myFundedService.faqsCache.set('test3', {
                question: 'Account requirements',
                answer: 'General account information',
                slug: 'account-info'
            });
            
            const matches = myFundedService.findFAQMatches('myfunded futures');
            
            if (matches.length > 1) {
                expect(matches[0].similarity).toBeGreaterThanOrEqual(matches[1].similarity);
            }
        });
    });
    
    describe('Error Handling', () => {
        test('should handle database connection errors gracefully', async () => {
            const serviceWithBadDB = new MyFundedService();
            // Override supabase client with a mock that throws errors
            serviceWithBadDB.supabase = {
                from: () => ({
                    select: () => ({
                        eq: () => Promise.resolve({ data: null, error: { message: 'Connection failed' } })
                    })
                })
            };
            
            await expect(serviceWithBadDB.initialize()).rejects.toThrow('Failed to load MyFunded FAQs');
        });
        
        test('should validate responses correctly under various conditions', () => {
            const edgeCases = [
                'My Funded Futures is the best platform',
                'myfunded provides excellent service',
                'Visit our website at myfundedfx.com'
            ];
            
            edgeCases.forEach(response => {
                expect(() => {
                    const validated = myFundedService.validateResponse(response);
                    expect(typeof validated).toBe('string');
                }).not.toThrow();
            });
        });
    });
});