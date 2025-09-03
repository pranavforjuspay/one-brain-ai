#!/usr/bin/env tsx

import { RealMCPClient } from './src/mcp/RealMCPClient.js';
import { SuggestionDecisionEngine } from './src/scraping/core/SuggestionDecisionEngine.js';
import { PlaywrightMCPClient } from './src/scraping/core/PlaywrightMCPClient.js';

async function testSuggestionClicking() {
    console.log('🧪 FOCUSED TEST: Enhanced Suggestion Clicking Mechanism');
    console.log('='.repeat(60));

    const mcpClient = new RealMCPClient();
    let playwrightClient: PlaywrightMCPClient | null = null;

    try {
        // Connect to MCP
        console.log('🔌 Connecting to MCP...');
        await mcpClient.connect();

        playwrightClient = new PlaywrightMCPClient(mcpClient as any);

        // Navigate to Mobbin
        console.log('🌐 Navigating to Mobbin...');
        await playwrightClient.navigate('https://mobbin.com', {
            browserType: 'chromium',
            headless: false, // Visible for debugging
            width: 1280,
            height: 720
        });

        // Quick authentication (simplified)
        console.log('🔐 Quick authentication...');
        await playwrightClient.click('a[href="/login"]');
        await playwrightClient.waitFor('body', { timeout: 2000 });
        await playwrightClient.fill('input[type="email"]', 'pranav.bahadur@juspay.in');
        await playwrightClient.click('button[type="submit"]:not(:has-text("Google"))');
        await playwrightClient.waitFor('body', { timeout: 3000 });
        await playwrightClient.fill('input[type="password"]', 'Pranav@123456');
        await playwrightClient.click('button[type="submit"]:not(:has-text("Google"))');
        await playwrightClient.waitFor('body', { timeout: 5000 });

        // Open search modal
        console.log('🔍 Opening search modal...');
        await playwrightClient.click('text=Search on iOS...');
        await playwrightClient.waitFor('input[type="text"]', { timeout: 5000 });

        // Type banking
        console.log('⌨️  Typing "banking"...');
        await playwrightClient.fill('input[type="text"]', 'banking');
        await playwrightClient.waitFor('body', { timeout: 3000 });

        // Initialize SuggestionDecisionEngine
        console.log('🤖 Initializing SuggestionDecisionEngine...');
        const suggestionEngine = new SuggestionDecisionEngine(playwrightClient);

        // Discover suggestions
        console.log('🔍 Discovering suggestions...');
        const suggestions = await suggestionEngine.discoverSuggestions('banking');

        console.log(`📋 Found ${suggestions.length} suggestions:`);
        suggestions.forEach((suggestion, index) => {
            console.log(`  ${index + 1}. ${suggestion.text} (${suggestion.type}, confidence: ${suggestion.confidence})`);
        });

        if (suggestions.length === 0) {
            console.log('❌ No suggestions found - test failed');
            return;
        }

        // Test the enhanced clicking mechanism
        console.log('\n🎯 TESTING ENHANCED CLICKING MECHANISM...');
        console.log('='.repeat(50));

        // Try to click the first banking app suggestion
        const targetSuggestion = suggestions.find(s =>
            s.text.toLowerCase().includes('bank') &&
            s.type === 'app' &&
            s.confidence > 0.8
        ) || suggestions[0];

        console.log(`🎯 Attempting to click: "${targetSuggestion.text}"`);
        console.log(`📍 Using selector: ${targetSuggestion.selector}`);

        // First select the best suggestion using the engine's logic
        const selectionResult = await suggestionEngine.selectBestSuggestion(
            suggestions,
            'apps',
            'banking'
        );

        console.log(`🎯 Selected strategy: ${selectionResult.strategy}`);
        console.log(`📝 Reasoning: ${selectionResult.reasoning}`);

        if (selectionResult.suggestion) {
            console.log(`🎯 Attempting to click: "${selectionResult.suggestion.text}"`);
            console.log(`📍 Using selector: ${selectionResult.suggestion.selector}`);
        }

        // Execute the selected strategy
        const clickResult = await suggestionEngine.executeSuggestionStrategy(
            selectionResult.strategy,
            selectionResult.suggestion,
            true // debug mode
        );

        console.log('\n📊 CLICK RESULT:');
        console.log('='.repeat(30));
        console.log(`✅ Success: ${clickResult}`);
        console.log(`📝 Strategy: ${selectionResult.strategy}`);

        if (clickResult) {
            console.log('\n🎉 SUCCESS: Enhanced suggestion clicking mechanism works!');

            // Wait a moment and check if we navigated to an app page
            await playwrightClient.waitFor('body', { timeout: 3000 });
            const currentContent = await playwrightClient.callMCPTool('playwright_get_visible_text', {});

            let contentText = '';
            if (currentContent && currentContent.content && Array.isArray(currentContent.content)) {
                contentText = currentContent.content[0]?.text || '';
            }

            if (contentText.includes('screens') || contentText.includes('flows') ||
                (selectionResult.suggestion && contentText.includes(selectionResult.suggestion.text.split(' ')[0]))) {
                console.log('✅ Successfully navigated to app page!');
            } else {
                console.log('⚠️  Clicked but navigation unclear');
                console.log(`📄 Current content preview: ${contentText.substring(0, 200)}...`);
            }
        } else {
            console.log('\n❌ FAILED: Enhanced suggestion clicking mechanism failed');
            console.log(`   Strategy was: ${selectionResult.strategy}`);
        }

    } catch (error) {
        console.error('❌ Test failed with error:', error);
    } finally {
        if (playwrightClient) {
            console.log('🧹 Cleaning up...');
            await playwrightClient.close();
        }
        await mcpClient.disconnect();
    }
}

// Run the test
testSuggestionClicking().catch(console.error);
