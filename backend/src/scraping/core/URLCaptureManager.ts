import { PlaywrightMCPClient } from './PlaywrightMCPClient';
import { CapturedURL, RouteType } from '../types/scraping.types';

export interface URLCaptureManagerInterface {
    captureAppURLs(mcpClient: PlaywrightMCPClient, keyword: string, maxResults: number): Promise<CapturedURL[]>;
    captureFlowURLs(mcpClient: PlaywrightMCPClient, keyword: string, maxResults: number): Promise<CapturedURL[]>;
    captureScreenURLs(mcpClient: PlaywrightMCPClient, keyword: string, maxResults: number): Promise<CapturedURL[]>;
}

export class URLCaptureManager implements URLCaptureManagerInterface {
    private isAuthenticated: boolean = false;
    private authenticationAttempted: boolean = false;

    /**
     * Check if user is logged in and handle authentication if needed
     * FIXED: Added session persistence to avoid re-authenticating for each route
     */
    async checkAndHandleAuthentication(mcpClient: PlaywrightMCPClient): Promise<void> {
        // If we've already successfully authenticated in this session, skip authentication
        if (this.isAuthenticated) {
            console.log('✅ Already authenticated in this session - skipping authentication');
            return;
        }

        // If we've already attempted authentication and failed, don't retry
        if (this.authenticationAttempted && !this.isAuthenticated) {
            console.log('❌ Authentication was already attempted and failed - not retrying');
            throw new Error('Authentication was previously attempted and failed');
        }
        try {
            // Mark that we're attempting authentication
            this.authenticationAttempted = true;

            console.log('🔐 Checking authentication status...');

            // Get page content to check for login indicators
            const pageContent = await mcpClient.getPageContent();
            console.log('📄 Page content length:', pageContent.length);
            console.log('📄 Page content preview:', pageContent.substring(0, 500));

            // CORRECTED LOGIC: Look for "Login" button/text which indicates NOT logged in
            // If we find "Login" text, it means user needs to authenticate
            const hasLoginButton = pageContent.toLowerCase().includes('login') ||
                pageContent.toLowerCase().includes('log in') ||
                pageContent.toLowerCase().includes('sign in');

            // CORRECTED: Look for logged-in indicators (user profile, account menu, etc.)
            const hasLoggedInIndicators = pageContent.toLowerCase().includes('profile') ||
                pageContent.toLowerCase().includes('account') ||
                pageContent.toLowerCase().includes('logout') ||
                pageContent.toLowerCase().includes('log out') ||
                pageContent.toLowerCase().includes('dashboard') ||
                pageContent.toLowerCase().includes('settings');

            // Determine login status: if we see login button and no logged-in indicators, user is NOT logged in
            const isLoggedIn = !hasLoginButton && hasLoggedInIndicators;

            console.log('🔍 Authentication analysis:', {
                hasLoginButton,
                hasLoggedInIndicators,
                isLoggedIn,
                contentPreview: pageContent.substring(0, 200)
            });

            if (isLoggedIn) {
                console.log('✅ Already logged in - proceeding with scraping');
                // Mark as authenticated for future route calls
                this.isAuthenticated = true;
                return;
            }

            console.log('🔑 Not logged in (found Login button) - starting authentication process...');

            // Step 1: Click Login button/link
            const loginSelectors = [
                // PRIMARY: Direct targeting of Mobbin's actual structure
                'a[href="/login"]',                           // Direct href match for Mobbin
                'a[href*="login"]',                          // Partial href match
                '[data-sentry-component="PublicPagesLink"]', // Mobbin's component-specific selector
                '[data-sentry-element="LinkComponent"]',     // Mobbin's element-specific selector

                // SECONDARY: Text-based targeting for link elements
                'a:contains("Log in")',                      // Exact text match (Mobbin uses "Log in")
                'a:contains("Login")',                       // Alternative text match

                // TERTIARY: Generic selectors (keep for compatibility)
                '[href*="login"]',                           // Any element with login href
                'button:contains("Login")',                  // Button fallback
                '[data-testid="login-button"]',              // Test ID fallback
                '.login-btn'                                 // Class fallback
            ];

            let loginClicked = false;
            console.log('🔍 Attempting to find and click login element...');

            for (let i = 0; i < loginSelectors.length; i++) {
                const selector = loginSelectors[i];
                try {
                    console.log(`🎯 Trying selector ${i + 1}/${loginSelectors.length}: "${selector}"`);
                    await mcpClient.click(selector);
                    await mcpClient.waitFor('body', { timeout: 2000 });
                    console.log(`✅ Successfully clicked login element using selector: "${selector}"`);
                    loginClicked = true;
                    break;
                } catch (error) {
                    console.log(`❌ Selector "${selector}" failed: ${error.message}`);
                    continue;
                }
            }

            if (!loginClicked) {
                throw new Error('Could not find or click login button');
            }

            // Step 2: Enter email
            const email = process.env.MOBBIN_EMAIL || 'design.purchase@juspay.in';
            const emailSelectors = [
                'input[type="email"]',
                'input[name="email"]',
                'input[placeholder*="email" i]',
                '#email',
                '.email-input'
            ];

            let emailEntered = false;
            for (const selector of emailSelectors) {
                try {
                    await mcpClient.fill(selector, email);
                    console.log('✅ Entered email address');
                    emailEntered = true;
                    break;
                } catch (error) {
                    continue;
                }
            }

            if (!emailEntered) {
                throw new Error('Could not find or fill email field');
            }

            // Step 3: Click Continue button (AVOID Google continue button)
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

            let firstContinueClicked = false;
            for (const selector of continueSelectors) {
                try {
                    await mcpClient.click(selector);
                    await mcpClient.waitFor('body', { timeout: 3000 });
                    console.log('✅ Clicked first continue button');
                    firstContinueClicked = true;
                    break;
                } catch (error) {
                    continue;
                }
            }

            if (!firstContinueClicked) {
                throw new Error('Could not find or click first continue button');
            }

            // Step 4: Enter password
            const password = process.env.MOBBIN_PASSWORD || 'jusdesign#333';
            const passwordSelectors = [
                'input[type="password"]',
                'input[name="password"]',
                'input[placeholder*="password" i]',
                '#password',
                '.password-input'
            ];

            let passwordEntered = false;
            for (const selector of passwordSelectors) {
                try {
                    await mcpClient.fill(selector, password);
                    console.log('✅ Entered password');
                    passwordEntered = true;
                    break;
                } catch (error) {
                    continue;
                }
            }

            if (!passwordEntered) {
                throw new Error('Could not find or fill password field');
            }

            // Step 5: Click final Continue button
            let finalContinueClicked = false;
            for (const selector of continueSelectors) {
                try {
                    await mcpClient.click(selector);
                    await mcpClient.waitFor('body', { timeout: 5000 });
                    console.log('✅ Clicked final continue button');
                    finalContinueClicked = true;
                    break;
                } catch (error) {
                    continue;
                }
            }

            if (!finalContinueClicked) {
                throw new Error('Could not find or click final continue button');
            }

            // Step 6: Wait for successful login and verify
            await mcpClient.waitFor('body', { timeout: 5000 });

            // ENHANCED: Verify login was successful with detailed content analysis
            const postLoginContent = await mcpClient.getPageContent();
            console.log('🔍 POST-LOGIN VERIFICATION:');
            console.log('📄 Post-login content length:', postLoginContent.length);
            console.log('📄 Post-login content preview:', postLoginContent.substring(0, 800));

            // FIXED: Enhanced login verification based on actual Mobbin logged-in state
            // From screenshot analysis, logged-in Mobbin shows:
            // - User avatar/profile icon in top right
            // - "Invite & earn" button
            // - Search functionality active
            // - Categories, Screens, UI Elements, Flows navigation
            // - NO "Log in" buttons visible

            const hasUserAvatar = postLoginContent.toLowerCase().includes('invite & earn') ||
                postLoginContent.toLowerCase().includes('user avatar') ||
                postLoginContent.toLowerCase().includes('profile icon');

            const hasActiveSearch = postLoginContent.toLowerCase().includes('search on ios') ||
                postLoginContent.toLowerCase().includes('search') &&
                postLoginContent.toLowerCase().includes('filter');

            const hasMainNavigation = postLoginContent.toLowerCase().includes('categories') &&
                postLoginContent.toLowerCase().includes('screens') &&
                postLoginContent.toLowerCase().includes('ui elements') &&
                postLoginContent.toLowerCase().includes('flows');

            const hasInviteEarn = postLoginContent.toLowerCase().includes('invite & earn');

            // FIXED: More intelligent login button detection - look for actual login buttons/links, not just text
            // Check for actual login button elements, not just the word "login" in content
            const hasActualLoginButtons = postLoginContent.includes('href="/login"') ||
                postLoginContent.includes('href="login"') ||
                postLoginContent.includes('data-testid="login') ||
                postLoginContent.includes('class="login-btn') ||
                postLoginContent.includes('id="login-button') ||
                (postLoginContent.toLowerCase().includes('log in') &&
                    (postLoginContent.includes('<a') || postLoginContent.includes('<button')));

            // Check for content that only appears when logged in
            const hasLoggedInContent = postLoginContent.toLowerCase().includes('latest') ||
                postLoginContent.toLowerCase().includes('most popular') ||
                postLoginContent.toLowerCase().includes('top rated');

            console.log('🔍 LOGIN VERIFICATION ANALYSIS:', {
                hasUserAvatar,
                hasActiveSearch,
                hasMainNavigation,
                hasInviteEarn,
                hasActualLoginButtons,
                hasLoggedInContent,
                contentLength: postLoginContent.length
            });

            // CORRECTED: Login is successful if we have logged-in indicators AND no actual login buttons
            const loginSuccessful = (hasUserAvatar || hasInviteEarn || hasActiveSearch || hasMainNavigation || hasLoggedInContent) &&
                !hasActualLoginButtons;

            if (loginSuccessful) {
                console.log('🎉 Authentication successful! Found logged-in indicators.');
                // FIXED: Mark as authenticated for future route calls
                this.isAuthenticated = true;
            } else {
                console.log('❌ AUTHENTICATION FAILED - Login verification failed. Detailed analysis:');
                console.log('- User avatar found:', hasUserAvatar);
                console.log('- Active search found:', hasActiveSearch);
                console.log('- Main navigation found:', hasMainNavigation);
                console.log('- Invite & earn found:', hasInviteEarn);
                console.log('- Has actual login buttons:', hasActualLoginButtons);
                console.log('- Logged-in content found:', hasLoggedInContent);
                console.log('- Content sample:', postLoginContent.substring(0, 500));

                // FIXED: Actually throw error and stop execution when authentication fails
                throw new Error('Authentication verification failed: Still showing login buttons after authentication attempt. Login was not successful.');
            }

        } catch (error) {
            console.error('❌ Authentication failed:', error.message);
            // Reset authentication flags on failure
            this.isAuthenticated = false;
            throw new Error(`Authentication failed: ${error.message}`);
        }
    }

    /**
     * Apps Route: click app suggestion → capture URL → go back to home → repeat
     */
    async captureAppURLs(mcpClient: PlaywrightMCPClient, keyword: string, maxResults: number = 3): Promise<CapturedURL[]> {
        const capturedURLs: CapturedURL[] = [];

        try {
            console.log(`🎯 Starting Apps route URL capture (target: ${maxResults} results)`);
            console.log(`🔍 Keyword: "${keyword}"`);

            // Step 1: Find app results on the page using MCP client
            const pageContent = await mcpClient.getPageContent();
            console.log(`📋 Retrieved page content for app discovery`);

            // Step 2: Look for app-related elements and click them
            const appSelectors = [
                '[data-testid="app-result"]',
                '.app-item',
                '.app-card',
                '.application-item',
                '[data-testid*="app"]'
            ];

            for (let i = 0; i < maxResults; i++) {
                try {
                    console.log(`🔄 Processing app result ${i + 1}/${maxResults}`);

                    // Try to click on app results
                    for (const selector of appSelectors) {
                        try {
                            await mcpClient.click(`${selector}:nth-child(${i + 1})`);
                            await mcpClient.waitFor('body', { timeout: 2000 });

                            // Capture URL after navigation
                            const currentURL = mcpClient.url;
                            const appTitle = await this.extractTitleFromContent(await mcpClient.getPageContent(), 'app');

                            capturedURLs.push({
                                url: currentURL,
                                title: appTitle,
                                route: 'apps' as RouteType,
                                keyword: keyword,
                                platform: 'web' as const,
                                capturedAt: new Date(),
                                metadata: {
                                    position: i + 1,
                                    source: 'apps_page_navigation'
                                }
                            });

                            console.log(`✅ Captured app ${i + 1}: ${appTitle}`);
                            console.log(`📍 URL: ${currentURL}`);

                            // Navigate back to search results
                            await this.navigateToHome(mcpClient);
                            break;

                        } catch (selectorError) {
                            // Try next selector
                            continue;
                        }
                    }

                } catch (error) {
                    console.error(`❌ Error processing app result ${i + 1}:`, error);
                }
            }

            console.log(`🎉 Apps route capture completed: ${capturedURLs.length} URLs captured`);
            return capturedURLs;

        } catch (error) {
            console.error('❌ Error in captureAppURLs:', error);
            return capturedURLs;
        }
    }

    /**
     * Flows Route: 
     * 1. Search for keyword → click flow suggestion → land on flows page
     * 2. Check for relevant category filters (optional)
     * 3. Click on flow results → modal opens → capture URL → close modal
     * 4. Repeat for 3-4 flows on same page
     * 5. Go back to home when switching keywords
     */
    async captureFlowURLs(mcpClient: PlaywrightMCPClient, keyword: string, maxResults: number = 3): Promise<CapturedURL[]> {
        const capturedURLs: CapturedURL[] = [];

        try {
            console.log(`🌊 Starting Flows route URL capture (target: ${maxResults} results)`);
            console.log(`🔍 Keyword: "${keyword}"`);

            // Step 1: Check for relevant category filters (optional)
            await this.checkAndApplyCategoryFilters(mcpClient);

            // Step 2: Find flow results on the page and click them
            const flowSelectors = [
                '[data-testid="flow-result"]',
                '.flow-item',
                '.flow-card',
                '.flow-thumbnail',
                '[data-testid*="flow"]'
            ];

            for (let i = 0; i < maxResults; i++) {
                try {
                    console.log(`🔄 Processing flow result ${i + 1}/${maxResults}`);

                    // Try to click on flow results to open modal
                    for (const selector of flowSelectors) {
                        try {
                            await mcpClient.click(`${selector}:nth-child(${i + 1})`);
                            await mcpClient.waitFor('body', { timeout: 2000 });

                            // Capture URL from modal
                            const currentURL = mcpClient.url;
                            const flowTitle = await this.extractTitleFromContent(await mcpClient.getPageContent(), 'flow');

                            capturedURLs.push({
                                url: currentURL,
                                title: flowTitle,
                                route: 'flows' as RouteType,
                                keyword: keyword,
                                platform: 'web' as const,
                                capturedAt: new Date(),
                                metadata: {
                                    position: i + 1,
                                    source: 'flows_page_modal'
                                }
                            });

                            console.log(`✅ Captured flow ${i + 1}: ${flowTitle}`);
                            console.log(`📍 URL: ${currentURL}`);

                            // Close modal (ESC key or close button)
                            await this.closeModal(mcpClient);
                            break;

                        } catch (selectorError) {
                            // Try next selector
                            continue;
                        }
                    }

                } catch (error) {
                    console.error(`❌ Error processing flow result ${i + 1}:`, error);
                    // Try to close any open modal and continue
                    await this.closeModal(mcpClient);
                }
            }

            console.log(`🎉 Flows route capture completed: ${capturedURLs.length} URLs captured`);
            return capturedURLs;

        } catch (error) {
            console.error('❌ Error in captureFlowURLs:', error);
            return capturedURLs;
        }
    }

    /**
     * Screens Route: 
     * 1. Search for keyword → click screen suggestion → land on screens page
     * 2. Check for relevant category filters (optional)
     * 3. Click on screen results → modal opens → capture URL → close modal
     * 4. Repeat for 3-4 screens on same page
     * 5. Go back to home when switching keywords
     */
    async captureScreenURLs(mcpClient: PlaywrightMCPClient, keyword: string, maxResults: number = 3): Promise<CapturedURL[]> {
        const capturedURLs: CapturedURL[] = [];

        try {
            console.log(`📱 Starting Screens route URL capture (target: ${maxResults} results)`);
            console.log(`🔍 Keyword: "${keyword}"`);

            // Step 1: Check for relevant category filters (optional)
            await this.checkAndApplyCategoryFilters(mcpClient);

            // Step 2: Find screen results on the page and click them
            const screenSelectors = [
                '[data-testid="screen-result"]',
                '.screen-item',
                '.screen-card',
                '.screen-thumbnail',
                '[data-testid*="screen"]'
            ];

            for (let i = 0; i < maxResults; i++) {
                try {
                    console.log(`🔄 Processing screen result ${i + 1}/${maxResults}`);

                    // Try to click on screen results to open modal
                    for (const selector of screenSelectors) {
                        try {
                            await mcpClient.click(`${selector}:nth-child(${i + 1})`);
                            await mcpClient.waitFor('body', { timeout: 2000 });

                            // Capture URL from modal
                            const currentURL = mcpClient.url;
                            const screenTitle = await this.extractTitleFromContent(await mcpClient.getPageContent(), 'screen');

                            capturedURLs.push({
                                url: currentURL,
                                title: screenTitle,
                                route: 'screens' as RouteType,
                                keyword: keyword,
                                platform: 'web' as const,
                                capturedAt: new Date(),
                                metadata: {
                                    position: i + 1,
                                    source: 'screens_page_modal'
                                }
                            });

                            console.log(`✅ Captured screen ${i + 1}: ${screenTitle}`);
                            console.log(`📍 URL: ${currentURL}`);

                            // Close modal (ESC key or close button)
                            await this.closeModal(mcpClient);
                            break;

                        } catch (selectorError) {
                            // Try next selector
                            continue;
                        }
                    }

                } catch (error) {
                    console.error(`❌ Error processing screen result ${i + 1}:`, error);
                    // Try to close any open modal and continue
                    await this.closeModal(mcpClient);
                }
            }

            console.log(`🎉 Screens route capture completed: ${capturedURLs.length} URLs captured`);
            return capturedURLs;

        } catch (error) {
            console.error('❌ Error in captureScreenURLs:', error);
            return capturedURLs;
        }
    }

    /**
     * Extract title from HTML content based on route type
     */
    private async extractTitleFromContent(content: string, routeType: 'app' | 'flow' | 'screen'): Promise<string> {
        try {
            // Define selectors based on route type
            const selectorMap = {
                app: ['h1', '[data-testid="app-title"]', '.app-title', '.application-name', '.app-name'],
                flow: ['h1', '[data-testid="flow-title"]', '.flow-title', '.modal-title', '.flow-name'],
                screen: ['h1', '[data-testid="screen-title"]', '.screen-title', '.modal-title', '.screen-name']
            };

            const selectors = selectorMap[routeType];

            // Try to extract title using regex patterns for each selector
            for (const selector of selectors) {
                const regex = new RegExp(`<[^>]*class="[^"]*${selector.replace('.', '')}[^"]*"[^>]*>([^<]+)<`, 'i');
                const match = content.match(regex);
                if (match && match[1] && match[1].trim()) {
                    return match[1].trim();
                }

                // Also try with data-testid
                if (selector.includes('data-testid')) {
                    const testIdRegex = new RegExp(`<[^>]*data-testid="${selector.replace('[data-testid="', '').replace('"]', '')}"[^>]*>([^<]+)<`, 'i');
                    const testIdMatch = content.match(testIdRegex);
                    if (testIdMatch && testIdMatch[1] && testIdMatch[1].trim()) {
                        return testIdMatch[1].trim();
                    }
                }

                // Try h1 tag specifically
                if (selector === 'h1') {
                    const h1Regex = /<h1[^>]*>([^<]+)<\/h1>/i;
                    const h1Match = content.match(h1Regex);
                    if (h1Match && h1Match[1] && h1Match[1].trim()) {
                        return h1Match[1].trim();
                    }
                }
            }

            return `Unknown ${routeType.charAt(0).toUpperCase() + routeType.slice(1)}`;
        } catch (error) {
            return `Unknown ${routeType.charAt(0).toUpperCase() + routeType.slice(1)}`;
        }
    }

    /**
     * Check for relevant category filters and apply them if available
     */
    private async checkAndApplyCategoryFilters(mcpClient: PlaywrightMCPClient): Promise<void> {
        try {
            console.log('🔍 Checking for relevant category filters...');

            // Get page content to check for filters
            const content = await mcpClient.getPageContent();

            // Look for category filter indicators in the content
            const hasFilters = content.includes('category-filter') ||
                content.includes('filter-button') ||
                content.includes('data-testid="category');

            if (hasFilters) {
                console.log('📂 Found category filters available');

                // Try to click on relevant filters if they exist
                const filterSelectors = [
                    '[data-testid="category-filter"]',
                    '.category-filter',
                    '.filter-button'
                ];

                for (const selector of filterSelectors) {
                    try {
                        await mcpClient.click(selector);
                        await mcpClient.waitFor('body', { timeout: 1000 });
                        console.log(`🏷️ Applied filter: ${selector}`);
                        break;
                    } catch (error) {
                        // Try next selector
                        continue;
                    }
                }
            } else {
                console.log('📂 No category filters found - proceeding without filters');
            }

        } catch (error) {
            console.log('⚠️ Could not check category filters - proceeding without them');
        }
    }

    /**
     * Close modal using ESC key or close button
     */
    private async closeModal(mcpClient: PlaywrightMCPClient): Promise<void> {
        try {
            // Try ESC key first
            await mcpClient.pressKey('Escape');
            await mcpClient.waitFor('body', { timeout: 500 });

            // If modal still open, try close button
            const closeSelectors = [
                '[data-testid="close-modal"]',
                '.modal-close',
                '.close-button',
                '[aria-label="Close"]'
            ];

            for (const selector of closeSelectors) {
                try {
                    await mcpClient.click(selector);
                    await mcpClient.waitFor('body', { timeout: 500 });
                    console.log(`✅ Closed modal using: ${selector}`);
                    break;
                } catch (error) {
                    // Try next selector
                    continue;
                }
            }

        } catch (error) {
            console.log('⚠️ Could not close modal - continuing anyway');
        }
    }

    /**
     * Navigate back to Mobbin home page
     */
    async navigateToHome(mcpClient: PlaywrightMCPClient): Promise<void> {
        try {
            console.log('🏠 Navigating back to Mobbin home...');

            // Try clicking Mobbin logo first
            const logoSelectors = [
                '[data-testid="mobbin-logo"]',
                '.logo',
                '.brand',
                'a[href="/"]',
                '.navbar-brand'
            ];

            for (const selector of logoSelectors) {
                try {
                    await mcpClient.click(selector);
                    await mcpClient.waitFor('body', { timeout: 2000 });
                    console.log(`✅ Navigated home using: ${selector}`);
                    return;
                } catch (error) {
                    // Try next selector
                    continue;
                }
            }

            // Fallback: navigate directly to home URL
            await mcpClient.navigate('https://mobbin.com');
            console.log('✅ Successfully navigated to home via direct URL');

        } catch (error) {
            console.error('❌ Error navigating to home:', error);
            throw error;
        }
    }
}
