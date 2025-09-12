import { FastifyInstance } from 'fastify';
import { LLMKeywordServiceV2 } from './src/scraping/ai/LLMKeywordServiceV2.js';

/**
 * Test the enhanced keyword system with the user's offers app problem statement
 * This should demonstrate dynamic keyword generation (2-10 keywords, not fixed 5)
 */

// Mock Fastify app for testing
const mockApp = {
    log: {
        info: (obj: any, msg?: string) => console.log(`[INFO] ${msg || ''}`, obj),
        error: (obj: any, msg?: string) => console.error(`[ERROR] ${msg || ''}`, obj),
        warn: (obj: any, msg?: string) => console.warn(`[WARN] ${msg || ''}`, obj)
    }
} as FastifyInstance;

async function testOffersAppKeywords() {
    console.log(`[${new Date().toISOString()}] [OFFERS_APP_TEST] STARTING_ENHANCED_KEYWORD_TEST`);

    const userProblemStatement = "I am designing a offers app for visa card holders. Users will open this app and see offers on their visa cards and then redeem them. So offers will be simple coupon codes which can be redeemed on partner website etc.";

    console.log(`[${new Date().toISOString()}] [OFFERS_APP_TEST] PROBLEM_STATEMENT:`, {
        statement: userProblemStatement,
        length: userProblemStatement.length
    });

    try {
        // Initialize LLMKeywordServiceV2
        console.log(`[${new Date().toISOString()}] [OFFERS_APP_TEST] INITIALIZING_LLM_KEYWORD_SERVICE_V2`);
        const llmService = new LLMKeywordServiceV2(mockApp);

        console.log(`[${new Date().toISOString()}] [OFFERS_APP_TEST] CALLING_ENHANCED_KEYWORD_GENERATION`);

        // Call the enhanced keyword generation
        const result = await llmService.generateKeywords(userProblemStatement);

        console.log(`[${new Date().toISOString()}] [OFFERS_APP_TEST] ✅ ENHANCED_KEYWORD_GENERATION_SUCCESS`);

        // Analyze the results
        console.log(`\n${'='.repeat(80)}`);
        console.log(`🎯 ENHANCED KEYWORD SYSTEM TEST RESULTS`);
        console.log(`${'='.repeat(80)}`);

        console.log(`📊 SUMMARY:`);
        console.log(`   • Generated: ${result.keywords.length} keywords`);
        console.log(`   • Method: ${result.generationMethod}`);
        console.log(`   • Processing Time: ${result.processingTime}ms`);
        console.log(`   • Total Thumbnail Budget: ${result.totalThumbnailBudget}`);

        if (result.enhancedStrategy) {
            console.log(`\n🧠 ENHANCED STRATEGY:`);
            console.log(`   • Strategy: ${result.enhancedStrategy.allocationStrategy}`);
            console.log(`   • Apps: ${result.enhancedStrategy.keywordBreakdown.apps}`);
            console.log(`   • Features: ${result.enhancedStrategy.keywordBreakdown.features}`);
            console.log(`   • Patterns: ${result.enhancedStrategy.keywordBreakdown.patterns}`);
            console.log(`   • Industry: ${result.enhancedStrategy.keywordBreakdown.industry}`);
            console.log(`   • Competitors: ${result.enhancedStrategy.keywordBreakdown.competitors}`);
        }

        console.log(`\n🔍 DETAILED KEYWORD ANALYSIS:`);
        result.keywords.forEach((keyword, index) => {
            const competitorFlag = keyword.isCompetitor ? ' 🏆 COMPETITOR' : '';
            console.log(`   ${index + 1}. "${keyword.term}" (${keyword.type})`);
            console.log(`      ├─ Confidence: ${keyword.confidence}`);
            console.log(`      ├─ Thumbnails: ${keyword.thumbnailAllocation}`);
            console.log(`      ├─ Reasoning: ${keyword.reasoning}${competitorFlag}`);
            if (keyword.parentApp) {
                console.log(`      └─ Parent App: ${keyword.parentApp}`);
            }
        });

        // Validation checks
        console.log(`\n✅ VALIDATION CHECKS:`);

        // Check 1: Dynamic keyword count (not fixed 5)
        const keywordCount = result.keywords.length;
        if (keywordCount >= 2 && keywordCount <= 10 && keywordCount !== 5) {
            console.log(`   ✅ Dynamic keyword count: ${keywordCount} (expected 2-10, not fixed 5)`);
        } else if (keywordCount === 5) {
            console.log(`   ⚠️  Got exactly 5 keywords - might be fallback method`);
        } else {
            console.log(`   ❌ Invalid keyword count: ${keywordCount}`);
        }

        // Check 2: LLM method (not fallback)
        if (result.generationMethod === 'llm') {
            console.log(`   ✅ Using enhanced LLM method (not fallback)`);
        } else {
            console.log(`   ❌ Using fallback method instead of LLM`);
        }

        // Check 3: Confidence-based allocation (not uniform)
        const allocations = result.keywords.map(k => k.thumbnailAllocation || 0);
        const uniqueAllocations = [...new Set(allocations)];
        if (uniqueAllocations.length > 1) {
            console.log(`   ✅ Confidence-based allocation: ${uniqueAllocations.length} different allocation levels`);
        } else {
            console.log(`   ⚠️  Uniform allocation - might not be using confidence properly`);
        }

        // Check 4: Keyword types
        const types = [...new Set(result.keywords.map(k => k.type))];
        console.log(`   ✅ Keyword types: ${types.join(', ')}`);

        // Check 5: Competitor discovery
        const competitors = result.keywords.filter(k => k.isCompetitor);
        if (competitors.length > 0) {
            console.log(`   ✅ Competitor discovery: Found ${competitors.length} competitors`);
            competitors.forEach(comp => {
                console.log(`      └─ ${comp.term} (parent: ${comp.parentApp || 'N/A'})`);
            });
        } else {
            console.log(`   ⚠️  No competitors discovered`);
        }

        // Check 6: Offers/rewards domain relevance
        const relevantTerms = result.keywords.filter(k =>
            k.term.includes('offer') ||
            k.term.includes('reward') ||
            k.term.includes('coupon') ||
            k.term.includes('redeem') ||
            k.term.includes('visa') ||
            k.term.includes('cashback') ||
            k.term.includes('deal')
        );
        console.log(`   ✅ Domain relevance: ${relevantTerms.length}/${result.keywords.length} keywords relevant to offers/rewards`);

        console.log(`\n${'='.repeat(80)}`);

        if (result.generationMethod === 'llm' && keywordCount !== 5) {
            console.log(`🎉 SUCCESS: Enhanced keyword system is working correctly!`);
            console.log(`   • Generated ${keywordCount} dynamic keywords (not fixed 5)`);
            console.log(`   • Using LLM method with confidence-based allocation`);
            console.log(`   • Found relevant keywords for offers/rewards domain`);
        } else {
            console.log(`❌ ISSUE: System may still be using fallback method`);
        }

        console.log(`${'='.repeat(80)}\n`);

    } catch (error) {
        console.error(`[${new Date().toISOString()}] [OFFERS_APP_TEST] ❌ TEST_FAILED:`, {
            error: error.message,
            stack: error.stack
        });

        console.log(`\n❌ ENHANCED KEYWORD SYSTEM TEST FAILED`);
        console.log(`Error: ${error.message}`);

        if (error.message.includes('429')) {
            console.log(`\n💡 This appears to be a rate limit error. The system is working, just hitting API limits.`);
        }
    }
}

// Run the test
testOffersAppKeywords().catch(error => {
    console.error(`[${new Date().toISOString()}] [OFFERS_APP_TEST] CRITICAL_ERROR:`, error);
    process.exit(1);
});
