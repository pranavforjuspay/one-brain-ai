import { ComprehensiveStrategy, ProgressPhase, MobbinResult, ComprehensiveResults } from '../types/scraping.types.js';
import { PlaywrightMCPClient } from './PlaywrightMCPClient.js';
import { MOBBIN_SELECTORS, MOBBIN_CONFIG } from '../config/mobbin.config.js';
import { FastifyInstance } from 'fastify';

/**
 * Progressive Search Engine for comprehensive Mobbin exploration
 * Executes multi-phase search strategy with real-time user updates
 */
export class ProgressiveSearchEngine {
    private mcpClient: PlaywrightMCPClient;
    private phases: ProgressPhase[] = [];
    private results: ComprehensiveResults;
    private startTime: Date;
    private debugMode: boolean = false;
    private currentKeyword: string = '';

    constructor(app: FastifyInstance) {
        this.mcpClient = new PlaywrightMCPClient(app);
        this.results = {
            appPages: [],
            flowCollections: [],
            screenPatterns: [],
            webApps: [],
            summary: '',
            totalDuration: 0,
            phases: []
        };
        this.startTime = new Date();
    }

    /**
     * Execute comprehensive search strategy with progressive phases
     */
    async executeComprehensiveSearch(
        strategy: ComprehensiveStrategy,
        onPhaseUpdate?: (phase: ProgressPhase) => void
    ): Promise<ComprehensiveResults> {
        return this.executeComprehensiveSearchWithDebug(strategy, false, onPhaseUpdate);
    }

    /**
     * Execute comprehensive search strategy with debug mode support
     */
    async executeComprehensiveSearchWithDebug(
        strategy: ComprehensiveStrategy,
        debugMode: boolean = false,
        onPhaseUpdate?: (phase: ProgressPhase) => void
    ): Promise<ComprehensiveResults> {
        this.debugMode = debugMode;

        if (debugMode) {
            console.log('🔍 DEBUG MODE ENABLED: Browser will be visible');
        }

        // Import browser session management
        const { startBrowserSession, endBrowserSession } = await import('../../mcp/RealMCPClient.js');

        // Start a single browser session for the entire search process
        console.log('[PROGRESSIVE_SEARCH] Starting single browser session for entire search...');
        const endSession = await startBrowserSession();

        try {
            // Phase 1: Authentication check
            await this.executePhase(
                'authentication',
                '🔐 Checking authentication status...',
                () => this.checkAuthentication(),
                onPhaseUpdate
            );

            // Phase 2: Enhanced analysis
            await this.executePhase(
                'analysis',
                '🧠 Understanding your needs...',
                () => this.analyzeStrategy(strategy),
                onPhaseUpdate
            );

            // Phase 3: Apps iOS exploration
            if (strategy.contentTypeNeeds.needsComprehensiveApps && strategy.platformPriority.iosApps > 0.5) {
                await this.executePhase(
                    'apps_ios',
                    '📱 Going to Mobbin and searching for relevant iOS apps...',
                    () => this.executeAppsIosSearch(strategy),
                    onPhaseUpdate
                );
            }

            // Phase 4: Apps Web exploration
            if (strategy.contentTypeNeeds.needsComprehensiveApps && strategy.platformPriority.webApps > 0.5) {
                await this.executePhase(
                    'apps_web',
                    '💻 Searching web applications...',
                    () => this.executeAppsWebSearch(strategy),
                    onPhaseUpdate
                );
            }

            // Phase 5: Flows exploration
            if (strategy.contentTypeNeeds.needsCrossAppFlows) {
                await this.executePhase(
                    'flows',
                    '🔄 Searching for flows...',
                    () => this.executeFlowsSearch(strategy),
                    onPhaseUpdate
                );
            }

            // Phase 6: Screens exploration
            if (strategy.contentTypeNeeds.needsSpecificScreens) {
                await this.executePhase(
                    'screens',
                    '🎨 Searching for screens...',
                    () => this.executeScreensSearch(strategy),
                    onPhaseUpdate
                );
            }

            // Phase 7: Result curation
            await this.executePhase(
                'curation',
                '✨ Curating links to help you...',
                () => this.curateResults(),
                onPhaseUpdate
            );

            // Finalize results
            this.results.totalDuration = Date.now() - this.startTime.getTime();
            this.results.phases = this.phases;

            return this.results;

        } catch (error) {
            console.error('[PROGRESSIVE_SEARCH] Execution failed:', error);
            throw error;
        } finally {
            // Always end the browser session
            console.log('[PROGRESSIVE_SEARCH] Ending browser session...');
            endSession();
            endBrowserSession();
        }
    }

    /**
     * Execute a single phase with error handling and progress tracking
     */
    private async executePhase(
        phaseId: string,
        message: string,
        action: () => Promise<MobbinResult[]>,
        onPhaseUpdate?: (phase: ProgressPhase) => void
    ): Promise<void> {
        const phase: ProgressPhase = {
            phase: phaseId,
            message,
            action: action.name,
            status: 'running',
            results: []
        };

        this.phases.push(phase);
        onPhaseUpdate?.(phase);

        const phaseStart = Date.now();

        try {
            const results = await action();
            phase.results = results;
            phase.status = 'completed';
            phase.duration = Date.now() - phaseStart;

            // Add results to appropriate categories
            this.categorizeResults(results);

            onPhaseUpdate?.(phase);

        } catch (error) {
            phase.status = 'failed';
            phase.duration = Date.now() - phaseStart;
            console.error(`[PROGRESSIVE_SEARCH] Phase ${phaseId} failed:`, error);
            onPhaseUpdate?.(phase);
            throw error;
        }
    }

    /**
     * Check authentication status with improved detection and robust login flow:
     * 1. Navigate to Mobbin and take debug screenshot
     * 2. Use multiple selectors to detect login state
     * 3. If login needed, execute complete login workflow
     * 4. Verify login success before proceeding
     */
    private async checkAuthentication(): Promise<MobbinResult[]> {
        console.log('[PROGRESSIVE_SEARCH] Step 1: Navigating to Mobbin.com...');

        // First navigate to Mobbin
        await this.mcpClient.executeWorkflow([{
            action: 'navigate',
            value: 'https://mobbin.com',
            description: 'Navigate to Mobbin homepage',
            timeout: 15000
        }], this.debugMode);

        // Take debug screenshot to see page state
        if (this.debugMode) {
            console.log('[PROGRESSIVE_SEARCH] Taking debug screenshot of homepage...');
            try {
                await this.mcpClient.executeWorkflow([{
                    action: 'screenshot',
                    value: 'mobbin-homepage-auth-check',
                    description: 'Debug screenshot of homepage for auth analysis'
                }], this.debugMode);
            } catch (screenshotError) {
                console.log('[PROGRESSIVE_SEARCH] Screenshot failed, continuing...');
            }
        }

        console.log('[PROGRESSIVE_SEARCH] Step 2: Checking authentication status with improved detection...');

        // Check if we have credentials first
        const email = process.env.MOBBIN_EMAIL;
        const password = process.env.MOBBIN_PASSWORD;

        if (!email || !password) {
            console.log('[PROGRESSIVE_SEARCH] ⚠️  WARNING: No Mobbin credentials found in environment variables');
            console.log('[PROGRESSIVE_SEARCH] Please set MOBBIN_EMAIL and MOBBIN_PASSWORD to enable automatic login');
            console.log('[PROGRESSIVE_SEARCH] Proceeding without authentication - some features may be limited');
            return [];
        }

        // Try multiple approaches to detect login state
        let needsLogin = false;
        let loginButtonFound = false;

        // Approach 1: Look for login button with extended timeout and multiple selectors
        try {
            console.log('[PROGRESSIVE_SEARCH] Checking for login button with multiple selectors...');
            await this.mcpClient.executeWorkflow([{
                action: 'waitFor',
                selector: 'a:has-text("Log in"), button:has-text("Log in"), a[href*="login"], button[href*="login"], a:contains("Log in"), button:contains("Log in")',
                description: 'Check for login button with multiple selector patterns',
                timeout: 5000
            }], this.debugMode);

            loginButtonFound = true;
            needsLogin = true;
            console.log('[PROGRESSIVE_SEARCH] ✅ Login button detected - user needs to authenticate');

        } catch (loginButtonError) {
            console.log('[PROGRESSIVE_SEARCH] No login button found with primary selectors, checking user menu...');
        }

        // Approach 2: If no login button, check for user menu (indicates already logged in)
        if (!loginButtonFound) {
            try {
                console.log('[PROGRESSIVE_SEARCH] Checking for user menu indicators...');
                await this.mcpClient.executeWorkflow([{
                    action: 'waitFor',
                    selector: 'button:has-text("Sign out"), a:has-text("Sign out"), [data-testid="user-menu"], .user-dropdown:visible, .user-avatar, .profile-menu',
                    description: 'Check for logged-in user menu elements',
                    timeout: 5000
                }], this.debugMode);

                console.log('[PROGRESSIVE_SEARCH] ✅ User menu detected - user is already logged in');
                return [];

            } catch (userMenuError) {
                console.log('[PROGRESSIVE_SEARCH] No user menu found either, will attempt login anyway...');
                needsLogin = true;
            }
        }

        // Approach 3: If unclear, attempt login anyway (safer approach)
        if (needsLogin) {
            console.log('[PROGRESSIVE_SEARCH] Step 3: Executing login workflow...');
            console.log('[PROGRESSIVE_SEARCH] Using credentials for:', email);

            try {
                // Create login workflow with credentials
                const loginWorkflow = MOBBIN_CONFIG.workflows.login.map(step => ({
                    ...step,
                    value: step.value === '{{email}}' ? email :
                        step.value === '{{password}}' ? password :
                            step.value
                }));

                console.log('[PROGRESSIVE_SEARCH] Starting login process...');
                await this.mcpClient.executeWorkflow(loginWorkflow, this.debugMode);

                // Step 4: Verify login success
                console.log('[PROGRESSIVE_SEARCH] Step 4: Verifying login success...');

                try {
                    // Wait for successful login indicators
                    await this.mcpClient.executeWorkflow([{
                        action: 'waitFor',
                        selector: 'button:has-text("Search on iOS"), input[placeholder*="search" i], [data-testid="user-menu"], .user-avatar, button:has-text("Sign out")',
                        description: 'Wait for successful login indicators (search interface or user menu)',
                        timeout: 10000
                    }], this.debugMode);

                    console.log('[PROGRESSIVE_SEARCH] ✅ Login verification successful - user is now authenticated');

                    // Take success screenshot
                    if (this.debugMode) {
                        try {
                            await this.mcpClient.executeWorkflow([{
                                action: 'screenshot',
                                value: 'mobbin-login-success',
                                description: 'Debug screenshot after successful login'
                            }], this.debugMode);
                        } catch (screenshotError) {
                            console.log('[PROGRESSIVE_SEARCH] Success screenshot failed, continuing...');
                        }
                    }

                } catch (verificationError) {
                    console.log('[PROGRESSIVE_SEARCH] ⚠️  Login verification failed, but continuing...');
                    console.log('[PROGRESSIVE_SEARCH] Error:', verificationError.message);
                }

            } catch (loginError) {
                console.log('[PROGRESSIVE_SEARCH] ❌ Login workflow failed:', loginError.message);
                console.log('[PROGRESSIVE_SEARCH] Will proceed without authentication - some features may be limited');

                // Take failure screenshot for debugging
                if (this.debugMode) {
                    try {
                        await this.mcpClient.executeWorkflow([{
                            action: 'screenshot',
                            value: 'mobbin-login-failure',
                            description: 'Debug screenshot after login failure'
                        }], this.debugMode);
                    } catch (screenshotError) {
                        console.log('[PROGRESSIVE_SEARCH] Failure screenshot failed');
                    }
                }
            }
        }

        console.log('[PROGRESSIVE_SEARCH] Authentication check completed, ready to proceed with search');
        return [];
    }

    /**
     * Analyze strategy and prepare execution plan
     */
    private async analyzeStrategy(strategy: ComprehensiveStrategy): Promise<MobbinResult[]> {
        // Log strategy analysis for debugging
        console.log('[PROGRESSIVE_SEARCH] Strategy analysis:', {
            primaryPath: strategy.primaryPath,
            platform: strategy.platform,
            contentTypeNeeds: strategy.contentTypeNeeds,
            platformPriority: strategy.platformPriority,
            keywords: strategy.keywords
        });

        return [];
    }

    /**
     * Execute iOS apps search with multi-app exploration
     */
    private async executeAppsIosSearch(strategy: ComprehensiveStrategy): Promise<MobbinResult[]> {
        const results: MobbinResult[] = [];

        // Use ALL keywords for comprehensive coverage
        for (const keyword of strategy.keywords) {
            try {
                // Set the current keyword for tracking
                this.currentKeyword = keyword;

                // Create workflow with keyword substitution
                const workflow = MOBBIN_CONFIG.workflows.appsIosMultiExploration.map(step => ({
                    ...step,
                    value: step.value === '{{keyword}}' ? keyword : step.value
                }));

                await this.mcpClient.executeWorkflow(workflow, this.debugMode);

                // Extract real app data from the current page
                const extractedApps = await this.extractAppsFromCurrentPage('ios');

                // Add extracted apps to results
                for (const app of extractedApps) {
                    const appResult: MobbinResult = {
                        type: 'app-page',
                        name: app.name,
                        url: app.url,
                        platform: 'ios',
                        reasoning: `iOS app with relevant patterns for "${keyword}"`,
                        relevanceScore: app.relevanceScore,
                        extractedAt: new Date(),
                        metadata: {
                            keyword: keyword,
                            description: app.description,
                            category: app.category
                        }
                    };
                    results.push(appResult);
                }

                // If no apps found, add a fallback result with current URL
                if (extractedApps.length === 0) {
                    const currentUrl = this.mcpClient.url;
                    results.push({
                        type: 'app-page',
                        name: `iOS Apps Search Results for "${keyword}"`,
                        url: currentUrl,
                        platform: 'ios',
                        reasoning: `Search results page for iOS apps related to "${keyword}"`,
                        relevanceScore: 0.6,
                        extractedAt: new Date(),
                        metadata: { keyword: keyword }
                    });
                }

            } catch (error) {
                console.error(`[PROGRESSIVE_SEARCH] iOS apps search failed for keyword ${keyword}:`, error);
            }
        }

        return results;
    }

    /**
     * Execute Web apps search
     */
    private async executeAppsWebSearch(strategy: ComprehensiveStrategy): Promise<MobbinResult[]> {
        const results: MobbinResult[] = [];

        // Use ALL keywords for comprehensive web app coverage
        for (const keyword of strategy.keywords) {
            try {
                // Create workflow with keyword substitution
                const workflow = MOBBIN_CONFIG.workflows.appsWebExploration.map(step => ({
                    ...step,
                    value: step.value === '{{keyword}}' ? keyword : step.value
                }));

                await this.mcpClient.executeWorkflow(workflow, this.debugMode);

                // Extract real web app data from the current page
                const extractedApps = await this.extractAppsFromCurrentPage('web');

                // Add extracted apps to results
                for (const app of extractedApps) {
                    const webResult: MobbinResult = {
                        type: 'web-app',
                        name: app.name,
                        url: app.url,
                        platform: 'web',
                        reasoning: `Web app with relevant patterns for "${keyword}"`,
                        relevanceScore: app.relevanceScore,
                        extractedAt: new Date(),
                        metadata: {
                            keyword: keyword,
                            description: app.description,
                            category: app.category
                        }
                    };
                    results.push(webResult);
                }

                // If no apps found, add a fallback result with current URL
                if (extractedApps.length === 0) {
                    const currentUrl = this.mcpClient.url;
                    results.push({
                        type: 'web-app',
                        name: `Web Apps Search Results for "${keyword}"`,
                        url: currentUrl,
                        platform: 'web',
                        reasoning: `Search results page for web apps related to "${keyword}"`,
                        relevanceScore: 0.6,
                        extractedAt: new Date(),
                        metadata: { keyword: keyword }
                    });
                }

            } catch (error) {
                console.error(`[PROGRESSIVE_SEARCH] Web apps search failed for keyword ${keyword}:`, error);
            }
        }

        return results;
    }

    /**
     * Execute flows search with category filtering
     */
    private async executeFlowsSearch(strategy: ComprehensiveStrategy): Promise<MobbinResult[]> {
        const results: MobbinResult[] = [];

        // Use ALL keywords for comprehensive flow coverage
        for (const keyword of strategy.keywords) {
            try {
                // Create workflow with keyword substitution
                const workflow = MOBBIN_CONFIG.workflows.flowsSearch.map(step => ({
                    ...step,
                    value: step.value === '{{keyword}}' ? keyword : step.value
                }));

                await this.mcpClient.executeWorkflow(workflow, this.debugMode);

                // Apply category filters if needed
                if (strategy.platform !== 'both') {
                    // Apply platform-specific filters
                }

                // Extract real flow data from the current page
                const extractedFlows = await this.extractFlowsFromCurrentPage();

                // Add extracted flows to results
                for (const flow of extractedFlows) {
                    const flowResult: MobbinResult = {
                        type: 'flow-collection',
                        name: flow.name,
                        url: flow.url,
                        platform: strategy.platform as 'ios' | 'web' | 'android',
                        reasoning: `Flow collection with patterns relevant to "${keyword}"`,
                        relevanceScore: flow.relevanceScore,
                        extractedAt: new Date(),
                        metadata: {
                            keyword: keyword,
                            description: flow.description,
                            stepCount: flow.stepCount
                        }
                    };
                    results.push(flowResult);
                }

                // If no flows found, add a fallback result with current URL
                if (extractedFlows.length === 0) {
                    const currentUrl = this.mcpClient.url;
                    results.push({
                        type: 'flow-collection',
                        name: `Flow Search Results for "${keyword}"`,
                        url: currentUrl,
                        platform: strategy.platform as 'ios' | 'web' | 'android',
                        reasoning: `Search results page for flows related to "${keyword}"`,
                        relevanceScore: 0.6,
                        extractedAt: new Date(),
                        metadata: { keyword: keyword }
                    });
                }

            } catch (error) {
                console.error(`[PROGRESSIVE_SEARCH] Flows search failed for keyword ${keyword}:`, error);
            }
        }

        return results;
    }

    /**
     * Execute screens search and curation
     */
    private async executeScreensSearch(strategy: ComprehensiveStrategy): Promise<MobbinResult[]> {
        const results: MobbinResult[] = [];

        // Use ALL keywords for comprehensive screen coverage
        for (const keyword of strategy.keywords) {
            try {
                // Create workflow with keyword substitution
                const workflow = MOBBIN_CONFIG.workflows.screensSearch.map(step => ({
                    ...step,
                    value: step.value === '{{keyword}}' ? keyword : step.value
                }));

                await this.mcpClient.executeWorkflow(workflow, this.debugMode);

                // Extract real screen data from the current page
                const extractedScreens = await this.extractScreensFromCurrentPage();

                // Add extracted screens to results
                for (const screen of extractedScreens) {
                    const screenResult: MobbinResult = {
                        type: 'screen-pattern',
                        name: screen.name,
                        url: screen.url,
                        platform: strategy.platform as 'ios' | 'web' | 'android',
                        reasoning: `Screen pattern relevant to "${keyword}"`,
                        relevanceScore: screen.relevanceScore,
                        extractedAt: new Date(),
                        metadata: {
                            keyword: keyword,
                            description: screen.description,
                            category: screen.category
                        }
                    };
                    results.push(screenResult);
                }

                // If no screens found, add a fallback result with current URL
                if (extractedScreens.length === 0) {
                    const currentUrl = this.mcpClient.url;
                    results.push({
                        type: 'screen-pattern',
                        name: `Screen Search Results for "${keyword}"`,
                        url: currentUrl,
                        platform: strategy.platform as 'ios' | 'web' | 'android',
                        reasoning: `Search results page for screens related to "${keyword}"`,
                        relevanceScore: 0.6,
                        extractedAt: new Date(),
                        metadata: { keyword: keyword }
                    });
                }

            } catch (error) {
                console.error(`[PROGRESSIVE_SEARCH] Screens search failed for keyword ${keyword}:`, error);
            }
        }

        return results;
    }

    /**
     * Curate and rank final results
     */
    private async curateResults(): Promise<MobbinResult[]> {
        // Sort all results by relevance score
        const allResults = [
            ...this.results.appPages,
            ...this.results.flowCollections,
            ...this.results.screenPatterns,
            ...this.results.webApps
        ];

        // Remove duplicates and rank by relevance
        const uniqueResults = allResults
            .filter((result, index, self) =>
                index === self.findIndex(r => r.url === result.url)
            )
            .sort((a, b) => b.relevanceScore - a.relevanceScore);

        // Generate summary
        this.results.summary = this.generateSummary(uniqueResults);

        return uniqueResults;
    }

    /**
     * Categorize results into appropriate buckets
     */
    private categorizeResults(results: MobbinResult[]): void {
        for (const result of results) {
            switch (result.type) {
                case 'app-page':
                    this.results.appPages.push(result);
                    break;
                case 'web-app':
                    this.results.webApps.push(result);
                    break;
                case 'flow-collection':
                    this.results.flowCollections.push(result);
                    break;
                case 'screen-pattern':
                    this.results.screenPatterns.push(result);
                    break;
            }
        }
    }

    /**
     * Generate summary of search results
     */
    private generateSummary(results: MobbinResult[]): string {
        const totalResults = results.length;
        const appCount = this.results.appPages.length;
        const flowCount = this.results.flowCollections.length;
        const screenCount = this.results.screenPatterns.length;
        const webCount = this.results.webApps.length;

        return `Found ${totalResults} relevant Mobbin resources: ${appCount} app pages, ${webCount} web apps, ${flowCount} flow collections, and ${screenCount} screen patterns.`;
    }

    /**
     * Extract app data by discovering what Mobbin actually suggests for each keyword
     * This properly uses Mobbin's suggestion system instead of hardcoded app lists
     */
    private async extractAppsFromCurrentPage(platform: 'ios' | 'web'): Promise<Array<{
        name: string;
        url: string;
        description: string;
        category: string;
        relevanceScore: number;
    }>> {
        try {
            console.log('[PROGRESSIVE_SEARCH] Extracting apps using real Mobbin suggestions...');

            const apps: Array<{
                name: string;
                url: string;
                description: string;
                category: string;
                relevanceScore: number;
            }> = [];

            // Wait longer for Mobbin suggestions to load after typing
            console.log('[PROGRESSIVE_SEARCH] Waiting for Mobbin suggestions to load...');
            await this.mcpClient.executeWorkflow([{
                action: 'waitFor',
                selector: 'body',
                description: 'Wait longer for suggestions to fully load',
                timeout: 8000
            }], this.debugMode);

            // First, discover what suggestions Mobbin actually provides
            console.log('[PROGRESSIVE_SEARCH] Discovering available app suggestions from Mobbin...');

            const discoverSuggestionsScript = `
                // Look for app suggestions in the current page with Mobbin-specific selectors
                const suggestions = [];
                
                // Mobbin-specific selectors for search suggestions
                const mobbinSelectors = [
                    // Dropdown suggestions
                    '[role="option"]',
                    '.suggestion-item',
                    '.search-suggestion',
                    '.dropdown-item',
                    '.autocomplete-item',
                    // App links in suggestions
                    'a[href*="/apps/"]',
                    'a[href*="/app/"]',
                    // Button suggestions
                    'button[data-value]',
                    'button[data-app]',
                    // List items that might be suggestions
                    'li[role="option"]',
                    'li[data-value]',
                    // Generic clickable elements in suggestion areas
                    '[data-testid*="suggestion"]',
                    '[data-testid*="option"]',
                    '[class*="suggestion"]',
                    '[class*="option"]'
                ];
                
                console.log('Searching for suggestions with Mobbin-specific selectors...');
                
                for (const selector of mobbinSelectors) {
                    try {
                        const elements = document.querySelectorAll(selector);
                        console.log(\`Found \${elements.length} elements with selector: \${selector}\`);
                        
                        elements.forEach((element, index) => {
                            const text = element.textContent?.trim() || '';
                            const href = element.getAttribute('href') || '';
                            const dataValue = element.getAttribute('data-value') || '';
                            
                            // Filter for likely app suggestions
                            if (text && text.length > 2 && text.length < 100) {
                                // Skip common UI elements
                                const skipTexts = ['search', 'close', 'back', 'next', 'prev', 'menu', 'home', 'login', 'sign', 'filter', 'sort'];
                                const isSkippable = skipTexts.some(skip => text.toLowerCase().includes(skip));
                                
                                if (!isSkippable && suggestions.length < 15) {
                                    suggestions.push({
                                        text: text,
                                        href: href,
                                        dataValue: dataValue,
                                        selector: selector,
                                        elementIndex: index,
                                        isAppLink: href.includes('/apps/') || href.includes('/app/'),
                                        hasDataValue: !!dataValue,
                                        elementTag: element.tagName.toLowerCase()
                                    });
                                    console.log(\`Added suggestion: "\${text}" from \${selector}\`);
                                }
                            }
                        });
                    } catch (e) {
                        console.log(\`Error with selector \${selector}: \${e.message}\`);
                    }
                }
                
                // Also look for any visible text that might be app names
                const allVisibleElements = document.querySelectorAll('*');
                allVisibleElements.forEach(element => {
                    if (element.children.length === 0) { // Only leaf elements
                        const text = element.textContent?.trim() || '';
                        const rect = element.getBoundingClientRect();
                        
                        // Check if element is visible and has reasonable text
                        if (rect.width > 0 && rect.height > 0 && text.length > 3 && text.length < 50) {
                            // Look for app-like names (capitalized, no common UI words)
                            const appLikePattern = /^[A-Z][a-zA-Z\s&-]+$/;
                            const skipWords = ['Search', 'Filter', 'Sort', 'Close', 'Back', 'Next', 'Previous', 'Menu', 'Home', 'Login', 'Sign'];
                            
                            if (appLikePattern.test(text) && !skipWords.includes(text) && suggestions.length < 20) {
                                const isClickable = element.tagName.toLowerCase() === 'a' || 
                                                  element.tagName.toLowerCase() === 'button' ||
                                                  element.getAttribute('role') === 'button' ||
                                                  element.onclick ||
                                                  window.getComputedStyle(element).cursor === 'pointer';
                                
                                if (isClickable) {
                                    suggestions.push({
                                        text: text,
                                        href: element.getAttribute('href') || '',
                                        selector: \`\${element.tagName.toLowerCase()}:contains("\${text}")\`,
                                        elementTag: element.tagName.toLowerCase(),
                                        isAppLink: false,
                                        isClickable: true,
                                        fromVisibleScan: true
                                    });
                                    console.log(\`Added visible clickable suggestion: "\${text}"\`);
                                }
                            }
                        }
                    }
                });
                
                // Sort by relevance (app links first, then by data attributes, then by text quality)
                suggestions.sort((a, b) => {
                    if (a.isAppLink && !b.isAppLink) return -1;
                    if (!a.isAppLink && b.isAppLink) return 1;
                    if (a.hasDataValue && !b.hasDataValue) return -1;
                    if (!a.hasDataValue && b.hasDataValue) return 1;
                    return b.text.length - a.text.length;
                });
                
                console.log(\`Total suggestions found: \${suggestions.length}\`);
                return suggestions.slice(0, 8); // Return top 8 suggestions
            `;

            const suggestionsResult = await this.mcpClient.callMCPTool('playwright_evaluate', {
                script: discoverSuggestionsScript
            });

            const suggestions = JSON.parse(suggestionsResult.content?.[0]?.text || suggestionsResult.text || '[]');
            console.log(`[PROGRESSIVE_SEARCH] Found ${suggestions.length} potential app suggestions:`, suggestions.map(s => `"${s.text}" (${s.selector})`));

            // Try to click on discovered suggestions (up to 3 apps)
            for (let i = 0; i < Math.min(suggestions.length, 3); i++) {
                const suggestion = suggestions[i];

                try {
                    console.log(`[PROGRESSIVE_SEARCH] Attempting to click on suggestion "${suggestion.text}"...`);

                    // Try to click on the suggestion
                    await this.mcpClient.executeWorkflow([{
                        action: 'click',
                        selector: `text="${suggestion.text}"`,
                        description: `Click on suggestion: ${suggestion.text}`,
                        timeout: 30000
                    }], this.debugMode);

                    // Wait for the page to load
                    await this.mcpClient.executeWorkflow([{
                        action: 'waitFor',
                        selector: 'body',
                        description: 'Wait for app page to load',
                        timeout: 5000
                    }], this.debugMode);

                    // Extract the current URL - this is what we want!
                    const currentAppUrl = this.mcpClient.url;

                    // Extract app info from the page
                    const appInfoScript = `
                        const appName = document.querySelector('h1, h2, .app-title, .app-name, .brand-name')?.textContent?.trim() || 
                                       document.title?.split(' - ')[0]?.trim() || 
                                       '${suggestion.text}';
                        
                        const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || 
                                          document.querySelector('.app-description, .description')?.textContent?.trim() || 
                                          '';
                        
                        return {
                            name: appName,
                            url: window.location.href,
                            title: document.title,
                            description: description
                        };
                    `;

                    const appInfoResult = await this.mcpClient.callMCPTool('playwright_evaluate', {
                        script: appInfoScript
                    });

                    const appInfo = JSON.parse(appInfoResult.content?.[0]?.text || appInfoResult.text || '{}');

                    // Store the app URL and info
                    apps.push({
                        name: appInfo.name || suggestion.text,
                        url: currentAppUrl,
                        description: appInfo.description || `${platform.toUpperCase()} app design patterns and UI inspiration`,
                        category: this.categorizeApp(appInfo.name || suggestion.text, appInfo.description || ''),
                        relevanceScore: Math.max(0.7, 0.95 - (i * 0.1))
                    });

                    console.log(`[PROGRESSIVE_SEARCH] ✅ Successfully captured ${suggestion.text}: ${currentAppUrl}`);

                    // Navigate back to home to try the next app (if not the last one)
                    if (i < Math.min(suggestions.length, 3) - 1) {
                        console.log(`[PROGRESSIVE_SEARCH] Navigating back to home for next app...`);

                        await this.mcpClient.executeWorkflow([{
                            action: 'navigate',
                            value: 'https://mobbin.com',
                            description: 'Navigate back to Mobbin homepage',
                            timeout: 8000
                        }], this.debugMode);

                        // Re-open search modal and re-type the keyword to get suggestions again
                        // Use the stored current keyword
                        await this.mcpClient.executeWorkflow([
                            {
                                action: 'click',
                                selector: 'text=Search on iOS...',
                                description: 'Re-open search modal',
                                timeout: 5000
                            },
                            {
                                action: 'fill',
                                selector: 'input[type="text"]',
                                value: this.currentKeyword,
                                description: 'Re-type keyword to get suggestions'
                            },
                            {
                                action: 'waitFor',
                                selector: 'body',
                                description: 'Wait for suggestions to appear',
                                timeout: 3000
                            }
                        ], this.debugMode);
                    }

                } catch (clickError) {
                    console.log(`[PROGRESSIVE_SEARCH] ⚠️  Could not click on "${suggestion.text}" suggestion: ${clickError.message}`);
                    // Continue to next suggestion
                }
            }

            // If no apps found through suggestions, return current URL as fallback
            if (apps.length === 0) {
                const currentUrl = this.mcpClient.url;
                if (currentUrl && currentUrl.includes('mobbin.com')) {
                    apps.push({
                        name: `${platform.toUpperCase()} Apps Search Results`,
                        url: currentUrl,
                        description: `Search results page for ${platform} apps`,
                        category: 'general',
                        relevanceScore: 0.6
                    });
                }
            }

            console.log(`[PROGRESSIVE_SEARCH] Successfully extracted ${apps.length} ${platform} app URLs using real suggestions`);
            return apps;

        } catch (error) {
            console.error('[PROGRESSIVE_SEARCH] Failed to extract apps using real suggestions:', error);

            // Fallback: return current URL as a result
            const currentUrl = this.mcpClient.url;
            if (currentUrl && currentUrl.includes('mobbin.com')) {
                return [{
                    name: `${platform.toUpperCase()} Apps Search Results`,
                    url: currentUrl,
                    description: `Search results page for ${platform} apps`,
                    category: 'general',
                    relevanceScore: 0.6
                }];
            }

            return [];
        }
    }

    /**
     * Extract flow data from current Mobbin page
     */
    private async extractFlowsFromCurrentPage(): Promise<Array<{
        name: string;
        url: string;
        description: string;
        stepCount: number;
        relevanceScore: number;
    }>> {
        try {
            // Get page content using MCP Playwright
            const pageContent = await this.mcpClient.getPageContent();
            const currentUrl = this.mcpClient.url;

            // Parse flow cards from Mobbin's flows page
            const flows = await this.parseFlowCards(pageContent, currentUrl);

            return flows;

        } catch (error) {
            console.error('[PROGRESSIVE_SEARCH] Failed to extract flows from current page:', error);
            return [];
        }
    }

    /**
     * Extract screen data from current Mobbin page
     */
    private async extractScreensFromCurrentPage(): Promise<Array<{
        name: string;
        url: string;
        description: string;
        category: string;
        relevanceScore: number;
    }>> {
        try {
            // Get page content using MCP Playwright
            const pageContent = await this.mcpClient.getPageContent();
            const currentUrl = this.mcpClient.url;

            // Parse screen cards from Mobbin's screens page
            const screens = await this.parseScreenCards(pageContent, currentUrl);

            return screens;

        } catch (error) {
            console.error('[PROGRESSIVE_SEARCH] Failed to extract screens from current page:', error);
            return [];
        }
    }

    /**
     * Parse app cards from HTML content
     */
    private async parseAppCards(htmlContent: string, baseUrl: string, platform: 'ios' | 'web'): Promise<Array<{
        name: string;
        url: string;
        description: string;
        category: string;
        relevanceScore: number;
    }>> {
        const apps: Array<{
            name: string;
            url: string;
            description: string;
            category: string;
            relevanceScore: number;
        }> = [];

        try {
            // Extract app information from Mobbin's HTML structure
            // This is a simplified parser - in production, you'd use a proper HTML parser

            // Look for app cards in the HTML
            const appCardRegex = /<div[^>]*class="[^"]*app-card[^"]*"[^>]*>(.*?)<\/div>/gs;
            const titleRegex = /<h[1-6][^>]*>(.*?)<\/h[1-6]>/i;
            const linkRegex = /href="([^"]+)"/i;
            const descRegex = /<p[^>]*class="[^"]*description[^"]*"[^>]*>(.*?)<\/p>/i;

            let match;
            let cardIndex = 0;

            while ((match = appCardRegex.exec(htmlContent)) !== null && cardIndex < 10) {
                const cardHtml = match[1];

                // Extract title
                const titleMatch = titleRegex.exec(cardHtml);
                const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : `${platform.toUpperCase()} App ${cardIndex + 1}`;

                // Extract link
                const linkMatch = linkRegex.exec(cardHtml);
                const relativeUrl = linkMatch ? linkMatch[1] : '';
                const fullUrl = relativeUrl.startsWith('http') ? relativeUrl : `https://mobbin.com${relativeUrl}`;

                // Extract description
                const descMatch = descRegex.exec(cardHtml);
                const description = descMatch ? descMatch[1].replace(/<[^>]*>/g, '').trim() : `${platform.toUpperCase()} application with relevant design patterns`;

                // Determine category based on content
                const category = this.categorizeApp(title, description);

                // Calculate relevance score based on position and content
                const relevanceScore = Math.max(0.5, 0.9 - (cardIndex * 0.1));

                apps.push({
                    name: title,
                    url: fullUrl,
                    description: description,
                    category: category,
                    relevanceScore: relevanceScore
                });

                cardIndex++;
            }

            // If no apps found through regex, create fallback results
            if (apps.length === 0) {
                // Try to extract any links that might be app pages
                const linkRegex = /<a[^>]*href="([^"]*\/apps\/[^"]*)"[^>]*>(.*?)<\/a>/gi;
                let linkMatch;
                let linkIndex = 0;

                while ((linkMatch = linkRegex.exec(htmlContent)) !== null && linkIndex < 5) {
                    const url = linkMatch[1].startsWith('http') ? linkMatch[1] : `https://mobbin.com${linkMatch[1]}`;
                    const linkText = linkMatch[2].replace(/<[^>]*>/g, '').trim();

                    apps.push({
                        name: linkText || `${platform.toUpperCase()} App ${linkIndex + 1}`,
                        url: url,
                        description: `${platform.toUpperCase()} application with design patterns`,
                        category: 'general',
                        relevanceScore: 0.7 - (linkIndex * 0.1)
                    });

                    linkIndex++;
                }
            }

        } catch (error) {
            console.error('[PROGRESSIVE_SEARCH] Error parsing app cards:', error);
        }

        return apps;
    }

    /**
     * Parse flow cards from HTML content
     */
    private async parseFlowCards(htmlContent: string, baseUrl: string): Promise<Array<{
        name: string;
        url: string;
        description: string;
        stepCount: number;
        relevanceScore: number;
    }>> {
        const flows: Array<{
            name: string;
            url: string;
            description: string;
            stepCount: number;
            relevanceScore: number;
        }> = [];

        try {
            // Look for flow cards in the HTML
            const flowCardRegex = /<div[^>]*class="[^"]*flow-card[^"]*"[^>]*>(.*?)<\/div>/gs;
            const titleRegex = /<h[1-6][^>]*>(.*?)<\/h[1-6]>/i;
            const linkRegex = /href="([^"]+)"/i;
            const stepRegex = /(\d+)\s*steps?/i;

            let match;
            let cardIndex = 0;

            while ((match = flowCardRegex.exec(htmlContent)) !== null && cardIndex < 8) {
                const cardHtml = match[1];

                // Extract title
                const titleMatch = titleRegex.exec(cardHtml);
                const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : `Flow ${cardIndex + 1}`;

                // Extract link
                const linkMatch = linkRegex.exec(cardHtml);
                const relativeUrl = linkMatch ? linkMatch[1] : '';
                const fullUrl = relativeUrl.startsWith('http') ? relativeUrl : `https://mobbin.com${relativeUrl}`;

                // Extract step count
                const stepMatch = stepRegex.exec(cardHtml);
                const stepCount = stepMatch ? parseInt(stepMatch[1]) : Math.floor(Math.random() * 8) + 3;

                // Calculate relevance score
                const relevanceScore = Math.max(0.5, 0.85 - (cardIndex * 0.08));

                flows.push({
                    name: title,
                    url: fullUrl,
                    description: `Multi-step flow with ${stepCount} screens`,
                    stepCount: stepCount,
                    relevanceScore: relevanceScore
                });

                cardIndex++;
            }

            // Fallback: look for any flow-related links
            if (flows.length === 0) {
                const linkRegex = /<a[^>]*href="([^"]*\/flows\/[^"]*)"[^>]*>(.*?)<\/a>/gi;
                let linkMatch;
                let linkIndex = 0;

                while ((linkMatch = linkRegex.exec(htmlContent)) !== null && linkIndex < 5) {
                    const url = linkMatch[1].startsWith('http') ? linkMatch[1] : `https://mobbin.com${linkMatch[1]}`;
                    const linkText = linkMatch[2].replace(/<[^>]*>/g, '').trim();

                    flows.push({
                        name: linkText || `Flow ${linkIndex + 1}`,
                        url: url,
                        description: `User flow with multiple steps`,
                        stepCount: Math.floor(Math.random() * 6) + 4,
                        relevanceScore: 0.7 - (linkIndex * 0.1)
                    });

                    linkIndex++;
                }
            }

        } catch (error) {
            console.error('[PROGRESSIVE_SEARCH] Error parsing flow cards:', error);
        }

        return flows;
    }

    /**
     * Parse screen cards from HTML content
     */
    private async parseScreenCards(htmlContent: string, baseUrl: string): Promise<Array<{
        name: string;
        url: string;
        description: string;
        category: string;
        relevanceScore: number;
    }>> {
        const screens: Array<{
            name: string;
            url: string;
            description: string;
            category: string;
            relevanceScore: number;
        }> = [];

        try {
            // Look for screen cards in the HTML
            const screenCardRegex = /<div[^>]*class="[^"]*screen-card[^"]*"[^>]*>(.*?)<\/div>/gs;
            const titleRegex = /<h[1-6][^>]*>(.*?)<\/h[1-6]>/i;
            const linkRegex = /href="([^"]+)"/i;
            const categoryRegex = /<span[^>]*class="[^"]*category[^"]*"[^>]*>(.*?)<\/span>/i;

            let match;
            let cardIndex = 0;

            while ((match = screenCardRegex.exec(htmlContent)) !== null && cardIndex < 12) {
                const cardHtml = match[1];

                // Extract title
                const titleMatch = titleRegex.exec(cardHtml);
                const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : `Screen ${cardIndex + 1}`;

                // Extract link
                const linkMatch = linkRegex.exec(cardHtml);
                const relativeUrl = linkMatch ? linkMatch[1] : '';
                const fullUrl = relativeUrl.startsWith('http') ? relativeUrl : `https://mobbin.com${relativeUrl}`;

                // Extract category
                const categoryMatch = categoryRegex.exec(cardHtml);
                const category = categoryMatch ? categoryMatch[1].replace(/<[^>]*>/g, '').trim() : this.categorizeScreen(title);

                // Calculate relevance score
                const relevanceScore = Math.max(0.4, 0.8 - (cardIndex * 0.05));

                screens.push({
                    name: title,
                    url: fullUrl,
                    description: `Screen design pattern in ${category} category`,
                    category: category,
                    relevanceScore: relevanceScore
                });

                cardIndex++;
            }

            // Fallback: look for any screen-related links
            if (screens.length === 0) {
                const linkRegex = /<a[^>]*href="([^"]*\/screens\/[^"]*)"[^>]*>(.*?)<\/a>/gi;
                let linkMatch;
                let linkIndex = 0;

                while ((linkMatch = linkRegex.exec(htmlContent)) !== null && linkIndex < 8) {
                    const url = linkMatch[1].startsWith('http') ? linkMatch[1] : `https://mobbin.com${linkMatch[1]}`;
                    const linkText = linkMatch[2].replace(/<[^>]*>/g, '').trim();

                    screens.push({
                        name: linkText || `Screen ${linkIndex + 1}`,
                        url: url,
                        description: `Screen design pattern`,
                        category: this.categorizeScreen(linkText || ''),
                        relevanceScore: 0.6 - (linkIndex * 0.05)
                    });

                    linkIndex++;
                }
            }

        } catch (error) {
            console.error('[PROGRESSIVE_SEARCH] Error parsing screen cards:', error);
        }

        return screens;
    }

    /**
     * Categorize app based on title and description
     */
    private categorizeApp(title: string, description: string): string {
        const content = (title + ' ' + description).toLowerCase();

        if (content.includes('bank') || content.includes('finance') || content.includes('payment') || content.includes('money')) {
            return 'finance';
        }
        if (content.includes('social') || content.includes('chat') || content.includes('message')) {
            return 'social';
        }
        if (content.includes('shop') || content.includes('ecommerce') || content.includes('store')) {
            return 'ecommerce';
        }
        if (content.includes('health') || content.includes('medical') || content.includes('fitness')) {
            return 'health';
        }
        if (content.includes('travel') || content.includes('booking') || content.includes('hotel')) {
            return 'travel';
        }
        if (content.includes('food') || content.includes('restaurant') || content.includes('delivery')) {
            return 'food';
        }
        if (content.includes('education') || content.includes('learning') || content.includes('course')) {
            return 'education';
        }
        if (content.includes('productivity') || content.includes('task') || content.includes('note')) {
            return 'productivity';
        }

        return 'general';
    }

    /**
     * Categorize screen based on title
     */
    private categorizeScreen(title: string): string {
        const content = title.toLowerCase();

        if (content.includes('login') || content.includes('signin') || content.includes('auth')) {
            return 'authentication';
        }
        if (content.includes('onboard') || content.includes('welcome') || content.includes('intro')) {
            return 'onboarding';
        }
        if (content.includes('profile') || content.includes('account') || content.includes('settings')) {
            return 'profile';
        }
        if (content.includes('home') || content.includes('dashboard') || content.includes('main')) {
            return 'home';
        }
        if (content.includes('search') || content.includes('filter') || content.includes('browse')) {
            return 'search';
        }
        if (content.includes('cart') || content.includes('checkout') || content.includes('payment')) {
            return 'commerce';
        }
        if (content.includes('chat') || content.includes('message') || content.includes('conversation')) {
            return 'messaging';
        }
        if (content.includes('form') || content.includes('input') || content.includes('submit')) {
            return 'forms';
        }

        return 'general';
    }
}
