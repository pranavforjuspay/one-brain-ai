# Test Organization

This directory contains all test files organized by category for better maintainability and clarity.

## 📁 Directory Structure

```
tests/
├── unit/                    # Unit tests for individual components
│   ├── backend/
│   │   ├── ai/             # LLM and AI service tests
│   │   ├── auth/           # Authentication tests
│   │   ├── scraping/       # Scraping component tests
│   │   └── routes/         # API route tests
│   └── plugin/             # Plugin unit tests
├── integration/            # Integration tests
│   ├── api/               # API integration tests
│   ├── mcp/               # MCP integration tests
│   └── plugin-backend/    # Plugin-backend integration
├── e2e/                   # End-to-end tests
│   ├── scraping/          # Full scraping workflows
│   ├── authentication/    # Auth workflows
│   └── user-scenarios/    # Complete user scenarios
├── debug/                 # Debug and diagnostic tests
│   ├── llm/              # LLM debugging tests
│   ├── browser/          # Browser debugging tests
│   └── connectivity/     # Connection debugging
├── fixtures/              # Test data and fixtures
└── utils/                 # Test utilities and helpers
```

## 🧪 Test Categories

### Unit Tests (`tests/unit/`)
- **AI Tests**: LLM keyword extraction, AI service functionality
- **Auth Tests**: Authentication services and flows
- **Scraping Tests**: Individual scraping components
- **Route Tests**: API endpoint testing

### Integration Tests (`tests/integration/`)
- **API Integration**: Cross-service API testing
- **MCP Integration**: Model Context Protocol integration
- **Plugin-Backend**: Plugin and backend communication

### End-to-End Tests (`tests/e2e/`)
- **Scraping Workflows**: Complete scraping scenarios
- **Authentication Flows**: Full auth workflows
- **User Scenarios**: Complete user journeys

### Debug Tests (`tests/debug/`)
- **LLM Debugging**: AI service diagnostics
- **Browser Debugging**: Browser automation issues
- **Connectivity**: Network and connection testing

## 🚀 Running Tests

### Run All Tests
```bash
npm test
```

### Run by Category
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e

# Debug tests
npm run test:debug
```

### Run Specific Test Types
```bash
# AI/LLM tests
npm run test:ai

# Authentication tests
npm run test:auth

# Scraping tests
npm run test:scraping
```

## 📋 Test File Naming Convention

- **Unit tests**: `test-[component]-[functionality].ts`
- **Integration tests**: `test-[service1]-[service2]-integration.ts`
- **E2E tests**: `test-[workflow]-e2e.ts`
- **Debug tests**: `test-debug-[component].ts`

## 🔧 Test Utilities

The `utils/` directory contains shared test utilities:
- Mock data generators
- Test helpers
- Common assertions
- Setup/teardown functions

## 📊 Test Coverage

Run coverage reports:
```bash
npm run test:coverage
```

## 🐛 Debugging Tests

For debugging failing tests:
1. Check the `debug/` category for diagnostic tests
2. Use verbose logging: `npm run test:verbose`
3. Run individual tests: `npx tsx tests/path/to/test.ts`

## 📝 Adding New Tests

1. Choose the appropriate category (`unit`, `integration`, `e2e`, `debug`)
2. Place in the relevant subdirectory
3. Follow the naming convention
4. Add to the appropriate test script in `package.json`

## 🏗️ Migration Notes

This test organization was created to consolidate scattered test files from:
- `backend/test-*.ts` files
- Root level `test-*.js` files
- Various test utilities and fixtures

All tests have been categorized based on their functionality and scope for better maintainability.
