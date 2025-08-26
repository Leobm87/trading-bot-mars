/**
 * Shadow Testing Queries
 * Comprehensive test cases for MARS vs Legacy Bot comparison
 */

const testQueries = [
    // Apex-specific queries
    {
        query: "What are Apex Trader Funding account sizes?",
        firmHint: "apex",
        category: "account_info",
        expectedFirm: "apex"
    },
    {
        query: "How much does an Apex evaluation cost?",
        firmHint: "apex", 
        category: "pricing",
        expectedFirm: "apex"
    },
    {
        query: "What is the profit target for Apex Phase 1?",
        firmHint: "apex",
        category: "rules",
        expectedFirm: "apex"
    },
    {
        query: "Does Apex allow news trading?",
        firmHint: "apex",
        category: "trading_rules",
        expectedFirm: "apex"
    },
    {
        query: "What is the maximum daily loss for Apex?",
        firmHint: "apex",
        category: "risk_management",
        expectedFirm: "apex"
    },

    // Bulenox-specific queries
    {
        query: "What account sizes does Bulenox offer?",
        firmHint: "bulenox",
        category: "account_info",
        expectedFirm: "bulenox"
    },
    {
        query: "How much does a Bulenox challenge cost?",
        firmHint: "bulenox",
        category: "pricing", 
        expectedFirm: "bulenox"
    },
    {
        query: "What is Bulenox profit target?",
        firmHint: "bulenox",
        category: "rules",
        expectedFirm: "bulenox"
    },
    {
        query: "Does Bulenox allow weekend trading?",
        firmHint: "bulenox",
        category: "trading_rules",
        expectedFirm: "bulenox"
    },
    {
        query: "What is the maximum loss limit for Bulenox?",
        firmHint: "bulenox",
        category: "risk_management",
        expectedFirm: "bulenox"
    },

    // Cross-contamination detection queries (should NOT mention other firms)
    {
        query: "Tell me about Apex and also about Bulenox",
        firmHint: null,
        category: "contamination_test",
        expectedIssue: "should_not_mix_firms"
    },
    {
        query: "Compare Apex vs Bulenox profit targets",
        firmHint: null,
        category: "contamination_test", 
        expectedIssue: "should_not_mix_firms"
    },
    {
        query: "Which is better, Apex or Bulenox?",
        firmHint: null,
        category: "contamination_test",
        expectedIssue: "should_not_mix_firms"
    },

    // Context switching queries
    {
        query: "What about Apex account sizes?",
        firmHint: "apex",
        category: "context_test",
        expectedFirm: "apex"
    },
    {
        query: "And what about profit targets?", // Should stay in Apex context
        firmHint: null,
        category: "context_test",
        expectedFirm: "apex"
    },
    {
        query: "Now tell me about Bulenox pricing",
        firmHint: "bulenox", 
        category: "context_test",
        expectedFirm: "bulenox"
    },
    {
        query: "What are the requirements?", // Should be in Bulenox context
        firmHint: null,
        category: "context_test",
        expectedFirm: "bulenox"
    },

    // General/Unknown queries
    {
        query: "What is forex trading?",
        firmHint: null,
        category: "general",
        expectedFirm: null
    },
    {
        query: "How do I start trading?",
        firmHint: null,
        category: "general",
        expectedFirm: null
    },
    {
        query: "Tell me about TakeProfit firm",
        firmHint: "takeprofit",
        category: "unimplemented_firm",
        expectedIssue: "not_yet_implemented"
    },

    // Edge cases and error handling
    {
        query: "",
        firmHint: null,
        category: "edge_case",
        expectedIssue: "empty_query"
    },
    {
        query: "!@#$%^&*()",
        firmHint: null,
        category: "edge_case", 
        expectedIssue: "invalid_characters"
    },
    {
        query: "A".repeat(1000),
        firmHint: null,
        category: "edge_case",
        expectedIssue: "very_long_query"
    },

    // Performance test queries
    {
        query: "Apex account evaluation process step by step guide",
        firmHint: "apex",
        category: "performance_test",
        expectedFirm: "apex"
    },
    {
        query: "Complete breakdown of Bulenox challenge requirements and rules",
        firmHint: "bulenox", 
        category: "performance_test",
        expectedFirm: "bulenox"
    }
];

// Test suites for different scenarios
const testSuites = {
    // Quick smoke test
    smoke: [
        testQueries[0], // Apex account sizes
        testQueries[5], // Bulenox account sizes
        testQueries[17] // General query
    ],

    // Isolation testing
    isolation: testQueries.filter(q => 
        q.category === "contamination_test" || 
        q.expectedIssue === "should_not_mix_firms"
    ),

    // Performance testing
    performance: testQueries.filter(q => 
        q.category === "performance_test"
    ),

    // Context management
    context: testQueries.filter(q => 
        q.category === "context_test"
    ),

    // Comprehensive test (all queries)
    full: testQueries
};

// Expected response patterns for validation
const expectedPatterns = {
    apex: {
        mustContain: ['apex', 'trader', 'funding'],
        mustNotContain: ['bulenox', 'takeprofit', 'vision', 'tradeify', 'alpha', 'myfunded'],
        responseTimeMax: 2000 // 2 seconds
    },
    bulenox: {
        mustContain: ['bulenox'],
        mustNotContain: ['apex', 'takeprofit', 'vision', 'tradeify', 'alpha', 'myfunded'],
        responseTimeMax: 2000
    },
    general: {
        mustNotContain: [], // No firm contamination for general queries
        responseTimeMax: 3000
    }
};

module.exports = {
    testQueries,
    testSuites,
    expectedPatterns
};