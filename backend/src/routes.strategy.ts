import { FastifyInstance } from 'fastify';
import { SearchStrategyRouter } from './scraping/core/SearchStrategyRouter.js';

/**
 * Strategy analysis routes - NO MCP calls, just analysis
 */
export async function strategyRoutes(fastify: FastifyInstance) {
    const strategyRouter = new SearchStrategyRouter(fastify);

    // Analyze problem statement and return strategy (no MCP execution)
    fastify.post('/strategy/analyze', async (request, reply) => {
        try {
            const { problemStatement } = request.body as { problemStatement: string };

            if (!problemStatement) {
                return reply.status(400).send({
                    error: 'Problem statement is required'
                });
            }

            // Step 1: Extract search intents (this should use AI classification)
            const searchIntents = {
                patterns: extractPatterns(problemStatement),
                screens: extractScreens(problemStatement),
                keywords: extractKeywords(problemStatement),
                comparables: extractComparables(problemStatement)
            };

            // Step 2: Determine strategies using our router
            const strategies = await strategyRouter.determineStrategies(searchIntents);

            // Step 3: Return analysis and strategy (NO MCP execution)
            return reply.send({
                problemStatement,
                searchIntents,
                strategies,
                recommendedAction: {
                    platform: strategies[0]?.platform || 'ios',
                    category: strategies[0]?.category || 'general',
                    keywords: strategies[0]?.keywords || [],
                    workflow: getWorkflowForStrategy(strategies[0])
                }
            });

        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({
                error: 'Strategy analysis failed',
                details: error.message
            });
        }
    });
}

// Helper functions for extracting intents
function extractPatterns(text: string): string[] {
    const patterns: string[] = [];
    const lowerText = text.toLowerCase();

    if (lowerText.includes('login') || lowerText.includes('sign in')) patterns.push('login screen');
    if (lowerText.includes('biometric') || lowerText.includes('fingerprint') || lowerText.includes('face id')) patterns.push('biometric authentication');
    if (lowerText.includes('banking') || lowerText.includes('finance')) patterns.push('banking interface');
    if (lowerText.includes('checkout') || lowerText.includes('payment')) patterns.push('payment flow');
    if (lowerText.includes('onboarding') || lowerText.includes('signup')) patterns.push('onboarding flow');

    return patterns;
}

function extractScreens(text: string): string[] {
    const screens: string[] = [];
    const lowerText = text.toLowerCase();

    if (lowerText.includes('login') || lowerText.includes('sign in')) screens.push('login screen');
    if (lowerText.includes('dashboard') || lowerText.includes('home')) screens.push('dashboard');
    if (lowerText.includes('profile')) screens.push('profile screen');
    if (lowerText.includes('settings')) screens.push('settings screen');
    if (lowerText.includes('checkout')) screens.push('checkout screen');

    return screens;
}

function extractKeywords(text: string): string[] {
    const keywords: string[] = [];
    const lowerText = text.toLowerCase();

    // Extract key terms
    const keyTerms = ['login', 'banking', 'biometric', 'authentication', 'mobile', 'ios', 'android', 'web', 'fintech', 'payment', 'checkout', 'ecommerce'];

    for (const term of keyTerms) {
        if (lowerText.includes(term)) {
            keywords.push(term);
        }
    }

    return keywords;
}

function extractComparables(text: string): string[] {
    const comparables: string[] = [];
    const lowerText = text.toLowerCase();

    // Common app names that might be mentioned
    const apps = ['chase', 'bank of america', 'wells fargo', 'revolut', 'monzo', 'n26', 'paypal', 'venmo', 'cashapp', 'amazon', 'shopify', 'uber', 'airbnb'];

    for (const app of apps) {
        if (lowerText.includes(app)) {
            comparables.push(app);
        }
    }

    return comparables;
}

function getWorkflowForStrategy(strategy: any): string[] {
    if (!strategy) return ['navigate_to_search', 'perform_keyword_search'];

    const workflow: string[] = [];

    // Platform-specific navigation
    if (strategy.platform === 'ios') {
        workflow.push('navigate_to_ios_section');
    } else if (strategy.platform === 'android') {
        workflow.push('navigate_to_android_section');
    } else if (strategy.platform === 'web') {
        workflow.push('navigate_to_web_section');
    }

    // Category-specific actions
    if (strategy.category === 'fintech') {
        workflow.push('filter_by_fintech_category');
    } else if (strategy.category === 'ecommerce') {
        workflow.push('filter_by_ecommerce_category');
    }

    // Search execution
    workflow.push('perform_search_with_keywords');
    workflow.push('extract_results');

    return workflow;
}
