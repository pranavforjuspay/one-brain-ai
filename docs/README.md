# One Brain AI - Documentation

Welcome to the comprehensive documentation for the One Brain AI system - an intelligent design inspiration platform that integrates AI-powered search with automated web scraping to deliver relevant UI/UX patterns directly into Figma.

## 📚 Documentation Overview

### 🚀 Getting Started
- [System Architecture Guide](SYSTEM_ARCHITECTURE_GUIDE.md) - **Start here!** Layman-friendly explanation of how everything works
- [MOBBIN Inspiration Feature Overview](MOBBIN_INSPIRATION_FEATURE_OVERVIEW.md) - Technical deep-dive into the main feature

### 📖 User Guides
- [Setup Guide](guides/SETUP_GUIDE.md) - Complete setup instructions for the entire system
- [API Reference](guides/API_REFERENCE.md) - Complete API documentation and examples
- [Troubleshooting](guides/TROUBLESHOOTING.md) - Common issues and solutions *(Coming Soon)*

### 🔧 Technical Documentation
- [Mobbin Scraping Architecture](technical/MOBBIN_SCRAPING_ARCHITECTURE.md) - Web scraping system design
- [LLM Keyword Extraction](technical/LLM_KEYWORD_EXTRACTION_DOCUMENTATION.md) - AI-powered keyword generation
- [Unified Workflow](technical/UNIFIED_WORKFLOW_DOCUMENTATION.md) - Core scraping workflow
- [V2 Keyword to Mobbin Workflow](technical/V2_KEYWORD_TO_MOBBIN_WORKFLOW.md) - Enhanced keyword extraction workflow
- [Click Strategy Analysis](technical/CLICK_STRATEGY_ANALYSIS.md) - Thumbnail clicking strategies
- [Mobbin Path Knowledge](technical/mobbin-path-knowledge.md) - Domain-specific navigation patterns

### 🎯 API Reference
- [API Endpoints](guides/API_REFERENCE.md) - Complete API documentation
- [Data Structures](guides/API_REFERENCE.md#response-format) - Request/response formats
- [Error Handling](guides/API_REFERENCE.md#error-codes) - Error codes and recovery

### 🚀 Deployment
- [Setup Guide](guides/SETUP_GUIDE.md) - Complete setup and deployment instructions
- [Environment Configuration](guides/SETUP_GUIDE.md#environment-configuration) - Required environment variables
- [Production Deployment](guides/SETUP_GUIDE.md#production-deployment) - Production deployment setup

## 🏗️ System Overview

The One Brain AI system consists of three main components:

1. **Figma Plugin** - TypeScript-based plugin that integrates directly into Figma's design interface
2. **Backend API** - Node.js/Fastify server that orchestrates AI and web scraping operations
3. **AI + Scraping Engine** - Claude AI integration with Playwright-based Mobbin automation

## 🔄 How It Works (Simple Version)

1. **Designer types a query** in the Figma plugin (e.g., "crypto trading app onboarding")
2. **AI extracts search terms** using Claude to understand what design patterns are needed
3. **System scrapes Mobbin** automatically to find relevant UI examples
4. **Results are delivered** back to Figma with explanations and clickable links

## 🛠️ Technology Stack

- **Frontend**: TypeScript, Figma Plugin API
- **Backend**: Node.js, Fastify, TypeScript
- **AI**: Claude Sonnet 4 via Google Vertex AI
- **Web Scraping**: Playwright via MCP (Model Context Protocol)
- **Database**: PostgreSQL with Prisma ORM

## 📁 Project Structure

```
one-brain-ai/
├── docs/                    # 📚 All documentation (you are here)
├── backend/                 # 🖥️ Node.js API server
├── plugin/                  # 🎨 Figma plugin code
├── google-cloud-sdk/        # ☁️ Google Cloud tools
└── README.md               # 📋 Project overview
```

## 🤝 Contributing

When adding new features or making changes:

1. Update relevant documentation in this `docs/` folder
2. Add technical details to the appropriate `technical/` subfolder
3. Update user guides in `guides/` if user-facing changes are made
4. Keep the main [System Architecture Guide](SYSTEM_ARCHITECTURE_GUIDE.md) current

## 📞 Support

For questions or issues:
- Check the [Setup Guide](guides/SETUP_GUIDE.md) for installation and configuration
- Review the [System Architecture Guide](SYSTEM_ARCHITECTURE_GUIDE.md) for understanding
- Examine the [Technical Documentation](technical/) for implementation details
- Use the [API Reference](guides/API_REFERENCE.md) for integration help

---

*Last updated: January 2025*
