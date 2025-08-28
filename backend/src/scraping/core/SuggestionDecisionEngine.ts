import { PlaywrightMCPClient } from './PlaywrightMCPClient.js';

/**
 * Intelligent engine for making smart decisions about which suggestions to click
 * Based on route type and available suggestions from Mobbin's dropdown
 */
export class SuggestionDecisionEngine {
    private mcpClient: PlaywrightMCPClient;

    // Stable row locator for Mobbin suggestions
    private static readonly STABLE_ROW = 'div[role="option"].flex.h-56.cursor-pointer';

    constructor(mcpClient: PlaywrightMCPClient) {
        this.mcpClient = mcpClient;
    }

    /**
     * Discover and analyze available suggestions from Mobbin's dropdown
     */
    async discoverSuggestions(keyword: string): Promise<Array<{
        text: string;
        type: 'app' | 'flow' | 'screen' | 'ui-element' | 'text-search' | 'general';
        selector: string;
        confidence: number;
        description?: string;
    }>> {
        console.log(`[SUGGESTION_ENGINE] Discovering suggestions for keyword: "${keyword}"`);

        // CRITICAL FIX: Wait for suggestions to load after typing
        console.log(`[SUGGESTION_ENGINE] Waiting 5 seconds for suggestions to fully load...`);
        await new Promise(resolve => setTimeout(resolve, 5000));

        // ENHANCED APPROACH: Use stable row locator for Mobbin's suggestion dropdown
        const discoverScript = `
            (function() {
                try {
                    const suggestions = [];
                    const STABLE_ROW = 'div[role="option"].flex.h-56.cursor-pointer';
                    
                    // Try the stable row locator first
                    let foundElements = [];
                    let usedSelector = '';
                    
                    console.log('Trying stable row locator: ' + STABLE_ROW);
                    const stableElements = document.querySelectorAll(STABLE_ROW);
                    console.log('Found ' + stableElements.length + ' elements with stable locator');
                    
                    if (stableElements.length > 0) {
                        // Filter for visible elements
                        const validElements = Array.from(stableElements).filter(el => {
                            const text = el.textContent ? el.textContent.trim() : '';
                            const isVisible = el.offsetParent !== null;
                            const hasReasonableText = text.length > 2 && text.length < 200;
                            return text && isVisible && hasReasonableText;
                        });
                        
                        if (validElements.length > 0) {
                            foundElements = validElements;
                            usedSelector = STABLE_ROW;
                            console.log('SUCCESS: Found ' + validElements.length + ' valid suggestions with stable locator');
                        }
                    }
                    
                    // Fallback to comprehensive selector strategy if stable locator fails
                    if (foundElements.length === 0) {
                        console.log('Stable locator failed, trying fallback selectors...');
                        const selectorStrategies = [
                            '[role="option"]',                    // Standard ARIA role
                            '.suggestion-item',                   // Common class name
                            '.dropdown-item',                     // Bootstrap-style dropdown
                            '.search-suggestion',                 // Search-specific class
                            '[data-testid*="suggestion"]',        // Test ID pattern
                            '.autocomplete-item',                 // Autocomplete pattern
                            '.search-result-item',                // Search result pattern
                            'li[role="option"]',                  // List item with role
                            '.menu-item',                         // Menu item pattern
                            '[class*="suggestion"]',              // Any class containing "suggestion"
                            '[class*="dropdown"]',                // Any class containing "dropdown"
                            'div[tabindex="0"]',                  // Focusable divs (common for suggestions)
                            '.react-select__option',              // React Select component
                            '.select-option',                     // Generic select option
                            'ul > li',                           // Simple list items
                            '.list-item'                         // Generic list item
                        ];
                        
                        // Try each selector strategy until we find suggestions
                        for (const selector of selectorStrategies) {
                            const elements = document.querySelectorAll(selector);
                            console.log('Trying selector "' + selector + '": found ' + elements.length + ' elements');
                            
                            if (elements.length > 0) {
                                // Filter for elements that look like suggestions (have text, are visible)
                                const validElements = Array.from(elements).filter(el => {
                                    const text = el.textContent ? el.textContent.trim() : '';
                                    const isVisible = el.offsetParent !== null;
                                    const hasReasonableText = text.length > 2 && text.length < 200;
                                    return text && isVisible && hasReasonableText;
                                });
                                
                                if (validElements.length > 0) {
                                    foundElements = validElements;
                                    usedSelector = selector;
                                    console.log('SUCCESS: Found ' + validElements.length + ' valid suggestions with selector: ' + selector);
                                    break;
                                }
                            }
                        }
                        
                        // If no specific selectors worked, try a broader approach
                        if (foundElements.length === 0) {
                            console.log('No suggestions found with specific selectors, trying broader approach...');
                            
                            // Look for any clickable elements that might be suggestions
                            const broadElements = document.querySelectorAll('div, li, a, span');
                            const potentialSuggestions = Array.from(broadElements).filter(el => {
                                const text = el.textContent ? el.textContent.trim() : '';
                                const isVisible = el.offsetParent !== null;
                                const hasReasonableText = text.length > 5 && text.length < 100;
                                const isClickable = el.onclick || el.getAttribute('role') === 'button' || 
                                                  el.tagName === 'A' || el.style.cursor === 'pointer';
                                
                                // Look for banking-related keywords if searching for banking
                                const hasBankingKeywords = text.toLowerCase().includes('bank') || 
                                                         text.toLowerCase().includes('chase') ||
                                                         text.toLowerCase().includes('wells') ||
                                                         text.toLowerCase().includes('america') ||
                                                         text.toLowerCase().includes('finance') ||
                                                         text.toLowerCase().includes('credit');
                                
                                return text && isVisible && hasReasonableText && (isClickable || hasBankingKeywords);
                            });
                            
                            if (potentialSuggestions.length > 0) {
                                foundElements = potentialSuggestions.slice(0, 5); // Limit to first 5
                                usedSelector = 'broad-search';
                                console.log('Found ' + foundElements.length + ' potential suggestions via broad search');
                            }
                        }
                    }
                    
                    // Process found elements into suggestions
                    for (let i = 0; i < Math.min(foundElements.length, 10); i++) {
                        const element = foundElements[i];
                        const text = element.textContent ? element.textContent.trim() : '';
                        
                        if (text && text.length > 2) {
                            // Enhanced type detection based on text content
                            let type = 'app'; // Default to app for Apps route
                            let confidence = 0.7;
                            
                            const lowerText = text.toLowerCase();
                            
                            // App detection (higher confidence for known app patterns)
                            if (lowerText.includes('bank') || lowerText.includes('chase') || 
                                lowerText.includes('wells') || lowerText.includes('america') ||
                                lowerText.includes('finance') || lowerText.includes('credit') ||
                                lowerText.includes('paypal') || lowerText.includes('venmo')) {
                                type = 'app';
                                confidence = 0.9;
                            }
                            // Flow detection
                            else if (lowerText.includes('flow') || lowerText.includes('onboarding') ||
                                    lowerText.includes('signup') || lowerText.includes('registration')) {
                                type = 'flow';
                                confidence = 0.85;
                            }
                            // Screen detection
                            else if (lowerText.includes('screen') || lowerText.includes('login') ||
                                    lowerText.includes('text in screenshot') || lowerText.includes('ui')) {
                                type = 'screen';
                                confidence = 0.85;
                            }
                            
                            // Create a more reliable selector using Playwright's nth filter
                            let elementSelector = '';
                            if (usedSelector === 'broad-search') {
                                // For broad search, create a more specific selector
                                const textSelector = 'text="' + text.substring(0, 30) + '"';
                                elementSelector = textSelector; // Use text selector as most reliable
                            } else if (usedSelector === STABLE_ROW) {
                                // Use Playwright's nth filter for stable row locator
                                elementSelector = STABLE_ROW + ' >> nth=' + i;
                            } else {
                                // Use Playwright's nth filter for other selectors too
                                elementSelector = usedSelector + ' >> nth=' + i;
                            }
                            
                            suggestions.push({
                                text: text.substring(0, 100), // Limit text length
                                type: type,
                                selector: elementSelector,
                                confidence: confidence,
                                description: 'Found via: ' + usedSelector,
                                elementIndex: i,
                                originalSelector: usedSelector
                            });
                        }
                    }
                    
                    console.log('Final result: ' + suggestions.length + ' suggestions processed');
                    return JSON.stringify(suggestions);
                } catch (e) {
                    console.error('Script error:', e);
                    return '[]';
                }
            })();
        `;

        try {
            const result = await this.mcpClient.callMCPTool('playwright_evaluate', {
                script: discoverScript
            });

            // ROBUST result parsing with multiple fallbacks
            let suggestions: Array<{
                text: string;
                type: 'app' | 'flow' | 'screen' | 'ui-element' | 'text-search' | 'general';
                selector: string;
                confidence: number;
                description?: string;
                elementIndex?: number;
            }> = [];

            try {
                let jsonString = '';

                if (result && typeof result === 'object') {
                    if (result.content && Array.isArray(result.content)) {
                        // Find the result content
                        for (const item of result.content) {
                            if (item.text && item.text.startsWith('[')) {
                                jsonString = item.text;
                                break;
                            }
                        }
                    } else if (result.text) {
                        jsonString = result.text;
                    }
                } else if (typeof result === 'string') {
                    jsonString = result;
                }

                if (jsonString) {
                    suggestions = JSON.parse(jsonString);
                }
            } catch (parseError) {
                console.error('[SUGGESTION_ENGINE] JSON parse failed, trying fallback approach:', parseError);

                // FALLBACK: Try to extract suggestions using a simpler method
                try {
                    const fallbackResult = await this.mcpClient.callMCPTool('playwright_evaluate', {
                        script: `
                            const elements = document.querySelectorAll('[role="option"]');
                            const count = elements.length;
                            const firstText = elements[0] ? elements[0].textContent.trim() : '';
                            JSON.stringify({count: count, firstText: firstText});
                        `
                    });

                    console.log('[SUGGESTION_ENGINE] Fallback result:', fallbackResult);

                    // If we can at least detect suggestions exist, create a minimal set
                    if (fallbackResult && fallbackResult.content) {
                        const fallbackData = JSON.parse(fallbackResult.content[0]?.text || '{}');
                        if (fallbackData.count > 0) {
                            suggestions = [{
                                text: fallbackData.firstText || 'First suggestion',
                                type: 'app' as const,
                                selector: '[role="option"]:nth-child(1)',
                                confidence: 0.8,
                                description: '',
                                elementIndex: 0
                            }];
                        }
                    }
                } catch (fallbackError) {
                    console.error('[SUGGESTION_ENGINE] Fallback also failed:', fallbackError);
                    suggestions = [];
                }
            }

            console.log(`[SUGGESTION_ENGINE] Successfully discovered ${suggestions.length} suggestions for "${keyword}"`);

            // Log each suggestion for debugging
            suggestions.forEach((suggestion, index) => {
                console.log(`[SUGGESTION_ENGINE] ${index + 1}. "${suggestion.text}" (${suggestion.type}, confidence: ${suggestion.confidence})`);
            });

            return suggestions;
        } catch (error) {
            console.error('[SUGGESTION_ENGINE] Failed to discover suggestions:', error);
            return [];
        }
    }

    /**
     * Select the best suggestion based on route type and available options
     */
    async selectBestSuggestion(
        suggestions: Array<{
            text: string;
            type: 'app' | 'flow' | 'screen' | 'ui-element' | 'text-search' | 'general';
            selector: string;
            confidence: number;
            description?: string;
        }>,
        routeType: 'apps' | 'flows' | 'screens',
        keyword: string
    ): Promise<{
        suggestion: any;
        strategy: 'click-suggestion' | 'press-enter' | 'no-action';
        reasoning: string;
    }> {
        console.log(`[SUGGESTION_ENGINE] Selecting best suggestion for route: ${routeType}, keyword: "${keyword}"`);

        // Route-specific selection logic
        switch (routeType) {
            case 'apps':
                return this.selectAppSuggestion(suggestions, keyword);
            case 'flows':
                return this.selectFlowSuggestion(suggestions, keyword);
            case 'screens':
                return this.selectScreenSuggestion(suggestions, keyword);
            default:
                return {
                    suggestion: null,
                    strategy: 'press-enter',
                    reasoning: 'Unknown route type, falling back to general search'
                };
        }
    }

    /**
     * Select best app suggestion (prioritize apps with icons and descriptions)
     */
    private selectAppSuggestion(suggestions: any[], keyword: string) {
        // Look for app suggestions (have icons and descriptions)
        const appSuggestions = suggestions.filter(s => s.type === 'app');

        if (appSuggestions.length > 0) {
            // Sort by confidence and relevance
            const bestApp = appSuggestions.sort((a, b) => b.confidence - a.confidence)[0];
            return {
                suggestion: bestApp,
                strategy: 'click-suggestion' as const,
                reasoning: `Found app suggestion: "${bestApp.text}" with confidence ${bestApp.confidence}`
            };
        }

        // Fallback to general search if no app suggestions
        const generalSuggestion = suggestions.find(s => s.type === 'general');
        if (generalSuggestion) {
            return {
                suggestion: generalSuggestion,
                strategy: 'press-enter' as const,
                reasoning: 'No app suggestions found, using general search'
            };
        }

        return {
            suggestion: null,
            strategy: 'press-enter' as const,
            reasoning: 'No suitable suggestions found, falling back to Enter key'
        };
    }

    /**
     * Select best flow suggestion (prioritize "Flow" labeled options)
     */
    private selectFlowSuggestion(suggestions: any[], keyword: string) {
        // Look for flow suggestions (labeled with "Flow")
        const flowSuggestions = suggestions.filter(s => s.type === 'flow');

        if (flowSuggestions.length > 0) {
            const bestFlow = flowSuggestions.sort((a, b) => b.confidence - a.confidence)[0];
            return {
                suggestion: bestFlow,
                strategy: 'click-suggestion' as const,
                reasoning: `Found flow suggestion: "${bestFlow.text}" with confidence ${bestFlow.confidence}`
            };
        }

        // Fallback to general search
        return {
            suggestion: null,
            strategy: 'press-enter' as const,
            reasoning: 'No flow suggestions found, falling back to general search'
        };
    }

    /**
     * Select best screen suggestion (prioritize "Screen" labeled options)
     */
    private selectScreenSuggestion(suggestions: any[], keyword: string) {
        // Look for screen suggestions (labeled with "Screen")
        const screenSuggestions = suggestions.filter(s => s.type === 'screen');

        if (screenSuggestions.length > 0) {
            const bestScreen = screenSuggestions.sort((a, b) => b.confidence - a.confidence)[0];
            return {
                suggestion: bestScreen,
                strategy: 'click-suggestion' as const,
                reasoning: `Found screen suggestion: "${bestScreen.text}" with confidence ${bestScreen.confidence}`
            };
        }

        // Fallback to general search
        return {
            suggestion: null,
            strategy: 'press-enter' as const,
            reasoning: 'No screen suggestions found, falling back to general search'
        };
    }

    /**
     * Execute the selected suggestion strategy using headless-safe keyboard navigation
     * This mimics human behavior: Type → Focus → ArrowDown → Enter
     */
    async executeSuggestionStrategy(
        strategy: 'click-suggestion' | 'press-enter' | 'no-action',
        suggestion: any,
        debugMode: boolean = false
    ): Promise<boolean> {
        console.log(`[SUGGESTION_ENGINE] Executing strategy: ${strategy}`);

        try {
            switch (strategy) {
                case 'click-suggestion':
                    console.log(`[SUGGESTION_ENGINE] Using HEADLESS-SAFE KEYBOARD NAVIGATION`);
                    console.log(`[SUGGESTION_ENGINE] Strategy: Focus → ArrowDown → Enter (headless compatible)`);
                    console.log(`[SUGGESTION_ENGINE] Target suggestion: "${suggestion?.text || 'First suggestion'}"`);

                    try {
                        // EXPLICIT CLICK APPROACH: Ensure focus by clicking on search input
                        // Step 1: Wait for suggestions to fully load
                        console.log(`[SUGGESTION_ENGINE] Step 1: Waiting for suggestions to stabilize...`);
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        // Step 2: Explicit click on search input to ensure focus (user's suggestion)
                        console.log(`[SUGGESTION_ENGINE] Step 2: Explicit click on search input to ensure focus`);
                        await this.mcpClient.executeWorkflow([{
                            action: 'click',
                            selector: 'input[type="text"]',
                            description: 'Explicit click on search input to ensure focus for keyboard navigation'
                        }], debugMode);

                        // Small wait for focus to be established
                        await new Promise(resolve => setTimeout(resolve, 300));

                        // Step 3: Use ArrowDown to highlight first suggestion
                        console.log(`[SUGGESTION_ENGINE] Step 3: Pressing ArrowDown to highlight first suggestion`);
                        await this.mcpClient.callMCPTool('playwright_press_key', {
                            key: 'ArrowDown',
                            selector: 'input[type="text"]'
                        });

                        // Small wait for UI to update
                        await new Promise(resolve => setTimeout(resolve, 500));

                        // Step 4: Use Enter to select highlighted suggestion
                        console.log(`[SUGGESTION_ENGINE] Step 4: Pressing Enter to select highlighted suggestion`);
                        await this.mcpClient.callMCPTool('playwright_press_key', {
                            key: 'Enter',
                            selector: 'input[type="text"]'
                        });

                        // Wait for navigation to complete
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        console.log(`[SUGGESTION_ENGINE] ✅ Explicit click + keyboard navigation completed`);
                        console.log(`[SUGGESTION_ENGINE] Expected result: Selected first suggestion using click focus + ArrowDown + Enter`);

                        return true;

                    } catch (keyboardError) {
                        console.log(`[SUGGESTION_ENGINE] Headless-safe keyboard navigation failed: ${keyboardError.message}`);
                        console.log(`[SUGGESTION_ENGINE] Trying fallback approach with click focus...`);

                        try {
                            // Fallback: Try click focus + general key events
                            await this.mcpClient.executeWorkflow([{
                                action: 'click',
                                selector: 'input[type="text"]',
                                description: 'Fallback: Click search input to ensure focus'
                            }], debugMode);

                            await new Promise(resolve => setTimeout(resolve, 300));

                            await this.mcpClient.executeWorkflow([{
                                action: 'press',
                                value: 'ArrowDown',
                                description: 'Fallback: Press ArrowDown'
                            }], debugMode);

                            await new Promise(resolve => setTimeout(resolve, 300));

                            await this.mcpClient.executeWorkflow([{
                                action: 'press',
                                value: 'Enter',
                                description: 'Fallback: Press Enter'
                            }], debugMode);

                            console.log(`[SUGGESTION_ENGINE] ✅ Fallback keyboard navigation completed`);
                            return true;

                        } catch (fallbackError) {
                            console.log(`[SUGGESTION_ENGINE] Fallback also failed: ${fallbackError.message}`);
                            console.log(`[SUGGESTION_ENGINE] Final fallback: Direct Enter for general search`);

                            // Final fallback to just pressing Enter for general search
                            await this.mcpClient.executeWorkflow([{
                                action: 'press',
                                value: 'Enter',
                                description: 'Final fallback: Press Enter for general search'
                            }], debugMode);

                            return true;
                        }
                    }

                case 'press-enter':
                    console.log('[SUGGESTION_ENGINE] Pressing Enter for general search');
                    await this.mcpClient.executeWorkflow([{
                        action: 'press',
                        value: 'Enter',
                        description: 'Press Enter to execute general search'
                    }], debugMode);

                    return true;

                case 'no-action':
                    console.log('[SUGGESTION_ENGINE] No action required');
                    return true;

                default:
                    throw new Error(`Unknown strategy: ${strategy}`);
            }
        } catch (error) {
            console.error(`[SUGGESTION_ENGINE] Failed to execute strategy ${strategy}:`, error);
            return false;
        }
    }
}
