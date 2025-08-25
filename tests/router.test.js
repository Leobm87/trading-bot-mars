const FirmRouter = require('../services/router/index');

describe('FirmRouter Tests', () => {
    let router;
    
    beforeEach(() => {
        router = new FirmRouter();
        // Clear all contexts before each test
        router.clearAllContexts();
    });
    
    afterEach(() => {
        // Clean up after each test
        router.clearAllContexts();
    });
    
    describe('Initialization', () => {
        test('should initialize with correct firm patterns', () => {
            const health = router.getHealth();
            
            expect(health.service).toBe('FirmRouter');
            expect(health.firmsSupported).toBe(7);
            expect(health.patterns).toContain('apex');
            expect(health.patterns).toContain('bulenox');
            expect(health.patterns).toContain('takeprofit');
            expect(health.patterns).toContain('myfunded');
            expect(health.patterns).toContain('alpha');
            expect(health.patterns).toContain('tradeify');
            expect(health.patterns).toContain('vision');
        });
        
        test('should have correct firm ID mappings', () => {
            expect(router.getFirmId('apex')).toBe('854bf730-8420-4297-86f8-3c4a972edcf2');
            expect(router.getFirmId('bulenox')).toBe('7567df00-7cf8-4afc-990f-6f8da04e36a4');
            expect(router.getFirmId('takeprofit')).toBe('08a7b506-4836-486a-a6e9-df12059c55d3');
            expect(router.getFirmId('myfunded')).toBe('1b40dc38-91ff-4a35-be46-1bf2d5749433');
            expect(router.getFirmId('alpha')).toBe('2ff70297-718d-42b0-ba70-cde70d5627b5');
            expect(router.getFirmId('tradeify')).toBe('1a95b01e-4eef-48e2-bd05-6e2f79ca57a8');
            expect(router.getFirmId('vision')).toBe('2e82148c-9646-4dde-8240-f1871334a676');
        });
        
        test('should return null for unknown firm', () => {
            expect(router.getFirmId('unknown')).toBe(null);
        });
    });
    
    describe('Firm Detection - Explicit Matches', () => {
        test('should detect apex firm variations', () => {
            const testCases = [
                'How does apex work?',
                'Tell me about APEX',
                'Apex Trader Funding rules',
                'What is ATF policy?',
                'Trader funding questions'
            ];
            
            testCases.forEach(message => {
                const result = router.detectFirm(message, 'user1');
                expect(result).toBe('apex');
            });
        });
        
        test('should detect bulenox firm', () => {
            const testCases = [
                'What about bulenox?',
                'BULENOX pricing',
                'Tell me about bule'
            ];
            
            testCases.forEach(message => {
                const result = router.detectFirm(message, 'user2');
                expect(result).toBe('bulenox');
            });
        });
        
        test('should detect takeprofit firm', () => {
            const testCases = [
                'TakeProfit rules',
                'Take Profit evaluation',
                'What is TPT policy?'
            ];
            
            testCases.forEach(message => {
                const result = router.detectFirm(message, 'user3');
                expect(result).toBe('takeprofit');
            });
        });
        
        test('should detect myfunded firm', () => {
            const testCases = [
                'MFF questions',
                'My Funded Futures',
                'myfunded policy'
            ];
            
            testCases.forEach(message => {
                const result = router.detectFirm(message, 'user4');
                expect(result).toBe('myfunded');
            });
        });
        
        test('should detect alpha firm', () => {
            const testCases = [
                'Alpha futures rules',
                'ALPHA pricing',
                'alpha evaluation'
            ];
            
            testCases.forEach(message => {
                const result = router.detectFirm(message, 'user5');
                expect(result).toBe('alpha');
            });
        });
        
        test('should detect tradeify firm', () => {
            const testCases = [
                'Tradeify account',
                'TRADEIFY rules',
                'tradeify pricing'
            ];
            
            testCases.forEach(message => {
                const result = router.detectFirm(message, 'user6');
                expect(result).toBe('tradeify');
            });
        });
        
        test('should detect vision firm', () => {
            const testCases = [
                'Vision trade rules',
                'VISION account',
                'vision evaluation'
            ];
            
            testCases.forEach(message => {
                const result = router.detectFirm(message, 'user7');
                expect(result).toBe('vision');
            });
        });
        
        test('should return null for unknown text', () => {
            const testCases = [
                'Hello there',
                'What is trading?',
                'General question',
                'Random text here',
                'No firm mentioned'
            ];
            
            testCases.forEach(message => {
                const result = router.detectFirm(message, 'user8');
                expect(result).toBe(null);
            });
        });
    });
    
    describe('User Context Management', () => {
        test('should maintain user context for 5 minutes', () => {
            const userId = 'contextUser1';
            
            // First detection creates context
            const firstResult = router.detectFirm('How does apex work?', userId);
            expect(firstResult).toBe('apex');
            
            // Second query without firm mention should use context
            const secondResult = router.detectFirm('What are the rules?', userId);
            expect(secondResult).toBe('apex');
            
            // Verify context information
            const context = router.getUserContext(userId);
            expect(context.firmName).toBe('apex');
            expect(context.isExpired).toBe(false);
            expect(context.source).toBe('explicit');
        });
        
        test('should update context when new firm is detected', () => {
            const userId = 'contextUser2';
            
            // Set initial context
            router.detectFirm('apex question', userId);
            expect(router.detectFirm('general question', userId)).toBe('apex');
            
            // Change to different firm
            router.detectFirm('bulenox question', userId);
            expect(router.detectFirm('another general question', userId)).toBe('bulenox');
        });
        
        test('should handle multiple users independently', () => {
            // User 1 asks about apex
            const user1Result = router.detectFirm('apex question', 'user1');
            expect(user1Result).toBe('apex');
            
            // User 2 asks about bulenox
            const user2Result = router.detectFirm('bulenox question', 'user2');
            expect(user2Result).toBe('bulenox');
            
            // Verify contexts are independent
            expect(router.detectFirm('general question', 'user1')).toBe('apex');
            expect(router.detectFirm('general question', 'user2')).toBe('bulenox');
        });
        
        test('should clear individual user context', () => {
            const userId = 'clearUser';
            
            // Set context
            router.detectFirm('apex question', userId);
            expect(router.getUserContext(userId)).toBeTruthy();
            
            // Clear context
            const cleared = router.clearUserContext(userId);
            expect(cleared).toBe(true);
            expect(router.getUserContext(userId)).toBe(null);
            
            // Should not use context anymore
            expect(router.detectFirm('general question', userId)).toBe(null);
        });
        
        test('should clear all contexts', () => {
            // Set contexts for multiple users
            router.detectFirm('apex question', 'user1');
            router.detectFirm('bulenox question', 'user2');
            router.detectFirm('alpha question', 'user3');
            
            expect(router.getHealth().activeContexts).toBe(3);
            
            // Clear all
            const cleared = router.clearAllContexts();
            expect(cleared).toBe(3);
            expect(router.getHealth().activeContexts).toBe(0);
        });
    });
    
    describe('Context Expiration', () => {
        test('should expire contexts after TTL', (done) => {
            const userId = 'expireUser';
            
            // Mock shorter TTL for testing
            const originalTTL = router.contextTTL;
            router.contextTTL = 100; // 100ms for testing
            
            // Set context
            router.detectFirm('apex question', userId);
            expect(router.getUserContext(userId)).toBeTruthy();
            
            // Wait for expiration
            setTimeout(() => {
                // The getUserContext method should return null for expired contexts
                const contextResult = router.getUserContextFirm(userId);
                expect(contextResult).toBe(null);
                
                // Should not use expired context
                expect(router.detectFirm('general question', userId)).toBe(null);
                
                // Restore original TTL
                router.contextTTL = originalTTL;
                done();
            }, 150);
        }, 10000);
        
        test('should cleanup expired contexts automatically', (done) => {
            const userId = 'cleanupUser';
            
            // Mock shorter TTL for testing
            const originalTTL = router.contextTTL;
            router.contextTTL = 50; // 50ms for testing
            
            // Set context
            router.detectFirm('apex question', userId);
            expect(router.getHealth().activeContexts).toBe(1);
            
            // Wait for cleanup
            setTimeout(() => {
                router.clearExpiredContexts();
                expect(router.getHealth().activeContexts).toBe(0);
                
                // Restore original TTL
                router.contextTTL = originalTTL;
                done();
            }, 100);
        });
    });
    
    describe('Error Handling', () => {
        test('should handle malformed messages gracefully', () => {
            const malformedMessages = [
                null,
                undefined,
                '',
                '   ',
                123,
                {},
                []
            ];
            
            malformedMessages.forEach(message => {
                expect(() => {
                    const result = router.detectFirm(message, 'testUser');
                    expect(result).toBe(null);
                }).not.toThrow();
            });
        });
        
        test('should handle invalid user IDs gracefully', () => {
            const invalidUserIds = [
                null,
                undefined,
                '',
                123,
                {},
                []
            ];
            
            invalidUserIds.forEach(userId => {
                expect(() => {
                    const result = router.detectFirm('apex question', userId);
                    // Should still work but might not store context properly
                    expect(typeof result).toBe('string');
                }).not.toThrow();
            });
        });
    });
    
    describe('Health Monitoring', () => {
        test('should provide comprehensive health information', () => {
            // Add some contexts
            router.detectFirm('apex question', 'user1');
            router.detectFirm('bulenox question', 'user2');
            
            const health = router.getHealth();
            
            expect(health).toHaveProperty('service', 'FirmRouter');
            expect(health).toHaveProperty('firmsSupported', 7);
            expect(health).toHaveProperty('activeContexts', 2);
            expect(health).toHaveProperty('contextTTL');
            expect(health).toHaveProperty('patterns');
            expect(health).toHaveProperty('uptime');
            expect(Array.isArray(health.patterns)).toBe(true);
            expect(typeof health.uptime).toBe('number');
        });
    });
});