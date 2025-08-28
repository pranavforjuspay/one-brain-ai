import { PlaywrightMCPClient } from './src/scraping/core/PlaywrightMCPClient.js';
import { MobbinAuthService } from './src/scraping/auth/MobbinAuthService.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testAuthServiceSimple() {
    console.log('🔍 SIMPLE AUTHENTICATION SERVICE TEST');
    console.log('====================================');

    // Create a mock Fastify app for the client
    const mockApp = {
        log: {
            info: (obj: any, msg: string) => console.log(`[INFO] ${msg}:`, obj),
            error: (obj: any, msg: string) => console.error(`[ERROR] ${msg}:`, obj)
        }
    } as any;

    const client = new PlaywrightMCPClient(mockApp);

    try {
        console.log('🚀 Step 1: Navigate to Mobbin');
        await client.navigate('https://mobbin.com', {
            browserType: 'chromium',
            width: 1280,
            height: 720,
            headless: false,
            timeout: 30000
        });

        console.log('✅ Navigation successful');

        console.log('🔐 Step 2: Test MobbinAuthService');
        const authService = new MobbinAuthService(client);

        console.log('🔑 Calling authenticate()...');
        const authSuccess = await authService.authenticate();

        if (authSuccess) {
            console.log('🎉 SUCCESS: Authentication service worked!');
            console.log('✅ MobbinAuthService is functioning correctly');
        } else {
            console.log('❌ FAILED: Authentication service failed');
        }

        console.log('⏳ Waiting 5 seconds before cleanup...');
        await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (error) {
        console.error('❌ TEST FAILED:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        console.log('🧹 Cleaning up...');
        await client.close();
        console.log('✅ Test completed');
    }
}

// Run the test
testAuthServiceSimple().catch(console.error);
