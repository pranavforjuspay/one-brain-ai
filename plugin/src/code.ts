/// <reference types="@figma/plugin-typings" />
import { extractFromSelection } from './extraction';
import { aiPrepare } from './api';
import { classifyToCapsule } from './classify';
import type { Capsule, DocLevel } from './types';

// Enhanced logging utility
function logWorkflow(step: string, data: any) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [one-brain-ai] WORKFLOW ${step}:`, data);
}

// Show UI immediately to prevent hangs
figma.showUI(__html__, { width: 400, height: 600 });

let pendingCapsule: Capsule | null = null;
let pendingProseData: any = null;
let isUIReady = false;

logWorkflow('PLUGIN_START', {
    fileKey: figma.fileKey,
    fileName: figma.root.name,
    pageName: figma.currentPage.name,
    selectionCount: figma.currentPage.selection.length,
    uiShown: true
});

// Detect scope based on selection
function detectScope(): DocLevel {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) return 'page';

    const primary = selection[0];
    const nodeType = (primary as any).type;

    if (nodeType === 'SECTION') return 'section';
    if (nodeType === 'FRAME') return 'frame';

    return 'frame'; // default fallback
}

// Main workflow - back to direct AI processing
async function runDocumentationWorkflow() {
    const workflowStartTime = Date.now();

    logWorkflow('WORKFLOW_START', {
        timestamp: new Date().toISOString(),
        fileKey: figma.fileKey,
        pageName: figma.currentPage.name,
        selectionCount: figma.currentPage.selection.length
    });

    try {
        // Step 1: Scope detection
        logWorkflow('SCOPE_DETECTION_START', {});
        const scope = detectScope();
        logWorkflow('SCOPE_DETECTION_COMPLETE', { scope });

        // Step 1: Show extraction status
        logWorkflow('EXTRACTION_UI_UPDATE', { step: 1, total: 3, message: 'Extracting design data...' });
        figma.ui.postMessage({
            type: 'status',
            message: 'Extracting design data...',
            step: 1,
            total: 3
        });

        // Enhanced extraction with progress tracking
        logWorkflow('EXTRACTION_START', { scope });
        const extractionStartTime = Date.now();

        const extraction = await extractFromSelection(scope, (message, detail) => {
            logWorkflow('EXTRACTION_PROGRESS', { message, detail });
            figma.ui.postMessage({
                type: 'detailed-status',
                message,
                detail: detail || '',
                step: 1,
                total: 3
            });
        });

        const extractionDuration = Date.now() - extractionStartTime;
        logWorkflow('EXTRACTION_COMPLETE', {
            duration: `${extractionDuration}ms`,
            textSamples: extraction.textSamples?.length || 0,
            components: extraction.componentInstances?.length || 0,
            frameHints: extraction.frameNameHints?.length || 0,
            links: extraction.deepLinks?.length || 0,
            extractionSize: JSON.stringify(extraction).length
        });

        // Step 2: AI Processing
        logWorkflow('AI_PROCESSING_UI_UPDATE', { step: 2, total: 3, message: 'Sending to AI for analysis...' });
        figma.ui.postMessage({
            type: 'status',
            message: 'Sending to AI for analysis...',
            step: 2,
            total: 3
        });

        let result: any;
        const aiStartTime = Date.now();

        try {
            logWorkflow('AI_PROCESSING_START', { extractionSize: JSON.stringify(extraction).length });
            result = await aiPrepare(extraction);
            const aiDuration = Date.now() - aiStartTime;

            // Check if we got prose documentation
            if (result.format === 'prose' && result.documentation) {
                logWorkflow('AI_PROCESSING_SUCCESS_PROSE', {
                    duration: `${aiDuration}ms`,
                    format: result.format,
                    hasDocumentation: !!result.documentation,
                    hasValidationWarning: result.hasValidationWarning,
                    documentationLength: result.documentation?.length || 0
                });

                // Step 3: Prose documentation ready
                logWorkflow('PROSE_DOCUMENTATION_READY', {});
                figma.ui.postMessage({
                    type: 'status',
                    message: 'Documentation generated successfully!',
                    step: 3,
                    total: 3
                });

                // Send prose documentation to UI
                const proseData = {
                    documentation: result.documentation,
                    format: result.format,
                    hasValidationWarning: result.hasValidationWarning,
                    level: scope
                };

                if (isUIReady) {
                    logWorkflow('SENDING_PROSE_TO_UI', {
                        documentationLength: result.documentation?.length || 0,
                        hasValidationWarning: result.hasValidationWarning
                    });
                    figma.ui.postMessage({
                        type: 'prose-documentation',
                        data: proseData
                    });
                } else {
                    // Store prose data for when UI is ready
                    pendingProseData = proseData;
                    logWorkflow('PROSE_DATA_STORED', {
                        proseReady: true,
                        uiReady: isUIReady,
                        willSendImmediately: isUIReady
                    });

                    // Fallback: Send prose after a delay if UI hasn't responded
                    logWorkflow('SETTING_PROSE_FALLBACK_TIMER', { delay: '2000ms' });
                    setTimeout(() => {
                        if (!isUIReady && pendingProseData) {
                            logWorkflow('PROSE_FALLBACK_TRIGGERED', {
                                reason: 'UI ready message not received'
                            });
                            figma.ui.postMessage({
                                type: 'prose-documentation',
                                data: pendingProseData
                            });
                        }
                    }, 2000);
                }

                const totalDuration = Date.now() - workflowStartTime;
                logWorkflow('WORKFLOW_COMPLETE_PROSE', {
                    totalDuration: `${totalDuration}ms`,
                    aiDuration: `${aiDuration}ms`,
                    success: true,
                    format: 'prose'
                });
                return; // Exit early for prose format
            }

            // Legacy capsule format fallback
            const capsule = result.capsule;
            logWorkflow('AI_PROCESSING_SUCCESS_LEGACY', {
                duration: `${aiDuration}ms`,
                capsuleTitle: capsule.title,
                capsuleLevel: capsule.level,
                capsuleSize: JSON.stringify(capsule).length
            });

            // Step 3: Form preparation (legacy path)
            logWorkflow('FORM_PREPARATION_START', {});
            figma.ui.postMessage({
                type: 'status',
                message: 'Preparing documentation form...',
                step: 3,
                total: 3
            });

            // Store capsule and send when UI is ready
            pendingCapsule = capsule;
            logWorkflow('CAPSULE_STORED', {
                capsuleReady: true,
                uiReady: isUIReady,
                willSendImmediately: isUIReady
            });

            if (isUIReady) {
                logWorkflow('SENDING_PREFILL_TO_UI', { capsuleTitle: capsule.title });
                figma.ui.postMessage({
                    type: 'prefill',
                    data: { capsule }
                });
            } else {
                // Fallback: Send prefill after a delay if UI hasn't responded
                logWorkflow('SETTING_UI_FALLBACK_TIMER', { delay: '2000ms' });
                setTimeout(() => {
                    if (!isUIReady && pendingCapsule) {
                        logWorkflow('UI_FALLBACK_TRIGGERED', {
                            capsuleTitle: pendingCapsule.title,
                            reason: 'UI ready message not received'
                        });
                        figma.ui.postMessage({
                            type: 'prefill',
                            data: { capsule: pendingCapsule }
                        });
                    }
                }, 2000);
            }

        } catch (error) {
            const aiDuration = Date.now() - aiStartTime;
            const errorMessage = error instanceof Error ? error.message : String(error);

            logWorkflow('AI_PROCESSING_FAILED', {
                duration: `${aiDuration}ms`,
                error: errorMessage,
                fallbackToLocal: true
            });

            console.warn('[one-brain-ai] AI failed, using local classifier:', error);

            figma.ui.postMessage({
                type: 'status',
                message: 'AI unavailable, using local classification...',
                step: 2,
                total: 3
            });

            logWorkflow('LOCAL_CLASSIFICATION_START', {});
            const localStartTime = Date.now();
            const capsule = classifyToCapsule(extraction);
            const localDuration = Date.now() - localStartTime;

            logWorkflow('LOCAL_CLASSIFICATION_COMPLETE', {
                duration: `${localDuration}ms`,
                capsuleTitle: capsule.title,
                capsuleLevel: capsule.level
            });

            // Step 3: Form preparation (fallback path)
            logWorkflow('FORM_PREPARATION_START', {});
            figma.ui.postMessage({
                type: 'status',
                message: 'Preparing documentation form...',
                step: 3,
                total: 3
            });

            // Store capsule and send when UI is ready
            pendingCapsule = capsule;
            logWorkflow('CAPSULE_STORED', {
                capsuleReady: true,
                uiReady: isUIReady,
                willSendImmediately: isUIReady
            });

            if (isUIReady) {
                logWorkflow('SENDING_PREFILL_TO_UI', { capsuleTitle: capsule.title });
                figma.ui.postMessage({
                    type: 'prefill',
                    data: { capsule }
                });
            } else {
                // Fallback: Send prefill after a delay if UI hasn't responded
                logWorkflow('SETTING_UI_FALLBACK_TIMER', { delay: '2000ms' });
                setTimeout(() => {
                    if (!isUIReady && pendingCapsule) {
                        logWorkflow('UI_FALLBACK_TRIGGERED', {
                            capsuleTitle: pendingCapsule.title,
                            reason: 'UI ready message not received'
                        });
                        figma.ui.postMessage({
                            type: 'prefill',
                            data: { capsule: pendingCapsule }
                        });
                    }
                }, 2000);
            }
        }

        const totalDuration = Date.now() - workflowStartTime;
        logWorkflow('WORKFLOW_COMPLETE', {
            totalDuration: `${totalDuration}ms`,
            extractionDuration: `${extractionDuration}ms`,
            success: true
        });

    } catch (error) {
        const totalDuration = Date.now() - workflowStartTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        logWorkflow('WORKFLOW_FAILED', {
            totalDuration: `${totalDuration}ms`,
            error: errorMessage,
            stack: errorStack
        });

        console.error('[one-brain-ai] Workflow failed:', error);
        figma.ui.postMessage({
            type: 'error',
            message: 'Failed to extract design data. Please try again.'
        });
    }
}

// Handle messages from UI
figma.ui.onmessage = async (msg) => {
    logWorkflow('UI_MESSAGE_RECEIVED', { type: msg.type, hasData: !!msg.data });

    try {
        if (msg.type === 'ui-ready') {
            logWorkflow('UI_READY_RECEIVED', {
                hadPendingCapsule: !!pendingCapsule,
                hadPendingProseData: !!pendingProseData
            });
            isUIReady = true;

            if (pendingProseData) {
                logWorkflow('SENDING_PENDING_PROSE_DATA', {
                    documentationLength: pendingProseData.documentation?.length || 0
                });
                figma.ui.postMessage({
                    type: 'prose-documentation',
                    data: pendingProseData
                });
            } else if (pendingCapsule) {
                logWorkflow('SENDING_PENDING_CAPSULE', { capsuleTitle: pendingCapsule.title });
                figma.ui.postMessage({
                    type: 'prefill',
                    data: { capsule: pendingCapsule }
                });
            }
        }

        if (msg.type === 'save') {
            const { capsule } = msg;
            logWorkflow('SAVE_REQUEST_START', {
                capsuleTitle: capsule.title,
                capsuleLevel: capsule.level,
                addBadge: msg.addBadge
            });

            figma.ui.postMessage({
                type: 'status',
                message: 'Saving documentation...',
                step: 1,
                total: 1
            });

            // Save to backend
            logWorkflow('BACKEND_SAVE_START', {});
            const saveStartTime = Date.now();

            const { saveCapsule } = await import('./api');
            const selection = figma.currentPage.selection;
            const nodeId = selection.length > 0 ? selection[0].id : undefined;

            await saveCapsule(capsule, figma.fileKey || '', nodeId);

            const saveDuration = Date.now() - saveStartTime;
            logWorkflow('BACKEND_SAVE_COMPLETE', {
                duration: `${saveDuration}ms`,
                nodeId
            });

            // Save summary to shared plugin data
            logWorkflow('PLUGIN_DATA_SAVE_START', {});
            const summary = {
                title: capsule.title,
                problem: capsule.problem,
                lastUpdated: capsule.lastUpdated,
                level: capsule.level
            };

            if (nodeId) {
                const node = figma.getNodeById(nodeId);
                if (node) {
                    node.setSharedPluginData('one-brain-ai', 'summary', JSON.stringify(summary));
                    logWorkflow('PLUGIN_DATA_SAVED', { nodeId, summarySize: JSON.stringify(summary).length });

                    // Add optional badge
                    if (msg.addBadge && (node.type === 'FRAME' || (node as any).type === 'SECTION')) {
                        logWorkflow('BADGE_CREATION_START', { nodeType: node.type });
                        await addDocumentationBadge(node as FrameNode);
                        logWorkflow('BADGE_CREATION_COMPLETE', {});
                    }
                }
            }

            logWorkflow('SAVE_SUCCESS_UI_UPDATE', {});
            figma.ui.postMessage({
                type: 'success',
                message: 'Documentation saved successfully!'
            });

            // Close after short delay
            logWorkflow('PLUGIN_CLOSE_SCHEDULED', { delay: '1500ms' });
            setTimeout(() => {
                logWorkflow('PLUGIN_CLOSING', {});
                figma.closePlugin();
            }, 1500);
        }

        if (msg.type === 'save-prose') {
            const { documentation, addBadge } = msg;
            logWorkflow('SAVE_PROSE_REQUEST_START', {
                documentationLength: documentation?.length || 0,
                addBadge
            });

            figma.ui.postMessage({
                type: 'status',
                message: 'Saving prose documentation...',
                step: 1,
                total: 1
            });

            // For now, we'll save prose documentation as a simple text note
            // In the future, this could be enhanced to save to a dedicated prose endpoint
            logWorkflow('PROSE_SAVE_START', {});
            const saveStartTime = Date.now();

            const selection = figma.currentPage.selection;
            const nodeId = selection.length > 0 ? selection[0].id : undefined;

            // Save prose documentation to plugin data
            if (nodeId) {
                const node = figma.getNodeById(nodeId);
                if (node) {
                    const proseData = {
                        documentation,
                        format: 'prose',
                        lastUpdated: new Date().toISOString(),
                        level: 'frame' // Default for now
                    };

                    node.setSharedPluginData('one-brain-ai', 'prose-documentation', JSON.stringify(proseData));
                    logWorkflow('PROSE_DATA_SAVED', {
                        nodeId,
                        documentationLength: documentation?.length || 0,
                        dataSize: JSON.stringify(proseData).length
                    });

                    // Add optional badge
                    if (addBadge && (node.type === 'FRAME' || (node as any).type === 'SECTION')) {
                        logWorkflow('BADGE_CREATION_START', { nodeType: node.type });
                        await addDocumentationBadge(node as FrameNode);
                        logWorkflow('BADGE_CREATION_COMPLETE', {});
                    }
                }
            }

            const saveDuration = Date.now() - saveStartTime;
            logWorkflow('PROSE_SAVE_COMPLETE', {
                duration: `${saveDuration}ms`,
                nodeId
            });

            logWorkflow('SAVE_PROSE_SUCCESS_UI_UPDATE', {});
            figma.ui.postMessage({
                type: 'success',
                message: 'Prose documentation saved successfully!'
            });

            // Close after short delay
            logWorkflow('PLUGIN_CLOSE_SCHEDULED', { delay: '1500ms' });
            setTimeout(() => {
                logWorkflow('PLUGIN_CLOSING', {});
                figma.closePlugin();
            }, 1500);
        }

        if (msg.type === 'document-selection') {
            logWorkflow('DOCUMENT_SELECTION_REQUEST', {
                selectionCount: figma.currentPage.selection.length
            });

            // Run the documentation workflow manually
            await runDocumentationWorkflow();
        }

        if (msg.type === 'search-inspiration') {
            const { problemStatement } = msg;
            const searchStartTime = Date.now();
            const searchId = Math.random().toString(36).substring(7);

            logWorkflow('INSPIRATION_SEARCH_REQUEST', {
                searchId,
                query: problemStatement?.substring(0, 100) + (problemStatement?.length > 100 ? '...' : ''),
                queryLength: problemStatement?.length || 0,
                timestamp: new Date().toISOString()
            });

            try {
                // Show initial loading state
                logWorkflow('INSPIRATION_SEARCH_UI_LOADING', {
                    searchId,
                    message: 'Extracting keywords...'
                });
                figma.ui.postMessage({
                    type: 'inspiration-loading',
                    message: 'Extracting keywords...'
                });

                // Use the new two-phase API function for keyword transparency
                const { extractKeywords, searchWithKeywords } = await import('./api');

                // Phase 1: Extract keywords
                logWorkflow('INSPIRATION_SEARCH_PHASE_1_START', {
                    searchId,
                    phase: 'keyword_extraction',
                    problemStatementLength: problemStatement?.length || 0
                });

                const keywordResult = await extractKeywords(problemStatement);
                const extractedKeywords = keywordResult.keywords;

                logWorkflow('INSPIRATION_SEARCH_PHASE_1_COMPLETE', {
                    searchId,
                    extractedKeywords,
                    keywordsCount: extractedKeywords.length,
                    generationMethod: keywordResult.metadata?.keywordGenerationMethod
                });

                // Show keywords to user immediately (keyword transparency!)
                if (extractedKeywords && extractedKeywords.length > 0) {
                    const keywordsText = extractedKeywords.join(', ');
                    logWorkflow('INSPIRATION_SEARCH_KEYWORDS_DISPLAYED', {
                        searchId,
                        extractedKeywords,
                        keywordsText,
                        transparencyAchieved: true
                    });

                    figma.ui.postMessage({
                        type: 'inspiration-loading',
                        message: `Searching Mobbin with keywords: ${keywordsText}...`
                    });
                }

                // Phase 2: Search with extracted keywords
                logWorkflow('INSPIRATION_SEARCH_PHASE_2_START', {
                    searchId,
                    phase: 'mobbin_search',
                    keywords: extractedKeywords
                });

                const result = await searchWithKeywords(problemStatement, extractedKeywords);
                const searchDuration = Date.now() - searchStartTime;

                logWorkflow('INSPIRATION_SEARCH_RESPONSE_PARSED', {
                    searchId,
                    hasConversationalResponse: !!result.conversationalResponse,
                    hasMobbinLinks: !!result.mobbinLinks,
                    hasSearchIntents: !!result.searchIntents,
                    hasFinalKeywords: !!result.finalKeywords,
                    mobbinLinksCount: result.mobbinLinks?.length || 0,
                    conversationalResponseLength: result.conversationalResponse?.length || 0,
                    searchIntentsCount: result.searchIntents ? Object.values(result.searchIntents).flat().length : 0,
                    finalKeywordsCount: result.finalKeywords?.length || 0,
                    totalDuration: `${searchDuration}ms`,
                    keywordTransparencyImplemented: true
                });

                logWorkflow('INSPIRATION_SEARCH_SUCCESS', {
                    searchId,
                    resultsCount: result.mobbinLinks?.length || 0,
                    hasResponse: !!result.conversationalResponse,
                    responseLength: result.conversationalResponse?.length || 0,
                    searchIntents: result.searchIntents,
                    finalKeywords: result.finalKeywords,
                    totalDuration: `${searchDuration}ms`,
                    twoPhaseApproach: true
                });

                // Send results to UI
                logWorkflow('INSPIRATION_SEARCH_SENDING_TO_UI', {
                    searchId,
                    messageType: 'inspiration-results',
                    dataKeys: Object.keys(result)
                });
                figma.ui.postMessage({
                    type: 'inspiration-results',
                    data: result
                });

            } catch (error) {
                const errorDuration = Date.now() - searchStartTime;
                const errorMessage = error instanceof Error ? error.message : String(error);
                const errorStack = error instanceof Error ? error.stack : undefined;

                logWorkflow('INSPIRATION_SEARCH_ERROR', {
                    searchId,
                    error: errorMessage,
                    errorStack,
                    query: problemStatement?.substring(0, 50),
                    duration: `${errorDuration}ms`,
                    errorType: error instanceof Error ? error.constructor.name : typeof error
                });

                console.error('[one-brain-ai] Inspiration search failed:', error);

                // Send error to UI
                logWorkflow('INSPIRATION_SEARCH_SENDING_ERROR_TO_UI', {
                    searchId,
                    messageType: 'inspiration-error',
                    errorMessage: 'Failed to search for inspiration. Please check your connection and try again.'
                });
                figma.ui.postMessage({
                    type: 'inspiration-error',
                    message: 'Failed to search for inspiration. Please check your connection and try again.'
                });
            }
        }

        if (msg.type === 'cancel') {
            logWorkflow('CANCEL_REQUEST', {});
            figma.closePlugin();
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        logWorkflow('MESSAGE_HANDLER_ERROR', {
            messageType: msg.type,
            error: errorMessage,
            stack: errorStack
        });

        console.error('[one-brain-ai] Message handler error:', error);
        figma.ui.postMessage({
            type: 'error',
            message: 'An error occurred. Please try again.'
        });
    }
};

// Add a small documentation badge to the frame
async function addDocumentationBadge(frame: FrameNode) {
    try {
        // Create badge group
        const badge = figma.createFrame();
        badge.name = 'Doc Badge';
        badge.resize(60, 20);
        badge.x = frame.x + 8;
        badge.y = frame.y + 8;
        badge.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.7, b: 0.9 } }];
        badge.cornerRadius = 4;
        badge.clipsContent = false;

        // Add text
        const text = figma.createText();
        text.characters = 'DOC';
        text.fontSize = 10;
        text.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

        // Try to load Inter font, fallback silently
        try {
            await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
            text.fontName = { family: 'Inter', style: 'Medium' };
        } catch {
            // Use default font if Inter not available
        }

        // Center text in badge
        text.x = 0;
        text.y = 0;
        badge.appendChild(text);

        // Center text within badge
        text.x = (badge.width - text.width) / 2;
        text.y = (badge.height - text.height) / 2;

        // Add to current page
        figma.currentPage.appendChild(badge);

    } catch (error) {
        console.warn('[one-brain-ai] Badge creation failed:', error);
        // Don't throw - badge is optional
    }
}

// Helper function to get selection info for UI
function getSelectionInfo() {
    const selection = figma.currentPage.selection;

    if (selection.length === 0) {
        return null;
    }

    const node = selection[0];
    return {
        name: (node as any).name || 'Unnamed',
        type: (node as any).type?.toLowerCase() || 'element',
        id: node.id
    };
}

// Listen for selection changes (but don't auto-run)
figma.on('selectionchange', () => {
    const selectionInfo = getSelectionInfo();

    logWorkflow('SELECTION_CHANGED', {
        newSelectionCount: figma.currentPage.selection.length,
        selectionInfo,
        selectedNodes: figma.currentPage.selection.map(n => ({ id: n.id, name: (n as any).name, type: (n as any).type }))
    });

    // Send selection info to UI but don't auto-run
    figma.ui.postMessage({
        type: 'selection-changed',
        data: selectionInfo
    });
});

// Send initial selection state to UI
const initialSelectionInfo = getSelectionInfo();
figma.ui.postMessage({
    type: 'selection-changed',
    data: initialSelectionInfo
});
