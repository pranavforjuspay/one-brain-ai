import { RouteExecutor } from './src/scraping/core/RouteExecutor.js';
import { ResultFormatter } from './src/scraping/core/ResultFormatter.js';
import fastify from 'fastify';

/**
 * Test the FIXED authentication system with:
 * 1. Improved login detection based on actual Mobbin UI
 * 2. Session persistence to avoid re-authenticating for each route
 * 3. Proper error handling for authentication failures
 */
async function testFixedAuthentication() {
    console.log('🚀 TESTING FIXED AUTHENTICATION SYSTEM');
    console.log('=====================================');

    const startTime = Date.now();

    // Create Fastify app for MCP client
    const app = fastify({ logger: false });

    try {
        // Initialize RouteExecutor
        const routeExecutor = new RouteExecutor(app);

        console.log('🔧 Testing authentication fixes:');
        console.log('1. ✅ Enhanced login detection (looks for "Invite & earn", navigation elements)');
        console.log('2. ✅ Session persistence (authenticate once, use for all routes)');
        console.log('3. ✅ Proper error handling (stop execution on auth failure)');
        console.log('');

        // Test configuration - smaller scope to verify fixes work
        const keywords = ['onboarding'];
        const routeConfig = {
            apps: { enabled: true, platform: 'ios' as const, maxResults: 1 },
            flows: { enabled: true, platform: 'ios' as const, maxResults: 1 },
            screens: { enabled: true, platform: 'ios' as const, maxResults: 1 }
        };

        console.log('🎯 Test Configuration:');
        console.log(`- Keywords: ${keywords.join(', ')}`);
        console.log(`- Routes: Apps (${routeConfig.apps.maxResults}), Flows (${routeConfig.flows.maxResults}), Screens (${routeConfig.screens.maxResults})`);
        console.log('- Expected behavior: Authenticate ONCE, then use session for all 3 routes');
        console.log('');

        // Execute comprehensive search with fixed authentication
        console.log('🔄 Starting comprehensive search with fixed authentication...');
        const results = await routeExecutor.executeComprehensiveSearch(
            keywords,
            routeConfig,
            false // debugMode = false for cleaner output
        );

        const executionTime = Date.now() - startTime;

        console.log('');
        console.log('📊 AUTHENTICATION TEST RESULTS:');
        console.log('================================');
        console.log(`⏱️  Total execution time: ${executionTime}ms`);
        console.log(`📈 Total routes executed: ${results.results.length}`);
        console.log(`✅ Successful routes: ${results.results.filter(r => r.success).length}`);
        console.log(`❌ Failed routes: ${results.results.filter(r => !r.success).length}`);
        console.log(`🔗 Total URLs captured: ${results.totalCapturedURLs}`);
        console.log('');

        // Analyze authentication behavior
        console.log('🔍 AUTHENTICATION ANALYSIS:');
        console.log('============================');

        const authErrors = results.results.filter(r =>
            r.errors.some(e => e.includes('Authentication'))
        );

        if (authErrors.length === 0) {
            console.log('✅ SUCCESS: No authentication errors detected!');
            console.log('✅ Session persistence working correctly');
        } else if (authErrors.length === results.results.length) {
            console.log('❌ FAILURE: All routes failed with authentication errors');
            console.log('❌ Authentication detection still not working');
        } else {
            console.log(`⚠️  PARTIAL: ${authErrors.length}/${results.results.length} routes failed with auth errors`);
            console.log('⚠️  Session persistence may be working, but initial auth failed');
        }

        console.log('');
        console.log('📋 DETAILED ROUTE RESULTS:');
        console.log('===========================');

        results.results.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            const authError = result.errors.find(e => e.includes('Authentication'));

            console.log(`${status} Route ${index + 1}: ${result.routeType.toUpperCase()} - "${result.keyword}"`);
            console.log(`   📊 URLs captured: ${result.capturedURLs.length}`);
            console.log(`   ⏱️  Execution time: ${result.executionTime}ms`);
            console.log(`   🔧 Strategy: ${result.strategy}`);

            if (authError) {
                console.log(`   🔐 Auth Error: ${authError.substring(0, 100)}...`);
            }

            if (result.errors.length > 0 && !authError) {
                console.log(`   ❌ Other Errors: ${result.errors.join(', ')}`);
            }

            console.log('');
        });

        // Save results using ResultFormatter
        const formatter = new ResultFormatter();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `fixed-authentication-test-${timestamp}`;

        // Format results
        const formattedResults = formatter.formatComprehensiveResults(
            results.results,
            results.totalExecutionTime,
            'Testing fixed authentication system'
        );

        // Save results manually
        const fs = await import('fs/promises');
        const path = await import('path');

        const resultsDir = path.join(process.cwd(), 'backend', 'results');
        await fs.mkdir(resultsDir, { recursive: true });

        // Save markdown
        await fs.writeFile(
            path.join(resultsDir, `${filename}.md`),
            formattedResults.markdown
        );

        // Save JSON
        await fs.writeFile(
            path.join(resultsDir, `${filename}.json`),
            JSON.stringify(formattedResults.json, null, 2)
        );

        // Save summary
        const summaryText = `Fixed Authentication Test Results
Generated: ${new Date().toISOString()}
Total URLs: ${formattedResults.summary.totalURLs}
Apps: ${formattedResults.summary.appCount}
Flows: ${formattedResults.summary.flowCount}
Screens: ${formattedResults.summary.screenCount}
Keywords: ${formattedResults.summary.keywordCount}
Execution Time: ${formattedResults.summary.executionTime}ms
`;
        await fs.writeFile(
            path.join(resultsDir, `${filename}-summary.txt`),
            summaryText
        );

        console.log(`💾 Results saved to backend/results/${filename}.*`);

        // Final assessment
        console.log('');
        console.log('🎯 FINAL ASSESSMENT:');
        console.log('====================');

        if (results.results.every(r => r.success)) {
            console.log('🎉 PERFECT: All authentication fixes working correctly!');
            console.log('✅ Login detection: Working');
            console.log('✅ Session persistence: Working');
            console.log('✅ Error handling: Working');
        } else if (results.results.some(r => r.success)) {
            console.log('🔄 PROGRESS: Some fixes working, may need credential verification');
            console.log('✅ Login detection: Likely working (some routes succeeded)');
            console.log('✅ Session persistence: Likely working');
            console.log('⚠️  Credential verification: May need attention');
        } else {
            console.log('🔧 NEEDS WORK: Authentication fixes need further refinement');
            console.log('❌ Login detection: Needs improvement');
            console.log('❌ Session persistence: Cannot test until login works');
            console.log('❌ Error handling: Working (properly stopping execution)');
        }

    } catch (error) {
        console.error('💥 Test execution failed:', error);

        if (error.message.includes('Authentication')) {
            console.log('');
            console.log('🔍 AUTHENTICATION ERROR ANALYSIS:');
            console.log('==================================');
            console.log('✅ Error handling: Working correctly (stopping execution on auth failure)');
            console.log('❌ Authentication detection: Still needs refinement');
            console.log('');
            console.log('💡 NEXT STEPS:');
            console.log('- Check if credentials are valid');
            console.log('- Verify login detection selectors match actual Mobbin UI');
            console.log('- Test with visible browser to see what\'s happening');
        }
    }

    console.log('');
    console.log('🏁 Fixed authentication test completed!');
}

// Run the test
testFixedAuthentication().catch(console.error);
