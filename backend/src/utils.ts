/**
 * Utility functions for the backend
 */

/**
 * Real MCP tool usage - connects to actual MCP servers through Cline
 * This function throws an error to indicate that real MCP integration is needed
 */
export async function use_mcp_tool(serverName: string, toolName: string, args: any): Promise<any> {
    console.log(`[${new Date().toISOString()}] [MCP_UTILS] TOOL_CALL_REQUEST:`, {
        serverName,
        toolName,
        args: Object.keys(args),
        timestamp: new Date().toISOString()
    });

    // The backend cannot directly access Cline's MCP system
    // This function should only be called when real MCP integration is available
    console.log(`[${new Date().toISOString()}] [MCP_UTILS] REAL_MCP_REQUIRED:`, {
        reason: 'Backend needs to be called through Cline MCP system for real browser automation',
        toolName,
        serverName
    });

    throw new Error(`Real MCP integration required for ${toolName}. Backend must be called through Cline's MCP system.`);
}

/**
 * Fallback simulation for when real MCP integration fails
 */
async function use_mcp_tool_simulation(serverName: string, toolName: string, args: any): Promise<any> {
    console.log(`[${new Date().toISOString()}] [MCP_UTILS] SIMULATION_FALLBACK:`, {
        serverName,
        toolName,
        args: Object.keys(args)
    });

    // Add realistic delay based on tool type
    const delay = getRealisticDelay(toolName);
    await new Promise(resolve => setTimeout(resolve, delay));

    // Return realistic responses based on tool name
    switch (toolName) {
        case 'playwright_navigate':
            console.log(`[${new Date().toISOString()}] [MCP_UTILS] SIMULATING_NAVIGATION:`, { url: args.url });
            return { success: true, message: `Successfully navigated to ${args.url}` };

        case 'playwright_click':
            console.log(`[${new Date().toISOString()}] [MCP_UTILS] SIMULATING_CLICK:`, { selector: args.selector });
            return { success: true, message: `Successfully clicked ${args.selector}` };

        case 'playwright_fill':
            console.log(`[${new Date().toISOString()}] [MCP_UTILS] SIMULATING_FILL:`, {
                selector: args.selector,
                valueLength: args.value?.length || 0
            });
            return { success: true, message: `Successfully filled ${args.selector}` };

        case 'playwright_screenshot':
            const screenshotPath = `/tmp/mobbin-screenshot-${Date.now()}.png`;
            console.log(`[${new Date().toISOString()}] [MCP_UTILS] SIMULATING_SCREENSHOT:`, {
                name: args.name,
                path: screenshotPath
            });
            return screenshotPath;

        case 'playwright_get_visible_html':
            console.log(`[${new Date().toISOString()}] [MCP_UTILS] SIMULATING_HTML_EXTRACTION:`, {
                maxLength: args.maxLength
            });
            // Return realistic Mobbin-like HTML structure
            return generateRealisticMobbinHTML(args);

        case 'playwright_close':
            console.log(`[${new Date().toISOString()}] [MCP_UTILS] SIMULATING_BROWSER_CLOSE`);
            return { success: true, message: 'Browser closed successfully' };

        default:
            console.log(`[${new Date().toISOString()}] [MCP_UTILS] SIMULATING_UNKNOWN_TOOL:`, { toolName });
            return { success: true, message: `Executed ${toolName}` };
    }
}

/**
 * Get realistic delay based on tool type
 */
function getRealisticDelay(toolName: string): number {
    switch (toolName) {
        case 'playwright_navigate':
            return 2000 + Math.random() * 3000; // 2-5 seconds for navigation
        case 'playwright_get_visible_html':
            return 1000 + Math.random() * 2000; // 1-3 seconds for HTML extraction
        case 'playwright_screenshot':
            return 500 + Math.random() * 1000; // 0.5-1.5 seconds for screenshot
        case 'playwright_click':
        case 'playwright_fill':
            return 200 + Math.random() * 500; // 0.2-0.7 seconds for interactions
        default:
            return 100 + Math.random() * 300; // Default delay
    }
}

/**
 * Generate realistic Mobbin HTML structure for testing
 */
function generateRealisticMobbinHTML(args: any): string {
    const searchTerms = ['login', 'banking', 'fintech', 'authentication', 'transfer'];
    const apps = ['Revolut', 'Monzo', 'N26', 'Chase', 'Wells Fargo', 'Bank of America'];
    const platforms = ['iOS', 'Android', 'Web'];

    let html = `<!DOCTYPE html>
<html>
<head>
    <title>Mobbin - Mobile Design Patterns</title>
</head>
<body>
    <div class="search-results">
        <div class="results-header">
            <h2>Design Patterns</h2>
            <span class="result-count">${3 + Math.floor(Math.random() * 7)} results found</span>
        </div>
        <div class="design-grid">`;

    // Generate 3-6 realistic design cards
    const resultCount = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < resultCount; i++) {
        const app = apps[Math.floor(Math.random() * apps.length)];
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];

        html += `
            <div class="design-card" data-testid="design-card">
                <div class="card-image">
                    <img src="/images/${app.toLowerCase()}-${platform.toLowerCase()}-${i}.png" 
                         alt="${app} ${searchTerm} design" 
                         class="design-image" />
                </div>
                <div class="card-content">
                    <h3 class="design-title">${app} - ${searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1)} Flow</h3>
                    <div class="app-info">
                        <span class="app-name">${app}</span>
                        <span class="platform-badge">${platform}</span>
                    </div>
                    <div class="tags">
                        <span class="tag">${searchTerm}</span>
                        <span class="tag">fintech</span>
                        <span class="tag">mobile</span>
                    </div>
                    <a href="/apps/${app.toLowerCase()}-${platform.toLowerCase()}-${Date.now()}" 
                       class="design-link">View Design</a>
                </div>
            </div>`;
    }

    html += `
        </div>
    </div>
    <script>
        console.log('Mobbin search results loaded');
    </script>
</body>
</html>`;

    return html;
}

/**
 * Helper function to generate unique IDs
 */
export function generateId(): string {
    return Math.random().toString(36).substring(7);
}

/**
 * Helper function to format duration
 */
export function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Helper function to sanitize strings for logging
 */
export function sanitizeForLog(str: string, maxLength: number = 100): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
}
