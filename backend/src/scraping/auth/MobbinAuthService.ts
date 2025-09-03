import { PlaywrightMCPClient } from '../core/PlaywrightMCPClient.js';

/**
 * Centralized authentication service for Mobbin
 * Handles login detection, authentication, and session management
 */
export class MobbinAuthService {
    private mcpClient: PlaywrightMCPClient;
    private isAuthenticated: boolean = false;

    constructor(mcpClient: PlaywrightMCPClient) {
        this.mcpClient = mcpClient;
    }

    /**
     * Main authentication method - checks if already logged in, otherwise performs login
     */
    async authenticate(): Promise<boolean> {
        console.log('🔐 Checking authentication...');

        if (await this.isLoggedIn()) {
            console.log('✅ Already authenticated');
            this.isAuthenticated = true;
            return true;
        }

        console.log('🔑 Need to authenticate...');
        return await this.performLogin();
    }

    /**
     * Check if user is currently logged in by examining page content
     */
    async isLoggedIn(): Promise<boolean> {
        try {
            const content = await this.mcpClient.getPageContent();
            const contentText = this.extractTextFromResult(content);

            // If we see login prompts, we're not authenticated
            const needsLogin = contentText.includes('Log in') || contentText.includes('Join for free');
            return !needsLogin;
        } catch (error) {
            console.error('❌ Error checking authentication status:', error);
            return false;
        }
    }

    /**
     * Perform the actual login process
     */
    private async performLogin(): Promise<boolean> {
        try {
            // Get credentials from environment variables
            const email = process.env.MOBBIN_EMAIL;
            const password = process.env.MOBBIN_PASSWORD;

            if (!email || !password) {
                throw new Error('MOBBIN_EMAIL and MOBBIN_PASSWORD must be set in environment variables');
            }

            // Step 1: Click login link
            await this.mcpClient.click('a[href="/login"]');
            await this.mcpClient.waitFor('body', { timeout: 2000 });

            // Step 2: Fill email and submit
            await this.mcpClient.fill('input[type="email"]', email);
            await this.mcpClient.click('button[type="submit"]:not(:has-text("Google"))');
            await this.mcpClient.waitFor('body', { timeout: 3000 });

            // Step 3: Fill password and submit
            await this.mcpClient.fill('input[type="password"]', password);
            await this.mcpClient.click('button[type="submit"]:not(:has-text("Google"))');
            await this.mcpClient.waitFor('body', { timeout: 5000 });

            // Verify authentication was successful
            const loginSuccessful = await this.isLoggedIn();

            if (loginSuccessful) {
                console.log('✅ Authentication completed successfully');
                this.isAuthenticated = true;
                return true;
            } else {
                console.error('❌ Authentication failed - still seeing login prompts');
                return false;
            }

        } catch (error) {
            console.error('❌ Authentication failed:', error.message);
            this.isAuthenticated = false;
            return false;
        }
    }

    /**
     * Logout (if needed in the future)
     */
    async logout(): Promise<void> {
        // Implementation for logout if needed
        this.isAuthenticated = false;
        console.log('🔓 Logged out');
    }

    /**
     * Get current authentication status
     */
    getAuthenticationStatus(): boolean {
        return this.isAuthenticated;
    }

    /**
     * Helper method to extract text from MCP result
     */
    private extractTextFromResult(result: any): string {
        if (typeof result === 'string') return result;
        if (result && Array.isArray(result.content)) {
            return result.content[0]?.text || '';
        }
        if (result && result.text) return result.text;
        return '';
    }
}
