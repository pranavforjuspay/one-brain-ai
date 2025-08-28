import { SiteConfig, WorkflowStep } from '../types/scraping.types.js';

/**
 * Comprehensive Mobbin selectors for all search paths
 */
export const MOBBIN_SELECTORS = {
    // Authentication selectors
    auth: {
        loginButton: 'a:has-text("Log in"), button:has-text("Log in")',
        seeOtherOptions: 'button:has-text("See other options"), a:has-text("See other options")',
        emailInput: 'input[name="email"]',
        passwordInput: 'input[type="password"], input[name="password"]',
        submitButton: 'form button[type="submit"]',
        userMenu: '[data-testid="user-menu"], .user-avatar, .profile-menu, button:has-text("Sign out")',
    },

    // Platform navigation
    platforms: {
        iosTab: 'button:has-text("iOS"), [data-platform="ios"], .platform-ios',
        webTab: 'button:has-text("Web"), [data-platform="web"], .platform-web',
        androidTab: 'button:has-text("Android"), [data-platform="android"], .platform-android',
    },

    // Search interface
    search: {
        iosSearchButton: 'text=Search on iOS...',
        webSearchButton: 'text=Search on Web...',
        searchModal: '.modal, [role="dialog"]',
        searchInput: 'input[type="text"]',
        searchInFlows: 'text=Search in Flows',
        searchInScreens: 'text=Search in Screens',
        textInScreenshot: 'text=Text in Screenshot',
        generalSearch: 'text="Press Enter to search"',
    },

    // Results and navigation
    results: {
        appSuggestions: '[data-testid="app-suggestion"], .app-suggestion',
        flowResults: '[data-testid="flow-result"], .flow-result',
        screenResults: '[data-testid="screen-result"], .screen-result',
        resultCards: '.design-card, .result-item, .app-card',
        loadMore: 'button:has-text("Load more"), .load-more',
        modalClose: 'button[aria-label="Close"], .modal-close, [data-testid="close"]',
        escapeKey: 'Escape',
    },

    // Category filters
    categories: {
        financeCategory: 'text=Finance',
        categoryFilters: '.category-filter, .filter-category',
        applyFilters: 'button:has-text("Apply"), .apply-filters',
    },

    // Content sections
    sections: {
        appsSection: 'text=Apps',
        sitesSection: 'text=Sites',
        screensSection: 'text=Screens',
        flowsSection: 'text=Flows',
        uiElementsSection: 'text=UI Elements',
    }
} as const;

/**
 * Mobbin.com specific configuration
 * Contains selectors, workflows, and site-specific settings
 */
export const MOBBIN_CONFIG: SiteConfig = {
    siteName: 'Mobbin',
    baseUrl: 'https://mobbin.com',

    // CSS selectors for key elements
    selectors: {
        // Search elements
        searchInput: 'input[placeholder*="Search"], input[type="search"], .search-input',
        searchButton: 'button[type="submit"], .search-button, button:has-text("Search")',
        searchForm: 'form[role="search"], .search-form',

        // Platform tabs/filters
        webTab: '[data-platform="web"], button:has-text("Web"), .platform-web',
        iosTab: '[data-platform="ios"], button:has-text("iOS"), .platform-ios',
        androidTab: '[data-platform="android"], button:has-text("Android"), .platform-android',

        // Category filters
        categoryFilter: '.category-filter, .filter-category',
        fintechCategory: 'button:has-text("Fintech"), [data-category="fintech"]',
        ecommerceCategory: 'button:has-text("E-commerce"), [data-category="ecommerce"]',
        socialCategory: 'button:has-text("Social"), [data-category="social"]',

        // Results
        resultCards: '.design-card, .result-item, .app-card, [data-testid="design-card"]',
        resultTitle: '.card-title, .design-title, h3, h4',
        resultAppName: '.app-name, .brand-name, .company-name',
        resultUrl: 'a[href*="/apps/"], a[href*="/designs/"]',
        resultImage: '.design-image img, .card-image img, .thumbnail img',
        resultTags: '.tag, .label, .category-tag',

        // Navigation
        loadMoreButton: 'button:has-text("Load more"), .load-more, .pagination-next',
        backButton: '.back-button, button:has-text("Back")',

        // Loading states
        loadingSpinner: '.loading, .spinner, [data-loading="true"]',
        noResults: '.no-results, .empty-state, :has-text("No results")',

        // Cookie/modal dismissal
        cookieAccept: 'button:has-text("Accept"), .cookie-accept, #cookie-accept',
        modalClose: '.modal-close, .close-button, button[aria-label="Close"]'
    },

    // Pre-defined workflows for common actions
    workflows: {
        // Basic search workflow
        basicSearch: [
            {
                action: 'navigate',
                value: 'https://mobbin.com',
                description: 'Navigate to Mobbin homepage',
                timeout: 10000
            },
            {
                action: 'waitFor',
                selector: 'button:has-text("Search on iOS"), button:has-text("Search on")',
                description: 'Wait for search button to be visible',
                timeout: 5000
            },
            {
                action: 'click',
                selector: 'button:has-text("Search on iOS"), button:has-text("Search on")',
                description: 'Click search button to open search interface',
                retryCount: 2
            },
            {
                action: 'waitFor',
                selector: 'input[type="text"], input[placeholder*="search" i]',
                description: 'Wait for search input field to appear',
                timeout: 5000
            },
            {
                action: 'fill',
                selector: 'input[type="text"], input[placeholder*="search" i]',
                value: '{{searchTerm}}',
                description: 'Fill search input with search term'
            },
            {
                action: 'press',
                value: 'Enter',
                description: 'Press Enter to execute search',
                retryCount: 2
            },
            {
                action: 'waitFor',
                selector: '.design-card, .result-item, .no-results, [data-testid="design-card"]',
                description: 'Wait for search results or no results message',
                timeout: 8000
            }
        ],

        // Web platform search - Enhanced with robust selectors
        webSearch: [
            {
                action: 'navigate',
                value: 'https://mobbin.com',
                description: 'Navigate to Mobbin homepage',
                timeout: 10000
            },
            {
                action: 'waitFor',
                selector: 'button:has-text("Web"), [data-platform="web"], .platform-web, a[href*="web"]',
                description: 'Wait for Web platform option to be available',
                timeout: 5000
            },
            {
                action: 'click',
                selector: 'button:has-text("Web"), [data-platform="web"], .platform-web, a[href*="web"]',
                description: 'Click Web platform tab/filter',
                retryCount: 3
            },
            {
                action: 'waitFor',
                selector: 'button:has-text("Search on"), input[type="text"], input[placeholder*="search" i]',
                description: 'Wait for search interface after platform selection',
                timeout: 5000
            },
            {
                action: 'click',
                selector: 'button:has-text("Search on"), button:has-text("Search")',
                description: 'Click search button to open search interface',
                retryCount: 2
            },
            {
                action: 'waitFor',
                selector: 'input[type="text"], input[placeholder*="search" i]',
                description: 'Wait for search input field to appear',
                timeout: 5000
            },
            {
                action: 'fill',
                selector: 'input[type="text"], input[placeholder*="search" i]',
                value: '{{searchTerm}}',
                description: 'Fill search input with search term'
            },
            {
                action: 'press',
                value: 'Enter',
                description: 'Press Enter to execute search',
                retryCount: 2
            },
            {
                action: 'waitFor',
                selector: '.design-card, .result-item, .no-results, [data-testid="design-card"]',
                description: 'Wait for search results',
                timeout: 10000
            }
        ],

        // iOS platform search - Enhanced with intelligent suggestion evaluation
        iosSearch: [
            {
                action: 'navigate',
                value: 'https://mobbin.com',
                description: 'Navigate to Mobbin homepage',
                timeout: 10000
            },
            {
                action: 'waitFor',
                selector: 'button:has-text("iOS"), [data-platform="ios"], .platform-ios, a[href*="ios"]',
                description: 'Wait for iOS platform option to be available',
                timeout: 5000
            },
            {
                action: 'click',
                selector: 'button:has-text("iOS"), [data-platform="ios"], .platform-ios, a[href*="ios"]',
                description: 'Click iOS platform tab/filter',
                retryCount: 3
            },
            {
                action: 'waitFor',
                selector: 'text=Search on iOS...',
                description: 'Wait for iOS search button',
                timeout: 5000
            },
            {
                action: 'click',
                selector: 'text=Search on iOS...',
                description: 'Click search button to open modal',
                retryCount: 2
            },
            {
                action: 'waitFor',
                selector: 'input[type="text"]',
                description: 'Wait for search modal input field',
                timeout: 5000
            },
            {
                action: 'fill',
                selector: 'input[type="text"]',
                value: '{{searchTerm}}',
                description: 'Type search term to trigger suggestions'
            },
            {
                action: 'waitFor',
                selector: 'text={{appSuggestion}}, text="{{searchTerm}}"',
                description: 'Wait for suggestions to appear',
                timeout: 3000
            },
            {
                action: 'click',
                selector: 'text={{appSuggestion}}',
                description: 'Click on relevant app suggestion if available',
                retryCount: 1
            },
            {
                action: 'waitFor',
                selector: '.design-card, .result-item, .app-screens',
                description: 'Wait for app screens to load',
                timeout: 10000
            }
        ],

        // Intelligent suggestion evaluation workflow (documented for reference)
        intelligentSuggestionSearch: [
            {
                action: 'click',
                selector: 'text=Search on iOS...',
                description: 'Open search modal',
                retryCount: 2
            },
            {
                action: 'fill',
                selector: 'input[type="text"]',
                value: '{{initialKeyword}}',
                description: 'Type initial keyword to trigger suggestions'
            },
            {
                action: 'waitFor',
                selector: 'text={{appSuggestion}}',
                description: 'Wait for app suggestions to appear',
                timeout: 3000
            },
            {
                action: 'click',
                selector: 'text={{appSuggestion}}',
                description: 'Click best matching suggestion (requires manual evaluation)',
                retryCount: 1
            }
        ],

        // Android platform search - Enhanced with robust selectors
        androidSearch: [
            {
                action: 'navigate',
                value: 'https://mobbin.com',
                description: 'Navigate to Mobbin homepage',
                timeout: 10000
            },
            {
                action: 'waitFor',
                selector: 'button:has-text("Android"), [data-platform="android"], .platform-android, a[href*="android"]',
                description: 'Wait for Android platform option to be available',
                timeout: 5000
            },
            {
                action: 'click',
                selector: 'button:has-text("Android"), [data-platform="android"], .platform-android, a[href*="android"]',
                description: 'Click Android platform tab/filter',
                retryCount: 3
            },
            {
                action: 'waitFor',
                selector: 'button:has-text("Search on Android"), button:has-text("Search on"), button:has-text("Search")',
                description: 'Wait for Android search interface',
                timeout: 5000
            },
            {
                action: 'click',
                selector: 'button:has-text("Search on Android"), button:has-text("Search on"), button:has-text("Search")',
                description: 'Click Android search button to open search interface',
                retryCount: 2
            },
            {
                action: 'waitFor',
                selector: 'input[type="text"], input[placeholder*="search" i]',
                description: 'Wait for search input field to appear',
                timeout: 5000
            },
            {
                action: 'fill',
                selector: 'input[type="text"], input[placeholder*="search" i]',
                value: '{{searchTerm}}',
                description: 'Fill search input with search term'
            },
            {
                action: 'press',
                value: 'Enter',
                description: 'Press Enter to execute search',
                retryCount: 2
            },
            {
                action: 'waitFor',
                selector: '.design-card, .result-item, .no-results, [data-testid="design-card"]',
                description: 'Wait for search results',
                timeout: 10000
            }
        ],

        // Category-specific search (e.g., Fintech)
        categorySearch: [
            {
                action: 'navigate',
                value: 'https://mobbin.com',
                description: 'Navigate to Mobbin homepage',
                timeout: 10000
            },
            {
                action: 'click',
                selector: '{{categorySelector}}',
                description: 'Click category filter',
                retryCount: 2
            },
            {
                action: 'waitFor',
                selector: 'input[placeholder*="Search"]',
                description: 'Wait for search input after category selection',
                timeout: 3000
            },
            {
                action: 'fill',
                selector: 'input[placeholder*="Search"]',
                value: '{{searchTerm}}',
                description: 'Fill search input with search term'
            },
            {
                action: 'click',
                selector: 'button[type="submit"], .search-button',
                description: 'Submit search',
                retryCount: 2
            },
            {
                action: 'waitFor',
                selector: '.design-card, .result-item, .no-results',
                description: 'Wait for search results',
                timeout: 8000
            }
        ],

        // Dismiss modals/cookies
        dismissModals: [
            {
                action: 'click',
                selector: 'button:has-text("Accept"), .cookie-accept',
                description: 'Accept cookies if present',
                retryCount: 1
            },
            {
                action: 'click',
                selector: '.modal-close, .close-button',
                description: 'Close any modal dialogs',
                retryCount: 1
            }
        ],

        // Authentication workflows - Fixed to properly detect login state
        checkAuthentication: [
            {
                action: 'navigate',
                value: 'https://mobbin.com',
                description: 'Navigate to Mobbin homepage',
                timeout: 10000
            },
            {
                action: 'waitFor',
                selector: 'a:has-text("Log in"), button:has-text("Log in")',
                description: 'Check if Log in button is present (indicates user is NOT logged in)',
                timeout: 3000
            }
        ],

        login: [
            {
                action: 'click',
                selector: 'a:has-text("Log in"), button:has-text("Log in")',
                description: 'Click Log in link from homepage',
                timeout: 5000
            },
            {
                action: 'waitFor',
                selector: 'button:has-text("See other options"), a:has-text("See other options")',
                description: 'Wait for login options to appear',
                timeout: 5000
            },
            {
                action: 'click',
                selector: 'button:has-text("See other options"), a:has-text("See other options")',
                description: 'Click See other options to access email/password form',
                retryCount: 2
            },
            {
                action: 'waitFor',
                selector: 'input[name="email"]',
                description: 'Wait for email input field to appear',
                timeout: 5000
            },
            {
                action: 'fill',
                selector: 'input[name="email"]',
                value: '{{email}}',
                description: 'Fill email field with credentials'
            },
            {
                action: 'click',
                selector: 'form button[type="submit"]',
                description: 'Click Continue button after entering email',
                retryCount: 2
            },
            {
                action: 'waitFor',
                selector: 'input[type="password"], input[name="password"]',
                description: 'Wait for password field to appear',
                timeout: 5000
            },
            {
                action: 'fill',
                selector: 'input[type="password"], input[name="password"]',
                value: '{{password}}',
                description: 'Fill password field'
            },
            {
                action: 'click',
                selector: 'form button[type="submit"]',
                description: 'Submit login form with password',
                retryCount: 2
            },
            {
                action: 'waitFor',
                selector: 'button:has-text("Search on iOS"), input[placeholder*="search" i], [data-testid="user-menu"]',
                description: 'Wait for successful login (search interface or user menu appears)',
                timeout: 10000
            }
        ],

        // Comprehensive search workflows for progressive execution

        // Phase 1: Apps iOS - Multi-app exploration with suggestion-based navigation (FIXED)
        appsIosMultiExploration: [
            {
                action: 'waitFor',
                selector: 'text=Search on iOS..., button:has-text("Search on iOS"), button:has-text("Search on")',
                description: 'Ensure we are on Mobbin homepage with search button visible',
                timeout: 5000
            },
            {
                action: 'click',
                selector: 'text=Search on iOS...',
                description: 'Open iOS search modal',
                retryCount: 2
            },
            {
                action: 'fill',
                selector: 'input[type="text"]',
                value: '{{keyword}}',
                description: 'Type keyword to trigger app suggestions'
            },
            {
                action: 'waitFor',
                selector: 'body',
                description: 'Wait for suggestions to load after typing',
                timeout: 3000
            }
        ],

        // Phase 2: Apps Web - Web app exploration  
        appsWebExploration: [
            {
                action: 'click',
                selector: 'button:has-text("Web")',
                description: 'Switch to Web apps tab',
                retryCount: 2
            },
            {
                action: 'waitFor',
                selector: 'text=Search on Web...',
                description: 'Wait for Web search button',
                timeout: 3000
            },
            {
                action: 'click',
                selector: 'text=Search on Web...',
                description: 'Open Web search modal',
                retryCount: 2
            },
            {
                action: 'fill',
                selector: 'input[type="text"]',
                value: '{{keyword}}',
                description: 'Type keyword for web app suggestions'
            },
            {
                action: 'waitFor',
                selector: 'text={{webApp}}',
                description: 'Wait for web app suggestions',
                timeout: 3000
            }
        ],

        // Phase 3: Flows search with category filtering
        flowsSearch: [
            {
                action: 'click',
                selector: 'text=Search on iOS...',
                description: 'Open search modal for flows',
                retryCount: 2
            },
            {
                action: 'fill',
                selector: 'input[type="text"]',
                value: '{{keyword}}',
                description: 'Type keyword to see flow options'
            },
            {
                action: 'waitFor',
                selector: 'text=Search in Flows',
                description: 'Wait for flows search option',
                timeout: 3000
            },
            {
                action: 'click',
                selector: 'text=Search in Flows',
                description: 'Click to search in flows section',
                retryCount: 2
            },
            {
                action: 'waitFor',
                selector: '.category-filter, .filter-category',
                description: 'Wait for category filters to appear',
                timeout: 5000
            }
        ],

        // Phase 4: Screens search and curation
        screensSearch: [
            {
                action: 'click',
                selector: 'text=Search on iOS...',
                description: 'Open search modal for screens',
                retryCount: 2
            },
            {
                action: 'fill',
                selector: 'input[type="text"]',
                value: '{{keyword}}',
                description: 'Type keyword to see screen options'
            },
            {
                action: 'waitFor',
                selector: 'text=Search in Screens',
                description: 'Wait for screens search option',
                timeout: 3000
            },
            {
                action: 'click',
                selector: 'text=Search in Screens',
                description: 'Click to search in screens section',
                retryCount: 2
            },
            {
                action: 'waitFor',
                selector: '.design-card, .result-item, .screen-result',
                description: 'Wait for screen results to load',
                timeout: 8000
            }
        ],

        // URL extraction workflows
        extractAppUrl: [
            {
                action: 'click',
                selector: 'text={{appName}}',
                description: 'Click on specific app suggestion',
                retryCount: 2
            },
            {
                action: 'waitFor',
                selector: '.design-card, .app-screens',
                description: 'Wait for app page to load',
                timeout: 8000
            }
        ],

        extractFlowUrl: [
            {
                action: 'click',
                selector: '{{flowSelector}}',
                description: 'Click on specific flow result',
                retryCount: 2
            },
            {
                action: 'waitFor',
                selector: '.modal, [role="dialog"]',
                description: 'Wait for flow modal to open',
                timeout: 3000
            },
            {
                action: 'press',
                value: 'Escape',
                description: 'Close modal to return to results',
                retryCount: 1
            }
        ],

        extractScreenUrl: [
            {
                action: 'click',
                selector: '{{screenSelector}}',
                description: 'Click on specific screen result',
                retryCount: 2
            },
            {
                action: 'waitFor',
                selector: '.modal, [role="dialog"]',
                description: 'Wait for screen modal to open',
                timeout: 3000
            },
            {
                action: 'press',
                value: 'Escape',
                description: 'Close modal to return to results',
                retryCount: 1
            }
        ]
    },

    // Rate limiting configuration
    rateLimit: {
        requestsPerMinute: 30, // Conservative rate limit
        delayBetweenRequests: 2000 // 2 seconds between requests
    },

    // Anti-bot detection countermeasures
    antiBot: {
        useRandomDelays: true,
        simulateHumanBehavior: true,
        rotateUserAgents: true
    }
};

/**
 * Platform-specific workflow templates
 */
export const PLATFORM_WORKFLOWS = {
    web: 'webSearch',
    ios: 'iosSearch',
    android: 'androidSearch',
    all: 'basicSearch'
} as const;

/**
 * Category selector mapping
 */
export const CATEGORY_SELECTORS = {
    fintech: 'text=Finance, button:has-text("Fintech"), [data-category="fintech"], [data-category="finance"]',
    ecommerce: 'button:has-text("E-commerce"), [data-category="ecommerce"]',
    social: 'button:has-text("Social"), [data-category="social"]',
    productivity: 'button:has-text("Productivity"), [data-category="productivity"]',
    general: '' // No specific category filter
} as const;

/**
 * Common search patterns for different design types
 */
export const SEARCH_PATTERNS = {
    authentication: ['login', 'sign in', 'authentication', 'oauth', 'social login'],
    onboarding: ['onboarding', 'welcome', 'getting started', 'first time', 'tutorial'],
    ecommerce: ['checkout', 'cart', 'product', 'shopping', 'payment'],
    fintech: ['payment', 'banking', 'finance', 'card', 'transaction', 'kyc'],
    social: ['feed', 'profile', 'chat', 'messaging', 'social'],
    navigation: ['menu', 'navigation', 'sidebar', 'tabs', 'bottom nav']
} as const;

/**
 * Fallback selectors for when primary selectors fail
 */
export const FALLBACK_SELECTORS = {
    searchInput: [
        'input[placeholder*="Search"]',
        'input[type="search"]',
        'input[name="search"]',
        'input[id*="search"]',
        '.search-input',
        '[data-testid*="search"]'
    ],
    searchButton: [
        'button[type="submit"]',
        'button:has-text("Search")',
        '.search-button',
        '.search-btn',
        '[data-testid*="search"]'
    ],
    resultCards: [
        '.design-card',
        '.result-item',
        '.app-card',
        '.card',
        '[data-testid="design-card"]',
        '.grid-item'
    ]
} as const;
