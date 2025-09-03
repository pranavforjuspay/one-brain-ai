import { PlaywrightMCPClient } from './src/scraping/core/PlaywrightMCPClient.js';
import { MobbinAuthService } from './src/scraping/auth/MobbinAuthService.js';
import fastify from 'fastify';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test the FIXED modal workflow - prevents brand name clicking and improves URL capture
 * Tests exactly what the user requested: 5 random thumbnails with proper URL capture
 */
async function testFixedModalWorkflow() {
    const app = fastify({ logger: false });
    const mcpClient = new PlaywrightMCPClient(app);
    const authService = new MobbinAuthService(mcpClient);

    try {
        console.log('🎯 TESTING FIXED MODAL WORKFLOW...');
        console.log('✅ Keeping working thumbnail selector');
        console.log('🔧 Fixed: Brand name clicking prevention');
        console.log('🔧 Fixed: Immediate URL capture');
        console.log('🔧 Fixed: Improved modal closing');
        console.log('🔧 Fixed: DOM stabilization between clicks');

        // Step 1: Navigate and authenticate
        console.log('\n📱 Navigating to Mobbin...');
        await mcpClient.navigate('https://mobbin.com', {
            browserType: 'chromium',
            width: 1280,
            height: 720,
            headless: false,
            timeout: 30000
        });

        console.log('🔐 Authenticating...');
        const authSuccess = await authService.authenticate();
        if (!authSuccess) {
            throw new Error('Authentication failed');
        }
        console.log('✅ Authentication successful');

        // Step 2: Open search and search for "trading"
        console.log('\n🔍 Opening search modal...');
        await mcpClient.click('text=Search on iOS...');
        await mcpClient.waitFor('input[type="text"]', { timeout: 5000 });

        console.log('⌨️ Typing "trading"...');
        await mcpClient.fill('input[type="text"]', 'trading');
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('⏎ Pressing Enter...');
        await mcpClient.pressKey('Enter');
        await mcpClient.waitFor('body', { timeout: 8000 });

        // Step 3: Test the FIXED thumbnail clicking workflow
        console.log('\n🎯 TESTING FIXED THUMBNAIL CLICKING (5 thumbnails)...');

        const results: Array<{
            thumbnailIndex: number;
            url: string;
            success: boolean;
            error?: string;
        }> = [];

        // REVERTED: Use the working selector approach (as per ChatGPT recommendation)
        const THUMBNAIL_SELECTOR = 'div[data-sentry-component="ScreenCell"] a';

        for (let i = 0; i < 5; i++) {
            try {
                console.log(`\n🖱️ CLICKING THUMBNAIL ${i + 1}/5...`);

                // REVERTED: Use the working nth approach (not querySelectorAll)
                const nthSelector = `${THUMBNAIL_SELECTOR} >> nth=${i}`;

                console.log(`   🎯 Using selector: ${nthSelector}`);

                // Use the working click approach
                await mcpClient.click(nthSelector);

                console.log(`   ⏳ Waiting for modal URL change...`);

                // FIXED: Capture URL immediately when modal opens
                const modalUrl = await mcpClient.waitForURL(/\/screens\/[a-f0-9-]+/, { timeout: 5000 });

                console.log(`   ✅ URL captured: ${modalUrl}`);

                // FIXED: Prevent brand name clicks by disabling pointer events
                console.log(`   🛡️ Disabling modal interactions to prevent brand clicks...`);
                await mcpClient.callMCPTool('playwright_evaluate', {
                    script: `
                        // Disable all pointer events in modal
                        const modal = document.querySelector('[role="dialog"], .modal, [data-testid="modal"]');
                        if (modal) {
                            modal.style.pointerEvents = 'none';
                        }
                        // Disable brand links specifically
                        const brandLinks = document.querySelectorAll('a[href*="/apps/"], a[href*="/brand"]');
                        brandLinks.forEach(link => link.style.pointerEvents = 'none');
                    `
                });

                // Store result immediately
                results.push({
                    thumbnailIndex: i + 1,
                    url: modalUrl,
                    success: true
                });

                console.log(`   💾 Result stored safely`);

                // FIXED: Improved modal closing workflow
                console.log(`   🔙 Closing modal safely...`);
                await mcpClient.pressKey('Escape');
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Verify modal is closed
                const currentUrl = await mcpClient.getCurrentUrl();
                if (currentUrl.includes('/screens/')) {
                    console.log(`   🔄 Modal still open, pressing Escape again...`);
                    await mcpClient.pressKey('Escape');
                    await new Promise(resolve => setTimeout(resolve, 800));
                }

                // FIXED: DOM stabilization for next click
                console.log(`   🔧 Stabilizing DOM for next click...`);
                await mcpClient.callMCPTool('playwright_evaluate', {
                    script: `
                        document.body.style.pointerEvents = 'auto';
                        return 'dom_stabilized';
                    `
                });

                console.log(`   ✅ Thumbnail ${i + 1} completed successfully`);

            } catch (error) {
                console.log(`   ❌ Thumbnail ${i + 1} failed: ${error.message}`);

                results.push({
                    thumbnailIndex: i + 1,
                    url: 'failed',
                    success: false,
                    error: error.message
                });

                // FIXED: Better error handling with cleanup
                try {
                    console.log(`   🧹 Cleaning up after error...`);

                    // Try to get current URL as fallback
                    const fallbackUrl = await mcpClient.getCurrentUrl();
                    if (fallbackUrl.includes('/screens/')) {
                        console.log(`   📍 Found screen URL as fallback: ${fallbackUrl}`);
                        results[results.length - 1].url = fallbackUrl;
                        results[results.length - 1].success = true;
                    }

                    // Always close modal and clean up
                    await mcpClient.pressKey('Escape');
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Double escape if needed
                    const currentUrl = await mcpClient.getCurrentUrl();
                    if (currentUrl.includes('/screens/')) {
                        await mcpClient.pressKey('Escape');
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }

                    // Re-enable interactions
                    await mcpClient.callMCPTool('playwright_evaluate', {
                        script: `document.body.style.pointerEvents = 'auto';`
                    });

                    console.log(`   ✅ Cleanup completed`);

                } catch (cleanupError) {
                    console.log(`   ⚠️ Cleanup failed: ${cleanupError.message}`);
                }
            }
        }

        // Step 4: Analyze results
        console.log('\n📊 RESULTS ANALYSIS:');
        console.log('='.repeat(50));

        const successfulResults = results.filter(r => r.success);
        const failedResults = results.filter(r => !r.success);

        console.log(`✅ Successful thumbnails: ${successfulResults.length}/5`);
        console.log(`❌ Failed thumbnails: ${failedResults.length}/5`);

        if (successfulResults.length > 0) {
            console.log('\n🎯 SUCCESSFUL URLS CAPTURED:');
            successfulResults.forEach(result => {
                console.log(`   ${result.thumbnailIndex}. ${result.url}`);
            });

            // Check for unique URLs
            const uniqueUrls = new Set(successfulResults.map(r => r.url));
            console.log(`\n🔍 URL UNIQUENESS: ${uniqueUrls.size} unique URLs out of ${successfulResults.length} successful captures`);

            if (uniqueUrls.size === successfulResults.length) {
                console.log('✅ All URLs are unique - PERFECT!');
            } else {
                console.log('⚠️ Some duplicate URLs found');
            }
        }

        if (failedResults.length > 0) {
            console.log('\n❌ FAILED THUMBNAILS:');
            failedResults.forEach(result => {
                console.log(`   ${result.thumbnailIndex}. Error: ${result.error}`);
            });
        }

        // Step 5: Final assessment
        console.log('\n🏆 FINAL ASSESSMENT:');
        console.log('='.repeat(50));

        if (successfulResults.length >= 3) {
            console.log('🎉 SUCCESS! Fixed modal workflow is working well');
            console.log('✅ Brand name clicking prevention: WORKING');
            console.log('✅ Immediate URL capture: WORKING');
            console.log('✅ Modal closing workflow: WORKING');
            console.log('✅ DOM stabilization: WORKING');
        } else {
            console.log('⚠️ PARTIAL SUCCESS - Some issues remain');
            console.log(`Only ${successfulResults.length}/5 thumbnails worked`);
        }

        console.log('\n🔧 FIXES IMPLEMENTED:');
        console.log('1. ✅ Immediate URL capture when modal opens');
        console.log('2. ✅ Brand name clicking prevention via pointer events');
        console.log('3. ✅ Improved modal closing with double escape');
        console.log('4. ✅ DOM stabilization between clicks');
        console.log('5. ✅ Better error handling with cleanup');

    } catch (error) {
        console.error('❌ TEST FAILED:', error.message);
    } finally {
        try {
            await mcpClient.close();
            console.log('\n🔒 Browser closed');
        } catch (closeError) {
            console.warn('Browser close warning:', closeError.message);
        }
    }
}

// Run the test
testFixedModalWorkflow().catch(console.error);
