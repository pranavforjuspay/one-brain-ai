import { RouteExecutor } from './src/scraping/core/RouteExecutor.js';
import { ResultFormatter } from './src/scraping/core/ResultFormatter.js';

/**
 * FOCUSED SCREENS ROUTE TEST
 * Tests the Screens route with "login" keyword to ensure predictable behavior
 * Validates that the route follows its intended workflow pattern
 */

async function testScreensRouteFocused() {
    console.log('📱 FOCUSED SCREENS ROUTE TEST');
    console.log('=============================');
    console.log('Testing Screens route with "login" keyword for predictable behavior\n');

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
        keyword: 'login',
        platform: 'ios' as const,
        maxResults: 6,
        debugMode: true // Enable visible browser for validation
    };

    console.log('📋 TEST CONFIGURATION');
    console.log('=====================');
    console.log(`Keyword: "${testConfig.keyword}"`);
    console.log(`Platform: ${testConfig.platform}`);
    console.log(`Max Results: ${testConfig.maxResults}`);
    console.log(`Debug Mode: ${testConfig.debugMode}`);
    console.log(`Expected Route: Screens`);
    console.log(`Expected Strategy: click-suggestion (screen suggestion)`);
    console.log(`Expected Pattern: Type keyword → Select screen → Browse screens → Capture screen URLs\n`);

    try {
        console.log('🚀 EXECUTING SCREENS ROUTE');
        console.log('==========================');

        const startTime = Date.now();

        const result = await executor.executeScreensRoute(
            testConfig.keyword,
            testConfig.platform,
            testConfig.maxResults,
            testConfig.debugMode
        );

        const totalTime = Date.now() - startTime;

        console.log('\n📊 SCREENS ROUTE RESULTS');
        console.log('========================');
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
            routeType: result.routeType === 'screens',
            keywordMatch: result.keyword === testConfig.keyword,
            platformMatch: result.platform === testConfig.platform,
            hasResults: result.capturedURLs.length > 0,
            strategyAppropriate: result.strategy.includes('click-suggestion') || result.strategy.includes('screen'),
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
            const screenURLs = result.capturedURLs.filter(url => url.route === 'screens');
            const relevantURLs = result.capturedURLs.filter(url =>
                url.title?.toLowerCase().includes('login') ||
                url.title?.toLowerCase().includes('sign in') ||
                url.metadata?.description?.toLowerCase().includes('login') ||
                url.metadata?.description?.toLowerCase().includes('sign in') ||
                url.metadata?.category?.toLowerCase().includes('auth')
            );

            console.log(`📱 Screen URLs: ${screenURLs.length}/${result.capturedURLs.length}`);
            console.log(`🎯 Login-related URLs: ${relevantURLs.length}/${result.capturedURLs.length}`);
        } else {
            console.log('❌ No URLs captured - route may have failed');
        }

        console.log('\n🎯 SCREENS ROUTE TEST SUMMARY');
        console.log('=============================');
        console.log(`Overall Status: ${allValidationsPassed && result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`Route Adherence: ${validations.routeType && validations.strategyAppropriate ? '✅ CORRECT' : '❌ INCORRECT'}`);
        console.log(`Results Quality: ${validations.hasResults ? '✅ GOOD' : '❌ POOR'}`);
        console.log(`Execution Time: ${totalTime}ms`);

        // Validate screen-specific characteristics
        console.log('\n📱 SCREEN-SPECIFIC VALIDATION');
        console.log('=============================');

        const screenCharacteristics = {
            hasScreenURLs: result.capturedURLs.some(url => url.route === 'screens'),
            relevantToLogin: result.capturedURLs.some(url =>
                url.title?.toLowerCase().includes('login') ||
                url.title?.toLowerCase().includes('sign in') ||
                url.metadata?.description?.toLowerCase().includes('login')
            ),
            hasAuthCategory: result.capturedURLs.some(url =>
                url.metadata?.category?.toLowerCase().includes('auth') ||
                url.metadata?.category?.toLowerCase().includes('login')
            ),
            usesModalPattern: result.strategy.includes('modal') || result.strategy.includes('screen'),
            diverseScreenTypes: result.capturedURLs.length >= 3 // Should capture multiple screen variations
        };

        Object.entries(screenCharacteristics).forEach(([check, passed]) => {
            console.log(`${passed ? '✅' : '❌'} ${check}: ${passed ? 'PASS' : 'FAIL'}`);
        });

        // Analyze screen diversity
        if (result.capturedURLs.length > 0) {
            console.log('\n🎨 SCREEN DIVERSITY ANALYSIS');
            console.log('============================');

            const uniqueTitles = new Set(result.capturedURLs.map(url => url.title?.toLowerCase()));
            const uniqueCategories = new Set(result.capturedURLs.map(url => url.metadata?.category).filter(Boolean));

            console.log(`📊 Unique Screen Titles: ${uniqueTitles.size}`);
            console.log(`📊 Unique Categories: ${uniqueCategories.size}`);

            if (uniqueCategories.size > 0) {
                console.log('Categories found:');
                Array.from(uniqueCategories).forEach(category => {
                    console.log(`   - ${category}`);
                });
            }
        }

        // Format results for detailed analysis
        if (result.success && result.capturedURLs.length > 0) {
            console.log('\n📄 GENERATING FORMATTED RESULTS');
            console.log('================================');

            const formatted = formatter.formatComprehensiveResults(
                [result],
                totalTime,
                `I need login screen design inspiration for ${testConfig.platform} platform`
            );

            console.log('Markdown Summary:');
            console.log(formatted.summary);
        }

        console.log('\n🏁 Screens Route Test Completed');
        console.log(`Final Result: ${allValidationsPassed && result.success ? 'SCREENS ROUTE WORKING CORRECTLY' : 'SCREENS ROUTE NEEDS ATTENTION'}`);

        return {
            success: allValidationsPassed && result.success,
            result,
            validations,
            screenCharacteristics,
            executionTime: totalTime
        };

    } catch (error) {
        console.error('\n❌ SCREENS ROUTE TEST FAILED');
        console.error('=============================');
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
testScreensRouteFocused().catch(console.error);
