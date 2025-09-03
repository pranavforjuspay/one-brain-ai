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
 * LLM-based keyword extraction service V2 for Mobbin design search
 * Uses sophisticated prompt engineering with brief type classification,
 * journey coverage, brand intelligence, and weighted scoring
 */
export class LLMKeywordServiceV2 {
    private app: FastifyInstance;

    constructor(app: FastifyInstance) {
        this.app = app;
    }

    /**
     * Generate search keywords from user query using LLM V2
     */
    async generateKeywords(userQuery: string): Promise<LLMKeywordResponse> {
        const startTime = Date.now();

        console.log(`[${new Date().toISOString()}] [LLM_KEYWORDS_V2] GENERATION_START:`, {
            query: userQuery,
            queryLength: userQuery.length,
            timestamp: new Date().toISOString()
        });

        try {
            // Call Claude for intelligent keyword extraction using V2 prompt
            const llmResult = await this.callClaudeForKeywordsV2(userQuery);

            const processingTime = Date.now() - startTime;

            console.log(`[${new Date().toISOString()}] [LLM_KEYWORDS_V2] GENERATION_SUCCESS:`, {
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
            console.error(`[${new Date().toISOString()}] [LLM_KEYWORDS_V2] GENERATION_FAILED:`, {
                error: error.message,
                query: userQuery
            });

            // Fallback to enhanced extraction
            const fallbackKeywords = this.generateEnhancedFallbackKeywords(userQuery);
            const processingTime = Date.now() - startTime;

            console.log(`[${new Date().toISOString()}] [LLM_KEYWORDS_V2] FALLBACK_USED:`, {
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
     * Call Claude via Vertex AI for keyword generation using V2 prompt
     */
    private async callClaudeForKeywordsV2(userQuery: string): Promise<LLMKeywordResult[]> {
        const systemPrompt = `SYSTEM: You are a design search expert who generates HIGH-SIGNAL, SINGLE-WORD keywords to find UI/UX inspiration on Mobbin.

GOAL
Return 3–5 single words (ranked) that a designer would actually type into Mobbin to retrieve relevant screens. Focus on the PRIMARY user intent and actions.

STRICT OUTPUT
Return ONLY this JSON (no prose, no extra keys):
{
  "keywords": [
    {"term": "<singleword>", "confidence": <0.50-1.00>},
    ...
  ]
}
Rules:
- 3 to 5 items total.
- "term" must be a single token: lowercase, no spaces, no hyphens, no emojis.
- "confidence" is your estimate of usefulness for Mobbin search (0.50–1.00).

SELECTION PRINCIPLES (in priority order)
1) PRIMARY INTENT: Focus on the main user action/goal described in the query
   - What is the user trying to DO? (e.g., redeem, browse, checkout, onboard)
   - What is the core FUNCTION? (e.g., offers, payments, messaging, trading)

2) FUNCTIONAL KEYWORDS: Prefer action and domain words over brands
   - Actions: redeem, browse, checkout, login, signup, search, filter, etc.
   - Domains: offers, rewards, banking, travel, food, crypto, etc.
   - UI patterns: onboarding, dashboard, profile, settings, etc.

3) RELEVANT COMPARABLES: Only include 1-2 well-known apps if they solve the SAME core problem
   - Must be directly relevant to the primary intent
   - Canonicalize names: remove spaces/punctuation, lowercase
   - Example: For "offers app" → include apps known for offers/deals, not just any fintech app

4) AVOID BIAS: Don't include apps just because they're in the same industry
   - "Visa card offers" ≠ include all card companies
   - Focus on the offers functionality, not the card aspect

GUARDRAILS
- NEVER output multi-word phrases
- Prioritize functional keywords over brand keywords
- Include brands only if they're famous for solving the same core problem
- Avoid generic UI terms unless they're central to the request
- Focus on what users would actually search for on Mobbin

SCORING APPROACH
Rank keywords by:
1. How well they match the primary user intent (highest weight)
2. How likely they are to yield good results on Mobbin
3. How relevant any comparable apps are to the core problem

INPUT
You will receive a problem statement as USER content.

OUTPUT
Return the STRICT JSON only.`;

        const userMessage = `${userQuery}`;

        const result = await this.callAnthropicAPI(systemPrompt, userMessage);

        // Parse and validate the response
        return this.parseAndValidateKeywordsV2(result);
    }

    /**
     * Parse and validate LLM response with enhanced V2 validation
     */
    private parseAndValidateKeywordsV2(llmResponse: any): LLMKeywordResult[] {
        try {
            let responseText = '';

            // Extract text from Claude response format
            if (llmResponse.content && llmResponse.content.length > 0 && llmResponse.content[0].type === 'text') {
                responseText = llmResponse.content[0].text;
            } else {
                throw new Error('Invalid response format from Claude V2');
            }

            // Parse JSON response
            const parsed = JSON.parse(responseText);

            if (!parsed.keywords || !Array.isArray(parsed.keywords)) {
                throw new Error('Invalid keywords format in V2 response');
            }

            // Enhanced validation for V2
            const validKeywords: LLMKeywordResult[] = [];

            for (const keyword of parsed.keywords) {
                if (keyword.term && typeof keyword.term === 'string' && keyword.confidence) {
                    // Strict V2 validation: single word only (no spaces, hyphens, emojis)
                    const cleanTerm = keyword.term.trim().toLowerCase()
                        .replace(/[^\w]/g, '') // Remove all non-word characters
                        .replace(/\s+/g, ''); // Remove any remaining spaces

                    // Additional V2 validations
                    if (cleanTerm.length > 0 &&
                        cleanTerm.length <= 20 &&
                        !cleanTerm.includes(' ') &&
                        !cleanTerm.includes('-') &&
                        /^[a-z0-9]+$/.test(cleanTerm)) { // Only lowercase letters and numbers

                        validKeywords.push({
                            term: cleanTerm,
                            confidence: Math.min(Math.max(keyword.confidence, 0.5), 1.0), // V2: min 0.5 confidence
                            reasoning: keyword.reasoning || 'V2 extraction'
                        });
                    }
                }
            }

            // V2 requirement: 3-5 keywords
            if (validKeywords.length === 0) {
                throw new Error('No valid keywords extracted from LLM V2 response');
            }

            // Sort by confidence and ensure 3-5 keywords
            const sortedKeywords = validKeywords
                .sort((a, b) => b.confidence - a.confidence)
                .slice(0, 5);

            // Ensure minimum 3 keywords for V2
            if (sortedKeywords.length < 3) {
                console.warn(`[${new Date().toISOString()}] [LLM_KEYWORDS_V2] INSUFFICIENT_KEYWORDS:`, {
                    extracted: sortedKeywords.length,
                    required: 3
                });
            }

            return sortedKeywords;

        } catch (error) {
            console.error(`[${new Date().toISOString()}] [LLM_KEYWORDS_V2] PARSE_ERROR:`, {
                error: error.message,
                response: llmResponse
            });
            throw new Error(`Failed to parse LLM V2 response: ${error.message}`);
        }
    }

    /**
     * Simplified fallback keywords using intent-based extraction
     */
    private generateEnhancedFallbackKeywords(userQuery: string): LLMKeywordResult[] {
        console.log(`[${new Date().toISOString()}] [LLM_KEYWORDS_V2] SIMPLIFIED_FALLBACK:`, { userQuery });

        const keywords: LLMKeywordResult[] = [];
        const lowerQuery = userQuery.toLowerCase();

        // Simple keyword extraction: look for meaningful words in the query
        const words = lowerQuery
            .replace(/[^\w\s]/g, ' ') // Remove punctuation
            .split(/\s+/) // Split by whitespace
            .filter(word => word.length > 3) // Filter short words
            .filter(word => !this.isStopWord(word)) // Remove stop words
            .slice(0, 5); // Limit to 5 words

        // Convert words to keyword results with confidence based on relevance
        for (const word of words) {
            const confidence = this.calculateSimpleConfidence(word, lowerQuery);
            keywords.push({
                term: word,
                confidence,
                reasoning: 'Simplified fallback extraction'
            });
        }

        // If no meaningful words found, use basic defaults
        if (keywords.length === 0) {
            keywords.push(
                { term: 'app', confidence: 0.5, reasoning: 'Default fallback' },
                { term: 'mobile', confidence: 0.5, reasoning: 'Default fallback' },
                { term: 'design', confidence: 0.5, reasoning: 'Default fallback' }
            );
        }

        // Sort by confidence and ensure 3-5 keywords
        const sortedKeywords = keywords
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 5);

        // Ensure at least 3 keywords
        while (sortedKeywords.length < 3 && sortedKeywords.length < keywords.length) {
            const nextKeyword = keywords[sortedKeywords.length];
            if (nextKeyword) {
                sortedKeywords.push(nextKeyword);
            } else {
                break;
            }
        }

        console.log(`[${new Date().toISOString()}] [LLM_KEYWORDS_V2] FALLBACK_COMPLETE:`, {
            extractedKeywords: sortedKeywords.map(k => k.term),
            keywordCount: sortedKeywords.length
        });

        return sortedKeywords;
    }

    /**
     * Check if a word is a stop word (should be filtered out)
     */
    private isStopWord(word: string): boolean {
        const stopWords = [
            'with', 'that', 'have', 'need', 'want', 'like', 'show', 'find',
            'design', 'inspiration', 'this', 'they', 'will', 'from', 'into',
            'would', 'could', 'should', 'their', 'them', 'then', 'than',
            'when', 'where', 'what', 'which', 'while', 'some', 'many',
            'much', 'more', 'most', 'very', 'also', 'just', 'only'
        ];
        return stopWords.includes(word);
    }

    /**
     * Calculate simple confidence based on word characteristics and context
     */
    private calculateSimpleConfidence(word: string, query: string): number {
        let confidence = 0.6; // Base confidence

        // Boost confidence for action words (common UI/UX actions)
        const actionWords = [
            'login', 'signup', 'checkout', 'payment', 'search', 'filter',
            'browse', 'redeem', 'activate', 'verify', 'submit', 'save',
            'share', 'upload', 'download', 'create', 'edit', 'delete'
        ];
        if (actionWords.includes(word)) {
            confidence += 0.2;
        }

        // Boost confidence for domain words (common app categories)
        const domainWords = [
            'offers', 'rewards', 'banking', 'fintech', 'travel', 'food',
            'shopping', 'social', 'messaging', 'crypto', 'trading',
            'health', 'fitness', 'education', 'entertainment'
        ];
        if (domainWords.includes(word)) {
            confidence += 0.15;
        }

        // Boost confidence for UI pattern words
        const uiWords = [
            'onboarding', 'dashboard', 'profile', 'settings', 'navigation',
            'menu', 'modal', 'drawer', 'carousel', 'list', 'card', 'form'
        ];
        if (uiWords.includes(word)) {
            confidence += 0.1;
        }

        // Boost confidence if word appears multiple times
        const occurrences = (query.match(new RegExp(word, 'g')) || []).length;
        if (occurrences > 1) {
            confidence += 0.1;
        }

        // Slight penalty for very long words
        if (word.length > 12) {
            confidence -= 0.05;
        }

        // Clamp to valid range
        return Math.min(Math.max(confidence, 0.5), 1.0);
    }

    /**
     * Call Anthropic API via Vertex AI (enhanced for V2)
     */
    private async callAnthropicAPI(systemPrompt: string, userMessage: string): Promise<any> {
        const endpoint = `${LOCATION}-aiplatform.googleapis.com`;
        const url = `https://${endpoint}/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/anthropic/models/${MODEL}:rawPredict`;

        const accessToken = await this.getAccessToken();

        const requestBody = {
            anthropic_version: "vertex-2023-10-16",
            stream: false,
            max_tokens: 300,  // Reduced for V2 (more focused output)
            temperature: 0.1, // Lower temperature for V2 consistency
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
            userMessageLength: userMessage.length,
            version: 'V2'
        }, 'Calling Anthropic API for keyword extraction V2');

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
                errorBody: errorText,
                version: 'V2'
            }, 'Anthropic API call failed for keyword extraction V2');
            throw new Error(`Anthropic API V2 call failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        this.app.log.info({
            responseSize: JSON.stringify(result).length,
            hasContent: !!result.content,
            version: 'V2'
        }, 'Anthropic API response received for keyword extraction V2');

        return result;
    }

    /**
     * Get Google Cloud access token
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
