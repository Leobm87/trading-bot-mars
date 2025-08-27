const ApexService = require('../services/firms/apex/index.js');

// Mock environment variables
process.env.SUPABASE_URL = 'https://zkqfyyvpyecueybxoqrt.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-key';

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        from: (table) => {
            const mockQuery = {
                select: () => mockQuery,
                eq: (field, value) => {
                    if (field === 'firm_id' && value === '854bf730-8420-4297-86f8-3c4a972edcf2') {
                        if (table === 'faqs') {
                            return Promise.resolve({
                                data: [
                                    {
                                        id: 'faq1',
                                        question: '¿Cuál es el precio de las cuentas?',
                                        answer_md: 'Las cuentas tienen diferentes precios según el tamaño.',
                                        slug: 'precio-cuentas',
                                        category: 'pricing',
                                        firm_id: '854bf730-8420-4297-86f8-3c4a972edcf2'
                                    }
                                ],
                                error: null
                            });
                        }
                        if (table === 'account_plans') {
                            return Promise.resolve({
                                data: [
                                    {
                                        id: 'plan1',
                                        name: '$25K Challenge',
                                        price: 139,
                                        account_size: 25000,
                                        profit_target: 2500,
                                        max_daily_loss: 1000,
                                        max_total_drawdown: 2500,
                                        description: 'Cuenta de evaluación de $25,000',
                                        firm_id: '854bf730-8420-4297-86f8-3c4a972edcf2'
                                    },
                                    {
                                        id: 'plan2',
                                        name: '$50K Challenge',
                                        price: 259,
                                        account_size: 50000,
                                        profit_target: 5000,
                                        max_daily_loss: 2000,
                                        max_total_drawdown: 5000,
                                        description: 'Cuenta de evaluación de $50,000',
                                        firm_id: '854bf730-8420-4297-86f8-3c4a972edcf2'
                                    },
                                    {
                                        id: 'plan3',
                                        name: '$100K Challenge',
                                        price: 459,
                                        account_size: 100000,
                                        profit_target: 10000,
                                        max_daily_loss: 4000,
                                        max_total_drawdown: 10000,
                                        description: 'Cuenta de evaluación de $100,000',
                                        firm_id: '854bf730-8420-4297-86f8-3c4a972edcf2'
                                    }
                                ],
                                error: null
                            });
                        }
                    }
                    
                    // Handle prop_firms table with .single() chain
                    if (field === 'id' && value === '854bf730-8420-4297-86f8-3c4a972edcf2' && table === 'prop_firms') {
                        return {
                            single: () => Promise.resolve({
                                data: {
                                    id: '854bf730-8420-4297-86f8-3c4a972edcf2',
                                    name: 'Apex Trader Funding',
                                    website: 'https://www.apextrading.com',
                                    discount_code: 'APEX10',
                                    description: 'Leading prop trading firm with competitive rates',
                                    features: 'Fast payouts, no minimum trading days, 24/7 support'
                                },
                                error: null
                            })
                        };
                    }
                    
                    return Promise.resolve({ data: [], error: null });
                },
                single: () => {
                    return Promise.resolve({ data: null, error: { message: 'Not found' } });
                }
            };
            return mockQuery;
        }
    })
}));

describe('ApexService Pricing Tests', () => {
    let apexService;

    beforeEach(async () => {
        apexService = new ApexService();
        await apexService.initialize();
    });

    describe('Pricing Queries', () => {
        test('should return account_plans data for pricing queries', async () => {
            const result = await apexService.processQuery('¿Cuál es el precio de las cuentas?');
            
            expect(result.success).toBe(true);
            expect(result.source).toBe('pricing');
            expect(result.firmName).toBe('Apex Trader Funding');
            expect(result.response).toContain('$25,000');
            expect(result.response).toContain('$139');
            expect(result.response).toContain('$50,000');
            expect(result.response).toContain('$259');
            expect(result.response).toContain('$100,000');
            expect(result.response).toContain('$459');
            expect(result.response).toContain('APEX10');
        });

        test('should return pricing data with discount code', async () => {
            const result = await apexService.processQuery('precio');
            
            expect(result.success).toBe(true);
            expect(result.source).toBe('pricing');
            expect(result.response).toContain('Código de descuento:** APEX10');
            expect(result.response).toContain('https://www.apextrading.com');
        });

        test('should include profit targets and drawdown limits in pricing', async () => {
            const result = await apexService.processQuery('costo de cuentas');
            
            expect(result.success).toBe(true);
            expect(result.response).toContain('Meta de ganancia: $2,500');
            expect(result.response).toContain('Pérdida diaria máx: $1,000');
            expect(result.response).toContain('Drawdown máximo: $2,500');
        });
    });

    describe('Account Size Queries', () => {
        test('should return account sizes for account queries', async () => {
            const result = await apexService.processQuery('¿Qué tamaños de cuenta tienen disponibles?');
            
            expect(result.success).toBe(true);
            expect(result.source).toBe('account');
            expect(result.firmName).toBe('Apex Trader Funding');
            expect(result.response).toContain('$25,000');
            expect(result.response).toContain('$50,000');
            expect(result.response).toContain('$100,000');
            expect(result.response).toContain('$25K Challenge');
            expect(result.response).toContain('$50K Challenge');
            expect(result.response).toContain('$100K Challenge');
        });

        test('should show account descriptions', async () => {
            const result = await apexService.processQuery('cuenta size');
            
            expect(result.success).toBe(true);
            expect(result.response).toContain('Cuenta de evaluación de $25,000');
            expect(result.response).toContain('Cuenta de evaluación de $50,000');
            expect(result.response).toContain('Cuenta de evaluación de $100,000');
        });
    });

    describe('Firm Info Queries', () => {
        test('should return prop_firms data for info queries', async () => {
            const result = await apexService.processQuery('¿Cuál es el website de apex?');
            
            expect(result.success).toBe(true);
            expect(result.source).toBe('info');
            expect(result.firmName).toBe('Apex Trader Funding');
            expect(result.response).toContain('Apex Trader Funding');
            expect(result.response).toContain('https://www.apextrading.com');
            expect(result.response).toContain('APEX10');
            expect(result.response).toContain('Leading prop trading firm with competitive rates');
            expect(result.response).toContain('Fast payouts, no minimum trading days, 24/7 support');
        });

        test('should show discount code in firm info', async () => {
            const result = await apexService.processQuery('discount code');
            
            expect(result.success).toBe(true);
            expect(result.response).toContain('Código de descuento:** APEX10');
        });
    });

    describe('FAQ Fallback', () => {
        test('should fallback to FAQ matching for non-specific queries', async () => {
            const result = await apexService.processQuery('información general');
            
            expect(result.success).toBe(true);
            expect(['faq', 'ai-faq', 'default']).toContain(result.source);
            expect(result.firmName).toBe('Apex Trader Funding');
        });

        test('should handle unmatched queries with default response', async () => {
            const result = await apexService.processQuery('pregunta muy específica que no existe');
            
            expect(result.success).toBe(true);
            expect(result.source).toBe('default');
            expect(result.response).toContain('apex.com');
            expect(result.response).toContain('código de descuento');
        });
    });

    describe('Data Validation', () => {
        test('should load all data sources correctly', async () => {
            const health = apexService.getHealth();
            
            expect(health.isInitialized).toBe(true);
            expect(health.faqsLoaded).toBeGreaterThan(0);
            expect(apexService.plansCache.size).toBe(3);
            expect(apexService.firmInfo).toBeTruthy();
            expect(apexService.firmInfo.name).toBe('Apex Trader Funding');
        });

        test('should prevent cross-contamination in responses', async () => {
            const result = await apexService.processQuery('precio');
            
            expect(result.response.toLowerCase()).not.toContain('bulenox');
            expect(result.response.toLowerCase()).not.toContain('takeprofit');
            expect(result.response.toLowerCase()).not.toContain('vision');
            expect(result.response.toLowerCase()).not.toContain('tradeify');
            expect(result.response.toLowerCase()).not.toContain('myfunded');
        });

        test('should have correct firm ID and name', () => {
            expect(apexService.APEX_FIRM_ID).toBe('854bf730-8420-4297-86f8-3c4a972edcf2');
            expect(apexService.APEX_FIRM_NAME).toBe('Apex Trader Funding');
        });
    });

    describe('Query Classification', () => {
        test('should classify pricing queries correctly', () => {
            const classification = apexService.classifyQuery('¿Cuál es el precio?');
            expect(classification.pricing).toBe(true);
            expect(classification.classification).toBe('pricing');
        });

        test('should classify account queries correctly', () => {
            const classification = apexService.classifyQuery('¿Qué tamaños de cuenta tienen?');
            expect(classification.account).toBe(true);
            expect(classification.classification).toBe('account');
        });

        test('should classify info queries correctly', () => {
            const classification = apexService.classifyQuery('¿Cuál es el website?');
            expect(classification.info).toBe(true);
            expect(classification.classification).toBe('info');
        });
    });
});