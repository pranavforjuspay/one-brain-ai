"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
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
exports.PlaywrightMCPClient = void 0;
/**
 * Wrapper for Playwright MCP server interactions
 * Provides a clean interface for web automation tasks
 */
class PlaywrightMCPClient {
    constructor(app) {
        this.isConnected = false;
        this.currentUrl = '';
        this.app = app;
    }
    /**
     * Navigate to a URL
     */
    async navigate(url, options = {}) {
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
                headless: options.debugMode ? false : (options.headless !== false), // Show browser in debug mode
                timeout: options.timeout || 30000
            });
            // In debug mode, take a screenshot after navigation
            if (options.debugMode) {
                console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] DEBUG_MODE: Taking screenshot after navigation`);
                try {
                    await this.screenshot(`debug-navigation-${Date.now()}`, { fullPage: false });
                }
                catch (screenshotError) {
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
            this.app.log.info({ url, duration }, 'Playwright navigation successful');
        }
        catch (error) {
            const duration = Date.now() - startTime;
            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] NAVIGATE_FAILED:`, {
                url,
                error: error.message,
                duration: `${duration}ms`
            });
            this.app.log.error({ url, error: error.message }, 'Playwright navigation failed');
            throw new Error(`Navigation failed: ${error.message}`);
        }
    }
    /**
     * Click an element
     */
    async click(selector, options = {}) {
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
        }
        catch (error) {
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
    async fill(selector, value, options = {}) {
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
        }
        catch (error) {
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
    async waitFor(selector, options = {}) {
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
        }
        catch (error) {
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
    async pressKey(key, selector) {
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
        }
        catch (error) {
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
    async screenshot(name, options = {}) {
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
        }
        catch (error) {
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
     * Get page content (HTML)
     */
    async getPageContent(options = {}) {
        const startTime = Date.now();
        console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] GET_CONTENT_START:`, {
            options,
            currentUrl: this.currentUrl,
            timestamp: new Date().toISOString()
        });
        try {
            const result = await this.callMCPTool('playwright_get_visible_html', {
                selector: options.selector,
                removeScripts: options.removeScripts !== false,
                maxLength: options.maxLength || 50000
            });
            const duration = Date.now() - startTime;
            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] GET_CONTENT_SUCCESS:`, {
                contentLength: result?.length || 0,
                duration: `${duration}ms`
            });
            return result || '';
        }
        catch (error) {
            const duration = Date.now() - startTime;
            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] GET_CONTENT_FAILED:`, {
                error: error.message,
                duration: `${duration}ms`
            });
            throw new Error(`Get content failed: ${error.message}`);
        }
    }
    /**
     * Execute a workflow of steps
     */
    async executeWorkflow(steps, debugMode = false) {
        const startTime = Date.now();
        const workflowId = Math.random().toString(36).substring(7);
        console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] WORKFLOW_START:`, {
            workflowId,
            stepsCount: steps.length,
            steps: steps.map(s => ({ action: s.action, description: s.description })),
            debugMode,
            timestamp: new Date().toISOString()
        });
        const errors = [];
        const adaptations = [];
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
                }
                catch (error) {
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
                        }
                        catch (retryError) {
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
        }
        catch (error) {
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
    async executeStep(step, debugMode = false) {
        switch (step.action) {
            case 'navigate':
                if (!step.value)
                    throw new Error('Navigate step requires a URL in value field');
                await this.navigate(step.value, { debugMode });
                break;
            case 'click':
                if (!step.selector)
                    throw new Error('Click step requires a selector');
                await this.click(step.selector);
                break;
            case 'fill':
                if (!step.selector || !step.value)
                    throw new Error('Fill step requires selector and value');
                await this.fill(step.selector, step.value);
                break;
            case 'waitFor':
                if (!step.selector)
                    throw new Error('WaitFor step requires a selector');
                await this.waitFor(step.selector, { timeout: step.timeout });
                break;
            case 'scroll':
                // Implement scroll if needed
                await new Promise(resolve => setTimeout(resolve, 500));
                break;
            case 'hover':
                if (!step.selector)
                    throw new Error('Hover step requires a selector');
                // For now, just wait - implement hover if MCP supports it
                await new Promise(resolve => setTimeout(resolve, 500));
                break;
            case 'press':
                if (!step.value)
                    throw new Error('Press step requires a key value');
                await this.pressKey(step.value, step.selector);
                break;
            default:
                throw new Error(`Unknown workflow action: ${step.action}`);
        }
    }
    /**
     * Close the browser
     */
    async close() {
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
        }
        catch (error) {
            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] CLOSE_FAILED:`, {
                error: error.message
            });
            // Don't throw on close errors
        }
    }
    /**
     * Call an MCP tool using the actual MCP server with comprehensive error handling
     */
    async callMCPTool(toolName, args, retryCount = 0) {
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
            const { useRealMCPTool } = await Promise.resolve().then(() => __importStar(require('../../mcp/RealMCPClient.js')));
            const result = await useRealMCPTool('playwright-mcp-server', toolName, args);
            console.log(`[${new Date().toISOString()}] [PLAYWRIGHT] REAL_MCP_SUCCESS:`, {
                toolName,
                hasResult: !!result,
                resultType: typeof result,
                retryCount
            });
            return result;
        }
        catch (error) {
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
            this.app.log.error({
                toolName,
                args,
                error: error.message,
                errorType,
                finalRetryCount: retryCount
            }, 'MCP tool call failed after all retries - NO FALLBACK');
            // Throw enhanced error with context - force real MCP usage
            throw new Error(`REAL MCP REQUIRED: ${toolName} failed after ${retryCount + 1} attempts: ${error.message} (${errorType})`);
        }
    }
    /**
     * Categorize error types for appropriate handling
     */
    categorizeError(error) {
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
    shouldRetry(errorType) {
        const retryableErrors = ['TIMEOUT', 'NETWORK', 'ELEMENT_NOT_FOUND', 'RATE_LIMIT'];
        return retryableErrors.includes(errorType);
    }
    /**
     * Apply recovery strategies based on error type
     */
    async applyRecoveryStrategy(toolName, args, errorType) {
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
    getFallbackSelectors(originalSelector) {
        const fallbacks = [];
        // Common search input fallbacks
        if (originalSelector.includes('search')) {
            fallbacks.push('input[type="search"]', 'input[placeholder*="search" i]', 'input[name*="search" i]', '.search-input', '#search');
        }
        // Common button fallbacks
        if (originalSelector.includes('button') || originalSelector.includes('btn')) {
            fallbacks.push('button[type="submit"]', 'input[type="submit"]', '.btn-primary', '.search-btn', '[role="button"]');
        }
        // Common navigation fallbacks
        if (originalSelector.includes('nav') || originalSelector.includes('menu')) {
            fallbacks.push('nav a', '.nav-link', '.menu-item', '[role="navigation"] a');
        }
        return fallbacks.filter(selector => selector !== originalSelector);
    }
    /**
     * Check if browser is connected
     */
    get connected() {
        return this.isConnected;
    }
    /**
     * Get current URL
     */
    get url() {
        return this.currentUrl;
    }
}
exports.PlaywrightMCPClient = PlaywrightMCPClient;
