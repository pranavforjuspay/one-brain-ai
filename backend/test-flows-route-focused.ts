import { RouteExecutor } from './src/scraping/core/RouteExecutor.js';
import { ResultFormatter } from './src/scraping/core/ResultFormatter.js';

/**
 * FOCUSED FLOWS ROUTE TEST
 * Tests the Flows route with "onboarding" keyword to ensure predictable behavior
 * Validates that the route follows its intended workflow pattern
 */

async function testFlowsRouteFocused() {
    console.log('🔄 FOCUSED FLOWS ROUTE TEST');
    console.log('===========================');
    console.log('Testing Flows route with "onboarding" keyword for predictable behavior\n');

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
        keyword: 'onboarding',
        platform: 'ios' as const,
        maxResults: 4,
        debugMode: true // Enable visible browser for validation
    };

    console.log('📋 TEST CONFIGURATION');
    console.log('=====================');
    console.log(`Keyword: "${testConfig.keyword}"`);
    console.log(`Platform: ${testConfig.platform}`);
    console.log(`Max Results: ${testConfig.maxResults}`);
    console.log(`Debug Mode: ${testConfig.debugMode}`);
    console.log(`Expected Route: Flows`);
    console.log(`Expected Strategy: click-suggestion (flow suggestion)`);
    console.log(`Expected Pattern: Type keyword → Select flow → Browse flows → Capture flow URLs\n`);

    try {
        console.log('🚀 EXECUTING FLOWS ROUTE');
        console.log('========================');

        const startTime = Date.now();

        const result = await executor.executeFlowsRoute(
            testConfig.keyword,
            testConfig.platform,
            testConfig.maxResults,
            testConfig.debugMode
        );

        const totalTime = Date.now() - startTime;

        console.log('\n📊 FLOWS ROUTE RESULTS');
        console.log('======================');
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
            routeType: result.routeType === 'flows',
            keywordMatch: result.keyword === testConfig.keyword,
            platformMatch: result.platform === testConfig.platform,
            hasResults: result.capturedURLs.length > 0,
            strategyAppropriate: result.strategy.includes('click-suggestion') || result.strategy.includes('flow'),
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
                if (url.metadata?.stepCount) {
                    console.log(`   Steps: ${url.metadata.stepCount}`);
                }
                if (url.metadata?.category) {
                    console.log(`   Category: ${url.metadata.category}`);
                }
                console.log('');
            });

            // Validate URL types
            const flowURLs = result.capturedURLs.filter(url => url.route === 'flows');
            const relevantURLs = result.capturedURLs.filter(url =>
                url.title?.toLowerCase().includes('onboard') ||
                url.metadata?.description?.toLowerCase().includes('onboard') ||
                url.metadata?.category?.toLowerCase().includes('onboard')
            );

            console.log(`🔄 Flow URLs: ${flowURLs.length}/${result.capturedURLs.length}`);
            console.log(`🎯 Onboarding-related URLs: ${relevantURLs.length}/${result.capturedURLs.length}`);
        } else {
            console.log('❌ No URLs captured - route may have failed');
        }

        console.log('\n🎯 FLOWS ROUTE TEST SUMMARY');
        console.log('===========================');
        console.log(`Overall Status: ${allValidationsPassed && result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`Route Adherence: ${validations.routeType && validations.strategyAppropriate ? '✅ CORRECT' : '❌ INCORRECT'}`);
        console.log(`Results Quality: ${validations.hasResults ? '✅ GOOD' : '❌ POOR'}`);
        console.log(`Execution Time: ${totalTime}ms`);

        // Validate flow-specific characteristics
        console.log('\n🔄 FLOW-SPECIFIC VALIDATION');
        console.log('===========================');

        const flowCharacteristics = {
            hasFlowURLs: result.capturedURLs.some(url => url.route === 'flows'),
            hasStepCounts: result.capturedURLs.some(url => url.metadata?.stepCount),
            relevantToOnboarding: result.capturedURLs.some(url =>
                url.title?.toLowerCase().includes('onboard') ||
                url.metadata?.description?.toLowerCase().includes('onboard')
            ),
            usesModalPattern: result.strategy.includes('modal') || result.strategy.includes('flow')
        };

        Object.entries(flowCharacteristics).forEach(([check, passed]) => {
            console.log(`${passed ? '✅' : '❌'} ${check}: ${passed ? 'PASS' : 'FAIL'}`);
        });

        // Format results for detailed analysis
        if (result.success && result.capturedURLs.length > 0) {
            console.log('\n📄 GENERATING FORMATTED RESULTS');
            console.log('================================');

            const formatted = formatter.formatComprehensiveResults(
                [result],
                totalTime,
                `I need onboarding flow design inspiration for ${testConfig.platform} platform`
            );

            console.log('Markdown Summary:');
            console.log(formatted.summary);
        }

        console.log('\n🏁 Flows Route Test Completed');
        console.log(`Final Result: ${allValidationsPassed && result.success ? 'FLOWS ROUTE WORKING CORRECTLY' : 'FLOWS ROUTE NEEDS ATTENTION'}`);

        return {
            success: allValidationsPassed && result.success,
            result,
            validations,
            flowCharacteristics,
            executionTime: totalTime
        };

    } catch (error) {
        console.error('\n❌ FLOWS ROUTE TEST FAILED');
        console.error('===========================');
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
testFlowsRouteFocused().catch(console.error);
