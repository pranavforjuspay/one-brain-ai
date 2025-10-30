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
    // V3 additions
    axis?: string;
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

// V3 Axis Strategy Interface
export interface AxisStrategy {
    briefType: 'flow' | 'pattern' | 'component' | 'screen' | 'style' | 'domain';
    dominantAxis: string;
    allocation: Record<string, string>; // {"direct competitors": "60%", ...}
    rationale: string;
    axisEvidence: string;
}

// V3 Keyword Result Interface
export interface V3KeywordResult {
    term: string;
    confidence: number;
    type: 'app' | 'feature' | 'pattern' | 'industry';
    axis: string;
    thumbnailAllocation: number;
    isCompetitor: boolean;
    parentApp: string;
    rationale: string;
}

// V3 Response Interface
export interface V3KeywordResponse {
    axisStrategy: AxisStrategy;
    keywords: V3KeywordResult[];
}

export interface LLMKeywordResponse {
    keywords: LLMKeywordResult[];
    originalQuery: string;
    generationMethod: 'llm-v3' | 'llm-v2' | 'fallback';
    processingTime: number;
    enhancedStrategy?: EnhancedKeywordStrategy;
    totalThumbnailBudget?: number;
    // V3 additions
    axisStrategy?: AxisStrategy;
    version?: 'v2' | 'v3';
    // Optimization additions
    optimizationApplied?: boolean;
    optimizationSummary?: OptimizationSummary;
}

// Optimization interfaces
export interface OptimizedKeywordResult {
    term: string;
    confidence: number;
    type: 'app' | 'feature' | 'pattern' | 'industry';
    thumbnailAllocation: number;
    isCompetitor: boolean;
    parentApp: string;
    rationale: string;
    optimizationReason: string;
}

export interface OptimizationSummary {
    totalChanges: number;
    humanizedTerms: number;
    adjustedAllocations: number;
    removedKeywords: number;
    overallRationale: string;
}

export interface OptimizationResponse {
    optimizedKeywords: OptimizedKeywordResult[];
    optimizationSummary: OptimizationSummary;
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
     * Generate search keywords from user query using V3-first approach with V2 fallback
     */
    async generateKeywords(userQuery: string, enableOptimization: boolean = true): Promise<LLMKeywordResponse> {
        const startTime = Date.now();

        console.log(`[${new Date().toISOString()}] [LLM_KEYWORDS] GENERATION_START:`, {
            query: userQuery,
            queryLength: userQuery.length,
            timestamp: new Date().toISOString(),
            strategy: 'V3-first with V2 fallback'
        });

        // V3 → V2 → Fallback chain
        try {
            // Attempt V3 extraction first
            return await this.generateKeywordsV3(userQuery, startTime, enableOptimization);
        } catch (v3Error) {
            const v3ErrorMessage = v3Error instanceof Error ? v3Error.message : String(v3Error);
            console.warn(`[${new Date().toISOString()}] [LLM_KEYWORDS] V3_FAILED, FALLING_BACK_TO_V2:`, {
                error: v3ErrorMessage,
                query: userQuery.substring(0, 100) + '...'
            });

            try {
                // Fallback to V2
                return await this.generateKeywordsV2(userQuery, startTime);
            } catch (v2Error) {
                const v2ErrorMessage = v2Error instanceof Error ? v2Error.message : String(v2Error);
                console.warn(`[${new Date().toISOString()}] [LLM_KEYWORDS] V2_FAILED, USING_LEGACY_FALLBACK:`, {
                    v3Error: v3ErrorMessage,
                    v2Error: v2ErrorMessage,
                    query: userQuery.substring(0, 100) + '...'
                });

                // Final fallback to legacy extraction
                return this.generateFallbackKeywords(userQuery, startTime);
            }
        }
    }

    /**
     * Generate keywords using V3.7 intent-aware research framework (primary method)
     */
    private async generateKeywordsV3(userQuery: string, startTime: number, enableOptimization: boolean = true): Promise<LLMKeywordResponse> {
        console.log(`[${new Date().toISOString()}] [LLM_KEYWORDS_V3.7] ATTEMPTING_V3.7_EXTRACTION`);

        // Use V3.7 by default - intent-aware axis routing
        const systemPrompt = promptManager.getSystemPrompt('keyword-extraction-v3.7');
        const userMessage = promptManager.getUserPrompt('keyword-extraction-v3.7', { userQuery });

        const result = await this.callAnthropicAPI(systemPrompt, userMessage);
        const v3Response = this.parseAndValidateKeywordsV3(result);

        const processingTime = Date.now() - startTime;

        // Convert V3 keywords to LLMKeywordResult format
        const keywords: LLMKeywordResult[] = v3Response.keywords.map(k => ({
            term: k.term,
            confidence: k.confidence,
            reasoning: k.rationale,
            type: k.type,
            thumbnailAllocation: k.thumbnailAllocation,
            isCompetitor: k.isCompetitor,
            parentApp: k.parentApp || undefined,
            axis: k.axis
        }));

        let finalKeywords = keywords;
        let optimizationApplied = false;
        let optimizationSummary: OptimizationSummary | undefined;

        // Apply optimization if enabled
        if (enableOptimization) {
            try {
                console.log(`[${new Date().toISOString()}] [LLM_KEYWORDS_V3] APPLYING_OPTIMIZATION:`, {
                    enableOptimization,
                    originalKeywordCount: keywords.length,
                    originalKeywords: keywords.map(k => k.term)
                });
                const optimizationResult = await this.applyKeywordOptimization(userQuery, keywords);

                // Convert optimized keywords back to LLMKeywordResult format
                finalKeywords = optimizationResult.optimizedKeywords.map((k: OptimizedKeywordResult) => ({
                    term: k.term,
                    confidence: k.confidence,
                    reasoning: k.rationale,
                    type: k.type,
                    thumbnailAllocation: k.thumbnailAllocation,
                    isCompetitor: k.isCompetitor,
                    parentApp: k.parentApp || undefined
                }));

                optimizationApplied = true;
                optimizationSummary = optimizationResult.optimizationSummary;

                console.log(`[${new Date().toISOString()}] [LLM_KEYWORDS_V3] OPTIMIZATION_SUCCESS:`, {
                    originalCount: keywords.length,
                    optimizedCount: finalKeywords.length,
                    totalChanges: optimizationSummary?.totalChanges || 0,
                    rationale: optimizationSummary?.overallRationale || 'No rationale provided'
                });
            } catch (optimizationError) {
                console.warn(`[${new Date().toISOString()}] [LLM_KEYWORDS_V3] OPTIMIZATION_FAILED:`, {
                    error: optimizationError instanceof Error ? optimizationError.message : String(optimizationError),
                    fallbackToOriginal: true
                });
                // Continue with original keywords if optimization fails
            }
        }

        const enhancedStrategy = this.calculateEnhancedStrategy(finalKeywords);
        const totalThumbnailBudget = finalKeywords.reduce((sum, k) => sum + (k.thumbnailAllocation || 0), 0);

        console.log(`[${new Date().toISOString()}] [LLM_KEYWORDS_V3] GENERATION_SUCCESS:`, {
            keywordsCount: finalKeywords.length,
            processingTime,
            keywords: finalKeywords.map(k => k.term),
            totalThumbnailBudget,
            axisStrategy: v3Response.axisStrategy,
            enhancedStrategy,
            optimizationApplied
        });

        return {
            keywords: finalKeywords,
            originalQuery: userQuery,
            generationMethod: 'llm-v3',
            processingTime,
            enhancedStrategy,
            totalThumbnailBudget,
            axisStrategy: v3Response.axisStrategy,
            version: 'v3',
            optimizationApplied,
            optimizationSummary
        };
    }

    /**
     * Generate keywords using V2 approach (fallback from V3)
     */
    private async generateKeywordsV2(userQuery: string, startTime: number): Promise<LLMKeywordResponse> {
        console.log(`[${new Date().toISOString()}] [LLM_KEYWORDS_V2] ATTEMPTING_V2_EXTRACTION`);

        const llmResult = await this.callClaudeForKeywordsV2(userQuery);
        const processingTime = Date.now() - startTime;

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
            generationMethod: 'llm-v2',
            processingTime,
            enhancedStrategy,
            totalThumbnailBudget,
            version: 'v2'
        };
    }

    /**
     * Generate fallback keywords (final fallback)
     */
    private generateFallbackKeywords(userQuery: string, startTime: number): LLMKeywordResponse {
        console.log(`[${new Date().toISOString()}] [LLM_KEYWORDS_FALLBACK] USING_LEGACY_EXTRACTION`);

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

        console.log(`[${new Date().toISOString()}] [LLM_KEYWORDS_FALLBACK] FALLBACK_COMPLETE:`, {
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
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[${new Date().toISOString()}] [LLM_KEYWORDS_V2] PARSE_ERROR:`, {
                error: errorMessage,
                response: llmResponse
            });
            throw new Error(`Failed to parse LLM V2 response: ${errorMessage}`);
        }
    }

    /**
     * Parse and validate V3 LLM response with axis strategy validation
     */
    private parseAndValidateKeywordsV3(llmResponse: any): V3KeywordResponse {
        try {
            let responseText = '';

            // Extract text from Claude response format
            if (llmResponse.content && llmResponse.content.length > 0 && llmResponse.content[0].type === 'text') {
                responseText = llmResponse.content[0].text;
            } else {
                throw new Error('Invalid response format from Claude V3');
            }

            // Parse JSON response - V3 expects pure JSON without markdown
            let jsonText = responseText.trim();

            // Remove any markdown code blocks if present
            const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch) {
                jsonText = codeBlockMatch[1].trim();
                console.log(`[${new Date().toISOString()}] [LLM_KEYWORDS_V3] EXTRACTED_FROM_CODE_BLOCK`);
            } else {
                // Try to find JSON object pattern
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    jsonText = jsonMatch[0].trim();
                    console.log(`[${new Date().toISOString()}] [LLM_KEYWORDS_V3] EXTRACTED_FROM_JSON_PATTERN`);
                }
            }

            const parsed = JSON.parse(jsonText);

            // Validate V3 response structure
            if (!parsed.axisStrategy || !parsed.keywords || !Array.isArray(parsed.keywords)) {
                throw new Error('Invalid V3 response structure - missing axisStrategy or keywords');
            }

            // Validate axis strategy
            const axisStrategy = this.validateAxisStrategy(parsed.axisStrategy);

            // Validate keywords
            const validKeywords: V3KeywordResult[] = [];
            let totalAllocation = 0;

            for (const keyword of parsed.keywords) {
                if (keyword.term && typeof keyword.term === 'string' && keyword.confidence) {
                    // V3 validation: supports single words and bi-phrases
                    const cleanTerm = keyword.term.trim().toLowerCase();

                    // V3 term validation (more flexible than V2)
                    if (cleanTerm.length > 0 &&
                        cleanTerm.length <= 25 &&
                        /^[a-z0-9]+(\s[a-z0-9]+)?$/.test(cleanTerm)) { // Single word or bi-phrase

                        // Validate V3 fields (updated for V3.3.1 PCA ranges)
                        const confidence = Math.min(Math.max(keyword.confidence, 0.6), 1.0);
                        const type = this.validateKeywordType(keyword.type);
                        const thumbnailAllocation = Math.min(Math.max(keyword.thumbnailAllocation || 5, 2), 30); // V3.3.1 range: 2-30
                        const isCompetitor = Boolean(keyword.isCompetitor);
                        const parentApp = keyword.parentApp ? String(keyword.parentApp).toLowerCase() : '';
                        const axis = keyword.axis || 'functional micro-patterns';
                        const rationale = keyword.rationale || 'V3 extraction';

                        totalAllocation += thumbnailAllocation;

                        validKeywords.push({
                            term: cleanTerm,
                            confidence,
                            type,
                            axis,
                            thumbnailAllocation,
                            isCompetitor,
                            parentApp,
                            rationale
                        });
                    }
                }
            }

            // V3.6 requirements: 12-18 keywords, 80-150 total allocation
            if (validKeywords.length < 12) {
                throw new Error(`Insufficient keywords in V3.6 response: ${validKeywords.length} (minimum 12)`);
            }

            if (totalAllocation < 80 || totalAllocation > 150) {
                console.warn(`[${new Date().toISOString()}] [LLM_KEYWORDS_V3] ALLOCATION_OUT_OF_RANGE:`, {
                    totalAllocation,
                    range: '80-150',
                    adjusting: true
                });

                // Adjust allocations to fit range (V3.6 enhanced ranges)
                const targetAllocation = Math.min(Math.max(totalAllocation, 80), 150);
                const scaleFactor = targetAllocation / totalAllocation;
                validKeywords.forEach(keyword => {
                    keyword.thumbnailAllocation = Math.min(Math.max(Math.round(keyword.thumbnailAllocation * scaleFactor), 2), 30);
                });
            }

            // Sort by priority (already ordered in V3 response)
            const sortedKeywords = validKeywords.slice(0, 18); // Max 18 keywords

            console.log(`[${new Date().toISOString()}] [LLM_KEYWORDS_V3] PARSING_SUCCESS:`, {
                keywordCount: sortedKeywords.length,
                totalAllocation: sortedKeywords.reduce((sum, k) => sum + k.thumbnailAllocation, 0),
                axisStrategy: axisStrategy.dominantAxis,
                briefType: axisStrategy.briefType
            });

            return {
                axisStrategy,
                keywords: sortedKeywords
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[${new Date().toISOString()}] [LLM_KEYWORDS_V3] PARSE_ERROR:`, {
                error: errorMessage,
                response: llmResponse
            });
            throw new Error(`Failed to parse LLM V3 response: ${errorMessage}`);
        }
    }

    /**
     * Validate axis strategy structure
     */
    private validateAxisStrategy(axisStrategy: any): AxisStrategy {
        const validBriefTypes = ['flow', 'pattern', 'component', 'screen', 'style', 'domain'];
        const validAxes = [
            'direct competitors',
            'adjacent spaces',
            'category exemplars',
            'cross-domain analogies',
            'functional micro-patterns',
            'aesthetic models'
        ];

        const briefType = validBriefTypes.includes(axisStrategy.briefType)
            ? axisStrategy.briefType
            : 'pattern';

        const dominantAxis = validAxes.includes(axisStrategy.dominantAxis)
            ? axisStrategy.dominantAxis
            : 'functional micro-patterns';

        // Validate allocation percentages sum to 100
        const allocation = axisStrategy.allocation || {};
        const totalPercentage = Object.values(allocation)
            .map((val: any) => parseInt(String(val).replace('%', '')) || 0)
            .reduce((sum: number, val: number) => sum + val, 0);

        if (totalPercentage !== 100) {
            console.warn(`[${new Date().toISOString()}] [LLM_KEYWORDS_V3] ALLOCATION_PERCENTAGE_INVALID:`, {
                totalPercentage,
                allocation
            });
        }

        return {
            briefType,
            dominantAxis,
            allocation,
            rationale: axisStrategy.rationale || 'V3 axis strategy',
            axisEvidence: axisStrategy.axisEvidence || 'V3 evidence'
        };
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

        // Determine appropriate token limit based on prompt complexity
        const isV3Prompt = systemPrompt.includes('HUMAN INSPIRATION AXES') || systemPrompt.includes('PCA');
        const maxTokens = isV3Prompt ? 2000 : 800; // V3.6 needs significantly more tokens for 12-18 keywords + complex JSON structure

        const requestBody = {
            anthropic_version: "vertex-2023-10-16",
            stream: false,
            max_tokens: maxTokens,
            temperature: 0.1, // Lower temperature for consistency
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
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to get access token: ${errorMessage}`);
        }
    }

    /**
     * Apply keyword optimization using context-aware LLM refinement
     */
    private async applyKeywordOptimization(userQuery: string, originalKeywords: LLMKeywordResult[]): Promise<OptimizationResponse> {
        console.log(`[${new Date().toISOString()}] [LLM_OPTIMIZATION] STARTING_OPTIMIZATION:`, {
            userQuery: userQuery.substring(0, 100) + '...',
            originalCount: originalKeywords.length
        });

        // Prepare original keywords for optimization prompt
        const keywordsForPrompt = originalKeywords.map(k => ({
            term: k.term,
            confidence: k.confidence,
            type: k.type || 'feature',
            thumbnailAllocation: k.thumbnailAllocation || 5,
            isCompetitor: k.isCompetitor || false,
            parentApp: k.parentApp || '',
            rationale: k.reasoning || 'Original V3.7 generation'
        }));

        const systemPrompt = promptManager.getSystemPrompt('keyword-optimization');
        const userMessage = promptManager.getUserPrompt('keyword-optimization', {
            userQuery,
            originalKeywords: JSON.stringify(keywordsForPrompt, null, 2)
        });

        const result = await this.callAnthropicAPI(systemPrompt, userMessage);

        return this.parseAndValidateOptimization(result, originalKeywords);
    }

    /**
     * Parse and validate optimization response
     */
    private parseAndValidateOptimization(llmResponse: any, originalKeywords: LLMKeywordResult[]): OptimizationResponse {
        try {
            let responseText = '';

            // Extract text from Claude response format
            if (llmResponse.content && llmResponse.content.length > 0 && llmResponse.content[0].type === 'text') {
                responseText = llmResponse.content[0].text;
            } else {
                throw new Error('Invalid response format from optimization LLM');
            }

            // Parse JSON response
            let jsonText = responseText.trim();

            // Remove markdown code blocks if present
            const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch) {
                jsonText = codeBlockMatch[1].trim();
            } else {
                // Try to find JSON object pattern
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    jsonText = jsonMatch[0].trim();
                }
            }

            const parsed = JSON.parse(jsonText);

            // Validate response structure
            if (!parsed.optimizedKeywords || !Array.isArray(parsed.optimizedKeywords)) {
                throw new Error('Invalid optimization response structure - missing optimizedKeywords');
            }

            if (!parsed.optimizationSummary) {
                throw new Error('Invalid optimization response structure - missing optimizationSummary');
            }

            // Validate and clean optimized keywords
            const validOptimizedKeywords: OptimizedKeywordResult[] = [];
            let totalAllocation = 0;

            for (const keyword of parsed.optimizedKeywords) {
                if (keyword.term && typeof keyword.term === 'string' && keyword.confidence) {
                    // Clean and validate term (preserve spaces for multi-word terms)
                    const cleanTerm = keyword.term.trim().toLowerCase();

                    // Validate term format (allow single words and bi-phrases)
                    if (cleanTerm.length > 0 &&
                        cleanTerm.length <= 30 &&
                        /^[a-z0-9]+(\s[a-z0-9]+)*$/.test(cleanTerm)) {

                        // Validate and normalize fields
                        const confidence = Math.min(Math.max(keyword.confidence, 0.6), 1.0);
                        const type = this.validateKeywordType(keyword.type);
                        const thumbnailAllocation = Math.min(Math.max(keyword.thumbnailAllocation || 5, 1), 30);
                        const isCompetitor = Boolean(keyword.isCompetitor);
                        const parentApp = keyword.parentApp ? String(keyword.parentApp).toLowerCase() : '';
                        const rationale = keyword.rationale || 'Optimized keyword';
                        const optimizationReason = keyword.optimizationReason || 'Optimization applied';

                        totalAllocation += thumbnailAllocation;

                        validOptimizedKeywords.push({
                            term: cleanTerm,
                            confidence,
                            type,
                            thumbnailAllocation,
                            isCompetitor,
                            parentApp,
                            rationale,
                            optimizationReason
                        });
                    }
                }
            }

            // Ensure we have a reasonable number of keywords
            if (validOptimizedKeywords.length === 0) {
                throw new Error('No valid optimized keywords produced');
            }

            // Ensure total allocation is within reasonable bounds
            if (totalAllocation > 150) {
                console.warn(`[${new Date().toISOString()}] [LLM_OPTIMIZATION] ALLOCATION_OVER_BUDGET:`, {
                    totalAllocation,
                    maxBudget: 150,
                    adjusting: true
                });

                // Scale down allocations proportionally
                const scaleFactor = 150 / totalAllocation;
                validOptimizedKeywords.forEach(keyword => {
                    keyword.thumbnailAllocation = Math.max(1, Math.round(keyword.thumbnailAllocation * scaleFactor));
                });
            }

            // Validate optimization summary
            const optimizationSummary: OptimizationSummary = {
                totalChanges: Number(parsed.optimizationSummary.totalChanges) || 0,
                humanizedTerms: Number(parsed.optimizationSummary.humanizedTerms) || 0,
                adjustedAllocations: Number(parsed.optimizationSummary.adjustedAllocations) || 0,
                removedKeywords: Number(parsed.optimizationSummary.removedKeywords) || 0,
                overallRationale: String(parsed.optimizationSummary.overallRationale) || 'Optimization completed'
            };

            console.log(`[${new Date().toISOString()}] [LLM_OPTIMIZATION] OPTIMIZATION_PARSED:`, {
                originalCount: originalKeywords.length,
                optimizedCount: validOptimizedKeywords.length,
                totalChanges: optimizationSummary.totalChanges,
                humanizedTerms: optimizationSummary.humanizedTerms,
                finalAllocation: validOptimizedKeywords.reduce((sum, k) => sum + k.thumbnailAllocation, 0)
            });

            return {
                optimizedKeywords: validOptimizedKeywords,
                optimizationSummary
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[${new Date().toISOString()}] [LLM_OPTIMIZATION] PARSE_ERROR:`, {
                error: errorMessage,
                response: llmResponse
            });
            throw new Error(`Failed to parse optimization response: ${errorMessage}`);
        }
    }
}
