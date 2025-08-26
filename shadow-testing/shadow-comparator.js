/**
 * MARS Shadow Testing Service
 * Compares responses between Legacy Bot and MARS system
 */

const axios = require('axios');
const winston = require('winston');
const fs = require('fs').promises;
const path = require('path');

class ShadowComparator {
    constructor(config = {}) {
        this.legacyBotUrl = config.legacyBotUrl || 'https://telegram-bot-production-299b.up.railway.app';
        this.marsApiUrl = config.marsApiUrl || 'http://localhost:8080';
        this.testResults = [];
        this.metrics = {
            totalTests: 0,
            legacyResponses: 0,
            marsResponses: 0,
            matches: 0,
            differences: 0,
            errors: 0,
            avgLegacyTime: 0,
            avgMarsTime: 0
        };

        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({ 
                    filename: path.join(__dirname, 'shadow-test-results.log') 
                })
            ]
        });

        this.logger.info('ShadowComparator initialized', {
            legacyBotUrl: this.legacyBotUrl,
            marsApiUrl: this.marsApiUrl
        });
    }

    /**
     * Execute shadow test with single query
     */
    async runShadowTest(query, firmHint = null) {
        const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.logger.info(`Starting shadow test: ${testId}`, { query, firmHint });

        const testResult = {
            testId,
            query,
            firmHint,
            timestamp: new Date().toISOString(),
            legacy: null,
            mars: null,
            comparison: null
        };

        try {
            // Execute both requests in parallel
            const [legacyResult, marsResult] = await Promise.allSettled([
                this.queryLegacyBot(query),
                this.queryMarsSystem(query, firmHint)
            ]);

            // Process Legacy Bot result
            if (legacyResult.status === 'fulfilled') {
                testResult.legacy = legacyResult.value;
                this.metrics.legacyResponses++;
            } else {
                testResult.legacy = { 
                    success: false, 
                    error: legacyResult.reason.message,
                    responseTime: 0
                };
                this.metrics.errors++;
            }

            // Process MARS result
            if (marsResult.status === 'fulfilled') {
                testResult.mars = marsResult.value;
                this.metrics.marsResponses++;
            } else {
                testResult.mars = { 
                    success: false, 
                    error: marsResult.reason.message,
                    responseTime: 0
                };
                this.metrics.errors++;
            }

            // Compare results
            testResult.comparison = this.compareResponses(testResult.legacy, testResult.mars);
            
            if (testResult.comparison.match) {
                this.metrics.matches++;
            } else {
                this.metrics.differences++;
            }

            this.metrics.totalTests++;
            this.updateMetrics(testResult);

            this.testResults.push(testResult);
            this.logger.info(`Shadow test completed: ${testId}`, { 
                match: testResult.comparison.match,
                legacyTime: testResult.legacy?.responseTime || 0,
                marsTime: testResult.mars?.responseTime || 0
            });

            return testResult;

        } catch (error) {
            this.logger.error(`Shadow test failed: ${testId}`, { error: error.message });
            this.metrics.errors++;
            throw error;
        }
    }

    /**
     * Query Legacy Bot (simulated - would be actual HTTP request)
     */
    async queryLegacyBot(query) {
        const startTime = Date.now();
        
        try {
            // Simulate legacy bot response for now
            // In real implementation, this would be:
            // const response = await axios.post(`${this.legacyBotUrl}/api/query`, { query });
            
            await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500)); // Simulate network delay
            
            const responseTime = Date.now() - startTime;
            
            // Mock legacy response based on query content
            let mockResponse = "I'm sorry, I don't have specific information about that.";
            
            if (query.toLowerCase().includes('apex')) {
                mockResponse = "Apex Trader Funding offers evaluations starting at $50,000. The profit target is typically 8% for Phase 1 and 5% for Phase 2.";
            } else if (query.toLowerCase().includes('bulenox')) {
                mockResponse = "Bulenox provides trading challenges with various account sizes. Please check their official website for current requirements.";
            }
            
            return {
                success: true,
                response: mockResponse,
                responseTime,
                source: 'legacy'
            };
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            throw {
                success: false,
                error: error.message,
                responseTime,
                source: 'legacy'
            };
        }
    }

    /**
     * Query MARS System
     */
    async queryMarsSystem(query, firmHint = null) {
        const startTime = Date.now();
        
        try {
            // For local testing, we'll use the gateway directly
            const TelegramGateway = require('../services/gateway/index.js');
            
            if (!this.marsGateway) {
                this.marsGateway = new TelegramGateway({ 
                    mock: true,
                    mockMode: true
                });
                await this.marsGateway.initialize();
                this.logger.info('MARS Gateway initialized for shadow testing');
            }

            const response = await this.marsGateway.processMessage(query, 'shadow_test');

            const responseTime = Date.now() - startTime;

            return {
                success: true,
                response: response.text || response.response || response,
                responseTime,
                source: 'mars',
                firm: response.firm || null
            };

        } catch (error) {
            const responseTime = Date.now() - startTime;
            return {
                success: false,
                error: error.message,
                responseTime,
                source: 'mars'
            };
        }
    }

    /**
     * Compare responses between systems
     */
    compareResponses(legacy, mars) {
        const comparison = {
            match: false,
            similarity: 0,
            legacyLength: legacy?.response?.length || 0,
            marsLength: mars?.response?.length || 0,
            timeDifference: Math.abs((legacy?.responseTime || 0) - (mars?.responseTime || 0)),
            analysis: {}
        };

        if (!legacy?.success || !mars?.success) {
            comparison.analysis.note = 'One or both systems failed to respond';
            return comparison;
        }

        // Basic similarity check
        const legacyWords = legacy.response.toLowerCase().split(/\s+/);
        const marsWords = mars.response.toLowerCase().split(/\s+/);
        
        const commonWords = legacyWords.filter(word => 
            marsWords.includes(word) && word.length > 3
        );
        
        comparison.similarity = commonWords.length / Math.max(legacyWords.length, marsWords.length);
        comparison.match = comparison.similarity > 0.3; // 30% similarity threshold

        // Check for firm contamination in MARS response
        if (mars.response) {
            const contaminants = ['apex', 'bulenox', 'takeprofit', 'vision', 'tradeify', 'alpha', 'myfunded']
                .filter(firm => mars.response.toLowerCase().includes(firm));
            
            if (contaminants.length > 1) {
                comparison.analysis.contamination = contaminants;
                comparison.match = false;
            }
        }

        comparison.analysis.commonWords = commonWords.length;
        comparison.analysis.responsiveness = mars.responseTime < legacy.responseTime ? 'mars_faster' : 'legacy_faster';

        return comparison;
    }

    /**
     * Update running metrics
     */
    updateMetrics(testResult) {
        const legacyTime = testResult.legacy?.responseTime || 0;
        const marsTime = testResult.mars?.responseTime || 0;

        this.metrics.avgLegacyTime = (
            (this.metrics.avgLegacyTime * (this.metrics.totalTests - 1) + legacyTime) / 
            this.metrics.totalTests
        );

        this.metrics.avgMarsTime = (
            (this.metrics.avgMarsTime * (this.metrics.totalTests - 1) + marsTime) / 
            this.metrics.totalTests
        );
    }

    /**
     * Run batch tests with predefined queries
     */
    async runBatchTests(testQueries) {
        this.logger.info(`Starting batch shadow tests`, { totalQueries: testQueries.length });
        
        const batchResults = [];
        
        for (const queryConfig of testQueries) {
            try {
                const result = await this.runShadowTest(
                    queryConfig.query, 
                    queryConfig.firmHint
                );
                batchResults.push(result);
                
                // Small delay between tests
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                this.logger.error('Batch test failed', { 
                    query: queryConfig.query, 
                    error: error.message 
                });
            }
        }

        return batchResults;
    }

    /**
     * Generate comprehensive test report
     */
    async generateReport() {
        const report = {
            summary: {
                ...this.metrics,
                successRate: this.metrics.totalTests > 0 ? 
                    (this.metrics.matches / this.metrics.totalTests * 100).toFixed(2) + '%' : '0%',
                errorRate: this.metrics.totalTests > 0 ? 
                    (this.metrics.errors / this.metrics.totalTests * 100).toFixed(2) + '%' : '0%'
            },
            testResults: this.testResults,
            analysis: this.analyzeResults(),
            recommendations: this.generateRecommendations()
        };

        // Save report to file
        const reportPath = path.join(__dirname, `shadow-report-${Date.now()}.json`);
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        this.logger.info('Shadow test report generated', { 
            reportPath,
            totalTests: this.metrics.totalTests,
            successRate: report.summary.successRate
        });

        return report;
    }

    /**
     * Analyze test results for patterns
     */
    analyzeResults() {
        const analysis = {
            performanceComparison: null,
            accuracyComparison: null,
            contamination: null,
            recommendations: []
        };

        if (this.testResults.length === 0) return analysis;

        // Performance Analysis
        analysis.performanceComparison = {
            marsIsFaster: this.metrics.avgMarsTime < this.metrics.avgLegacyTime,
            avgTimeDifference: Math.abs(this.metrics.avgMarsTime - this.metrics.avgLegacyTime),
            marsAvgTime: this.metrics.avgMarsTime,
            legacyAvgTime: this.metrics.avgLegacyTime
        };

        // Contamination Analysis
        const contaminatedTests = this.testResults.filter(test => 
            test.comparison?.analysis?.contamination?.length > 0
        );
        
        analysis.contamination = {
            detected: contaminatedTests.length,
            rate: (contaminatedTests.length / this.testResults.length * 100).toFixed(2) + '%',
            examples: contaminatedTests.slice(0, 3).map(test => ({
                query: test.query,
                contaminants: test.comparison.analysis.contamination
            }))
        };

        return analysis;
    }

    /**
     * Generate recommendations based on test results
     */
    generateRecommendations() {
        const recommendations = [];
        
        const successRate = this.metrics.matches / this.metrics.totalTests * 100;
        
        if (successRate < 95) {
            recommendations.push({
                priority: 'HIGH',
                issue: 'Low response accuracy',
                description: `Success rate is ${successRate.toFixed(1)}%, below 95% threshold`,
                action: 'Review FAQ matching algorithms and response validation'
            });
        }

        if (this.metrics.avgMarsTime > this.metrics.avgLegacyTime * 1.5) {
            recommendations.push({
                priority: 'MEDIUM',
                issue: 'Performance degradation',
                description: `MARS responses are ${((this.metrics.avgMarsTime / this.metrics.avgLegacyTime - 1) * 100).toFixed(1)}% slower`,
                action: 'Optimize service response times and database queries'
            });
        }

        const contaminatedTests = this.testResults.filter(test => 
            test.comparison?.analysis?.contamination?.length > 0
        );
        
        if (contaminatedTests.length > 0) {
            recommendations.push({
                priority: 'CRITICAL',
                issue: 'Cross-contamination detected',
                description: `${contaminatedTests.length} tests showed firm cross-contamination`,
                action: 'Review isolation mechanisms and response validation'
            });
        }

        if (this.metrics.errors / this.metrics.totalTests > 0.01) {
            recommendations.push({
                priority: 'HIGH',
                issue: 'High error rate',
                description: `Error rate is ${(this.metrics.errors / this.metrics.totalTests * 100).toFixed(1)}%`,
                action: 'Improve error handling and system stability'
            });
        }

        // Add positive recommendations
        if (successRate >= 95 && contaminatedTests.length === 0) {
            recommendations.push({
                priority: 'LOW',
                issue: 'System ready',
                description: 'MARS shows high accuracy with no contamination',
                action: 'Consider proceeding with production cutover'
            });
        }

        return recommendations;
    }
}

module.exports = { ShadowComparator };