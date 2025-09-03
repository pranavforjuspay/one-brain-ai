#!/usr/bin/env node

/**
 * Standalone MCP client for backend integration
 * This script connects directly to MCP servers and executes tools
 */

import { spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(spawn);

async function callMCPTool(serverName, toolName, args) {
    console.log(`[MCP-CLIENT] Calling ${toolName} on ${serverName}`);

    try {
        // For Playwright MCP server, we'll use npx to run it directly
        if (serverName === 'github.com/executeautomation/mcp-playwright') {
            return await callPlaywrightTool(toolName, args);
        }

        throw new Error(`Unsupported MCP server: ${serverName}`);

    } catch (error) {
        console.error(`[MCP-CLIENT] Error:`, error.message);
        throw error;
    }
}

async function callPlaywrightTool(toolName, args) {
    return new Promise((resolve, reject) => {
        // Use npx to run the Playwright MCP server
        const process = spawn('npx', ['-y', '@executeautomation/playwright-mcp-server'], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve(stdout.trim() || `${toolName} completed successfully`);
            } else {
                reject(new Error(`Playwright tool failed: ${stderr}`));
            }
        });

        process.on('error', (error) => {
            reject(new Error(`Failed to start Playwright MCP: ${error.message}`));
        });

        // Send the tool request
        const request = {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
                name: toolName,
                arguments: args
            }
        };

        process.stdin.write(JSON.stringify(request) + '\n');
        process.stdin.end();

        // Timeout after 30 seconds
        setTimeout(() => {
            process.kill();
            reject(new Error(`Tool ${toolName} timed out`));
        }, 30000);
    });
}

// CLI interface
if (process.argv.length < 5) {
    console.error('Usage: node mcp-client.js <serverName> <toolName> <argsJSON>');
    process.exit(1);
}

const [, , serverName, toolName, argsJSON] = process.argv;

try {
    const args = JSON.parse(argsJSON);
    const result = await callMCPTool(serverName, toolName, args);
    console.log(JSON.stringify({ success: true, result }));
} catch (error) {
    console.error(JSON.stringify({ success: false, error: error.message }));
    process.exit(1);
}
