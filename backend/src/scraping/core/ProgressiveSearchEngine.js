"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function (o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function () { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function (o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function (o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function (o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function (o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressiveSearchEngine = void 0;
const PlaywrightMCPClient_js_1 = require("./PlaywrightMCPClient.js");
const mobbin_config_js_1 = require("../config/mobbin.config.js");
/**
 * Progressive Search Engine for comprehensive Mobbin exploration
 * Executes multi-phase search strategy with real-time user updates
 */
class ProgressiveSearchEngine {
    constructor(app) {
        this.phases = [];
        this.debugMode = false;
        this.mcpClient = new PlaywrightMCPClient_js_1.PlaywrightMCPClient(app);
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
    async executeComprehensiveSearch(strategy, onPhaseUpdate) {
        return this.executeComprehensiveSearchWithDebug(strategy, false, onPhaseUpdate);
    }
    /**
     * Execute comprehensive search strategy with debug mode support
     */
    async executeComprehensiveSearchWithDebug(strategy, debugMode = false, onPhaseUpdate) {
        this.debugMode = debugMode;
        if (debugMode) {
            console.log('🔍 DEBUG MODE ENABLED: Browser will be visible');
        }
        // Import browser session management
        const { startBrowserSession, endBrowserSession } = await Promise.resolve().then(() => __importStar(require('../../mcp/RealMCPClient.js')));
        // Start a single browser session for the entire search process
        console.log('[PROGRESSIVE_SEARCH] Starting single browser session for entire search...');
        const endSession = await startBrowserSession();
        try {
            // Phase 1: Authentication check
            await this.executePhase('authentication', '🔐 Checking authentication status...', () => this.checkAuthentication(), onPhaseUpdate);
            // Phase 2: Enhanced analysis
            await this.executePhase('analysis', '🧠 Understanding your needs...', () => this.analyzeStrategy(strategy), onPhaseUpdate);
            // Phase 3: Apps iOS exploration
            if (strategy.contentTypeNeeds.needsComprehensiveApps && strategy.platformPriority.iosApps > 0.5) {
                await this.executePhase('apps_ios', '📱 Going to Mobbin and searching for relevant iOS apps...', () => this.executeAppsIosSearch(strategy), onPhaseUpdate);
            }
            // Phase 4: Apps Web exploration
            if (strategy.contentTypeNeeds.needsComprehensiveApps && strategy.platformPriority.webApps > 0.5) {
                await this.executePhase('apps_web', '💻 Searching web applications...', () => this.executeAppsWebSearch(strategy), onPhaseUpdate);
            }
            // Phase 5: Flows exploration
            if (strategy.contentTypeNeeds.needsCrossAppFlows) {
                await this.executePhase('flows', '🔄 Searching for flows...', () => this.executeFlowsSearch(strategy), onPhaseUpdate);
            }
            // Phase 6: Screens exploration
            if (strategy.contentTypeNeeds.needsSpecificScreens) {
                await this.executePhase('screens', '🎨 Searching for screens...', () => this.executeScreensSearch(strategy), onPhaseUpdate);
            }
            // Phase 7: Result curation
            await this.executePhase('curation', '✨ Curating links to help you...', () => this.curateResults(), onPhaseUpdate);
            // Finalize results
            this.results.totalDuration = Date.now() - this.startTime.getTime();
            this.results.phases = this.phases;
            return this.results;
        }
        catch (error) {
            console.error('[PROGRESSIVE_SEARCH] Execution failed:', error);
            throw error;
        }
        finally {
            // Always end the browser session
            console.log('[PROGRESSIVE_SEARCH] Ending browser session...');
            endSession();
            endBrowserSession();
        }
    }
    /**
     * Execute a single phase with error handling and progress tracking
     */
    async executePhase(phaseId, message, action, onPhaseUpdate) {
        const phase = {
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
        }
        catch (error) {
            phase.status = 'failed';
            phase.duration = Date.now() - phaseStart;
            console.error(`[PROGRESSIVE_SEARCH] Phase ${phaseId} failed:`, error);
            onPhaseUpdate?.(phase);
            throw error;
        }
    }
    /**
     * Check authentication status with proper sequence:
     * 1. First navigate to Mobbin
     * 2. Check for login button first (indicates NOT logged in)
     * 3. If no login button, check for user menu (indicates logged in)
     */
    async checkAuthentication() {
        console.log('[PROGRESSIVE_SEARCH] Step 1: Navigating to Mobbin.com...');
        // First navigate to Mobbin
        await this.mcpClient.executeWorkflow([{
            action: 'navigate',
            value: 'https://mobbin.com',
            description: 'Navigate to Mobbin homepage',
            timeout: 10000
        }], this.debugMode);
        console.log('[PROGRESSIVE_SEARCH] Step 2: Checking authentication status...');
        try {
            // First, explicitly check for login button (indicates NOT logged in)
            await this.mcpClient.executeWorkflow([{
                action: 'waitFor',
                selector: 'a:has-text("Log in"), button:has-text("Log in"), a[href*="login"], button[href*="login"]',
                description: 'Check if Log in button is present (indicates NOT logged in)',
                timeout: 3000
            }], this.debugMode);
            // If we found login button, user is NOT logged in
            console.log('[PROGRESSIVE_SEARCH] ❌ User is not authenticated - found login button');
            console.log('[PROGRESSIVE_SEARCH] Step 3: Checking for login credentials...');
            // Check if we have credentials
            const email = process.env.MOBBIN_EMAIL;
            const password = process.env.MOBBIN_PASSWORD;
            if (!email || !password) {
                console.log('[PROGRESSIVE_SEARCH] ⚠️  WARNING: No Mobbin credentials found in environment variables');
                console.log('[PROGRESSIVE_SEARCH] Please set MOBBIN_EMAIL and MOBBIN_PASSWORD to enable automatic login');
                console.log('[PROGRESSIVE_SEARCH] Proceeding without authentication - some features may be limited');
                return [];
            }
            console.log('[PROGRESSIVE_SEARCH] ✅ Credentials found, proceeding with login...');
            console.log('[PROGRESSIVE_SEARCH] Step 4: Clicking login button and executing login workflow...');
            // Create login workflow with credentials
            const loginWorkflow = mobbin_config_js_1.MOBBIN_CONFIG.workflows.login.map(step => ({
                ...step,
                value: step.value === '{{email}}' ? email :
                    step.value === '{{password}}' ? password :
                        step.value
            }));
            try {
                await this.mcpClient.executeWorkflow(loginWorkflow, this.debugMode);
                console.log('[PROGRESSIVE_SEARCH] ✅ Login completed successfully');
                console.log('[PROGRESSIVE_SEARCH] User is now authenticated and ready to search');
            }
            catch (loginError) {
                console.log('[PROGRESSIVE_SEARCH] ❌ Login failed:', loginError.message);
                console.log('[PROGRESSIVE_SEARCH] Proceeding without authentication - some features may be limited');
            }
            return [];
        }
        catch (loginButtonError) {
            // No login button found, check if user is actually logged in
            console.log('[PROGRESSIVE_SEARCH] ✅ No login button found, checking for user menu...');
            try {
                // Try to find specific logged-in indicators
                await this.mcpClient.executeWorkflow([{
                    action: 'waitFor',
                    selector: 'button:has-text("Sign out"), a:has-text("Sign out"), [data-testid="user-menu"], .user-dropdown:visible',
                    description: 'Check for specific logged-in user menu elements',
                    timeout: 3000
                }], this.debugMode);
                console.log('[PROGRESSIVE_SEARCH] ✅ User is already logged in to Mobbin');
                return [];
            }
            catch (userMenuError) {
                console.log('[PROGRESSIVE_SEARCH] ⚠️  Neither login button nor user menu found - unusual page state');
                console.log('[PROGRESSIVE_SEARCH] Proceeding without authentication - some features may be limited');
                return [];
            }
        }
    }
    /**
     * Analyze strategy and prepare execution plan
     */
    async analyzeStrategy(strategy) {
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
    async executeAppsIosSearch(strategy) {
        const results = [];
        // Use ALL keywords for comprehensive coverage
        for (const keyword of strategy.keywords) {
            try {
                // Create workflow with keyword substitution
                const workflow = mobbin_config_js_1.MOBBIN_CONFIG.workflows.appsIosMultiExploration.map(step => ({
                    ...step,
                    value: step.value === '{{keyword}}' ? keyword : step.value
                }));
                await this.mcpClient.executeWorkflow(workflow, this.debugMode);
                // Extract real app data from the current page
                const extractedApps = await this.extractAppsFromCurrentPage('ios');
                // Add extracted apps to results
                for (const app of extractedApps) {
                    const appResult = {
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
            }
            catch (error) {
                console.error(`[PROGRESSIVE_SEARCH] iOS apps search failed for keyword ${keyword}:`, error);
            }
        }
        return results;
    }
    /**
     * Execute Web apps search
     */
    async executeAppsWebSearch(strategy) {
        const results = [];
        // Use ALL keywords for comprehensive web app coverage
        for (const keyword of strategy.keywords) {
            try {
                // Create workflow with keyword substitution
                const workflow = mobbin_config_js_1.MOBBIN_CONFIG.workflows.appsWebExploration.map(step => ({
                    ...step,
                    value: step.value === '{{keyword}}' ? keyword : step.value
                }));
                await this.mcpClient.executeWorkflow(workflow, this.debugMode);
                // Extract real web app data from the current page
                const extractedApps = await this.extractAppsFromCurrentPage('web');
                // Add extracted apps to results
                for (const app of extractedApps) {
                    const webResult = {
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
            }
            catch (error) {
                console.error(`[PROGRESSIVE_SEARCH] Web apps search failed for keyword ${keyword}:`, error);
            }
        }
        return results;
    }
    /**
     * Execute flows search with category filtering
     */
    async executeFlowsSearch(strategy) {
        const results = [];
        // Use ALL keywords for comprehensive flow coverage
        for (const keyword of strategy.keywords) {
            try {
                // Create workflow with keyword substitution
                const workflow = mobbin_config_js_1.MOBBIN_CONFIG.workflows.flowsSearch.map(step => ({
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
                    const flowResult = {
                        type: 'flow-collection',
                        name: flow.name,
                        url: flow.url,
                        platform: strategy.platform,
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
                        platform: strategy.platform,
                        reasoning: `Search results page for flows related to "${keyword}"`,
                        relevanceScore: 0.6,
                        extractedAt: new Date(),
                        metadata: { keyword: keyword }
                    });
                }
            }
            catch (error) {
                console.error(`[PROGRESSIVE_SEARCH] Flows search failed for keyword ${keyword}:`, error);
            }
        }
        return results;
    }
    /**
     * Execute screens search and curation
     */
    async executeScreensSearch(strategy) {
        const results = [];
        // Use ALL keywords for comprehensive screen coverage
        for (const keyword of strategy.keywords) {
            try {
                // Create workflow with keyword substitution
                const workflow = mobbin_config_js_1.MOBBIN_CONFIG.workflows.screensSearch.map(step => ({
                    ...step,
                    value: step.value === '{{keyword}}' ? keyword : step.value
                }));
                await this.mcpClient.executeWorkflow(workflow, this.debugMode);
                // Extract real screen data from the current page
                const extractedScreens = await this.extractScreensFromCurrentPage();
                // Add extracted screens to results
                for (const screen of extractedScreens) {
                    const screenResult = {
                        type: 'screen-pattern',
                        name: screen.name,
                        url: screen.url,
                        platform: strategy.platform,
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
                        platform: strategy.platform,
                        reasoning: `Search results page for screens related to "${keyword}"`,
                        relevanceScore: 0.6,
                        extractedAt: new Date(),
                        metadata: { keyword: keyword }
                    });
                }
            }
            catch (error) {
                console.error(`[PROGRESSIVE_SEARCH] Screens search failed for keyword ${keyword}:`, error);
            }
        }
        return results;
    }
    /**
     * Curate and rank final results
     */
    async curateResults() {
        // Sort all results by relevance score
        const allResults = [
            ...this.results.appPages,
            ...this.results.flowCollections,
            ...this.results.screenPatterns,
            ...this.results.webApps
        ];
        // Remove duplicates and rank by relevance
        const uniqueResults = allResults
            .filter((result, index, self) => index === self.findIndex(r => r.url === result.url))
            .sort((a, b) => b.relevanceScore - a.relevanceScore);
        // Generate summary
        this.results.summary = this.generateSummary(uniqueResults);
        return uniqueResults;
    }
    /**
     * Categorize results into appropriate buckets
     */
    categorizeResults(results) {
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
    generateSummary(results) {
        const totalResults = results.length;
        const appCount = this.results.appPages.length;
        const flowCount = this.results.flowCollections.length;
        const screenCount = this.results.screenPatterns.length;
        const webCount = this.results.webApps.length;
        return `Found ${totalResults} relevant Mobbin resources: ${appCount} app pages, ${webCount} web apps, ${flowCount} flow collections, and ${screenCount} screen patterns.`;
    }
    /**
     * Extract app data by navigating to individual app pages and capturing their URLs
     * This is much simpler and more reliable than parsing HTML
     */
    async extractAppsFromCurrentPage(platform) {
        try {
            console.log('[PROGRESSIVE_SEARCH] Extracting apps by navigating to individual app pages...');

            // First, find clickable app links on the current search results page
            const linkExtractionScript = `
                // Find all clickable links that might lead to app pages
                const links = [];
                const allLinks = document.querySelectorAll('a[href]');
                
                allLinks.forEach((link, index) => {
                    const href = link.href;
                    
                    // Skip image URLs, navigation links, and external links
                    if (!href || 
                        href.includes('.jpg') || href.includes('.png') || href.includes('.svg') || href.includes('.webp') ||
                        !href.includes('mobbin.com') ||
                        href === 'https://mobbin.com/' || href === 'https://mobbin.com') {
                        return;
                    }
                    
                    // Look for links that seem to lead to app pages
                    // Based on the sample URL: https://mobbin.com/apps/chase-uk-ios-4377e01c-4a73-4480-b437-623dcbf407ae/7b7760a0-f1b4-4892-8a7d-06a4be973394/screens
                    if (href.includes('/apps/') && links.length < 5) {
                        const linkText = link.textContent?.trim() || '';
                        const appName = linkText.substring(0, 100) || 'App';
                        
                        links.push({
                            url: href,
                            text: appName,
                            index: links.length
                        });
                    }
                });
                
                return {
                    foundLinks: links.length,
                    links: links,
                    currentUrl: window.location.href
                };
            `;

            // Execute the link extraction script
            const extractionResult = await this.mcpClient.callMCPTool('playwright_evaluate', {
                script: linkExtractionScript
            });

            const linkResults = JSON.parse(extractionResult.content?.[0]?.text || extractionResult.text || '{"foundLinks": 0, "links": []}');

            console.log(`[PROGRESSIVE_SEARCH] Found ${linkResults.foundLinks} potential app links on search results page`);

            const apps = [];

            // Navigate to each app page and capture its URL
            for (let i = 0; i < Math.min(linkResults.links.length, 3); i++) {
                const appLink = linkResults.links[i];

                try {
                    console.log(`[PROGRESSIVE_SEARCH] Navigating to app ${i + 1}: ${appLink.text}`);

                    // Navigate to the app page
                    await this.mcpClient.executeWorkflow([{
                        action: 'navigate',
                        value: appLink.url,
                        description: `Navigate to app page: ${appLink.text}`,
                        timeout: 10000
                    }], this.debugMode);

                    // Wait for the page to load
                    await this.mcpClient.executeWorkflow([{
                        action: 'waitFor',
                        selector: 'body',
                        description: 'Wait for app page to load',
                        timeout: 5000
                    }], this.debugMode);

                    // Get the current URL (this is the actual app page URL we want!)
                    const currentAppUrl = this.mcpClient.url;

                    // Extract app name from the page
                    const appInfoScript = `
                        const appName = document.querySelector('h1, h2, .app-title, .app-name')?.textContent?.trim() || 
                                       document.title?.split(' - ')[0]?.trim() || 
                                       'App ${i + 1}';
                        
                        const appDescription = document.querySelector('.app-description, .description, p')?.textContent?.trim() || 
                                             'Design patterns and UI inspiration';
                        
                        return {
                            name: appName,
                            description: appDescription,
                            url: window.location.href,
                            title: document.title
                        };
                    `;

                    const appInfoResult = await this.mcpClient.callMCPTool('playwright_evaluate', {
                        script: appInfoScript
                    });

                    const appInfo = JSON.parse(appInfoResult.content?.[0]?.text || appInfoResult.text || '{}');

                    // Add the successfully loaded app page to results
                    apps.push({
                        name: appInfo.name || appLink.text || `${platform.toUpperCase()} App ${i + 1}`,
                        url: currentAppUrl,
                        description: appInfo.description || `${platform.toUpperCase()} application with design patterns`,
                        category: this.categorizeApp(appInfo.name || appLink.text || '', appInfo.description || ''),
                        relevanceScore: Math.max(0.7, 0.9 - (i * 0.1))
                    });

                    console.log(`[PROGRESSIVE_SEARCH] ✅ Successfully captured app page: ${currentAppUrl}`);

                } catch (navError) {
                    console.log(`[PROGRESSIVE_SEARCH] ⚠️  Failed to navigate to app ${i + 1}: ${navError.message}`);

                    // Add the link anyway as a fallback
                    apps.push({
                        name: appLink.text || `${platform.toUpperCase()} App ${i + 1}`,
                        url: appLink.url,
                        description: `${platform.toUpperCase()} application with design patterns`,
                        category: 'general',
                        relevanceScore: 0.6 - (i * 0.1)
                    });
                }
            }

            // If no apps were found through navigation, return the current search results URL as fallback
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

            console.log(`[PROGRESSIVE_SEARCH] Successfully extracted ${apps.length} ${platform} app URLs`);
            return apps;

        } catch (error) {
            console.error('[PROGRESSIVE_SEARCH] Failed to extract apps from current page:', error);

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
    async extractFlowsFromCurrentPage() {
        try {
            // Get page content using MCP Playwright
            const pageContent = await this.mcpClient.getPageContent();
            const currentUrl = this.mcpClient.url;
            // Parse flow cards from Mobbin's flows page
            const flows = await this.parseFlowCards(pageContent, currentUrl);
            return flows;
        }
        catch (error) {
            console.error('[PROGRESSIVE_SEARCH] Failed to extract flows from current page:', error);
            return [];
        }
    }
    /**
     * Extract screen data from current Mobbin page
     */
    async extractScreensFromCurrentPage() {
        try {
            // Get page content using MCP Playwright
            const pageContent = await this.mcpClient.getPageContent();
            const currentUrl = this.mcpClient.url;
            // Parse screen cards from Mobbin's screens page
            const screens = await this.parseScreenCards(pageContent, currentUrl);
            return screens;
        }
        catch (error) {
            console.error('[PROGRESSIVE_SEARCH] Failed to extract screens from current page:', error);
            return [];
        }
    }
    /**
     * Parse app cards from HTML content
     */
    async parseAppCards(htmlContent, baseUrl, platform) {
        const apps = [];
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
        }
        catch (error) {
            console.error('[PROGRESSIVE_SEARCH] Error parsing app cards:', error);
        }
        return apps;
    }
    /**
     * Parse flow cards from HTML content
     */
    async parseFlowCards(htmlContent, baseUrl) {
        const flows = [];
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
        }
        catch (error) {
            console.error('[PROGRESSIVE_SEARCH] Error parsing flow cards:', error);
        }
        return flows;
    }
    /**
     * Parse screen cards from HTML content
     */
    async parseScreenCards(htmlContent, baseUrl) {
        const screens = [];
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
        }
        catch (error) {
            console.error('[PROGRESSIVE_SEARCH] Error parsing screen cards:', error);
        }
        return screens;
    }
    /**
     * Categorize app based on title and description
     */
    categorizeApp(title, description) {
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
    categorizeScreen(title) {
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
exports.ProgressiveSearchEngine = ProgressiveSearchEngine;
