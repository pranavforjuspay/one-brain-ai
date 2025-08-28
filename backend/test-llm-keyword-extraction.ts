import { LLMKeywordService } from './src/scraping/ai/LLMKeywordService.js';
import { UnifiedScrapingService } from './src/scraping/core/UnifiedScrapingService.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test LLM-based keyword extraction functionality
 * Tests various user queries to validate keyword generation
 */

interface TestCase {
    name: string;
    userQuery: string;
    expectedKeywordTypes: string[];
    description: string;
}

class LLMKeywordExtractionTester {
    private testCases: TestCase[] = [
        {
            name: 'Crypto Trading App',
            userQuery: 'I need inspiration for a cryptocurrency trading app onboarding flow',
            expectedKeywordTypes: ['crypto', 'trading', 'onboarding', 'fintech'],
            description: 'Complex query with specific domain and flow type'
        },
        {
            name: 'Dark Mode Login',
            userQuery: 'Show me dark mode login screens for mobile banking apps',
            expectedKeywordTypes: ['login', 'banking', 'mobile', 'dark'],
            description: 'UI pattern with visual style preference'
        },
        {
            name: 'E-commerce Checkout',
            userQuery: 'Sustainable fashion app checkout and payment flows',
            expectedKeywordTypes: ['checkout', 'payment', 'ecommerce', 'fashion'],
            description: 'Multi-step process in specific vertical'
        },
        {
            name: 'Simple Search',
            userQuery: 'dashboard design',
            expectedKeywordTypes: ['dashboard', 'design'],
            description: 'Simple two-word query'
        },
        {
            name: 'Complex UX Query',
            userQuery: 'I want to see how fintech apps handle biometric authentication and security verification flows',
            expectedKeywordTypes: ['fintech', 'biometric', 'authentication', 'security'],
            description: 'Long query with multiple concepts'
        }
    ];

    private app: any;

    constructor() {
        // Create a mock FastifyInstance for testing
        this.app = {
            log: {
                info: console.log,
                error: console.error
            }
        };
    }

    async runAllTests(): Promise<void> {
        console.log('🧪 Starting LLM Keyword Extraction Tests');
        console.log('='.repeat(60));

        const results = {
            total: this.testCases.length,
            passed: 0,
            failed: 0,
            llmSuccesses: 0,
            fallbackUsed: 0
        };

        for (let i = 0; i < this.testCases.length; i++) {
            const testCase = this.testCases[i];
            console.log(`\n📋 Test ${i + 1}/${this.testCases.length}: ${testCase.name}`);
            console.log(`Query: "${testCase.userQuery}"`);
            console.log(`Expected types: ${testCase.expectedKeywordTypes.join(', ')}`);

            try {
                const testResult = await this.runSingleTest(testCase);

                if (testResult.success) {
                    results.passed++;
                    console.log(`✅ PASSED`);
                } else {
                    results.failed++;
                    console.log(`❌ FAILED: ${testResult.reason}`);
                }

                if (testResult.usedLLM) {
                    results.llmSuccesses++;
                } else {
                    results.fallbackUsed++;
                }

            } catch (error) {
                results.failed++;
                console.log(`❌ ERROR: ${error.message}`);
            }
        }

        this.printSummary(results);
    }

    private async runSingleTest(testCase: TestCase): Promise<{
        success: boolean;
        reason?: string;
        usedLLM: boolean;
        keywords: string[];
        confidenceScores?: number[];
    }> {
        try {
            // Test 1: Direct LLM service
            console.log(`\n🔍 Testing LLM Service directly...`);
            const llmService = new LLMKeywordService(this.app);
            const llmResult = await llmService.generateKeywords(testCase.userQuery);

            console.log(`   Method: ${llmResult.generationMethod}`);
            console.log(`   Keywords: ${llmResult.keywords.map(k => k.term).join(', ')}`);
            console.log(`   Confidence: ${llmResult.keywords.map(k => k.confidence.toFixed(2)).join(', ')}`);
            console.log(`   Processing time: ${llmResult.processingTime}ms`);

            // Test 2: Unified service integration
            console.log(`\n🔧 Testing UnifiedScrapingService integration...`);
            const unifiedService = new UnifiedScrapingService(this.app);
            const unifiedResult = await unifiedService.extractKeywordsWithLLM(testCase.userQuery);

            console.log(`   Method: ${unifiedResult.metadata.keywordGenerationMethod}`);
            console.log(`   Keywords: ${unifiedResult.keywords.join(', ')}`);
            console.log(`   Confidence: ${unifiedResult.metadata.llmConfidenceScores?.map(s => s.toFixed(2)).join(', ') || 'N/A'}`);

            // Validation
            const keywords = unifiedResult.keywords;
            const usedLLM = unifiedResult.metadata.keywordGenerationMethod === 'llm';

            // Check if we got reasonable keywords
            if (keywords.length === 0) {
                return {
                    success: false,
                    reason: 'No keywords extracted',
                    usedLLM,
                    keywords
                };
            }

            if (keywords.length > 5) {
                return {
                    success: false,
                    reason: `Too many keywords (${keywords.length}), expected max 5`,
                    usedLLM,
                    keywords
                };
            }

            // Check for single words only
            const hasMultiWordTerms = keywords.some(k => k.includes(' '));
            if (hasMultiWordTerms) {
                return {
                    success: false,
                    reason: 'Found multi-word terms, expected single keywords only',
                    usedLLM,
                    keywords
                };
            }

            // Check relevance (at least one expected keyword type should be present)
            const hasRelevantKeywords = testCase.expectedKeywordTypes.some(expected =>
                keywords.some(keyword => keyword.toLowerCase().includes(expected.toLowerCase()) ||
                    expected.toLowerCase().includes(keyword.toLowerCase()))
            );

            if (!hasRelevantKeywords) {
                return {
                    success: false,
                    reason: `No relevant keywords found. Expected types: ${testCase.expectedKeywordTypes.join(', ')}`,
                    usedLLM,
                    keywords
                };
            }

            return {
                success: true,
                usedLLM,
                keywords,
                confidenceScores: unifiedResult.metadata.llmConfidenceScores
            };

        } catch (error) {
            return {
                success: false,
                reason: `Exception: ${error.message}`,
                usedLLM: false,
                keywords: []
            };
        }
    }

    private printSummary(results: any): void {
        console.log('\n' + '='.repeat(60));
        console.log('📊 LLM KEYWORD EXTRACTION TEST SUMMARY');
        console.log('='.repeat(60));

        console.log(`\n📈 Overall Results:`);
        console.log(`   Total Tests: ${results.total}`);
        console.log(`   Passed: ${results.passed} (${Math.round(results.passed / results.total * 100)}%)`);
        console.log(`   Failed: ${results.failed} (${Math.round(results.failed / results.total * 100)}%)`);

        console.log(`\n🤖 LLM Performance:`);
        console.log(`   LLM Successes: ${results.llmSuccesses} (${Math.round(results.llmSuccesses / results.total * 100)}%)`);
        console.log(`   Fallback Used: ${results.fallbackUsed} (${Math.round(results.fallbackUsed / results.total * 100)}%)`);

        if (results.passed === results.total) {
            console.log(`\n🎉 ALL TESTS PASSED! LLM keyword extraction is working correctly.`);
        } else {
            console.log(`\n⚠️ Some tests failed. Check the logs above for details.`);
        }

        console.log(`\n💡 Next Steps:`);
        console.log(`   1. If LLM success rate is low, check Claude/Vertex AI configuration`);
        console.log(`   2. If fallback is used frequently, verify environment variables`);
        console.log(`   3. Test with real scraping using /unified/search-llm endpoint`);
        console.log(`   4. Monitor keyword quality and relevance in production`);

        console.log('\n' + '='.repeat(60));
    }

    /**
     * Test specific query interactively
     */
    async testSingleQuery(userQuery: string): Promise<void> {
        console.log(`\n🔍 Testing single query: "${userQuery}"`);
        console.log('-'.repeat(50));

        try {
            const unifiedService = new UnifiedScrapingService(this.app);
            const result = await unifiedService.extractKeywordsWithLLM(userQuery);

            console.log(`\n📊 Results:`);
            console.log(`   Method: ${result.metadata.keywordGenerationMethod}`);
            console.log(`   Keywords: ${result.keywords.join(', ')}`);
            console.log(`   Count: ${result.keywords.length}`);
            console.log(`   Processing time: ${result.metadata.processingTime}ms`);

            if (result.metadata.llmConfidenceScores) {
                console.log(`   Confidence scores:`);
                result.keywords.forEach((keyword, index) => {
                    const confidence = result.metadata.llmConfidenceScores![index];
                    console.log(`     ${keyword}: ${confidence.toFixed(2)}`);
                });
            }

            // Test route decision
            const routeDecision = UnifiedScrapingService.decideRoute(result.keywords);
            console.log(`   Route decision: ${routeDecision}`);

        } catch (error) {
            console.error(`❌ Error testing query: ${error.message}`);
        }
    }
}

// Main execution
async function main() {
    const tester = new LLMKeywordExtractionTester();

    // Check if specific query provided as argument
    const specificQuery = process.argv[2];

    if (specificQuery) {
        await tester.testSingleQuery(specificQuery);
    } else {
        await tester.runAllTests();
    }
}

// Run the tests
main().catch(console.error);
