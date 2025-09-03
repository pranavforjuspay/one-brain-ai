import { PlaywrightMCPClient } from './src/scraping/core/PlaywrightMCPClient.js';
import { URLCaptureManager } from './src/scraping/core/URLCaptureManager.js';
import fastify from 'fastify';

/**
 * Test the FIXED Continue button selectors
 * This will verify that we can properly click the Continue button after entering email
 */
async function testFixedContinueButton() {
    console.log('🔧 TESTING FIXED CONTINUE BUTTON SELECTORS');
    console.log('==========================================');

    const startTime = Date.now();

    // Create Fastify app for MCP client
    const app = fastify({ logger: false });

    try {
        // Initialize components
        const mcpClient = new PlaywrightMCPClient(app);
        const urlCaptureManager = new URLCaptureManager();

        console.log('🚀 Step 1: Navigate to Mobbin and click login');
        console.log('==============================================');

        // Navigate to Mobbin with visible browser
        await mcpClient.executeWorkflow([{
            action: 'navigate',
            value: 'https://mobbin.com',
            description: 'Navigate to Mobbin homepage',
            timeout: 10000
        }], true); // debugMode = true for visible browser

        // Wait for page to load
        await mcpClient.executeWorkflow([{
            action: 'waitFor',
            selector: 'body',
            description: 'Wait for Mobbin homepage to load',
            timeout: 5000
        }], true);

        // Click login button
        await mcpClient.executeWorkflow([{
            action: 'click',
            selector: 'a[href="/login"]',
            description: 'Click login button',
            timeout: 5000
        }], true);

        // Take screenshot after clicking login
        console.log('📸 Taking screenshot after clicking login...');
        await mcpClient.callMCPTool('playwright_screenshot', {
            name: 'after-login-click',
            storeBase64: true,
            savePng: true,
            downloadsDir: process.cwd() + '/backend/screenshots'
        });

        console.log('📧 Step 2: Enter email address');
        console.log('==============================');

        // Enter email
        const email = process.env.MOBBIN_EMAIL || 'design.purchase@juspay.in';
        await mcpClient.executeWorkflow([{
            action: 'fill',
            selector: 'input[type="email"]',
            value: email,
            description: `Enter email: ${email}`
        }], true);

        // Take screenshot after entering email
        console.log('📸 Taking screenshot after entering email...');
        await mcpClient.callMCPTool('playwright_screenshot', {
            name: 'after-email-entry',
            storeBase64: true,
            savePng: true,
            downloadsDir: process.cwd() + '/backend/screenshots'
        });

        console.log('🔄 Step 3: Test FIXED Continue button selectors');
        console.log('===============================================');

        // Test the FIXED Continue button selectors that avoid Google button
        const continueSelectors = [
            // PRIMARY: Target the black Continue button, explicitly avoiding Google
            'button[type="submit"]:not(:has-text("Google")):not(:has-text("google"))',  // Submit button without Google text
            'button:has-text("Continue"):not(:has-text("Google")):not(:has-text("with"))',  // Continue without Google/with
            'form:not(:has-text("Google")) button[type="submit"]',  // Submit button in non-Google form
            'form:not(:has-text("Google")) button:has-text("Continue")',  // Continue in non-Google form

            // SECONDARY: More specific exclusions
            'button:has-text("Continue"):not([class*="google"]):not([class*="Google"])',  // Continue without Google class
            'button[type="submit"]:not([class*="google"]):not([class*="Google"])',  // Submit without Google class
            '[data-testid="continue-button"]:not([class*="google"])',  // Test ID without Google

            // TERTIARY: Form-based targeting (safer)
            'form:has(input[type="email"]) button[type="submit"]',  // Submit in email form
            'form:has(input[type="email"]) button:last-child',  // Last button in email form
            'input[type="email"] ~ button',  // Button after email input
            'input[type="email"] + * button',  // Button in element after email

            // QUATERNARY: Fallback with strong Google exclusion
            'button:not(:has-text("Google")):not(:has-text("google")):not([class*="google"])'  // Any button without Google
        ];

        let continueClicked = false;
        let successfulSelector = '';

        for (let i = 0; i < continueSelectors.length; i++) {
            const selector = continueSelectors[i];
            try {
                console.log(`🎯 Testing selector ${i + 1}/${continueSelectors.length}: "${selector}"`);

                await mcpClient.executeWorkflow([{
                    action: 'click',
                    selector: selector,
                    description: `Test continue button with: ${selector}`,
                    timeout: 3000
                }], true);

                // Wait a moment to see if page changes
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Check if we progressed to password step
                const pageContent = await mcpClient.getPageContent();
                const hasPasswordField = pageContent.toLowerCase().includes('password') ||
                    pageContent.includes('input[type="password"]');

                if (hasPasswordField) {
                    console.log(`✅ SUCCESS! Selector "${selector}" worked - found password field`);
                    continueClicked = true;
                    successfulSelector = selector;

                    // Take screenshot of success
                    await mcpClient.callMCPTool('playwright_screenshot', {
                        name: 'continue-button-success',
                        storeBase64: true,
                        savePng: true,
                        downloadsDir: process.cwd() + '/backend/screenshots'
                    });

                    break;
                } else {
                    console.log(`❌ Selector "${selector}" didn't progress to password step`);
                }

            } catch (error) {
                console.log(`❌ Selector "${selector}" failed: ${error.message}`);
            }
        }

        if (continueClicked) {
            console.log('');
            console.log('🎉 CONTINUE BUTTON FIX SUCCESSFUL!');
            console.log('==================================');
            console.log(`✅ Working selector: "${successfulSelector}"`);
            console.log('✅ Successfully progressed to password step');
            console.log('✅ Authentication flow can now proceed correctly');

            // Complete the authentication to test full flow
            console.log('');
            console.log('🔑 Step 4: Complete authentication test');
            console.log('======================================');

            // Enter password
            const password = process.env.MOBBIN_PASSWORD || 'jusdesign#333';
            await mcpClient.executeWorkflow([{
                action: 'fill',
                selector: 'input[type="password"]',
                value: password,
                description: `Enter password`
            }], true);

            // Click final continue
            await mcpClient.executeWorkflow([{
                action: 'click',
                selector: successfulSelector,
                description: `Click final continue with working selector`,
                timeout: 5000
            }], true);

            // Wait for result
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Take final screenshot
            await mcpClient.callMCPTool('playwright_screenshot', {
                name: 'final-authentication-result',
                storeBase64: true,
                savePng: true,
                downloadsDir: process.cwd() + '/backend/screenshots'
            });

            // Check final result
            const finalContent = await mcpClient.getPageContent();
            const stillHasLogin = finalContent.toLowerCase().includes('welcome back') ||
                finalContent.toLowerCase().includes('continue with google');

            if (stillHasLogin) {
                console.log('🔍 Authentication completed but credentials were rejected');
                console.log('✅ Continue button fix is working correctly');
                console.log('⚠️  Need to verify/update Mobbin credentials');
            } else {
                console.log('🎉 FULL AUTHENTICATION SUCCESS!');
                console.log('✅ Continue button fix working');
                console.log('✅ Credentials accepted');
                console.log('✅ Logged into Mobbin successfully');
            }

        } else {
            console.log('');
            console.log('❌ CONTINUE BUTTON FIX FAILED');
            console.log('=============================');
            console.log('❌ None of the selectors worked');
            console.log('❌ Need to investigate further');

            // Take screenshot of failure state
            await mcpClient.callMCPTool('playwright_screenshot', {
                name: 'continue-button-failure',
                storeBase64: true,
                savePng: true,
                downloadsDir: process.cwd() + '/backend/screenshots'
            });
        }

        const executionTime = Date.now() - startTime;

        console.log('');
        console.log('📊 TEST SUMMARY');
        console.log('===============');
        console.log(`⏱️  Total execution time: ${executionTime}ms`);
        console.log(`🎯 Continue button fix: ${continueClicked ? 'SUCCESS' : 'FAILED'}`);
        if (continueClicked) {
            console.log(`🔧 Working selector: "${successfulSelector}"`);
        }
        console.log('📸 Screenshots saved to backend/screenshots/');

    } catch (error) {
        console.error('💥 Test failed:', error);
    }

    console.log('');
    console.log('🏁 Continue button fix test completed!');
}

// Run the test
testFixedContinueButton().catch(console.error);
