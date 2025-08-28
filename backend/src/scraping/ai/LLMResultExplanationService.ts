import { FastifyInstance } from 'fastify';
import { exec } from 'child_process';
import { promisify } from 'util';
import { UnifiedScrapingResult } from '../core/UnifiedScrapingService.js';

const execAsync = promisify(exec);

const MODEL = process.env.ONE_BRAIN_MODEL || 'claude-sonnet-4';
const LOCATION = process.env.VERTEX_LOCATION || 'us-east5';
const PROJECT = process.env.VERTEX_PROJECT || 'dev-ai-epsilon';

export interface ResultCategory {
    category: string;
    description: string;
    count: number;
    results: EnhancedResult[];
}

export interface EnhancedResult {
    title: string;
    description: string;
    url: string;
    relevanceScore: string;
    whyRelevant: string;
    keyFeatures: string[];
    originalKeyword: string;
    confidence: number;
}

export interface ResultExplanation {
    summary: string;
    whyThese: string;
    keyInsights: string[];
    recommendation: string;
    categories: ResultCategory[];
    processingTime: number;
}

/**
 * LLM-powered service to generate user-friendly explanations for scraping results
 * Transforms technical results into actionable insights with context
 */
export class LLMResultExplanationService {
    private app: FastifyInstance;

    constructor(app: FastifyInstance) {
        this.app = app;
    }

    /**
     * Generate comprehensive explanation for scraping results
     */
    async explainResults(
        userQuery: string,
        results: UnifiedScrapingResult[],
        keywords: string[],
        confidenceScores?: number[]
    ): Promise<ResultExplanation> {
        const startTime = Date.now();

        console.log(`[${new Date().toISOString()}] [RESULT_EXPLANATION] GENERATION_START:`, {
            userQuery,
            resultsCount: results.length,
            keywords
        });

        try {
            // Generate LLM explanation
            const explanation = await this.generateLLMExplanation(userQuery, results, keywords, confidenceScores);

            const processingTime = Date.now() - startTime;

            console.log(`[${new Date().toISOString()}] [RESULT_EXPLANATION] GENERATION_SUCCESS:`, {
                processingTime,
                categoriesCount: explanation.categories.length,
                insightsCount: explanation.keyInsights.length
            });

            return {
                ...explanation,
                processingTime
            };

        } catch (error) {
            console.error(`[${new Date().toISOString()}] [RESULT_EXPLANATION] GENERATION_FAILED:`, {
                error: error.message,
                userQuery
            });

            // Fallback to template-based explanation
            return this.generateFallbackExplanation(userQuery, results, keywords, confidenceScores);
        }
    }

    /**
     * Generate LLM-powered explanation
     */
    private async generateLLMExplanation(
        userQuery: string,
        results: UnifiedScrapingResult[],
        keywords: string[],
        confidenceScores?: number[]
    ): Promise<Omit<ResultExplanation, 'processingTime'>> {
        const systemPrompt = `You are a UX design research assistant. Your task is to analyze design inspiration search results and provide user-friendly explanations that help designers understand the value and relevance of the findings.

CRITICAL REQUIREMENTS:
1. Write in a helpful, professional tone as if speaking directly to a designer
2. Focus on actionable insights and design patterns
3. Explain WHY results are relevant to the user's specific query
4. Categorize results by design patterns, not just keywords
5. Provide specific recommendations for how to use the insights
6. Keep explanations concise but valuable

Return response in this exact JSON format:
{
  "summary": "Brief overview of what was found (1-2 sentences)",
  "whyThese": "Explanation of why these specific results match the query",
  "keyInsights": ["Insight 1", "Insight 2", "Insight 3"],
  "recommendation": "Specific advice on which results to prioritize and why",
  "categories": [
    {
      "category": "Category Name",
      "description": "What this category contains",
      "results": [
        {
          "title": "App Name - Feature Description",
          "description": "What makes this example valuable",
          "relevanceScore": "High/Medium/Low",
          "whyRelevant": "Specific reason this matches the query",
          "keyFeatures": ["Feature 1", "Feature 2", "Feature 3"]
        }
      ]
    }
  ]
}`;

        const userMessage = `Analyze these design inspiration search results and provide a user-friendly explanation.

USER QUERY: "${userQuery}"

EXTRACTED KEYWORDS: ${keywords.join(', ')}
${confidenceScores ? `KEYWORD CONFIDENCE: ${confidenceScores.map(s => s.toFixed(2)).join(', ')}` : ''}

SEARCH RESULTS:
${results.map((result, index) => `
${index + 1}. Keyword: ${result.keyword}
   URL: ${result.url}
   Found at: ${result.extractedAt}
`).join('')}

TOTAL RESULTS: ${results.length}

Please provide a comprehensive explanation that helps the user understand:
1. What was found and why it's valuable
2. How these results relate to their specific query
3. Key design patterns or insights they should notice
4. Which results to prioritize and why
5. Actionable recommendations for using these insights

Focus on design patterns, user experience insights, and practical value rather than technical details.`;

        const result = await this.callAnthropicAPI(systemPrompt, userMessage);
        return this.parseExplanationResponse(result, results, keywords, confidenceScores);
    }

    /**
     * Parse and validate LLM explanation response
     */
    private parseExplanationResponse(
        llmResponse: any,
        results: UnifiedScrapingResult[],
        keywords: string[],
        confidenceScores?: number[]
    ): Omit<ResultExplanation, 'processingTime'> {
        try {
            let responseText = '';

            // Extract text from Claude response format
            if (llmResponse.content && llmResponse.content.length > 0 && llmResponse.content[0].type === 'text') {
                responseText = llmResponse.content[0].text;
            } else {
                throw new Error('Invalid response format from Claude');
            }

            // FIXED: Strip markdown code blocks if present
            responseText = responseText.trim();
            if (responseText.startsWith('```json')) {
                responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (responseText.startsWith('```')) {
                responseText = responseText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            // Parse JSON response
            const parsed = JSON.parse(responseText);

            // Validate required fields
            if (!parsed.summary || !parsed.whyThese || !parsed.keyInsights || !parsed.recommendation) {
                throw new Error('Missing required fields in LLM response');
            }

            // Enhance categories with actual result data
            const enhancedCategories = this.enhanceCategories(parsed.categories || [], results, keywords, confidenceScores);

            return {
                summary: parsed.summary,
                whyThese: parsed.whyThese,
                keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
                recommendation: parsed.recommendation,
                categories: enhancedCategories
            };

        } catch (error) {
            console.error(`[${new Date().toISOString()}] [RESULT_EXPLANATION] PARSE_ERROR:`, {
                error: error.message,
                response: llmResponse
            });
            throw new Error(`Failed to parse LLM explanation: ${error.message}`);
        }
    }

    /**
     * Enhance categories with actual result data
     */
    private enhanceCategories(
        llmCategories: any[],
        results: UnifiedScrapingResult[],
        keywords: string[],
        confidenceScores?: number[]
    ): ResultCategory[] {
        // If LLM didn't provide categories, create default ones
        if (!llmCategories || llmCategories.length === 0) {
            return this.createDefaultCategories(results, keywords, confidenceScores);
        }

        // Map LLM categories to actual results
        const enhancedCategories: ResultCategory[] = [];
        let usedResults = new Set<number>();

        for (const llmCategory of llmCategories) {
            const categoryResults: EnhancedResult[] = [];

            // Try to match LLM results with actual results
            if (llmCategory.results && Array.isArray(llmCategory.results)) {
                for (let i = 0; i < Math.min(llmCategory.results.length, results.length); i++) {
                    if (usedResults.has(i)) continue;

                    const result = results[i];
                    const llmResult = llmCategory.results[categoryResults.length];
                    const keywordIndex = keywords.indexOf(result.keyword);
                    const confidence = confidenceScores?.[keywordIndex] || 0.5;

                    categoryResults.push({
                        title: llmResult?.title || this.generateTitle(result),
                        description: llmResult?.description || this.generateDescription(result),
                        url: result.url,
                        relevanceScore: this.getRelevanceScore(confidence),
                        whyRelevant: llmResult?.whyRelevant || `Matches your "${result.keyword}" search term`,
                        keyFeatures: llmResult?.keyFeatures || this.generateKeyFeatures(result),
                        originalKeyword: result.keyword,
                        confidence
                    });

                    usedResults.add(i);
                }
            }

            if (categoryResults.length > 0) {
                enhancedCategories.push({
                    category: llmCategory.category || 'Design Examples',
                    description: llmCategory.description || 'Relevant design patterns and examples',
                    count: categoryResults.length,
                    results: categoryResults
                });
            }
        }

        // Add any remaining results to a catch-all category
        const remainingResults = results.filter((_, index) => !usedResults.has(index));
        if (remainingResults.length > 0) {
            const additionalResults = remainingResults.map(result => {
                const keywordIndex = keywords.indexOf(result.keyword);
                const confidence = confidenceScores?.[keywordIndex] || 0.5;

                return {
                    title: this.generateTitle(result),
                    description: this.generateDescription(result),
                    url: result.url,
                    relevanceScore: this.getRelevanceScore(confidence),
                    whyRelevant: `Matches your "${result.keyword}" search term`,
                    keyFeatures: this.generateKeyFeatures(result),
                    originalKeyword: result.keyword,
                    confidence
                };
            });

            enhancedCategories.push({
                category: 'Additional Examples',
                description: 'More relevant design patterns and examples',
                count: additionalResults.length,
                results: additionalResults
            });
        }

        return enhancedCategories;
    }

    /**
     * Create default categories when LLM doesn't provide them
     */
    private createDefaultCategories(
        results: UnifiedScrapingResult[],
        keywords: string[],
        confidenceScores?: number[]
    ): ResultCategory[] {
        // Group results by keyword
        const keywordGroups: Record<string, UnifiedScrapingResult[]> = {};

        for (const result of results) {
            if (!keywordGroups[result.keyword]) {
                keywordGroups[result.keyword] = [];
            }
            keywordGroups[result.keyword].push(result);
        }

        // Create categories from keyword groups
        const categories: ResultCategory[] = [];

        for (const [keyword, keywordResults] of Object.entries(keywordGroups)) {
            const keywordIndex = keywords.indexOf(keyword);
            const confidence = confidenceScores?.[keywordIndex] || 0.5;

            const enhancedResults = keywordResults.map(result => ({
                title: this.generateTitle(result),
                description: this.generateDescription(result),
                url: result.url,
                relevanceScore: this.getRelevanceScore(confidence),
                whyRelevant: `Matches your "${keyword}" search term`,
                keyFeatures: this.generateKeyFeatures(result),
                originalKeyword: result.keyword,
                confidence
            }));

            categories.push({
                category: this.getCategoryName(keyword),
                description: this.getCategoryDescription(keyword),
                count: enhancedResults.length,
                results: enhancedResults
            });
        }

        return categories;
    }

    /**
     * Generate fallback explanation when LLM fails
     */
    private generateFallbackExplanation(
        userQuery: string,
        results: UnifiedScrapingResult[],
        keywords: string[],
        confidenceScores?: number[]
    ): ResultExplanation {
        console.log(`[${new Date().toISOString()}] [RESULT_EXPLANATION] FALLBACK_USED`);

        const categories = this.createDefaultCategories(results, keywords, confidenceScores);

        return {
            summary: `Found ${results.length} design examples related to your query about ${keywords.join(', ')}.`,
            whyThese: `These results were selected because they match the key terms from your query: ${keywords.join(', ')}.`,
            keyInsights: [
                'Results are organized by the keywords that matched your query',
                'Higher confidence scores indicate better relevance to your search',
                'Each example provides specific design patterns you can reference'
            ],
            recommendation: 'Review the highest confidence results first, then explore related patterns in other categories.',
            categories,
            processingTime: 0
        };
    }

    // Helper methods
    private generateTitle(result: UnifiedScrapingResult): string {
        const urlParts = result.url.split('/');
        const appName = urlParts.find(part => part.includes('apps'))?.split('/')[1] || 'Design Example';
        return `${appName} - ${result.keyword} Example`;
    }

    private generateDescription(result: UnifiedScrapingResult): string {
        return `Design example showing ${result.keyword} patterns and user interface elements.`;
    }

    private generateKeyFeatures(result: UnifiedScrapingResult): string[] {
        return [`${result.keyword} interface`, 'User experience patterns', 'Visual design elements'];
    }

    private getRelevanceScore(confidence: number): string {
        if (confidence >= 0.8) return 'High';
        if (confidence >= 0.6) return 'Medium';
        return 'Low';
    }

    private getCategoryName(keyword: string): string {
        const categoryMap: Record<string, string> = {
            'onboarding': 'Onboarding Flows',
            'login': 'Authentication Screens',
            'signup': 'Registration Flows',
            'dashboard': 'Dashboard Interfaces',
            'checkout': 'Checkout Processes',
            'payment': 'Payment Flows',
            'profile': 'Profile Management',
            'settings': 'Settings Screens',
            'search': 'Search Interfaces',
            'navigation': 'Navigation Patterns'
        };

        return categoryMap[keyword.toLowerCase()] || `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Examples`;
    }

    private getCategoryDescription(keyword: string): string {
        const descriptionMap: Record<string, string> = {
            'onboarding': 'User introduction and setup flows',
            'login': 'Authentication and sign-in interfaces',
            'signup': 'User registration and account creation',
            'dashboard': 'Main interface and overview screens',
            'checkout': 'Purchase and transaction flows',
            'payment': 'Payment processing interfaces',
            'profile': 'User profile and account management',
            'settings': 'Configuration and preferences screens',
            'search': 'Search functionality and results',
            'navigation': 'Menu and navigation patterns'
        };

        return descriptionMap[keyword.toLowerCase()] || `Examples related to ${keyword}`;
    }

    /**
     * Call Anthropic API via Vertex AI (reused from LLMKeywordService)
     */
    private async callAnthropicAPI(systemPrompt: string, userMessage: string): Promise<any> {
        const endpoint = `${LOCATION}-aiplatform.googleapis.com`;
        const url = `https://${endpoint}/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/anthropic/models/${MODEL}:rawPredict`;

        const accessToken = await this.getAccessToken();

        const requestBody = {
            anthropic_version: "vertex-2023-10-16",
            stream: false,
            max_tokens: 2000,  // Increased for detailed explanations
            temperature: 0.3,  // Low temperature for consistent, helpful responses
            top_p: 1.0,
            system: systemPrompt,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: userMessage
                        }
                    ]
                }
            ]
        };

        this.app.log.info({
            url,
            model: MODEL,
            project: PROJECT,
            location: LOCATION,
            requestBodySize: JSON.stringify(requestBody).length,
            systemPromptLength: systemPrompt.length,
            userMessageLength: userMessage.length
        }, 'Calling Anthropic API for result explanation');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            this.app.log.error({
                status: response.status,
                statusText: response.statusText,
                errorBody: errorText
            }, 'Anthropic API call failed for result explanation');
            throw new Error(`Anthropic API call failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        this.app.log.info({
            responseSize: JSON.stringify(result).length,
            hasContent: !!result.content
        }, 'Anthropic API response received for result explanation');

        return result;
    }

    /**
     * Get Google Cloud access token (reused from LLMKeywordService)
     */
    private async getAccessToken(): Promise<string> {
        try {
            const { stdout } = await execAsync('gcloud auth print-access-token');
            return stdout.trim();
        } catch (error) {
            throw new Error(`Failed to get access token: ${error.message}`);
        }
    }
}
