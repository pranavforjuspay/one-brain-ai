import type { Capsule } from './types';

// Immediate loading verification
console.log('[one-brain-ai] UI SCRIPT LOADING - Top of file executed');

// DOM elements
let statusDiv: HTMLElement;
let progressBar: HTMLElement;
let formContainer: HTMLElement;
let form: HTMLFormElement;
let saveButton: HTMLButtonElement;
let cancelButton: HTMLButtonElement;
let addBadgeCheckbox: HTMLInputElement;

// Enhanced logging utility for UI
function logUI(step: string, data: any) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [one-brain-ai] UI ${step}:`, data);
}

// Initialize UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    logUI('DOM_CONTENT_LOADED', { readyState: document.readyState });

    try {
        initializeUI();
        logUI('UI_INITIALIZED', { success: true });

        // Tell main thread UI is ready
        logUI('SENDING_UI_READY', { timestamp: new Date().toISOString() });
        parent.postMessage({ pluginMessage: { type: 'ui-ready' } }, '*');
        logUI('UI_READY_SENT', { success: true });
    } catch (error) {
        logUI('UI_INITIALIZATION_ERROR', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
    }
});

function initializeUI() {
    // Get DOM elements
    statusDiv = document.getElementById('status')!;
    progressBar = document.getElementById('progress-bar')!;
    formContainer = document.getElementById('form-container')!;
    form = document.getElementById('capsule-form') as HTMLFormElement;
    saveButton = document.getElementById('save-btn') as HTMLButtonElement;
    cancelButton = document.getElementById('cancel-btn') as HTMLButtonElement;
    addBadgeCheckbox = document.getElementById('add-badge') as HTMLInputElement;

    // Set up event listeners
    saveButton.addEventListener('click', handleSave);
    cancelButton.addEventListener('click', handleCancel);

    // Auto-resize textareas
    const textareas = form.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', autoResize);
    });

    // Show loading state initially
    showStatus('Initializing...', 0, 1);
}

function autoResize(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

function showStatus(message: string, step: number, total: number) {
    statusDiv.textContent = message;
    const percentage = (step / total) * 100;
    progressBar.style.width = `${percentage}%`;

    // Show status, hide form
    document.getElementById('status-container')!.style.display = 'block';
    formContainer.style.display = 'none';
}

function showDetailedStatus(message: string, detail: string, step: number, total: number) {
    // Show main message
    statusDiv.textContent = message;

    // Create or update detail element
    let detailDiv = document.getElementById('status-detail');
    if (!detailDiv) {
        detailDiv = document.createElement('div');
        detailDiv.id = 'status-detail';
        detailDiv.style.fontSize = '10px';
        detailDiv.style.color = '#888';
        detailDiv.style.marginTop = '4px';
        detailDiv.style.lineHeight = '1.3';
        statusDiv.parentNode!.insertBefore(detailDiv, statusDiv.nextSibling);
    }

    detailDiv.textContent = detail;

    const percentage = (step / total) * 100;
    progressBar.style.width = `${percentage}%`;

    // Show status, hide form
    document.getElementById('status-container')!.style.display = 'block';
    formContainer.style.display = 'none';
}

function showForm() {
    // Hide status, show form
    document.getElementById('status-container')!.style.display = 'none';
    formContainer.style.display = 'block';
}

function showError(message: string) {
    statusDiv.textContent = message;
    statusDiv.style.color = '#ff4444';
    progressBar.style.backgroundColor = '#ff4444';
    progressBar.style.width = '100%';
}

function showSuccess(message: string) {
    statusDiv.textContent = message;
    statusDiv.style.color = '#44aa44';
    progressBar.style.backgroundColor = '#44aa44';
    progressBar.style.width = '100%';

    // Hide form
    formContainer.style.display = 'none';
    document.getElementById('status-container')!.style.display = 'block';
}

function prefillForm(capsule: Capsule) {
    // Basic fields
    (document.getElementById('title') as HTMLInputElement).value = capsule.title || '';
    (document.getElementById('product') as HTMLInputElement).value = capsule.product || '';
    (document.getElementById('problem') as HTMLTextAreaElement).value = capsule.problem || '';
    (document.getElementById('outcome') as HTMLTextAreaElement).value = capsule.outcome || '';
    (document.getElementById('human-notes') as HTMLTextAreaElement).value = capsule.humanNotes || '';

    // Approach (array to newline-separated text)
    const approachText = capsule.approach.map(item => `• ${item}`).join('\n');
    (document.getElementById('approach') as HTMLTextAreaElement).value = approachText;

    // Components (array to newline-separated text)
    const componentsText = capsule.components
        .map(comp => comp.variant ? `${comp.ds} (${comp.variant})` : comp.ds)
        .join('\n');
    (document.getElementById('components') as HTMLTextAreaElement).value = componentsText;

    // Links (array to newline-separated text)
    const linksText = capsule.links
        .map(link => `${link.label}: ${link.url}`)
        .join('\n');
    (document.getElementById('links') as HTMLTextAreaElement).value = linksText;

    // Platforms (array to comma-separated text)
    (document.getElementById('platforms') as HTMLInputElement).value = capsule.platforms.join(', ');

    // Level-specific fields
    const levelInfo = document.getElementById('level-info')!;
    levelInfo.textContent = `Documentation Level: ${capsule.level.toUpperCase()}`;

    if (capsule.level === 'frame') {
        const stateSelect = document.getElementById('frame-state') as HTMLSelectElement;
        stateSelect.value = capsule.state || 'unknown';
        stateSelect.style.display = 'block';
        (document.querySelector('label[for="frame-state"]') as HTMLElement)!.style.display = 'block';
    }

    // Auto-resize all textareas after filling
    const textareas = form.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    });

    showForm();
}

function extractFormData(): Capsule {
    // Get basic fields
    const title = (document.getElementById('title') as HTMLInputElement).value.trim();
    const product = (document.getElementById('product') as HTMLInputElement).value.trim() || undefined;
    const problem = (document.getElementById('problem') as HTMLTextAreaElement).value.trim();
    const outcome = (document.getElementById('outcome') as HTMLTextAreaElement).value.trim() || undefined;
    const humanNotes = (document.getElementById('human-notes') as HTMLTextAreaElement).value.trim() || undefined;

    // Parse approach (bullet points to array)
    const approachText = (document.getElementById('approach') as HTMLTextAreaElement).value.trim();
    const approach = approachText
        .split('\n')
        .map(line => line.replace(/^[•\-\*]\s*/, '').trim())
        .filter(line => line.length > 0);

    // Parse components
    const componentsText = (document.getElementById('components') as HTMLTextAreaElement).value.trim();
    const components = componentsText
        .split('\n')
        .map(line => {
            const match = line.match(/^(.+?)\s*\((.+)\)$/);
            if (match) {
                return { ds: match[1].trim(), variant: match[2].trim() };
            }
            return { ds: line.trim() };
        })
        .filter(comp => comp.ds.length > 0);

    // Parse links
    const linksText = (document.getElementById('links') as HTMLTextAreaElement).value.trim();
    const links = linksText
        .split('\n')
        .map(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                return {
                    label: line.substring(0, colonIndex).trim(),
                    url: line.substring(colonIndex + 1).trim()
                };
            }
            return null;
        })
        .filter(link => link !== null) as { label: string; url: string }[];

    // Parse platforms
    const platformsText = (document.getElementById('platforms') as HTMLInputElement).value.trim();
    const platforms = platformsText
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);

    // Base capsule data
    const baseCapsule = {
        title,
        product,
        problem,
        outcome,
        approach,
        components,
        links,
        platforms,
        humanNotes,
        canonical: false,
        lastUpdated: new Date().toISOString().slice(0, 10)
    };

    // Get level from the current capsule (stored globally)
    const level = (window as any).currentCapsuleLevel || 'frame';

    // Add level-specific fields
    if (level === 'frame') {
        const state = (document.getElementById('frame-state') as HTMLSelectElement).value as any;
        return {
            level: 'frame',
            state,
            belongsToFlowId: undefined,
            ...baseCapsule
        };
    }

    if (level === 'section') {
        return {
            level: 'section',
            keyStates: [],
            keyFrames: [],
            belongsToPageId: undefined,
            problemTags: [],
            patternTags: [],
            ...baseCapsule
        };
    }

    if (level === 'page') {
        return {
            level: 'page',
            containedFlowIds: [],
            belongsToFileId: undefined,
            ...baseCapsule
        };
    }

    // Default to file level
    return {
        level: 'file',
        containedPageIds: [],
        ...baseCapsule
    };
}

function handleSave() {
    try {
        const capsule = extractFormData();
        const addBadge = addBadgeCheckbox.checked;

        // Disable form while saving
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';

        parent.postMessage({
            pluginMessage: {
                type: 'save',
                capsule,
                addBadge
            }
        }, '*');

    } catch (error) {
        console.error('Form extraction error:', error);
        alert('Please check your form data and try again.');
        saveButton.disabled = false;
        saveButton.textContent = 'Save Documentation';
    }
}

function handleCancel() {
    parent.postMessage({ pluginMessage: { type: 'cancel' } }, '*');
}

// Handle messages from main thread
window.onmessage = (event) => {
    logUI('MESSAGE_RECEIVED', {
        hasPluginMessage: !!event.data.pluginMessage,
        type: event.data.pluginMessage?.type,
        origin: event.origin
    });

    const msg = event.data.pluginMessage;
    if (!msg) {
        logUI('NO_PLUGIN_MESSAGE', { eventData: event.data });
        return;
    }

    logUI('PROCESSING_MESSAGE', { type: msg.type });

    switch (msg.type) {
        case 'status':
            logUI('STATUS_MESSAGE', { message: msg.message, step: msg.step, total: msg.total });
            showStatus(msg.message, msg.step, msg.total);
            break;

        case 'detailed-status':
            logUI('DETAILED_STATUS_MESSAGE', { message: msg.message, detail: msg.detail });
            showDetailedStatus(msg.message, msg.detail, msg.step, msg.total);
            break;

        case 'prefill':
            const capsule = msg.data.capsule;
            logUI('PREFILL_MESSAGE', {
                capsuleTitle: capsule.title,
                capsuleLevel: capsule.level,
                hasData: !!msg.data
            });
            // Store level globally for form extraction
            (window as any).currentCapsuleLevel = capsule.level;
            prefillForm(capsule);
            break;

        case 'error':
            logUI('ERROR_MESSAGE', { message: msg.message });
            showError(msg.message);
            break;

        case 'success':
            logUI('SUCCESS_MESSAGE', { message: msg.message });
            showSuccess(msg.message);
            break;

        default:
            logUI('UNKNOWN_MESSAGE_TYPE', { type: msg.type, msg });
            break;
    }
};
