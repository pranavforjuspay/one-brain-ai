import { FastifyInstance } from 'fastify';
import { exec } from 'child_process';
import { promisify } from 'util';
import { promptManager } from '../../prompts/PromptManager.js';

const execAsync = promisify(exec);

const MODEL = process.env.ONE_BRAIN_MODEL || 'claude-sonnet-4';
const LOCATION = process.env.VERTEX_LOCATION || 'us-east5';
const PROJECT = process.env.VERTEX_PROJECT || 'dev-ai-epsilon';

export interface LLMKeywordResult {
    term: string;
    confidence: number;
    reasoning?: string;
    type?: 'app' | 'feature' | 'pattern' | 'industry';
    thumbnailAllocation?: number;
    isCompetitor?: boolean;
    parentApp?: string;
}

export interface EnhancedKeywordStrategy {
    totalKeywords: number;
    totalThumbnailBudget: number;
    keywordBreakdown: {
        apps: number;
        features: number;
        patterns: number;
        industry: number;
        competitors: number;
    };
    allocationStrategy: string;
}

export interface LLMKeywordResponse {
    keywords: LLMKeywordResult[];
    originalQuery: string;
    generationMethod: 'llm' | 'fallback';
    processingTime: number;
    enhancedStrategy?: EnhancedKeywordStrategy;
    totalThumbnailBudget?: number;
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

            // Calculate enhanced strategy metadata
            const enhancedStrategy = this.calculateEnhancedStrategy(llmResult);
            const totalThumbnailBudget = llmResult.reduce((sum, k) => sum + (k.thumbnailAllocation || 0), 0);

            console.log(`[${new Date().toISOString()}] [LLM_KEYWORDS_V2] GENERATION_SUCCESS:`, {
                keywordsCount: llmResult.length,
                processingTime,
                keywords: llmResult.map(k => k.term),
                totalThumbnailBudget,
                enhancedStrategy
            });

            return {
                keywords: llmResult,
                originalQuery: userQuery,
                generationMethod: 'llm',
                processingTime,
                enhancedStrategy,
                totalThumbnailBudget
            };

        } catch (error) {
            console.error(`[${new Date().toISOString()}] [LLM_KEYWORDS_V2] GENERATION_FAILED:`, {
                error: error.message,
                query: userQuery
            });

            // Fallback to enhanced extraction
            const fallbackKeywords = this.generateEnhancedFallbackKeywords(userQuery);
            const processingTime = Date.now() - startTime;

            // Add basic allocation for fallback keywords
            const enhancedFallbackKeywords = fallbackKeywords.map(keyword => ({
                ...keyword,
                type: 'feature' as const,
                thumbnailAllocation: this.validateThumbnailAllocation(undefined, keyword.confidence),
                isCompetitor: false
            }));

            const enhancedStrategy = this.calculateEnhancedStrategy(enhancedFallbackKeywords);
            const totalThumbnailBudget = enhancedFallbackKeywords.reduce((sum, k) => sum + (k.thumbnailAllocation || 0), 0);

            console.log(`[${new Date().toISOString()}] [LLM_KEYWORDS_V2] FALLBACK_USED:`, {
                keywordsCount: enhancedFallbackKeywords.length,
                processingTime,
                keywords: enhancedFallbackKeywords.map(k => k.term),
                totalThumbnailBudget,
                enhancedStrategy
            });

            return {
                keywords: enhancedFallbackKeywords,
                originalQuery: userQuery,
                generationMethod: 'fallback',
                processingTime,
                enhancedStrategy,
                totalThumbnailBudget
            };
        }
    }

    /**
     * Calculate enhanced strategy metadata
     */
    private calculateEnhancedStrategy(keywords: LLMKeywordResult[]): EnhancedKeywordStrategy {
        const breakdown = {
            apps: 0,
            features: 0,
            patterns: 0,
            industry: 0,
            competitors: 0
        };

        let totalThumbnailBudget = 0;

        keywords.forEach(keyword => {
            if (keyword.type) {
                if (keyword.type === 'app') {
                    breakdown.apps++;
                } else if (keyword.type === 'feature') {
                    breakdown.features++;
                } else if (keyword.type === 'pattern') {
                    breakdown.patterns++;
                } else if (keyword.type === 'industry') {
                    breakdown.industry++;
                }
            }

            if (keyword.isCompetitor) {
                breakdown.competitors++;
            }

            totalThumbnailBudget += keyword.thumbnailAllocation || 0;
        });

        // Determine allocation strategy description
        let allocationStrategy = 'Balanced allocation';
        if (breakdown.apps > 0 && breakdown.competitors > 0) {
            allocationStrategy = 'App-focused with competitive intelligence';
        } else if (breakdown.features > breakdown.apps) {
            allocationStrategy = 'Feature-driven research approach';
        } else if (breakdown.apps > 0) {
            allocationStrategy = 'App-centric design exploration';
        }

        return {
            totalKeywords: keywords.length,
            totalThumbnailBudget,
            keywordBreakdown: breakdown,
            allocationStrategy
        };
    }

    /**
     * Call Claude via Vertex AI for keyword generation using V2 prompt
     */
    private async callClaudeForKeywordsV2(userQuery: string): Promise<LLMKeywordResult[]> {
        const systemPrompt = promptManager.getSystemPrompt('keyword-extraction-v2');
        const userMessage = promptManager.getUserPrompt('keyword-extraction-v2', { userQuery });

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

            // Parse JSON response - handle markdown code blocks with improved parsing
            let jsonText = responseText;

            // Strategy 1: Try to extract from markdown code blocks
            const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch) {
                jsonText = codeBlockMatch[1].trim();
                console.log(`[${new Date().toISOString()}] [LLM_KEYWORDS_V2] EXTRACTED_FROM_CODE_BLOCK`);
            } else {
                // Strategy 2: Find JSON object pattern directly (fallback for truncated responses)
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    jsonText = jsonMatch[0].trim();
                    console.log(`[${new Date().toISOString()}] [LLM_KEYWORDS_V2] EXTRACTED_FROM_JSON_PATTERN`);
                } else {
                    // Strategy 3: Remove all markdown formatting and try to find JSON
                    jsonText = responseText.replace(/```[^`]*```/g, '').replace(/```/g, '').trim();
                    console.log(`[${new Date().toISOString()}] [LLM_KEYWORDS_V2] CLEANED_MARKDOWN_FORMATTING`);
                }
            }

            const parsed = JSON.parse(jsonText);

            if (!parsed.keywords || !Array.isArray(parsed.keywords)) {
                throw new Error('Invalid keywords format in V2 response');
            }

            // Enhanced validation for V2 with new fields
            const validKeywords: LLMKeywordResult[] = [];
            let totalAllocation = 0;

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

                        // Validate and normalize enhanced fields
                        const confidence = Math.min(Math.max(keyword.confidence, 0.5), 1.0);
                        const type = this.validateKeywordType(keyword.type);
                        const thumbnailAllocation = this.validateThumbnailAllocation(keyword.thumbnailAllocation, confidence);
                        const isCompetitor = Boolean(keyword.isCompetitor);
                        const parentApp = keyword.parentApp ? String(keyword.parentApp).toLowerCase() : undefined;

                        totalAllocation += thumbnailAllocation;

                        validKeywords.push({
                            term: cleanTerm,
                            confidence,
                            reasoning: keyword.reasoning || 'Enhanced V2 extraction',
                            type,
                            thumbnailAllocation,
                            isCompetitor,
                            parentApp
                        });
                    }
                }
            }

            // Enhanced V2 requirements: 2-10 keywords
            if (validKeywords.length === 0) {
                throw new Error('No valid keywords extracted from LLM V2 response');
            }

            // Ensure total allocation is within budget (50-100 thumbnails)
            if (totalAllocation > 100) {
                console.warn(`[${new Date().toISOString()}] [LLM_KEYWORDS_V2] ALLOCATION_OVER_BUDGET:`, {
                    totalAllocation,
                    budget: 100,
                    adjusting: true
                });
                // Scale down allocations proportionally
                const scaleFactor = 100 / totalAllocation;
                validKeywords.forEach(keyword => {
                    keyword.thumbnailAllocation = Math.max(3, Math.round(keyword.thumbnailAllocation! * scaleFactor));
                });
            }

            // Sort by confidence and ensure 2-10 keywords
            const sortedKeywords = validKeywords
                .sort((a, b) => b.confidence - a.confidence)
                .slice(0, 10);

            // Ensure minimum 2 keywords for enhanced V2
            if (sortedKeywords.length < 2) {
                console.warn(`[${new Date().toISOString()}] [LLM_KEYWORDS_V2] INSUFFICIENT_KEYWORDS:`, {
                    extracted: sortedKeywords.length,
                    required: 2
                });
            }

            console.log(`[${new Date().toISOString()}] [LLM_KEYWORDS_V2] ENHANCED_PARSING_SUCCESS:`, {
                keywordCount: sortedKeywords.length,
                totalAllocation: sortedKeywords.reduce((sum, k) => sum + (k.thumbnailAllocation || 0), 0),
                typeBreakdown: this.getTypeBreakdown(sortedKeywords),
                competitorCount: sortedKeywords.filter(k => k.isCompetitor).length
            });

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
     * Validate and normalize keyword type
     */
    private validateKeywordType(type: any): 'app' | 'feature' | 'pattern' | 'industry' {
        const validTypes = ['app', 'feature', 'pattern', 'industry'];
        if (typeof type === 'string' && validTypes.includes(type.toLowerCase())) {
            return type.toLowerCase() as 'app' | 'feature' | 'pattern' | 'industry';
        }
        return 'feature'; // Default to feature if invalid
    }

    /**
     * Validate and normalize thumbnail allocation
     */
    private validateThumbnailAllocation(allocation: any, confidence: number): number {
        // If allocation is provided and valid, use it
        if (typeof allocation === 'number' && allocation >= 3 && allocation <= 15) {
            return Math.round(allocation);
        }

        // Otherwise, calculate based on confidence
        if (confidence >= 0.8) return 12; // High confidence
        if (confidence >= 0.6) return 8;  // Medium confidence
        return 5; // Low confidence
    }

    /**
     * Get type breakdown for logging
     */
    private getTypeBreakdown(keywords: LLMKeywordResult[]): Record<string, number> {
        const breakdown = { app: 0, feature: 0, pattern: 0, industry: 0 };
        keywords.forEach(keyword => {
            if (keyword.type) {
                breakdown[keyword.type]++;
            }
        });
        return breakdown;
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
            max_tokens: 800,  // Increased for V2 to allow complete JSON responses (was 300)
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
