import { FastifyInstance } from 'fastify';
import { UnifiedScrapingService } from './src/scraping/core/UnifiedScrapingService.js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

/**
 * Simple test to capture URLs and save them for analysis
 * Focus on checking if unique URLs are being captured
 */

async function testUrlCapture() {
    console.log(`[${new Date().toISOString()}] [URL_TEST] STARTING URL CAPTURE TEST`);

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
        // Test with just 3 thumbnails to keep it quick
        const testKeywords = ['trading'];
        const thumbnailsPerKeyword = 3;

        console.log(`[${new Date().toISOString()}] [URL_TEST] TESTING WITH:`, {
            keywords: testKeywords,
            thumbnailsPerKeyword
        });

        const startTime = Date.now();
        const results = await scrapingService.scrapeAllKeywords(
            testKeywords,
            'apps',
            thumbnailsPerKeyword
        );
        const executionTime = Date.now() - startTime;

        // Analyze the URLs
        console.log(`\n[${new Date().toISOString()}] [URL_TEST] RESULTS ANALYSIS:`);
        console.log(`Total Results: ${results.totalResults}`);
        console.log(`Execution Time: ${executionTime}ms`);

        if (results.results.length > 0) {
            console.log(`\n[${new Date().toISOString()}] [URL_TEST] CAPTURED URLS:`);

            const urls: string[] = [];
            const uniqueUrls = new Set<string>();

            results.results.forEach((result, index) => {
                console.log(`${index + 1}. Thumbnail ${result.thumbnailIndex}: ${result.url}`);
                urls.push(result.url);
                uniqueUrls.add(result.url);
            });

            // Check for uniqueness
            const duplicateCount = urls.length - uniqueUrls.size;
            console.log(`\n[${new Date().toISOString()}] [URL_TEST] UNIQUENESS ANALYSIS:`);
            console.log(`Total URLs: ${urls.length}`);
            console.log(`Unique URLs: ${uniqueUrls.size}`);
            console.log(`Duplicates: ${duplicateCount}`);
            console.log(`Uniqueness Rate: ${((uniqueUrls.size / urls.length) * 100).toFixed(1)}%`);

            // Check URL patterns
            const modalUrls = urls.filter(url => /\/screens\/[a-f0-9-]+/.test(url));
            const baseUrls = urls.filter(url => url === 'https://mobbin.com' || url.endsWith('mobbin.com'));
            const searchUrls = urls.filter(url => url.includes('/search/') || url.includes('?q='));

            console.log(`\n[${new Date().toISOString()}] [URL_TEST] URL PATTERN ANALYSIS:`);
            console.log(`Modal URLs (screens/[id]): ${modalUrls.length}`);
            console.log(`Base URLs: ${baseUrls.length}`);
            console.log(`Search URLs: ${searchUrls.length}`);

            // Save results to file
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const resultData = {
                timestamp,
                testType: 'url_capture_analysis',
                summary: {
                    totalUrls: urls.length,
                    uniqueUrls: uniqueUrls.size,
                    duplicates: duplicateCount,
                    uniquenessRate: ((uniqueUrls.size / urls.length) * 100).toFixed(1) + '%',
                    modalUrls: modalUrls.length,
                    baseUrls: baseUrls.length,
                    searchUrls: searchUrls.length,
                    executionTime
                },
                urls: urls,
                uniqueUrlsList: Array.from(uniqueUrls),
                results: results.results
            };

            const filename = `backend/results/url-capture-test-${timestamp}.json`;
            fs.writeFileSync(filename, JSON.stringify(resultData, null, 2));
            console.log(`\n[${new Date().toISOString()}] [URL_TEST] RESULTS SAVED TO: ${filename}`);

            return uniqueUrls.size > 0 && modalUrls.length > 0;
        } else {
            console.error(`[${new Date().toISOString()}] [URL_TEST] NO RESULTS CAPTURED`);
            return false;
        }

    } catch (error) {
        console.error(`[${new Date().toISOString()}] [URL_TEST] ERROR:`, {
            error: error.message,
            stack: error.stack
        });
        return false;
    }
}

// Run the test
testUrlCapture()
    .then(success => {
        if (success) {
            console.log(`\n[${new Date().toISOString()}] [URL_TEST] ✅ URL CAPTURE TEST PASSED`);
            process.exit(0);
        } else {
            console.log(`\n[${new Date().toISOString()}] [URL_TEST] ❌ URL CAPTURE TEST FAILED`);
            process.exit(1);
        }
    })
    .catch(error => {
        console.error(`[${new Date().toISOString()}] [URL_TEST] UNEXPECTED ERROR:`, error);
        process.exit(1);
    });
