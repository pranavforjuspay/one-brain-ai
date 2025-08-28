import { FastifyInstance } from 'fastify';
import { DesignScrapingAdapter } from './DesignScrapingAdapter.js';
import { MobbinAdapter } from '../adapters/MobbinAdapter.js';
import {
    SearchIntent,
    DesignResult,
    AdapterHealth
} from '../types/scraping.types.js';

/**
 * Main web scraping service that orchestrates multiple design inspiration adapters
 * Provides a unified interface for searching across different design platforms
 */
export class WebScrapingService {
    private adapters: Map<string, DesignScrapingAdapter> = new Map();
    private app: FastifyInstance;

    constructor(app: FastifyInstance) {
        this.app = app;
        this.initializeAdapters();
    }

    /**
     * Initialize all available adapters
     */
    private initializeAdapters(): void {
        console.log(`[${new Date().toISOString()}] [WEB_SCRAPING_SERVICE] INITIALIZING_ADAPTERS`);

        try {
            // Initialize Mobbin adapter
            const mobbinAdapter = new MobbinAdapter(this.app);
            this.registerAdapter(mobbinAdapter);

            console.log(`[${new Date().toISOString()}] [WEB_SCRAPING_SERVICE] ADAPTERS_INITIALIZED:`, {
                adapterCount: this.adapters.size,
                adapters: Array.from(this.adapters.keys())
            });

            this.app.log.info({
                adapterCount: this.adapters.size,
                adapters: Array.from(this.adapters.keys())
            }, 'Web scraping adapters initialized');

        } catch (error) {
            console.log(`[${new Date().toISOString()}] [WEB_SCRAPING_SERVICE] ADAPTER_INITIALIZATION_FAILED:`, {
                error: error.message
            });

            this.app.log.error({ error: error.message }, 'Failed to initialize web scraping adapters');
        }
    }

    /**
     * Register a new adapter
     */
    registerAdapter(adapter: DesignScrapingAdapter): void {
        console.log(`[${new Date().toISOString()}] [WEB_SCRAPING_SERVICE] REGISTERING_ADAPTER:`, {
            siteName: adapter.siteName
        });

        this.adapters.set(adapter.siteName, adapter);

        this.app.log.info({ siteName: adapter.siteName }, 'Adapter registered');
    }

    /**
     * Search for designs across all available adapters
     */
    async searchDesigns(searchIntents: SearchIntent, debugMode: boolean = false): Promise<DesignResult[]> {
        const searchStartTime = Date.now();
        const searchId = Math.random().toString(36).substring(7);

        console.log(`[${new Date().toISOString()}] [WEB_SCRAPING_SERVICE] SEARCH_START:`, {
            searchId,
            searchIntents,
            availableAdapters: Array.from(this.adapters.keys()),
            debugMode,
            timestamp: new Date().toISOString()
        });

        if (this.adapters.size === 0) {
            console.log(`[${new Date().toISOString()}] [WEB_SCRAPING_SERVICE] NO_ADAPTERS_AVAILABLE:`, {
                searchId
            });

            this.app.log.warn('No adapters available for design search');
            return [];
        }

        const allResults: DesignResult[] = [];
        const adapterResults: { [adapterName: string]: { results: DesignResult[]; duration: number; success: boolean } } = {};

        // Search across all adapters in parallel
        const searchPromises = Array.from(this.adapters.entries()).map(async ([siteName, adapter]) => {
            const adapterStartTime = Date.now();

            console.log(`[${new Date().toISOString()}] [WEB_SCRAPING_SERVICE] ADAPTER_SEARCH_START:`, {
                searchId,
                siteName,
                adapter: siteName,
                debugMode
            });

            try {
                const results = await adapter.searchDesigns(searchIntents, debugMode);
                const duration = Date.now() - adapterStartTime;

                console.log(`[${new Date().toISOString()}] [WEB_SCRAPING_SERVICE] ADAPTER_SEARCH_SUCCESS:`, {
                    searchId,
                    siteName,
                    resultsCount: results.length,
                    duration: `${duration}ms`
                });

                adapterResults[siteName] = {
                    results,
                    duration,
                    success: true
                };

                return results;

            } catch (error) {
                const duration = Date.now() - adapterStartTime;

                console.log(`[${new Date().toISOString()}] [WEB_SCRAPING_SERVICE] ADAPTER_SEARCH_FAILED:`, {
                    searchId,
                    siteName,
                    error: error.message,
                    duration: `${duration}ms`
                });

                this.app.log.error({
                    siteName,
                    error: error.message,
                    searchIntents
                }, 'Adapter search failed');

                adapterResults[siteName] = {
                    results: [],
                    duration,
                    success: false
                };

                return [];
            }
        });

        // Wait for all searches to complete
        const searchResults = await Promise.all(searchPromises);

        // Combine all results
        for (const results of searchResults) {
            allResults.push(...results);
        }

        // Process and rank combined results
        const processedResults = await this.processAndRankResults(allResults, searchIntents);

        const totalDuration = Date.now() - searchStartTime;
        console.log(`[${new Date().toISOString()}] [WEB_SCRAPING_SERVICE] SEARCH_COMPLETE:`, {
            searchId,
            totalResults: processedResults.length,
            totalDuration: `${totalDuration}ms`,
            adapterResults: Object.fromEntries(
                Object.entries(adapterResults).map(([name, result]) => [
                    name,
                    { count: result.results.length, duration: result.duration, success: result.success }
                ])
            )
        });

        this.app.log.info({
            searchId,
            totalResults: processedResults.length,
            duration: totalDuration,
            adaptersUsed: Object.keys(adapterResults).length,
            successfulAdapters: Object.values(adapterResults).filter(r => r.success).length
        }, 'Design search completed');

        return processedResults;
    }

    /**
     * Search using a specific adapter
     */
    async searchWithAdapter(adapterName: string, searchIntents: SearchIntent, debugMode: boolean = false): Promise<DesignResult[]> {
        const searchStartTime = Date.now();
        const searchId = Math.random().toString(36).substring(7);

        console.log(`[${new Date().toISOString()}] [WEB_SCRAPING_SERVICE] SPECIFIC_ADAPTER_SEARCH:`, {
            searchId,
            adapterName,
            searchIntents,
            debugMode,
            timestamp: new Date().toISOString()
        });

        const adapter = this.adapters.get(adapterName);
        if (!adapter) {
            console.log(`[${new Date().toISOString()}] [WEB_SCRAPING_SERVICE] ADAPTER_NOT_FOUND:`, {
                searchId,
                adapterName,
                availableAdapters: Array.from(this.adapters.keys())
            });

            throw new Error(`Adapter '${adapterName}' not found`);
        }

        try {
            const results = await adapter.searchDesigns(searchIntents, debugMode);
            const duration = Date.now() - searchStartTime;

            console.log(`[${new Date().toISOString()}] [WEB_SCRAPING_SERVICE] SPECIFIC_ADAPTER_SEARCH_SUCCESS:`, {
                searchId,
                adapterName,
                resultsCount: results.length,
                duration: `${duration}ms`
            });

            return results;

        } catch (error) {
            const duration = Date.now() - searchStartTime;

            console.log(`[${new Date().toISOString()}] [WEB_SCRAPING_SERVICE] SPECIFIC_ADAPTER_SEARCH_FAILED:`, {
                searchId,
                adapterName,
                error: error.message,
                duration: `${duration}ms`
            });

            this.app.log.error({
                adapterName,
                error: error.message,
                searchIntents
            }, 'Specific adapter search failed');

            throw error;
        }
    }

    /**
     * Process and rank combined results from multiple adapters
     */
    private async processAndRankResults(results: DesignResult[], searchIntents: SearchIntent): Promise<DesignResult[]> {
        console.log(`[${new Date().toISOString()}] [WEB_SCRAPING_SERVICE] PROCESSING_RESULTS:`, {
            inputResultsCount: results.length,
            searchIntents
        });

        // Remove duplicates based on URL
        const uniqueResults = this.removeDuplicates(results);

        // Rank by relevance
        const rankedResults = this.rankByRelevance(uniqueResults, searchIntents);

        // Limit results
        const finalResults = rankedResults.slice(0, 15); // Increased limit for multiple adapters

        console.log(`[${new Date().toISOString()}] [WEB_SCRAPING_SERVICE] RESULTS_PROCESSED:`, {
            inputCount: results.length,
            uniqueCount: uniqueResults.length,
            finalCount: finalResults.length
        });

        return finalResults;
    }

    /**
     * Remove duplicate results based on URL
     */
    private removeDuplicates(results: DesignResult[]): DesignResult[] {
        const seen = new Set<string>();
        return results.filter(result => {
            if (seen.has(result.url)) {
                return false;
            }
            seen.add(result.url);
            return true;
        });
    }

    /**
     * Rank results by relevance to search intents
     */
    private rankByRelevance(results: DesignResult[], searchIntents: SearchIntent): DesignResult[] {
        const allKeywords = [
            ...searchIntents.keywords,
            ...searchIntents.patterns,
            ...searchIntents.screens,
            ...searchIntents.comparables
        ].map(k => k.toLowerCase());

        return results
            .map(result => {
                let score = result.relevanceScore || 0;

                // Boost score based on keyword matches
                const resultText = `${result.title} ${result.appName} ${result.tags.join(' ')} ${result.whyRelevant}`.toLowerCase();

                for (const keyword of allKeywords) {
                    if (resultText.includes(keyword.toLowerCase())) {
                        score += 0.1;
                    }
                }

                // Boost score for exact app name matches
                for (const comparable of searchIntents.comparables) {
                    if (result.appName.toLowerCase().includes(comparable.toLowerCase())) {
                        score += 0.2;
                    }
                }

                return { ...result, relevanceScore: Math.min(score, 1.0) };
            })
            .sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    /**
     * Get health status of all adapters
     */
    async getAdaptersHealth(): Promise<AdapterHealth[]> {
        console.log(`[${new Date().toISOString()}] [WEB_SCRAPING_SERVICE] CHECKING_ADAPTER_HEALTH`);

        const healthPromises = Array.from(this.adapters.entries()).map(async ([siteName, adapter]) => {
            try {
                return await adapter.getHealth();
            } catch (error) {
                console.log(`[${new Date().toISOString()}] [WEB_SCRAPING_SERVICE] ADAPTER_HEALTH_CHECK_FAILED:`, {
                    siteName,
                    error: error.message
                });

                return {
                    siteName,
                    isHealthy: false,
                    lastSuccessfulRequest: new Date(0),
                    errorRate: 1.0,
                    averageResponseTime: 0,
                    issues: [`Health check failed: ${error.message}`]
                };
            }
        });

        const healthResults = await Promise.all(healthPromises);

        console.log(`[${new Date().toISOString()}] [WEB_SCRAPING_SERVICE] ADAPTER_HEALTH_CHECK_COMPLETE:`, {
            adaptersChecked: healthResults.length,
            healthyAdapters: healthResults.filter(h => h.isHealthy).length
        });

        return healthResults;
    }

    /**
     * Get list of available adapters
     */
    getAvailableAdapters(): string[] {
        return Array.from(this.adapters.keys());
    }

    /**
     * Test connection to all adapters
     */
    async testConnections(): Promise<{ [adapterName: string]: boolean }> {
        console.log(`[${new Date().toISOString()}] [WEB_SCRAPING_SERVICE] TESTING_CONNECTIONS`);

        const connectionPromises = Array.from(this.adapters.entries()).map(async ([siteName, adapter]) => {
            try {
                const isConnected = await adapter.testConnection();
                return [siteName, isConnected];
            } catch (error) {
                console.log(`[${new Date().toISOString()}] [WEB_SCRAPING_SERVICE] CONNECTION_TEST_FAILED:`, {
                    siteName,
                    error: error.message
                });
                return [siteName, false];
            }
        });

        const connectionResults = await Promise.all(connectionPromises);
        const results = Object.fromEntries(connectionResults);

        console.log(`[${new Date().toISOString()}] [WEB_SCRAPING_SERVICE] CONNECTION_TESTS_COMPLETE:`, {
            results
        });

        return results;
    }
}
