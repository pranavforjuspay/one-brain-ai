"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchStrategyRouter = void 0;
/**
 * Intelligent router that determines the best search strategies
 * based on search intents and AI analysis
 */
class SearchStrategyRouter {
    constructor(app) {
        this.app = app;
    }
    /**
     * Analyze search intents and determine optimal search strategies
     */
    async determineStrategies(searchIntents) {
        const routingStartTime = Date.now();
        const routingId = Math.random().toString(36).substring(7);
        console.log(`[${new Date().toISOString()}] [STRATEGY_ROUTER] ROUTING_START:`, {
            routingId,
            searchIntents,
            timestamp: new Date().toISOString()
        });
        try {
            const strategies = [];
            // Step 1: Analyze platform preferences
            const platformAnalysis = this.analyzePlatformPreferences(searchIntents);
            console.log(`[${new Date().toISOString()}] [STRATEGY_ROUTER] PLATFORM_ANALYSIS:`, {
                routingId,
                platformAnalysis
            });
            // Step 2: Analyze category preferences
            const categoryAnalysis = this.analyzeCategoryPreferences(searchIntents);
            console.log(`[${new Date().toISOString()}] [STRATEGY_ROUTER] CATEGORY_ANALYSIS:`, {
                routingId,
                categoryAnalysis
            });
            // Step 3: Determine search types
            const searchTypeAnalysis = this.analyzeSearchTypes(searchIntents);
            console.log(`[${new Date().toISOString()}] [STRATEGY_ROUTER] SEARCH_TYPE_ANALYSIS:`, {
                routingId,
                searchTypeAnalysis
            });
            // Step 4: Create strategies based on analysis
            if (platformAnalysis.web.confidence > 0.3) {
                strategies.push({
                    platform: 'web',
                    category: categoryAnalysis.primary,
                    searchType: searchTypeAnalysis.primary,
                    priority: this.calculatePriority(platformAnalysis.web.confidence, categoryAnalysis.confidence, searchTypeAnalysis.confidence),
                    keywords: this.selectKeywords(searchIntents, 'web')
                });
            }
            if (platformAnalysis.ios.confidence > 0.3) {
                strategies.push({
                    platform: 'ios',
                    category: categoryAnalysis.primary,
                    searchType: searchTypeAnalysis.primary,
                    priority: this.calculatePriority(platformAnalysis.ios.confidence, categoryAnalysis.confidence, searchTypeAnalysis.confidence),
                    keywords: this.selectKeywords(searchIntents, 'ios')
                });
            }
            if (platformAnalysis.android.confidence > 0.3) {
                strategies.push({
                    platform: 'android',
                    category: categoryAnalysis.primary,
                    searchType: searchTypeAnalysis.primary,
                    priority: this.calculatePriority(platformAnalysis.android.confidence, categoryAnalysis.confidence, searchTypeAnalysis.confidence),
                    keywords: this.selectKeywords(searchIntents, 'android')
                });
            }
            // If no specific platform detected, search all platforms
            if (strategies.length === 0) {
                console.log(`[${new Date().toISOString()}] [STRATEGY_ROUTER] NO_SPECIFIC_PLATFORM:`, {
                    routingId,
                    fallbackToAll: true
                });
                strategies.push({
                    platform: 'all',
                    category: categoryAnalysis.primary,
                    searchType: searchTypeAnalysis.primary,
                    priority: 0.7,
                    keywords: searchIntents.keywords
                });
            }
            // Sort by priority
            strategies.sort((a, b) => b.priority - a.priority);
            const routingDuration = Date.now() - routingStartTime;
            console.log(`[${new Date().toISOString()}] [STRATEGY_ROUTER] ROUTING_COMPLETE:`, {
                routingId,
                strategiesCount: strategies.length,
                strategies: strategies.map(s => ({
                    platform: s.platform,
                    category: s.category,
                    priority: s.priority,
                    keywordCount: s.keywords.length
                })),
                duration: `${routingDuration}ms`
            });
            this.app.log.info({
                strategiesCount: strategies.length,
                platforms: strategies.map(s => s.platform),
                duration: routingDuration
            }, 'Search strategy routing completed');
            return strategies;
        }
        catch (error) {
            const routingDuration = Date.now() - routingStartTime;
            console.log(`[${new Date().toISOString()}] [STRATEGY_ROUTER] ROUTING_FAILED:`, {
                routingId,
                error: error.message,
                duration: `${routingDuration}ms`
            });
            this.app.log.error({ error: error.message }, 'Search strategy routing failed');
            // Fallback strategy
            return [{
                    platform: 'all',
                    category: 'general',
                    searchType: 'keyword',
                    priority: 0.5,
                    keywords: searchIntents.keywords.slice(0, 3)
                }];
        }
    }
    /**
     * Analyze platform preferences from search intents
     */
    analyzePlatformPreferences(searchIntents) {
        const allText = [
            ...searchIntents.patterns,
            ...searchIntents.screens,
            ...searchIntents.keywords,
            ...searchIntents.comparables
        ].join(' ').toLowerCase();
        // Web indicators
        const webIndicators = ['web', 'website', 'desktop', 'browser', 'responsive', 'css', 'html'];
        const webMatches = webIndicators.filter(indicator => allText.includes(indicator));
        const webConfidence = Math.min(webMatches.length * 0.3 + 0.4, 1.0); // Base confidence + matches
        // iOS indicators
        const iosIndicators = ['ios', 'iphone', 'ipad', 'apple', 'swift', 'app store'];
        const iosMatches = iosIndicators.filter(indicator => allText.includes(indicator));
        const iosConfidence = Math.min(iosMatches.length * 0.4 + 0.3, 1.0);
        // Android indicators
        const androidIndicators = ['android', 'google play', 'material design', 'kotlin', 'java'];
        const androidMatches = androidIndicators.filter(indicator => allText.includes(indicator));
        const androidConfidence = Math.min(androidMatches.length * 0.4 + 0.3, 1.0);
        // Check for mobile-specific patterns
        const mobilePatterns = ['mobile', 'app', 'touch', 'swipe', 'tap', 'gesture'];
        const mobileMatches = mobilePatterns.filter(pattern => allText.includes(pattern));
        if (mobileMatches.length > 0) {
            // Boost mobile platforms if mobile patterns detected
            const mobileBoost = mobileMatches.length * 0.2;
            return {
                web: { confidence: Math.max(webConfidence - mobileBoost, 0.2), indicators: webMatches },
                ios: { confidence: Math.min(iosConfidence + mobileBoost, 1.0), indicators: [...iosMatches, ...mobileMatches] },
                android: { confidence: Math.min(androidConfidence + mobileBoost, 1.0), indicators: [...androidMatches, ...mobileMatches] }
            };
        }
        return {
            web: { confidence: webConfidence, indicators: webMatches },
            ios: { confidence: iosConfidence, indicators: iosMatches },
            android: { confidence: androidConfidence, indicators: androidMatches }
        };
    }
    /**
     * Analyze category preferences from search intents
     */
    analyzeCategoryPreferences(searchIntents) {
        const allText = [
            ...searchIntents.patterns,
            ...searchIntents.screens,
            ...searchIntents.keywords,
            ...searchIntents.comparables
        ].join(' ').toLowerCase();
        // Category indicators (removed specific app names to avoid bias)
        const categories = {
            fintech: ['payment', 'bank', 'finance', 'card', 'money', 'transaction', 'kyc', 'verification', 'wallet', 'transfer'],
            ecommerce: ['shop', 'cart', 'checkout', 'product', 'buy', 'sell', 'store', 'marketplace', 'purchase'],
            social: ['social', 'chat', 'message', 'friend', 'follow', 'like', 'share', 'feed', 'profile'],
            productivity: ['task', 'todo', 'calendar', 'note', 'document', 'workspace', 'project', 'organize']
        };
        let bestCategory = 'general';
        let bestScore = 0;
        let bestIndicators = [];
        for (const [category, indicators] of Object.entries(categories)) {
            const matches = indicators.filter(indicator => allText.includes(indicator));
            const score = matches.length;
            if (score > bestScore) {
                bestScore = score;
                bestCategory = category;
                bestIndicators = matches;
            }
        }
        const confidence = Math.min(bestScore * 0.3 + 0.4, 1.0);
        return {
            primary: bestCategory,
            confidence,
            indicators: bestIndicators
        };
    }
    /**
     * Analyze search types from search intents
     */
    analyzeSearchTypes(searchIntents) {
        // Check if specific apps are mentioned
        if (searchIntents.comparables.length > 0) {
            return {
                primary: 'app-specific',
                confidence: 0.9,
                reasoning: `Specific apps mentioned: ${searchIntents.comparables.join(', ')}`
            };
        }
        // Check if specific patterns are mentioned
        if (searchIntents.patterns.length > 2) {
            return {
                primary: 'category',
                confidence: 0.8,
                reasoning: `Multiple specific patterns: ${searchIntents.patterns.join(', ')}`
            };
        }
        // Default to keyword search
        return {
            primary: 'keyword',
            confidence: 0.7,
            reasoning: 'General keyword-based search'
        };
    }
    /**
     * Calculate priority score for a strategy
     */
    calculatePriority(platformConfidence, categoryConfidence, searchTypeConfidence) {
        // Weighted average with platform being most important
        return (platformConfidence * 0.5) + (categoryConfidence * 0.3) + (searchTypeConfidence * 0.2);
    }
    /**
     * Analyze keywords and create intelligent route mapping
     */
    analyzeKeywordRoutes(keywords) {
        const routingStartTime = Date.now();
        const routingId = Math.random().toString(36).substring(7);
        console.log(`[${new Date().toISOString()}] [STRATEGY_ROUTER] INTELLIGENT_ROUTING_START:`, {
            routingId,
            keywords,
            timestamp: new Date().toISOString()
        });
        // Classify keywords into optimal routes
        const keywordRouteMap = {
            apps: keywords.filter(k => this.isAppKeyword(k)),
            screens: keywords.filter(k => this.isScreenKeyword(k)),
            flows: keywords.filter(k => this.isFlowKeyword(k)),
            hybrid: keywords.filter(k => this.isHybridKeyword(k)),
            uiElements: keywords.filter(k => this.isUIElementKeyword(k))
        };
        // Create execution plans for each route
        const executionPlans = [];
        // Apps route plan
        if (keywordRouteMap.apps.length > 0) {
            executionPlans.push({
                route: 'apps',
                keywords: keywordRouteMap.apps,
                priority: 0.9,
                estimatedResults: keywordRouteMap.apps.length * 3, // ~3 apps per keyword
                platforms: ['ios', 'web']
            });
        }
        // Flows route plan
        if (keywordRouteMap.flows.length > 0) {
            executionPlans.push({
                route: 'flows',
                keywords: keywordRouteMap.flows,
                priority: 0.8,
                estimatedResults: keywordRouteMap.flows.length * 2, // ~2 flows per keyword
                platforms: ['ios']
            });
        }
        // Screens route plan
        if (keywordRouteMap.screens.length > 0) {
            executionPlans.push({
                route: 'screens',
                keywords: keywordRouteMap.screens,
                priority: 0.7,
                estimatedResults: keywordRouteMap.screens.length * 4, // ~4 screens per keyword
                platforms: ['ios']
            });
        }
        // UI Elements route plan
        if (keywordRouteMap.uiElements.length > 0) {
            executionPlans.push({
                route: 'uiElements',
                keywords: keywordRouteMap.uiElements,
                priority: 0.6,
                estimatedResults: keywordRouteMap.uiElements.length * 2, // ~2 UI patterns per keyword
                platforms: ['ios']
            });
        }
        // Hybrid keywords get added to multiple routes
        keywordRouteMap.hybrid.forEach(keyword => {
            executionPlans.forEach(plan => {
                if (!plan.keywords.includes(keyword)) {
                    plan.keywords.push(keyword);
                    plan.estimatedResults += 1;
                }
            });
        });
        // Sort by priority
        executionPlans.sort((a, b) => b.priority - a.priority);
        // Generate optimized phases
        const optimizedPhases = executionPlans.map(plan => plan.route === 'apps' ? `apps_${plan.platforms.join('_')}` : plan.route);
        const totalResults = executionPlans.reduce((sum, plan) => sum + plan.estimatedResults, 0);
        const estimatedDuration = executionPlans.length * 8000; // ~8s per route
        const intelligentStrategy = {
            keywordRouteMap,
            executionPlans,
            optimizedPhases,
            estimatedDuration,
            expectedTotalResults: totalResults
        };
        const routingDuration = Date.now() - routingStartTime;
        console.log(`[${new Date().toISOString()}] [STRATEGY_ROUTER] INTELLIGENT_ROUTING_COMPLETE:`, {
            routingId,
            keywordRouteMap,
            executionPlansCount: executionPlans.length,
            optimizedPhases,
            expectedResults: totalResults,
            duration: `${routingDuration}ms`
        });
        return intelligentStrategy;
    }
    /**
     * Check if keyword is best suited for app exploration
     */
    isAppKeyword(keyword) {
        const appKeywords = [
            'banking', 'fintech', 'ecommerce', 'social', 'productivity',
            'uber', 'airbnb', 'netflix', 'spotify', 'instagram', 'facebook',
            'amazon', 'shopify', 'paypal', 'venmo', 'cashapp', 'robinhood'
        ];
        return appKeywords.some(app => keyword.toLowerCase().includes(app));
    }
    /**
     * Check if keyword is best suited for screen patterns
     */
    isScreenKeyword(keyword) {
        const screenKeywords = [
            'biometric', 'fingerprint', 'face-id', 'touch-id', 'pin', 'passcode',
            'button', 'card', 'modal', 'popup', 'form', 'input', 'field'
        ];
        return screenKeywords.some(screen => keyword.toLowerCase().includes(screen));
    }
    /**
     * Check if keyword is best suited for flow exploration
     */
    isFlowKeyword(keyword) {
        const flowKeywords = [
            'login', 'authentication', 'onboarding', 'signup', 'checkout',
            'verification', 'kyc', 'registration', 'setup', 'tutorial'
        ];
        return flowKeywords.some(flow => keyword.toLowerCase().includes(flow));
    }
    /**
     * Check if keyword works across multiple routes
     */
    isHybridKeyword(keyword) {
        const hybridKeywords = [
            'payment', 'security', 'verification', 'mobile', 'app'
        ];
        return hybridKeywords.some(hybrid => keyword.toLowerCase().includes(hybrid));
    }
    /**
     * Check if keyword is best suited for UI element patterns
     */
    isUIElementKeyword(keyword) {
        const uiKeywords = [
            'icon', 'badge', 'notification', 'alert', 'banner', 'tooltip',
            'dropdown', 'menu', 'tab', 'navigation', 'header', 'footer'
        ];
        return uiKeywords.some(ui => keyword.toLowerCase().includes(ui));
    }
    /**
     * Select the best keywords for a specific platform
     */
    selectKeywords(searchIntents, platform) {
        let keywords = [...searchIntents.keywords];
        // Add platform-specific keywords
        if (platform === 'ios') {
            keywords = keywords.filter(k => !k.toLowerCase().includes('android'));
            if (!keywords.some(k => k.toLowerCase().includes('ios'))) {
                keywords.push('ios');
            }
        }
        else if (platform === 'android') {
            keywords = keywords.filter(k => !k.toLowerCase().includes('ios'));
            if (!keywords.some(k => k.toLowerCase().includes('android'))) {
                keywords.push('android');
            }
        }
        else if (platform === 'web') {
            if (!keywords.some(k => ['web', 'website', 'desktop'].some(w => k.toLowerCase().includes(w)))) {
                keywords.push('web');
            }
        }
        // Add relevant patterns as keywords
        keywords.push(...searchIntents.patterns.slice(0, 2));
        // Limit to most relevant keywords
        return keywords.slice(0, 5);
    }
}
exports.SearchStrategyRouter = SearchStrategyRouter;
