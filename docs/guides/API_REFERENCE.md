# One Brain AI - API Reference

*Complete API documentation for the One Brain AI design inspiration system*

## 🌐 Base URL

```
http://localhost:8787  (Development)
https://your-domain.com  (Production)
```

## 🔑 Authentication

Currently, the API does not require authentication for local development. In production, implement appropriate authentication mechanisms.

## 📋 API Endpoints

### 1. Design Inspiration Search

**Endpoint:** `POST /inspiration/mobbin-search`

**Description:** Main endpoint for AI-powered design inspiration discovery. Takes a natural language query and returns curated design examples from Mobbin.

#### Request Body
```json
{
  "problemStatement": "string (required)",
  "thumbnailsPerKeyword": "number (optional, default: 5)"
}
```

#### Example Request
```bash
curl -X POST http://localhost:8787/inspiration/mobbin-search \
  -H "Content-Type: application/json" \
  -d '{
    "problemStatement": "I need inspiration for a crypto trading app onboarding flow",
    "thumbnailsPerKeyword": 8
  }'
```

#### Response Format
```json
{
  "success": true,
  "data": {
    "explanation": "string - AI-generated explanation of results",
    "results": [
      {
        "keyword": "string - search keyword used",
        "url": "string - Mobbin design URL",
        "confidence": "number - relevance confidence (0-1)",
        "metadata": {
          "route": "string - apps/flows/screens",
          "timestamp": "string - ISO timestamp"
        }
      }
    ],
    "summary": {
      "totalResults": "number",
      "keywordsUsed": ["string"],
      "processingTime": "number - milliseconds",
      "method": "string - llm/fallback"
    }
  }
}
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "explanation": "Here are design examples for crypto trading app onboarding flows. These examples show how leading fintech apps handle user verification, wallet setup, and security features...",
    "results": [
      {
        "keyword": "onboarding",
        "url": "https://mobbin.com/screens/12345",
        "confidence": 0.95,
        "metadata": {
          "route": "flows",
          "timestamp": "2024-01-15T10:30:00Z"
        }
      },
      {
        "keyword": "crypto",
        "url": "https://mobbin.com/screens/67890",
        "confidence": 0.88,
        "metadata": {
          "route": "apps",
          "timestamp": "2024-01-15T10:30:05Z"
        }
      }
    ],
    "summary": {
      "totalResults": 15,
      "keywordsUsed": ["onboarding", "crypto", "trading", "coinbase", "binance"],
      "processingTime": 45000,
      "method": "llm"
    }
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string",
    "details": "object (optional)"
  }
}
```

### 2. Keyword Extraction

**Endpoint:** `POST /ai/extract-keywords`

**Description:** Extract search keywords from a natural language query using AI.

#### Request Body
```json
{
  "query": "string (required)"
}
```

#### Example Request
```bash
curl -X POST http://localhost:8787/ai/extract-keywords \
  -H "Content-Type: application/json" \
  -d '{
    "query": "I need inspiration for a banking app dashboard"
  }'
```

#### Response Format
```json
{
  "success": true,
  "data": {
    "keywords": [
      {
        "term": "string",
        "confidence": "number (0-1)",
        "type": "string - app/feature/pattern/industry"
      }
    ],
    "method": "string - llm/fallback",
    "processingTime": "number - milliseconds"
  }
}
```

### 3. Health Check

**Endpoint:** `GET /health`

**Description:** Check system health and component status.

#### Response Format
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "components": {
    "database": "connected",
    "vertexAI": "available",
    "playwright": "ready"
  },
  "version": "1.0.0"
}
```

### 4. Documentation Routes

**Endpoint:** `POST /docs/save`

**Description:** Save design documentation (if using the documentation feature).

#### Request Body
```json
{
  "title": "string (required)",
  "content": "string (required)",
  "tags": ["string"],
  "figmaFileId": "string (optional)"
}
```

**Endpoint:** `GET /docs/:id`

**Description:** Retrieve saved documentation by ID.

## 🔧 Configuration Parameters

### Thumbnail Capture Control

Control how many design examples are captured per keyword:

```json
{
  "problemStatement": "your query",
  "thumbnailsPerKeyword": 5  // Default: 5, Range: 1-15
}
```

**Impact on Results:**
- `thumbnailsPerKeyword: 3` → Faster, fewer results
- `thumbnailsPerKeyword: 5` → Balanced (default)
- `thumbnailsPerKeyword: 10` → More comprehensive, slower

### AI Model Selection

Configure via environment variables:

```env
# Balanced performance and quality
ONE_BRAIN_MODEL="claude-3-sonnet-20240229"

# Highest quality (slower, more expensive)
ONE_BRAIN_MODEL="claude-3-opus-20240229"

# Fastest (lower quality)
ONE_BRAIN_MODEL="claude-3-haiku-20240307"
```

## 📊 Response Times

### Typical Performance
- **Keyword Extraction:** 2-5 seconds
- **Mobbin Scraping:** 30-90 seconds (depends on thumbnailsPerKeyword)
- **AI Explanation:** 3-8 seconds
- **Total Request:** 45-120 seconds

### Factors Affecting Performance
- Number of keywords extracted (2-8 typical)
- `thumbnailsPerKeyword` setting
- Mobbin site responsiveness
- Google Cloud Vertex AI latency
- Network connectivity

## 🚨 Error Codes

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `INVALID_REQUEST` | Malformed request body | Check JSON format and required fields |
| `AI_SERVICE_ERROR` | Vertex AI unavailable | Check Google Cloud credentials and quotas |
| `SCRAPING_FAILED` | Mobbin scraping failed | Verify Mobbin credentials and site availability |
| `TIMEOUT_ERROR` | Request exceeded timeout | Reduce thumbnailsPerKeyword or retry |
| `AUTHENTICATION_FAILED` | Mobbin login failed | Check MOBBIN_EMAIL and MOBBIN_PASSWORD |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Implement request throttling |

### Error Response Examples

#### AI Service Error
```json
{
  "success": false,
  "error": {
    "code": "AI_SERVICE_ERROR",
    "message": "Failed to connect to Vertex AI",
    "details": {
      "provider": "google-vertex",
      "model": "claude-3-sonnet-20240229",
      "retryable": true
    }
  }
}
```

#### Scraping Failed
```json
{
  "success": false,
  "error": {
    "code": "SCRAPING_FAILED",
    "message": "Unable to authenticate with Mobbin",
    "details": {
      "step": "authentication",
      "retryable": false
    }
  }
}
```

## 🔄 Rate Limiting

### Current Limits
- **Mobbin Scraping:** 30 requests per minute
- **AI Keyword Extraction:** 60 requests per minute
- **Overall API:** 100 requests per minute per IP

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642234567
```

## 🧪 Testing the API

### Basic Connectivity Test
```bash
curl http://localhost:8787/health
```

### Keyword Extraction Test
```bash
curl -X POST http://localhost:8787/ai/extract-keywords \
  -H "Content-Type: application/json" \
  -d '{"query": "fintech app onboarding"}'
```

### Full Inspiration Search Test
```bash
curl -X POST http://localhost:8787/inspiration/mobbin-search \
  -H "Content-Type: application/json" \
  -d '{
    "problemStatement": "I need inspiration for a simple banking app login screen",
    "thumbnailsPerKeyword": 3
  }'
```

## 📝 Integration Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

async function getDesignInspiration(query) {
  try {
    const response = await axios.post('http://localhost:8787/inspiration/mobbin-search', {
      problemStatement: query,
      thumbnailsPerKeyword: 5
    });
    
    return response.data;
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
getDesignInspiration('crypto wallet onboarding')
  .then(result => console.log(result))
  .catch(error => console.error(error));
```

### Python
```python
import requests
import json

def get_design_inspiration(query, thumbnails_per_keyword=5):
    url = "http://localhost:8787/inspiration/mobbin-search"
    payload = {
        "problemStatement": query,
        "thumbnailsPerKeyword": thumbnails_per_keyword
    }
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"API Error: {e}")
        raise

# Usage
result = get_design_inspiration("fintech app dashboard")
print(json.dumps(result, indent=2))
```

### cURL Scripts
```bash
#!/bin/bash
# save as test-api.sh

QUERY="$1"
THUMBNAILS="${2:-5}"

curl -X POST http://localhost:8787/inspiration/mobbin-search \
  -H "Content-Type: application/json" \
  -d "{
    \"problemStatement\": \"$QUERY\",
    \"thumbnailsPerKeyword\": $THUMBNAILS
  }" | jq .

# Usage: ./test-api.sh "banking app onboarding" 8
```

## 🔒 Security Considerations

### Input Validation
- All inputs are sanitized and validated
- Maximum query length: 1000 characters
- thumbnailsPerKeyword range: 1-15

### Data Privacy
- No user queries are permanently stored
- All browser sessions are cleaned up after use
- No personal data is transmitted to external services

### Production Security
- Implement API authentication (JWT, API keys)
- Use HTTPS for all communications
- Set up proper CORS policies
- Implement request logging and monitoring

---

*For more technical details about the system architecture, see the [System Architecture Guide](../SYSTEM_ARCHITECTURE_GUIDE.md).*
