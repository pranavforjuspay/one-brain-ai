import { FastifyInstance } from 'fastify';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const MODEL = process.env.ONE_BRAIN_MODEL || 'claude-sonnet-4';
const LOCATION = process.env.VERTEX_LOCATION || 'us-east5';
const PROJECT = process.env.VERTEX_PROJECT || 'dev-ai-epsilon';

export interface LLMKeywordResult {
    term: string;
    confidence: number;
    reasoning?: string;
}

export interface LLMKeywordResponse {
    keywords: LLMKeywordResult[];
    originalQuery: string;
    generationMethod: 'llm' | 'fallback';
    processingTime: number;
}

/**
 * LLM-based keyword extraction service for Mobbin design search
 * Uses Claude via Vertex AI to generate intelligent search terms
 */
export class LLMKeywordService {
    private app: FastifyInstance;

    constructor(app: FastifyInstance) {
        this.app = app;
    }

    /**
     * Generate search keywords from user query using LLM
     */
    async generateKeywords(userQuery: string): Promise<LLMKeywordResponse> {
        const startTime = Date.now();

        console.log(`[${new Date().toISOString()}] [LLM_KEYWORDS] GENERATION_START:`, {
            query: userQuery,
            queryLength: userQuery.length,
            timestamp: new Date().toISOString()
        });

        try {
            // Call Claude for intelligent keyword extraction
            const llmResult = await this.callClaudeForKeywords(userQuery);

            const processingTime = Date.now() - startTime;

            console.log(`[${new Date().toISOString()}] [LLM_KEYWORDS] GENERATION_SUCCESS:`, {
                keywordsCount: llmResult.length,
                processingTime,
                keywords: llmResult.map(k => k.term)
            });

            return {
                keywords: llmResult,
                originalQuery: userQuery,
                generationMethod: 'llm',
                processingTime
            };

        } catch (error) {
            console.error(`[${new Date().toISOString()}] [LLM_KEYWORDS] GENERATION_FAILED:`, {
                error: error.message,
                query: userQuery
            });

            // Fallback to simple extraction
            const fallbackKeywords = this.generateFallbackKeywords(userQuery);
            const processingTime = Date.now() - startTime;

            console.log(`[${new Date().toISOString()}] [LLM_KEYWORDS] FALLBACK_USED:`, {
                keywordsCount: fallbackKeywords.length,
                processingTime,
                keywords: fallbackKeywords.map(k => k.term)
            });

            return {
                keywords: fallbackKeywords,
                originalQuery: userQuery,
                generationMethod: 'fallback',
                processingTime
            };
        }
    }

    /**
     * Call Claude via Vertex AI for keyword generation
     */
    private async callClaudeForKeywords(userQuery: string): Promise<LLMKeywordResult[]> {
        const systemPrompt = `You are a design search expert specializing in mobile and web UI/UX patterns. Your task is to generate effective search keywords for finding design inspiration on Mobbin (a design inspiration platform).

CRITICAL REQUIREMENTS:
1. Return ONLY single words, never phrases or multi-word terms
2. Generate exactly 3-5 keywords maximum
3. Rank by relevance/effectiveness for design search
4. Focus on UI/UX terminology that designers would search for
5. Consider mobile app design patterns, web interfaces, and user flows

Return response in this exact JSON format:
{
  "keywords": [
    {"term": "banking", "confidence": 0.95},
    {"term": "onboarding", "confidence": 0.90},
    {"term": "fintech", "confidence": 0.85}
  ]
}`;

        const userMessage = `Generate search keywords for this design inspiration request:

Query: "${userQuery}"

Return 3-5 single keywords (no phrases) that would be most effective for finding relevant design examples on Mobbin. Focus on UI patterns, design categories, and user experience elements.`;

        const result = await this.callAnthropicAPI(systemPrompt, userMessage);

        // Parse and validate the response
        return this.parseAndValidateKeywords(result);
    }

    /**
     * Parse and validate LLM response
     */
    private parseAndValidateKeywords(llmResponse: any): LLMKeywordResult[] {
        try {
            let responseText = '';

            // Extract text from Claude response format
            if (llmResponse.content && llmResponse.content.length > 0 && llmResponse.content[0].type === 'text') {
                responseText = llmResponse.content[0].text;
            } else {
                throw new Error('Invalid response format from Claude');
            }

            // Parse JSON response
            const parsed = JSON.parse(responseText);

            if (!parsed.keywords || !Array.isArray(parsed.keywords)) {
                throw new Error('Invalid keywords format in response');
            }

            // Validate and clean keywords
            const validKeywords: LLMKeywordResult[] = [];

            for (const keyword of parsed.keywords) {
                if (keyword.term && typeof keyword.term === 'string' && keyword.confidence) {
                    // Ensure single word only (no spaces)
                    const cleanTerm = keyword.term.trim().toLowerCase().replace(/\s+/g, '');

                    if (cleanTerm.length > 0 && cleanTerm.length <= 20) {
                        validKeywords.push({
                            term: cleanTerm,
                            confidence: Math.min(Math.max(keyword.confidence, 0), 1), // Clamp 0-1
                            reasoning: keyword.reasoning
                        });
                    }
                }
            }

            // Ensure we have 3-5 keywords
            if (validKeywords.length === 0) {
                throw new Error('No valid keywords extracted from LLM response');
            }

            // Sort by confidence and limit to 5
            return validKeywords
                .sort((a, b) => b.confidence - a.confidence)
                .slice(0, 5);

        } catch (error) {
            console.error(`[${new Date().toISOString()}] [LLM_KEYWORDS] PARSE_ERROR:`, {
                error: error.message,
                response: llmResponse
            });
            throw new Error(`Failed to parse LLM response: ${error.message}`);
        }
    }

    /**
     * Generate fallback keywords using simple extraction
     */
    private generateFallbackKeywords(userQuery: string): LLMKeywordResult[] {
        console.log(`[${new Date().toISOString()}] [LLM_KEYWORDS] FALLBACK_EXTRACTION:`, { userQuery });

        const keywords: LLMKeywordResult[] = [];
        const lowerQuery = userQuery.toLowerCase();

        // Common design/UI keywords that might appear in queries
        const designKeywords = [
            'login', 'signup', 'onboarding', 'dashboard', 'profile', 'settings',
            'banking', 'fintech', 'payment', 'checkout', 'ecommerce', 'wallet',
            'authentication', 'biometric', 'security', 'verification',
            'mobile', 'ios', 'android', 'web', 'app', 'website',
            'dark', 'light', 'minimal', 'modern', 'clean',
            'navigation', 'menu', 'search', 'filter', 'sort',
            'card', 'list', 'grid', 'form', 'button', 'input',
            'modal', 'popup', 'drawer', 'tab', 'carousel',
            'crypto', 'trading', 'investment', 'portfolio',
            'social', 'messaging', 'chat', 'feed', 'timeline',
            'health', 'fitness', 'medical', 'wellness',
            'education', 'learning', 'course', 'tutorial',
            'travel', 'booking', 'hotel', 'flight',
            'food', 'restaurant', 'delivery', 'recipe',
            'shopping', 'product', 'catalog', 'wishlist'
        ];

        // Extract matching keywords
        for (const keyword of designKeywords) {
            if (lowerQuery.includes(keyword)) {
                keywords.push({
                    term: keyword,
                    confidence: 0.7, // Lower confidence for fallback
                    reasoning: 'Fallback extraction'
                });
            }
        }

        // If no matches, extract meaningful words from query
        if (keywords.length === 0) {
            const words = userQuery.toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 3)
                .filter(word => !['with', 'that', 'have', 'need', 'want', 'like', 'show', 'find', 'design', 'inspiration'].includes(word));

            for (const word of words.slice(0, 3)) {
                keywords.push({
                    term: word,
                    confidence: 0.5,
                    reasoning: 'Word extraction fallback'
                });
            }
        }

        // Ensure we have at least some keywords
        if (keywords.length === 0) {
            keywords.push(
                { term: 'app', confidence: 0.3, reasoning: 'Default fallback' },
                { term: 'design', confidence: 0.3, reasoning: 'Default fallback' },
                { term: 'mobile', confidence: 0.3, reasoning: 'Default fallback' }
            );
        }

        // Limit to 5 keywords and sort by confidence
        return keywords
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 5);
    }

    /**
     * Call Anthropic API via Vertex AI (reused from routes.ai.ts)
     */
    private async callAnthropicAPI(systemPrompt: string, userMessage: string): Promise<any> {
        const endpoint = `${LOCATION}-aiplatform.googleapis.com`;
        const url = `https://${endpoint}/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/anthropic/models/${MODEL}:rawPredict`;

        const accessToken = await this.getAccessToken();

        const requestBody = {
            anthropic_version: "vertex-2023-10-16",
            stream: false,
            max_tokens: 500,  // Reduced for keyword extraction
            temperature: 0.2, // Low temperature for consistent results
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
        }, 'Calling Anthropic API for keyword extraction');

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
            }, 'Anthropic API call failed for keyword extraction');
            throw new Error(`Anthropic API call failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        this.app.log.info({
            responseSize: JSON.stringify(result).length,
            hasContent: !!result.content
        }, 'Anthropic API response received for keyword extraction');

        return result;
    }

    /**
     * Get Google Cloud access token (reused from routes.ai.ts)
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
