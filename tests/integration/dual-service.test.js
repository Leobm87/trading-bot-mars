const TelegramGateway = require('../../services/gateway');
const ApexService = require('../../services/firms/apex');
const BulenoxService = require('../../services/firms/bulenox');

describe('Dual Service Integration Tests', () => {
    let gateway;
    let apexService;
    let bulenoxService;
    
    beforeAll(async () => {
        // Setup environment variables for testing
        process.env.SUPABASE_URL = 'https://zkqfyyvpyecueybxoqrt.supabase.co';
        process.env.SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcWZ5eXZweWVjdWV5YnhvcXJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM1NjIzMiwiZXhwIjoyMDY2OTMyMjMyfQ.KyOoW5KAVtl7VMTDVi9A03gTUgeQiuKoJuMunZtEiDw';
        
        // Initialize gateway in mock mode
        gateway = new TelegramGateway({ mockMode: true });
        await gateway.initialize();
        
        // Initialize individual services for direct testing
        apexService = new ApexService();
        bulenoxService = new BulenoxService();
        await apexService.initialize();
        await bulenoxService.initialize();
    }, 45000); // 45 second timeout for initialization
    
    afterEach(() => {
        // Clear contexts between tests
        gateway.clearAllContexts();
        gateway.clearMockResponses();
    });
    
    describe('Service Isolation Tests', () => {
        test('Apex queries should route to ApexService only', async () => {
            const apexQuery = 'días mínimos evaluación apex';
            const result = await gateway.processMessage(apexQuery, '12345');
            
            expect(result.success).toBe(true);
            expect(result.firm).toBe('apex');
            expect(result.response).toBeDefined();
            expect(result.response.toLowerCase()).toContain('apex');
            expect(result.response.toLowerCase()).not.toContain('bulenox');
            
            // Verify stats
            expect(gateway.stats.apexQueries).toBeGreaterThan(0);
            expect(gateway.stats.bulenoxQueries).toBe(0);
        });
        
        test('Bulenox queries should route to BulenoxService only', async () => {
            const bulenoxQuery = 'precio bulenox';
            const result = await gateway.processMessage(bulenoxQuery, '12346');
            
            expect(result.success).toBe(true);
            expect(result.firm).toBe('bulenox');
            expect(result.response).toBeDefined();
            expect(result.response.toLowerCase()).toContain('bulenox');
            expect(result.response.toLowerCase()).not.toContain('apex');
            
            // Verify stats
            expect(gateway.stats.bulenoxQueries).toBeGreaterThan(0);
        });
        
        test('Direct service calls should not cross-contaminate', async () => {
            // Test Apex service directly
            const apexResult = await apexService.processQuery('evaluación requisitos');
            expect(apexResult.success).toBe(true);
            expect(apexResult.firmName).toBe('Apex Trader Funding');
            
            // Test Bulenox service directly
            const bulenoxResult = await bulenoxService.processQuery('precio planes');
            expect(bulenoxResult.success).toBe(true);
            expect(bulenoxResult.firmName).toBe('Bulenox');
            
            // Ensure no cross-contamination
            expect(apexResult.response.toLowerCase()).not.toContain('bulenox');
            expect(bulenoxResult.response.toLowerCase()).not.toContain('apex');
        });
    });
    
    describe('Cross-Contamination Prevention', () => {
        test('ApexService should reject responses mentioning Bulenox', () => {
            const contaminatedResponse = 'Apex is great but Bulenox also offers similar features';
            
            expect(() => {
                apexService.validateResponse(contaminatedResponse);
            }).toThrow('Cross-contamination detected');
        });
        
        test('BulenoxService should reject responses mentioning Apex', () => {
            const contaminatedResponse = 'Bulenox is good but you might also consider Apex Trader Funding';
            
            expect(() => {
                bulenoxService.validateResponse(contaminatedResponse);
            }).toThrow('Cross-contamination detected');
        });
        
        test('Both services should detect case-insensitive contamination', () => {
            const apexContamination = 'This response mentions BULENOX somewhere';
            const bulenoxContamination = 'This response mentions APEX somewhere';
            
            expect(() => apexService.validateResponse(apexContamination)).toThrow();
            expect(() => bulenoxService.validateResponse(bulenoxContamination)).toThrow();
        });
    });
    
    describe('Router Firm Detection', () => {
        test('Should correctly detect Apex patterns', async () => {
            const apexQueries = [
                'apex evaluation days',
                'ATF requirements',
                'trader funding rules',
                'pregunta sobre apex'
            ];
            
            for (const query of apexQueries) {
                const result = await gateway.processMessage(query, `user_${Math.random()}`);
                expect(result.firm).toBe('apex');
            }
        });
        
        test('Should correctly detect Bulenox patterns', async () => {
            const bulenoxQueries = [
                'bulenox precio',
                'información sobre bule',
                'reglas de bulenox',
                'pregunta sobre bulenox'
            ];
            
            for (const query of bulenoxQueries) {
                const result = await gateway.processMessage(query, `user_${Math.random()}`);
                expect(result.firm).toBe('bulenox');
            }
        });
        
        test('Should maintain context isolation between users', async () => {
            // User A asks about Apex
            const userA = 'user_a';
            const apexResult = await gateway.processMessage('apex evaluation', userA);
            expect(apexResult.firm).toBe('apex');
            
            // User B asks about Bulenox
            const userB = 'user_b';
            const bulenoxResult = await gateway.processMessage('bulenox pricing', userB);
            expect(bulenoxResult.firm).toBe('bulenox');
            
            // User A's next query without firm mention should still route to Apex (context)
            const contextResult = await gateway.processMessage('minimum days required', userA);
            expect(contextResult.firm).toBe('apex');
        });
    });
    
    describe('Service Health and Statistics', () => {
        test('Gateway health should include both services', () => {
            const health = gateway.getHealth();
            
            expect(health.apex).toBeDefined();
            expect(health.bulenox).toBeDefined();
            expect(health.apex.service).toBe('ApexService');
            expect(health.bulenox.service).toBe('BulenoxService');
            expect(health.apex.isInitialized).toBe(true);
            expect(health.bulenox.isInitialized).toBe(true);
        });
        
        test('Both services should have loaded FAQs', () => {
            const apexHealth = apexService.getHealth();
            const bulenoxHealth = bulenoxService.getHealth();
            
            expect(apexHealth.faqsLoaded).toBeGreaterThan(0);
            expect(bulenoxHealth.faqsLoaded).toBeGreaterThan(0);
            expect(apexHealth.firmId).toBe('854bf730-8420-4297-86f8-3c4a972edcf2');
            expect(bulenoxHealth.firmId).toBe('7567df00-7cf8-4afc-990f-6f8da04e36a4');
        });
        
        test('Statistics should track queries for both services', async () => {
            const initialStats = { ...gateway.stats };
            
            // Process some Apex queries
            await gateway.processMessage('apex question 1', 'user1');
            await gateway.processMessage('apex question 2', 'user2');
            
            // Process some Bulenox queries
            await gateway.processMessage('bulenox question 1', 'user3');
            await gateway.processMessage('bulenox question 2', 'user4');
            
            const finalStats = gateway.stats;
            
            expect(finalStats.apexQueries).toBe(initialStats.apexQueries + 2);
            expect(finalStats.bulenoxQueries).toBe(initialStats.bulenoxQueries + 2);
            expect(finalStats.firmDetections).toBe(initialStats.firmDetections + 4);
            expect(finalStats.totalMessages).toBe(initialStats.totalMessages + 4);
        });
    });
    
    describe('Error Handling', () => {
        test('Services should handle uninitialized state gracefully', async () => {
            const newApexService = new ApexService();
            const newBulenoxService = new BulenoxService();
            
            const apexResult = await newApexService.processQuery('test');
            const bulenoxResult = await newBulenoxService.processQuery('test');
            
            expect(apexResult.success).toBe(false);
            expect(bulenoxResult.success).toBe(false);
            expect(apexResult.error).toContain('not initialized');
            expect(bulenoxResult.error).toContain('not initialized');
        });
        
        test('Gateway should handle service errors gracefully', async () => {
            // This would typically simulate service failures
            // For now, we test that the gateway structure supports error handling
            const result = await gateway.processMessage('invalid query format', 'test_user');
            expect(result).toBeDefined();
            expect(typeof result.success).toBe('boolean');
        });
    });
});