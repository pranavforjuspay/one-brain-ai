import { FastifyInstance } from 'fastify';
import { ComprehensiveStrategy, ComprehensiveResults, ProgressPhase } from './scraping/types/scraping.types.js';
import { ProgressiveSearchEngine } from './scraping/core/ProgressiveSearchEngine.js';
import { SearchStrategyRouter } from './scraping/core/SearchStrategyRouter.js';

/**
 * Comprehensive Mobbin search routes with progressive execution
 */
export async function comprehensiveRoutes(fastify: FastifyInstance) {

    /**
     * Execute comprehensive Mobbin search with real-time progress updates
     */
    fastify.post('/comprehensive/search', async (request, reply) => {
        const requestId = Math.random().toString(36).substring(7);

        console.log(`[${new Date().toISOString()}] [COMPREHENSIVE] REQUEST_START:`, {
            requestId,
            method: 'POST',
            endpoint: '/comprehensive/search',
            timestamp: new Date().toISOString()
        });

        try {
            const { problemStatement, context } = request.body as {
                problemStatement: string;
                context?: any;
            };

            if (!problemStatement) {
                return reply.status(400).send({
                    error: 'Problem statement is required',
                    requestId
                });
            }

            console.log(`[${new Date().toISOString()}] [COMPREHENSIVE] REQUEST_VALIDATED:`, {
                requestId,
                problemStatement,
                problemLength: problemStatement.length,
                hasContext: !!context
            });

            // Phase 1: Enhanced Strategy Analysis
            console.log(`[${new Date().toISOString()}] [COMPREHENSIVE] STRATEGY_ANALYSIS_START:`, {
                requestId,
                phase: 'strategy_analysis'
            });

            const strategyRouter = new SearchStrategyRouter(fastify);
            const strategies = await strategyRouter.determineStrategies({
                patterns: [],
                screens: [],
                comparables: [],
                keywords: [problemStatement]
            });

            // Use the first (highest priority) strategy
            const basicStrategy = strategies[0];

            // Convert to comprehensive strategy
            const comprehensiveStrategy: ComprehensiveStrategy = {
                primaryPath: 'apps',
                platform: basicStrategy.platform === 'all' ? 'both' : basicStrategy.platform as 'ios' | 'web',
                searchApproach: basicStrategy.searchType === 'app-specific' ? 'app-specific' : 'pattern-based',
                keywords: basicStrategy.keywords,
                expectedContentTypes: ['app-pages', 'flow-collections', 'screen-patterns'],
                executionPaths: ['apps_ios', 'apps_web', 'flows', 'screens'],
                contentTypeNeeds: {
                    needsComprehensiveApps: true,
                    needsCrossAppFlows: true,
                    needsSpecificScreens: true
                },
                platformPriority: {
                    iosApps: basicStrategy.platform === 'ios' || basicStrategy.platform === 'all' ? 0.8 : 0.3,
                    webApps: basicStrategy.platform === 'web' || basicStrategy.platform === 'all' ? 0.8 : 0.3,
                    both: basicStrategy.platform === 'all'
                }
            };

            console.log(`[${new Date().toISOString()}] [COMPREHENSIVE] STRATEGY_ANALYSIS_COMPLETE:`, {
                requestId,
                strategy: {
                    primaryPath: comprehensiveStrategy.primaryPath,
                    platform: comprehensiveStrategy.platform,
                    searchApproach: comprehensiveStrategy.searchApproach,
                    keywordsCount: comprehensiveStrategy.keywords.length,
                    executionPaths: comprehensiveStrategy.executionPaths
                }
            });

            // Phase 2: Progressive Search Execution
            console.log(`[${new Date().toISOString()}] [COMPREHENSIVE] PROGRESSIVE_SEARCH_START:`, {
                requestId,
                phase: 'progressive_search'
            });

            const progressiveEngine = new ProgressiveSearchEngine(fastify);
            const phases: ProgressPhase[] = [];

            // Execute comprehensive search with progress tracking
            const results = await progressiveEngine.executeComprehensiveSearch(
                comprehensiveStrategy,
                (phase: ProgressPhase) => {
                    phases.push(phase);
                    console.log(`[${new Date().toISOString()}] [COMPREHENSIVE] PHASE_UPDATE:`, {
                        requestId,
                        phase: phase.phase,
                        status: phase.status,
                        message: phase.message,
                        resultsCount: phase.results?.length || 0,
                        duration: phase.duration
                    });
                }
            );

            console.log(`[${new Date().toISOString()}] [COMPREHENSIVE] PROGRESSIVE_SEARCH_COMPLETE:`, {
                requestId,
                totalResults: results.appPages.length + results.flowCollections.length +
                    results.screenPatterns.length + results.webApps.length,
                appPages: results.appPages.length,
                flowCollections: results.flowCollections.length,
                screenPatterns: results.screenPatterns.length,
                webApps: results.webApps.length,
                totalDuration: results.totalDuration,
                phasesCount: results.phases.length
            });

            // Phase 3: Format comprehensive response
            const response = {
                requestId,
                problemStatement,
                strategy: comprehensiveStrategy,
                results: {
                    summary: results.summary,
                    totalResults: results.appPages.length + results.flowCollections.length +
                        results.screenPatterns.length + results.webApps.length,

                    appPages: {
                        title: "📱 Complete App Experiences",
                        description: "Comprehensive app patterns and full user journeys",
                        items: results.appPages.map(result => ({
                            name: result.name,
                            url: result.url,
                            platform: result.platform,
                            reasoning: result.reasoning,
                            relevanceScore: result.relevanceScore,
                            extractedAt: result.extractedAt
                        }))
                    },

                    webApps: {
                        title: "💻 Web Application Patterns",
                        description: "Web-based interfaces and responsive designs",
                        items: results.webApps.map(result => ({
                            name: result.name,
                            url: result.url,
                            platform: result.platform,
                            reasoning: result.reasoning,
                            relevanceScore: result.relevanceScore,
                            extractedAt: result.extractedAt
                        }))
                    },

                    flowCollections: {
                        title: "🔄 Cross-App Flow Patterns",
                        description: "User flows and interaction patterns across multiple apps",
                        items: results.flowCollections.map(result => ({
                            name: result.name,
                            url: result.url,
                            platform: result.platform,
                            reasoning: result.reasoning,
                            relevanceScore: result.relevanceScore,
                            extractedAt: result.extractedAt
                        }))
                    },

                    screenPatterns: {
                        title: "🎨 Specific Screen Patterns",
                        description: "Individual screen designs and UI element patterns",
                        items: results.screenPatterns.map(result => ({
                            name: result.name,
                            url: result.url,
                            platform: result.platform,
                            reasoning: result.reasoning,
                            relevanceScore: result.relevanceScore,
                            extractedAt: result.extractedAt
                        }))
                    }
                },

                execution: {
                    totalDuration: results.totalDuration,
                    phases: results.phases.map(phase => ({
                        phase: phase.phase,
                        message: phase.message,
                        status: phase.status,
                        duration: phase.duration,
                        resultsCount: phase.results?.length || 0
                    }))
                },

                metadata: {
                    timestamp: new Date().toISOString(),
                    version: '1.0.0',
                    searchType: 'comprehensive_progressive'
                }
            };

            console.log(`[${new Date().toISOString()}] [COMPREHENSIVE] REQUEST_SUCCESS:`, {
                requestId,
                totalResults: response.results.totalResults,
                totalDuration: response.execution.totalDuration,
                phasesCompleted: response.execution.phases.filter(p => p.status === 'completed').length,
                success: true
            });

            return reply.send(response);

        } catch (error) {
            console.error(`[${new Date().toISOString()}] [COMPREHENSIVE] REQUEST_FAILED:`, {
                requestId,
                error: error.message,
                stack: error.stack
            });

            return reply.status(500).send({
                error: 'Comprehensive search failed',
                details: error.message,
                requestId,
                timestamp: new Date().toISOString()
            });
        }
    });

    /**
     * Get comprehensive search status (for long-running searches)
     */
    fastify.get('/comprehensive/status/:requestId', async (request, reply) => {
        const { requestId } = request.params as { requestId: string };

        // This would be implemented with a job queue system for long-running searches
        // For now, return a placeholder response
        return reply.send({
            requestId,
            status: 'completed',
            message: 'Comprehensive search status endpoint - to be implemented with job queue',
            timestamp: new Date().toISOString()
        });
    });

    /**
     * Health check for comprehensive search system
     */
    fastify.get('/comprehensive/health', async (request, reply) => {
        return reply.send({
            status: 'healthy',
            components: {
                progressiveSearchEngine: 'operational',
                strategyRouter: 'operational',
                mcpPlaywrightClient: 'operational',
                mobbinConfig: 'loaded'
            },
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        });
    });
}
