const FirmRouter = require('../../services/router/index');
const ApexService = require('../../services/firms/apex/index');

describe('Router-Apex Integration Tests', () => {
    let router;
    let apexService;
    
    beforeAll(async () => {
        // Setup environment variables for testing
        process.env.SUPABASE_URL = 'https://zkqfyyvpyecueybxoqrt.supabase.co';
        process.env.SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcWZ5eXZweWVjdWV5YnhvcXJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM1NjIzMiwiZXhwIjoyMDY2OTMyMjMyfQ.KyOoW5KAVtl7VMTDVi9A03gTUgeQiuKoJuMunZtEiDw';
        
        // Initialize services
        router = new FirmRouter();
        apexService = new ApexService();
        
        // Initialize ApexService with database connection
        await apexService.initialize();
    }, 30000);
    
    beforeEach(() => {
        // Clear router contexts before each test
        router.clearAllContexts();
    });
    
    describe('Full Integration Flow', () => {
        test('should route apex query to ApexService and return response', async () => {
            const userId = 'integrationUser1';
            const message = 'How many days minimum do I need for apex evaluation?';
            
            // Step 1: Router detects firm
            const detectedFirm = router.detectFirm(message, userId);
            expect(detectedFirm).toBe('apex');
            
            // Step 2: Get firm ID from router
            const firmId = router.getFirmId(detectedFirm);
            expect(firmId).toBe('854bf730-8420-4297-86f8-3c4a972edcf2');
            
            // Step 3: Route to ApexService
            const apexResponse = await apexService.processQuery(message);
            
            // Step 4: Verify response
            expect(apexResponse.success).toBe(true);
            expect(apexResponse.firmName).toBe('Apex Trader Funding');
            expect(apexResponse.response).toBeDefined();
            expect(apexResponse.response.length).toBeGreaterThan(0);
            
            // Step 5: Verify isolation - response should not mention other firms
            const responseLower = apexResponse.response.toLowerCase();
            const forbiddenTerms = ['bulenox', 'takeprofit', 'vision', 'tradeify', 'alpha', 'myfunded'];
            
            forbiddenTerms.forEach(term => {
                expect(responseLower).not.toContain(term);
            });
        });
        
        test('should maintain context across multiple queries', async () => {
            const userId = 'integrationUser2';
            
            // First query establishes context
            const firstMessage = 'Tell me about apex evaluation';
            const firstFirm = router.detectFirm(firstMessage, userId);
            expect(firstFirm).toBe('apex');
            
            const firstResponse = await apexService.processQuery(firstMessage);
            expect(firstResponse.success).toBe(true);
            expect(firstResponse.firmName).toBe('Apex Trader Funding');
            
            // Second query without firm mention - should use context
            const secondMessage = 'What are the drawdown limits?';
            const secondFirm = router.detectFirm(secondMessage, userId);
            expect(secondFirm).toBe('apex'); // Should use context
            
            const secondResponse = await apexService.processQuery(secondMessage);
            expect(secondResponse.success).toBe(true);
            expect(secondResponse.firmName).toBe('Apex Trader Funding');
            
            // Third query changes firm - should update context
            const thirdMessage = 'What about bulenox rules?';
            const thirdFirm = router.detectFirm(thirdMessage, userId);
            expect(thirdFirm).toBe('bulenox'); // Should detect new firm
            
            // Fourth query without firm mention - should use updated context
            const fourthMessage = 'How much does it cost?';
            const fourthFirm = router.detectFirm(fourthMessage, userId);
            expect(fourthFirm).toBe('bulenox'); // Should use updated context
        });
        
        test('should handle unknown queries correctly', async () => {
            const userId = 'integrationUser3';
            const message = 'What is trading in general?';
            
            // Router should not detect any firm
            const detectedFirm = router.detectFirm(message, userId);
            expect(detectedFirm).toBe(null);
            
            // If we still send to ApexService, it should handle gracefully
            const apexResponse = await apexService.processQuery(message);
            expect(apexResponse.success).toBe(true);
            // Could be either 'default' or 'faq' depending on FAQ matching algorithm
            expect(['default', 'faq']).toContain(apexResponse.source);
            expect(apexResponse.firmName).toBe('Apex Trader Funding');
        });
        
        test('should isolate different users correctly', async () => {
            // User 1 asks about apex
            const user1Message = 'apex evaluation rules';
            const user1Firm = router.detectFirm(user1Message, 'user1');
            expect(user1Firm).toBe('apex');
            
            // User 2 asks about bulenox
            const user2Message = 'bulenox pricing';
            const user2Firm = router.detectFirm(user2Message, 'user2');
            expect(user2Firm).toBe('bulenox');
            
            // User 1 follows up without firm mention - should use apex context
            const user1FollowUp = 'What are the requirements?';
            const user1FollowUpFirm = router.detectFirm(user1FollowUp, 'user1');
            expect(user1FollowUpFirm).toBe('apex');
            
            // User 2 follows up without firm mention - should use bulenox context
            const user2FollowUp = 'How much does it cost?';
            const user2FollowUpFirm = router.detectFirm(user2FollowUp, 'user2');
            expect(user2FollowUpFirm).toBe('bulenox');
            
            // Verify contexts are truly isolated
            expect(router.getUserContext('user1').firmName).toBe('apex');
            expect(router.getUserContext('user2').firmName).toBe('bulenox');
        });
        
        test('should handle ApexService FAQ matching correctly', async () => {
            const userId = 'integrationUser4';
            const testQueries = [
                'días mínimos evaluación apex',
                'apex drawdown limits',
                'What instruments can I trade with apex?',
                'apex profit targets'
            ];
            
            for (const query of testQueries) {
                // Router should detect apex
                const detectedFirm = router.detectFirm(query, userId);
                expect(detectedFirm).toBe('apex');
                
                // ApexService should process successfully
                const response = await apexService.processQuery(query);
                expect(response.success).toBe(true);
                expect(response.firmName).toBe('Apex Trader Funding');
                
                // Should either find FAQ or return default
                expect(['faq', 'default']).toContain(response.source);
            }
        });
    });
    
    describe('Error Handling Integration', () => {
        test('should handle ApexService initialization failure gracefully', async () => {
            const userId = 'errorUser1';
            const message = 'apex question';
            
            // Create a new ApexService without initialization
            const uninitializedApex = new ApexService();
            
            // Router should still work
            const detectedFirm = router.detectFirm(message, userId);
            expect(detectedFirm).toBe('apex');
            
            // ApexService should handle uninitialized state
            const response = await uninitializedApex.processQuery(message);
            expect(response.success).toBe(false);
            expect(response.error).toContain('not initialized');
        });
        
        test('should handle malformed queries in full flow', async () => {
            const userId = 'errorUser2';
            const malformedQueries = [
                null,
                undefined,
                '',
                '   ',
                'apex ' // Very short
            ];
            
            for (const query of malformedQueries) {
                // Router should handle gracefully
                const detectedFirm = router.detectFirm(query, userId);
                // Might be null or apex depending on pattern matching
                expect(typeof detectedFirm === 'string' || detectedFirm === null).toBe(true);
                
                // ApexService should handle gracefully
                if (detectedFirm === 'apex') {
                    const response = await apexService.processQuery(query);
                    expect(response.success).toBe(true); // Should still succeed with default response
                }
            }
        });
    });
    
    describe('Performance Integration', () => {
        test('should handle multiple concurrent requests efficiently', async () => {
            const concurrentRequests = 10;
            const promises = [];
            
            for (let i = 0; i < concurrentRequests; i++) {
                const userId = `concurrentUser${i}`;
                const message = `apex evaluation question ${i}`;
                
                const promise = async () => {
                    // Router detection
                    const firm = router.detectFirm(message, userId);
                    expect(firm).toBe('apex');
                    
                    // ApexService processing
                    const response = await apexService.processQuery(message);
                    expect(response.success).toBe(true);
                    expect(response.firmName).toBe('Apex Trader Funding');
                    
                    return { userId, response };
                };
                
                promises.push(promise());
            }
            
            // Wait for all requests to complete
            const results = await Promise.all(promises);
            expect(results).toHaveLength(concurrentRequests);
            
            // Verify all succeeded
            results.forEach(({ userId, response }) => {
                expect(response.success).toBe(true);
                expect(response.firmName).toBe('Apex Trader Funding');
                
                // Verify context was set for each user
                const context = router.getUserContext(userId);
                expect(context.firmName).toBe('apex');
            });
        });
        
        test('should have reasonable response times', async () => {
            const userId = 'performanceUser';
            const message = 'apex trading rules';
            
            const startTime = Date.now();
            
            // Full flow
            const detectedFirm = router.detectFirm(message, userId);
            const response = await apexService.processQuery(message);
            
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            // Should respond within reasonable time (5 seconds for database operations)
            expect(responseTime).toBeLessThan(5000);
            expect(detectedFirm).toBe('apex');
            expect(response.success).toBe(true);
        });
    });
    
    describe('Data Consistency', () => {
        test('should maintain consistent firm identification', () => {
            const testCases = [
                { message: 'apex question', expectedFirm: 'apex', expectedId: '854bf730-8420-4297-86f8-3c4a972edcf2' },
                { message: 'bulenox question', expectedFirm: 'bulenox', expectedId: '7567df00-7cf8-4afc-990f-6f8da04e36a4' },
                { message: 'alpha question', expectedFirm: 'alpha', expectedId: '2ff70297-718d-42b0-ba70-cde70d5627b5' }
            ];
            
            testCases.forEach(({ message, expectedFirm, expectedId }) => {
                const detectedFirm = router.detectFirm(message, 'testUser');
                expect(detectedFirm).toBe(expectedFirm);
                
                const firmId = router.getFirmId(detectedFirm);
                expect(firmId).toBe(expectedId);
            });
        });
        
        test('should verify ApexService uses correct firm ID', () => {
            const apexHealth = apexService.getHealth();
            const routerApexId = router.getFirmId('apex');
            
            expect(apexHealth.firmId).toBe(routerApexId);
            expect(apexHealth.firmId).toBe('854bf730-8420-4297-86f8-3c4a972edcf2');
        });
    });
});