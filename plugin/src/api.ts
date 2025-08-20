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
