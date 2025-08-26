/**
 * Shadow Testing Runner
 * Executes comprehensive shadow tests and generates reports
 */

const { ShadowComparator } = require('./shadow-comparator.js');
const { testSuites, expectedPatterns } = require('./test-queries.js');
const winston = require('winston');

class ShadowTestRunner {
    constructor() {
        this.comparator = new ShadowComparator();
        
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    return `${timestamp} [${level.toUpperCase()}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
                })
            ),
            transports: [
                new winston.transports.Console({ colorize: true })
            ]
        });
    }

    /**
     * Run smoke test (quick validation)
     */
    async runSmokeTest() {
        this.logger.info('🔍 Starting Shadow Smoke Test');
        this.logger.info('━'.repeat(50));
        
        try {
            const results = await this.comparator.runBatchTests(testSuites.smoke);
            const report = await this.comparator.generateReport();
            
            this.logger.info('✅ Smoke test completed', {
                totalTests: results.length,
                successRate: report.summary.successRate,
                avgResponseTime: `${report.summary.avgMarsTime}ms`
            });

            return report;
        } catch (error) {
            this.logger.error('❌ Smoke test failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Run isolation test (cross-contamination check)
     */
    async runIsolationTest() {
        this.logger.info('🔐 Starting Isolation Test');
        this.logger.info('━'.repeat(50));
        
        try {
            const results = await this.comparator.runBatchTests(testSuites.isolation);
            
            // Check for contamination
            const contaminatedTests = results.filter(result => 
                result.comparison?.analysis?.contamination?.length > 0
            );

            this.logger.info('🔐 Isolation test completed', {
                totalTests: results.length,
                contaminatedTests: contaminatedTests.length,
                isolationRate: `${((results.length - contaminatedTests.length) / results.length * 100).toFixed(1)}%`
            });

            if (contaminatedTests.length > 0) {
                this.logger.warn('⚠️  Cross-contamination detected:', {
                    examples: contaminatedTests.slice(0, 3).map(test => ({
                        query: test.query,
                        contaminants: test.comparison.analysis.contamination
                    }))
                });
            } else {
                this.logger.info('✅ Perfect isolation - no cross-contamination detected');
            }

            return results;
        } catch (error) {
            this.logger.error('❌ Isolation test failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Run performance test
     */
    async runPerformanceTest() {
        this.logger.info('⚡ Starting Performance Test');
        this.logger.info('━'.repeat(50));
        
        try {
            const results = await this.comparator.runBatchTests(testSuites.performance);
            
            // Analyze performance
            const marsResponses = results.filter(r => r.mars?.success);
            const avgMarsTime = marsResponses.reduce((sum, r) => sum + r.mars.responseTime, 0) / marsResponses.length;
            
            const legacyResponses = results.filter(r => r.legacy?.success);
            const avgLegacyTime = legacyResponses.reduce((sum, r) => sum + r.legacy.responseTime, 0) / legacyResponses.length;

            const performanceRatio = avgMarsTime / avgLegacyTime;

            this.logger.info('⚡ Performance test completed', {
                totalTests: results.length,
                avgMarsTime: `${avgMarsTime.toFixed(0)}ms`,
                avgLegacyTime: `${avgLegacyTime.toFixed(0)}ms`,
                performanceRatio: performanceRatio.toFixed(2),
                marsIsFaster: performanceRatio < 1
            });

            if (avgMarsTime > 2000) {
                this.logger.warn('⚠️  MARS response time exceeds 2s threshold');
            }

            return results;
        } catch (error) {
            this.logger.error('❌ Performance test failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Run context management test
     */
    async runContextTest() {
        this.logger.info('🧠 Starting Context Management Test');
        this.logger.info('━'.repeat(50));
        
        try {
            const results = await this.comparator.runBatchTests(testSuites.context);
            
            // Analyze context switching
            let contextSwitches = 0;
            let contextMaintained = 0;
            
            for (let i = 1; i < results.length; i++) {
                const current = results[i];
                const previous = results[i - 1];
                
                if (current.firmHint && current.firmHint !== previous.firmHint) {
                    contextSwitches++;
                }
                
                if (!current.firmHint && previous.firmHint && current.mars?.firm === previous.firmHint) {
                    contextMaintained++;
                }
            }

            this.logger.info('🧠 Context test completed', {
                totalTests: results.length,
                contextSwitches,
                contextMaintained,
                contextAccuracy: `${(contextMaintained / Math.max(contextSwitches, 1) * 100).toFixed(1)}%`
            });

            return results;
        } catch (error) {
            this.logger.error('❌ Context test failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Run comprehensive shadow test
     */
    async runFullShadowTest() {
        this.logger.info('🚀 Starting Comprehensive Shadow Test');
        this.logger.info('━'.repeat(80));
        
        const startTime = Date.now();
        
        try {
            // Run all test phases
            this.logger.info('Phase 1: Smoke Test');
            const smokeResults = await this.runSmokeTest();
            
            this.logger.info('\nPhase 2: Isolation Test');
            const isolationResults = await this.runIsolationTest();
            
            this.logger.info('\nPhase 3: Performance Test');
            const performanceResults = await this.runPerformanceTest();
            
            this.logger.info('\nPhase 4: Context Management Test');
            const contextResults = await this.runContextTest();
            
            this.logger.info('\nPhase 5: Full Test Suite');
            const fullResults = await this.comparator.runBatchTests(testSuites.full);
            const finalReport = await this.comparator.generateReport();

            const totalTime = Date.now() - startTime;

            // Generate comprehensive analysis
            const analysis = this.generateComprehensiveAnalysis(finalReport, {
                smoke: smokeResults,
                isolation: isolationResults,
                performance: performanceResults,
                context: contextResults,
                full: fullResults
            });

            this.logger.info('\n' + '━'.repeat(80));
            this.logger.info('🎯 SHADOW TEST SUMMARY');
            this.logger.info('━'.repeat(80));
            this.logger.info(`Total Duration: ${(totalTime / 1000).toFixed(1)}s`);
            this.logger.info(`Total Tests: ${finalReport.summary.totalTests}`);
            this.logger.info(`Success Rate: ${finalReport.summary.successRate}`);
            this.logger.info(`Error Rate: ${finalReport.summary.errorRate}`);
            this.logger.info(`Avg Response Time: MARS ${finalReport.summary.avgMarsTime.toFixed(0)}ms | Legacy ${finalReport.summary.avgLegacyTime.toFixed(0)}ms`);

            // Display recommendations
            if (finalReport.recommendations.length > 0) {
                this.logger.info('\n🔍 RECOMMENDATIONS:');
                finalReport.recommendations.forEach(rec => {
                    const icon = rec.priority === 'CRITICAL' ? '🚨' : 
                               rec.priority === 'HIGH' ? '⚠️' : 
                               rec.priority === 'MEDIUM' ? '📋' : '✅';
                    this.logger.info(`${icon} [${rec.priority}] ${rec.issue}: ${rec.description}`);
                });
            }

            // Cutover recommendation
            const cutoverReady = this.assessCutoverReadiness(finalReport);
            this.logger.info(`\n🚦 CUTOVER RECOMMENDATION: ${cutoverReady.decision.toUpperCase()}`);
            this.logger.info(`   Reason: ${cutoverReady.reason}`);

            return {
                report: finalReport,
                analysis,
                cutoverReady,
                testDuration: totalTime
            };

        } catch (error) {
            this.logger.error('❌ Comprehensive shadow test failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Generate comprehensive analysis across all test phases
     */
    generateComprehensiveAnalysis(finalReport, phaseResults) {
        return {
            reliability: {
                score: parseFloat(finalReport.summary.successRate),
                threshold: 95,
                status: parseFloat(finalReport.summary.successRate) >= 95 ? 'PASS' : 'FAIL'
            },
            performance: {
                marsAvgTime: finalReport.summary.avgMarsTime,
                legacyAvgTime: finalReport.summary.avgLegacyTime,
                ratio: finalReport.summary.avgMarsTime / finalReport.summary.avgLegacyTime,
                status: finalReport.summary.avgMarsTime < 2000 ? 'PASS' : 'FAIL'
            },
            isolation: {
                contaminatedTests: phaseResults.isolation.filter(r => 
                    r.comparison?.analysis?.contamination?.length > 0
                ).length,
                totalIsolationTests: phaseResults.isolation.length,
                status: phaseResults.isolation.every(r => !r.comparison?.analysis?.contamination?.length) ? 'PASS' : 'FAIL'
            },
            errorHandling: {
                errorRate: parseFloat(finalReport.summary.errorRate),
                threshold: 1,
                status: parseFloat(finalReport.summary.errorRate) <= 1 ? 'PASS' : 'FAIL'
            }
        };
    }

    /**
     * Assess if system is ready for production cutover
     */
    assessCutoverReadiness(report) {
        const successRate = parseFloat(report.summary.successRate);
        const errorRate = parseFloat(report.summary.errorRate);
        const avgResponseTime = report.summary.avgMarsTime;
        
        const criticalIssues = report.recommendations.filter(r => r.priority === 'CRITICAL').length;
        const highIssues = report.recommendations.filter(r => r.priority === 'HIGH').length;

        // Decision logic
        if (criticalIssues > 0) {
            return {
                decision: 'NOT_READY',
                reason: `${criticalIssues} critical issues must be resolved before cutover`,
                confidence: 'HIGH'
            };
        }

        if (successRate < 95) {
            return {
                decision: 'NOT_READY', 
                reason: `Success rate ${successRate}% is below 95% threshold`,
                confidence: 'HIGH'
            };
        }

        if (errorRate > 1) {
            return {
                decision: 'NOT_READY',
                reason: `Error rate ${errorRate}% exceeds 1% threshold`, 
                confidence: 'HIGH'
            };
        }

        if (avgResponseTime > 2000) {
            return {
                decision: 'CAUTION',
                reason: `Response time ${avgResponseTime}ms exceeds 2s target, but within acceptable range`,
                confidence: 'MEDIUM'
            };
        }

        if (highIssues > 2) {
            return {
                decision: 'CAUTION',
                reason: `${highIssues} high-priority issues should be considered before cutover`,
                confidence: 'MEDIUM'
            };
        }

        return {
            decision: 'READY',
            reason: `All criteria met: ${successRate}% success rate, ${errorRate}% error rate, ${avgResponseTime}ms avg response time`,
            confidence: 'HIGH'
        };
    }
}

// CLI execution
if (require.main === module) {
    const runner = new ShadowTestRunner();
    
    const testType = process.argv[2] || 'full';
    
    async function runTests() {
        try {
            switch (testType) {
                case 'smoke':
                    await runner.runSmokeTest();
                    break;
                case 'isolation':
                    await runner.runIsolationTest();
                    break;
                case 'performance':
                    await runner.runPerformanceTest();
                    break;
                case 'context':
                    await runner.runContextTest();
                    break;
                case 'full':
                default:
                    await runner.runFullShadowTest();
                    break;
            }
        } catch (error) {
            console.error('Shadow test execution failed:', error.message);
            process.exit(1);
        }
    }
    
    runTests();
}

module.exports = { ShadowTestRunner };