/// <reference types="@figma/plugin-typings" />

/**
 * Utility functions for the One Brain AI plugin
 */

// Font loading utilities
export async function loadFontSafely(fontName: FontName): Promise<boolean> {
    try {
        await figma.loadFontAsync(fontName);
        return true;
    } catch (error) {
        console.warn(`[one-brain-ai] Failed to load font ${fontName.family}:`, error);
        return false;
    }
}

export async function loadDefaultFont(): Promise<FontName> {
    // Try to load Inter first (common in design systems)
    const interLoaded = await loadFontSafely({ family: 'Inter', style: 'Medium' });
    if (interLoaded) {
        return { family: 'Inter', style: 'Medium' };
    }

    // Try Roboto
    const robotoLoaded = await loadFontSafely({ family: 'Roboto', style: 'Medium' });
    if (robotoLoaded) {
        return { family: 'Roboto', style: 'Medium' };
    }

    // Fallback to system default
    try {
        const defaultFont = { family: 'Helvetica', style: 'Regular' };
        await figma.loadFontAsync(defaultFont);
        return defaultFont;
    } catch {
        // Last resort - this should always work
        return { family: 'Arial', style: 'Regular' };
    }
}

// Badge creation utilities
export async function createDocumentationBadge(
    targetNode: FrameNode | SectionNode,
    options: {
        text?: string;
        color?: RGB;
        textColor?: RGB;
        size?: { width: number; height: number };
        position?: { x: number; y: number };
    } = {}
): Promise<FrameNode | null> {
    try {
        const {
            text = 'DOC',
            color = { r: 0.2, g: 0.7, b: 0.9 },
            textColor = { r: 1, g: 1, b: 1 },
            size = { width: 60, height: 20 },
            position = { x: 8, y: 8 }
        } = options;

        // Create badge container
        const badge = figma.createFrame();
        badge.name = 'Documentation Badge';
        badge.resize(size.width, size.height);
        badge.x = targetNode.x + position.x;
        badge.y = targetNode.y + position.y;
        badge.fills = [{ type: 'SOLID', color }];
        badge.cornerRadius = 4;
        badge.clipsContent = false;

        // Create text
        const textNode = figma.createText();
        textNode.characters = text;
        textNode.fontSize = Math.min(10, size.height * 0.5);
        textNode.fills = [{ type: 'SOLID', color: textColor }];

        // Load font
        const font = await loadDefaultFont();
        textNode.fontName = font;

        // Add text to badge
        badge.appendChild(textNode);

        // Center text in badge
        textNode.x = (badge.width - textNode.width) / 2;
        textNode.y = (badge.height - textNode.height) / 2;

        // Add badge to the same parent as target node
        if (targetNode.parent && 'appendChild' in targetNode.parent) {
            targetNode.parent.appendChild(badge);
        } else {
            figma.currentPage.appendChild(badge);
        }

        return badge;

    } catch (error) {
        console.error('[one-brain-ai] Badge creation failed:', error);
        return null;
    }
}

// Shared plugin data utilities
export interface DocumentationSummary {
    title: string;
    problem: string;
    lastUpdated: string;
    level: string;
    hasFullDocumentation?: boolean;
}

export function saveDocumentationSummary(
    node: BaseNode,
    summary: DocumentationSummary
): boolean {
    try {
        const data = JSON.stringify(summary);
        node.setSharedPluginData('one-brain-ai', 'summary', data);
        return true;
    } catch (error) {
        console.error('[one-brain-ai] Failed to save summary:', error);
        return false;
    }
}

export function getDocumentationSummary(node: BaseNode): DocumentationSummary | null {
    try {
        const data = node.getSharedPluginData('one-brain-ai', 'summary');
        if (!data) return null;
        return JSON.parse(data) as DocumentationSummary;
    } catch (error) {
        console.warn('[one-brain-ai] Failed to parse summary:', error);
        return null;
    }
}

export function hasDocumentation(node: BaseNode): boolean {
    const summary = getDocumentationSummary(node);
    return summary !== null;
}

// Node traversal utilities
export function findDocumentedNodes(container: BaseNode): BaseNode[] {
    const documented: BaseNode[] = [];

    function traverse(node: BaseNode) {
        if (hasDocumentation(node)) {
            documented.push(node);
        }

        if ('children' in node) {
            for (const child of node.children) {
                traverse(child);
            }
        }
    }

    traverse(container);
    return documented;
}

// URL utilities
export function createFigmaNodeUrl(fileKey: string, nodeId: string): string {
    return `https://www.figma.com/file/${fileKey}?node-id=${encodeURIComponent(nodeId)}`;
}

export function createFigmaPrototypeUrl(fileKey: string, nodeId?: string): string {
    const baseUrl = `https://www.figma.com/proto/${fileKey}`;
    return nodeId ? `${baseUrl}?node-id=${encodeURIComponent(nodeId)}` : baseUrl;
}

// Validation utilities
export function isValidNodeForDocumentation(node: BaseNode): boolean {
    const validTypes = ['FRAME', 'SECTION', 'COMPONENT', 'INSTANCE'];
    return validTypes.includes((node as any).type);
}

export function getDocumentationScope(node: BaseNode): 'frame' | 'section' | 'page' | 'file' {
    const nodeType = (node as any).type;

    if (nodeType === 'SECTION') return 'section';
    if (nodeType === 'FRAME' || nodeType === 'COMPONENT' || nodeType === 'INSTANCE') return 'frame';
    if (nodeType === 'PAGE') return 'page';

    return 'frame'; // default fallback
}

// Error handling utilities
export function showToast(message: string, options: { timeout?: number; error?: boolean } = {}) {
    const { timeout = 3000, error = false } = options;

    figma.notify(message, {
        timeout,
        error
    });
}

export function handlePluginError(error: unknown, context: string): void {
    console.error(`[one-brain-ai] ${context}:`, error);

    let message = 'An unexpected error occurred.';
    if (error instanceof Error) {
        message = error.message;
    } else if (typeof error === 'string') {
        message = error;
    }

    showToast(`${context}: ${message}`, { error: true });
}

// Performance utilities
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: number | undefined;

    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait) as any;
    };
}

export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;

    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Selection utilities
export function getSelectedFramesAndSections(): (FrameNode | SectionNode)[] {
    return figma.currentPage.selection.filter(node =>
        node.type === 'FRAME' || (node as any).type === 'SECTION'
    ) as (FrameNode | SectionNode)[];
}

export function selectNode(node: BaseNode): void {
    figma.currentPage.selection = [node as any];
    figma.viewport.scrollAndZoomIntoView([node as any]);
}

// Color utilities
export function rgbToHex(rgb: RGB): string {
    const toHex = (value: number) => {
        const hex = Math.round(value * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function hexToRgb(hex: string): RGB | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
    } : null;
}
