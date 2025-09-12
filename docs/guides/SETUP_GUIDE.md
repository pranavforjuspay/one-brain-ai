# One Brain AI - Setup Guide

*A comprehensive guide for setting up the One Brain AI design inspiration system*

## 🎯 What You'll Have After Setup

A fully functional AI-powered design inspiration system that:
- Works inside Figma as a plugin
- Understands natural language queries like "crypto trading app onboarding"
- Automatically searches Mobbin for relevant design examples
- Returns 15-20 curated design URLs with AI explanations

## 📋 Prerequisites

### Required Software
- **Node.js 18+** - [Download here](https://nodejs.org/)
- **PostgreSQL** - [Download here](https://www.postgresql.org/download/)
- **Figma Desktop App** - [Download here](https://www.figma.com/downloads/)
- **Git** - [Download here](https://git-scm.com/downloads/)

### Required Accounts
- **Google Cloud Platform** account with billing enabled
- **Mobbin.com** account (for design scraping)
- **Figma** account (for plugin development)

### Required Credentials
- Google Cloud service account JSON file
- Mobbin login credentials
- Figma plugin development access

## 🚀 Step-by-Step Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd one-brain-ai

# Install backend dependencies
cd backend
npm install

# Install plugin dependencies
cd ../plugin
npm install
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb onebrain

# Set up database schema
cd backend
npx prisma generate
npx prisma db push
```

### 3. Google Cloud Setup

#### A. Create Service Account
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Vertex AI API
4. Create a service account with Vertex AI permissions
5. Download the JSON key file

#### B. Configure Environment
```bash
# Place the JSON file in a secure location
cp path/to/your/service-account.json backend/config/gcp-credentials.json
```

### 4. Environment Configuration

Create `backend/.env` file:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/onebrain"

# Server
PORT=8787
NODE_ENV=development

# Google Cloud (Vertex AI)
GOOGLE_APPLICATION_CREDENTIALS="./config/gcp-credentials.json"
GOOGLE_CLOUD_PROJECT="your-project-id"
GOOGLE_CLOUD_LOCATION="us-central1"

# Mobbin Credentials
MOBBIN_EMAIL="your-mobbin-email@example.com"
MOBBIN_PASSWORD="your-mobbin-password"

# AI Configuration
ONE_BRAIN_MODEL="claude-3-sonnet-20240229"
VERTEX_PROJECT="your-project-id"
VERTEX_LOCATION="us-central1"
```

### 5. Start the Backend

```bash
cd backend
npm run dev
```

You should see:
```
🚀 Server running on http://localhost:8787
✅ Database connected
✅ Vertex AI configured
```

### 6. Build and Install Figma Plugin

```bash
cd plugin
npm run build
```

#### Install in Figma:
1. Open Figma Desktop App
2. Go to **Plugins** → **Development** → **Import plugin from manifest**
3. Select `plugin/manifest.json`
4. The plugin should appear in your plugins list

### 7. Test the System

#### A. Test Backend API
```bash
curl -X POST http://localhost:8787/inspiration/mobbin-search \
  -H "Content-Type: application/json" \
  -d '{"problemStatement": "crypto trading app onboarding"}'
```

#### B. Test Figma Plugin
1. Open any Figma file
2. Run the "One Brain AI" plugin
3. Type: "I need inspiration for a banking app dashboard"
4. Wait 2-3 minutes for results

## 🔧 Configuration Options

### Thumbnail Capture Settings
```javascript
// In API requests, control how many designs per keyword
{
  "problemStatement": "your query",
  "thumbnailsPerKeyword": 8  // Default: 5
}
```

### Browser Mode
```env
# For debugging (shows browser window)
PLAYWRIGHT_HEADLESS=false

# For production (invisible browser)
PLAYWRIGHT_HEADLESS=true
```

### AI Model Selection
```env
# Available models
ONE_BRAIN_MODEL="claude-3-sonnet-20240229"     # Balanced
ONE_BRAIN_MODEL="claude-3-opus-20240229"       # Most capable
ONE_BRAIN_MODEL="claude-3-haiku-20240307"      # Fastest
```

## 🚨 Troubleshooting

### Common Issues

#### "Database connection failed"
```bash
# Check PostgreSQL is running
pg_ctl status

# Verify database exists
psql -l | grep onebrain
```

#### "Google Cloud authentication failed"
```bash
# Test credentials
gcloud auth application-default login
gcloud config set project your-project-id
```

#### "Mobbin login failed"
- Verify credentials in `.env` file
- Check if Mobbin account is active
- Try logging in manually at mobbin.com

#### "Plugin not loading in Figma"
```bash
# Rebuild plugin
cd plugin
npm run build

# Check manifest.json is valid
cat manifest.json | jq .
```

#### "Browser automation fails"
```bash
# Install browser dependencies
npx playwright install chromium
npx playwright install-deps
```

### Performance Issues

#### Slow AI responses
- Check Google Cloud quotas
- Verify network connectivity
- Consider switching to faster model (haiku)

#### Timeout errors
- Increase timeout in plugin (default: 5 minutes)
- Check Mobbin site availability
- Verify browser automation is working

## 📊 System Health Checks

### Backend Health
```bash
curl http://localhost:8787/health
```

### Database Health
```bash
cd backend
npx prisma studio
```

### AI Service Health
```bash
# Test keyword extraction
curl -X POST http://localhost:8787/ai/extract-keywords \
  -H "Content-Type: application/json" \
  -d '{"query": "test query"}'
```

## 🔒 Security Considerations

### Credentials Management
- Never commit `.env` files to git
- Use environment variables in production
- Rotate Mobbin credentials regularly
- Secure Google Cloud service account keys

### Network Security
- Run backend behind firewall in production
- Use HTTPS for all external communications
- Implement rate limiting for API endpoints

### Data Privacy
- No user queries are permanently stored
- Browser sessions are cleaned up after each search
- All communication uses encrypted connections

## 📈 Production Deployment

### Environment Setup
```env
NODE_ENV=production
PLAYWRIGHT_HEADLESS=true
LOG_LEVEL=info
```

### Process Management
```bash
# Using PM2
npm install -g pm2
pm2 start backend/src/index.ts --name one-brain-ai
pm2 startup
pm2 save
```

### Monitoring
- Set up Google Cloud monitoring for Vertex AI usage
- Monitor PostgreSQL performance
- Track API response times
- Set up alerts for failed Mobbin authentications

## 🆘 Getting Help

### Documentation
- [System Architecture Guide](../SYSTEM_ARCHITECTURE_GUIDE.md)
- [Technical Documentation](../technical/)
- [API Reference](../API_REFERENCE.md)

### Support Channels
1. Check this troubleshooting guide
2. Review system logs: `tail -f backend/logs/app.log`
3. Test individual components separately
4. Contact the development team

### Useful Commands
```bash
# View all logs
docker-compose logs -f

# Reset database
npx prisma db push --force-reset

# Clear browser cache
rm -rf ~/.cache/ms-playwright

# Test AI connectivity
npm run test:ai-connection
```

---

*This guide covers the complete setup process. For technical details about how the system works, see the [System Architecture Guide](../SYSTEM_ARCHITECTURE_GUIDE.md).*
