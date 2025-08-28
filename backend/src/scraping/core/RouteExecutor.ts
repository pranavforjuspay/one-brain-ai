import { PlaywrightMCPClient } from './PlaywrightMCPClient.js';
import { SuggestionDecisionEngine } from './SuggestionDecisionEngine.js';
import { URLCaptureManager } from './URLCaptureManager.js';
import { CapturedURL } from '../types/scraping.types.js';
import { FastifyInstance } from 'fastify';

export interface RouteExecutionResult {
    routeType: 'apps' | 'flows' | 'screens';
    keyword: string;
    platform: 'ios' | 'web' | 'android';
    capturedURLs: CapturedURL[];
    executionTime: number;
    success: boolean;
    errors: string[];
    strategy: string;
}

/**
 * Enhanced RouteExecutor that systematically executes Apps, Flows, and Screens routes
 * Uses intelligent suggestion selection and reliable URL capture patterns
 */
export class RouteExecutor {
    private mcpClient: PlaywrightMCPClient;
    private suggestionEngine: SuggestionDecisionEngine;
    private urlCaptureManager: URLCaptureManager;

    constructor(app: FastifyInstance) {
        this.mcpClient = new PlaywrightMCPClient(app);
        this.suggestionEngine = new SuggestionDecisionEngine(this.mcpClient);
        this.urlCaptureManager = new URLCaptureManager();
    }

    /**
     * Execute Apps route for a specific keyword
     * Pattern: Type keyword → Select app suggestions → Click apps → Capture URLs
     */
    async executeAppsRoute(
        keyword: string,
        platform: 'ios' | 'web' | 'android' = 'ios',
        maxApps: number = 3,
        debugMode: boolean = false
    ): Promise<RouteExecutionResult> {
        const startTime = Date.now();
        const errors: string[] = [];

        console.log(`[ROUTE_EXECUTOR] Starting Apps route for keyword: "${keyword}", platform: ${platform}`);

        try {
            // Step 1: Navigate to Mobbin and open search
            await this.openSearchModal(platform, debugMode);

            // Step 2: Type keyword to trigger suggestions
            await this.typeKeywordInSearch(keyword, debugMode);

            // Step 3: Discover and analyze suggestions
            const suggestions = await this.suggestionEngine.discoverSuggestions(keyword);
            console.log(`[ROUTE_EXECUTOR] Found ${suggestions.length} suggestions for "${keyword}"`);

            // Step 4: Select best suggestion strategy for apps route
            const { suggestion, strategy, reasoning } = await this.suggestionEngine.selectBestSuggestion(
                suggestions,
                'apps',
                keyword
            );

            console.log(`[ROUTE_EXECUTOR] Apps route strategy: ${strategy} - ${reasoning}`);

            // Step 5: Execute suggestion strategy
            const strategySuccess = await this.suggestionEngine.executeSuggestionStrategy(
                strategy,
                suggestion,
                debugMode
            );

            if (!strategySuccess) {
                throw new Error('Failed to execute suggestion strategy');
            }

            // Step 6: Wait for results page to load
            await this.waitForResultsPage(debugMode);

            // Step 7: Capture app URLs using systematic approach
            let capturedURLs: CapturedURL[] = [];

            if (strategy === 'click-suggestion' && suggestion) {
                // We clicked on an app suggestion, now we're on the specific app page
                // Capture this app's URL directly, then navigate back to search for more apps
                capturedURLs = await this.captureAppFromCurrentPage(keyword, suggestion, debugMode);

                // If we want more apps, we could navigate back and search for additional ones
                if (maxApps > 1) {
                    console.log(`[ROUTE_EXECUTOR] Captured 1 app, attempting to find ${maxApps - 1} more...`);
                    // Navigate back to search and try to find more apps
                    const additionalApps = await this.captureAdditionalApps(keyword, platform, maxApps - 1, debugMode);
                    capturedURLs.push(...additionalApps);
                }
            } else {
                // We did a general search, need to find app results on the page
                capturedURLs = await this.captureAppsFromSearchResults(keyword, platform, maxApps, debugMode);
            }

            const executionTime = Date.now() - startTime;

            return {
                routeType: 'apps',
                keyword,
                platform,
                capturedURLs,
                executionTime,
                success: true,
                errors,
                strategy: `${strategy} - ${reasoning}`
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            errors.push(errorMessage);
            console.error(`[ROUTE_EXECUTOR] Apps route failed for "${keyword}":`, error);

            return {
                routeType: 'apps',
                keyword,
                platform,
                capturedURLs: [],
                executionTime: Date.now() - startTime,
                success: false,
                errors,
                strategy: 'failed'
            };
        }
    }

    /**
     * Execute Flows route for a specific keyword
     * Pattern: Type keyword → Select flow suggestion → Browse flows → Click flows → Capture URLs
     */
    async executeFlowsRoute(
        keyword: string,
        platform: 'ios' | 'web' | 'android' = 'ios',
        maxFlows: number = 3,
        debugMode: boolean = false
    ): Promise<RouteExecutionResult> {
        const startTime = Date.now();
        const errors: string[] = [];

        console.log(`[ROUTE_EXECUTOR] Starting Flows route for keyword: "${keyword}"`);

        try {
            // Step 1: Navigate to Mobbin and open search
            await this.openSearchModal(platform, debugMode);

            // Step 2: Type keyword to trigger suggestions
            await this.typeKeywordInSearch(keyword, debugMode);

            // Step 3: Discover and analyze suggestions
            const suggestions = await this.suggestionEngine.discoverSuggestions(keyword);

            // Step 4: Select best suggestion strategy for flows route
            const { suggestion, strategy, reasoning } = await this.suggestionEngine.selectBestSuggestion(
                suggestions,
                'flows',
                keyword
            );

            console.log(`[ROUTE_EXECUTOR] Flows route strategy: ${strategy} - ${reasoning}`);

            // Step 5: Execute suggestion strategy
            const strategySuccess = await this.suggestionEngine.executeSuggestionStrategy(
                strategy,
                suggestion,
                debugMode
            );

            if (!strategySuccess) {
                throw new Error('Failed to execute suggestion strategy');
            }

            // Step 6: Wait for flows page to load
            await this.waitForResultsPage(debugMode);

            // Step 7: Capture flow URLs using systematic modal approach
            const capturedURLs = await this.urlCaptureManager.captureFlowURLs(this.mcpClient, keyword, maxFlows);

            const executionTime = Date.now() - startTime;

            return {
                routeType: 'flows',
                keyword,
                platform,
                capturedURLs,
                executionTime,
                success: true,
                errors,
                strategy: `${strategy} - ${reasoning}`
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            errors.push(errorMessage);
            console.error(`[ROUTE_EXECUTOR] Flows route failed for "${keyword}":`, error);

            return {
                routeType: 'flows',
                keyword,
                platform,
                capturedURLs: [],
                executionTime: Date.now() - startTime,
                success: false,
                errors,
                strategy: 'failed'
            };
        }
    }

    /**
     * Execute Screens route for a specific keyword
     * Pattern: Type keyword → Select screen suggestion → Browse screens → Click screens → Capture URLs
     */
    async executeScreensRoute(
        keyword: string,
        platform: 'ios' | 'web' | 'android' = 'ios',
        maxScreens: number = 4,
        debugMode: boolean = false
    ): Promise<RouteExecutionResult> {
        const startTime = Date.now();
        const errors: string[] = [];

        console.log(`[ROUTE_EXECUTOR] Starting Screens route for keyword: "${keyword}"`);

        try {
            // Step 1: Navigate to Mobbin and open search
            await this.openSearchModal(platform, debugMode);

            // Step 2: Type keyword to trigger suggestions
            await this.typeKeywordInSearch(keyword, debugMode);

            // Step 3: Discover and analyze suggestions
            const suggestions = await this.suggestionEngine.discoverSuggestions(keyword);

            // Step 4: Select best suggestion strategy for screens route
            const { suggestion, strategy, reasoning } = await this.suggestionEngine.selectBestSuggestion(
                suggestions,
                'screens',
                keyword
            );

            console.log(`[ROUTE_EXECUTOR] Screens route strategy: ${strategy} - ${reasoning}`);

            // Step 5: Execute suggestion strategy
            const strategySuccess = await this.suggestionEngine.executeSuggestionStrategy(
                strategy,
                suggestion,
                debugMode
            );

            if (!strategySuccess) {
                throw new Error('Failed to execute suggestion strategy');
            }

            // Step 6: Wait for screens page to load
            await this.waitForResultsPage(debugMode);

            // Step 7: Capture screen URLs using systematic modal approach
            const capturedURLs = await this.urlCaptureManager.captureScreenURLs(this.mcpClient, keyword, maxScreens);

            const executionTime = Date.now() - startTime;

            return {
                routeType: 'screens',
                keyword,
                platform,
                capturedURLs,
                executionTime,
                success: true,
                errors,
                strategy: `${strategy} - ${reasoning}`
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            errors.push(errorMessage);
            console.error(`[ROUTE_EXECUTOR] Screens route failed for "${keyword}":`, error);

            return {
                routeType: 'screens',
                keyword,
                platform,
                capturedURLs: [],
                executionTime: Date.now() - startTime,
                success: false,
                errors,
                strategy: 'failed'
            };
        }
    }

    /**
     * Execute multiple routes for a comprehensive search
     */
    async executeComprehensiveSearch(
        keywords: string[],
        routeConfig: {
            apps: { enabled: boolean; platform: 'ios' | 'web' | 'android'; maxResults: number };
            flows: { enabled: boolean; platform: 'ios' | 'web' | 'android'; maxResults: number };
            screens: { enabled: boolean; platform: 'ios' | 'web' | 'android'; maxResults: number };
        },
        debugMode: boolean = false
    ): Promise<{
        results: RouteExecutionResult[];
        totalCapturedURLs: number;
        totalExecutionTime: number;
        summary: string;
    }> {
        console.log(`[ROUTE_EXECUTOR] Starting comprehensive search for ${keywords.length} keywords`);

        const allResults: RouteExecutionResult[] = [];
        const startTime = Date.now();

        for (const keyword of keywords) {
            console.log(`[ROUTE_EXECUTOR] Processing keyword: "${keyword}"`);

            // Execute Apps route if enabled
            if (routeConfig.apps.enabled) {
                const appsResult = await this.executeAppsRoute(
                    keyword,
                    routeConfig.apps.platform,
                    routeConfig.apps.maxResults,
                    debugMode
                );
                allResults.push(appsResult);
            }

            // Execute Flows route if enabled
            if (routeConfig.flows.enabled) {
                const flowsResult = await this.executeFlowsRoute(
                    keyword,
                    routeConfig.flows.platform,
                    routeConfig.flows.maxResults,
                    debugMode
                );
                allResults.push(flowsResult);
            }

            // Execute Screens route if enabled
            if (routeConfig.screens.enabled) {
                const screensResult = await this.executeScreensRoute(
                    keyword,
                    routeConfig.screens.platform,
                    routeConfig.screens.maxResults,
                    debugMode
                );
                allResults.push(screensResult);
            }

            // Small delay between keywords to avoid overwhelming Mobbin
            if (keyword !== keywords[keywords.length - 1]) {
                console.log('[ROUTE_EXECUTOR] Waiting 2 seconds before next keyword...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        const totalExecutionTime = Date.now() - startTime;
        const totalCapturedURLs = allResults.reduce((sum, result) => sum + result.capturedURLs.length, 0);

        const successfulResults = allResults.filter(r => r.success);
        const failedResults = allResults.filter(r => !r.success);

        const summary = `Comprehensive search completed: ${totalCapturedURLs} URLs captured from ${keywords.length} keywords. ` +
            `${successfulResults.length} successful routes, ${failedResults.length} failed routes.`;

        return {
            results: allResults,
            totalCapturedURLs,
            totalExecutionTime,
            summary
        };
    }

    /**
     * Open search modal based on platform
     */
    private async openSearchModal(platform: 'ios' | 'web' | 'android', debugMode: boolean): Promise<void> {
        // Navigate to Mobbin
        await this.mcpClient.executeWorkflow([{
            action: 'navigate',
            value: 'https://mobbin.com',
            description: 'Navigate to Mobbin homepage',
            timeout: 10000
        }], debugMode);

        // Wait for page to load
        await this.mcpClient.executeWorkflow([{
            action: 'waitFor',
            selector: 'body',
            description: 'Wait for Mobbin homepage to load',
            timeout: 5000
        }], debugMode);

        // 🔐 CRITICAL: Check and handle authentication before proceeding
        console.log('[ROUTE_EXECUTOR] Checking authentication status...');
        try {
            await this.urlCaptureManager.checkAndHandleAuthentication(this.mcpClient);
            console.log('[ROUTE_EXECUTOR] Authentication completed successfully');
        } catch (authError) {
            console.error('[ROUTE_EXECUTOR] Authentication failed:', authError);
            // FIXED: Actually throw the error and stop execution when authentication fails
            throw new Error(`Authentication required but failed: ${authError instanceof Error ? authError.message : 'Unknown authentication error'}`);
        }

        // Click appropriate search button based on platform
        const searchButtonSelector = platform === 'ios' ? 'text=Search on iOS...' :
            platform === 'web' ? 'text=Search on Web...' :
                'text=Search on Android...';

        await this.mcpClient.executeWorkflow([{
            action: 'click',
            selector: searchButtonSelector,
            description: `Open ${platform.toUpperCase()} search modal`,
            timeout: 5000
        }], debugMode);

        // Wait for search modal to open
        await this.mcpClient.executeWorkflow([{
            action: 'waitFor',
            selector: 'input[type="text"]',
            description: 'Wait for search input to appear',
            timeout: 5000
        }], debugMode);
    }

    /**
     * Type keyword in search input
     */
    private async typeKeywordInSearch(keyword: string, debugMode: boolean): Promise<void> {
        await this.mcpClient.executeWorkflow([{
            action: 'fill',
            selector: 'input[type="text"]',
            value: keyword,
            description: `Type keyword: ${keyword}`
        }], debugMode);

        // Wait for suggestions to appear
        await this.mcpClient.executeWorkflow([{
            action: 'waitFor',
            selector: 'body',
            description: 'Wait for suggestions to load',
            timeout: 3000
        }], debugMode);
    }

    /**
     * Wait for results page to load after executing search
     */
    private async waitForResultsPage(debugMode: boolean): Promise<void> {
        await this.mcpClient.executeWorkflow([{
            action: 'waitFor',
            selector: 'body',
            description: 'Wait for results page to load',
            timeout: 8000
        }], debugMode);
    }

    /**
     * Capture the current app page URL after clicking a suggestion
     */
    private async captureAppFromCurrentPage(
        keyword: string,
        suggestion: any,
        debugMode: boolean
    ): Promise<CapturedURL[]> {
        try {
            console.log(`[ROUTE_EXECUTOR] Capturing app from current page: ${suggestion.text}`);

            // Get current URL and page content
            const currentURL = this.mcpClient.url;
            const pageContent = await this.mcpClient.getPageContent();

            // Extract app title from page content
            const appTitle = await this.extractAppTitleFromPage(pageContent, suggestion.text);

            const capturedURL: CapturedURL = {
                url: currentURL,
                title: appTitle,
                route: 'apps',
                keyword: keyword,
                platform: 'web' as const,
                capturedAt: new Date(),
                metadata: {
                    position: 1,
                    source: 'app_suggestion_click',
                    suggestionText: suggestion.text,
                    confidence: suggestion.confidence
                }
            };

            console.log(`✅ Captured app: ${appTitle}`);
            console.log(`📍 URL: ${currentURL}`);

            return [capturedURL];

        } catch (error) {
            console.error(`[ROUTE_EXECUTOR] Failed to capture app from current page:`, error);
            return [];
        }
    }

    /**
     * Navigate back and capture additional apps
     */
    private async captureAdditionalApps(
        keyword: string,
        platform: 'ios' | 'web' | 'android',
        maxAdditionalApps: number,
        debugMode: boolean
    ): Promise<CapturedURL[]> {
        try {
            console.log(`[ROUTE_EXECUTOR] Attempting to capture ${maxAdditionalApps} additional apps`);

            // Navigate back to home
            await this.urlCaptureManager.navigateToHome(this.mcpClient);

            // Re-open search and search again for more apps
            await this.openSearchModal(platform, debugMode);
            await this.typeKeywordInSearch(keyword, debugMode);

            // Try to find more app suggestions or use fallback method
            const additionalSuggestions = await this.suggestionEngine.discoverSuggestions(keyword);

            // For now, return empty array - this could be enhanced to click on different suggestions
            console.log(`[ROUTE_EXECUTOR] Found ${additionalSuggestions.length} additional suggestions, but skipping for now`);
            return [];

        } catch (error) {
            console.error(`[ROUTE_EXECUTOR] Failed to capture additional apps:`, error);
            return [];
        }
    }

    /**
     * Extract app title from page content
     */
    private async extractAppTitleFromPage(pageContent: string, fallbackTitle: string): Promise<string> {
        try {
            // Try to extract title from common patterns
            const titlePatterns = [
                /<h1[^>]*>([^<]+)<\/h1>/i,
                /<title[^>]*>([^<]+)<\/title>/i,
                /<h2[^>]*>([^<]+)<\/h2>/i,
                /class="[^"]*title[^"]*"[^>]*>([^<]+)</i,
                /data-testid="[^"]*title[^"]*"[^>]*>([^<]+)</i
            ];

            for (const pattern of titlePatterns) {
                const match = pageContent.match(pattern);
                if (match && match[1] && match[1].trim()) {
                    const title = match[1].trim();
                    // Filter out generic titles
                    if (title.length > 2 && !title.toLowerCase().includes('mobbin') && title !== 'Mobbin') {
                        return title;
                    }
                }
            }

            // Fallback to suggestion text
            return fallbackTitle || 'Unknown App';
        } catch (error) {
            return fallbackTitle || 'Unknown App';
        }
    }

    /**
     * Capture apps from general search results (fallback method)
     */
    private async captureAppsFromSearchResults(
        keyword: string,
        platform: 'ios' | 'web' | 'android',
        maxApps: number,
        debugMode: boolean
    ): Promise<CapturedURL[]> {
        // This is a fallback method for when we do general search instead of clicking app suggestions
        // For now, return empty array - this would be implemented based on the search results page structure
        console.log(`[ROUTE_EXECUTOR] Capturing apps from search results page (fallback method)`);
        return [];
    }

}
