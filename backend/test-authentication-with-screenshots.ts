import { PlaywrightMCPClient } from './src/scraping/core/PlaywrightMCPClient.js';
import { URLCaptureManager } from './src/scraping/core/URLCaptureManager.js';
import fastify from 'fastify';

/**
 * Test ONLY the authentication process with screenshots at each step
 * This will help debug exactly what's happening during login
 */
async function testAuthenticationWithScreenshots() {
    console.log('🔐 TESTING AUTHENTICATION PROCESS WITH SCREENSHOTS');
    console.log('==================================================');

    const startTime = Date.now();

    // Create Fastify app for MCP client
    const app = fastify({ logger: false });

    try {
        // Initialize components
        const mcpClient = new PlaywrightMCPClient(app);
        const urlCaptureManager = new URLCaptureManager();

        console.log('🚀 Step 1: Navigate to Mobbin homepage');
        console.log('=====================================');

        // Navigate to Mobbin with visible browser
        await mcpClient.executeWorkflow([{
            action: 'navigate',
            value: 'https://mobbin.com',
            description: 'Navigate to Mobbin homepage',
            timeout: 10000
        }], true); // debugMode = true for visible browser

        // Take screenshot after navigation
        console.log('📸 Taking screenshot after navigation...');
        await mcpClient.callMCPTool('playwright_screenshot', {
            name: 'step1-homepage-loaded',
            storeBase64: true,
            savePng: true,
            downloadsDir: process.cwd() + '/backend/screenshots'
        });

        // Wait for page to fully load
        await mcpClient.executeWorkflow([{
            action: 'waitFor',
            selector: 'body',
            description: 'Wait for Mobbin homepage to load',
            timeout: 5000
        }], true);

        console.log('✅ Step 1 completed - Homepage loaded');
        console.log('');

        console.log('🔍 Step 2: Check initial page content for login status');
        console.log('====================================================');

        // Get initial page content to analyze
        const initialContent = await mcpClient.getPageContent();
        console.log('📄 Initial page content length:', initialContent.length);
        console.log('📄 Content preview (first 500 chars):');
        console.log(initialContent.substring(0, 500));
        console.log('');

        // Check for login indicators
        const hasLoginButton = initialContent.toLowerCase().includes('login') ||
            initialContent.toLowerCase().includes('log in') ||
            initialContent.toLowerCase().includes('sign in');

        const hasLoggedInIndicators = initialContent.toLowerCase().includes('profile') ||
            initialContent.toLowerCase().includes('account') ||
            initialContent.toLowerCase().includes('logout') ||
            initialContent.toLowerCase().includes('log out') ||
            initialContent.toLowerCase().includes('invite & earn') ||
            initialContent.toLowerCase().includes('dashboard');

        console.log('🔍 Initial login status analysis:');
        console.log(`- Has login button: ${hasLoginButton}`);
        console.log(`- Has logged-in indicators: ${hasLoggedInIndicators}`);
        console.log(`- Appears to be logged in: ${!hasLoginButton && hasLoggedInIndicators}`);
        console.log('');

        console.log('🔐 Step 3: Start authentication process');
        console.log('=======================================');

        // Call the exact same authentication method that was failing
        console.log('🔄 Calling URLCaptureManager.checkAndHandleAuthentication()...');
        console.log('This will execute the EXACT same logic that was failing before');
        console.log('');

        try {
            // This is the exact method that was failing - let's see what happens step by step
            await urlCaptureManager.checkAndHandleAuthentication(mcpClient);

            console.log('🎉 Authentication completed successfully!');

            // Take final screenshot
            console.log('📸 Taking final screenshot after successful authentication...');
            await mcpClient.callMCPTool('playwright_screenshot', {
                name: 'step3-authentication-success',
                storeBase64: true,
                savePng: true,
                downloadsDir: process.cwd() + '/backend/screenshots'
            });

        } catch (authError) {
            console.error('❌ Authentication failed:', authError.message);

            // Take screenshot of failure state
            console.log('📸 Taking screenshot of authentication failure state...');
            await mcpClient.callMCPTool('playwright_screenshot', {
                name: 'step3-authentication-failed',
                storeBase64: true,
                savePng: true,
                downloadsDir: process.cwd() + '/backend/screenshots'
            });

            // Get page content after failure for analysis
            const failureContent = await mcpClient.getPageContent();
            console.log('');
            console.log('🔍 Page content after authentication failure:');
            console.log('==============================================');
            console.log('📄 Content length:', failureContent.length);
            console.log('📄 Content preview (first 800 chars):');
            console.log(failureContent.substring(0, 800));
            console.log('');

            // Look for specific error indicators
            const hasErrorMessage = failureContent.toLowerCase().includes('error') ||
                failureContent.toLowerCase().includes('invalid') ||
                failureContent.toLowerCase().includes('incorrect') ||
                failureContent.toLowerCase().includes('failed');

            const stillHasLoginForm = failureContent.toLowerCase().includes('password') ||
                failureContent.toLowerCase().includes('email') ||
                failureContent.toLowerCase().includes('continue');

            console.log('🔍 Failure analysis:');
            console.log(`- Has error message: ${hasErrorMessage}`);
            console.log(`- Still shows login form: ${stillHasLoginForm}`);
            console.log('');

            throw authError;
        }

        const executionTime = Date.now() - startTime;

        console.log('');
        console.log('📊 AUTHENTICATION TEST SUMMARY');
        console.log('===============================');
        console.log(`⏱️  Total execution time: ${executionTime}ms`);
        console.log('✅ Authentication process completed successfully');
        console.log('📸 Screenshots saved to backend/screenshots/');
        console.log('');
        console.log('🎯 Key findings:');
        console.log('- Authentication detection logic is working');
        console.log('- Login flow executed without errors');
        console.log('- Session persistence should now be active');

    } catch (error) {
        const executionTime = Date.now() - startTime;

        console.error('💥 Authentication test failed:', error.message);
        console.log('');
        console.log('📊 AUTHENTICATION TEST SUMMARY');
        console.log('===============================');
        console.log(`⏱️  Total execution time: ${executionTime}ms`);
        console.log('❌ Authentication process failed');
        console.log('📸 Screenshots saved to backend/screenshots/');
        console.log('');
        console.log('🔍 Error analysis:');

        if (error.message.includes('Authentication')) {
            console.log('- Error type: Authentication failure');
            console.log('- Likely cause: Invalid credentials or UI changes');
            console.log('- Next step: Check screenshots to see exact failure point');
        } else if (error.message.includes('timeout')) {
            console.log('- Error type: Timeout');
            console.log('- Likely cause: Slow page loading or element not found');
            console.log('- Next step: Increase timeouts or check selectors');
        } else {
            console.log('- Error type: Unknown');
            console.log('- Check screenshots and logs for more details');
        }
    }

    console.log('');
    console.log('🏁 Authentication screenshot test completed!');
    console.log('Check the backend/screenshots/ folder for visual evidence of each step.');
}

// Run the test
testAuthenticationWithScreenshots().catch(console.error);
