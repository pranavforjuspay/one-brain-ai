import { FastifyInstance } from 'fastify';
import { exec } from 'child_process';
import { promisify } from 'util';
import { WebScrapingService } from './scraping/core/WebScrapingService.js';
import { SearchIntent as ScrapingSearchIntent, DesignResult } from './scraping/types/scraping.types.js';

const execAsync = promisify(exec);

const MODEL = process.env.ONE_BRAIN_MODEL || 'claude-sonnet-4';
const LOCATION = process.env.VERTEX_LOCATION || 'us-east5';
const PROJECT = process.env.VERTEX_PROJECT || 'dev-ai-epsilon';

// Types for inspiration search (keeping backward compatibility)
export type SearchIntent = {
    patterns: string[];      // ["KYC verification", "card limits setup"]
    screens: string[];       // ["Onboarding welcome", "Identity verification"]
    comparables: string[];   // ["Revolut Business", "Wise", "Brex"]
    keywords: string[];      // ["SME onboarding", "business KYC"]
};

export type MobbinResult = {
    title: string;
    url: string;
    appName: string;
    category: string;
    tags: string[];
    whyRelevant: string;
    relevanceScore: number;
};

// Global web scraping service instance
let webScrapingService: WebScrapingService | null = null;

// Get Google Cloud access token
async function getAccessToken(): Promise<string> {
    try {
        const { stdout } = await execAsync('gcloud auth print-access-token');
        return stdout.trim();
    } catch (error) {
        throw new Error(`Failed to get access token: ${error.message}`);
    }
}

// Call Anthropic API via Vertex AI
async function callAnthropicAPI(systemPrompt: string, userMessage: string, app: FastifyInstance): Promise<any> {
    const endpoint = `${LOCATION}-aiplatform.googleapis.com`;
    const url = `https://${endpoint}/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/anthropic/models/${MODEL}:rawPredict`;

    const accessToken = await getAccessToken();

    const requestBody = {
        anthropic_version: "vertex-2023-10-16",
        stream: false,
        max_tokens: 1000,
        temperature: 0.3,
        top_p: 1.0,
        system: systemPrompt,
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: userMessage
                    }
                ]
            }
        ]
    };

    app.log.info({
        url,
        model: MODEL,
        requestBodySize: JSON.stringify(requestBody).length
    }, 'Calling Anthropic API for inspiration search');

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        app.log.error({
            status: response.status,
            statusText: response.statusText,
            errorBody: errorText
        }, 'Anthropic API call failed');
        throw new Error(`Anthropic API call failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
}

// Extract search intents from problem statement
async function extractSearchIntents(problemStatement: string, app: FastifyInstance): Promise<SearchIntent> {
    const extractionStartTime = Date.now();
    console.log(`[${new Date().toISOString()}] [INSPIRATION] SEARCH_INTENT_EXTRACTION_START:`, {
        problemStatement: problemStatement.substring(0, 200) + (problemStatement.length > 200 ? '...' : ''),
        problemLength: problemStatement.length,
        timestamp: new Date().toISOString()
    });

    const systemPrompt = `You extract search intents for UI pattern discovery from design problem statements.
Focus on mobile/web UI patterns that would be found on Mobbin (a design inspiration platform).

Return only valid JSON with these exact keys:
- patterns: specific UI patterns needed (e.g., "KYC verification", "card onboarding")
- screens: screen types or flows (e.g., "Welcome screen", "Identity verification")
- comparables: similar apps/products to reference (e.g., "Revolut", "Wise")
- keywords: search terms for Mobbin (e.g., "onboarding", "KYC", "fintech")

Keep focused and specific. Maximum 5 items per array.`;

    const userMessage = `Extract search intents for this design problem:

"${problemStatement}"

Return JSON only.`;

    console.log(`[${new Date().toISOString()}] [INSPIRATION] CALLING_CLAUDE_FOR_SEARCH_INTENTS:`, {
        systemPromptLength: systemPrompt.length,
        userMessageLength: userMessage.length,
        model: MODEL
    });

    try {
        const result = await callAnthropicAPI(systemPrompt, userMessage, app);
        const extractionDuration = Date.now() - extractionStartTime;

        console.log(`[${new Date().toISOString()}] [INSPIRATION] CLAUDE_RESPONSE_RECEIVED:`, {
            hasContent: !!result.content,
            contentLength: result.content?.length || 0,
            duration: `${extractionDuration}ms`
        });

        if (result.content && result.content.length > 0 && result.content[0].type === 'text') {
            const responseText = result.content[0].text.trim();
            console.log(`[${new Date().toISOString()}] [INSPIRATION] PARSING_CLAUDE_RESPONSE:`, {
                responseLength: responseText.length,
                responsePreview: responseText.substring(0, 100) + '...'
            });

            // Try to extract JSON from the response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                console.log(`[${new Date().toISOString()}] [INSPIRATION] JSON_PARSED_SUCCESSFULLY:`, {
                    hasPatterns: Array.isArray(parsed.patterns),
                    hasScreens: Array.isArray(parsed.screens),
                    hasComparables: Array.isArray(parsed.comparables),
                    hasKeywords: Array.isArray(parsed.keywords)
                });

                // Validate and sanitize the response
                const searchIntents = {
                    patterns: Array.isArray(parsed.patterns) ? parsed.patterns.slice(0, 5) : [],
                    screens: Array.isArray(parsed.screens) ? parsed.screens.slice(0, 5) : [],
                    comparables: Array.isArray(parsed.comparables) ? parsed.comparables.slice(0, 5) : [],
                    keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 5) : []
                };

                const totalExtractionDuration = Date.now() - extractionStartTime;
                console.log(`[${new Date().toISOString()}] [INSPIRATION] SEARCH_INTENT_EXTRACTION_COMPLETE:`, {
                    searchIntents,
                    totalItems: Object.values(searchIntents).flat().length,
                    duration: `${totalExtractionDuration}ms`
                });

                return searchIntents;
            }
        }

        throw new Error('Invalid response format from Claude');
    } catch (error) {
        const totalExtractionDuration = Date.now() - extractionStartTime;
        console.log(`[${new Date().toISOString()}] [INSPIRATION] SEARCH_INTENT_EXTRACTION_FAILED:`, {
            error: error.message,
            duration: `${totalExtractionDuration}ms`,
            fallbackToKeywords: true
        });

        app.log.error({ error: error.message }, 'Failed to extract search intents');

        // Fallback: basic keyword extraction
        const words = problemStatement.toLowerCase().split(/\s+/);
        const keywords = words.filter(word => word.length > 3).slice(0, 3);

        const fallbackIntents = {
            patterns: [],
            screens: [],
            comparables: [],
            keywords
        };

        console.log(`[${new Date().toISOString()}] [INSPIRATION] FALLBACK_KEYWORDS_EXTRACTED:`, {
            fallbackIntents,
            keywordCount: keywords.length
        });

        return fallbackIntents;
    }
}

// Search Mobbin using intelligent web scraping
async function searchMobbin(searchIntents: SearchIntent, app: FastifyInstance, debugMode: boolean = false): Promise<MobbinResult[]> {
    const searchStartTime = Date.now();
    console.log(`[${new Date().toISOString()}] [INSPIRATION] MOBBIN_SEARCH_START:`, {
        searchIntents,
        totalSearchTerms: Object.values(searchIntents).flat().length,
        timestamp: new Date().toISOString()
    });

    try {
        app.log.info({ searchIntents }, 'Starting intelligent Mobbin search with Playwright MCP');

        // Initialize web scraping service if not already done
        if (!webScrapingService) {
            console.log(`[${new Date().toISOString()}] [INSPIRATION] INITIALIZING_WEB_SCRAPING_SERVICE`);
            webScrapingService = new WebScrapingService(app);
        }

        // Convert SearchIntent to ScrapingSearchIntent format
        const scrapingSearchIntents: ScrapingSearchIntent = {
            patterns: searchIntents.patterns,
            screens: searchIntents.screens,
            comparables: searchIntents.comparables,
            keywords: searchIntents.keywords
        };

        console.log(`[${new Date().toISOString()}] [INSPIRATION] CALLING_WEB_SCRAPING_SERVICE:`, {
            scrapingSearchIntents,
            serviceInitialized: !!webScrapingService
        });

        // Use the intelligent web scraping service with debug mode
        const designResults = await webScrapingService.searchDesigns(scrapingSearchIntents, debugMode);

        // Convert DesignResult[] to MobbinResult[] format for backward compatibility
        const mobbinResults: MobbinResult[] = designResults.map(result => ({
            title: result.title,
            url: result.url,
            appName: result.appName,
            category: result.category,
            tags: result.tags,
            whyRelevant: result.whyRelevant,
            relevanceScore: result.relevanceScore
        }));

        const searchDuration = Date.now() - searchStartTime;
        console.log(`[${new Date().toISOString()}] [INSPIRATION] MOBBIN_SEARCH_COMPLETE:`, {
            resultsFound: mobbinResults.length,
            results: mobbinResults.map(r => ({ title: r.title, relevanceScore: r.relevanceScore })),
            duration: `${searchDuration}ms`,
            usingIntelligentScraping: true
        });

        app.log.info({
            resultCount: mobbinResults.length,
            searchMethod: 'intelligent_scraping'
        }, 'Intelligent Mobbin search completed');

        return mobbinResults;

    } catch (error) {
        const searchDuration = Date.now() - searchStartTime;
        console.log(`[${new Date().toISOString()}] [INSPIRATION] MOBBIN_SEARCH_FAILED:`, {
            error: error.message,
            duration: `${searchDuration}ms`,
            fallbackToMock: true
        });

        app.log.error({ error: error.message }, 'Intelligent Mobbin search failed, falling back to mock data');

        // Fallback to mock data if intelligent scraping fails
        const mockResults: MobbinResult[] = [
            {
                title: "Fallback Design Pattern",
                url: "https://mobbin.com/apps/fallback-example",
                appName: "Example App",
                category: "General",
                tags: searchIntents.keywords,
                whyRelevant: "Fallback result due to scraping service error",
                relevanceScore: 0.5
            }
        ];

        return mockResults;
    }
}

// Generate conversational response
async function generateConversationalResponse(
    problemStatement: string,
    searchIntents: SearchIntent,
    mobbinResults: MobbinResult[],
    app: FastifyInstance
): Promise<string> {
    const responseStartTime = Date.now();
    console.log(`[${new Date().toISOString()}] [INSPIRATION] CONVERSATIONAL_RESPONSE_START:`, {
        problemLength: problemStatement.length,
        searchIntentsCount: Object.values(searchIntents).flat().length,
        mobbinResultsCount: mobbinResults.length,
        timestamp: new Date().toISOString()
    });

    const systemPrompt = `You help designers by explaining Mobbin search results in a conversational, helpful way.
Write a friendly response that explains what you found and why it's relevant.

Format:
"Here's what I found on Mobbin for your [problem area]...

[Brief explanation of why these are relevant]

Here are the most relevant examples:"

Keep it concise, designer-focused, and encouraging.`;

    const userMessage = `Generate a conversational response for these Mobbin search results.

Original problem: "${problemStatement}"

Search intents: ${JSON.stringify(searchIntents, null, 2)}

Mobbin results: ${JSON.stringify(mobbinResults, null, 2)}

Write a helpful response explaining what you found.`;

    console.log(`[${new Date().toISOString()}] [INSPIRATION] CALLING_CLAUDE_FOR_RESPONSE:`, {
        systemPromptLength: systemPrompt.length,
        userMessageLength: userMessage.length,
        model: MODEL
    });

    try {
        const result = await callAnthropicAPI(systemPrompt, userMessage, app);
        const responseDuration = Date.now() - responseStartTime;

        console.log(`[${new Date().toISOString()}] [INSPIRATION] CLAUDE_RESPONSE_GENERATION_RECEIVED:`, {
            hasContent: !!result.content,
            contentLength: result.content?.length || 0,
            duration: `${responseDuration}ms`
        });

        if (result.content && result.content.length > 0 && result.content[0].type === 'text') {
            const responseText = result.content[0].text.trim();
            console.log(`[${new Date().toISOString()}] [INSPIRATION] CONVERSATIONAL_RESPONSE_COMPLETE:`, {
                responseLength: responseText.length,
                responsePreview: responseText.substring(0, 150) + '...',
                duration: `${responseDuration}ms`
            });

            return responseText;
        }

        throw new Error('Invalid response from Claude');
    } catch (error) {
        const responseDuration = Date.now() - responseStartTime;
        console.log(`[${new Date().toISOString()}] [INSPIRATION] CONVERSATIONAL_RESPONSE_FAILED:`, {
            error: error.message,
            duration: `${responseDuration}ms`,
            fallbackToTemplate: true
        });

        app.log.error({ error: error.message }, 'Failed to generate conversational response');

        // Fallback response
        const patternText = searchIntents.patterns.length > 0
            ? searchIntents.patterns.join(', ')
            : 'your design challenge';

        const fallbackResponse = `Here's what I found on Mobbin for ${patternText}...

I discovered ${mobbinResults.length} relevant examples that show similar patterns and flows. These should give you some great inspiration for your design approach.

Here are the most relevant examples:`;

        console.log(`[${new Date().toISOString()}] [INSPIRATION] FALLBACK_RESPONSE_GENERATED:`, {
            fallbackResponseLength: fallbackResponse.length,
            patternText
        });

        return fallbackResponse;
    }
}

export async function registerInspirationRoutes(app: FastifyInstance) {
    app.post('/inspiration/mobbin-search', async (req, reply) => {
        const requestStartTime = Date.now();
        const requestId = Math.random().toString(36).substring(7);

        console.log(`[${new Date().toISOString()}] [INSPIRATION] REQUEST_START:`, {
            requestId,
            method: 'POST',
            endpoint: '/inspiration/mobbin-search',
            timestamp: new Date().toISOString()
        });

        const body = req.body as any;
        const problemStatement = body?.problemStatement;
        const debugMode = body?.debugMode === true; // Add debug mode support

        if (!problemStatement || typeof problemStatement !== 'string') {
            console.log(`[${new Date().toISOString()}] [INSPIRATION] REQUEST_VALIDATION_FAILED:`, {
                requestId,
                error: 'Missing or invalid problemStatement',
                hasBody: !!body,
                hasProblemStatement: !!problemStatement,
                problemStatementType: typeof problemStatement
            });
            return reply.code(400).send({ error: 'Missing or invalid problemStatement' });
        }

        console.log(`[${new Date().toISOString()}] [INSPIRATION] REQUEST_VALIDATED:`, {
            requestId,
            problemStatement: problemStatement.substring(0, 200) + (problemStatement.length > 200 ? '...' : ''),
            problemLength: problemStatement.length
        });

        app.log.info({
            problemStatement: problemStatement.substring(0, 100) + '...',
            problemLength: problemStatement.length
        }, 'Processing Mobbin inspiration search request');

        try {
            // Step 1: Extract search intents
            console.log(`[${new Date().toISOString()}] [INSPIRATION] STEP_1_START:`, {
                requestId,
                step: 'Extract search intents',
                stepNumber: 1,
                totalSteps: 3
            });
            app.log.info('Extracting search intents...');
            const searchIntents = await extractSearchIntents(problemStatement, app);
            console.log(`[${new Date().toISOString()}] [INSPIRATION] STEP_1_COMPLETE:`, {
                requestId,
                searchIntents,
                duration: `${Date.now() - requestStartTime}ms`
            });

            // Step 2: Search Mobbin
            console.log(`[${new Date().toISOString()}] [INSPIRATION] STEP_2_START:`, {
                requestId,
                step: 'Search Mobbin',
                stepNumber: 2,
                totalSteps: 3,
                debugMode
            });
            app.log.info('Searching Mobbin...');
            const mobbinResults = await searchMobbin(searchIntents, app, debugMode);
            console.log(`[${new Date().toISOString()}] [INSPIRATION] STEP_2_COMPLETE:`, {
                requestId,
                resultsCount: mobbinResults.length,
                duration: `${Date.now() - requestStartTime}ms`
            });

            // Step 3: Generate conversational response
            console.log(`[${new Date().toISOString()}] [INSPIRATION] STEP_3_START:`, {
                requestId,
                step: 'Generate conversational response',
                stepNumber: 3,
                totalSteps: 3
            });
            app.log.info('Generating conversational response...');
            const conversationalResponse = await generateConversationalResponse(
                problemStatement,
                searchIntents,
                mobbinResults,
                app
            );
            console.log(`[${new Date().toISOString()}] [INSPIRATION] STEP_3_COMPLETE:`, {
                requestId,
                responseLength: conversationalResponse.length,
                duration: `${Date.now() - requestStartTime}ms`
            });

            const totalDuration = Date.now() - requestStartTime;
            console.log(`[${new Date().toISOString()}] [INSPIRATION] REQUEST_SUCCESS:`, {
                requestId,
                searchIntentsCount: Object.values(searchIntents).flat().length,
                mobbinResultsCount: mobbinResults.length,
                responseLength: conversationalResponse.length,
                totalDuration: `${totalDuration}ms`,
                success: true
            });

            app.log.info({
                searchIntentsCount: Object.values(searchIntents).flat().length,
                mobbinResultsCount: mobbinResults.length,
                responseLength: conversationalResponse.length
            }, 'Mobbin inspiration search completed successfully');

            return reply.send({
                conversationalResponse,
                mobbinLinks: mobbinResults,
                searchIntents
            });

        } catch (err) {
            const totalDuration = Date.now() - requestStartTime;
            console.log(`[${new Date().toISOString()}] [INSPIRATION] REQUEST_FAILED:`, {
                requestId,
                error: err.message,
                errorStack: err.stack,
                totalDuration: `${totalDuration}ms`,
                success: false
            });

            app.log.error({
                err: err,
                message: err.message,
                problemStatement: problemStatement.substring(0, 100)
            }, 'Mobbin inspiration search failed');

            return reply.code(500).send({
                error: 'Failed to search for inspiration',
                conversationalResponse: "I'm sorry, I encountered an issue while searching Mobbin for inspiration. Please try again with a different problem statement.",
                mobbinLinks: [],
                searchIntents: { patterns: [], screens: [], comparables: [], keywords: [] }
            });
        }
    });
}
