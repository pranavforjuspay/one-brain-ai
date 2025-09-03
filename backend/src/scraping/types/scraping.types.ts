// Core types for the web scraping system

export interface SearchIntent {
    patterns: string[];      // ["KYC verification", "card limits setup"]
    screens: string[];       // ["Onboarding welcome", "Identity verification"]
    comparables: string[];   // ["Revolut Business", "Wise", "Brex"]
    keywords: string[];      // ["SME onboarding", "business KYC"]
}

export interface DesignResult {
    title: string;
    url: string;
    appName: string;
    category: string;
    tags: string[];
    whyRelevant: string;
    relevanceScore: number;
    platform?: 'web' | 'ios' | 'android' | 'desktop';
    imageUrl?: string;
    description?: string;
}

export interface SearchStrategy {
    platform: 'web' | 'ios' | 'android' | 'all';
    category: 'ecommerce' | 'fintech' | 'social' | 'productivity' | 'general';
    searchType: 'keyword' | 'category' | 'app-specific';
    priority: number;
    keywords: string[];
    patterns?: string[];      // Optional: specific UI patterns from search intents
    comparables?: string[];   // Optional: comparable apps from search intents
}

export interface KeywordRouteMap {
    apps: string[];           // Keywords best suited for app exploration
    screens: string[];        // Keywords best suited for screen patterns
    flows: string[];          // Keywords best suited for flow exploration
    hybrid: string[];         // Keywords that work across multiple routes
    uiElements: string[];     // Keywords for UI element patterns
}

export interface RouteExecutionPlan {
    route: 'apps' | 'screens' | 'flows' | 'uiElements';
    keywords: string[];
    priority: number;
    estimatedResults: number;
    platforms: ('ios' | 'web' | 'android')[];
}

export interface IntelligentStrategy {
    keywordRouteMap: KeywordRouteMap;
    executionPlans: RouteExecutionPlan[];
    optimizedPhases: string[];
    estimatedDuration: number;
    expectedTotalResults: number;
}

export interface ComprehensiveStrategy {
    primaryPath: 'apps' | 'flows' | 'screens';
    platform: 'ios' | 'web' | 'both';
    searchApproach: 'app-specific' | 'pattern-based' | 'hybrid';
    keywords: string[];
    expectedContentTypes: ('app-pages' | 'flow-collections' | 'screen-patterns')[];
    executionPaths: string[];
    contentTypeNeeds: {
        needsComprehensiveApps: boolean;
        needsCrossAppFlows: boolean;
        needsSpecificScreens: boolean;
    };
    platformPriority: {
        iosApps: number;
        webApps: number;
        both: boolean;
    };
    // Enhanced with intelligent routing
    intelligentStrategy?: IntelligentStrategy;
}

export interface ProgressPhase {
    phase: string;
    message: string;
    action: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    results?: MobbinResult[];
    duration?: number;
}

export interface MobbinResult {
    type: 'app-page' | 'flow-collection' | 'screen-pattern' | 'web-app';
    name: string;
    url: string;
    platform: 'ios' | 'web' | 'android';
    reasoning: string;
    relevanceScore: number;
    extractedAt: Date;
    metadata?: {
        keyword?: string;
        description?: string;
        category?: string;
        stepCount?: number;
        [key: string]: any;
    };
}

export interface ComprehensiveResults {
    appPages: MobbinResult[];
    flowCollections: MobbinResult[];
    screenPatterns: MobbinResult[];
    webApps: MobbinResult[];
    summary: string;
    totalDuration: number;
    phases: ProgressPhase[];
}

export interface SearchPlan {
    strategy: SearchStrategy;
    workflow: WorkflowStep[];
    expectedResults: number;
    timeout: number;
}

export interface WorkflowStep {
    action: 'navigate' | 'click' | 'fill' | 'waitFor' | 'extract' | 'scroll' | 'hover' | 'press' | 'screenshot';
    selector?: string;
    value?: string;
    timeout?: number;
    description: string;
    retryCount?: number;
}

export interface PageStructure {
    url: string;
    title: string;
    searchElements: ElementInfo[];
    filterElements: ElementInfo[];
    navigationElements: ElementInfo[];
    resultElements: ElementInfo[];
    timestamp: Date;
}

export interface ElementInfo {
    selector: string;
    type: 'input' | 'button' | 'link' | 'select' | 'tab';
    purpose: 'search' | 'filter' | 'navigation' | 'result' | 'unknown';
    text?: string;
    attributes: Record<string, string>;
    confidence: number; // 0-1 confidence in classification
}

export interface ActionPlan {
    steps: WorkflowStep[];
    fallbackSteps?: WorkflowStep[];
    estimatedDuration: number;
    successCriteria: string[];
}

export interface NavigationResult {
    success: boolean;
    results: DesignResult[];
    executedSteps: WorkflowStep[];
    errors: string[];
    duration: number;
    adaptations: string[]; // What adaptations were made
}

export interface SiteConfig {
    siteName: string;
    baseUrl: string;
    selectors: Record<string, string>;
    workflows: Record<string, WorkflowStep[]>;
    rateLimit: {
        requestsPerMinute: number;
        delayBetweenRequests: number;
    };
    antiBot: {
        useRandomDelays: boolean;
        simulateHumanBehavior: boolean;
        rotateUserAgents: boolean;
    };
}

export interface CacheEntry {
    searchIntents: SearchIntent;
    results: DesignResult[];
    timestamp: Date;
    ttl: number; // Time to live in milliseconds
    source: string; // Which site/adapter provided these results
}

export interface AdapterHealth {
    siteName: string;
    isHealthy: boolean;
    lastSuccessfulRequest: Date;
    errorRate: number;
    averageResponseTime: number;
    issues: string[];
}

// URL Capture types for systematic URL extraction
export interface CapturedURL {
    url: string;
    title: string;
    route: RouteType;
    keyword: string;
    platform: 'ios' | 'web' | 'android';
    capturedAt: Date;
    metadata?: {
        description?: string;
        category?: string;
        stepCount?: number;
        [key: string]: any;
    };
}

export type RouteType = 'apps' | 'flows' | 'screens';

// URL Capture Manager types
export interface URLCaptureConfig {
    maxResultsPerKeyword: number;
    maxRetries: number;
    delayBetweenActions: number;
    platforms: ('ios' | 'web' | 'android')[];
}

export interface CaptureResult {
    success: boolean;
    capturedURLs: CapturedURL[];
    errors: string[];
    route: RouteType;
    keyword: string;
    duration: number;
}
