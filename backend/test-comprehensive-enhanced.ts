#!/usr/bin/env node

/**
 * Comprehensive test with enhanced login detection
 * Tests the complete scraping system with improved authentication
 */

import { RouteExecutor } from './src/scraping/core/RouteExecutor.js';
import { ResultFormatter } from './src/scraping/core/ResultFormatter.js';
import fastify from 'fastify';
import fs from 'fs';
import path from 'path';

async function testComprehensiveEnhanced() {
    console.log('🚀 COMPREHENSIVE ENHANCED SCRAPING TEST');
    console.log('=======================================');

    const app = fastify({ logger: false });
    const executor = new RouteExecutor(app);
    const formatter = new ResultFormatter();

    try {
        console.log('🎯 Testing comprehensive scraping with enhanced login detection...');
        console.log('📋 Keywords: ["onboarding", "fintech"]');
        console.log('🔧 Enhanced features:');
        console.log('   ✅ Improved login button detection (link-based selectors)');
        console.log('   ✅ Enhanced authentication verification');
        console.log('   ✅ Detailed logging and error handling');
        console.log('   ✅ Multi-route execution (Apps, Flows, Screens)');

        console.log('\n🚀 Starting comprehensive search...');

        // Execute comprehensive search with multiple keywords and routes
        const comprehensiveResult = await executor.executeComprehensiveSearch(
            ['onboarding', 'fintech'],
            {
                apps: { enabled: true, platform: 'ios', maxResults: 3 },
                flows: { enabled: true, platform: 'ios', maxResults: 3 },
                screens: { enabled: true, platform: 'ios', maxResults: 3 }
            },
            false // headless mode for faster execution
        );

        console.log('\n📊 COMPREHENSIVE TEST RESULTS:');
        console.log('===============================');
        console.log(`🎯 Total Results: ${comprehensiveResult.results.length}`);
        console.log(`⏱️ Total Execution Time: ${comprehensiveResult.totalExecutionTime}ms`);
        console.log(`📍 Total URLs Captured: ${comprehensiveResult.totalCapturedURLs}`);
        console.log(`📋 Summary: ${comprehensiveResult.summary}`);

        // Analyze results by route type
        const routeAnalysis = {
            apps: comprehensiveResult.results.filter(r => r.routeType === 'apps'),
            flows: comprehensiveResult.results.filter(r => r.routeType === 'flows'),
            screens: comprehensiveResult.results.filter(r => r.routeType === 'screens')
        };

        console.log('\n🔍 ROUTE-SPECIFIC ANALYSIS:');
        console.log('============================');
        console.log(`📱 Apps Routes: ${routeAnalysis.apps.length} executions`);
        console.log(`🌊 Flows Routes: ${routeAnalysis.flows.length} executions`);
        console.log(`📱 Screens Routes: ${routeAnalysis.screens.length} executions`);

        // Detailed results for each route
        comprehensiveResult.results.forEach((result, index) => {
            console.log(`\n📋 Result ${index + 1}: ${result.routeType.toUpperCase()} - "${result.keyword}"`);
            console.log(`   ✅ Success: ${result.success}`);
            console.log(`   🎯 Strategy: ${result.strategy}`);
            console.log(`   ⏱️ Time: ${result.executionTime}ms`);
            console.log(`   📍 URLs: ${result.capturedURLs.length}`);

            if (result.errors.length > 0) {
                console.log(`   ❌ Errors: ${result.errors.join(', ')}`);
            }

            // Show captured URLs
            result.capturedURLs.forEach((url, urlIndex) => {
                console.log(`      ${urlIndex + 1}. ${url.title} - ${url.url}`);
            });
        });

        // Format results for user-friendly display
        const formatted = formatter.formatComprehensiveResults(
            comprehensiveResult.results,
            comprehensiveResult.totalExecutionTime,
            "Comprehensive test of enhanced scraping system with improved login detection"
        );

        // Create results directory
        const resultsDir = path.join(process.cwd(), 'results');
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }

        // Save results
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const baseFilename = `comprehensive-enhanced-${timestamp}`;

        fs.writeFileSync(
            path.join(resultsDir, `${baseFilename}.md`),
            formatted.markdown
        );

        fs.writeFileSync(
            path.join(resultsDir, `${baseFilename}.json`),
            JSON.stringify(formatted.json, null, 2)
        );

        fs.writeFileSync(
            path.join(resultsDir, `${baseFilename}-summary.txt`),
            typeof formatted.summary === 'string' ? formatted.summary : JSON.stringify(formatted.summary, null, 2)
        );

        console.log('\n📁 RESULTS SAVED:');
        console.log('==================');
        console.log(`📄 Markdown: results/${baseFilename}.md`);
        console.log(`📊 JSON: results/${baseFilename}.json`);
        console.log(`📋 Summary: results/${baseFilename}-summary.txt`);

        // Test analysis
        const successfulRoutes = comprehensiveResult.results.filter(r => r.success);
        const failedRoutes = comprehensiveResult.results.filter(r => !r.success);
        const authenticationIssues = comprehensiveResult.results.filter(r =>
            r.errors.some(error => error.includes('Authentication'))
        );
        const loginButtonIssues = comprehensiveResult.results.filter(r =>
            r.errors.some(error => error.includes('Could not find or click login button'))
        );

        console.log('\n🧪 TEST ANALYSIS:');
        console.log('=================');
        console.log(`✅ Successful Routes: ${successfulRoutes.length}/${comprehensiveResult.results.length}`);
        console.log(`❌ Failed Routes: ${failedRoutes.length}/${comprehensiveResult.results.length}`);
        console.log(`🔐 Authentication Issues: ${authenticationIssues.length}`);
        console.log(`🎯 Login Button Issues: ${loginButtonIssues.length}`);

        // Enhanced login detection assessment
        if (loginButtonIssues.length === 0) {
            console.log('\n🎉 ENHANCED LOGIN DETECTION: SUCCESS ✅');
            console.log('✅ No login button detection failures found');
            console.log('✅ Enhanced selectors are working correctly');
        } else {
            console.log('\n⚠️ ENHANCED LOGIN DETECTION: NEEDS ATTENTION ⚠️');
            console.log('❌ Some login button detection issues remain');
        }

        if (authenticationIssues.length > 0) {
            console.log('\n🔧 AUTHENTICATION RECOMMENDATIONS:');
            console.log('===================================');
            console.log('🔍 Check credentials in .env file');
            console.log('🔍 Verify if 2FA or additional verification is required');
            console.log('🔍 Test manual login with same credentials');
            console.log('🔍 Consider anti-bot detection measures');
        }

        const overallSuccess = successfulRoutes.length > 0 && loginButtonIssues.length === 0;

        console.log(`\n🎯 OVERALL TEST RESULT: ${overallSuccess ? 'SUCCESS ✅' : 'NEEDS IMPROVEMENT ⚠️'}`);

        if (overallSuccess) {
            console.log('🎉 Enhanced scraping system is working correctly!');
            console.log('✅ Login detection improvements are effective');
            console.log('✅ System can capture design inspiration URLs');
        } else {
            console.log('🔧 System needs further improvements');
            console.log('📋 Focus on resolving authentication and credential issues');
        }

    } catch (error) {
        console.error('❌ Comprehensive test failed with error:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run the comprehensive test
testComprehensiveEnhanced().catch(console.error);
