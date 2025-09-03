import dotenv from 'dotenv';
dotenv.config();

import { UnifiedScrapingService } from './src/scraping/core/UnifiedScrapingService.js';
import { PlaywrightMCPClient } from './src/scraping/core/PlaywrightMCPClient.js';
import { MobbinAuthService } from './src/scraping/auth/MobbinAuthService.js';
import { FastifyInstance } from 'fastify';
import fastify from 'fastify';

/**
 * Analyze the exact HTML structure of ScreenCell containers
 * to understand why we're still clicking brand logos
 */
async function analyzeHTMLStructure() {
    console.log(`[${new Date().toISOString()}] [HTML_ANALYSIS] ANALYSIS_START`);

    const app: FastifyInstance = fastify({ logger: false });
    const mcpClient = new PlaywrightMCPClient(app);
    const authService = new MobbinAuthService(mcpClient);

    try {
        // Step 1: Navigate and authenticate
        console.log(`[${new Date().toISOString()}] [HTML_ANALYSIS] NAVIGATING_TO_MOBBIN`);
        await mcpClient.navigate('https://mobbin.com', {
            browserType: 'chromium',
            width: 1280,
            height: 720,
            headless: false,
            timeout: 30000
        });

        const authSuccess = await authService.authenticate();
        if (!authSuccess) {
            throw new Error('Authentication failed');
        }

        // Step 2: Open search modal and search for "trading"
        console.log(`[${new Date().toISOString()}] [HTML_ANALYSIS] OPENING_SEARCH_MODAL`);
        await mcpClient.click('text=Search on iOS...');
        await mcpClient.waitFor('input[type="text"]', { timeout: 5000 });

        console.log(`[${new Date().toISOString()}] [HTML_ANALYSIS] SEARCHING_FOR_TRADING`);
        await mcpClient.fill('input[type="text"]', 'trading');
        await new Promise(resolve => setTimeout(resolve, 1000));
        await mcpClient.pressKey('Enter');
        await mcpClient.waitFor('body', { timeout: 8000 });

        // Step 3: Analyze the HTML structure of ScreenCell containers
        console.log(`[${new Date().toISOString()}] [HTML_ANALYSIS] ANALYZING_SCREENCELL_STRUCTURE`);

        const htmlAnalysis = await mcpClient.callMCPTool('playwright_evaluate', {
            script: `
                (function() {
                    // Find all ScreenCell containers
                    const screenCells = document.querySelectorAll('div[data-sentry-component="ScreenCell"]');
                    console.log('Found ScreenCells:', screenCells.length);

                    const analysis = [];

                    // Analyze first 3 ScreenCells in detail
                    for (let i = 0; i < Math.min(3, screenCells.length); i++) {
                        const cell = screenCells[i];
                        
                        // Find all <a> tags within this cell
                        const allLinks = cell.querySelectorAll('a');
                        
                        const cellAnalysis = {
                            cellIndex: i + 1,
                            totalLinks: allLinks.length,
                            links: []
                        };

                        allLinks.forEach((link, linkIndex) => {
                            const linkInfo = {
                                linkIndex: linkIndex + 1,
                                href: link.href || 'no-href',
                                dataSentryComponent: link.getAttribute('data-sentry-component') || 'no-component',
                                textContent: (link.textContent || '').trim().substring(0, 50),
                                hasImage: link.querySelector('img') ? true : false,
                                className: link.className || 'no-class',
                                innerHTML: link.innerHTML.substring(0, 200) + '...'
                            };
                            cellAnalysis.links.push(linkInfo);
                        });

                        analysis.push(cellAnalysis);
                    }

                    return {
                        totalScreenCells: screenCells.length,
                        detailedAnalysis: analysis,
                        timestamp: new Date().toISOString()
                    };
                })();
            `
        });

        console.log(`[${new Date().toISOString()}] [HTML_ANALYSIS] STRUCTURE_ANALYSIS_COMPLETE:`);
        console.log(JSON.stringify(htmlAnalysis, null, 2));

        // Step 4: Test different selector strategies
        console.log(`[${new Date().toISOString()}] [HTML_ANALYSIS] TESTING_SELECTOR_STRATEGIES`);

        const selectorTests = [
            {
                name: 'Current Selector',
                selector: 'div[data-sentry-component="ScreenCell"]:nth-child(1) a[data-sentry-component="ScreenCellScreen"]'
            },
            {
                name: 'Image-based Selector',
                selector: 'div[data-sentry-component="ScreenCell"]:nth-child(1) a img'
            },
            {
                name: 'First Link with Image',
                selector: 'div[data-sentry-component="ScreenCell"]:nth-child(1) a:has(img)'
            },
            {
                name: 'Direct Image Parent',
                selector: 'div[data-sentry-component="ScreenCell"]:nth-child(1) img'
            }
        ];

        for (const test of selectorTests) {
            try {
                const selectorResult = await mcpClient.callMCPTool('playwright_evaluate', {
                    script: `
                        (function() {
                            const elements = document.querySelectorAll('${test.selector}');
                            if (elements.length === 0) {
                                return { found: false, count: 0, selector: '${test.selector}' };
                            }

                            const element = elements[0];
                            const isLink = element.tagName === 'A';
                            const href = isLink ? element.href : (element.closest('a') ? element.closest('a').href : 'no-href');
                            
                            return {
                                found: true,
                                count: elements.length,
                                selector: '${test.selector}',
                                tagName: element.tagName,
                                href: href,
                                textContent: (element.textContent || '').trim().substring(0, 50),
                                hasImage: element.querySelector ? (element.querySelector('img') ? true : false) : (element.tagName === 'IMG'),
                                className: element.className || 'no-class'
                            };
                        })();
                    `
                });

                console.log(`[${new Date().toISOString()}] [HTML_ANALYSIS] SELECTOR_TEST_${test.name}:`, selectorResult);

            } catch (error) {
                console.log(`[${new Date().toISOString()}] [HTML_ANALYSIS] SELECTOR_TEST_${test.name}_FAILED:`, error.message);
            }
        }

        // Step 5: Recommend the best selector strategy
        console.log(`[${new Date().toISOString()}] [HTML_ANALYSIS] GENERATING_RECOMMENDATIONS`);

        const recommendations = await mcpClient.callMCPTool('playwright_evaluate', {
            script: `
                (function() {
                    // Find the most reliable way to click only thumbnails
                    const screenCells = document.querySelectorAll('div[data-sentry-component="ScreenCell"]');
                    const recommendations = [];

                    for (let i = 0; i < Math.min(2, screenCells.length); i++) {
                        const cell = screenCells[i];
                        
                        // Strategy 1: Find the link that contains an image
                        const linksWithImages = cell.querySelectorAll('a:has(img)');
                        
                        // Strategy 2: Find images and get their parent links
                        const images = cell.querySelectorAll('img');
                        const imageParentLinks = Array.from(images).map(img => img.closest('a')).filter(Boolean);
                        
                        // Strategy 3: Find links with ScreenCellScreen component
                        const screenCellScreenLinks = cell.querySelectorAll('a[data-sentry-component="ScreenCellScreen"]');
                        
                        recommendations.push({
                            cellIndex: i + 1,
                            strategies: {
                                linksWithImages: linksWithImages.length,
                                imageParentLinks: imageParentLinks.length,
                                screenCellScreenLinks: screenCellScreenLinks.length,
                                firstImageParentHref: imageParentLinks[0] ? imageParentLinks[0].href : 'none',
                                firstScreenCellScreenHref: screenCellScreenLinks[0] ? screenCellScreenLinks[0].href : 'none'
                            }
                        });
                    }

                    return {
                        recommendations,
                        bestStrategy: 'Use img element and click its parent <a> tag to avoid text-based brand links'
                    };
                })();
            `
        });

        console.log(`[${new Date().toISOString()}] [HTML_ANALYSIS] RECOMMENDATIONS:`);
        console.log(JSON.stringify(recommendations, null, 2));

        return {
            htmlAnalysis,
            recommendations,
            success: true
        };

    } catch (error) {
        console.error(`[${new Date().toISOString()}] [HTML_ANALYSIS] ANALYSIS_FAILED:`, error.message);
        throw error;

    } finally {
        try {
            await mcpClient.close();
            console.log(`[${new Date().toISOString()}] [HTML_ANALYSIS] BROWSER_CLOSED`);
        } catch (closeError) {
            console.warn(`[${new Date().toISOString()}] [HTML_ANALYSIS] BROWSER_CLOSE_WARNING:`, closeError.message);
        }
    }
}

// Run the analysis
analyzeHTMLStructure()
    .then((result) => {
        console.log(`[${new Date().toISOString()}] [HTML_ANALYSIS] ANALYSIS_COMPLETE:`, {
            success: result.success
        });
        process.exit(0);
    })
    .catch((error) => {
        console.error(`[${new Date().toISOString()}] [HTML_ANALYSIS] ANALYSIS_ERROR:`, error.message);
        process.exit(1);
    });
