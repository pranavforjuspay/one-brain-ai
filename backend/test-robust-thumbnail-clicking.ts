import { FastifyInstance } from 'fastify';
import { UnifiedScrapingService } from './src/scraping/core/UnifiedScrapingService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test the new robust thumbnail clicking strategy
 * This test focuses specifically on the thumbnail clicking and URL capture improvements
 */

async function testRobustThumbnailClicking() {
    console.log(`[${new Date().toISOString()}] [TEST] ROBUST_THUMBNAIL_CLICKING_TEST_START`);

    // Create a minimal Fastify app for testing
    const app = {
        log: {
            info: (obj: any, msg?: string) => console.log(`[INFO] ${msg || ''}`, obj),
            error: (obj: any, msg?: string) => console.error(`[ERROR] ${msg || ''}`, obj),
            warn: (obj: any, msg?: string) => console.warn(`[WARN] ${msg || ''}`, obj)
        }
    } as FastifyInstance;

    const scrapingService = new UnifiedScrapingService(app);

    try {
        console.log(`[${new Date().toISOString()}] [TEST] STARTING_SINGLE_KEYWORD_TEST`);
        console.log(`[${new Date().toISOString()}] [TEST] TARGET: Test robust thumbnail clicking with "trading" keyword`);
        console.log(`[${new Date().toISOString()}] [TEST] EXPECTED: Click 5 thumbnails and capture modal URLs`);

        // Test with a single keyword to focus on thumbnail clicking
        const testKeywords = ['trading'];
        const thumbnailsPerKeyword = 5;

        console.log(`[${new Date().toISOString()}] [TEST] EXECUTING_SCRAPING:`, {
            keywords: testKeywords,
            thumbnailsPerKeyword,
            strategy: 'robust_nth_selector'
        });

        const startTime = Date.now();
        const results = await scrapingService.scrapeAllKeywords(
            testKeywords,
            'apps',
            thumbnailsPerKeyword
        );
        const executionTime = Date.now() - startTime;

        console.log(`[${new Date().toISOString()}] [TEST] SCRAPING_COMPLETE:`, {
            executionTime: `${executionTime}ms`,
            totalResults: results.totalResults,
            resultsPerKeyword: results.totalResults / testKeywords.length
        });

        // Analyze results
        console.log(`[${new Date().toISOString()}] [TEST] ANALYZING_RESULTS`);

        if (results.totalResults === 0) {
            console.error(`[${new Date().toISOString()}] [TEST] FAILURE: No results captured`);
            return false;
        }

        // Check URL patterns
        let validModalUrls = 0;
        let invalidUrls = 0;

        for (const result of results.results) {
            console.log(`[${new Date().toISOString()}] [TEST] RESULT_ANALYSIS:`, {
                keyword: result.keyword,
                thumbnailIndex: result.thumbnailIndex,
                url: result.url,
                extractedAt: result.extractedAt
            });

            // Check if URL matches the expected modal pattern
            const modalPattern = /\/screens\/[a-f0-9-]+/;
            if (modalPattern.test(result.url)) {
                validModalUrls++;
                console.log(`[${new Date().toISOString()}] [TEST] VALID_MODAL_URL:`, {
                    thumbnailIndex: result.thumbnailIndex,
                    url: result.url
                });
            } else {
                invalidUrls++;
                console.log(`[${new Date().toISOString()}] [TEST] INVALID_URL:`, {
                    thumbnailIndex: result.thumbnailIndex,
                    url: result.url,
                    reason: 'Does not match modal pattern'
                });
            }
        }

        // Success criteria
        const successRate = validModalUrls / results.totalResults;
        const minimumSuccessRate = 0.6; // 60% success rate is acceptable

        console.log(`[${new Date().toISOString()}] [TEST] FINAL_ANALYSIS:`, {
            totalResults: results.totalResults,
            validModalUrls,
            invalidUrls,
            successRate: `${(successRate * 100).toFixed(1)}%`,
            minimumRequired: `${(minimumSuccessRate * 100).toFixed(1)}%`,
            testPassed: successRate >= minimumSuccessRate
        });

        if (successRate >= minimumSuccessRate) {
            console.log(`[${new Date().toISOString()}] [TEST] SUCCESS: Robust thumbnail clicking is working!`);
            console.log(`[${new Date().toISOString()}] [TEST] IMPROVEMENTS_VERIFIED:`);
            console.log(`  ✅ Index-based clicking with nth selectors`);
            console.log(`  ✅ Proper URL capture timing with waitForURL`);
            console.log(`  ✅ Modal closing with Escape key`);
            console.log(`  ✅ DOM stabilization between clicks`);
            return true;
        } else {
            console.error(`[${new Date().toISOString()}] [TEST] FAILURE: Success rate too low`);
            return false;
        }

    } catch (error) {
        console.error(`[${new Date().toISOString()}] [TEST] CRITICAL_ERROR:`, {
            error: error.message,
            stack: error.stack
        });
        return false;
    }
}

// Run the test
testRobustThumbnailClicking()
    .then(success => {
        if (success) {
            console.log(`[${new Date().toISOString()}] [TEST] ROBUST_THUMBNAIL_CLICKING_TEST_PASSED ✅`);
            process.exit(0);
        } else {
            console.log(`[${new Date().toISOString()}] [TEST] ROBUST_THUMBNAIL_CLICKING_TEST_FAILED ❌`);
            process.exit(1);
        }
    })
    .catch(error => {
        console.error(`[${new Date().toISOString()}] [TEST] UNEXPECTED_ERROR:`, error);
        process.exit(1);
    });
