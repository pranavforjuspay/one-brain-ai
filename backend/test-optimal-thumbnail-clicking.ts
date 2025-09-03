import dotenv from 'dotenv';
dotenv.config();

import { UnifiedScrapingService } from './src/scraping/core/UnifiedScrapingService.js';
import { FastifyInstance } from 'fastify';
import fastify from 'fastify';

/**
 * Test the optimal thumbnail clicking strategy based on HTML structure analysis
 * 
 * Expected Results:
 * - Click 5 thumbnails successfully using image-parent strategy
 * - All captured URLs should be /screens/ URLs (not /apps/ URLs)
 * - No brand logo clicks should occur
 */
async function testOptimalThumbnailClicking() {
    console.log(`[${new Date().toISOString()}] [OPTIMAL_TEST] TEST_START`);

    const app: FastifyInstance = fastify({ logger: false });
    const scrapingService = new UnifiedScrapingService(app);

    try {
        // Test with a single keyword to focus on thumbnail clicking
        const testKeyword = 'trading';
        const expectedThumbnails = 5;

        console.log(`[${new Date().toISOString()}] [OPTIMAL_TEST] TESTING_KEYWORD:`, {
            keyword: testKeyword,
            expectedThumbnails,
            strategy: 'image_parent_click'
        });

        // Execute the scraping with our new strategy
        const result = await scrapingService.scrapeAllKeywords([testKeyword], 'apps', expectedThumbnails);

        console.log(`[${new Date().toISOString()}] [OPTIMAL_TEST] SCRAPING_COMPLETE:`, {
            totalResults: result.totalResults,
            executionTime: result.executionTime
        });

        // Analyze the results
        const analysis = {
            totalResults: result.totalResults,
            expectedResults: expectedThumbnails,
            successRate: (result.totalResults / expectedThumbnails) * 100,
            urlAnalysis: {
                screenUrls: 0,
                appUrls: 0,
                otherUrls: 0
            },
            results: result.results
        };

        // Analyze URL patterns
        result.results.forEach(res => {
            if (res.url.includes('/screens/')) {
                analysis.urlAnalysis.screenUrls++;
            } else if (res.url.includes('/apps/')) {
                analysis.urlAnalysis.appUrls++;
            } else {
                analysis.urlAnalysis.otherUrls++;
            }
        });

        console.log(`[${new Date().toISOString()}] [OPTIMAL_TEST] DETAILED_ANALYSIS:`);
        console.log(JSON.stringify(analysis, null, 2));

        // Validation
        const validationResults = {
            allUrlsAreScreenUrls: analysis.urlAnalysis.screenUrls === result.totalResults,
            noAppUrlsFound: analysis.urlAnalysis.appUrls === 0,
            achievedExpectedCount: result.totalResults === expectedThumbnails,
            successRate: analysis.successRate
        };

        console.log(`[${new Date().toISOString()}] [OPTIMAL_TEST] VALIDATION_RESULTS:`);
        console.log(JSON.stringify(validationResults, null, 2));

        // Final assessment
        const testPassed = validationResults.allUrlsAreScreenUrls &&
            validationResults.noAppUrlsFound &&
            validationResults.successRate >= 80; // Allow 80% success rate

        console.log(`[${new Date().toISOString()}] [OPTIMAL_TEST] FINAL_ASSESSMENT:`, {
            testPassed,
            strategy: 'image_parent_click',
            brandLogoClicks: analysis.urlAnalysis.appUrls,
            thumbnailClicks: analysis.urlAnalysis.screenUrls,
            recommendation: testPassed ? 'Strategy is working correctly!' : 'Strategy needs further refinement'
        });

        return {
            success: testPassed,
            analysis,
            validationResults,
            results: result.results
        };

    } catch (error) {
        console.error(`[${new Date().toISOString()}] [OPTIMAL_TEST] TEST_FAILED:`, error.message);
        throw error;
    }
}

// Run the test
testOptimalThumbnailClicking()
    .then((result) => {
        console.log(`[${new Date().toISOString()}] [OPTIMAL_TEST] TEST_COMPLETE:`, {
            success: result.success,
            totalResults: result.results.length
        });
        process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
        console.error(`[${new Date().toISOString()}] [OPTIMAL_TEST] TEST_ERROR:`, error.message);
        process.exit(1);
    });
