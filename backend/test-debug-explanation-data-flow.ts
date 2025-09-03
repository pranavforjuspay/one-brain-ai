/**
 * DEBUG TEST: Data Flow Between Scraping and Explanation
 * 
 * This test will trace exactly what data is being passed between services
 * to identify why the explanation shows "0 design examples" when URLs were captured
 */

import { FastifyInstance } from 'fastify';
import { UnifiedScrapingService } from './src/scraping/core/UnifiedScrapingService.js';
import { LLMResultExplanationService } from './src/scraping/ai/LLMResultExplanationService.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Mock Fastify instance
const mockFastify = {
    log: {
        info: console.log,
        error: console.error,
        warn: console.warn
    }
} as unknown as FastifyInstance;

async function debugDataFlow() {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 DEBUG: DATA FLOW BETWEEN SCRAPING AND EXPLANATION');
    console.log('='.repeat(80));

    try {
        // Step 1: Create mock scraping results (simulating successful URL capture)
        const mockResults = [
            {
                keyword: 'onboarding',
                url: 'https://mobbin.com/screens/380cb0ae-d95e-41ee-9f45-e19a6a467b36',
                thumbnailIndex: 1,
                extractedAt: new Date().toISOString()
            },
            {
                keyword: 'crypto',
                url: 'https://mobbin.com/screens/d7f6b549-171e-4dc5-914d-e59d3f202a35',
                thumbnailIndex: 1,
                extractedAt: new Date().toISOString()
            },
            {
                keyword: 'trading',
                url: 'https://mobbin.com/screens/f8e9c123-456d-789e-abc1-234567890def',
                thumbnailIndex: 1,
                extractedAt: new Date().toISOString()
            }
        ];

        const userQuery = "I need inspiration for a crypto trading app onboarding flow";
        const keywords = ['onboarding', 'crypto', 'trading', 'fintech', 'signup'];
        const confidenceScores = [0.95, 0.92, 0.88, 0.85, 0.80];

        console.log('\n📊 MOCK DATA PREPARED:');
        console.log('User Query:', userQuery);
        console.log('Keywords:', keywords);
        console.log('Confidence Scores:', confidenceScores);
        console.log('Mock Results Count:', mockResults.length);
        console.log('Mock Results:');
        mockResults.forEach((result, index) => {
            console.log(`  ${index + 1}. [${result.keyword}] ${result.url}`);
        });

        // Step 2: Test LLMResultExplanationService directly with mock data
        console.log('\n🧠 TESTING EXPLANATION SERVICE DIRECTLY:');
        console.log('-'.repeat(50));

        const explanationService = new LLMResultExplanationService(mockFastify);

        console.log('Calling explainResults with mock data...');
        const explanation = await explanationService.explainResults(
            userQuery,
            mockResults,
            keywords,
            confidenceScores
        );

        console.log('\n✅ EXPLANATION SERVICE RESPONSE:');
        console.log('Summary:', explanation.summary);
        console.log('Categories Count:', explanation.categories.length);
        console.log('Key Insights Count:', explanation.keyInsights.length);
        console.log('Processing Time:', explanation.processingTime, 'ms');

        console.log('\n📱 CATEGORIES BREAKDOWN:');
        explanation.categories.forEach((category, index) => {
            console.log(`${index + 1}. ${category.category} (${category.count} results)`);
            console.log(`   Description: ${category.description}`);
            console.log(`   Results:`);
            category.results.forEach((result, resultIndex) => {
                console.log(`     ${resultIndex + 1}. ${result.title}`);
                console.log(`        URL: ${result.url}`);
                console.log(`        Relevance: ${result.relevanceScore}`);
                console.log(`        Why Relevant: ${result.whyRelevant}`);
            });
        });

        console.log('\n💡 KEY INSIGHTS:');
        explanation.keyInsights.forEach((insight, index) => {
            console.log(`${index + 1}. ${insight}`);
        });

        console.log('\n📈 RECOMMENDATION:');
        console.log(explanation.recommendation);

        console.log('\n🔍 WHY THESE RESULTS:');
        console.log(explanation.whyThese);

        // Step 3: Test with empty results to see fallback behavior
        console.log('\n\n🚫 TESTING WITH EMPTY RESULTS (FALLBACK BEHAVIOR):');
        console.log('-'.repeat(50));

        const emptyExplanation = await explanationService.explainResults(
            userQuery,
            [], // Empty results array
            keywords,
            confidenceScores
        );

        console.log('Empty Results Summary:', emptyExplanation.summary);
        console.log('Empty Results Categories Count:', emptyExplanation.categories.length);

        // Step 4: Compare with what the end-to-end test might be passing
        console.log('\n\n🔄 SIMULATING END-TO-END TEST DATA FLOW:');
        console.log('-'.repeat(50));

        // This simulates what might be happening in the real test
        const scrapingService = new UnifiedScrapingService(mockFastify);

        // Check if the issue is in the data format from scrapeAllKeywords
        console.log('Testing data format compatibility...');

        // Create a mock response that matches UnifiedScrapingResponse format
        const mockScrapingResponse = {
            keywords,
            routeDecision: 'apps',
            results: mockResults,
            totalResults: mockResults.length,
            executionTime: 5000,
            metadata: {
                executedWorkflow: 'unified',
                authenticationUsed: true,
                thumbnailsPerKeyword: 3,
                keywordGenerationMethod: 'llm' as const,
                llmConfidenceScores: confidenceScores,
                originalQuery: userQuery
            }
        };

        console.log('Mock Scraping Response:');
        console.log('- Total Results:', mockScrapingResponse.totalResults);
        console.log('- Results Array Length:', mockScrapingResponse.results.length);
        console.log('- Results Array Type:', typeof mockScrapingResponse.results);
        console.log('- First Result:', mockScrapingResponse.results[0]);

        // Test explanation with this format
        const finalExplanation = await explanationService.explainResults(
            userQuery,
            mockScrapingResponse.results,
            keywords,
            confidenceScores
        );

        console.log('\nFinal Explanation Summary:', finalExplanation.summary);
        console.log('Final Categories Count:', finalExplanation.categories.length);

        console.log('\n' + '='.repeat(80));
        console.log('🎯 DEBUG ANALYSIS COMPLETE');
        console.log('='.repeat(80));

        if (finalExplanation.categories.length > 0) {
            console.log('✅ Explanation service is working correctly with proper data');
            console.log('❓ Issue must be in the data being passed from the real scraping service');
        } else {
            console.log('❌ Explanation service has an internal issue');
            console.log('🔧 Need to investigate the explanation service logic');
        }

    } catch (error) {
        console.error('\n❌ DEBUG TEST FAILED:');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Execute the debug test
if (import.meta.url === `file://${process.argv[1]}`) {
    debugDataFlow().catch(console.error);
}

export { debugDataFlow };
