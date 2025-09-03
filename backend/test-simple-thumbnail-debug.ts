import { PlaywrightMCPClient } from './src/scraping/core/PlaywrightMCPClient.js';
import { MobbinAuthService } from './src/scraping/auth/MobbinAuthService.js';
import fastify from 'fastify';

/**
 * SIMPLE THUMBNAIL DEBUG TEST
 * Focus: Get basic thumbnail clicking working
 * Goal: Click just 1 thumbnail and capture URL
 */

async function testSimpleThumbnailClicking() {
    const app = fastify({ logger: false });
    const mcpClient = new PlaywrightMCPClient(app);
    const authService = new MobbinAuthService(mcpClient);

