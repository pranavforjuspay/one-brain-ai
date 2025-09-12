import { FastifyInstance } from 'fastify';
import { LLMKeywordServiceV2 } from './src/scraping/ai/LLMKeywordServiceV2.js';

/**
 * Diagnostic test to identify why LLMKeywordServiceV2 is failing
 * and causing fallback to legacy 5-keyword method
 */

// Mock Fastify app for testing
const mockApp = {
    log: {
        info: (obj: any, msg?: string) => console.log(`[INFO] ${msg || ''}`, obj),
        error: (obj: any, msg?: string) => console.error(`[ERROR] ${msg || ''}`, obj),
        warn: (obj: any, msg?: string) => console.warn(`[WARN] ${msg || ''}`, obj)
    }
} as FastifyInstance;

async function diagnosticTest() {
    console.log(`[${new Date().toISOString()}] [DIAGNOSTIC] LLM_V2_DIAGNOSTIC_TEST_START`);

    const testQuery = "I need to design a mobile banking app with biometric login and card management features";

    console.log(`[${new Date().toISOString()}] [DIAGNOSTIC] TEST_QUERY:`, {
        query: testQuery,
        queryLength: testQuery.length
    });

    try {
        // Initialize LLMKeywordServiceV2 directly
        console.log(`[${new Date().toISOString()}] [DIAGNOSTIC] INITIALIZING_LLM_KEYWORD_SERVICE_V2`);
        const llmService = new LLMKeywordServiceV2(mockApp);

        console.log(`[${new Date().toISOString()}] [DIAGNOSTIC] CALLING_GENERATE_KEYWORDS`);

        // Call generateKeywords directly to see the exact error
        const result = await llmService.generateKeywords(testQuery);

        console.log(`[${new Date().toISOString()}] [DIAGNOSTIC] LLM_V2_SUCCESS:`, {
            keywordCount: result.keywords.length,
            keywords: result.keywords.map(k => k.term),
            generationMethod: result.generationMethod,
            processingTime: result.processingTime,
            enhancedStrategy: result.enhancedStrategy,
            totalThumbnailBudget: result.totalThumbnailBudget
        });

        // Detailed analysis of each keyword
        console.log(`[${new Date().toISOString()}] [DIAGNOSTIC] KEYWORD_DETAILS:`);
        result.keywords.forEach((keyword, index) => {
            console.log(`  Keyword ${index + 1}:`, {
                term: keyword.term,
                confidence: keyword.confidence,
                type: keyword.type,
                thumbnailAllocation: keyword.thumbnailAllocation,
                isCompetitor: keyword.isCompetitor,
                reasoning: keyword.reasoning
            });
        });

        // Verify this is NOT the fallback method
        if (result.generationMethod === 'llm') {
            console.log(`[${new Date().toISOString()}] [DIAGNOSTIC] ✅ SUCCESS: LLM V2 is working correctly!`);
            console.log(`[${new Date().toISOString()}] [DIAGNOSTIC] ✅ Generated ${result.keywords.length} keywords (should be 2-10, not fixed 5)`);
        } else {
            console.log(`[${new Date().toISOString()}] [DIAGNOSTIC] ❌ ISSUE: Using fallback method instead of LLM`);
        }

    } catch (error) {
        console.error(`[${new Date().toISOString()}] [DIAGNOSTIC] ❌ LLM_V2_FAILED:`, {
            errorMessage: error.message,
            errorStack: error.stack,
            errorName: error.name,
            errorCode: error.code
        });

        // Analyze the specific error type
        if (error.message.includes('access token')) {
            console.error(`[${new Date().toISOString()}] [DIAGNOSTIC] 🔍 ERROR_TYPE: Google Cloud authentication issue`);
        } else if (error.message.includes('JSON')) {
            console.error(`[${new Date().toISOString()}] [DIAGNOSTIC] 🔍 ERROR_TYPE: JSON parsing issue`);
        } else if (error.message.includes('API')) {
            console.error(`[${new Date().toISOString()}] [DIAGNOSTIC] 🔍 ERROR_TYPE: Vertex AI API issue`);
        } else if (error.message.includes('Invalid')) {
            console.error(`[${new Date().toISOString()}] [DIAGNOSTIC] 🔍 ERROR_TYPE: Validation issue`);
        } else {
            console.error(`[${new Date().toISOString()}] [DIAGNOSTIC] 🔍 ERROR_TYPE: Unknown error`);
        }

        console.log(`[${new Date().toISOString()}] [DIAGNOSTIC] 📋 This error explains why the system falls back to legacy 5-keyword method`);
    }

    console.log(`[${new Date().toISOString()}] [DIAGNOSTIC] LLM_V2_DIAGNOSTIC_TEST_COMPLETE`);
}

// Run the diagnostic test
diagnosticTest().catch(error => {
    console.error(`[${new Date().toISOString()}] [DIAGNOSTIC] DIAGNOSTIC_TEST_CRASHED:`, error);
    process.exit(1);
});
