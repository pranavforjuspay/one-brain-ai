import { FastifyInstance } from 'fastify';
import { PlaywrightMCPClient } from './PlaywrightMCPClient.js';
import { MobbinAuthService } from '../auth/MobbinAuthService.js';
import { LLMKeywordService, LLMKeywordResponse } from '../ai/LLMKeywordService.js';
import { LLMResultExplanationService, ResultExplanation } from '../ai/LLMResultExplanationService.js';

export interface UnifiedScrapingResult {
    keyword: string;
    url: string;
    thumbnailIndex: number;
    extractedAt: string;
}

export interface UnifiedScrapingResponse {
    keywords: string[];
    routeDecision: string;
    results: UnifiedScrapingResult[];
    totalResults: number;
    executionTime: number;
    metadata: {
        executedWorkflow: string;
        authenticationUsed: boolean;
        thumbnailsPerKeyword: number;
        keywordGenerationMethod: 'llm' | 'fallback';
        llmConfidenceScores?: number[];
        originalQuery?: string;
    };
}

/**
 * Unified Scraping Service - Same workflow for all routes
 * 
 * Workflow:
 * 1. Login using MobbinAuthService
 * 2. For each keyword:
 *    - Click search
 *    - Type keyword + press Enter
 *    - Wait for results
 *    - Open first 5 thumbnails one by one
 *    - Store URL when modal opens
 *    - Close modal and continue
 *    - Reset search for next keyword
 */
export class UnifiedScrapingService {
    private mcpClient: PlaywrightMCPClient;
    private authService: MobbinAuthService;
    private app: FastifyInstance;
    private llmKeywordService: LLMKeywordService;
    private llmExplanationService: LLMResultExplanationService;

    constructor(app: FastifyInstance) {
        this.app = app;
        this.mcpClient = new PlaywrightMCPClient(app);
        this.authService = new MobbinAuthService(this.mcpClient);
        this.llmKeywordService = new LLMKeywordService(app);
        this.llmExplanationService = new LLMResultExplanationService(app);
    }

    /**
     * Execute unified scraping workflow for all keywords
     */
    async scrapeAllKeywords(
        keywords: string[],
        routeDecision: string = 'unified',
        thumbnailsPerKeyword: number = 5
    ): Promise<UnifiedScrapingResponse> {
        const startTime = Date.now();
        const results: UnifiedScrapingResult[] = [];

        console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] WORKFLOW_START:`, {
            keywords,
            routeDecision,
            thumbnailsPerKeyword,
            timestamp: new Date().toISOString()
        });

        try {
            // Step 1: Navigate to Mobbin and authenticate
            console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] AUTHENTICATION_START`);

            await this.mcpClient.navigate('https://mobbin.com', {
                browserType: 'chromium',
                width: 1280,
                height: 720,
                headless: true, // Production headless mode
                timeout: 30000
            });

            const authSuccess = await this.authService.authenticate();
            if (!authSuccess) {
                throw new Error('Authentication failed');
            }

            console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] AUTHENTICATION_SUCCESS`);

            // Step 2: Process each keyword with the unified workflow
            for (let i = 0; i < keywords.length; i++) {
                const keyword = keywords[i];
                console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] KEYWORD_START:`, {
                    keyword,
                    keywordIndex: i + 1,
                    totalKeywords: keywords.length
                });

                try {
                    const keywordResults = await this.processKeyword(keyword, thumbnailsPerKeyword);
                    results.push(...keywordResults);

                    console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] KEYWORD_SUCCESS:`, {
                        keyword,
                        resultsCount: keywordResults.length
                    });

                } catch (error) {
                    console.error(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] KEYWORD_FAILED:`, {
                        keyword,
                        error: error.message
                    });
                    // Continue with next keyword even if one fails
                }
            }

            const executionTime = Date.now() - startTime;

            console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] WORKFLOW_COMPLETE:`, {
                totalResults: results.length,
                executionTime,
                keywordsProcessed: keywords.length
            });

            return {
                keywords,
                routeDecision,
                results,
                totalResults: results.length,
                executionTime,
                metadata: {
                    executedWorkflow: 'unified',
                    authenticationUsed: true,
                    thumbnailsPerKeyword,
                    keywordGenerationMethod: 'fallback' // Will be updated when using LLM
                }
            };

        } catch (error) {
            console.error(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] WORKFLOW_FAILED:`, {
                error: error.message,
                keywords,
                resultsCollected: results.length
            });

            throw new Error(`Unified scraping failed: ${error.message}`);

        } finally {
            // Always clean up browser
            try {
                await this.mcpClient.close();
                console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] BROWSER_CLOSED`);
            } catch (closeError) {
                console.warn(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] BROWSER_CLOSE_WARNING:`, closeError.message);
            }
        }
    }

    /**
     * Process a single keyword with the unified workflow
     */
    private async processKeyword(keyword: string, thumbnailsPerKeyword: number): Promise<UnifiedScrapingResult[]> {
        const results: UnifiedScrapingResult[] = [];

        console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] PROCESS_KEYWORD_START:`, { keyword });

        // Step 1: Click "Search on iOS..." to open the search modal (inspired by multi-strategy test)
        console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] OPENING_SEARCH_MODAL`);
        await this.mcpClient.click('text=Search on iOS...');
        await this.mcpClient.waitFor('body', { timeout: 3000 });

        // Step 2: Wait for modal search input to appear
        console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] WAITING_FOR_MODAL_INPUT`);
        await this.mcpClient.waitFor('input[type="text"]', { timeout: 5000 });

        // Step 3: Type keyword in modal search input
        console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] TYPING_KEYWORD:`, { keyword });
        await this.mcpClient.fill('input[type="text"]', keyword);

        // Step 4: Wait a moment for the input to be processed
        console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] WAITING_AFTER_TYPING`);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Step 5: Press Enter for general search (unified approach - no waiting for suggestions)
        console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] PRESSING_ENTER_FOR_SEARCH`);
        try {
            await this.mcpClient.pressKey('Enter');
            console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] ENTER_KEY_PRESSED_SUCCESSFULLY`);
        } catch (enterError) {
            console.error(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] ENTER_KEY_FAILED:`, enterError.message);
            // Fallback: try clicking a search button or using alternative method
            console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] TRYING_ALTERNATIVE_SEARCH_METHOD`);
            try {
                // Try to find and click a search button
                await this.mcpClient.click('button[type="submit"], [aria-label="Search"], .search-button');
            } catch (buttonError) {
                console.warn(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] ALTERNATIVE_SEARCH_ALSO_FAILED:`, buttonError.message);
                throw new Error(`Both Enter key and search button failed: ${enterError.message}`);
            }
        }

        // Step 6: Wait for search results page to load
        console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] WAITING_FOR_SEARCH_RESULTS`);
        await this.mcpClient.waitFor('body', { timeout: 8000 });

        // Step 7: Verify we're on a results page by checking URL or page content
        console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] VERIFYING_SEARCH_RESULTS_PAGE`);
        const currentUrl = await this.mcpClient.getCurrentUrl();
        console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] CURRENT_URL_AFTER_SEARCH:`, { url: currentUrl });

        // Step 8: Find and click thumbnails using robust strategy
        console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] PROCESSING_THUMBNAILS:`, { thumbnailsPerKeyword });

        const thumbnailResults = await this.clickThumbnailsAndCaptureURLs(keyword, thumbnailsPerKeyword);
        results.push(...thumbnailResults);

        console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] PROCESS_KEYWORD_COMPLETE:`, {
            keyword,
            resultsCount: results.length
        });

        return results;
    }

    /**
     * Click thumbnails and capture URLs using WORKING approach
     * REVERTED: Back to working thumbnail clicking + brand name prevention in modal only
     */
    private async clickThumbnailsAndCaptureURLs(keyword: string, maxThumbnails: number): Promise<UnifiedScrapingResult[]> {
        const results: UnifiedScrapingResult[] = [];

        // SURGICAL FIX: Target only the thumbnail link (first element), not brand name link (second element)
        const THUMBNAIL_SELECTOR = 'div[data-sentry-component="ScreenCell"] > div.group.relative a';

        console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] WORKING_THUMBNAIL_CLICKING_START:`, {
            keyword,
            maxThumbnails,
            selector: THUMBNAIL_SELECTOR
        });

        for (let i = 0; i < maxThumbnails; i++) {
            try {
                console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] THUMBNAIL_${i + 1}_START`);

                // OPTIMAL: Use fresh DOM query to find image and click its parent link (based on HTML analysis)
                console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] CLICKING_THUMBNAIL:`, {
                    index: i + 1,
                    method: 'fresh_image_parent_click'
                });

                // Use fresh DOM query strategy recommended by HTML analysis
                const thumbnailClicked = await this.mcpClient.callMCPTool('playwright_evaluate', {
                    script: `
                        (function() {
                            const screenCells = document.querySelectorAll('div[data-sentry-component="ScreenCell"]');
                            if (screenCells.length <= ${i}) {
                                return { success: false, reason: 'Not enough ScreenCells', available: screenCells.length };
                            }
                            
                            const targetCell = screenCells[${i}];
                            const images = targetCell.querySelectorAll('img');
                            
                            if (images.length === 0) {
                                return { success: false, reason: 'No images in ScreenCell' };
                            }
                            
                            // Find the first image's parent link (recommended strategy)
                            const firstImage = images[0];
                            const parentLink = firstImage.closest('a');
                            
                            if (!parentLink) {
                                return { success: false, reason: 'Image has no parent link' };
                            }
                            
                            // Click the parent link
                            parentLink.click();
                            
                            return { 
                                success: true, 
                                href: parentLink.href,
                                cellIndex: ${i}
                            };
                        })();
                    `
                });

                console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] THUMBNAIL_CLICK_RESPONSE:`, thumbnailClicked);

                // FIXED: Don't throw error on response format issues - clicks are working!
                // Just log the response and continue with URL capture
                let clickSuccess = false;
                try {
                    // Handle different MCP response formats
                    if (thumbnailClicked && Array.isArray(thumbnailClicked) && thumbnailClicked[0]?.text) {
                        const responseText = thumbnailClicked[0].text;
                        const parsed = JSON.parse(responseText);
                        clickSuccess = parsed.success;
                        console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] PARSED_CLICK_RESPONSE:`, parsed);
                    } else if (thumbnailClicked && thumbnailClicked.success) {
                        clickSuccess = true;
                        console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] DIRECT_SUCCESS_RESPONSE`);
                    }
                } catch (parseError) {
                    console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] RESPONSE_PARSE_ERROR:`, parseError.message);
                }

                console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] THUMBNAIL_CLICK_ATTEMPTED:`, {
                    index: i + 1,
                    responseReceived: !!thumbnailClicked,
                    clickSuccess
                });

                console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] WAITING_FOR_MODAL_URL_CHANGE`);

                // KEEP: Immediate URL capture when modal opens
                const modalUrl = await this.mcpClient.waitForURL(/\/screens\/[a-f0-9-]+/, { timeout: 5000 });

                console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] URL_CAPTURED_IMMEDIATELY:`, {
                    index: i + 1,
                    url: modalUrl
                });

                // KEEP: Prevent brand name clicks INSIDE the modal only
                console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] DISABLING_MODAL_BRAND_LINKS`);
                await this.mcpClient.callMCPTool('playwright_evaluate', {
                    script: `
                        // Only disable brand links inside the modal (not thumbnail clicking)
                        const brandLinks = document.querySelectorAll('a[href*="/apps/"], a[href*="/brand"]');
                        brandLinks.forEach(link => {
                            link.style.pointerEvents = 'none';
                            link.style.cursor = 'default';
                        });
                        return 'brand_links_disabled';
                    `
                });

                // Store the result immediately
                results.push({
                    keyword,
                    url: modalUrl,
                    thumbnailIndex: i + 1,
                    extractedAt: new Date().toISOString()
                });

                console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] RESULT_STORED_SAFELY`);

                // KEEP: Improved modal closing workflow
                console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] CLOSING_MODAL_SAFELY`);

                // Close the modal with Escape key
                await this.mcpClient.pressKey('Escape');

                // Wait for modal to close
                console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] WAITING_FOR_MODAL_CLOSE`);
                await new Promise(resolve => setTimeout(resolve, 800));

                // Verify we're back to search results page
                const currentUrl = await this.mcpClient.getCurrentUrl();
                if (currentUrl.includes('/screens/')) {
                    console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] MODAL_STILL_OPEN_PRESSING_ESCAPE_AGAIN`);
                    await this.mcpClient.pressKey('Escape');
                    await new Promise(resolve => setTimeout(resolve, 600));
                }

                // Small wait for DOM to stabilize before next click
                await new Promise(resolve => setTimeout(resolve, 600));

                console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] THUMBNAIL_${i + 1}_COMPLETE`);

            } catch (error) {
                console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] THUMBNAIL_${i + 1}_FAILED:`, {
                    error: error.message
                });

                // KEEP: Better error handling with modal cleanup
                try {
                    console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] ATTEMPTING_MODAL_CLEANUP`);

                    // Try to get current URL as fallback
                    const fallbackUrl = await this.mcpClient.getCurrentUrl();
                    console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] FALLBACK_URL:`, fallbackUrl);

                    // Store if it's a valid screen URL (this is actually the captured URL!)
                    if (fallbackUrl.includes('/screens/')) {
                        results.push({
                            keyword,
                            url: fallbackUrl,
                            thumbnailIndex: i + 1,
                            extractedAt: new Date().toISOString()
                        });
                        console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] FALLBACK_URL_STORED_SUCCESSFULLY`);
                    }

                    // Always try to close modal and clean up
                    await this.mcpClient.pressKey('Escape');
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Double escape if needed
                    const currentUrl = await this.mcpClient.getCurrentUrl();
                    if (currentUrl.includes('/screens/')) {
                        await this.mcpClient.pressKey('Escape');
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }

                } catch (cleanupError) {
                    console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] CLEANUP_FAILED:`, cleanupError.message);
                }

                console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] THUMBNAIL_${i + 1}_COMPLETE_WITH_ERROR`);
            }
        }

        console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] WORKING_THUMBNAIL_CLICKING_COMPLETE:`, {
            keyword,
            totalResults: results.length,
            requestedThumbnails: maxThumbnails
        });

        return results;
    }

    /**
     * NEW: Execute scraping workflow from user query (LLM-based)
     */
    async scrapeFromUserQuery(
        userQuery: string,
        thumbnailsPerKeyword: number = 5
    ): Promise<UnifiedScrapingResponse> {
        console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] USER_QUERY_WORKFLOW_START:`, {
            userQuery,
            thumbnailsPerKeyword
        });

        // Step 1: Extract keywords using LLM
        const keywordExtraction = await this.extractKeywordsWithLLM(userQuery);
        const keywordStrings = keywordExtraction.keywords.map(k => k.term);
        const llmConfidenceScores = keywordExtraction.keywords.map(k => k.confidence);

        // Step 2: Decide route based on keywords (for metadata only)
        const routeDecision = UnifiedScrapingService.decideRoute(keywordStrings);

        console.log(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] KEYWORDS_AND_ROUTE:`, {
            keywords: keywordStrings,
            routeDecision,
            keywordGenerationMethod: keywordExtraction.generationMethod,
            llmConfidenceScores
        });

        // Step 3: Execute unified scraping workflow
        const scrapingResult = await this.scrapeAllKeywords(keywordStrings, routeDecision, thumbnailsPerKeyword);

        // Step 4: Enhance response with LLM metadata
        return {
            ...scrapingResult,
            metadata: {
                ...scrapingResult.metadata,
                keywordGenerationMethod: keywordExtraction.generationMethod,
                llmConfidenceScores,
                originalQuery: userQuery
            }
        };
    }

    /**
     * NEW: Execute scraping workflow from user query with LLM explanations
     */
    async scrapeFromUserQueryWithExplanation(
        userQuery: string,
        thumbnailsPerKeyword: number = 5
    ): Promise<UnifiedScrapingResponse & { explanation?: ResultExplanation }> {
        // Get the basic scraping results
        const scrapingResult = await this.scrapeFromUserQuery(userQuery, thumbnailsPerKeyword);

        // Generate LLM explanation
        try {
            const keywords = scrapingResult.keywords;
            const confidenceScores = scrapingResult.metadata.llmConfidenceScores;

            const explanation = await this.llmExplanationService.explainResults(
                userQuery,
                scrapingResult.results,
                keywords,
                confidenceScores
            );

            return {
                ...scrapingResult,
                explanation
            };
        } catch (explanationError) {
            console.warn(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] EXPLANATION_FAILED:`, explanationError.message);
            return scrapingResult;
        }
    }

    /**
     * Extract keywords using LLM
     */
    private async extractKeywordsWithLLM(userQuery: string): Promise<LLMKeywordResponse> {
        try {
            return await this.llmKeywordService.generateKeywords(userQuery);
        } catch (error) {
            console.warn(`[${new Date().toISOString()}] [UNIFIED_SCRAPING] LLM_KEYWORD_EXTRACTION_FAILED:`, error.message);

            // Fallback to legacy keyword extraction
            const fallbackKeywordStrings = UnifiedScrapingService.extractKeywords(userQuery);
            const fallbackKeywords = fallbackKeywordStrings.map(term => ({
                term,
                confidence: 0.5,
                reasoning: 'Fallback extraction'
            }));

            return {
                keywords: fallbackKeywords,
                originalQuery: userQuery,
                generationMethod: 'fallback' as const,
                processingTime: 0
            };
        }
    }

    /**
     * LEGACY: Extract keywords from problem statement (fallback method)
     */
    static extractKeywords(problemStatement: string): string[] {
        const keywords: string[] = [];
        const lowerText = problemStatement.toLowerCase();

        // Extract key terms
        const keyTerms = [
            'login', 'banking', 'biometric', 'authentication', 'mobile', 'ios', 'android', 'web',
            'fintech', 'payment', 'checkout', 'ecommerce', 'onboarding', 'signup', 'dashboard',
            'profile', 'settings', 'wallet', 'transfer', 'card', 'security', 'verification'
        ];

        for (const term of keyTerms) {
            if (lowerText.includes(term)) {
                keywords.push(term);
            }
        }

        // If no specific keywords found, use the problem statement itself as a keyword
        if (keywords.length === 0) {
            // Extract meaningful words (remove common words)
            const words = problemStatement.toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 3)
                .filter(word => !['with', 'that', 'have', 'need', 'want', 'like', 'show', 'find'].includes(word));

            keywords.push(...words.slice(0, 3)); // Take first 3 meaningful words
        }

        // Limit to 5 keywords max
        return keywords.slice(0, 5);
    }

    /**
     * Decide route based on keywords (for metadata only)
     */
    static decideRoute(keywords: string[]): string {
        const keywordText = keywords.join(' ').toLowerCase();

        if (keywordText.includes('app') || keywordText.includes('banking') || keywordText.includes('fintech')) {
            return 'apps';
        } else if (keywordText.includes('flow') || keywordText.includes('onboarding') || keywordText.includes('checkout')) {
            return 'flows';
        } else if (keywordText.includes('screen') || keywordText.includes('login') || keywordText.includes('dashboard')) {
            return 'screens';
        }

        return 'apps'; // Default to apps
    }
}
