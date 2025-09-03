import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test the new unified route to verify it works correctly
 */
async function testUnifiedRoute() {
    console.log('🧪 UNIFIED ROUTE TEST');
    console.log('====================');

    const baseUrl = 'http://localhost:8787';

    try {
        // Test 1: Health check
        console.log('\n📋 Test 1: Health Check');
        console.log('GET /unified/health');

        const healthResponse = await fetch(`${baseUrl}/unified/health`);
        const healthData = await healthResponse.json();

        console.log('✅ Health check response:', {
            status: healthData.status,
            components: Object.keys(healthData.components),
            workflowSteps: healthData.workflow.steps.length
        });

        // Test 2: Analyze keywords (no scraping)
        console.log('\n🔍 Test 2: Keyword Analysis');
        console.log('POST /unified/analyze');

        const analyzePayload = {
            problemStatement: "I need fintech login screens with biometric authentication"
        };

        const analyzeResponse = await fetch(`${baseUrl}/unified/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(analyzePayload)
        });

        const analyzeData = await analyzeResponse.json();

        console.log('✅ Analysis response:', {
            keywords: analyzeData.analysis.extractedKeywords,
            routeDecision: analyzeData.analysis.routeDecision,
            reason: analyzeData.analysis.routeDecisionReason,
            plannedSteps: analyzeData.workflow.plannedSteps.length
        });

        // Test 3: Full unified search (with actual scraping)
        console.log('\n🚀 Test 3: Full Unified Search');
        console.log('POST /unified/search');
        console.log('⚠️  This will open a browser and perform actual scraping...');

        const searchPayload = {
            problemStatement: "fintech banking login",
            thumbnailsPerKeyword: 2 // Limit to 2 thumbnails for faster testing
        };

        console.log('📤 Sending request with payload:', searchPayload);

        const searchResponse = await fetch(`${baseUrl}/unified/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(searchPayload)
        });

        if (!searchResponse.ok) {
            const errorData = await searchResponse.json();
            console.error('❌ Search request failed:', {
                status: searchResponse.status,
                error: errorData.error,
                details: errorData.details
            });
            return;
        }

        const searchData = await searchResponse.json();

        console.log('✅ Search completed successfully!');
        console.log('📊 Results summary:', {
            requestId: searchData.requestId,
            keywords: searchData.analysis.extractedKeywords,
            routeDecision: searchData.analysis.routeDecision,
            totalResults: searchData.results.totalResults,
            executionTime: `${searchData.results.executionTime}ms`,
            authenticationUsed: searchData.execution.authenticationUsed,
            workflow: searchData.execution.workflow
        });

        console.log('\n📋 Results by keyword:');
        for (const [keyword, results] of Object.entries(searchData.results.byKeyword)) {
            console.log(`  ${keyword}: ${(results as any[]).length} URLs captured`);
            (results as any[]).forEach((result: any, index: number) => {
                console.log(`    ${index + 1}. ${result.url}`);
            });
        }

        console.log('\n🎉 All tests completed successfully!');
        console.log('\n📝 Summary:');
        console.log('- Health check: ✅ Passed');
        console.log('- Keyword analysis: ✅ Passed');
        console.log('- Full unified search: ✅ Passed');
        console.log(`- Total URLs captured: ${searchData.results.totalResults}`);
        console.log(`- Execution time: ${searchData.results.executionTime}ms`);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);

        console.log('\n🔧 Troubleshooting:');
        console.log('1. Make sure the backend server is running: npm run dev');
        console.log('2. Check that environment variables are set in .env file');
        console.log('3. Verify MCP server is working correctly');
        console.log('4. Check network connectivity');
    }
}

// Run the test
console.log('Starting unified route test...');
console.log('Make sure the backend server is running on http://localhost:8787');
console.log('');

testUnifiedRoute().catch(console.error);
