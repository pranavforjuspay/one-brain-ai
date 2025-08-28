"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealMCPClient = void 0;
exports.getMCPClient = getMCPClient;
exports.isBrowserSessionActive = isBrowserSessionActive;
exports.waitForBrowserSession = waitForBrowserSession;
exports.startBrowserSession = startBrowserSession;
exports.endBrowserSession = endBrowserSession;
exports.useRealMCPTool = useRealMCPTool;
exports.shutdownMCPClient = shutdownMCPClient;
const child_process_1 = require("child_process");
const events_1 = require("events");
/**
 * Real MCP Client that connects to actual MCP servers
 * Implements the proper MCP protocol for Playwright automation
 */
class RealMCPClient extends events_1.EventEmitter {
    constructor() {
        super();
        this.mcpProcess = null;
        this.isConnected = false;
        this.isInitialized = false;
        this.requestId = 0;
        this.pendingRequests = new Map();
        this.availableTools = [];
        this.serverCapabilities = {};
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.isReconnecting = false;
        this.shutdownRequested = false;
    }
    /**
     * Connect to the Playwright MCP server
     */
    async connect() {
        if (this.isConnected) {
            return;
        }
        try {
            console.log('[REAL_MCP] Starting Playwright MCP server...');
            // Spawn the Playwright MCP server process with proper stdio configuration
            this.mcpProcess = (0, child_process_1.spawn)('npx', ['-y', '@executeautomation/playwright-mcp-server'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env, NODE_ENV: 'production' }
            });
            if (!this.mcpProcess.stdout || !this.mcpProcess.stdin || !this.mcpProcess.stderr) {
                throw new Error('Failed to create MCP process with proper stdio');
            }
            // Set up communication handlers
            this.mcpProcess.stdout.on('data', (data) => {
                this.handleResponse(data.toString());
            });
            this.mcpProcess.stderr.on('data', (data) => {
                const errorMsg = data.toString().trim();
                if (errorMsg) {
                    console.error('[REAL_MCP] Server Error:', errorMsg);
                }
            });
            this.mcpProcess.on('close', (code) => {
                console.log(`[REAL_MCP] Process closed with code: ${code}`);
                this.cleanup();
            });
            this.mcpProcess.on('error', (error) => {
                console.error('[REAL_MCP] Process Error:', error);
                this.cleanup();
            });
            // Wait for process to be ready
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Initialize the MCP connection
            await this.initialize();
            // List available tools
            await this.listTools();
            this.isConnected = true;
            console.log('[REAL_MCP] Successfully connected to Playwright MCP server');
            console.log('[REAL_MCP] Available tools:', this.availableTools);
        }
        catch (error) {
            console.error('[REAL_MCP] Failed to connect:', error);
            this.cleanup();
            throw error;
        }
    }
    /**
     * Initialize the MCP connection with proper handshake
     */
    async initialize() {
        console.log('[REAL_MCP] Initializing MCP connection...');
        const initResponse = await this.sendRequest('initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {
                tools: {}
            },
            clientInfo: {
                name: 'one-brain-ai-backend',
                version: '1.0.0'
            }
        });
        this.serverCapabilities = initResponse.capabilities || {};
        console.log('[REAL_MCP] Server capabilities:', this.serverCapabilities);
        // Send initialized notification
        await this.sendNotification('notifications/initialized', {});
        this.isInitialized = true;
        console.log('[REAL_MCP] MCP connection initialized successfully');
    }
    /**
     * List available tools from the MCP server
     */
    async listTools() {
        console.log('[REAL_MCP] Listing available tools...');
        try {
            const response = await this.sendRequest('tools/list', {});
            if (response.tools && Array.isArray(response.tools)) {
                this.availableTools = response.tools.map((tool) => tool.name);
                console.log('[REAL_MCP] Found tools:', this.availableTools);
            }
            else {
                console.warn('[REAL_MCP] No tools found in response:', response);
            }
        }
        catch (error) {
            console.error('[REAL_MCP] Failed to list tools:', error);
            // Continue anyway - some servers might not support tools/list
        }
    }
    /**
     * Use an MCP tool
     */
    async useTool(toolName, args) {
        if (!this.isConnected) {
            await this.connect();
        }
        if (!this.isInitialized) {
            throw new Error('MCP client not properly initialized');
        }
        console.log(`[REAL_MCP] Using tool: ${toolName}`, {
            args: Object.keys(args),
            availableTools: this.availableTools.length
        });
        try {
            const response = await this.sendRequest('tools/call', {
                name: toolName,
                arguments: args
            });
            console.log(`[REAL_MCP] Tool ${toolName} completed successfully`);
            // Handle different response formats
            if (response.content) {
                return response.content;
            }
            else if (response.result) {
                return response.result;
            }
            else {
                return response;
            }
        }
        catch (error) {
            console.error(`[REAL_MCP] Tool ${toolName} failed:`, error);
            throw error;
        }
    }
    /**
     * Send a request to the MCP server
     */
    async sendRequest(method, params) {
        return new Promise((resolve, reject) => {
            if (!this.mcpProcess || !this.mcpProcess.stdin) {
                reject(new Error('MCP process not available'));
                return;
            }
            const id = ++this.requestId;
            const request = {
                jsonrpc: '2.0',
                id,
                method,
                params
            };
            // Set up timeout
            const timeout = setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error(`Request ${id} (${method}) timed out after 30 seconds`));
                }
            }, 30000);
            this.pendingRequests.set(id, { resolve, reject, timeout });
            // Send the request
            const requestStr = JSON.stringify(request) + '\n';
            console.log(`[REAL_MCP] Sending request ${id}:`, { method, paramsKeys: Object.keys(params) });
            try {
                this.mcpProcess.stdin.write(requestStr);
            }
            catch (error) {
                clearTimeout(timeout);
                this.pendingRequests.delete(id);
                reject(new Error(`Failed to send request: ${error.message}`));
            }
        });
    }
    /**
     * Send a notification to the MCP server (no response expected)
     */
    async sendNotification(method, params) {
        if (!this.mcpProcess || !this.mcpProcess.stdin) {
            throw new Error('MCP process not available');
        }
        const notification = {
            jsonrpc: '2.0',
            method,
            params
        };
        const notificationStr = JSON.stringify(notification) + '\n';
        console.log(`[REAL_MCP] Sending notification:`, { method });
        this.mcpProcess.stdin.write(notificationStr);
    }
    /**
     * Handle responses from the MCP server
     */
    handleResponse(data) {
        const lines = data.trim().split('\n').filter(line => line.trim());
        for (const line of lines) {
            try {
                const response = JSON.parse(line);
                // Handle responses with IDs (requests)
                if (response.id !== undefined && this.pendingRequests.has(response.id)) {
                    const { resolve, reject, timeout } = this.pendingRequests.get(response.id);
                    clearTimeout(timeout);
                    this.pendingRequests.delete(response.id);
                    if (response.error) {
                        console.error(`[REAL_MCP] Request ${response.id} failed:`, response.error);
                        reject(new Error(response.error.message || `MCP Error: ${JSON.stringify(response.error)}`));
                    }
                    else {
                        console.log(`[REAL_MCP] Request ${response.id} succeeded`);
                        resolve(response.result);
                    }
                }
                // Handle notifications (no ID)
                else if (!response.id && response.method) {
                    console.log(`[REAL_MCP] Received notification:`, { method: response.method });
                    this.emit('notification', response.method, response.params);
                }
                // Handle other messages
                else {
                    console.log(`[REAL_MCP] Received message:`, {
                        hasId: !!response.id,
                        method: response.method,
                        hasResult: !!response.result,
                        hasError: !!response.error
                    });
                }
            }
            catch (error) {
                console.error('[REAL_MCP] Failed to parse response:', error.message);
                console.error('[REAL_MCP] Raw data:', line);
            }
        }
    }
    /**
     * Clean up resources
     */
    cleanup() {
        this.isConnected = false;
        this.isInitialized = false;
        this.availableTools = [];
        this.serverCapabilities = {};
        // Reject all pending requests
        for (const [id, { reject, timeout }] of this.pendingRequests) {
            clearTimeout(timeout);
            reject(new Error('MCP connection closed'));
        }
        this.pendingRequests.clear();
    }
    /**
     * Disconnect from the MCP server
     */
    async disconnect() {
        console.log('[REAL_MCP] Disconnecting from MCP server...');
        if (this.mcpProcess) {
            // Send a graceful shutdown if possible
            try {
                if (this.isInitialized) {
                    await this.sendNotification('notifications/cancelled', {});
                }
            }
            catch (error) {
                console.warn('[REAL_MCP] Failed to send shutdown notification:', error.message);
            }
            // Kill the process
            this.mcpProcess.kill('SIGTERM');
            // Force kill after 5 seconds if still running
            setTimeout(() => {
                if (this.mcpProcess && !this.mcpProcess.killed) {
                    console.log('[REAL_MCP] Force killing MCP process');
                    this.mcpProcess.kill('SIGKILL');
                }
            }, 5000);
            this.mcpProcess = null;
        }
        this.cleanup();
        console.log('[REAL_MCP] Disconnected from MCP server');
    }
    /**
     * Check if client is connected and ready
     */
    get connected() {
        return this.isConnected && this.isInitialized;
    }
    /**
     * Get list of available tools
     */
    get tools() {
        return [...this.availableTools];
    }
}
exports.RealMCPClient = RealMCPClient;
// Singleton instance with browser session management
let mcpClient = null;
let browserSessionActive = false;
let browserSessionLock = null;
/**
 * Get the singleton MCP client instance
 */
function getMCPClient() {
    if (!mcpClient) {
        mcpClient = new RealMCPClient();
    }
    return mcpClient;
}
/**
 * Check if a browser session is currently active
 */
function isBrowserSessionActive() {
    return browserSessionActive;
}
/**
 * Wait for any existing browser session to complete
 */
async function waitForBrowserSession() {
    if (browserSessionLock) {
        console.log('[REAL_MCP] Waiting for existing browser session to complete...');
        await browserSessionLock;
    }
}
/**
 * Start a new browser session (ensures only one active session)
 */
async function startBrowserSession() {
    // Wait for any existing session to complete
    await waitForBrowserSession();
    // Create a new session lock
    let sessionResolve;
    browserSessionLock = new Promise((resolve) => {
        sessionResolve = resolve;
    });
    browserSessionActive = true;
    console.log('[REAL_MCP] Browser session started');
    // Return the resolve function so the caller can end the session
    return sessionResolve;
}
/**
 * End the current browser session
 */
function endBrowserSession() {
    if (browserSessionActive) {
        browserSessionActive = false;
        console.log('[REAL_MCP] Browser session ended');
        // Resolve the session lock if it exists
        if (browserSessionLock) {
            // The lock will be resolved by the session that created it
            browserSessionLock = null;
        }
    }
}
/**
 * Use a real MCP tool (replaces the simulated version)
 */
async function useRealMCPTool(serverName, toolName, args) {
    const client = getMCPClient();
    console.log(`[REAL_MCP] Tool request: ${serverName}:${toolName}`, {
        args: Object.keys(args),
        timestamp: new Date().toISOString(),
        clientConnected: client.connected
    });
    try {
        const result = await client.useTool(toolName, args);
        console.log(`[REAL_MCP] Tool ${toolName} succeeded`, {
            hasResult: !!result,
            resultType: typeof result
        });
        return result;
    }
    catch (error) {
        console.error(`[REAL_MCP] Tool ${toolName} failed:`, error.message);
        throw error;
    }
}
/**
 * Gracefully shutdown the MCP client
 */
async function shutdownMCPClient() {
    if (mcpClient) {
        await mcpClient.disconnect();
        mcpClient = null;
    }
}
