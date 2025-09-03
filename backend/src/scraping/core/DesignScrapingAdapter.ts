import { FastifyInstance } from 'fastify';
import {
    SearchIntent,
    DesignResult,
    SearchStrategy,
    SearchPlan,
    NavigationResult,
    AdapterHealth,
    SiteConfig
} from '../types/scraping.types.js';

/**
 * Abstract base class for design inspiration scraping adapters
 * Each site (Mobbin, Dribbble, Behance) implements this interface
 */
export abstract class DesignScrapingAdapter {
    protected config: SiteConfig;
    protected app: FastifyInstance;
    protected lastRequestTime: Date = new Date(0);
    protected errorCount: number = 0;
    protected successCount: number = 0;

    constructor(config: SiteConfig, app: FastifyInstance) {
        this.config = config;
        this.app = app;
    }

    /**
     * Get the name of this adapter's target site
     */
    abstract get siteName(): string;

    /**
     * Determine the best search strategies for given search intents
     */
    abstract determineSearchStrategies(searchIntents: SearchIntent): Promise<SearchStrategy[]>;

    /**
     * Create detailed search plans from strategies
     */
    abstract createSearchPlans(strategies: SearchStrategy[]): Promise<SearchPlan[]>;

    /**
     * Execute a search plan and return results
     */
    abstract executeSearchPlan(plan: SearchPlan, debugMode?: boolean): Promise<NavigationResult>;

    /**
     * Main entry point: search for designs based on intents
     */
    async searchDesigns(searchIntents: SearchIntent, debugMode: boolean = false): Promise<DesignResult[]> {
        const searchStartTime = Date.now();
        const requestId = Math.random().toString(36).substring(7);

        console.log(`[${new Date().toISOString()}] [${this.siteName.toUpperCase()}] SEARCH_START:`, {
            requestId,
            siteName: this.siteName,
            searchIntents,
            debugMode,
            timestamp: new Date().toISOString()
        });

        try {
            // Check rate limiting
            await this.enforceRateLimit();

            // Step 1: Determine search strategies
            console.log(`[${new Date().toISOString()}] [${this.siteName.toUpperCase()}] DETERMINING_STRATEGIES:`, {
                requestId,
                step: 1
            });
            const strategies = await this.determineSearchStrategies(searchIntents);

            // Step 2: Create search plans
            console.log(`[${new Date().toISOString()}] [${this.siteName.toUpperCase()}] CREATING_PLANS:`, {
                requestId,
                step: 2,
                strategiesCount: strategies.length,
                strategies: strategies.map(s => ({ platform: s.platform, priority: s.priority }))
            });
            const plans = await this.createSearchPlans(strategies);

            // Step 3: Execute plans in priority order
            console.log(`[${new Date().toISOString()}] [${this.siteName.toUpperCase()}] EXECUTING_PLANS:`, {
                requestId,
                step: 3,
                plansCount: plans.length
            });

            const allResults: DesignResult[] = [];
            const executionResults: NavigationResult[] = [];

            for (const plan of plans.sort((a, b) => b.strategy.priority - a.strategy.priority)) {
                console.log(`[${new Date().toISOString()}] [${this.siteName.toUpperCase()}] EXECUTING_PLAN:`, {
                    requestId,
                    platform: plan.strategy.platform,
                    priority: plan.strategy.priority,
                    workflowSteps: plan.workflow.length
                });

                try {
                    const result = await this.executeSearchPlan(plan, debugMode);
                    executionResults.push(result);

                    if (result.success) {
                        allResults.push(...result.results);
                        console.log(`[${new Date().toISOString()}] [${this.siteName.toUpperCase()}] PLAN_SUCCESS:`, {
                            requestId,
                            platform: plan.strategy.platform,
                            resultsFound: result.results.length,
                            duration: result.duration
                        });
                    } else {
                        console.log(`[${new Date().toISOString()}] [${this.siteName.toUpperCase()}] PLAN_FAILED:`, {
                            requestId,
                            platform: plan.strategy.platform,
                            errors: result.errors,
                            adaptations: result.adaptations
                        });
                    }
                } catch (error) {
                    console.log(`[${new Date().toISOString()}] [${this.siteName.toUpperCase()}] PLAN_ERROR:`, {
                        requestId,
                        platform: plan.strategy.platform,
                        error: error.message
                    });
                    this.errorCount++;
                }
            }

            // Step 4: Process and rank results
            const processedResults = await this.processResults(allResults, searchIntents);

            const totalDuration = Date.now() - searchStartTime;
            this.successCount++;

            console.log(`[${new Date().toISOString()}] [${this.siteName.toUpperCase()}] SEARCH_COMPLETE:`, {
                requestId,
                totalResults: processedResults.length,
                totalDuration: `${totalDuration}ms`,
                plansExecuted: executionResults.length,
                successfulPlans: executionResults.filter(r => r.success).length
            });

            this.app.log.info({
                siteName: this.siteName,
                resultsCount: processedResults.length,
                duration: totalDuration,
                strategies: strategies.length
            }, `${this.siteName} search completed successfully`);

            return processedResults;

        } catch (error) {
            const totalDuration = Date.now() - searchStartTime;
            this.errorCount++;

            console.log(`[${new Date().toISOString()}] [${this.siteName.toUpperCase()}] SEARCH_FAILED:`, {
                requestId,
                error: error.message,
                errorStack: error.stack,
                totalDuration: `${totalDuration}ms`
            });

            this.app.log.error({
                siteName: this.siteName,
                error: error.message,
                searchIntents
            }, `${this.siteName} search failed`);

            throw error;
        }
    }

    /**
     * Process and rank results based on relevance
     */
    protected async processResults(results: DesignResult[], searchIntents: SearchIntent): Promise<DesignResult[]> {
        // Remove duplicates
        const uniqueResults = this.removeDuplicates(results);

        // Rank by relevance
        const rankedResults = this.rankByRelevance(uniqueResults, searchIntents);

        // Limit results
        return rankedResults.slice(0, 10);
    }

    /**
     * Remove duplicate results based on URL
     */
    protected removeDuplicates(results: DesignResult[]): DesignResult[] {
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
    protected rankByRelevance(results: DesignResult[], searchIntents: SearchIntent): DesignResult[] {
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

                return { ...result, relevanceScore: Math.min(score, 1.0) };
            })
            .sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    /**
     * Enforce rate limiting based on config
     */
    protected async enforceRateLimit(): Promise<void> {
        const timeSinceLastRequest = Date.now() - this.lastRequestTime.getTime();
        const minDelay = this.config.rateLimit.delayBetweenRequests;

        if (timeSinceLastRequest < minDelay) {
            const waitTime = minDelay - timeSinceLastRequest;
            console.log(`[${new Date().toISOString()}] [${this.siteName.toUpperCase()}] RATE_LIMIT_WAIT:`, {
                waitTime: `${waitTime}ms`,
                minDelay: `${minDelay}ms`
            });
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequestTime = new Date();
    }

    /**
     * Get health status of this adapter
     */
    async getHealth(): Promise<AdapterHealth> {
        const totalRequests = this.successCount + this.errorCount;
        const errorRate = totalRequests > 0 ? this.errorCount / totalRequests : 0;

        return {
            siteName: this.siteName,
            isHealthy: errorRate < 0.5, // Healthy if less than 50% error rate
            lastSuccessfulRequest: this.lastRequestTime,
            errorRate,
            averageResponseTime: 0, // TODO: Implement response time tracking
            issues: errorRate > 0.3 ? [`High error rate: ${(errorRate * 100).toFixed(1)}%`] : []
        };
    }

    /**
     * Test if the adapter can connect to its target site
     */
    abstract testConnection(): Promise<boolean>;
}
