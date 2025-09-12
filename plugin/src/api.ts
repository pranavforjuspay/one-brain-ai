const API_BASE = 'http://localhost:8787';

// Enhanced logging utility
function logAPI(operation: string, data: any) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [one-brain-ai] API ${operation}:`, data);
}

export async function aiPrepare(extraction: any): Promise<{ documentation?: string; format?: string; hasValidationWarning?: boolean; capsule?: any }> {
    const startTime = Date.now();

    logAPI('AI_PREPARE_START', {
        extractionSize: JSON.stringify(extraction).length,
        textSamples: extraction.textSamples?.length || 0,
        components: extraction.componentInstances?.length || 0,
        frameHints: extraction.frameNameHints?.length || 0,
        scope: extraction.scope,
        fileKey: extraction.fileKey,
        nodeName: extraction.nodeName
    });

    try {
        const requestBody = JSON.stringify({ extraction });
        logAPI('AI_PREPARE_REQUEST', {
            url: `${API_BASE}/ai/prepare`,
            method: 'POST',
            bodySize: requestBody.length,
            headers: { 'Content-Type': 'application/json' }
        });

        const res = await fetch(`${API_BASE}/ai/prepare`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody
        });

        const duration = Date.now() - startTime;

        logAPI('AI_PREPARE_RESPONSE', {
            status: res.status,
            statusText: res.statusText,
            ok: res.ok,
            duration: `${duration}ms`,
            contentType: res.headers ? res.headers.get('content-type') || 'unknown' : 'no-headers'
        });

        if (!res.ok) {
            const errorText = await res.text();
            logAPI('AI_PREPARE_ERROR', {
                status: res.status,
                statusText: res.statusText,
                errorBody: errorText,
                duration: `${duration}ms`
            });
            throw new Error(`AI prepare failed: ${res.status} - ${errorText}`);
        }

        const result = await res.json();

        // Check if this is the new prose format
        if (result.format === 'prose' && result.documentation) {
            logAPI('AI_PREPARE_SUCCESS_PROSE', {
                duration: `${duration}ms`,
                format: result.format,
                hasDocumentation: !!result.documentation,
                hasValidationWarning: result.hasValidationWarning,
                documentationLength: result.documentation?.length || 0,
                resultSize: JSON.stringify(result).length
            });
            return result;
        }

        // Legacy capsule format fallback
        logAPI('AI_PREPARE_SUCCESS_LEGACY', {
            duration: `${duration}ms`,
            capsuleTitle: result.capsule?.title,
            capsuleLevel: result.capsule?.level,
            capsuleComponents: result.capsule?.components?.length || 0,
            resultSize: JSON.stringify(result).length
        });

        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logAPI('AI_PREPARE_EXCEPTION', {
            error: errorMessage,
            stack: errorStack,
            duration: `${duration}ms`
        });
        throw error;
    }
}

export async function saveCapsule(capsule: any, fileKey: string, nodeId?: string) {
    const startTime = Date.now();

    logAPI('SAVE_CAPSULE_START', {
        capsuleTitle: capsule.title,
        capsuleLevel: capsule.level,
        fileKey,
        nodeId,
        capsuleSize: JSON.stringify(capsule).length
    });

    try {
        const requestBody = JSON.stringify({ capsule, fileKey, nodeId });
        logAPI('SAVE_CAPSULE_REQUEST', {
            url: `${API_BASE}/docs`,
            method: 'POST',
            bodySize: requestBody.length,
            headers: { 'Content-Type': 'application/json' }
        });

        const res = await fetch(`${API_BASE}/docs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody
        });

        const duration = Date.now() - startTime;

        logAPI('SAVE_CAPSULE_RESPONSE', {
            status: res.status,
            statusText: res.statusText,
            ok: res.ok,
            duration: `${duration}ms`,
            contentType: res.headers ? res.headers.get('content-type') || 'unknown' : 'no-headers'
        });

        if (!res.ok) {
            const errorText = await res.text();
            logAPI('SAVE_CAPSULE_ERROR', {
                status: res.status,
                statusText: res.statusText,
                errorBody: errorText,
                duration: `${duration}ms`
            });
            throw new Error(`Save failed: ${res.status} - ${errorText}`);
        }

        const result = await res.json();

        logAPI('SAVE_CAPSULE_SUCCESS', {
            duration: `${duration}ms`,
            resultSize: JSON.stringify(result).length,
            result
        });

        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logAPI('SAVE_CAPSULE_EXCEPTION', {
            error: errorMessage,
            stack: errorStack,
            duration: `${duration}ms`
        });
        throw error;
    }
}

// NEW: Phase 1 - Extract keywords only
export async function extractKeywords(problemStatement: string): Promise<{ keywords: string[]; metadata?: any }> {
    const startTime = Date.now();

    logAPI('EXTRACT_KEYWORDS_START', {
        problemStatement: problemStatement.substring(0, 100) + '...',
        problemLength: problemStatement.length
    });

    try {
        const requestBody = JSON.stringify({ problemStatement });
        logAPI('EXTRACT_KEYWORDS_REQUEST', {
            url: `${API_BASE}/inspiration/extract-keywords`,
            method: 'POST',
            bodySize: requestBody.length,
            headers: { 'Content-Type': 'application/json' }
        });

        const res = await fetch(`${API_BASE}/inspiration/extract-keywords`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody
        });

        const duration = Date.now() - startTime;

        logAPI('EXTRACT_KEYWORDS_RESPONSE', {
            status: res.status,
            statusText: res.statusText,
            ok: res.ok,
            duration: `${duration}ms`,
            contentType: res.headers ? res.headers.get('content-type') || 'unknown' : 'no-headers'
        });

        if (!res.ok) {
            const errorText = await res.text();
            logAPI('EXTRACT_KEYWORDS_ERROR', {
                status: res.status,
                statusText: res.statusText,
                errorBody: errorText,
                duration: `${duration}ms`
            });
            throw new Error(`Keyword extraction failed: ${res.status} - ${errorText}`);
        }

        const result = await res.json();

        logAPI('EXTRACT_KEYWORDS_SUCCESS', {
            duration: `${duration}ms`,
            keywordsCount: result.keywords?.length || 0,
            keywords: result.keywords,
            hasMetadata: !!result.metadata,
            generationMethod: result.metadata?.keywordGenerationMethod,
            resultSize: JSON.stringify(result).length
        });

        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logAPI('EXTRACT_KEYWORDS_EXCEPTION', {
            error: errorMessage,
            stack: errorStack,
            duration: `${duration}ms`
        });
        throw error;
    }
}

// NEW: Phase 2 - Search with known keywords
export async function searchWithKeywords(problemStatement: string, keywords: string[]): Promise<{ conversationalResponse?: string; mobbinLinks?: any[]; searchIntents?: any; finalKeywords?: string[] }> {
    const startTime = Date.now();

    logAPI('SEARCH_WITH_KEYWORDS_START', {
        problemStatement: problemStatement.substring(0, 100) + '...',
        problemLength: problemStatement.length,
        keywords,
        keywordsCount: keywords.length
    });

    try {
        const requestBody = JSON.stringify({ problemStatement, keywords });
        logAPI('SEARCH_WITH_KEYWORDS_REQUEST', {
            url: `${API_BASE}/inspiration/mobbin-search`,
            method: 'POST',
            bodySize: requestBody.length,
            headers: { 'Content-Type': 'application/json' }
        });

        const res = await fetch(`${API_BASE}/inspiration/mobbin-search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody
        });

        const duration = Date.now() - startTime;

        logAPI('SEARCH_WITH_KEYWORDS_RESPONSE', {
            status: res.status,
            statusText: res.statusText,
            ok: res.ok,
            duration: `${duration}ms`,
            contentType: res.headers ? res.headers.get('content-type') || 'unknown' : 'no-headers'
        });

        if (!res.ok) {
            const errorText = await res.text();
            logAPI('SEARCH_WITH_KEYWORDS_ERROR', {
                status: res.status,
                statusText: res.statusText,
                errorBody: errorText,
                duration: `${duration}ms`
            });
            throw new Error(`Search with keywords failed: ${res.status} - ${errorText}`);
        }

        const result = await res.json();

        logAPI('SEARCH_WITH_KEYWORDS_SUCCESS', {
            duration: `${duration}ms`,
            hasResponse: !!result.conversationalResponse,
            linksCount: result.mobbinLinks?.length || 0,
            hasSearchIntents: !!result.searchIntents,
            hasFinalKeywords: !!result.finalKeywords,
            finalKeywordsCount: result.finalKeywords?.length || 0,
            resultSize: JSON.stringify(result).length
        });

        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logAPI('SEARCH_WITH_KEYWORDS_EXCEPTION', {
            error: errorMessage,
            stack: errorStack,
            duration: `${duration}ms`
        });
        throw error;
    }
}

// NEW: Two-phase inspiration search with keyword transparency
export async function searchInspirationWithKeywordTransparency(problemStatement: string): Promise<{ conversationalResponse?: string; mobbinLinks?: any[]; searchIntents?: any; finalKeywords?: string[] }> {
    const startTime = Date.now();

    logAPI('SEARCH_INSPIRATION_TWO_PHASE_START', {
        problemStatement: problemStatement.substring(0, 100) + '...',
        problemLength: problemStatement.length
    });

    try {
        // Phase 1: Extract keywords
        logAPI('SEARCH_INSPIRATION_PHASE_1_START', { phase: 'keyword_extraction' });
        const keywordResult = await extractKeywords(problemStatement);
        const extractedKeywords = keywordResult.keywords;

        logAPI('SEARCH_INSPIRATION_PHASE_1_COMPLETE', {
            extractedKeywords,
            keywordsCount: extractedKeywords.length,
            generationMethod: keywordResult.metadata?.keywordGenerationMethod
        });

        // Phase 2: Search with extracted keywords
        logAPI('SEARCH_INSPIRATION_PHASE_2_START', {
            phase: 'mobbin_search',
            keywords: extractedKeywords
        });
        const searchResult = await searchWithKeywords(problemStatement, extractedKeywords);

        const totalDuration = Date.now() - startTime;
        logAPI('SEARCH_INSPIRATION_TWO_PHASE_COMPLETE', {
            totalDuration: `${totalDuration}ms`,
            hasResponse: !!searchResult.conversationalResponse,
            linksCount: searchResult.mobbinLinks?.length || 0,
            finalKeywords: searchResult.finalKeywords,
            success: true
        });

        return searchResult;
    } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logAPI('SEARCH_INSPIRATION_TWO_PHASE_EXCEPTION', {
            error: errorMessage,
            stack: errorStack,
            duration: `${duration}ms`
        });
        throw error;
    }
}

// LEGACY: Single-phase inspiration search (backward compatibility)
export async function searchInspiration(problemStatement: string): Promise<{ conversationalResponse?: string; mobbinLinks?: any[]; searchIntents?: any; finalKeywords?: string[] }> {
    const startTime = Date.now();

    logAPI('SEARCH_INSPIRATION_LEGACY_START', {
        problemStatement: problemStatement.substring(0, 100) + '...',
        problemLength: problemStatement.length
    });

    try {
        const requestBody = JSON.stringify({ problemStatement });
        logAPI('SEARCH_INSPIRATION_LEGACY_REQUEST', {
            url: `${API_BASE}/inspiration/mobbin-search`,
            method: 'POST',
            bodySize: requestBody.length,
            headers: { 'Content-Type': 'application/json' }
        });

        const res = await fetch(`${API_BASE}/inspiration/mobbin-search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody
        });

        const duration = Date.now() - startTime;

        logAPI('SEARCH_INSPIRATION_LEGACY_RESPONSE', {
            status: res.status,
            statusText: res.statusText,
            ok: res.ok,
            duration: `${duration}ms`,
            contentType: res.headers ? res.headers.get('content-type') || 'unknown' : 'no-headers'
        });

        if (!res.ok) {
            const errorText = await res.text();
            logAPI('SEARCH_INSPIRATION_LEGACY_ERROR', {
                status: res.status,
                statusText: res.statusText,
                errorBody: errorText,
                duration: `${duration}ms`
            });
            throw new Error(`Inspiration search failed: ${res.status} - ${errorText}`);
        }

        const result = await res.json();

        logAPI('SEARCH_INSPIRATION_LEGACY_SUCCESS', {
            duration: `${duration}ms`,
            hasResponse: !!result.conversationalResponse,
            linksCount: result.mobbinLinks?.length || 0,
            hasSearchIntents: !!result.searchIntents,
            hasFinalKeywords: !!result.finalKeywords,
            finalKeywordsCount: result.finalKeywords?.length || 0,
            resultSize: JSON.stringify(result).length
        });

        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logAPI('SEARCH_INSPIRATION_LEGACY_EXCEPTION', {
            error: errorMessage,
            stack: errorStack,
            duration: `${duration}ms`
        });
        throw error;
    }
}
