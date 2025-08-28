import fastify from 'fastify';

/**
 * Simple authentication debug test using MCP tools directly
 * This will help us see exactly what's happening step by step
 */
async function testSimpleAuthDebug() {
    console.log('🔐 SIMPLE AUTHENTICATION DEBUG TEST');
    console.log('===================================');

    const app = fastify({ logger: false });

    try {
        // Use MCP tools directly for better control
        console.log('🚀 Step 1: Starting Playwright and navigating to Mobbin...');

        // Navigate to Mobbin with visible browser
        const navResult = await app.inject({
            method: 'POST',
            url: '/mcp/playwright-mcp-server/playwright_navigate',
            payload: {
                url: 'https://mobbin.com',
                headless: false,
                width: 1280,
                height: 800
            }
        });

        console.log('Navigation result:', navResult.statusCode);
        if (navResult.statusCode !== 200) {
            console.error('Navigation failed:', navResult.body);
            return;
        }

        // Wait a moment for page to load
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('📸 Step 2: Taking initial screenshot...');

        // Take screenshot
        const screenshotResult = await app.inject({
            method: 'POST',
            url: '/mcp/playwright-mcp-server/playwright_screenshot',
            payload: {
                name: 'initial-mobbin-page',
                savePng: true,
                downloadsDir: process.cwd() + '/backend/screenshots'
            }
        });

        console.log('Screenshot result:', screenshotResult.statusCode);

        console.log('📄 Step 3: Getting page content...');

        // Get page content
        const contentResult = await app.inject({
            method: 'POST',
            url: '/mcp/playwright-mcp-server/playwright_get_visible_text',
            payload: {}
        });

        if (contentResult.statusCode === 200) {
            const content = JSON.parse(contentResult.body);
            console.log('Page content length:', content.length || 'unknown');
            console.log('Content preview:', (content.substring ? content.substring(0, 500) : 'No content') + '...');

            // Check for login indicators
            const hasLogin = content.toLowerCase().includes('login') || content.toLowerCase().includes('log in');
            const hasLoggedIn = content.toLowerCase().includes('invite & earn') || content.toLowerCase().includes('profile');

            console.log('🔍 Login status analysis:');
            console.log(`- Has login button: ${hasLogin}`);
            console.log(`- Has logged-in indicators: ${hasLoggedIn}`);
            console.log(`- Appears logged in: ${!hasLogin && hasLoggedIn}`);
        }

        console.log('🔐 Step 4: Looking for login button...');

        // Try to click login button
        const loginSelectors = [
            'a[href="/login"]',
            'text=Log in',
            'text=Login',
            '[data-sentry-component="PublicPagesLink"]'
        ];

        for (const selector of loginSelectors) {
            try {
                console.log(`Trying to click: ${selector}`);

                const clickResult = await app.inject({
                    method: 'POST',
                    url: '/mcp/playwright-mcp-server/playwright_click',
                    payload: {
                        selector: selector
                    }
                });

                if (clickResult.statusCode === 200) {
                    console.log(`✅ Successfully clicked: ${selector}`);

                    // Wait for login page to load
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    // Take screenshot of login page
                    await app.inject({
                        method: 'POST',
                        url: '/mcp/playwright-mcp-server/playwright_screenshot',
                        payload: {
                            name: 'login-page',
                            savePng: true,
                            downloadsDir: process.cwd() + '/backend/screenshots'
                        }
                    });

                    break;
                } else {
                    console.log(`❌ Failed to click: ${selector} - ${clickResult.body}`);
                }
            } catch (error) {
                console.log(`❌ Error clicking ${selector}:`, error.message);
            }
        }

        console.log('📧 Step 5: Entering email...');

        // Enter email
        const email = process.env.MOBBIN_EMAIL || 'design.purchase@juspay.in';
        const emailResult = await app.inject({
            method: 'POST',
            url: '/mcp/playwright-mcp-server/playwright_fill',
            payload: {
                selector: 'input[type="email"]',
                value: email
            }
        });

        console.log('Email entry result:', emailResult.statusCode);
        if (emailResult.statusCode === 200) {
            console.log(`✅ Email entered: ${email}`);
        } else {
            console.log(`❌ Failed to enter email: ${emailResult.body}`);
        }

        // Take screenshot after email entry
        await app.inject({
            method: 'POST',
            url: '/mcp/playwright-mcp-server/playwright_screenshot',
            payload: {
                name: 'email-entered',
                savePng: true,
                downloadsDir: process.cwd() + '/backend/screenshots'
            }
        });

        console.log('🔄 Step 6: Clicking continue...');

        // Click continue
        const continueResult = await app.inject({
            method: 'POST',
            url: '/mcp/playwright-mcp-server/playwright_click',
            payload: {
                selector: 'button:has-text("Continue")'
            }
        });

        console.log('Continue click result:', continueResult.statusCode);

        // Wait and take screenshot
        await new Promise(resolve => setTimeout(resolve, 2000));
        await app.inject({
            method: 'POST',
            url: '/mcp/playwright-mcp-server/playwright_screenshot',
            payload: {
                name: 'after-continue',
                savePng: true,
                downloadsDir: process.cwd() + '/backend/screenshots'
            }
        });

        console.log('🔑 Step 7: Entering password...');

        // Enter password
        const password = process.env.MOBBIN_PASSWORD || 'jusdesign#333';
        const passwordResult = await app.inject({
            method: 'POST',
            url: '/mcp/playwright-mcp-server/playwright_fill',
            payload: {
                selector: 'input[type="password"]',
                value: password
            }
        });

        console.log('Password entry result:', passwordResult.statusCode);

        // Take screenshot after password entry
        await app.inject({
            method: 'POST',
            url: '/mcp/playwright-mcp-server/playwright_screenshot',
            payload: {
                name: 'password-entered',
                savePng: true,
                downloadsDir: process.cwd() + '/backend/screenshots'
            }
        });

        console.log('🚀 Step 8: Final continue click...');

        // Final continue click
        const finalContinueResult = await app.inject({
            method: 'POST',
            url: '/mcp/playwright-mcp-server/playwright_click',
            payload: {
                selector: 'button:has-text("Continue")'
            }
        });

        console.log('Final continue result:', finalContinueResult.statusCode);

        // Wait for result and take final screenshot
        await new Promise(resolve => setTimeout(resolve, 5000));
        await app.inject({
            method: 'POST',
            url: '/mcp/playwright-mcp-server/playwright_screenshot',
            payload: {
                name: 'final-result',
                savePng: true,
                downloadsDir: process.cwd() + '/backend/screenshots'
            }
        });

        console.log('✅ Authentication test completed!');
        console.log('📸 Check backend/screenshots/ for visual evidence');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }

    console.log('🏁 Simple auth debug test finished!');
}

// Run the test
testSimpleAuthDebug().catch(console.error);
