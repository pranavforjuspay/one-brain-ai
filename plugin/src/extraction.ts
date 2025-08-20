/// <reference types="@figma/plugin-typings" />
import type { Extraction } from './types';

const isSection = (n: BaseNode): boolean => (n as any).type === 'SECTION';

type Rect = { x: number; y: number; w: number; h: number };

/** -------- render-bounds helpers (strict) -------- */
function getARB(n: SceneNode): Rect | null {
    // Access via `any` so TS won't complain on older typings.
    const rb = (n as any)['absoluteRenderBounds'] as
        | { x: number; y: number; width: number; height: number }
        | null
        | undefined;
    if (!rb) return null;
    return { x: rb.x, y: rb.y, w: rb.width, h: rb.height };
}
function rectUnion(rects: (Rect | null)[]): Rect | null {
    const rs = rects.filter(Boolean) as Rect[];
    if (!rs.length) return null;
    const x1 = Math.min(...rs.map(r => r.x));
    const y1 = Math.min(...rs.map(r => r.y));
    const x2 = Math.max(...rs.map(r => r.x + r.w));
    const y2 = Math.max(...rs.map(r => r.y + r.h));
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}
function intersects(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** -------- traversal policy --------
 * - Do NOT descend into Instance/Component/ComponentSet (treat atomic)
 * - Do NOT descend into nodes with no absoluteRenderBounds (not rendered)
 */
function mayDescend(node: SceneNode, isRoot: boolean): boolean {
    const t = node.type;
    if (t === 'INSTANCE' || t === 'COMPONENT' || t === 'COMPONENT_SET') return false;
    if (!('children' in node)) return false;
    // Root may be PAGE (no ARB). Allow root; otherwise require ARB.
    if (!isRoot) {
        const arb = getARB(node);
        if (!arb) return false;
    }
    return true;
}

function pushIf<T>(arr: T[], v: T | undefined | null) {
    if (v !== undefined && v !== null) arr.push(v);
}

export async function extractFromSelection(
    scope: Extraction['scope'],
    onProgress?: (message: string, detail?: string) => void
): Promise<Extraction> {
    try {
        onProgress?.('Starting extraction...', 'Initializing');

        const fileKey = figma.fileKey || '';
        const fileName = figma.root.name;
        const pageName = figma.currentPage.name;

        const selection = (figma.currentPage.selection || []) as SceneNode[];
        const hasSelection = selection.length > 0;

        // Roots: selection or page. We’ll treat each given root as "isRoot=true" for traversal policy.
        const roots: SceneNode[] = hasSelection ? selection : [figma.currentPage as unknown as SceneNode];

        // Strict scope: union of ARB of selected nodes (ignore nulls).
        const selectionARB: Rect | null = hasSelection
            ? rectUnion(selection.map(n => getARB(n)))
            : null;

        onProgress?.('Scanning layers...', `Found ${roots.length} root ${roots.length === 1 ? 'element' : 'elements'}`);

        const textSamples: string[] = [];
        const componentInstances: { name: string; variant?: string }[] = [];
        const prototypeLinks: { from: string; to: string }[] = [];
        const frameNameHints: string[] = [];
        const platformHints: string[] = [];
        const deepLinks: { label: string; url: string }[] = [];
        const thumbnails: string[] = [];

        let nodeId: string | undefined;
        let nodeName: string | undefined;
        let nodeType: string | undefined;

        let totalNodesProcessed = 0;
        let textNodesFound = 0;
        let componentInstancesFound = 0;
        let framesFound = 0;
        let linksFound = 0;
        let errorsEncountered = 0;

        const visit = (node: SceneNode, isRoot: boolean): void => {
            try {
                totalNodesProcessed++;
                const t = node.type;

                if (totalNodesProcessed % 25 === 0) {
                    onProgress?.('Processing...', `Analysed ${totalNodesProcessed} nodes`);
                }

                // STRICT: if not root and node has no ARB, skip entire subtree
                if (!isRoot) {
                    const arb = getARB(node);
                    if (!arb) return; // not rendered => ignore and do not descend
                    // keep arb around for section/link checks below
                }

                // TEXT — only if it has ARB, and within selectionARB if present
                if (t === 'TEXT') {
                    const arb = getARB(node);
                    if (arb && (!selectionARB || intersects(arb, selectionARB))) {
                        const s = ((node as TextNode).characters || '').trim();
                        if (s) {
                            textSamples.push(s.slice(0, 300));
                            textNodesFound++;
                            if (textNodesFound % 5 === 0) {
                                onProgress?.('Extracting text...', `Found ${textNodesFound} visible text samples`);
                            }
                        }
                    }
                }

                // INSTANCE — record metadata; DO NOT descend
                if (t === 'INSTANCE') {
                    componentInstancesFound++;
                    try {
                        const inst = node as InstanceNode;
                        let name = '';
                        try {
                            name = inst.mainComponent?.name || inst.name || 'Unknown Component';
                        } catch {
                            name = inst.name || 'Unknown Component';
                        }

                        let variant: string | undefined;
                        try {
                            const vp = (inst as any).variantProperties as Record<string, string> | undefined;
                            if (vp) {
                                const parts: string[] = [];
                                for (const k in vp) if (vp[k]) parts.push(`${k}=${vp[k]}`);
                                if (parts.length) variant = parts.join(',');
                            }
                        } catch { /* ignore */ }

                        if (name) {
                            componentInstances.push({ name, variant });
                            onProgress?.('Component', `Added "${name}" (${componentInstancesFound} total)`);
                        }
                    } catch (e) {
                        errorsEncountered++;
                        console.warn('[one-brain-ai] Instance processing failed:', e);
                        onProgress?.('Component error', `Skipped one instance (${errorsEncountered} errors total)`);
                    }
                }

                // FRAME/SECTION name hints — require ARB (rendered)
                if ((t === 'FRAME' || isSection(node))) {
                    const arb = getARB(node);
                    if (arb) {
                        const n = (node as any).name;
                        if (typeof n === 'string' && n) {
                            framesFound++;
                            frameNameHints.push(n);
                            onProgress?.('Frames...', `Found frame/section "${n}" (${framesFound})`);
                        }
                    }
                }

                // Hyperlinks — only if node is rendered and within selection scope (if any)
                if ((node as any).hyperlink) {
                    const arb = getARB(node);
                    if (arb && (!selectionARB || intersects(arb, selectionARB))) {
                        const linkVal = (node as any).hyperlink.value as string;
                        if (typeof linkVal === 'string' && linkVal) {
                            linksFound++;
                            const label = (node as any).name || 'link';
                            deepLinks.push({ label, url: linkVal });
                            onProgress?.('Links...', `Discovered ${linksFound} hyperlink${linksFound > 1 ? 's' : ''}`);
                        }
                    }
                }

                // Recurse only if policy allows (no instances/components; children exist; node rendered unless root)
                if (mayDescend(node, isRoot)) {
                    const children = (node as any).children as readonly SceneNode[] | undefined;
                    if (children?.length) for (const c of children) visit(c, /*isRoot=*/false);
                }
            } catch (err) {
                errorsEncountered++;
                console.warn('[one-brain-ai] visit skipped node due to error:', err);
                onProgress?.('Node error', `Skipped a problematic node (${errorsEncountered} errors total)`);
            }
        };

        onProgress?.('Traversing tree...', `Visiting ${roots.length} root ${roots.length === 1 ? 'node' : 'nodes'}`);
        for (let i = 0; i < roots.length; i++) {
            onProgress?.('Root...', `Element ${i + 1} of ${roots.length}`);
            try { visit(roots[i], /*isRoot=*/true); } catch (e) {
                errorsEncountered++;
                console.warn('[one-brain-ai] root visit failed', e);
                onProgress?.('Root error', `Failed to process root ${i + 1}`);
            }
        }

        // Prototype links: scan reactions on the selection only
        onProgress?.('Checking interactions...', 'Scanning reactions on selection');
        if (hasSelection) {
            for (const n of selection) {
                try {
                    const rxns = (n as any).reactions as ReadonlyArray<any> | undefined;
                    if (rxns?.length) {
                        for (const rx of rxns) {
                            const act = rx?.actions?.[0];
                            const to = act?.destinationId;
                            if (typeof to === 'string') {
                                prototypeLinks.push({ from: n.id, to });
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[one-brain-ai] reaction scan failed', e);
                }
            }
        }

        // Selected node metadata
        if (hasSelection) {
            const primary = selection[0];
            nodeId = primary?.id;
            nodeName = (primary as any)?.name;
            nodeType = (primary as any)?.type;
        }

        // Platform hints from page name
        const page = pageName.toLowerCase();
        if (/\bios\b|\biphone\b|\bipad\b/.test(page)) pushIf(platformHints, 'iOS');
        if (/\bandroid\b/.test(page)) pushIf(platformHints, 'Android');
        if (/\bweb\b|\bdesktop\b/.test(page)) pushIf(platformHints, 'Web');

        const summary = [
            `${totalNodesProcessed} nodes`,
            `${textSamples.length} visible text samples`,
            `${componentInstances.length} instances`,
            `${frameNameHints.length} frame hints`,
            `${prototypeLinks.length} prototype links`,
            `${deepLinks.length} hyperlinks`,
            errorsEncountered ? `${errorsEncountered} errors handled` : 'no errors'
        ].join(', ');
        onProgress?.('Extraction complete!', summary);

        const extraction: Extraction = {
            scope,
            fileKey,
            fileName,
            pageName,
            nodeId,
            nodeType,
            nodeName,
            textSamples,
            componentInstances,
            prototypeLinks,
            frameNameHints,
            platformHints,
            thumbnails,
            deepLinks
        };
        return extraction;
    } catch (err) {
        console.error('[one-brain-ai] extractFromSelection hard-failed:', err);
        const sel = figma.currentPage.selection as SceneNode[] || [];
        return {
            scope,
            fileKey: figma.fileKey || '',
            fileName: figma.root.name,
            pageName: figma.currentPage.name,
            nodeId: sel[0]?.id,
            nodeType: (sel[0] as any)?.type,
            nodeName: (sel[0] as any)?.name,
            textSamples: [],
            componentInstances: [],
            prototypeLinks: [],
            frameNameHints: [],
            platformHints: [],
            thumbnails: [],
            deepLinks: []
        };
    }
}

/** classifier unchanged */
export function guessState(
    frameNames: string[],
    texts: string[]
): 'success' | 'error' | 'empty' | 'loading' | 'unknown' {
    const hay = (frameNames.join(' ') + ' ' + texts.join(' ')).toLowerCase();
    if (/(error|failed|retry|oops|something went wrong)/.test(hay)) return 'error';
    if (/(no results|no data|empty|nothing here)/.test(hay)) return 'empty';
    if (/(loading|please wait|processing|spinner|skeleton)/.test(hay)) return 'loading';
    if (/(success|done|completed)/.test(hay)) return 'success';
    return 'unknown';
}
