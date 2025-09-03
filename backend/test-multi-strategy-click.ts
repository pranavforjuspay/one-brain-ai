import { PlaywrightMCPClient } from './src/scraping/core/PlaywrightMCPClient.js';
import { MobbinAuthService } from './src/scraping/auth/MobbinAuthService.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Multi-Strategy Click Test
 * Tests 4 different approaches to clicking suggestions and logs detailed results
 * Stops immediately when a successful strategy is found
 */

interface StrategyResult {
    name: string;
    description: string;
    success: boolean;
    error?: string;
    details: {
        elementsFound: number;
        clickAttempted: boolean;
        navigationOccurred: boolean;
        urlBefore: string;
        urlAfter: string;
        pageContentBefore: string;
        pageContentAfter: string;
    };
}

class MultiStrategyClickTester {
    private mcpClient: PlaywrightMCPClient;
    private results: StrategyResult[] = [];

    constructor() {
        // Create a mock FastifyInstance for the PlaywrightMCPClient
        const mockApp = {
            log: {
                info: console.log,
                error: console.error
            }
        } as any;
        this.mcpClient = new PlaywrightMCPClient(mockApp);
    }

    async runTest(): Promise<void> {
        console.log('🧪 Starting Multi-Strategy Click Test');
        console.log('='.repeat(60));

        try {
            // Navigate and authenticate
            await this.setupTestEnvironment();

            // Test each strategy until one succeeds
            const strategies = [
                this.testDirectSuggestionClick.bind(this),
                this.testFocusKeyboardNavigation.bind(this),
                this.testJavaScriptClick.bind(this),
                this.testTextBasedClick.bind(this),
                this.testFocusedKeyboardNavigation.bind(this)
            ];

            for (const strategy of strategies) {
                const result = await strategy();
                this.results.push(result);

                console.log(`\n📊 Strategy Result: ${result.name}`);
                console.log(`   Success: ${result.success ? '✅' : '❌'}`);
                console.log(`   Elements Found: ${result.details.elementsFound}`);
                console.log(`   Click Attempted: ${result.details.clickAttempted}`);
                console.log(`   Navigation: ${result.details.navigationOccurred}`);

                if (result.success) {
                    console.log(`\n🎉 SUCCESS! Found working strategy: ${result.name}`);
                    console.log(`📝 Description: ${result.description}`);
                    break;
                }

                // Reset for next strategy
                await this.resetToSearchState();
            }

            // Print final summary
            this.printFinalSummary();

        } catch (error) {
            console.error('❌ Test failed:', error);
        } finally {
            await this.cleanup();
        }
    }

    private async setupTestEnvironment(): Promise<void> {
        console.log('\n🚀 Setting up test environment...');

        // Navigate to Mobbin
        await this.mcpClient.navigate('https://mobbin.com', {
            browserType: 'chromium',
            headless: false, // Visible for debugging
            width: 1280,
            height: 720
        });

        // Authenticate using the new service
        await this.authenticateIfNeeded();

        // Navigate to search state
        await this.navigateToSearchState();
    }

    private async authenticateIfNeeded(): Promise<void> {
        const authService = new MobbinAuthService(this.mcpClient);
        const success = await authService.authenticate();
        if (!success) {
            throw new Error('Authentication failed');
        }
    }

    private async navigateToSearchState(): Promise<void> {
        console.log('🔍 Navigating to search state...');

        // FIXED: Use proper Mobbin search modal workflow
        // Step 1: Click "Search on iOS..." button to open the search modal
        console.log('🔍 Clicking "Search on iOS..." to open modal...');
        await this.mcpClient.click('text=Search on iOS...');
        await this.mcpClient.waitFor('body', { timeout: 3000 });

        // Step 2: Wait for modal to appear and search input to be ready
        console.log('⏳ Waiting for search modal to load...');
        await this.mcpClient.waitFor('input[type="text"]', { timeout: 5000 });

        // Step 3: Type "banking" in the modal search input
        console.log('⌨️ Typing "banking" in modal search input...');
        await this.mcpClient.fill('input[type="text"]', 'banking');

        // Step 4: Wait for suggestions dropdown to appear
        console.log('⏳ Waiting for suggestions dropdown to appear...');
        await new Promise(resolve => setTimeout(resolve, 5000)); // Longer wait for suggestions

        console.log('✅ Ready to test click strategies');
    }

    private async resetToSearchState(): Promise<void> {
        console.log('\n🔄 Resetting to search state for next strategy...');

        try {
            // Check if modal is still open by looking for the search input
            const modalCheck = await this.mcpClient.callMCPTool('playwright_evaluate', {
                script: 'document.querySelector("input[type=\\"text\\"]") !== null'
            });

            const modalOpen = this.parseEvaluateResult(modalCheck);

            if (!modalOpen) {
                console.log('🔄 Modal closed, reopening search modal...');
                // Reopen the modal if it was closed
                await this.mcpClient.click('text=Search on iOS...');
                await this.mcpClient.waitFor('input[type="text"]', { timeout: 5000 });
            }

            // Clear search input and retype to refresh suggestions
            console.log('🧹 Clearing and refilling search input...');
            await this.mcpClient.fill('input[type="text"]', '');
            await new Promise(resolve => setTimeout(resolve, 500));
            await this.mcpClient.fill('input[type="text"]', 'banking');

            // Wait longer for suggestions to reappear
            console.log('⏳ Waiting for suggestions to reappear...');
            await new Promise(resolve => setTimeout(resolve, 5000));

        } catch (error) {
            console.log('⚠️ Reset failed, attempting full modal reopen:', error.message);
            // Fallback: try to reopen modal completely
            try {
                await this.mcpClient.click('text=Search on iOS...');
                await this.mcpClient.waitFor('input[type="text"]', { timeout: 5000 });
                await this.mcpClient.fill('input[type="text"]', 'banking');
                await new Promise(resolve => setTimeout(resolve, 5000));
            } catch (fallbackError) {
                console.log('❌ Fallback reset also failed:', fallbackError.message);
            }
        }
    }

    // Strategy 1: CMDK Item Role-Based Click
    private async testDirectSuggestionClick(): Promise<StrategyResult> {
        console.log('\n🎯 Testing Strategy 1: CMDK Item Role-Based Click');

        const result: StrategyResult = {
            name: 'CMDK Item Role-Based Click',
            description: 'Target cmdk-item elements with role="option" - most specific selector',
            success: false,
            details: {
                elementsFound: 0,
                clickAttempted: false,
                navigationOccurred: false,
                urlBefore: '',
                urlAfter: '',
                pageContentBefore: '',
                pageContentAfter: ''
            }
        };

        try {
            // Capture initial state
            result.details.urlBefore = await this.getCurrentUrl();
            result.details.pageContentBefore = await this.getPageContentPreview();

            // Find CMDK suggestions using the actual structure
            const suggestionScript = `
                const suggestions = document.querySelectorAll('[cmdk-item][role="option"]');
                return {
                    count: suggestions.length,
                    firstText: suggestions[0] ? suggestions[0].textContent.trim() : '',
                    visible: suggestions[0] ? suggestions[0].offsetParent !== null : false,
                    firstId: suggestions[0] ? suggestions[0].id : '',
                    firstDataValue: suggestions[0] ? suggestions[0].getAttribute('data-value') : ''
                };
            `;

            const suggestionResult = await this.mcpClient.callMCPTool('playwright_evaluate', {
                script: suggestionScript
            });

            const suggestionData = this.parseEvaluateResult(suggestionResult);
            result.details.elementsFound = suggestionData.count || 0;

            console.log(`   Found ${result.details.elementsFound} CMDK suggestions`);
            console.log(`   First suggestion: "${suggestionData.firstText}"`);
            console.log(`   First ID: "${suggestionData.firstId}"`);
            console.log(`   First data-value: "${suggestionData.firstDataValue}"`);

            if (result.details.elementsFound > 0) {
                // Try to click the first CMDK suggestion
                result.details.clickAttempted = true;
                await this.mcpClient.click('[cmdk-item][role="option"]:first-child');
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Check if navigation occurred
                result.details.urlAfter = await this.getCurrentUrl();
                result.details.pageContentAfter = await this.getPageContentPreview();
                result.details.navigationOccurred = result.details.urlBefore !== result.details.urlAfter;
                result.success = result.details.navigationOccurred;
            }

        } catch (error) {
            result.error = error.message;
        }

        return result;
    }

    // Strategy 2: Data-Value Attribute Click
    private async testFocusKeyboardNavigation(): Promise<StrategyResult> {
        console.log('\n🎯 Testing Strategy 2: Data-Value Attribute Click');

        const result: StrategyResult = {
            name: 'Data-Value Attribute Click',
            description: 'Target elements with data-value attributes within suggestions list',
            success: false,
            details: {
                elementsFound: 0,
                clickAttempted: false,
                navigationOccurred: false,
                urlBefore: '',
                urlAfter: '',
                pageContentBefore: '',
                pageContentAfter: ''
            }
        };

        try {
            result.details.urlBefore = await this.getCurrentUrl();
            result.details.pageContentBefore = await this.getPageContentPreview();

            // Find suggestions using data-value attributes
            const suggestionScript = `
                const suggestions = document.querySelectorAll('[data-value][role="option"]');
                return {
                    count: suggestions.length,
                    firstText: suggestions[0] ? suggestions[0].textContent.trim() : '',
                    visible: suggestions[0] ? suggestions[0].offsetParent !== null : false,
                    firstDataValue: suggestions[0] ? suggestions[0].getAttribute('data-value') : '',
                    ariaDisabled: suggestions[0] ? suggestions[0].getAttribute('aria-disabled') : ''
                };
            `;

            const suggestionResult = await this.mcpClient.callMCPTool('playwright_evaluate', {
                script: suggestionScript
            });

            const suggestionData = this.parseEvaluateResult(suggestionResult);
            result.details.elementsFound = suggestionData.count || 0;

            console.log(`   Found ${result.details.elementsFound} data-value suggestions`);
            console.log(`   First suggestion: "${suggestionData.firstText}"`);
            console.log(`   First data-value: "${suggestionData.firstDataValue}"`);
            console.log(`   Aria-disabled: "${suggestionData.ariaDisabled}"`);

            if (result.details.elementsFound > 0) {
                result.details.clickAttempted = true;

                // Try to click using data-value selector
                await this.mcpClient.click('[data-value][role="option"]:first-child');
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Check navigation
                result.details.urlAfter = await this.getCurrentUrl();
                result.details.pageContentAfter = await this.getPageContentPreview();
                result.details.navigationOccurred = result.details.urlBefore !== result.details.urlAfter;
                result.success = result.details.navigationOccurred;
            }

        } catch (error) {
            result.error = error.message;
        }

        return result;
    }

    // Strategy 3: Radix ID-Based Click
    private async testJavaScriptClick(): Promise<StrategyResult> {
        console.log('\n🎯 Testing Strategy 3: Radix ID-Based Click');

        const result: StrategyResult = {
            name: 'Radix ID-Based Click',
            description: 'Target elements with auto-generated Radix IDs (id starting with radix-:r)',
            success: false,
            details: {
                elementsFound: 0,
                clickAttempted: false,
                navigationOccurred: false,
                urlBefore: '',
                urlAfter: '',
                pageContentBefore: '',
                pageContentAfter: ''
            }
        };

        try {
            result.details.urlBefore = await this.getCurrentUrl();
            result.details.pageContentBefore = await this.getPageContentPreview();

            // Find suggestions using Radix ID pattern
            const suggestionScript = `
                const suggestions = document.querySelectorAll('[id^="radix-:r"][role="option"]');
                return {
                    count: suggestions.length,
                    firstText: suggestions[0] ? suggestions[0].textContent.trim() : '',
                    visible: suggestions[0] ? suggestions[0].offsetParent !== null : false,
                    firstId: suggestions[0] ? suggestions[0].id : '',
                    clickable: suggestions[0] ? !suggestions[0].hasAttribute('aria-disabled') || suggestions[0].getAttribute('aria-disabled') === 'false' : false
                };
            `;

            const suggestionResult = await this.mcpClient.callMCPTool('playwright_evaluate', {
                script: suggestionScript
            });

            const suggestionData = this.parseEvaluateResult(suggestionResult);
            result.details.elementsFound = suggestionData.count || 0;

            console.log(`   Found ${result.details.elementsFound} Radix ID suggestions`);
            console.log(`   First suggestion: "${suggestionData.firstText}"`);
            console.log(`   First ID: "${suggestionData.firstId}"`);
            console.log(`   Clickable: ${suggestionData.clickable}`);

            if (result.details.elementsFound > 0) {
                result.details.clickAttempted = true;

                // Try to click using Radix ID selector
                await this.mcpClient.click('[id^="radix-:r"][role="option"]:first-child');
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Check navigation
                result.details.urlAfter = await this.getCurrentUrl();
                result.details.pageContentAfter = await this.getPageContentPreview();
                result.details.navigationOccurred = result.details.urlBefore !== result.details.urlAfter;
                result.success = result.details.navigationOccurred;
            }

        } catch (error) {
            result.error = error.message;
        }

        return result;
    }

    // Strategy 4: JavaScript Direct Click with Event Dispatch
    private async testTextBasedClick(): Promise<StrategyResult> {
        console.log('\n🎯 Testing Strategy 4: JavaScript Direct Click with Event Dispatch');

        const result: StrategyResult = {
            name: 'JavaScript Direct Click with Event Dispatch',
            description: 'Use JavaScript to directly click CMDK items and dispatch proper events',
            success: false,
            details: {
                elementsFound: 0,
                clickAttempted: false,
                navigationOccurred: false,
                urlBefore: '',
                urlAfter: '',
                pageContentBefore: '',
                pageContentAfter: ''
            }
        };

        try {
            result.details.urlBefore = await this.getCurrentUrl();
            result.details.pageContentBefore = await this.getPageContentPreview();

            // JavaScript click with proper event dispatch
            const jsClickScript = `
                const suggestions = document.querySelectorAll('[cmdk-item][role="option"]');
                if (suggestions.length > 0) {
                    const firstSuggestion = suggestions[0];
                    
                    // Dispatch multiple events to ensure proper interaction
                    const events = ['mousedown', 'mouseup', 'click'];
                    events.forEach(eventType => {
                        const event = new MouseEvent(eventType, {
                            bubbles: true,
                            cancelable: true,
                            view: window
                        });
                        firstSuggestion.dispatchEvent(event);
                    });
                    
                    // Also try focus and enter key
                    firstSuggestion.focus();
                    const enterEvent = new KeyboardEvent('keydown', {
                        key: 'Enter',
                        code: 'Enter',
                        bubbles: true,
                        cancelable: true
                    });
                    firstSuggestion.dispatchEvent(enterEvent);
                    
                    return {
                        count: suggestions.length,
                        clicked: true,
                        text: firstSuggestion.textContent.trim(),
                        id: firstSuggestion.id,
                        dataValue: firstSuggestion.getAttribute('data-value')
                    };
                }
                return { count: 0, clicked: false, text: '', id: '', dataValue: '' };
            `;

            const jsResult = await this.mcpClient.callMCPTool('playwright_evaluate', {
                script: jsClickScript
            });

            const jsData = this.parseEvaluateResult(jsResult);
            result.details.elementsFound = jsData.count || 0;
            result.details.clickAttempted = jsData.clicked || false;

            console.log(`   Found ${result.details.elementsFound} CMDK suggestions`);
            console.log(`   JavaScript click attempted: ${result.details.clickAttempted}`);
            console.log(`   Clicked suggestion: "${jsData.text}"`);
            console.log(`   Element ID: "${jsData.id}"`);
            console.log(`   Data value: "${jsData.dataValue}"`);

            if (result.details.clickAttempted) {
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Check navigation
                result.details.urlAfter = await this.getCurrentUrl();
                result.details.pageContentAfter = await this.getPageContentPreview();
                result.details.navigationOccurred = result.details.urlBefore !== result.details.urlAfter;
                result.success = result.details.navigationOccurred;
            }

        } catch (error) {
            result.error = error.message;
        }

        return result;
    }

    // Strategy 5: Focused Keyboard Navigation from Selected State
    private async testFocusedKeyboardNavigation(): Promise<StrategyResult> {
        console.log('\n⌨️ Testing Strategy 5: Focused Keyboard Navigation from Selected State');

        const result: StrategyResult = {
            name: 'Focused Keyboard Navigation from Selected State',
            description: 'Use Arrow Down + Enter from focused search input (since we can clear it, we have focus)',
            success: false,
            details: {
                elementsFound: 0,
                clickAttempted: false,
                navigationOccurred: false,
                urlBefore: '',
                urlAfter: '',
                pageContentBefore: '',
                pageContentAfter: ''
            }
        };

        try {
            result.details.urlBefore = await this.getCurrentUrl();
            result.details.pageContentBefore = await this.getPageContentPreview();

            // Check for suggestions first
            const suggestionScript = `
                const suggestions = document.querySelectorAll('[role="option"]');
                const searchInput = document.querySelector('input[type="text"]');
                return {
                    count: suggestions.length,
                    inputFocused: document.activeElement === searchInput,
                    inputExists: !!searchInput,
                    firstSuggestionText: suggestions[0] ? suggestions[0].textContent.trim() : ''
                };
            `;

            const suggestionResult = await this.mcpClient.callMCPTool('playwright_evaluate', {
                script: suggestionScript
            });

            const suggestionData = this.parseEvaluateResult(suggestionResult);
            result.details.elementsFound = suggestionData.count || 0;

            console.log(`   Found ${result.details.elementsFound} suggestions`);
            console.log(`   Search input exists: ${suggestionData.inputExists}`);
            console.log(`   Search input focused: ${suggestionData.inputFocused}`);
            console.log(`   First suggestion: "${suggestionData.firstSuggestionText}"`);

            if (result.details.elementsFound > 0) {
                result.details.clickAttempted = true;

                // Ensure search input is focused (it should be since we can clear it)
                if (!suggestionData.inputFocused) {
                    console.log('   Focusing search input first...');
                    await this.mcpClient.click('input[type="text"]');
                    await new Promise(resolve => setTimeout(resolve, 300));
                }

                // Use Arrow Down to navigate to first suggestion
                console.log('   Pressing Arrow Down to navigate to first suggestion...');
                await this.mcpClient.callMCPTool('playwright_press_key', {
                    key: 'ArrowDown'
                });
                await new Promise(resolve => setTimeout(resolve, 500));

                // Press Enter to select the focused suggestion
                console.log('   Pressing Enter to select suggestion...');
                await this.mcpClient.callMCPTool('playwright_press_key', {
                    key: 'Enter'
                });
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Check navigation
                result.details.urlAfter = await this.getCurrentUrl();
                result.details.pageContentAfter = await this.getPageContentPreview();
                result.details.navigationOccurred = result.details.urlBefore !== result.details.urlAfter;
                result.success = result.details.navigationOccurred;

                console.log(`   Navigation occurred: ${result.details.navigationOccurred}`);
                if (result.details.navigationOccurred) {
                    console.log(`   URL changed: ${result.details.urlBefore} → ${result.details.urlAfter}`);
                }
            }

        } catch (error) {
            result.error = error.message;
        }

        return result;
    }

    // Helper methods
    private async getCurrentUrl(): Promise<string> {
        try {
            const result = await this.mcpClient.callMCPTool('playwright_evaluate', {
                script: 'window.location.href'
            });
            return this.parseEvaluateResult(result) || '';
        } catch {
            return '';
        }
    }

    private async getPageContentPreview(): Promise<string> {
        try {
            const content = await this.mcpClient.getPageContent();
            const text = this.extractTextFromResult(content);
            return text.substring(0, 200) + '...';
        } catch {
            return '';
        }
    }

    private extractTextFromResult(result: any): string {
        if (typeof result === 'string') return result;
        if (result && Array.isArray(result.content)) {
            return result.content[0]?.text || '';
        }
        if (result && result.text) return result.text;
        return '';
    }

    private parseEvaluateResult(result: any): any {
        try {
            if (typeof result === 'string') return JSON.parse(result);
            if (result && result.content && Array.isArray(result.content)) {
                const text = result.content[0]?.text;
                if (text) return JSON.parse(text);
            }
            return result;
        } catch {
            return result;
        }
    }

    private printFinalSummary(): void {
        console.log('\n' + '='.repeat(60));
        console.log('📊 FINAL SUMMARY - Multi-Strategy Click Test');
        console.log('='.repeat(60));

        const successfulStrategy = this.results.find(r => r.success);

        if (successfulStrategy) {
            console.log(`\n🎉 SUCCESSFUL STRATEGY FOUND!`);
            console.log(`   Name: ${successfulStrategy.name}`);
            console.log(`   Description: ${successfulStrategy.description}`);
            console.log(`   Elements Found: ${successfulStrategy.details.elementsFound}`);
            console.log(`   Navigation: ${successfulStrategy.details.urlBefore} → ${successfulStrategy.details.urlAfter}`);
        } else {
            console.log(`\n❌ NO SUCCESSFUL STRATEGY FOUND`);
            console.log(`   All ${this.results.length} strategies failed`);
        }

        console.log('\n📋 All Strategy Results:');
        this.results.forEach((result, index) => {
            console.log(`\n${index + 1}. ${result.name}`);
            console.log(`   Success: ${result.success ? '✅' : '❌'}`);
            console.log(`   Elements: ${result.details.elementsFound}`);
            console.log(`   Click Attempted: ${result.details.clickAttempted}`);
            console.log(`   Navigation: ${result.details.navigationOccurred}`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        });

        console.log('\n' + '='.repeat(60));
    }

    private async cleanup(): Promise<void> {
        try {
            await this.mcpClient.close();
            console.log('✅ Cleanup completed');
        } catch (error) {
            console.error('❌ Cleanup error:', error);
        }
    }
}

// Run the test
const tester = new MultiStrategyClickTester();
tester.runTest().catch(console.error);
