# V2 Keyword Extraction to Mobbin Scraping Workflow

## Overview
This document explains how V2 keyword extraction flows into Mobbin scraping decisions and URL capture configuration.

## Complete Flow Architecture

### 1. Entry Point: Plugin Integration Test
**File**: `backend/test-plugin-integration.ts`
- Sends POST request to `/inspiration/mobbin-search`
- Payload: `{ problemStatement: "I need inspiration for a crypto trading app onboarding flow" }`

### 2. Route Handler: Inspiration Route
**File**: `backend/src/routes.inspiration.ts`
- Receives user query via `/inspiration/mobbin-search` endpoint
- Calls `UnifiedScrapingService.scrapeFromUserQueryWithExplanation()`
- **Default URL Capture**: `thumbnailsPerKeyword = 5` (hardcoded in route)

### 3. V2 Keyword Extraction
**File**: `backend/src/scraping/ai/LLMKeywordServiceV2.ts`
- **Sophisticated Prompt Engineering**:
  - Brief type classification (flow, pattern, component, screen, style, domain)
  - Journey coverage (discover → evaluate → act → manage)
  - Brand intelligence (global + India-specific brands)
  - Weighted scoring: 35% intent fit, 25% yield, 20% brand relevance, 10% journey, 10% de-dupe
  - Canonical families: anchor, mechanics, structure, evaluation, management, comparables

### 4. Unified Scraping Service Decision Logic
**File**: `backend/src/scraping/core/UnifiedScrapingService.ts`

#### Key Decision Points:

**A. Keyword Processing**:
```typescript
// V2 keywords extracted with confidence scores
const keywordExtraction = await this.extractKeywordsWithLLM(userQuery);
const keywordStrings = keywordExtraction.keywords.map(k => k.term);
const llmConfidenceScores = keywordExtraction.keywords.map(k => k.confidence);
```

**B. Route Decision (Metadata Only)**:
```typescript
static decideRoute(keywords: string[]): string {
    const keywordText = keywords.join(' ').toLowerCase();
    
    if (keywordText.includes('app') || keywordText.includes('banking') || keywordText.includes('fintech')) {
        return 'apps';
    } else if (keywordText.includes('flow') || keywordText.includes('onboarding') || keywordText.includes('checkout')) {
        return 'flows';
    } else if (keywordText.includes('screen') || keywordText.includes('login') || keywordText.includes('dashboard')) {
        return 'screens';
    }
    
    return 'apps'; // Default to apps
}
```

**C. URL Capture Configuration**:
```typescript
// Default: 5 URLs per keyword
async scrapeFromUserQuery(
    userQuery: string,
    thumbnailsPerKeyword: number = 5  // ← THIS CONTROLS URL CAPTURE COUNT
): Promise<UnifiedScrapingResponse>

// Can be overridden via API:
const { problemStatement, thumbnailsPerKeyword = 5 } = request.body;
```

### 5. Mobbin Scraping Execution
**File**: `backend/src/scraping/core/UnifiedScrapingService.ts`

#### Workflow Per Keyword:
1. **Authentication**: Login to Mobbin using `MobbinAuthService`
2. **Search Modal**: Click "Search on iOS..." button
3. **Keyword Input**: Type V2-extracted keyword
4. **Search Execution**: Press Enter for general search
5. **Thumbnail Clicking**: Process exactly `thumbnailsPerKeyword` thumbnails (default: 5)
6. **URL Capture**: Extract URL when modal opens (`/screens/[uuid]`)
7. **Modal Cleanup**: Press Escape to close and continue

#### Thumbnail Clicking Logic:
```typescript
private async clickThumbnailsAndCaptureURLs(keyword: string, maxThumbnails: number): Promise<UnifiedScrapingResult[]> {
    const results: UnifiedScrapingResult[] = [];
    
    // SURGICAL FIX: Target only thumbnail links, not brand name links
    const THUMBNAIL_SELECTOR = 'div[data-sentry-component="ScreenCell"] > div.group.relative a';
    
    for (let i = 0; i < maxThumbnails; i++) {  // ← maxThumbnails = thumbnailsPerKeyword
        // Click thumbnail, capture URL, store result
        // Each iteration captures 1 URL
    }
    
    return results; // Returns exactly maxThumbnails URLs (or fewer if errors)
}
```

### 6. Configuration Files

#### A. Mobbin Configuration
**File**: `backend/src/scraping/config/mobbin.config.ts`
- **Selectors**: All CSS selectors for Mobbin elements
- **Workflows**: Pre-defined action sequences
- **Rate Limiting**: `requestsPerMinute: 30`, `delayBetweenRequests: 2000ms`
- **Anti-Bot**: Random delays, human behavior simulation

#### B. Scraping Types
**File**: `backend/src/scraping/types/scraping.types.ts`
- Defines interfaces for `UnifiedScrapingResult`, `UnifiedScrapingResponse`
- Type definitions for workflow steps and configurations

### 7. URL Capture Decision Matrix

| Component | Controls | Default Value | Override Method |
|-----------|----------|---------------|-----------------|
| **Route Handler** | `thumbnailsPerKeyword` parameter | `5` | Request body: `{ thumbnailsPerKeyword: N }` |
| **UnifiedScrapingService** | `maxThumbnails` in loop | `5` | Method parameter |
| **V2 Keywords** | Number of keywords extracted | `3-5` | LLM prompt engineering |
| **Total URLs** | `keywords.length × thumbnailsPerKeyword` | `15-25` | Calculated dynamically |

### 8. V2 Keyword Quality Impact

#### High-Quality Keywords (V2 Advantages):
- **Brand Intelligence**: "revolut", "wise", "paytm" → More targeted results
- **Journey Coverage**: "onboarding" + "verification" → Complete flow coverage  
- **Confidence Scoring**: 0.8+ confidence → Better search relevance
- **Canonical Families**: Organized by anchor/mechanics/structure → Systematic coverage

#### URL Capture Optimization:
```typescript
// V2 keywords are more precise, leading to:
// 1. Higher relevance scores on captured URLs
// 2. Better modal opening success rates  
// 3. More diverse design pattern coverage
// 4. Reduced duplicate/irrelevant captures
```

## Configuration Override Examples

### 1. Increase URL Capture Per Keyword
```typescript
// In route handler or API call:
const result = await unifiedScrapingService.scrapeFromUserQuery(
    userQuery,
    10  // Capture 10 URLs per keyword instead of 5
);
```

### 2. Modify via API Request
```json
{
    "problemStatement": "crypto trading app onboarding",
    "thumbnailsPerKeyword": 8
}
```

### 3. Keyword-Specific Capture Logic (Future Enhancement)
```typescript
// Potential enhancement: Dynamic thumbnailsPerKeyword based on keyword confidence
const thumbnailsPerKeyword = keyword.confidence > 0.8 ? 7 : 5;
```

## Key Files Summary

| File | Purpose | Controls |
|------|---------|----------|
| `routes.inspiration.ts` | API endpoint | Default `thumbnailsPerKeyword = 5` |
| `UnifiedScrapingService.ts` | Core scraping logic | Thumbnail clicking loop, URL capture |
| `LLMKeywordServiceV2.ts` | V2 keyword extraction | Keyword quality, confidence scores |
| `mobbin.config.ts` | Mobbin-specific config | Selectors, workflows, rate limits |
| `PlaywrightMCPClient.ts` | Browser automation | Headless mode, navigation, clicking |

## Current V2 Configuration Status

✅ **V2 Keywords**: Active and working with sophisticated prompt engineering  
✅ **URL Capture**: Fixed at 5 URLs per keyword (configurable)  
✅ **Thumbnail Clicking**: Robust selector-based approach  
✅ **Modal Handling**: Escape key cleanup workflow  
✅ **Authentication**: Automated Mobbin login  
✅ **Error Handling**: Fallback mechanisms for failed captures  

The "5 random URL captures" you mentioned is actually **5 systematic URL captures per keyword**, where the V2 keyword extraction determines which keywords to search for, and the UnifiedScrapingService captures exactly 5 design URLs for each keyword through automated thumbnail clicking.
