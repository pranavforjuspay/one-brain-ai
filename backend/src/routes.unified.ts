import { FastifyInstance } from 'fastify';
import { UnifiedScrapingService } from './scraping/core/UnifiedScrapingService.js';
import { LLMKeywordService } from './scraping/ai/LLMKeywordService.js';

/**
 * Unified Mobbin search route - Same workflow for all keywords
 * 
 * This route simplifies the scraping process by:
 * 1. Extracting keywords from problem statement
 * 2. Deciding route (for metadata only)
 * 3. Executing the same unified workflow regardless of route decision
 */
export async function unifiedRoutes(fastify: FastifyInstance) {

    /**
     * NEW: Execute unified Mobbin search with LLM-based keyword extraction
     */
    fastify.post('/unified/search-llm', async (request, reply) => {
        const requestId = Math.random().toString(36).substring(7);

        console.log(`[${new Date().toISOString()}] [UNIFIED_ROUTE] LLM_REQUEST_START:`, {
            requestId,
            method: 'POST',
            endpoint: '/unified/search-llm',
            timestamp: new Date().toISOString()
        });

        try {
            const { userQuery, thumbnailsPerKeyword = 5 } = request.body as {
                userQuery: string;
                thumbnailsPerKeyword?: number;
            };

            if (!userQuery) {
                return reply.status(400).send({
                    error: 'User query is required',
                    requestId,
                    timestamp: new Date().toISOString()
                });
            }

            console.log(`[${new Date().toISOString()}] [UNIFIED_ROUTE] LLM_REQUEST_VALIDATED:`, {
                requestId,
                userQuery,
                queryLength: userQuery.length,
                thumbnailsPerKeyword
            });

            // Execute LLM-based scraping workflow
            console.log(`[${new Date().toISOString()}] [UNIFIED_ROUTE] LLM_SCRAPING_START:`, {
                requestId,
                userQuery,
                thumbnailsPerKeyword
            });

            const scrapingService = new UnifiedScrapingService(fastify);
            const scrapingResults = await scrapingService.scrapeFromUserQueryWithExplanation(
                userQuery,
                thumbnailsPerKeyword
            );

            console.log(`[${new Date().toISOString()}] [UNIFIED_ROUTE] LLM_SCRAPING_COMPLETE:`, {
                requestId,
                totalResults: scrapingResults.totalResults,
                executionTime: scrapingResults.executionTime,
                keywordsProcessed: scrapingResults.keywords.length,
                keywordGenerationMethod: scrapingResults.metadata.keywordGenerationMethod
            });

            // Format enhanced response with LLM metadata
            const response = {
                requestId,
                userQuery,

                // LLM Analysis results
                analysis: {
                    extractedKeywords: scrapingResults.keywords,
                    keywordGenerationMethod: scrapingResults.metadata.keywordGenerationMethod,
                    llmConfidenceScores: scrapingResults.metadata.llmConfidenceScores,
                    routeDecision: scrapingResults.routeDecision,
                    routeDecisionReason: getRouteDecisionReason(scrapingResults.routeDecision, scrapingResults.keywords)
                },

                // Scraping results
                results: {
                    summary: `Found ${scrapingResults.totalResults} design references across ${scrapingResults.keywords.length} LLM-generated keywords`,
                    totalResults: scrapingResults.totalResults,
                    executionTime: scrapingResults.executionTime,

                    // Group results by keyword for better organization
                    byKeyword: groupResultsByKeyword(scrapingResults.results),

                    // All results in flat array with confidence ranking
                    allResults: scrapingResults.results.map((result, index) => ({
                        keyword: result.keyword,
                        url: result.url,
                        thumbnailIndex: result.thumbnailIndex,
                        extractedAt: result.extractedAt,
                        keywordConfidence: scrapingResults.metadata.llmConfidenceScores?.[scrapingResults.keywords.indexOf(result.keyword)] || 0
                    }))
                },

                // Execution metadata
                execution: {
                    workflow: scrapingResults.metadata.executedWorkflow,
                    authenticationUsed: scrapingResults.metadata.authenticationUsed,
                    thumbnailsPerKeyword: scrapingResults.metadata.thumbnailsPerKeyword,
                    keywordGenerationMethod: scrapingResults.metadata.keywordGenerationMethod,
                    llmEnhanced: true
                },

                // Response metadata
                metadata: {
                    timestamp: new Date().toISOString(),
                    version: '2.0.0',
                    searchType: 'llm_enhanced_unified_workflow'
                }
            };

            console.log(`[${new Date().toISOString()}] [UNIFIED_ROUTE] LLM_REQUEST_SUCCESS:`, {
                requestId,
                totalResults: response.results.totalResults,
                executionTime: response.results.executionTime,
                keywordsProcessed: response.analysis.extractedKeywords.length,
                keywordGenerationMethod: response.analysis.keywordGenerationMethod,
                routeDecision: response.analysis.routeDecision
            });

            return reply.send(response);

        } catch (error) {
            console.error(`[${new Date().toISOString()}] [UNIFIED_ROUTE] LLM_REQUEST_FAILED:`, {
                requestId,
                error: error.message,
                stack: error.stack
            });

            return reply.status(500).send({
                error: 'LLM-enhanced unified search failed',
                details: error.message,
                requestId,
                timestamp: new Date().toISOString(),
                troubleshooting: {
                    commonIssues: [
                        'LLM service unavailable - check Claude/Vertex AI connection',
                        'Authentication failure - check Mobbin credentials',
                        'Network connectivity issues',
                        'Mobbin UI changes - selectors may need updating'
                    ],
                    fallback: 'System will automatically fallback to static keyword extraction if LLM fails'
                }
            });
        }
    });

    /**
     * Test LLM keyword extraction without executing scraping
     */
    fastify.post('/unified/analyze-llm', async (request, reply) => {
        try {
            const { userQuery } = request.body as { userQuery: string };

            if (!userQuery) {
                return reply.status(400).send({
                    error: 'User query is required'
                });
            }

            console.log(`[${new Date().toISOString()}] [UNIFIED_ROUTE] LLM_ANALYZE_START:`, {
                userQuery,
                queryLength: userQuery.length
            });

            const scrapingService = new UnifiedScrapingService(fastify);
            const keywordExtraction = await scrapingService.extractKeywordsWithLLM(userQuery);
            const routeDecision = UnifiedScrapingService.decideRoute(keywordExtraction.keywords);

            return reply.send({
                userQuery,
                analysis: {
                    extractedKeywords: keywordExtraction.keywords,
                    keywordGenerationMethod: keywordExtraction.metadata.keywordGenerationMethod,
                    llmConfidenceScores: keywordExtraction.metadata.llmConfidenceScores,
                    processingTime: keywordExtraction.metadata.processingTime,
                    routeDecision,
                    routeDecisionReason: getRouteDecisionReason(routeDecision, keywordExtraction.keywords)
                },
                workflow: {
                    description: 'LLM-enhanced analysis shows what would be executed',
                    plannedSteps: [
                        `LLM extracted ${keywordExtraction.keywords.length} keywords: ${keywordExtraction.keywords.join(', ')}`,
                        `Confidence scores: ${keywordExtraction.metadata.llmConfidenceScores?.map(s => s.toFixed(2)).join(', ') || 'N/A'}`,
                        `Route decision: ${routeDecision} (metadata only)`,
                        'Execute unified workflow for all keywords',
                        'Results ranked by keyword confidence'
                    ]
                },
                note: 'Use /unified/search-llm to execute the actual LLM-enhanced scraping workflow',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            return reply.status(500).send({
                error: 'LLM analysis failed',
                details: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    /**
     * LEGACY: Execute unified Mobbin search with static keyword extraction
     */
    fastify.post('/unified/search', async (request, reply) => {
        const requestId = Math.random().toString(36).substring(7);

        console.log(`[${new Date().toISOString()}] [UNIFIED_ROUTE] REQUEST_START:`, {
            requestId,
            method: 'POST',
            endpoint: '/unified/search',
            timestamp: new Date().toISOString()
        });

        try {
            const { problemStatement, thumbnailsPerKeyword = 5 } = request.body as {
                problemStatement: string;
                thumbnailsPerKeyword?: number;
            };

            if (!problemStatement) {
                return reply.status(400).send({
                    error: 'Problem statement is required',
                    requestId,
                    timestamp: new Date().toISOString()
                });
            }

            console.log(`[${new Date().toISOString()}] [UNIFIED_ROUTE] REQUEST_VALIDATED:`, {
                requestId,
                problemStatement,
                problemLength: problemStatement.length,
                thumbnailsPerKeyword
            });

            // Step 1: Extract keywords from problem statement
            console.log(`[${new Date().toISOString()}] [UNIFIED_ROUTE] EXTRACTING_KEYWORDS:`, {
                requestId
            });

            const keywords = UnifiedScrapingService.extractKeywords(problemStatement);

            console.log(`[${new Date().toISOString()}] [UNIFIED_ROUTE] KEYWORDS_EXTRACTED:`, {
                requestId,
                keywords,
                keywordsCount: keywords.length
            });

            // Step 2: Decide route (for metadata/logging only)
            const routeDecision = UnifiedScrapingService.decideRoute(keywords);

            console.log(`[${new Date().toISOString()}] [UNIFIED_ROUTE] ROUTE_DECIDED:`, {
                requestId,
                routeDecision,
                note: 'Route decision is metadata only - same workflow will be executed'
            });

            // Step 3: Execute unified scraping workflow
            console.log(`[${new Date().toISOString()}] [UNIFIED_ROUTE] SCRAPING_START:`, {
                requestId,
                keywords,
                routeDecision,
                thumbnailsPerKeyword
            });

            const scrapingService = new UnifiedScrapingService(fastify);
            const scrapingResults = await scrapingService.scrapeAllKeywords(
                keywords,
                routeDecision,
                thumbnailsPerKeyword
            );

            console.log(`[${new Date().toISOString()}] [UNIFIED_ROUTE] SCRAPING_COMPLETE:`, {
                requestId,
                totalResults: scrapingResults.totalResults,
                executionTime: scrapingResults.executionTime,
                keywordsProcessed: scrapingResults.keywords.length
            });

            // Step 4: Format response
            const response = {
                requestId,
                problemStatement,

                // Analysis results
                analysis: {
                    extractedKeywords: keywords,
                    routeDecision,
                    routeDecisionReason: getRouteDecisionReason(routeDecision, keywords)
                },

                // Scraping results
                results: {
                    summary: `Found ${scrapingResults.totalResults} design references across ${keywords.length} keywords`,
                    totalResults: scrapingResults.totalResults,
                    executionTime: scrapingResults.executionTime,

                    // Group results by keyword for better organization
                    byKeyword: groupResultsByKeyword(scrapingResults.results),

                    // All results in flat array
                    allResults: scrapingResults.results.map(result => ({
                        keyword: result.keyword,
                        url: result.url,
                        thumbnailIndex: result.thumbnailIndex,
                        extractedAt: result.extractedAt
                    }))
                },

                // Execution metadata
                execution: {
                    workflow: scrapingResults.metadata.executedWorkflow,
                    authenticationUsed: scrapingResults.metadata.authenticationUsed,
                    thumbnailsPerKeyword: scrapingResults.metadata.thumbnailsPerKeyword,
                    routeDecisionNote: 'Route decision is informational only - unified workflow executed for all keywords'
                },

                // Response metadata
                metadata: {
                    timestamp: new Date().toISOString(),
                    version: '1.0.0',
                    searchType: 'unified_workflow'
                }
            };

            console.log(`[${new Date().toISOString()}] [UNIFIED_ROUTE] REQUEST_SUCCESS:`, {
                requestId,
                totalResults: response.results.totalResults,
                executionTime: response.results.executionTime,
                keywordsProcessed: response.analysis.extractedKeywords.length,
                routeDecision: response.analysis.routeDecision
            });

            return reply.send(response);

        } catch (error) {
            console.error(`[${new Date().toISOString()}] [UNIFIED_ROUTE] REQUEST_FAILED:`, {
                requestId,
                error: error.message,
                stack: error.stack
            });

            return reply.status(500).send({
                error: 'Unified search failed',
                details: error.message,
                requestId,
                timestamp: new Date().toISOString(),
                troubleshooting: {
                    commonIssues: [
                        'Authentication failure - check Mobbin credentials',
                        'Network connectivity issues',
                        'Mobbin UI changes - selectors may need updating',
                        'Browser automation timeout'
                    ],
                    suggestion: 'Check logs for detailed error information'
                }
            });
        }
    });

    /**
     * Get unified search status and health
     */
    fastify.get('/unified/health', async (request, reply) => {
        return reply.send({
            status: 'healthy',
            components: {
                unifiedScrapingService: 'operational',
                mobbinAuthService: 'operational',
                playwrightMCPClient: 'operational',
                keywordExtraction: 'operational',
                routeDecision: 'operational'
            },
            workflow: {
                description: 'Unified workflow for all Mobbin scraping',
                steps: [
                    '1. Extract keywords from problem statement',
                    '2. Decide route (metadata only)',
                    '3. Authenticate with Mobbin',
                    '4. For each keyword: search → open thumbnails → capture URLs',
                    '5. Return organized results'
                ]
            },
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        });
    });

    /**
     * Test keyword extraction without executing scraping
     */
    fastify.post('/unified/analyze', async (request, reply) => {
        try {
            const { problemStatement } = request.body as { problemStatement: string };

            if (!problemStatement) {
                return reply.status(400).send({
                    error: 'Problem statement is required'
                });
            }

            const keywords = UnifiedScrapingService.extractKeywords(problemStatement);
            const routeDecision = UnifiedScrapingService.decideRoute(keywords);

            return reply.send({
                problemStatement,
                analysis: {
                    extractedKeywords: keywords,
                    routeDecision,
                    routeDecisionReason: getRouteDecisionReason(routeDecision, keywords)
                },
                workflow: {
                    description: 'This analysis shows what would be executed',
                    plannedSteps: [
                        `Extract ${keywords.length} keywords: ${keywords.join(', ')}`,
                        `Route decision: ${routeDecision} (metadata only)`,
                        'Execute unified workflow for all keywords',
                        'Capture URLs from thumbnail modals',
                        'Return organized results'
                    ]
                },
                note: 'Use /unified/search to execute the actual scraping workflow',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            return reply.status(500).send({
                error: 'Analysis failed',
                details: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });
}

/**
 * Group results by keyword for better organization
 */
function groupResultsByKeyword(results: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    for (const result of results) {
        if (!grouped[result.keyword]) {
            grouped[result.keyword] = [];
        }
        grouped[result.keyword].push({
            url: result.url,
            thumbnailIndex: result.thumbnailIndex,
            extractedAt: result.extractedAt
        });
    }

    return grouped;
}

/**
 * Get human-readable reason for route decision
 */
function getRouteDecisionReason(routeDecision: string, keywords: string[]): string {
    const keywordText = keywords.join(' ').toLowerCase();

    switch (routeDecision) {
        case 'apps':
            if (keywordText.includes('app')) return 'Keywords suggest focus on complete app experiences';
            if (keywordText.includes('banking') || keywordText.includes('fintech')) return 'Financial keywords suggest app-level patterns';
            return 'Default to apps for comprehensive coverage';

        case 'flows':
            if (keywordText.includes('flow')) return 'Keywords explicitly mention user flows';
            if (keywordText.includes('onboarding')) return 'Onboarding suggests multi-step flow patterns';
            if (keywordText.includes('checkout')) return 'Checkout suggests transaction flow patterns';
            return 'Keywords suggest process-oriented patterns';

        case 'screens':
            if (keywordText.includes('screen')) return 'Keywords explicitly mention screen patterns';
            if (keywordText.includes('login')) return 'Login suggests specific screen-level patterns';
            if (keywordText.includes('dashboard')) return 'Dashboard suggests interface-level patterns';
            return 'Keywords suggest interface-specific patterns';

        default:
            return 'Route decision based on keyword analysis';
    }
}
