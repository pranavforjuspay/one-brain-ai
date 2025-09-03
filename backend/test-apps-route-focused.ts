import { RouteExecutor } from './src/scraping/core/RouteExecutor.js';
import { ResultFormatter } from './src/scraping/core/ResultFormatter.js';

/**
 * FOCUSED APPS ROUTE TEST
 * Tests the Apps route with "banking" keyword to ensure predictable behavior
 * Validates that the route follows its intended workflow pattern
 */

async function testAppsRouteFocused() {
    console.log('🏦 FOCUSED APPS ROUTE TEST');
    console.log('=========================');
    console.log('Testing Apps route with "banking" keyword for predictable behavior\n');

    // Create mock Fastify app
    const mockApp = {
        log: {
            info: (obj: any, msg: string) => console.log(`[INFO] ${msg}:`, obj),
            error: (obj: any, msg: string) => console.error(`[ERROR] ${msg}:`, obj)
        }
    } as any;

    const executor = new RouteExecutor(mockApp);
    const formatter = new ResultFormatter();

    const testConfig = {
        keyword: 'banking',
        platform: 'ios' as const,
        maxResults: 5,
        debugMode: true // Enable visible browser for validation
    };

    console.log('📋 TEST CONFIGURATION');
    console.log('=====================');
    console.log(`Keyword: "${testConfig.keyword}"`);
    console.log(`Platform: ${testConfig.platform}`);
    console.log(`Max Results: ${testConfig.maxResults}`);
    console.log(`Debug Mode: ${testConfig.debugMode}`);
    console.log(`Expected Route: Apps`);
    console.log(`Expected Strategy: click-suggestion (app suggestion)`);
    console.log(`Expected Pattern: Type keyword → Select app → Capture app URLs\n`);

    try {
        console.log('🚀 EXECUTING APPS ROUTE');
        console.log('=======================');

        const startTime = Date.now();

        const result = await executor.executeAppsRoute(
            testConfig.keyword,
            testConfig.platform,
            testConfig.maxResults,
            testConfig.debugMode
        );

        const totalTime = Date.now() - startTime;

        console.log('\n📊 APPS ROUTE RESULTS');
        console.log('=====================');
        console.log(`✅ Execution Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
        console.log(`⏱️  Total Execution Time: ${totalTime}ms`);
        console.log(`🎯 Strategy Used: ${result.strategy}`);
        console.log(`📱 Platform: ${result.platform}`);
        console.log(`🔍 Keyword: "${result.keyword}"`);
        console.log(`📦 URLs Captured: ${result.capturedURLs.length}`);

        if (result.errors.length > 0) {
            console.log(`❌ Errors: ${result.errors.length}`);
            result.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
        }

        console.log('\n🔍 ROUTE VALIDATION');
        console.log('===================');

        // Validate route behavior
        const validations = {
            routeType: result.routeType === 'apps',
            keywordMatch: result.keyword === testConfig.keyword,
            platformMatch: result.platform === testConfig.platform,
            hasResults: result.capturedURLs.length > 0,
            strategyAppropriate: result.strategy.includes('click-suggestion') || result.strategy.includes('app'),
            executionSuccess: result.success
        };

        Object.entries(validations).forEach(([check, passed]) => {
            console.log(`${passed ? '✅' : '❌'} ${check}: ${passed ? 'PASS' : 'FAIL'}`);
        });

        const allValidationsPassed = Object.values(validations).every(v => v);

        console.log('\n📋 CAPTURED URLS ANALYSIS');
        console.log('=========================');

        if (result.capturedURLs.length > 0) {
            result.capturedURLs.forEach((url, index) => {
                console.log(`${index + 1}. ${url.title || 'Untitled'}`);
                console.log(`   URL: ${url.url}`);
                console.log(`   Route: ${url.route}`);
                console.log(`   Platform: ${url.platform}`);
                console.log(`   Keyword: ${url.keyword}`);
                if (url.metadata?.description) {
                    console.log(`   Description: ${url.metadata.description}`);
                }
                if (url.metadata?.category) {
                    console.log(`   Category: ${url.metadata.category}`);
                }
                console.log('');
            });

            // Validate URL types
            const appURLs = result.capturedURLs.filter(url => url.route === 'apps');
            const relevantURLs = result.capturedURLs.filter(url =>
                url.title?.toLowerCase().includes('bank') ||
                url.metadata?.description?.toLowerCase().includes('bank') ||
                url.metadata?.category?.toLowerCase().includes('bank')
            );

            console.log(`📱 App URLs: ${appURLs.length}/${result.capturedURLs.length}`);
            console.log(`🎯 Banking-related URLs: ${relevantURLs.length}/${result.capturedURLs.length}`);
        } else {
            console.log('❌ No URLs captured - route may have failed');
        }

        console.log('\n🎯 APPS ROUTE TEST SUMMARY');
        console.log('==========================');
        console.log(`Overall Status: ${allValidationsPassed && result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`Route Adherence: ${validations.routeType && validations.strategyAppropriate ? '✅ CORRECT' : '❌ INCORRECT'}`);
        console.log(`Results Quality: ${validations.hasResults ? '✅ GOOD' : '❌ POOR'}`);
        console.log(`Execution Time: ${totalTime}ms`);

        // Format results for detailed analysis
        if (result.success && result.capturedURLs.length > 0) {
            console.log('\n📄 GENERATING FORMATTED RESULTS');
            console.log('================================');

            const formatted = formatter.formatComprehensiveResults(
                [result],
                totalTime,
                `I need banking app design inspiration for ${testConfig.platform} platform`
            );

            console.log('Markdown Summary:');
            console.log(formatted.summary);
        }

        console.log('\n🏁 Apps Route Test Completed');
        console.log(`Final Result: ${allValidationsPassed && result.success ? 'APPS ROUTE WORKING CORRECTLY' : 'APPS ROUTE NEEDS ATTENTION'}`);

        return {
            success: allValidationsPassed && result.success,
            result,
            validations,
            executionTime: totalTime
        };

    } catch (error) {
        console.error('\n❌ APPS ROUTE TEST FAILED');
        console.error('==========================');
        console.error('Error:', error instanceof Error ? error.message : error);
        console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            executionTime: Date.now() - Date.now()
        };
    }
}

// Run the test
testAppsRouteFocused().catch(console.error);
