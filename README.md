# One Brain AI - Design Documentation System

A comprehensive design documentation system with a Figma plugin and intelligent search capabilities.

## 🚀 Overview

This project consists of two main components:
- **Figma Plugin**: Extracts and saves design documentation directly from Figma
- **Backend API**: Manages versioned documentation with intelligent search and AI-powered classification

## 📁 Project Structure

```
one-brain-ai/
├── plugin/                 # Figma plugin
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
├── backend/                # Node.js/Express API
│   ├── src/
│   │   ├── index.ts        # Server entry point
│   │   ├── prisma.ts       # Database client
│   │   ├── routes.docs.ts  # Documentation endpoints
│   │   ├── routes.search.ts # Search endpoints
│   │   ├── routes.ai.ts    # AI processing endpoints
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
- **Express.js**: Web framework
- **TypeScript**: Type-safe development
- **Prisma**: Database ORM
- **PostgreSQL**: Primary database
- **pgvector**: Vector search capabilities (planned)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Figma account (for plugin development)

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
   PORT=3000
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

## 🔧 Development

### Backend Development
```bash
cd backend
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
```

### Plugin Development
```bash
cd plugin
npm run dev          # Watch mode for development
npm run build        # Build for production
```

## 📊 Features

### Current Features
- ✅ Figma plugin with selection detection
- ✅ Basic documentation extraction
- ✅ REST API endpoints
- ✅ Database schema with Prisma

### Planned Features
- 🔄 Versioned documentation system
- 🔄 AI-powered content classification
- 🔄 Vector-based semantic search
- 🔄 Web-based Design Library interface
- 🔄 Team collaboration features
- 🔄 Advanced search and filtering

## 🗄️ Database Schema

The system uses a versioned documentation approach:

- **Doc**: Main document records
- **DocVersion**: Immutable version history
- **DocSnippet**: Searchable content chunks with full-text indexing

## 🔍 API Endpoints

### Documentation
- `POST /docs/save` - Save new documentation version
- `GET /docs/:id` - Retrieve document
- `GET /docs/:id/versions` - Get version history

### Search
- `POST /search` - Full-text search across documentation
- `GET /search/suggestions` - Search suggestions

### AI Processing
- `POST /ai/classify` - Classify design content
- `POST /ai/extract` - Extract structured data

## 🤝 Team Collaboration

This repository is set up for team collaboration with:
- Comprehensive `.gitignore` for clean commits
- TypeScript for type safety
- Prisma for database management
- Clear project structure and documentation

## 📝 Contributing

1. Clone the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit your changes: `git commit -m 'Add some feature'`
6. Push to the branch: `git push origin feature/your-feature`
7. Submit a pull request

## 🔒 Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://username:password@localhost:5432/onebrain
PORT=3000
NODE_ENV=development
```

## 📄 License

This project is private and proprietary. All rights reserved.

## 🆘 Support

For questions or issues, please contact the development team or create an issue in this repository.
