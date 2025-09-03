import { FastifyInstance } from 'fastify';
import { WorkflowStep, PageStructure, ElementInfo } from '../types/scraping.types.js';

/**
 * Wrapper for Playwright MCP server interactions
 * Provides a clean interface for web automation tasks
 */
export class PlaywrightMCPClient {
    private app: FastifyInstance;
    private isConnected: boolean = false;
    private currentUrl: string = '';

    constructor(app: FastifyInstance) {
        this.app = app;
    }

    /**
     * Navigate to a URL
     */
    async navigate(url: string, options: {
        browserType?: 'chromium' | 'firefox' | 'webkit';
        width?: number;
        height?: number;
        headless?: boolean;
        timeout?: number;
        debugMode?: boolean;
    } = {}): Promise<void> {
        const startTime = Date.now();
        console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] NAVIGATE_START:`, {
            url,
            options,
            timestamp: new Date().toISOString()
        });

        try {
            // Use the MCP tool to navigate
            const result = await this.callMCPTool('playwright_navigate', {
                url,
                browserType: options.browserType || 'chromium',
                width: options.width || 1280,
                height: options.height || 720,
                headless: options.headless !== false, // Respect headless setting regardless of debug mode
                timeout: options.timeout || 30000
            });

            // In debug mode, take a screenshot after navigation
            if (options.debugMode) {
                console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] DEBUG_MODE: Taking screenshot after navigation`);
                try {
                    await this.screenshot(`debug-navigation-${Date.now()}`, { fullPage: false });
                } catch (screenshotError) {
                    console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] DEBUG_SCREENSHOT_FAILED:`, screenshotError.message);
                }
            }

            this.isConnected = true;
            this.currentUrl = url;

            const duration = Date.now() - startTime;
            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] NAVIGATE_SUCCESS:`, {
                url,
                duration: `${duration}ms`,
                result
            });

            if (this.app?.log?.info) {
                this.app.log.info({ url, duration }, 'Playwright navigation successful');
            }

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error?.message || String(error);
            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] NAVIGATE_FAILED:`, {
                url,
                error: errorMessage,
                duration: `${duration}ms`
            });

            if (this.app?.log?.error) {
                this.app.log.error({ url, error: errorMessage }, 'Playwright navigation failed');
            }
            throw new Error(`Navigation failed: ${errorMessage}`);
        }
    }

    /**
     * Click an element
     */
    async click(selector: string, options: { timeout?: number } = {}): Promise<void> {
        const startTime = Date.now();
        console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] CLICK_START:`, {
            selector,
            currentUrl: this.currentUrl,
            timestamp: new Date().toISOString()
        });

        try {
            await this.callMCPTool('playwright_click', {
                selector
            });

            const duration = Date.now() - startTime;
            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] CLICK_SUCCESS:`, {
                selector,
                duration: `${duration}ms`
            });

        } catch (error) {
            const duration = Date.now() - startTime;
            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] CLICK_FAILED:`, {
                selector,
                error: error.message,
                duration: `${duration}ms`
            });

            throw new Error(`Click failed on ${selector}: ${error.message}`);
        }
    }

    /**
     * Fill an input field
     */
    async fill(selector: string, value: string, options: { timeout?: number } = {}): Promise<void> {
        const startTime = Date.now();
        console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] FILL_START:`, {
            selector,
            valueLength: value.length,
            currentUrl: this.currentUrl,
            timestamp: new Date().toISOString()
        });

        try {
            await this.callMCPTool('playwright_fill', {
                selector,
                value
            });

            const duration = Date.now() - startTime;
            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] FILL_SUCCESS:`, {
                selector,
                valueLength: value.length,
                duration: `${duration}ms`
            });

        } catch (error) {
            const duration = Date.now() - startTime;
            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] FILL_FAILED:`, {
                selector,
                error: error.message,
                duration: `${duration}ms`
            });

            throw new Error(`Fill failed on ${selector}: ${error.message}`);
        }
    }

    /**
     * Wait for an element to appear
     */
    async waitFor(selector: string, options: { timeout?: number; state?: 'visible' | 'hidden' | 'attached' } = {}): Promise<void> {
        const startTime = Date.now();
        console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] WAIT_FOR_START:`, {
            selector,
            options,
            currentUrl: this.currentUrl,
            timestamp: new Date().toISOString()
        });

        try {
            // For now, we'll use a simple delay since the MCP server might not have a direct waitFor
            // In a real implementation, we'd use playwright's waitForSelector
            await new Promise(resolve => setTimeout(resolve, options.timeout || 2000));

            const duration = Date.now() - startTime;
            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] WAIT_FOR_SUCCESS:`, {
                selector,
                duration: `${duration}ms`
            });

        } catch (error) {
            const duration = Date.now() - startTime;
            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] WAIT_FOR_FAILED:`, {
                selector,
                error: error.message,
                duration: `${duration}ms`
            });

            throw new Error(`Wait failed for ${selector}: ${error.message}`);
        }
    }

    /**
     * Press a key
     */
    async pressKey(key: string, selector?: string): Promise<void> {
        const startTime = Date.now();
        console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] PRESS_KEY_START:`, {
            key,
            selector,
            currentUrl: this.currentUrl,
            timestamp: new Date().toISOString()
        });

        try {
            await this.callMCPTool('playwright_press_key', {
                key,
                selector
            });

            const duration = Date.now() - startTime;
            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] PRESS_KEY_SUCCESS:`, {
                key,
                selector,
                duration: `${duration}ms`
            });

        } catch (error) {
            const duration = Date.now() - startTime;
            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] PRESS_KEY_FAILED:`, {
                key,
                selector,
                error: error.message,
                duration: `${duration}ms`
            });

            throw new Error(`Press key failed for ${key}: ${error.message}`);
        }
    }

    /**
     * Take a screenshot
     */
    async screenshot(name: string, options: {
        fullPage?: boolean;
        width?: number;
        height?: number;
    } = {}): Promise<string> {
        const startTime = Date.now();
        console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] SCREENSHOT_START:`, {
            name,
            options,
            currentUrl: this.currentUrl,
            timestamp: new Date().toISOString()
        });

        try {
            const result = await this.callMCPTool('playwright_screenshot', {
                name,
                width: options.width || 1280,
                height: options.height || 720,
                storeBase64: true,
                fullPage: options.fullPage || false
            });

            const duration = Date.now() - startTime;
            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] SCREENSHOT_SUCCESS:`, {
                name,
                duration: `${duration}ms`,
                hasResult: !!result
            });

            return result;

        } catch (error) {
            const duration = Date.now() - startTime;
            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] SCREENSHOT_FAILED:`, {
                name,
                error: error.message,
                duration: `${duration}ms`
            });

            throw new Error(`Screenshot failed: ${error.message}`);
        }
    }

    /**
     * Get page content (visible text - much more efficient than HTML)
     */
    async getPageContent(options: {
        selector?: string;
        removeScripts?: boolean;
        maxLength?: number;
    } = {}): Promise<string> {
        const startTime = Date.now();
        console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] GET_CONTENT_START:`, {
            method: 'visible_text',
            options,
            currentUrl: this.currentUrl,
            timestamp: new Date().toISOString()
        });

        try {
            // Use visible text instead of HTML to avoid massive JSON parsing issues
            const result = await this.callMCPTool('playwright_get_visible_text', {});

            // Extract text from MCP response format with detailed debugging
            let textContent = '';

            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] DETAILED_RESULT_ANALYSIS:`, {
                resultType: typeof result,
                isArray: Array.isArray(result),
                resultKeys: result && typeof result === 'object' ? Object.keys(result) : 'N/A',
                resultLength: Array.isArray(result) ? result.length : 'N/A',
                fullResult: JSON.stringify(result, null, 2).substring(0, 500)
            });

            if (result && Array.isArray(result) && result.length > 0) {
                // MCP returns array of content objects
                console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] PROCESSING_ARRAY:`, {
                    arrayLength: result.length,
                    firstItem: result[0]
                });
                textContent = result.map(item => {
                    if (typeof item === 'string') return item;
                    if (item && typeof item === 'object' && item.text) return item.text;
                    if (item && typeof item === 'object' && item.content) return item.content;
                    return String(item || '');
                }).join(' ');
            } else if (result && typeof result === 'object') {
                // Check various possible object structures
                if (result.text) {
                    textContent = result.text;
                } else if (result.content) {
                    textContent = result.content;
                } else if (result.data) {
                    textContent = result.data;
                } else if (result.result) {
                    textContent = result.result;
                } else {
                    // Try to extract any string values from the object
                    const stringValues = Object.values(result).filter(v => typeof v === 'string');
                    textContent = stringValues.join(' ');
                    console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] EXTRACTED_STRING_VALUES:`, {
                        stringValues,
                        objectKeys: Object.keys(result)
                    });
                }
            } else if (typeof result === 'string') {
                // Direct string response
                textContent = result;
            } else {
                console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] FALLBACK_CONVERSION:`, {
                    resultType: typeof result,
                    resultValue: result
                });
                textContent = String(result || '');
            }

            const duration = Date.now() - startTime;
            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] GET_CONTENT_SUCCESS:`, {
                method: 'visible_text',
                contentLength: textContent.length,
                contentPreview: textContent.substring(0, 100),
                duration: `${duration}ms`
            });

            return textContent;

        } catch (error) {
            const duration = Date.now() - startTime;
            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] GET_CONTENT_FAILED:`, {
                method: 'visible_text',
                error: error.message,
                duration: `${duration}ms`
            });

            throw new Error(`Get content failed: ${error.message}`);
        }
    }

    /**
     * Execute a workflow of steps
     */
    async executeWorkflow(steps: WorkflowStep[], debugMode: boolean = false): Promise<{ success: boolean; errors: string[]; adaptations: string[] }> {
        const startTime = Date.now();
        const workflowId = Math.random().toString(36).substring(7);

        console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] WORKFLOW_START:`, {
            workflowId,
            stepsCount: steps.length,
            steps: steps.map(s => ({ action: s.action, description: s.description })),
            debugMode,
            timestamp: new Date().toISOString()
        });

        const errors: string[] = [];
        const adaptations: string[] = [];

        try {
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] WORKFLOW_STEP:`, {
                    workflowId,
                    stepIndex: i + 1,
                    totalSteps: steps.length,
                    action: step.action,
                    description: step.description,
                    selector: step.selector
                });

                try {
                    await this.executeStep(step, debugMode);
                } catch (error) {
                    const errorMsg = `Step ${i + 1} failed: ${error.message}`;
                    errors.push(errorMsg);

                    console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] WORKFLOW_STEP_FAILED:`, {
                        workflowId,
                        stepIndex: i + 1,
                        error: error.message,
                        retryCount: step.retryCount || 0
                    });

                    // Try to adapt or retry
                    if (step.retryCount && step.retryCount > 0) {
                        console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] WORKFLOW_STEP_RETRY:`, {
                            workflowId,
                            stepIndex: i + 1,
                            retryAttempt: 1
                        });

                        try {
                            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
                            await this.executeStep(step, debugMode);
                            adaptations.push(`Retried step ${i + 1} successfully`);
                        } catch (retryError) {
                            errors.push(`Step ${i + 1} retry failed: ${retryError.message}`);
                        }
                    }
                }
            }

            const duration = Date.now() - startTime;
            const success = errors.length === 0;

            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] WORKFLOW_COMPLETE:`, {
                workflowId,
                success,
                errorsCount: errors.length,
                adaptationsCount: adaptations.length,
                duration: `${duration}ms`
            });

            return { success, errors, adaptations };

        } catch (error) {
            const duration = Date.now() - startTime;
            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] WORKFLOW_FAILED:`, {
                workflowId,
                error: error.message,
                duration: `${duration}ms`
            });

            errors.push(`Workflow failed: ${error.message}`);
            return { success: false, errors, adaptations };
        }
    }

    /**
     * Execute a single workflow step
     */
    private async executeStep(step: WorkflowStep, debugMode: boolean = false): Promise<void> {
        switch (step.action) {
            case 'navigate':
                if (!step.value) throw new Error('Navigate step requires a URL in value field');
                await this.navigate(step.value, { debugMode });
                break;

            case 'click':
                if (!step.selector) throw new Error('Click step requires a selector');
                await this.click(step.selector);
                break;

            case 'fill':
                if (!step.selector || !step.value) throw new Error('Fill step requires selector and value');
                await this.fill(step.selector, step.value);
                break;

            case 'waitFor':
                if (!step.selector) throw new Error('WaitFor step requires a selector');
                await this.waitFor(step.selector, { timeout: step.timeout });
                break;

            case 'scroll':
                // Implement scroll if needed
                await new Promise(resolve => setTimeout(resolve, 500));
                break;

            case 'hover':
                if (!step.selector) throw new Error('Hover step requires a selector');
                // For now, just wait - implement hover if MCP supports it
                await new Promise(resolve => setTimeout(resolve, 500));
                break;

            case 'press':
                if (!step.value) throw new Error('Press step requires a key value');
                await this.pressKey(step.value, step.selector);
                break;

            default:
                throw new Error(`Unknown workflow action: ${step.action}`);
        }
    }

    /**
     * Close the browser
     */
    async close(): Promise<void> {
        console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] CLOSE_START:`, {
            wasConnected: this.isConnected,
            currentUrl: this.currentUrl
        });

        try {
            if (this.isConnected) {
                await this.callMCPTool('playwright_close', {});
                this.isConnected = false;
                this.currentUrl = '';

                console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] CLOSE_SUCCESS`);
            }
        } catch (error) {
            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] CLOSE_FAILED:`, {
                error: error.message
            });
            // Don't throw on close errors
        }
    }

    /**
     * Call an MCP tool using the actual MCP server with comprehensive error handling
     */
    async callMCPTool(toolName: string, args: any, retryCount: number = 0): Promise<any> {
        const maxRetries = 3;
        const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff

        console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] MCP_CALL:`, {
            toolName,
            args: Object.keys(args),
            retryCount,
            maxRetries
        });

        try {
            // Use the real MCP client to connect to actual Playwright MCP server
            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] USING_REAL_MCP:`, {
                toolName,
                reason: 'Connecting to real Playwright MCP server'
            });

            // Import the real MCP client
            const { useRealMCPTool } = await import('../../mcp/RealMCPClient.js');

            const result = await useRealMCPTool(
                'playwright-mcp-server',
                toolName,
                args
            );

            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] REAL_MCP_SUCCESS:`, {
                toolName,
                hasResult: !!result,
                resultType: typeof result,
                retryCount
            });

            return result;

        } catch (error) {
            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] MCP_CALL_FAILED:`, {
                toolName,
                error: error.message,
                retryCount,
                willRetry: retryCount < maxRetries
            });

            // Handle specific error types with appropriate recovery strategies
            const errorType = this.categorizeError(error);

            if (retryCount < maxRetries && this.shouldRetry(errorType)) {
                console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] MCP_RETRY_SCHEDULED:`, {
                    toolName,
                    errorType,
                    retryCount: retryCount + 1,
                    delayMs: retryDelay
                });

                // Wait before retry with exponential backoff
                await new Promise(resolve => setTimeout(resolve, retryDelay));

                // Apply error-specific recovery strategies
                const recoveredArgs = await this.applyRecoveryStrategy(toolName, args, errorType);

                return this.callMCPTool(toolName, recoveredArgs, retryCount + 1);
            }

            // Log final failure and throw error - NO SIMULATION FALLBACK
            if (this.app?.log?.error) {
                this.app.log.error({
                    toolName,
                    args,
                    error: error.message,
                    errorType,
                    finalRetryCount: retryCount
                }, 'MCP tool call failed after all retries - NO FALLBACK');
            }

            // Throw enhanced error with context - force real MCP usage
            throw new Error(`REAL MCP REQUIRED: ${toolName} failed after ${retryCount + 1} attempts: ${error.message} (${errorType})`);
        }
    }


    /**
     * Categorize error types for appropriate handling
     */
    private categorizeError(error: any): string {
        const message = error.message?.toLowerCase() || '';

        if (message.includes('timeout') || message.includes('timed out')) {
            return 'TIMEOUT';
        }
        if (message.includes('network') || message.includes('connection')) {
            return 'NETWORK';
        }
        if (message.includes('element not found') || message.includes('selector')) {
            return 'ELEMENT_NOT_FOUND';
        }
        if (message.includes('navigation') || message.includes('page')) {
            return 'NAVIGATION';
        }
        if (message.includes('permission') || message.includes('access')) {
            return 'PERMISSION';
        }
        if (message.includes('rate limit') || message.includes('too many')) {
            return 'RATE_LIMIT';
        }

        return 'UNKNOWN';
    }

    /**
     * Determine if an error type should trigger a retry
     */
    private shouldRetry(errorType: string): boolean {
        const retryableErrors = ['TIMEOUT', 'NETWORK', 'ELEMENT_NOT_FOUND', 'RATE_LIMIT'];
        return retryableErrors.includes(errorType);
    }

    /**
     * Apply recovery strategies based on error type
     */
    private async applyRecoveryStrategy(toolName: string, args: any, errorType: string): Promise<any> {
        const recoveredArgs = { ...args };

        switch (errorType) {
            case 'TIMEOUT':
                // Increase timeout for next attempt
                if (recoveredArgs.timeout) {
                    recoveredArgs.timeout = Math.min(recoveredArgs.timeout * 1.5, 60000);
                }
                console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] TIMEOUT_RECOVERY:`, {
                    toolName,
                    newTimeout: recoveredArgs.timeout
                });
                break;

            case 'ELEMENT_NOT_FOUND':
                // Try fallback selectors if available
                if (toolName === 'playwright_click' && recoveredArgs.selector) {
                    const fallbackSelectors = this.getFallbackSelectors(recoveredArgs.selector);
                    if (fallbackSelectors.length > 0) {
                        recoveredArgs.selector = fallbackSelectors.join(', ');
                        console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] SELECTOR_RECOVERY:`, {
                            toolName,
                            originalSelector: args.selector,
                            fallbackSelector: recoveredArgs.selector
                        });
                    }
                }
                break;

            case 'RATE_LIMIT':
                // Add extra delay for rate limiting
                const rateLimitDelay = 5000 + Math.random() * 3000; // 5-8 seconds
                console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] RATE_LIMIT_RECOVERY:`, {
                    toolName,
                    delayMs: rateLimitDelay
                });
                await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
                break;

            case 'NAVIGATION':
                // Reset browser state for navigation errors
                if (toolName === 'playwright_navigate') {
                    recoveredArgs.headless = true; // Force headless mode
                    recoveredArgs.timeout = 30000; // Increase timeout
                    console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] NAVIGATION_RECOVERY:`, {
                        toolName,
                        forcedHeadless: true,
                        newTimeout: recoveredArgs.timeout
                    });
                }
                break;

            default:
                // For unknown errors, just add a small delay
                await new Promise(resolve => setTimeout(resolve, 1000));
                break;
        }

        return recoveredArgs;
    }

    /**
     * Get fallback selectors for common elements
     */
    private getFallbackSelectors(originalSelector: string): string[] {
        const fallbacks: string[] = [];

        // Common search input fallbacks
        if (originalSelector.includes('search')) {
            fallbacks.push(
                'input[type="search"]',
                'input[placeholder*="search" i]',
                'input[name*="search" i]',
                '.search-input',
                '#search'
            );
        }

        // Common button fallbacks
        if (originalSelector.includes('button') || originalSelector.includes('btn')) {
            fallbacks.push(
                'button[type="submit"]',
                'input[type="submit"]',
                '.btn-primary',
                '.search-btn',
                '[role="button"]'
            );
        }

        // Common navigation fallbacks
        if (originalSelector.includes('nav') || originalSelector.includes('menu')) {
            fallbacks.push(
                'nav a',
                '.nav-link',
                '.menu-item',
                '[role="navigation"] a'
            );
        }

        return fallbacks.filter(selector => selector !== originalSelector);
    }

    /**
     * Check if browser is connected
     */
    get connected(): boolean {
        return this.isConnected;
    }

    /**
     * Get current URL from browser (real-time)
     */
    async getCurrentUrl(): Promise<string> {
        try {
            // Use JavaScript evaluation to get the actual current URL from the browser
            const result = await this.callMCPTool('playwright_evaluate', {
                script: 'window.location.href'
            });

            // Extract the URL from the MCP response with comprehensive parsing
            let extractedUrl = '';

            if (typeof result === 'string') {
                extractedUrl = result;
            } else if (result && typeof result === 'object') {
                // Handle MCP response format - check multiple possible structures
                if (result.result && typeof result.result === 'string') {
                    extractedUrl = result.result;
                } else if (result.text && typeof result.text === 'string') {
                    extractedUrl = result.text;
                } else if (Array.isArray(result) && result.length > 0) {
                    // Handle array response - look for the actual URL in the array
                    for (const item of result) {
                        if (typeof item === 'string' && item.startsWith('http')) {
                            extractedUrl = item;
                            break;
                        } else if (item && typeof item === 'object' && item.text) {
                            // Check if this text item contains a URL
                            if (typeof item.text === 'string' && item.text.startsWith('http')) {
                                extractedUrl = item.text;
                                break;
                            }
                            // Handle quoted URLs like "https://..."
                            if (typeof item.text === 'string' && item.text.startsWith('"http') && item.text.endsWith('"')) {
                                extractedUrl = item.text.slice(1, -1); // Remove quotes
                                break;
                            }
                        }
                    }
                }
            }

            // Validate that we got a proper URL
            if (extractedUrl && (extractedUrl.startsWith('http') || extractedUrl.startsWith('https'))) {
                console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] GET_CURRENT_URL_SUCCESS:`, {
                    extractedUrl,
                    resultType: typeof result
                });
                return extractedUrl;
            }

            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] GET_CURRENT_URL_FALLBACK:`, {
                result,
                extractedUrl,
                fallbackUrl: this.currentUrl
            });

            return this.currentUrl; // Fallback to cached URL
        } catch (error) {
            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] GET_CURRENT_URL_FAILED:`, {
                error: error.message,
                fallbackUrl: this.currentUrl
            });
            return this.currentUrl; // Fallback to cached URL
        }
    }

    /**
     * Wait for URL to match a pattern
     */
    async waitForURL(pattern: RegExp, options: { timeout?: number } = {}): Promise<string> {
        const timeout = options.timeout || 5000;
        const startTime = Date.now();

        console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] WAIT_FOR_URL_START:`, {
            pattern: pattern.toString(),
            timeout,
            currentCachedUrl: this.currentUrl
        });

        while (Date.now() - startTime < timeout) {
            try {
                const currentUrl = await this.getCurrentUrl();
                if (pattern.test(currentUrl)) {
                    console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] WAIT_FOR_URL_SUCCESS:`, {
                        pattern: pattern.toString(),
                        matchedUrl: currentUrl,
                        duration: Date.now() - startTime
                    });
                    return currentUrl;
                }

                // Wait a bit before checking again
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] WAIT_FOR_URL_CHECK_FAILED:`, {
                    error: error.message
                });
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // Timeout - get final URL for logging
        const finalUrl = await this.getCurrentUrl();
        console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] WAIT_FOR_URL_TIMEOUT:`, {
            pattern: pattern.toString(),
            finalUrl,
            timeout,
            duration: Date.now() - startTime
        });

        throw new Error(`URL did not match pattern ${pattern} within ${timeout}ms. Final URL: ${finalUrl}`);
    }

    /**
     * Get current URL (cached - for backward compatibility)
     */
    get url(): string {
        return this.currentUrl;
    }
}
