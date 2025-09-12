# Mobbin Inspiration Feature - Technical Overview

## Executive Summary

The Mobbin Inspiration Feature is an AI-powered design inspiration system that integrates directly into Figma. It allows designers to search for relevant UI/UX patterns from Mobbin by simply describing their design problem in natural language. The system uses Claude AI to understand the query, extract intelligent search terms, scrape Mobbin for relevant designs, and present results with conversational explanations.

**Key Value Proposition:**
- Natural language design search ("I need inspiration for a crypto trading app onboarding flow")
- AI-powered search intent extraction and keyword generation
- Automated Mobbin scraping with intelligent thumbnail clicking
- Conversational explanations of why results are relevant
- Direct integration into Figma workflow (no context switching)

## Technical Architecture

### System Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Figma Plugin  │───▶│  Backend API     │───▶│  Claude AI      │
│   (TypeScript)  │    │  (Fastify/Node)  │    │  (Vertex AI)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Mobbin Scraper  │
                       │  (Playwright MCP)│
                       └──────────────────┘
```

### Technology Stack

**Frontend (Figma Plugin):**
- TypeScript with Figma Plugin API
- Custom UI with HTML/CSS
- 5-minute timeout handling for long operations
- CSP-compliant network requests

**Backend API:**
- Fastify (Node.js) server on port 8787
- RESTful API with `/inspiration/mobbin-search` endpoint
- Comprehensive logging and error handling
- Environment-based configuration

**AI Integration:**
- Claude Sonnet 4 via Google Vertex AI
- Google Cloud authentication with `gcloud` CLI
- Structured prompts for search intent extraction
- Conversational response generation

**Web Scraping:**
- Playwright browser automation via MCP (Model Context Protocol)
- Headless Chrome for production scraping
- Authenticated Mobbin access with session management
- Intelligent thumbnail clicking and URL capture

## How It Works - Step by Step

### 1. User Input Processing
```
User types: "I need inspiration for a crypto trading app onboarding flow"
↓
Plugin validates input and shows loading state
↓
Sends POST request to /inspiration/mobbin-search
```

### 2. AI-Powered Search Intent Extraction
```
Backend receives query
↓
Calls Claude AI with specialized prompt:
- Extract UI patterns (e.g., "KYC verification", "card onboarding")
- Identify screen types (e.g., "Welcome screen", "Identity verification")  
- Find comparable apps (e.g., "Revolut", "Wise", "Brex")
- Generate search keywords (e.g., "onboarding", "KYC", "fintech")
↓
Returns structured SearchIntent object with 4 categories, max 5 items each
```

### 3. Intelligent Mobbin Scraping
```
UnifiedScrapingService initializes
↓
Authenticates with Mobbin using stored credentials
↓
For each extracted keyword:
  - Opens search modal
  - Types keyword and presses Enter
  - Waits for results page
  - Clicks first 5 thumbnails using DOM manipulation
  - Captures URLs when modals open (/screens/[id] format)
  - Closes modals and continues
↓
Returns array of MobbinResult objects with URLs and metadata
```

### 4. Conversational Response Generation
```
Claude AI receives:
- Original user query
- Extracted search intents  
- Found Mobbin results
↓
Generates friendly explanation:
"Here's what I found on Mobbin for crypto onboarding...
I discovered 15 relevant examples that show similar patterns..."
↓
Returns conversational text explaining relevance and context
```

### 5. Results Delivery
```
Backend combines all data:
{
  "conversationalResponse": "Here's what I found...",
  "mobbinLinks": [array of design URLs],
  "searchIntents": {extracted patterns/screens/comparables/keywords}
}
↓
Plugin receives results and displays in UI
↓
User clicks links to open Mobbin designs in browser
```

## API Endpoints and Data Structures

### Primary Endpoint
```
POST /inspiration/mobbin-search
Content-Type: application/json

Request Body:
{
  "problemStatement": "I need inspiration for a crypto trading app onboarding flow",
  "debugMode": false (optional)
}

Response:
{
  "conversationalResponse": "Here's what I found on Mobbin for crypto onboarding...",
  "mobbinLinks": [
    {
      "title": "Design Pattern 1",
      "url": "https://mobbin.com/screens/01893f1c-196f-49b1-aab9-48e52220a262",
      "appName": "Mobbin App",
      "category": "Design", 
      "tags": ["onboarding"],
      "whyRelevant": "Relevant design pattern for onboarding",
      "relevanceScore": 0.8
    }
  ],
  "searchIntents": {
    "patterns": ["Crypto onboarding", "Trading app signup", "KYC verification"],
    "screens": ["Welcome screen", "Identity verification", "Account setup"],
    "comparables": ["Coinbase", "Robinhood", "Binance"],
    "keywords": ["crypto", "onboarding", "trading", "kyc", "verification"]
  }
}
```

### Error Handling
```
HTTP 400: Missing or invalid problemStatement
HTTP 500: Internal server error with fallback response
{
  "error": "Failed to search for inspiration",
  "conversationalResponse": "I'm sorry, I encountered an issue...",
  "mobbinLinks": [],
  "searchIntents": { patterns: [], screens: [], comparables: [], keywords: [] }
}
```

## Implementation Details

### LLM Integration Architecture
- **Model**: Claude Sonnet 4 via Google Vertex AI
- **Authentication**: Google Cloud service account with `gcloud auth print-access-token`
- **Prompting Strategy**: Specialized system prompts for each task (search intent extraction, conversational response)
- **Fallback Handling**: Local keyword extraction if AI fails
- **Rate Limiting**: Built-in Vertex AI quotas and error handling

### Web Scraping Implementation
- **Browser**: Headless Chromium via Playwright MCP server
- **Authentication**: Automated login with email/password stored in environment
- **Thumbnail Strategy**: DOM manipulation to click image parent links, avoiding brand name conflicts
- **URL Capture**: Real-time monitoring for `/screens/[id]` pattern changes
- **Error Recovery**: Modal cleanup, escape key handling, graceful degradation

### Plugin Integration
- **Timeout Handling**: 300-second (5-minute) timeout using Promise.race()
- **CSP Compliance**: Only uses `localhost:8787` to avoid Content Security Policy violations
- **Loading States**: Progressive UI updates during 3-step process
- **Error Display**: User-friendly error messages with retry suggestions

### Performance Characteristics
- **Total Processing Time**: 2-3 minutes for full LLM + scraping workflow
- **Search Intent Extraction**: ~500ms with Claude AI
- **Mobbin Scraping**: ~30-45 seconds per keyword (5 thumbnails each)
- **Response Generation**: ~300ms with Claude AI
- **Typical Results**: 3-20 relevant Mobbin design URLs per query

## Key Technical Innovations

### 1. Dual-LLM Architecture
- **Search Intent LLM**: Extracts structured search terms from natural language
- **Response Generation LLM**: Creates conversational explanations of results
- **Fallback System**: Local classification when AI unavailable

### 2. Intelligent Web Scraping
- **DOM-Based Clicking**: JavaScript injection for precise thumbnail targeting
- **Modal Management**: Automated modal opening/closing with URL capture
- **Authentication Persistence**: Session management across multiple searches

### 3. Figma Plugin Optimization
- **Extended Timeouts**: 5-minute timeout accommodation for backend processing
- **CSP Compliance**: Careful URL management to avoid browser security blocks
- **Progressive Loading**: Step-by-step UI updates to maintain user engagement

### 4. Robust Error Handling
- **Multi-Level Fallbacks**: AI → Local classification → Mock data
- **Graceful Degradation**: Partial results when some components fail
- **Comprehensive Logging**: Detailed workflow tracking for debugging

## Request Processing Flow (Detailed)

```
1. Plugin Request (0ms)
   ├─ User types query in Figma plugin
   ├─ Plugin validates input and shows loading
   └─ POST to /inspiration/mobbin-search

2. Search Intent Extraction (0-1000ms)
   ├─ Backend receives request
   ├─ Calls Claude AI with extraction prompt
   ├─ Parses JSON response into SearchIntent object
   └─ Fallback to keyword extraction if AI fails

3. Mobbin Scraping Initialization (1000-5000ms)
   ├─ Initialize UnifiedScrapingService
   ├─ Launch headless Chrome browser
   ├─ Navigate to mobbin.com
   └─ Authenticate with stored credentials

4. Keyword-Based Scraping (5000-120000ms)
   ├─ For each extracted keyword:
   │  ├─ Open search modal
   │  ├─ Type keyword and press Enter
   │  ├─ Wait for results page load
   │  ├─ Click first 5 thumbnails sequentially
   │  ├─ Capture URL when modal opens
   │  ├─ Close modal with Escape key
   │  └─ Continue to next keyword
   └─ Collect all URLs and metadata

5. Response Generation (120000-125000ms)
   ├─ Call Claude AI with results summary prompt
   ├─ Generate conversational explanation
   └─ Combine all data into response object

6. Results Delivery (125000-130000ms)
   ├─ Send JSON response to plugin
   ├─ Plugin displays results in UI
   └─ User can click links to view designs
```

## Environment Configuration

### Required Environment Variables
```bash
# Google Cloud / Vertex AI
VERTEX_PROJECT=dev-ai-epsilon
VERTEX_LOCATION=us-east5
ONE_BRAIN_MODEL=claude-sonnet-4

# Mobbin Authentication
MOBBIN_EMAIL=your-email@domain.com
MOBBIN_PASSWORD=your-password

# Server Configuration  
PORT=8787
NODE_ENV=production
```

### Dependencies
```json
{
  "fastify": "^4.x",
  "playwright": "^1.x", 
  "@executeautomation/playwright-mcp-server": "latest",
  "node-fetch": "^3.x"
}
```

This system represents a sophisticated integration of AI, web scraping, and design tools to create a seamless inspiration discovery workflow for designers working in Figma.
