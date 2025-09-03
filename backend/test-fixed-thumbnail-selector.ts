import { UnifiedScrapingService } from './src/scraping/core/UnifiedScrapingService.js';
import { FastifyInstance } from 'fastify';
import fastify from 'fastify';

/**
 * Test the fixed thumbnail selector strategy
 * This test verifies that we can click 5 thumbnails without accidentally clicking brand logos
 */
async function testFixedThumbnailSelector() {
    console.log(`[${new Date().toISOString()}] [THUMBNAIL_SELECTOR_TEST] TEST_START`);

    const app: FastifyInstance = fastify({ logger: false });
    const scrapingService = new UnifiedScrapingService(app);

    try {
        // Test with a single keyword to focus on thumbnail clicking behavior
        const testKeyword = 'trading';
        const thumbnailsToTest = 5;

        console.log(`[${new Date().toISOString()}] [THUMBNAIL_SELECTOR_TEST] TESTING_KEYWORD:`, {
            keyword: testKeyword,
            thumbnailsToTest,
            expectedBehavior: 'Click only thumbnails, avoid brand logos'
        });

        // Execute the scraping with our fixed selector
        const results = await scrapingService.scrapeAllKeywords([testKeyword], 'apps', thumbnailsToTest);

        console.log(`[${new Date().toISOString()}] [THUMBNAIL_SELECTOR_TEST] RESULTS_SUMMARY:`, {
            totalResults: results.totalResults,
            expectedResults: thumbnailsToTest,
            success: results.totalResults === thumbnailsToTest,
            executionTime: results.executionTime
        });

        // Analyze each result
        console.log(`[${new Date().toISOString()}] [THUMBNAIL_SELECTOR_TEST] DETAILED_ANALYSIS:`);
        results.results.forEach((result, index) => {
            const isValidScreenUrl = result.url.includes('/screens/') && !result.url.includes('/apps/');
            console.log(`[${new Date().toISOString()}] [THUMBNAIL_SELECTOR_TEST] RESULT_${index + 1}:`, {
                thumbnailIndex: result.thumbnailIndex,
                url: result.url,
                isValidScreenUrl,
                urlType: result.url.includes('/screens/') ? 'SCREEN_MODAL' : 'BRAND_PAGE',
                status: isValidScreenUrl ? '✅ SUCCESS' : '❌ BRAND_CLICK'
            });
        });

        // Final assessment
        const validResults = results.results.filter(r => r.url.includes('/screens/') && !r.url.includes('/apps/'));
        const brandClicks = results.results.filter(r => r.url.includes('/apps/'));

        console.log(`[${new Date().toISOString()}] [THUMBNAIL_SELECTOR_TEST] FINAL_ASSESSMENT:`, {
            totalAttempts: thumbnailsToTest,
            successfulThumbnailClicks: validResults.length,
            accidentalBrandClicks: brandClicks.length,
            successRate: `${Math.round((validResults.length / thumbnailsToTest) * 100)}%`,
            testResult: brandClicks.length === 0 ? '🎉 PERFECT - NO BRAND CLICKS!' : '⚠️ STILL HAS BRAND CLICKS'
        });

        if (brandClicks.length === 0) {
            console.log(`[${new Date().toISOString()}] [THUMBNAIL_SELECTOR_TEST] 🎉 SUCCESS: Fixed selector strategy works perfectly!`);
        } else {
            console.log(`[${new Date().toISOString()}] [THUMBNAIL_SELECTOR_TEST] ⚠️ ISSUE: Still clicking brand logos:`,
                brandClicks.map(r => ({ index: r.thumbnailIndex, url: r.url }))
            );
        }

        return {
            success: brandClicks.length === 0,
            validResults: validResults.length,
            brandClicks: brandClicks.length,
            results
        };

    } catch (error) {
        console.error(`[${new Date().toISOString()}] [THUMBNAIL_SELECTOR_TEST] TEST_FAILED:`, {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

// Run the test
testFixedThumbnailSelector()
    .then((testResult) => {
        console.log(`[${new Date().toISOString()}] [THUMBNAIL_SELECTOR_TEST] TEST_COMPLETE:`, {
            success: testResult.success,
            summary: `${testResult.validResults}/${testResult.validResults + testResult.brandClicks} thumbnails clicked correctly`
        });
        process.exit(testResult.success ? 0 : 1);
    })
    .catch((error) => {
        console.error(`[${new Date().toISOString()}] [THUMBNAIL_SELECTOR_TEST] TEST_ERROR:`, error.message);
        process.exit(1);
    });
