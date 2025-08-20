export type DocLevel = 'frame' | 'section' | 'page' | 'file';

export type Extraction = {
    scope: DocLevel;
    fileKey: string;
    fileName: string;
    pageName: string;
    nodeId?: string;
    nodeType?: string;
    nodeName?: string;
    textSamples: string[];
    componentInstances: { name: string; variant?: string }[];
    prototypeLinks: { from: string; to: string }[];
    frameNameHints: string[];
    platformHints: string[];
    thumbnails: string[];
    deepLinks: { label: string; url: string }[];
};

// Capsule types
export type ComponentUse = { ds: string; variant?: string };
export type Link = { label: string; url: string };

export type BaseCapsule = {
    level: DocLevel;
    title: string;
    product?: string;
    problem: string;
    outcome?: string;
    approach: string[];
    components: ComponentUse[];
    links: Link[];
    platforms: string[];
    humanNotes?: string;
    canonical?: boolean;
    lastUpdated: string;
};

export type FrameCapsule = BaseCapsule & {
    level: 'frame';
    state: 'success' | 'error' | 'empty' | 'loading' | 'unknown';
    belongsToFlowId?: string;
};

export type SectionCapsule = BaseCapsule & {
    level: 'section';
    keyStates: string[];
    keyFrames: { title: string; figmaNodeUrl: string }[];
    belongsToPageId?: string;
    problemTags?: string[];
    patternTags?: string[];
};

export type PageCapsule = BaseCapsule & {
    level: 'page';
    containedFlowIds: string[];
    belongsToFileId?: string;
};

export type FileCapsule = BaseCapsule & {
    level: 'file';
    containedPageIds: string[];
};

export type Capsule = FrameCapsule | SectionCapsule | PageCapsule | FileCapsule;
