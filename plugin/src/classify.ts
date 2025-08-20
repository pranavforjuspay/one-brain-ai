import type { Extraction, Capsule } from './types';
import { guessState } from './extraction';

export function classifyToCapsule(extraction: Extraction): Capsule {
    const today = new Date().toISOString().slice(0, 10);

    // Extract useful info from extraction
    const components = extraction.componentInstances.map(comp => ({
        ds: simplifyComponentName(comp.name),
        variant: comp.variant
    }));

    // Create Figma link if we have node info
    const links = extraction.nodeId ? [{
        label: 'Open in Figma',
        url: `https://www.figma.com/file/${extraction.fileKey}?node-id=${encodeURIComponent(extraction.nodeId)}`
    }] : [];

    // Add any deep links found
    links.push(...extraction.deepLinks);

    // Generate title based on available info
    const title = generateTitle(extraction);

    // Generate problem statement
    const problem = generateProblem(extraction);

    // Generate approach based on what we can infer
    const approach = generateApproach(extraction);

    // Common base data
    const baseData = {
        title,
        product: undefined,
        problem,
        outcome: undefined,
        approach,
        components,
        links,
        platforms: extraction.platformHints,
        humanNotes: undefined,
        canonical: false,
        lastUpdated: today
    };

    // Return level-specific capsule
    switch (extraction.scope) {
        case 'frame':
            const state = guessState(extraction.frameNameHints, extraction.textSamples);
            return {
                level: 'frame',
                state,
                belongsToFlowId: undefined,
                ...baseData
            };

        case 'section':
            return {
                level: 'section',
                keyStates: [],
                keyFrames: [],
                belongsToPageId: undefined,
                problemTags: extractProblemTags(extraction),
                patternTags: extractPatternTags(extraction),
                ...baseData
            };

        case 'page':
            return {
                level: 'page',
                containedFlowIds: [],
                belongsToFileId: undefined,
                ...baseData
            };

        case 'file':
            return {
                level: 'file',
                containedPageIds: [],
                ...baseData
            };

        default:
            // Fallback to frame
            return {
                level: 'frame',
                state: 'unknown',
                belongsToFlowId: undefined,
                ...baseData
            };
    }
}

function generateTitle(extraction: Extraction): string {
    // Use node name if available and meaningful
    if (extraction.nodeName && extraction.nodeName.trim() && !isGenericName(extraction.nodeName)) {
        return extraction.nodeName.trim();
    }

    // Try to use page name + scope
    if (extraction.pageName) {
        return `${extraction.pageName} • ${extraction.scope}`;
    }

    // Fallback to file name + scope
    return `${extraction.fileName || 'Design'} • ${extraction.scope}`;
}

function generateProblem(extraction: Extraction): string {
    // Look for problem-related text in samples
    const problemKeywords = ['problem', 'issue', 'challenge', 'need', 'user', 'customer'];
    const relevantText = extraction.textSamples.find(text =>
        problemKeywords.some(keyword => text.toLowerCase().includes(keyword))
    );

    if (relevantText && relevantText.length > 20) {
        return relevantText.slice(0, 150) + (relevantText.length > 150 ? '...' : '');
    }

    // Generate based on scope and context
    switch (extraction.scope) {
        case 'frame':
            if (extraction.nodeType === 'FRAME') {
                return 'Describe the user problem this screen or component addresses.';
            }
            return 'Describe the user problem this design element solves.';

        case 'section':
            return 'Describe the user journey or workflow problem this section addresses.';

        case 'page':
            return 'Describe the overall user problem this page or feature solves.';

        case 'file':
            return 'Describe the product or feature problem this design file addresses.';

        default:
            return 'Describe the user problem this design addresses.';
    }
}

function generateApproach(extraction: Extraction): string[] {
    const approaches: string[] = [];

    // Analyze components to infer approach
    if (extraction.componentInstances.length > 0) {
        const componentTypes = new Set(
            extraction.componentInstances.map(comp =>
                comp.name.split('/')[0].toLowerCase()
            )
        );

        if (componentTypes.has('button')) {
            approaches.push('Clear call-to-action with button components');
        }
        if (componentTypes.has('input') || componentTypes.has('form')) {
            approaches.push('Form-based user input collection');
        }
        if (componentTypes.has('card') || componentTypes.has('list')) {
            approaches.push('Structured content presentation');
        }
        if (componentTypes.has('modal') || componentTypes.has('dialog')) {
            approaches.push('Modal interaction pattern');
        }
    }

    // Analyze text content
    const allText = extraction.textSamples.join(' ').toLowerCase();
    if (allText.includes('search') || allText.includes('find')) {
        approaches.push('Search and discovery functionality');
    }
    if (allText.includes('filter') || allText.includes('sort')) {
        approaches.push('Content filtering and organization');
    }
    if (allText.includes('empty') || allText.includes('no results')) {
        approaches.push('Empty state guidance and next steps');
    }

    // Analyze prototype links
    if (extraction.prototypeLinks.length > 0) {
        approaches.push('Interactive flow with multiple connected states');
    }

    // Add scope-specific approaches
    switch (extraction.scope) {
        case 'frame':
            if (approaches.length === 0) {
                approaches.push('Single-screen user interface design');
            }
            break;

        case 'section':
            approaches.push('Multi-step user workflow design');
            break;

        case 'page':
            approaches.push('Comprehensive page-level user experience');
            break;

        case 'file':
            approaches.push('Complete feature or product design system');
            break;
    }

    // Ensure we have at least 3 approaches
    while (approaches.length < 3) {
        approaches.push('Add additional design approach details');
    }

    // Limit to 6 approaches max
    return approaches.slice(0, 6);
}

function simplifyComponentName(name: string): string {
    // Remove library prefixes and simplify component names
    const parts = name.split('/');
    if (parts.length >= 2) {
        return parts.slice(-2).join('/'); // Take last 2 parts
    }
    return name;
}

function extractProblemTags(extraction: Extraction): string[] {
    const tags: string[] = [];
    const allText = extraction.textSamples.join(' ').toLowerCase();

    // Common problem categories
    if (allText.includes('onboard') || allText.includes('getting started')) {
        tags.push('onboarding');
    }
    if (allText.includes('search') || allText.includes('find')) {
        tags.push('discovery');
    }
    if (allText.includes('pay') || allText.includes('purchase') || allText.includes('checkout')) {
        tags.push('commerce');
    }
    if (allText.includes('sign') || allText.includes('login') || allText.includes('auth')) {
        tags.push('authentication');
    }
    if (allText.includes('setting') || allText.includes('config') || allText.includes('preference')) {
        tags.push('configuration');
    }

    return tags;
}

function extractPatternTags(extraction: Extraction): string[] {
    const tags: string[] = [];

    // Analyze components for patterns
    const componentNames = extraction.componentInstances.map(c => c.name.toLowerCase());

    if (componentNames.some(name => name.includes('modal') || name.includes('dialog'))) {
        tags.push('modal');
    }
    if (componentNames.some(name => name.includes('tab'))) {
        tags.push('tabs');
    }
    if (componentNames.some(name => name.includes('card'))) {
        tags.push('cards');
    }
    if (componentNames.some(name => name.includes('list'))) {
        tags.push('lists');
    }
    if (componentNames.some(name => name.includes('form') || name.includes('input'))) {
        tags.push('forms');
    }

    return tags;
}

function isGenericName(name: string): boolean {
    const genericNames = [
        'frame', 'group', 'component', 'instance', 'rectangle', 'ellipse',
        'text', 'image', 'vector', 'line', 'auto layout', 'untitled'
    ];

    return genericNames.some(generic =>
        name.toLowerCase().includes(generic.toLowerCase())
    );
}
