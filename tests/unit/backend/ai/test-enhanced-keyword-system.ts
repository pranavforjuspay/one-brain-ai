import { FastifyInstance } from 'fastify';
import fastify from 'fastify';
import { UnifiedScrapingService } from './src/scraping/core/UnifiedScrapingService.js';

/**
 * Test the enhanced keyword allocation system with the user's specific query
 */
async function testEnhancedKeywordSystem() {
    console.log(`[${new Date().toISOString()}] [ENHANCED_KEYWORD_TEST] TEST_START`);

    // Create a minimal Fastify app for testing
    const app: FastifyInstance = fastify({ logger: false });

    try {
        // Initialize the UnifiedScrapingService
        const unifiedScrapingService = new UnifiedScrapingService(app);

        // Test with the user's exact query
        const userQuery = "I am designing a offers app for visa card holders. Users will open this app and see offers on their visa cards and then redeem them. So offers will be simple coupon codes which can be redeemed on partner website etc.";

        console.log(`[${new Date().toISOString()}] [ENHANCED_KEYWORD_TEST] TESTING_USER_QUERY:`, {
            query: userQuery,
            queryLength: userQuery.length
        });

        // Test Phase 1: Extract keywords only
        console.log(`[${new Date().toISOString()}] [ENHANCED_KEYWORD_TEST] PHASE_1_START: Extract keywords only`);

        const keywordResult = await unifiedScrapingService.extractKeywordsOnly(userQuery);

        console.log(`[${new Date().toISOString()}] [ENHANCED_KEYWORD_TEST] PHASE_1_COMPLETE:`, {
            keywords: keywordResult.keywords,
            keywordCount: keywordResult.keywords.length,
            metadata: keywordResult.metadata
        });

        // Detailed analysis of the result
        console.log(`[${new Date().toISOString()}] [ENHANCED_KEYWORD_TEST] DETAILED_ANALYSIS:`, {
            generationMethod: keywordResult.metadata.keywordGenerationMethod,
            llmConfidenceScores: keywordResult.metadata.llmConfidenceScores,
            originalQuery: keywordResult.metadata.originalQuery,
            processingTime: keywordResult.metadata.processingTime
        });

        // Check if we're getting the expected dynamic range (2-10 keywords)
        const keywordCount = keywordResult.keywords.length;
        const isInExpectedRange = keywordCount >= 2 && keywordCount <= 10;

        console.log(`[${new Date().toISOString()}] [ENHANCED_KEYWORD_TEST] VALIDATION:`, {
            keywordCount,
            expectedRange: '2-10',
            isInExpectedRange,
            isUsingLLM: keywordResult.metadata.keywordGenerationMethod === 'llm',
            isUsingFallback: keywordResult.metadata.keywordGenerationMethod === 'fallback'
        });

        if (keywordResult.metadata.keywordGenerationMethod === 'llm') {
            console.log(`[${new Date().toISOString()}] [ENHANCED_KEYWORD_TEST] LLM_SUCCESS: Enhanced keyword system is working!`);
        } else {
            console.log(`[${new Date().toISOString()}] [ENHANCED_KEYWORD_TEST] LLM_FALLBACK: Using fallback method, LLM may have failed`);
        }

        // Test what the LLMKeywordServiceV2 would generate directly
        console.log(`[${new Date().toISOString()}] [ENHANCED_KEYWORD_TEST] DIRECT_LLM_TEST_START`);

        try {
            // Access the private LLM service through the unified service
            const llmResult = await (unifiedScrapingService as any).extractKeywordsWithLLM(userQuery);

            console.log(`[${new Date().toISOString()}] [ENHANCED_KEYWORD_TEST] DIRECT_LLM_RESULT:`, {
                keywords: llmResult.keywords,
                keywordCount: llmResult.keywords.length,
                generationMethod: llmResult.generationMethod,
                enhancedStrategy: llmResult.enhancedStrategy,
                totalThumbnailBudget: llmResult.totalThumbnailBudget
            });

            // Check if we have LLMKeywordResult objects with enhanced metadata
            if (llmResult.keywords && llmResult.keywords.length > 0) {
                const firstKeyword = llmResult.keywords[0];
                console.log(`[${new Date().toISOString()}] [ENHANCED_KEYWORD_TEST] FIRST_KEYWORD_ANALYSIS:`, {
                    term: firstKeyword.term,
                    confidence: firstKeyword.confidence,
                    type: firstKeyword.type,
                    thumbnailAllocation: firstKeyword.thumbnailAllocation,
                    isCompetitor: firstKeyword.isCompetitor,
                    parentApp: firstKeyword.parentApp,
                    reasoning: firstKeyword.reasoning
                });
            }

        } catch (llmError) {
            console.log(`[${new Date().toISOString()}] [ENHANCED_KEYWORD_TEST] DIRECT_LLM_FAILED:`, {
                error: llmError.message,
                reason: 'LLM service may not be properly configured or accessible'
            });
        }

        console.log(`[${new Date().toISOString()}] [ENHANCED_KEYWORD_TEST] TEST_COMPLETE: Enhanced keyword system test finished`);

        return {
            success: true,
            keywordCount,
            isInExpectedRange,
            generationMethod: keywordResult.metadata.keywordGenerationMethod,
            keywords: keywordResult.keywords
        };

    } catch (error) {
        console.error(`[${new Date().toISOString()}] [ENHANCED_KEYWORD_TEST] TEST_FAILED:`, {
            error: error.message,
            stack: error.stack
        });

        return {
            success: false,
            error: error.message
        };
    } finally {
        await app.close();
    }
}

// Run the test
testEnhancedKeywordSystem()
    .then(result => {
        console.log(`[${new Date().toISOString()}] [ENHANCED_KEYWORD_TEST] FINAL_RESULT:`, result);

        if (result.success) {
            if (result.generationMethod === 'llm' && result.isInExpectedRange) {
                console.log(`✅ SUCCESS: Enhanced keyword system is working correctly!`);
                console.log(`   - Generated ${result.keywordCount} keywords (expected 2-10)`);
                console.log(`   - Using LLM generation method`);
                console.log(`   - Keywords: ${result.keywords.join(', ')}`);
            } else if (result.generationMethod === 'fallback') {
                console.log(`⚠️  FALLBACK: System fell back to legacy method`);
                console.log(`   - This means LLM service may not be accessible`);
                console.log(`   - Check Google Cloud authentication and Vertex AI setup`);
            } else {
                console.log(`❓ UNEXPECTED: Got ${result.keywordCount} keywords with ${result.generationMethod} method`);
            }
        } else {
            console.log(`❌ FAILED: ${result.error}`);
        }

        process.exit(0);
    })
    .catch(error => {
        console.error(`❌ CRITICAL ERROR:`, error);
        process.exit(1);
    });
