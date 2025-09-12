# One Brain AI - Design Documentation & Inspiration System

A comprehensive design documentation system with a Figma plugin, intelligent search capabilities, and AI-powered design inspiration discovery.

## 🚀 Overview

This project consists of three main components:
- **Figma Plugin**: Extracts and saves design documentation directly from Figma
- **Backend API**: Manages versioned documentation with intelligent search and AI-powered classification
- **Mobbin Inspiration Engine**: AI-enhanced web scraping system for discovering design inspiration from Mobbin

## 📚 Documentation

For comprehensive documentation, please visit the [`docs/`](./docs/) folder:

- **[📖 Main Documentation Hub](./docs/README.md)** - Complete overview and navigation
- **[🏗️ System Architecture Guide](./docs/SYSTEM_ARCHITECTURE_GUIDE.md)** - Layman-friendly explanation of how everything works
- **[🎨 Mobbin Inspiration Feature](./docs/MOBBIN_INSPIRATION_FEATURE_OVERVIEW.md)** - AI-powered design inspiration discovery

### Technical Documentation
- **[🔧 Mobbin Scraping Architecture](./docs/technical/MOBBIN_SCRAPING_ARCHITECTURE.md)**
- **[🤖 LLM Keyword Extraction](./docs/technical/LLM_KEYWORD_EXTRACTION_DOCUMENTATION.md)**
- **[🔄 Unified Workflow](./docs/technical/UNIFIED_WORKFLOW_DOCUMENTATION.md)**
- **[📊 Click Strategy Analysis](./docs/technical/CLICK_STRATEGY_ANALYSIS.md)**
- **[🗺️ Mobbin Path Knowledge](./docs/technical/mobbin-path-knowledge.md)**

## 📁 Project Structure

```
one-brain-ai/
├── docs/                   # 📚 Comprehensive documentation
│   ├── README.md           # Main documentation hub
│   ├── SYSTEM_ARCHITECTURE_GUIDE.md
│   └── technical/          # Technical documentation
├── plugin/                 # 🎨 Figma plugin
│   ├── src/
│   │   ├── code.ts         # Main plugin logic
│   │   ├── ui.ts           # UI interaction logic
│   │   ├── ui.html         # Plugin UI
│   │   ├── types.ts        # TypeScript type definitions
│   │   ├── extraction.ts   # Design data extraction
│   │   ├── classify.ts     # AI classification logic
│   │   ├── api.ts          # Backend API communication
│   │   └── utils.ts        # Utility functions
│   ├── package.json
│   ├── tsconfig.json
│   └── manifest.json
├── backend/                # 🚀 Node.js/Fastify API
│   ├── src/
│   │   ├── index.ts        # Server entry point
│   │   ├── prisma.ts       # Database client
│   │   ├── routes.docs.ts  # Documentation endpoints
│   │   ├── routes.search.ts # Search endpoints
│   │   ├── routes.ai.ts    # AI processing endpoints
│   │   ├── routes.inspiration.ts # Mobbin inspiration endpoints
│   │   ├── routes.unified.ts # Unified scraping workflow
│   │   ├── scraping/       # 🕷️ Web scraping system
│   │   │   ├── core/       # Core scraping services
│   │   │   ├── adapters/   # Platform adapters (Mobbin)
│   │   │   ├── ai/         # LLM integration services
│   │   │   ├── auth/       # Authentication services
│   │   │   └── types/      # TypeScript definitions
│   │   └── utils.ts        # Utility functions
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── package.json
└── README.md
```

## 🛠️ Tech Stack

### Figma Plugin
- **TypeScript**: Type-safe development
- **Figma Plugin API**: Direct integration with Figma
- **HTML/CSS**: Custom UI components

### Backend
- **Node.js**: Runtime environment
- **Fastify**: High-performance web framework
- **TypeScript**: Type-safe development
- **Prisma**: Database ORM
- **PostgreSQL**: Primary database
- **Playwright**: Browser automation via MCP
- **Google Vertex AI**: Claude AI integration for LLM processing

### AI & Scraping
- **Model Context Protocol (MCP)**: Browser automation
- **Claude AI**: Natural language processing and keyword extraction
- **Playwright**: Headless browser automation
- **Custom LLM Services**: Intelligent content analysis

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Figma account (for plugin development)
- Google Cloud account (for Vertex AI)

### Backend Setup

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Environment Configuration**
   Create a `.env` file in the backend directory:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/onebrain"
   PORT=8787
   GOOGLE_APPLICATION_CREDENTIALS="path/to/your/service-account.json"
   GOOGLE_CLOUD_PROJECT="your-project-id"
   GOOGLE_CLOUD_LOCATION="us-central1"
   ```

3. **Database Setup**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start the server**
   ```bash
   npm run dev
   ```

### Plugin Setup

1. **Install dependencies**
   ```bash
   cd plugin
   npm install
   ```

2. **Build the plugin**
   ```bash
   npm run build
   ```

3. **Load in Figma**
   - Open Figma Desktop App
   - Go to Plugins → Development → Import plugin from manifest
   - Select the `manifest.json` file from the plugin directory

## 🎯 Key Features

### ✅ Current Features
- **Figma Plugin**: Extract and save design documentation
- **AI-Powered Inspiration**: Search Mobbin for design inspiration using natural language
- **LLM Keyword Enhancement**: Convert user queries into effective search terms
- **Intelligent Web Scraping**: Automated Mobbin navigation and content extraction
- **Unified API**: Single endpoint for inspiration discovery workflow
- **Headless Browser Automation**: Scalable scraping via Playwright MCP

### 🔄 In Development
- Advanced design pattern recognition
- Team collaboration features
- Vector-based semantic search
- Web-based Design Library interface

## 🔍 API Endpoints

### Documentation
- `POST /docs/save` - Save new documentation version
- `GET /docs/:id` - Retrieve document
- `GET /docs/:id/versions` - Get version history

### Search & AI
- `POST /search` - Full-text search across documentation
- `POST /ai/classify` - Classify design content
- `POST /ai/extract` - Extract structured data

### Inspiration Discovery
- `POST /inspiration/mobbin-search` - AI-enhanced Mobbin inspiration search
- `POST /unified/search` - Unified LLM + scraping workflow

## 🧪 Testing

The system includes comprehensive testing:

```bash
# Test plugin integration
npm run test:plugin-integration

# Test LLM keyword extraction
npm run test:llm-keywords

# Test end-to-end scraping workflow
npm run test:e2e-scraping
```

## 🔧 Development

### Backend Development
```bash
cd backend
npm run dev          # Start development server (port 8787)
npm run build        # Build for production
npm run start        # Start production server
```

### Plugin Development
```bash
cd plugin
npm run dev          # Watch mode for development
npm run build        # Build for production
```

## 🤝 Contributing

1. Clone the repository
2. Read the [documentation](./docs/README.md) to understand the system
3. Create a feature branch: `git checkout -b feature/your-feature`
4. Make your changes following the established patterns
5. Test your changes thoroughly
6. Commit your changes: `git commit -m 'Add some feature'`
7. Push to the branch: `git push origin feature/your-feature`
8. Submit a pull request

## 🔒 Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://username:password@localhost:5432/onebrain
PORT=8787
NODE_ENV=development
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
```

## 📄 License

This project is private and proprietary. All rights reserved.

## 🆘 Support

For questions or issues:
1. Check the [documentation](./docs/README.md)
2. Review the [System Architecture Guide](./docs/SYSTEM_ARCHITECTURE_GUIDE.md)
3. Contact the development team
4. Create an issue in this repository
