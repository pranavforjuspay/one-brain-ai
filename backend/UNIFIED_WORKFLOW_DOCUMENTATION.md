# Unified Workflow Documentation

## Overview

The unified workflow simplifies Mobbin scraping by providing a single, standardized process that works for all types of queries. Instead of having different workflows for apps, flows, and screens, we now have one unified approach that handles everything consistently.

## Architecture

### Before (Complex Multi-Route System)
```
User Query → Route Decision → Different Workflows
├── /apps/search → Complex app-specific scraping
├── /flows/search → Complex flow-specific scraping  
├── /screens/search → Complex screen-specific scraping
└── /comprehensive/search → Progressive multi-path scraping
```

### After (Unified System)
```
User Query → Keyword Extraction → Route Decision (metadata only) → Unified Workflow
└── /unified/search → Same workflow for all queries
```

## User Query Processing Flow

### Step 1: Request Received
```http
POST /unified/search
Content-Type: application/json

{
  "problemStatement": "I need fintech login screens with biometric authentication",
  "thumbnailsPerKeyword": 5
}
```

### Step 2: Keyword Extraction
The system extracts relevant keywords from the problem statement:

```typescript
// Input: "I need fintech login screens with biometric authentication"
// Output: ["fintech", "login", "biometric", "authentication"]

const keywords = UnifiedScrapingService.extractKeywords(problemStatement);
```

**Keyword Extraction Logic:**
- Scans for predefined terms: `login`, `banking`, `biometric`, `authentication`, `mobile`, `ios`, `android`, `web`, `fintech`, `payment`, `checkout`, `ecommerce`, `onboarding`, `signup`, `dashboard`, `profile`, `settings`, `wallet`, `transfer`, `card`, `security`, `verification`
- If no predefined terms found, extracts meaningful words (length > 3, excluding common words)
- Limits to maximum 5 keywords

### Step 3: Route Decision (Metadata Only)
The system decides which route would have been used in the old system, but this is **only for logging/metadata**:

```typescript
// Input: ["fintech", "login", "biometric", "authentication"]
// Output: "screens" (because "login" suggests screen-level patterns)

const routeDecision = UnifiedScrapingService.decideRoute(keywords);
```

**Route Decision Logic:**
- `apps`: Keywords include "app", "banking", "fintech" → Complete app experiences
- `flows`: Keywords include "flow", "onboarding", "checkout" → Multi-step processes  
- `screens`: Keywords include "screen", "login", "dashboard" → Interface patterns
- Default: `apps`

### Step 4: Unified Scraping Workflow
**The same workflow executes regardless of route decision:**

```typescript
// 1. Authentication
await authService.authenticate(); // Uses MobbinAuthService

// 2. For each keyword:
for (const keyword of keywords) {
  // 2a. Click search
  await mcpClient.click('search-input');
  
  // 2b. Type keyword + Enter
  await mcpClient.fill('search-input', keyword);
  await mcpClient.pressKey('Enter');
  
  // 2c. Wait for results
  await mcpClient.waitFor('body', { timeout: 5000 });
  
  // 2d. Open first N thumbnails
  for (let i = 0; i < thumbnailsPerKeyword; i++) {
    await mcpClient.click(`thumbnail:nth-child(${i + 1})`);
    const url = mcpClient.url; // Capture modal URL
    results.push({ keyword, url, thumbnailIndex: i + 1 });
    await mcpClient.pressKey('Escape'); // Close modal
  }
}
```

### Step 5: Response Formatting
The system returns organized results:

```json
{
  "requestId": "abc123",
  "problemStatement": "I need fintech login screens with biometric authentication",
  
  "analysis": {
    "extractedKeywords": ["fintech", "login", "biometric", "authentication"],
    "routeDecision": "screens",
    "routeDecisionReason": "Login suggests specific screen-level patterns"
  },
  
  "results": {
    "summary": "Found 20 design references across 4 keywords",
    "totalResults": 20,
    "executionTime": 45000,
    
    "byKeyword": {
      "fintech": [
        { "url": "https://mobbin.com/apps/...", "thumbnailIndex": 1 },
        { "url": "https://mobbin.com/apps/...", "thumbnailIndex": 2 }
      ],
      "login": [...]
    },
    
    "allResults": [
      { "keyword": "fintech", "url": "https://...", "thumbnailIndex": 1 },
      { "keyword": "fintech", "url": "https://...", "thumbnailIndex": 2 }
    ]
  },
  
  "execution": {
    "workflow": "unified",
    "authenticationUsed": true,
    "thumbnailsPerKeyword": 5,
    "routeDecisionNote": "Route decision is informational only"
  }
}
```

## API Endpoints

### 1. Main Search Endpoint
```http
POST /unified/search
```
Executes the full unified workflow with browser automation.

**Request:**
```json
{
  "problemStatement": "string (required)",
  "thumbnailsPerKeyword": "number (optional, default: 5)"
}
```

**Response:** Complete results with URLs captured from Mobbin

### 2. Analysis Endpoint  
```http
POST /unified/analyze
```
Analyzes keywords and route decision without executing scraping.

**Request:**
```json
{
  "problemStatement": "string (required)"
}
```

**Response:** Analysis results showing what would be executed

### 3. Health Check
```http
GET /unified/health
```
Returns system status and workflow information.

## Benefits of Unified Approach

### 1. Simplicity
- **One workflow** instead of multiple complex paths
- **Same logic** regardless of query type
- **Easier maintenance** with single codebase

### 2. Consistency
- **Predictable results** across all query types
- **Same authentication** process for all requests
- **Uniform error handling** and logging

### 3. Reliability
- **Proven authentication service** (MobbinAuthService)
- **Working click strategies** from multi-strategy testing
- **Robust error recovery** with fallback selectors

### 4. Flexibility
- **Route decisions preserved** for future enhancements
- **Easy to modify** workflow in one place
- **Configurable parameters** (thumbnails per keyword)

## Technical Implementation

### Core Components

1. **UnifiedScrapingService** (`/src/scraping/core/UnifiedScrapingService.ts`)
   - Main service class handling the unified workflow
   - Static methods for keyword extraction and route decision
   - Browser automation using PlaywrightMCPClient

2. **Unified Routes** (`/src/routes.unified.ts`)
   - REST API endpoints for unified functionality
   - Request validation and response formatting
   - Error handling and logging

3. **MobbinAuthService** (`/src/scraping/auth/MobbinAuthService.ts`)
   - Centralized authentication (unchanged)
   - Handles login flow with environment variables
   - Used by unified workflow

4. **PlaywrightMCPClient** (`/src/scraping/core/PlaywrightMCPClient.ts`)
   - Browser automation wrapper (unchanged)
   - Multi-strategy click functionality
   - MCP server integration

### Integration Points

The unified system integrates with existing components:

- **Existing routes remain unchanged** for backward compatibility
- **Authentication service reused** without modifications  
- **MCP infrastructure leveraged** for browser automation
- **Logging and error handling** consistent with existing patterns

## Testing

### Test File: `test-unified-route.ts`

The test file validates three scenarios:

1. **Health Check** - Verifies system components are operational
2. **Keyword Analysis** - Tests keyword extraction and route decision
3. **Full Search** - Executes complete workflow with browser automation

### Running Tests

```bash
# Start the backend server
cd backend && npm run dev

# In another terminal, run the test
cd backend && npx tsx test-unified-route.ts
```

## Migration Guide

### For Frontend/Plugin Integration

**Old approach:**
```javascript
// Different endpoints for different types
const appsResponse = await fetch('/apps/search', { ... });
const flowsResponse = await fetch('/flows/search', { ... });
const screensResponse = await fetch('/screens/search', { ... });
```

**New approach:**
```javascript
// Single endpoint for everything
const response = await fetch('/unified/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    problemStatement: userQuery,
    thumbnailsPerKeyword: 5
  })
});
```

### Response Format Changes

The unified response includes:
- **Analysis section** with extracted keywords and route decision
- **Results section** with both grouped (by keyword) and flat arrays
- **Execution metadata** with workflow information
- **Troubleshooting information** in error responses

## Future Enhancements

The unified approach enables future improvements:

1. **Smart Keyword Expansion** - AI-powered keyword enhancement
2. **Dynamic Thumbnail Limits** - Adjust based on keyword relevance
3. **Result Ranking** - Score and sort results by relevance
4. **Caching Layer** - Cache results for common keywords
5. **Parallel Processing** - Process multiple keywords simultaneously
6. **Custom Selectors** - Adapt to Mobbin UI changes automatically

## Troubleshooting

### Common Issues

1. **Authentication Failure**
   - Check `MOBBIN_EMAIL` and `MOBBIN_PASSWORD` in `.env`
   - Verify credentials work on Mobbin website

2. **Browser Automation Timeout**
   - Check MCP server is running correctly
   - Verify network connectivity to Mobbin

3. **No Results Found**
   - Check if keywords are being extracted correctly
   - Verify thumbnail selectors match current Mobbin UI

4. **Route Decision Unexpected**
   - Route decision is metadata only - doesn't affect execution
   - Check keyword extraction logic if needed

### Debug Mode

Set `headless: false` in UnifiedScrapingService to see browser actions:

```typescript
await this.mcpClient.navigate('https://mobbin.com', {
  headless: false, // Shows browser for debugging
  // ...
});
```

## Conclusion

The unified workflow simplifies the Mobbin scraping system while maintaining all existing functionality. It provides a single, reliable path for all queries while preserving the flexibility to enhance specific routes in the future.

The system is now easier to maintain, test, and extend, while providing consistent results across all types of design research queries.
