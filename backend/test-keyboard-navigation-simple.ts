import { SuggestionDecisionEngine } from './src/scraping/core/SuggestionDecisionEngine.js';
import { PlaywrightMCPClient } from './src/scraping/core/PlaywrightMCPClient.js';

/**
 * SIMPLE KEYBOARD NAVIGATION TEST
 * Tests the new keyboard approach: Type → ArrowDown → Enter
 */

async function testKeyboardNavigation() {
    console.log('⌨️  KEYBOARD NAVIGATION TEST');
    console.log('============================');
    console.log('Testing the new keyboard approach: Type → ArrowDown → Enter\n');

    // Create mock Fastify app
    const mockApp = {
        log: {
            info: (obj: any, msg: string) => console.log(`[INFO] ${msg}:`, obj),
            error: (obj: any, msg: string) => console.error(`[ERROR] ${msg}:`, obj)
        }
    } as any;

    try {
        // Initialize MCP client
        const mcpClient = new PlaywrightMCPClient(mockApp);
        const suggestionEngine = new SuggestionDecisionEngine(mcpClient);

        console.log('🚀 STEP 1: Navigate to Mobbin');
        await mcpClient.navigate('https://mobbin.com', { debugMode: true });

        console.log('⏱️  Waiting for page to load...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('🔍 STEP 2: Open search modal (iOS Apps)');
        // Click on iOS Apps search
        await mcpClient.executeWorkflow([{
            action: 'click',
            selector: 'a[href="/browse/ios/apps"]',
            description: 'Click iOS Apps to open search'
        }], true);

        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('⌨️  STEP 3: Type "banking" in search');
        // Find and fill search input
        await mcpClient.executeWorkflow([{
            action: 'fill',
            selector: 'input[type="text"], input[placeholder*="search"], input[placeholder*="Search"]',
            value: 'banking',
            description: 'Type banking in search field'
        }], true);

        console.log('⏳ STEP 4: Wait for suggestions to appear');
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('🎯 STEP 5: Execute keyboard navigation (ArrowDown + Enter)');

        // Test the new keyboard approach
        const result = await suggestionEngine.executeSuggestionStrategy(
            'click-suggestion',
            { text: 'First banking suggestion' },
            true // debug mode
        );

        console.log('\n📊 KEYBOARD NAVIGATION RESULT');
        console.log('==============================');
        console.log(`✅ Success: ${result ? 'YES' : 'NO'}`);
        console.log(`🎯 Strategy: Keyboard navigation (ArrowDown + Enter)`);
        console.log(`📱 Expected: Should select first banking app suggestion`);

        if (result) {
            console.log('\n🎉 KEYBOARD NAVIGATION WORKS!');
            console.log('The new approach successfully uses:');
            console.log('1. ArrowDown to highlight first suggestion');
            console.log('2. Enter to select highlighted suggestion');
            console.log('3. No complex DOM clicking required');
        } else {
            console.log('\n❌ KEYBOARD NAVIGATION FAILED');
            console.log('Need to investigate the keyboard approach');
        }

        // Take a screenshot to see the result
        console.log('\n📸 Taking final screenshot...');
        await mcpClient.screenshot('keyboard-navigation-result', { debugMode: true });

        return result;

    } catch (error) {
        console.error('\n❌ KEYBOARD NAVIGATION TEST FAILED');
        console.error('Error:', error instanceof Error ? error.message : error);
        return false;
    }
}

// Run the test
testKeyboardNavigation()
    .then(result => {
        console.log(`\n🏁 Final Result: ${result ? 'KEYBOARD NAVIGATION WORKS' : 'NEEDS DEBUGGING'}`);
        process.exit(result ? 0 : 1);
    })
    .catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
