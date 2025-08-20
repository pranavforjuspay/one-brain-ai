import { FastifyInstance } from 'fastify';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const MODEL = process.env.ONE_BRAIN_MODEL || 'claude-sonnet-4';
const LOCATION = process.env.VERTEX_LOCATION || 'us-east5';
const PROJECT = process.env.VERTEX_PROJECT || 'dev-ai-epsilon';

// ===== PHASE 2: PROMPT ENGINEERING COMPONENTS =====

// System prompt - Role definition and basic rules
const SYSTEM_PROMPT = `You are a senior UX documentarian. Write clear, concise UK-English documentation for a single Figma screen using only the evidence provided (text layers, component names, layout hints, prototype links).

You may make small, reasonable inferences ONLY when they are directly supported by explicit evidence. Every inference must be based on a quoted text snippet or a named component/layout cue, but do not cite these evidences in your response. Do not invent features, flows, or product intent that lack such support. If something is not stated or cannot be reasonably inferred with evidence, write "Unknown".

Output free-form prose with the exact section headings listed below. Do not output JSON, tables, lists (except for "Key Components Used").

Sections (in this order):
1) Screen Name
2) Product / Project Context
3) Problem Being Addressed (Why this screen exists)
4) User Scenario (What the user is trying to do here)
5) Design Approach / Strategy
6) Intended Outcome
7) Key Components Used
8) Human Notes (leave this section blank)

Rules:
• Keep each section to 1–2 sentences, except "Key Components Used" (may be a short line list).
• Use "Unknown" instead of speculating.
• "Human Notes" must remain empty.`;

// Developer prompt - Detailed section-by-section instructions
const DEVELOPER_PROMPT = `You must output exactly eight sections in the order specified. For each section, follow these rules strictly. Never mention these rules in your output.

1) Screen Name
- Use nodeName when available; otherwise "Unknown". No commentary.

2) Product / Project Context
- Identify the broader area (e.g., "Authentication", "Checkout flow") using page/file hints or recurring text signals. If unclear, "Unknown".
- If inferring, include a short quote or component cue that supports the area.

3) Problem Being Addressed (Why this screen exists)
- State the upstream need this screen solves. Example form: "Allow sign-in without passwords."
- Must include at least one piece of evidence: a quote (e.g., "Enter your email") or a component cue (e.g., TextField/Email).
- If the why cannot be grounded, write "Unknown".

4) User Scenario (What the user is trying to do here)
- See what is on the screen and make a valid guess of what this user might be trying to do here.

5) Design Approach / Strategy
- Name visible principles or tactics (e.g., "recognition over recall", "aesthetic & minimalist design", "error prevention", "consistency & standards", "visibility of system status", "progressive disclosure").
- Each named principle must be tied to explicit evidence (quoted text, component names, or layout placement).
- Limit to 1–2 sentences.

6) Intended Outcome
- State the intended user action + expected result (e.g., "Submit email to request a one-time passcode.").
- Must be grounded in text and/or prototype link hints (mention the cue). If unclear, "Unknown".

7) Key Components Used
- List components by exact names; include library/variant props if present, separated by semicolons.
- If none detected, "Unknown".

8) Human Notes
- Leave blank. Do not add placeholders or comments.`;

// Function to combine system and developer prompts
function createCombinedSystemPrompt(): string {
    return `${SYSTEM_PROMPT}\n\n${DEVELOPER_PROMPT}`;
}

// User message template
function createUserMessage(extraction: any): string {
    return `Write the documentation now. Use only this evidence. Output prose with the eight section headings exactly as specified.

EVIDENCE_PAYLOAD:
${JSON.stringify(extraction, null, 2)}`;
}

// ===== VALIDATION FUNCTIONS =====

function validateHeadingsAndOrder(text: string): boolean {
    const requiredHeadings = [
        'Screen Name',
        'Product / Project Context',
        'Problem Being Addressed (Why this screen exists)',
        'User Scenario (What the user is trying to do here)',
        'Design Approach / Strategy',
        'Intended Outcome',
        'Key Components Used',
        'Human Notes'
    ];

    let lastIndex = -1;
    for (const heading of requiredHeadings) {
        const index = text.indexOf(heading);
        if (index === -1 || index <= lastIndex) {
            return false;
        }
        lastIndex = index;
    }
    return true;
}

function validateHasQuotedEvidence(text: string): boolean {
    // Check for at least one quoted phrase "..."
    const quotedPattern = /"[^"]+"/;
    return quotedPattern.test(text);
}

function validateHumanNotesBlank(text: string): boolean {
    const humanNotesMatch = text.match(/Human Notes\s*\n(.*?)(?:\n\n|\n$|$)/s);
    if (!humanNotesMatch) return false;

    const humanNotesContent = humanNotesMatch[1].trim();
    return humanNotesContent === '';
}

function validateGroundedSections(text: string): boolean {
    // Check sections 3, 4, 5 for quoted evidence or component references
    const sections = [
        'Problem Being Addressed',
        'User Scenario',
        'Design Approach / Strategy'
    ];

    for (const section of sections) {
        const sectionMatch = text.match(new RegExp(`${section}[^\\n]*\\n([^\\n]+(?:\\n[^\\n]+)*?)(?=\\n\\n|\\n[A-Z]|$)`, 's'));
        if (!sectionMatch) continue;

        const sectionContent = sectionMatch[1];
        const hasQuote = /"[^"]+"/.test(sectionContent);
        const hasComponentRef = /\b[A-Za-z]+\/[A-Za-z]+(?:\/[A-Za-z]+)?\b/.test(sectionContent);
        const hasLayoutRef = /\b(?:top-right|bottom bar|primary CTA|main|center|left|right)\b/i.test(sectionContent);

        if (!hasQuote && !hasComponentRef && !hasLayoutRef) {
            return false;
        }
    }
    return true;
}

// Format-only retry prompt
function createRetryPrompt(originalOutput: string): string {
    return `Your previous answer failed formatting checks. Keep the same content, but:
• Include exactly the eight section headings, in order.
• Ensure at least one quoted evidence phrase from text layers or component names appears.
• Leave "Human Notes" completely blank.
Output prose only with those headings.

Previous answer:
${originalOutput}`;
}

// Get Google Cloud access token
async function getAccessToken(): Promise<string> {
    try {
        const { stdout } = await execAsync('gcloud auth print-access-token');
        return stdout.trim();
    } catch (error) {
        throw new Error(`Failed to get access token: ${error.message}`);
    }
}

// Call Anthropic API via Vertex AI with system prompt support
async function callAnthropicAPIWithSystem(systemPrompt: string, userMessage: string, app: FastifyInstance): Promise<any> {
    const endpoint = `${LOCATION}-aiplatform.googleapis.com`;
    const url = `https://${endpoint}/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/anthropic/models/${MODEL}:rawPredict`;

    const accessToken = await getAccessToken();

    const requestBody = {
        anthropic_version: "vertex-2023-10-16",
        stream: false,
        max_tokens: 800,  // Reduced for concise documentation
        temperature: 0.35,
        top_p: 1.0,
        system: systemPrompt,  // System prompt for role definition
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

    app.log.info({
        url,
        model: MODEL,
        project: PROJECT,
        location: LOCATION,
        requestBodySize: JSON.stringify(requestBody).length,
        systemPromptLength: systemPrompt.length,
        userMessageLength: userMessage.length
    }, 'Calling Anthropic API with system prompt');

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
        app.log.error({
            status: response.status,
            statusText: response.statusText,
            errorBody: errorText
        }, 'Anthropic API call failed');
        throw new Error(`Anthropic API call failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    app.log.info({
        responseSize: JSON.stringify(result).length,
        hasContent: !!result.content
    }, 'Anthropic API response received');

    return result;
}

// Validate and retry logic
async function validateAndRetry(text: string, extraction: any, app: FastifyInstance): Promise<{ text: string, hasWarning: boolean }> {
    const validations = {
        headingsAndOrder: validateHeadingsAndOrder(text),
        hasQuotedEvidence: validateHasQuotedEvidence(text),
        humanNotesBlank: validateHumanNotesBlank(text),
        groundedSections: validateGroundedSections(text)
    };

    app.log.info({
        validations,
        textLength: text.length
    }, 'Validation results');

    // If all validations pass, return as-is
    if (Object.values(validations).every(v => v)) {
        return { text, hasWarning: false };
    }

    // Single retry attempt with format-only correction
    app.log.warn('Validation failed, attempting retry with format correction');

    try {
        const retryPrompt = createRetryPrompt(text);
        const retryResult = await callAnthropicAPIWithSystem('', retryPrompt, app);

        let retryText = '';
        if (retryResult.content && retryResult.content.length > 0 && retryResult.content[0].type === 'text') {
            retryText = retryResult.content[0].text;
        }

        // Re-validate retry attempt
        const retryValidations = {
            headingsAndOrder: validateHeadingsAndOrder(retryText),
            hasQuotedEvidence: validateHasQuotedEvidence(retryText),
            humanNotesBlank: validateHumanNotesBlank(retryText),
            groundedSections: validateGroundedSections(retryText)
        };

        app.log.info({
            retryValidations,
            retryTextLength: retryText.length
        }, 'Retry validation results');

        // If retry is better, use it; otherwise use original with warning
        const retryScore = Object.values(retryValidations).filter(v => v).length;
        const originalScore = Object.values(validations).filter(v => v).length;

        if (retryScore > originalScore) {
            return { text: retryText, hasWarning: retryScore < 4 };
        }
    } catch (retryError) {
        app.log.error({ retryError }, 'Retry attempt failed');
    }

    // Return original with warning flag
    return { text, hasWarning: true };
}

export async function registerAIRoutes(app: FastifyInstance) {
    app.post('/ai/prepare', async (req, reply) => {
        const body = req.body as any;
        const extraction = body && body.extraction ? body.extraction : null;
        if (!extraction || !extraction.scope) {
            return reply.code(400).send({ error: 'Missing extraction' });
        }

        app.log.info({
            extractionScope: extraction.scope,
            textSamplesCount: extraction.textSamples?.length || 0,
            componentsCount: extraction.componentInstances?.length || 0
        }, 'Processing documentation request with new prose system');

        try {
            // Create system prompt and user message
            const userMessage = createUserMessage(extraction);

            // Call Claude with combined system and developer prompts
            const combinedPrompt = createCombinedSystemPrompt();

            app.log.info({
                systemPromptLength: SYSTEM_PROMPT.length,
                developerPromptLength: DEVELOPER_PROMPT.length,
                combinedPromptLength: combinedPrompt.length,
                userMessageLength: userMessage.length
            }, 'Calling Claude with combined system and developer prompts');
            const result = await callAnthropicAPIWithSystem(combinedPrompt, userMessage, app);

            // Extract prose response
            let proseText = '';
            if (result.content && result.content.length > 0 && result.content[0].type === 'text' && result.content[0].text) {
                proseText = result.content[0].text;
            }

            if (!proseText) {
                throw new Error('Empty response from Claude');
            }

            // Validate and retry if needed
            const { text: finalText, hasWarning } = await validateAndRetry(proseText, extraction, app);

            app.log.info({
                finalTextLength: finalText.length,
                hasWarning,
                validationPassed: !hasWarning
            }, 'Documentation generation completed');

            // Set warning header if validation issues
            if (hasWarning) {
                reply.header('x-onebrain-validation-warning', 'true');
            }

            // Return prose documentation
            return reply.send({
                documentation: finalText,
                format: 'prose',
                hasValidationWarning: hasWarning
            });

        } catch (err) {
            app.log.error({
                err: err,
                message: err.message,
                model: MODEL,
                project: PROJECT,
                location: LOCATION
            }, 'Prose documentation generation failed; using fallback');

            // Generate fallback prose documentation
            const fallbackText = generateFallbackProse(extraction);

            reply.header('x-onebrain-fallback', 'true');
            return reply.send({
                documentation: fallbackText,
                format: 'prose',
                hasValidationWarning: false,
                isFallback: true
            });
        }
    });
}

// Generate fallback prose documentation when AI fails
function generateFallbackProse(extraction: any): string {
    const nodeName = extraction.nodeName || 'Unknown Screen';
    const textSamples = extraction.textSamples || [];
    const components = extraction.componentInstances || [];

    // Basic inference from text content
    const allText = textSamples.join(' ').toLowerCase();
    let context = 'Unknown';
    let problem = 'User needs to complete a task efficiently';
    let scenario = 'User interacts with the interface';
    let approach = 'Standard UI patterns and clear visual hierarchy';
    let outcome = 'Improved user task completion';

    // Simple pattern matching for context
    if (allText.includes('login') || allText.includes('sign')) {
        context = 'Authentication';
        problem = 'Users need to securely access their account';
        scenario = 'User provides credentials to sign in';
        approach = 'Simple credential entry with clear error messaging';
        outcome = 'Successful user authentication';
    } else if (allText.includes('cart') || allText.includes('buy')) {
        context = 'E-commerce';
        problem = 'Users want to complete purchases smoothly';
        scenario = 'User reviews and completes their purchase';
        approach = 'Streamlined checkout with clear pricing';
        outcome = 'Successful transaction completion';
    }

    const componentsList = components.length > 0
        ? components.map(c => c.name).join('; ')
        : 'Unknown';

    return `Screen Name
${nodeName}

Product / Project Context
${context}

Problem Being Addressed (Why this screen exists)
${problem}

User Scenario (What the user is trying to do here)
${scenario}

Design Approach / Strategy
${approach}

Intended Outcome
${outcome}

Key Components Used
${componentsList}

Human Notes

`;
}

function schemaFor(level: string) {
    const common = {
        title: 'string',
        product: 'string?',
        problem: 'string',
        outcome: 'string?',
        approach: 'string[]',
        components: '[{ ds: string, variant?: string }]',
        links: '[{ label: string, url: string }]',
        platforms: 'string[]',
        humanNotes: 'string?',
        canonical: 'boolean',
        lastUpdated: 'YYYY-MM-DD'
    };
    if (level === 'frame') return { level: 'frame', state: 'success|error|empty|loading|unknown', belongsToFlowId: 'string?', ...common };
    if (level === 'section') return { level: 'section', keyStates: 'string[]', keyFrames: '[{ title:string, figmaNodeUrl:string }]', belongsToPageId: 'string?', problemTags: 'string[]', patternTags: 'string[]', ...common };
    if (level === 'page') return { level: 'page', containedFlowIds: 'string[]', belongsToFileId: 'string?', ...common };
    return { level: 'file', containedPageIds: 'string[]', ...common };
}

function exampleFor(level: string) {
    if (level === 'frame') {
        return {
            capsule: {
                level: 'frame',
                title: 'Wallet Home — Empty State',
                product: 'Wallet',
                problem: 'Guide the user when no transactions exist',
                outcome: 'Increase first action rate',
                approach: ['Empty-state illustration', 'Primary CTA: Add money', 'Secondary: Link bank'],
                components: [{ ds: 'Button/Primary', variant: 'Default' }, { ds: 'Card/Empty' }],
                links: [],
                platforms: ['iOS'],
                state: 'empty',
                humanNotes: ''
            }
        };
    }
    if (level === 'section') {
        return {
            capsule: {
                level: 'section',
                title: 'Top up flow',
                problem: 'Move funds into wallet',
                outcome: 'Reduce drop-off on bank step',
                approach: ['Select source', 'Enter amount', 'Confirm payment'],
                keyStates: ['success', 'payment failed'],
                keyFrames: [],
                platforms: ['iOS']
            }
        };
    }
    return {};
}

function fallbackCapsule(ex: any) {
    const today = new Date().toISOString().slice(0, 10);
    const comps = (ex.componentInstances || []).map((c: any) => ({
        ds: String(c.name || '').split('/').slice(-2).join('/'),
        variant: c.variant
    }));
    const links = ex.nodeId ? [{
        label: 'Open in Figma',
        url: 'https://www.figma.com/file/' + ex.fileKey + '?node-id=' + encodeURIComponent(ex.nodeId)
    }] : [];

    // Generate more realistic content based on extracted data
    const textSamples = ex.textSamples || [];
    const frameNames = ex.frameNameHints || [];
    const allText = [...textSamples, ...frameNames].join(' ').toLowerCase();

    // Infer problem and approach from text content
    let problem = 'User needs to complete a task efficiently';
    let approach = ['Clear visual hierarchy', 'Intuitive user flow', 'Accessible design patterns'];
    let outcome = 'Improved user task completion rate';

    // Basic content inference based on common UI patterns
    if (allText.includes('sign') || allText.includes('login') || allText.includes('auth')) {
        problem = 'Users need to securely access their account';
        approach = ['Simple credential entry', 'Clear error messaging', 'Secure authentication flow'];
        outcome = 'Reduced login friction and improved security';
    } else if (allText.includes('search') || allText.includes('find')) {
        problem = 'Users need to quickly find relevant information';
        approach = ['Prominent search interface', 'Smart filtering options', 'Clear result presentation'];
        outcome = 'Faster information discovery';
    } else if (allText.includes('cart') || allText.includes('buy') || allText.includes('purchase')) {
        problem = 'Users want to complete purchases smoothly';
        approach = ['Streamlined checkout flow', 'Clear pricing display', 'Trust indicators'];
        outcome = 'Higher conversion rates';
    } else if (allText.includes('profile') || allText.includes('settings') || allText.includes('account')) {
        problem = 'Users need to manage their account preferences';
        approach = ['Organized settings layout', 'Clear action buttons', 'Immediate feedback'];
        outcome = 'Better user control and satisfaction';
    } else if (textSamples.length > 0) {
        // Generate content based on actual text found
        problem = `Users need to interact with ${textSamples.slice(0, 3).join(', ')} functionality`;
        approach = ['Clear information hierarchy', 'Intuitive interaction patterns', 'Responsive design elements'];
    }

    const base = {
        title: ex.nodeName || ((ex.pageName || '') + ' • ' + (ex.scope || 'frame')),
        product: undefined,
        problem: problem,
        outcome: outcome,
        approach: approach,
        components: comps,
        links: links,
        platforms: ex.platformHints || [],
        humanNotes: '',
        canonical: false,
        lastUpdated: today
    };
    if (ex.scope === 'section') return { level: 'section', keyStates: [], keyFrames: [], ...base };
    if (ex.scope === 'page') return { level: 'page', containedFlowIds: [], ...base };
    if (ex.scope === 'file') return { level: 'file', containedPageIds: [], ...base };
    return { level: 'frame', state: 'unknown', ...base };
}
