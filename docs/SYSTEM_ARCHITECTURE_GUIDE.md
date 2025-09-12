# System Architecture Guide - For Everyone

*A simple explanation of how the One Brain AI system works, written for non-technical people*

## 🎯 What Does This System Do?

Imagine you're a designer working in Figma, and you need inspiration for a specific design challenge. Instead of manually browsing through hundreds of design examples, you simply type what you need (like "crypto trading app onboarding") and the system automatically:

1. **Understands** what you're looking for using AI
2. **Finds** relevant design examples from Mobbin (a design inspiration website)
3. **Delivers** the results directly in Figma with explanations

It's like having a smart design assistant that never gets tired and knows exactly where to find the best examples.

## 🏗️ The Big Picture

Think of the system like a restaurant with three main areas:

### 1. **The Dining Room** (Figma Plugin)
- This is where you (the designer) sit and place your "order"
- You type what kind of design inspiration you want
- The results are served back to you here

### 2. **The Kitchen** (Backend Server)
- This is where all the work happens behind the scenes
- Takes your request and coordinates everything
- Like a head chef managing the entire operation

### 3. **The Pantry & Suppliers** (AI + Web Scraping)
- **AI (Claude)**: The smart ingredient expert who understands what you really need
- **Web Scraper**: The delivery person who goes to Mobbin and brings back the goods

## 🔄 How a Request Flows Through the System

Let's follow what happens when you search for "crypto trading app onboarding":

### Step 1: You Place Your Order (Figma Plugin)
```
You type: "I need inspiration for a crypto trading app onboarding flow"
↓
Plugin sends this to the backend server
```

### Step 2: The AI Understands Your Request (Backend + Claude AI)
```
Backend asks Claude AI: "What design patterns does this person need?"
↓
Claude AI responds: "They need: onboarding screens, KYC verification, 
wallet setup, security features. Look for apps like Coinbase, Robinhood."
```

### Step 3: The System Goes Shopping (Web Scraping)
```
System opens an invisible browser
↓
Logs into Mobbin automatically
↓
Searches for: "onboarding", "crypto", "KYC", "wallet"
↓
Clicks on design thumbnails one by one
↓
Captures the URLs of relevant designs
```

### Step 4: The AI Explains What It Found (Backend + Claude AI)
```
Claude AI looks at the results and writes:
"Here's what I found for crypto onboarding... These examples show 
how top apps handle user verification and wallet setup..."
```

### Step 5: You Get Your Results (Figma Plugin)
```
Plugin displays:
- Friendly explanation of what was found
- 15-20 clickable links to Mobbin designs
- Why each result is relevant to your request
```

## 🧩 System Components Explained Simply

### Figma Plugin (The Interface)
**What it is**: A small program that runs inside Figma
**What it does**: 
- Provides a search box where you type your request
- Shows loading messages while work is happening
- Displays results with clickable links
- Handles the 5-minute wait time (because AI + web scraping takes time)

**Files involved**: Everything in the `plugin/` folder

### Backend Server (The Coordinator)
**What it is**: A computer program running on port 8787
**What it does**:
- Receives requests from the Figma plugin
- Talks to Claude AI to understand what you need
- Manages the web scraping process
- Combines everything into a nice response

**Key files**:
- `backend/src/index.ts` - The main server
- `backend/src/routes.inspiration.ts` - Handles inspiration requests
- `backend/src/scraping/core/UnifiedScrapingService.ts` - Manages web scraping

### Claude AI (The Smart Assistant)
**What it is**: An advanced AI that understands natural language
**What it does**:
- Reads your design request
- Figures out what specific UI patterns you need
- Generates search keywords for Mobbin
- Writes friendly explanations of the results

**How it works**: The system sends your request to Google Cloud, which forwards it to Claude AI

### Web Scraping Engine (The Automatic Browser)
**What it is**: An invisible browser that can navigate websites automatically
**What it does**:
- Opens Mobbin.com without showing any windows
- Logs in using stored credentials
- Searches for design patterns
- Clicks on thumbnails to capture URLs
- Handles all the complex navigation automatically

**Key files**:
- `backend/src/scraping/core/PlaywrightMCPClient.ts` - Controls the browser
- `backend/src/scraping/auth/MobbinAuthService.ts` - Handles login

## 🔧 How the Pieces Connect

```
Figma Plugin ←→ Backend Server ←→ Claude AI
                      ↓
                Web Scraping Engine ←→ Mobbin.com
```

### Data Flow:
1. **Plugin → Backend**: "Find crypto onboarding designs"
2. **Backend → Claude AI**: "Extract search terms from this request"
3. **Claude AI → Backend**: "Search for: onboarding, crypto, KYC, wallet"
4. **Backend → Web Scraper**: "Go find designs for these terms"
5. **Web Scraper → Mobbin**: Automatically searches and captures URLs
6. **Backend → Claude AI**: "Explain these results to the user"
7. **Backend → Plugin**: Complete response with explanations and links

## 🎛️ Configuration & Settings

### Environment Variables (The System's Settings)
Think of these like the system's preferences:

- **VERTEX_PROJECT**: Which Google Cloud account to use for AI
- **MOBBIN_EMAIL/PASSWORD**: Login credentials for Mobbin
- **ONE_BRAIN_MODEL**: Which version of Claude AI to use

### Timeouts & Performance
- **Plugin timeout**: 5 minutes (because the whole process takes 2-3 minutes)
- **Browser mode**: Headless (invisible) for production
- **Typical results**: 15-20 design URLs per search

## 🚨 What Can Go Wrong?

### Common Issues:
1. **Browser appears when it shouldn't**: Debug mode is accidentally enabled
2. **Timeout errors**: The process takes longer than 5 minutes
3. **No results**: Mobbin login failed or search terms didn't match anything
4. **AI errors**: Google Cloud or Claude AI is temporarily unavailable

### How the System Handles Problems:
- **Fallback keywords**: If AI fails, uses simple word extraction
- **Retry logic**: Automatically retries failed operations
- **Error messages**: Shows helpful messages instead of crashing
- **Graceful degradation**: Returns partial results if some parts fail

## 🔒 Security & Privacy

### What's Stored:
- Mobbin login credentials (in environment variables)
- No user data or search history is permanently stored
- Temporary browser sessions are cleaned up after each search

### What's Shared:
- Your search queries are sent to Claude AI for processing
- No personal information leaves your system
- All communication uses secure HTTPS connections

## 📊 Performance Characteristics

### Typical Request Timeline:
- **0-5 seconds**: AI extracts search terms
- **5-120 seconds**: Web scraping finds designs (varies by number of keywords)
- **120-125 seconds**: AI generates explanation
- **Total**: 2-3 minutes for complete results

### Resource Usage:
- **Memory**: Moderate (browser automation requires some RAM)
- **CPU**: Low to moderate during scraping
- **Network**: Moderate (downloading web pages and images)

## 🛠️ For Developers: File Organization

### Plugin Files (`plugin/`):
- `src/code.ts` - Main plugin logic and UI communication
- `src/ui.ts` - User interface components
- `manifest.json` - Plugin configuration

### Backend Files (`backend/src/`):
- `index.ts` - Server startup and route registration
- `routes.inspiration.ts` - Main inspiration search endpoint
- `scraping/core/` - Web scraping engine
- `scraping/ai/` - AI integration services

### Documentation (`docs/`):
- `README.md` - Documentation index
- `technical/` - Technical deep-dives
- `guides/` - User setup guides

## 🎓 Learning More

### For Non-Technical Users:
- Start with this guide
- Check the [User Guides](guides/) for setup instructions
- Review [Troubleshooting](guides/TROUBLESHOOTING.md) for common issues

### For Developers:
- Read the [Technical Documentation](technical/)
- Examine the [API Reference](API_REFERENCE.md)
- Study the [Mobbin Inspiration Feature Overview](MOBBIN_INSPIRATION_FEATURE_OVERVIEW.md)

### For System Administrators:
- Follow the [Deployment Guide](DEPLOYMENT_GUIDE.md)
- Configure environment variables properly
- Monitor system performance and logs

---

*This guide explains the system in simple terms. For technical details, see the other documentation files in this folder.*
