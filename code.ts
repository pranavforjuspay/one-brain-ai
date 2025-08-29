// @ts-nocheck
// code.ts - UI Audit plugin logic
// Scans the document for common UI issues and reports to the UI

console.log('🚀 Backend code.ts loaded successfully!');

// Show UI
figma.showUI(__html__, { width: 520, height: 1200, themeColors: true, title: "UI Audit" });

console.log('🎯 UI shown, message handler about to be registered');

// Message protocol types
interface ScanDocumentMessage {
  type: 'scan-document';
  spacingValue?: number;
}

interface GoToElementMessage {
  type: 'go-to-element';
  elementId: string;
  elementName?: string;
  zoomLevel?: number;
  highlight?: boolean;
}

interface CloseMessage {
  type: 'close';
}

interface Issue {
  id: string;
  category: string;
  description: string;
  elementName: string;
  elementId: string;
  pageName: string;
  frameName: string;
}

figma.ui.onmessage = async (msg: ScanDocumentMessage | GoToElementMessage | CloseMessage) => {
  console.log('📨 Backend: Message handler triggered with:', msg);
  try {
    if (msg.type === 'scan-document') {
      console.log('Backend: Full message received:', msg);
      console.log('Backend: msg.spacingValue =', msg.spacingValue);
      console.log('Backend: typeof msg.spacingValue =', typeof msg.spacingValue);
      const spacingValue = msg.spacingValue || 4;
      console.log('Backend: Final spacing value used:', spacingValue);
      await runAudit(spacingValue);
      return;
    }

    if (msg.type === 'close') {
      figma.closePlugin();
      return;
    }

    if (msg.type === 'go-to-element') {
      await goToElement(msg.elementId);
      return;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    figma.notify(`Plugin error: ${message}`);
  }
};

console.log('✅ Backend: Message handler registered successfully');

async function runAudit(spacingValue: number): Promise<void> {
  // Ensure pages are accessible in dynamic-page access mode
  if (typeof (figma as any).loadAllPagesAsync === 'function') {
    try {
      await (figma as any).loadAllPagesAsync();
    } catch {}
  }

  const issues: Issue[] = [];

  for (const page of figma.root.children) {
    if (page.type !== 'PAGE') continue;
    if (typeof (page as any).loadAsync === 'function') {
      try { await (page as any).loadAsync(); } catch {}
    }

    const nodes = page.findAll();
    for (const node of nodes) {
      const pageName = page.name;

      // 1. Text nodes not linked to a text style
      if (node.type === 'TEXT') {
        const usesTextStyle = 'textStyleId' in node && typeof (node as any).textStyleId === 'string' && (node as any).textStyleId !== '';
        if (!usesTextStyle) {
          issues.push({
            id: `text-style-missing-${node.id}`,
            category: 'Text style missing',
            description: 'Text node is not linked to a text style.',
            elementName: node.name,
            elementId: node.id,
            pageName: pageName,
            frameName: getNearestSectionName(node) || 'Unknown'
          });
        }
      }

      // 2. Fills/strokes not linked to a color style
      if ('fills' in node || 'strokes' in node) {
        const hasFills = 'fills' in node && Array.isArray((node as any).fills) && (node as any).fills.length > 0;
        const hasStrokes = 'strokes' in node && Array.isArray((node as any).strokes) && (node as any).strokes.length > 0;
        const fillStyleMissing = 'fillStyleId' in node && typeof (node as any).fillStyleId === 'string' && (node as any).fillStyleId === '' && hasFills;
        const strokeStyleMissing = 'strokeStyleId' in node && typeof (node as any).strokeStyleId === 'string' && (node as any).strokeStyleId === '' && hasStrokes;
        if (fillStyleMissing || strokeStyleMissing) {
          const which = fillStyleMissing && strokeStyleMissing ? 'Fill and stroke' : (fillStyleMissing ? 'Fill' : 'Stroke');
          issues.push({
            id: `color-style-missing-${node.id}`,
            category: 'Color style missing',
            description: `${which} not linked to a color style.`,
            elementName: (node as any).name || 'Layer',
            elementId: node.id,
            pageName: pageName,
            frameName: getNearestSectionName(node) || 'Unknown'
          });
        }
      }

      // 3. Autolayout spacing/padding not multiples of specified value
      if ('layoutMode' in node && (node as any).layoutMode !== 'NONE') {
        console.log(`Checking autolayout node: ${(node as any).name}, layoutMode: ${(node as any).layoutMode}`);
        
        const rawPaddings = [
          (node as any).paddingTop,
          (node as any).paddingRight,
          (node as any).paddingBottom,
          (node as any).paddingLeft,
          (node as any).itemSpacing
        ];
        
        console.log(`Raw padding values for ${(node as any).name}:`, rawPaddings);
        
        const paddings = rawPaddings.filter((v) => typeof v === 'number' && v > 0) as number[];
        console.log(`Filtered padding values for ${(node as any).name}:`, paddings);
        console.log(`Spacing value to check against: ${spacingValue}`);
        
        if (paddings.length > 0) {
          const offenders = paddings.filter((v) => v % spacingValue !== 0);
          console.log(`Offenders for ${(node as any).name}:`, offenders);
          
          if (offenders.length > 0) {
            console.log(`Creating spacing issue for ${(node as any).name}: spacing value = ${spacingValue}, offenders = ${offenders}`);
            issues.push({
              id: `autolayout-multiples-${node.id}`,
              category: 'Autolayout spacing',
              description: `Padding/spacing not in multiples of ${spacingValue}px. Found: ${offenders.join(', ')}px`,
              elementName: (node as any).name || 'Frame',
              elementId: node.id,
              pageName: pageName,
              frameName: getNearestSectionName(node) || 'Unknown'
            });
          }
        }
      }

      // 4. Stacked children but no autolayout
      if ('children' in node && Array.isArray((node as any).children) && (node as any).children.length >= 2) {
        const layoutMode = 'layoutMode' in node ? (node as any).layoutMode : 'NONE';
        if (layoutMode === 'NONE') {
          const children = (node as any).children as SceneNode[];
          const tolerance = 0.5;
          const allSameX = children.every((c) => 'x' in c && Math.abs((c as any).x - (children[0] as any).x) < tolerance);
          const allSameY = children.every((c) => 'y' in c && Math.abs((c as any).y - (children[0] as any).y) < tolerance);
          if (allSameX || allSameY) {
            issues.push({
              id: `stacked-no-autolayout-${node.id}`,
              category: 'No autolayout',
              description: 'Children are stacked but autolayout is not enabled.',
              elementName: (node as any).name || 'Frame',
              elementId: node.id,
              pageName: pageName,
              frameName: getNearestSectionName(node) || 'Unknown'
            });
          }
        }
      }

      // 5. Non-integer positioning/size (not pixel-aligned)
      if ('x' in node && 'y' in node && 'width' in node && 'height' in node) {
        const x = (node as any).x;
        const y = (node as any).y;
        const w = (node as any).width;
        const h = (node as any).height;
        if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(w) || !Number.isInteger(h)) {
          issues.push({
            id: `pixel-align-${node.id}`,
            category: 'Pixel alignment',
            description: 'x, y, width or height is not an integer.',
            elementName: (node as any).name || 'Layer',
            elementId: node.id,
            pageName: pageName,
            frameName: getNearestSectionName(node) || 'Unknown'
          });
        }
      }

      // 6. Instances detached
      if (node.type === 'INSTANCE') {
        try {
          const mainComponent = await (node as InstanceNode).getMainComponentAsync();
          if (mainComponent === null) {
            issues.push({
              id: `detached-instance-${node.id}`,
              category: 'Detached instance',
              description: 'Instance is detached from its main component.',
              elementName: node.name,
              elementId: node.id,
              pageName: pageName,
              frameName: getNearestSectionName(node) || 'Unknown'
            });
          }
        } catch {
          // Skip if we can't access the main component
        }
      }
    }
  }

  // Transform issues into the format expected by the UI
  const spacingIssues = issues.filter(i => i.category === 'Autolayout spacing').map(issue => transformIssue(issue, spacingValue));
  const textStyleIssues = issues.filter(i => i.category === 'Text style missing').map(issue => transformIssue(issue, spacingValue));
  const autolayoutIssues = issues.filter(i => i.category === 'No autolayout').map(issue => transformIssue(issue, spacingValue));
  const otherIssues = issues.filter(i => !['Autolayout spacing', 'Text style missing', 'No autolayout'].includes(i.category)).map(issue => transformIssue(issue, spacingValue));

  const results = {
    fileName: figma.root.name || 'Untitled',
    documentInfo: {
      pageCount: figma.root.children.filter(p => p.type === 'PAGE').length,
      elementCount: issues.length
    },
    totalIssues: issues.length,
    spacingIssues,
    textStyleIssues,
    autolayoutIssues: [...autolayoutIssues, ...otherIssues] // Include other issues in autolayout category
  };

  figma.ui.postMessage({ type: 'scan-complete', results });
}

function transformIssue(issue: Issue, spacingValue: number) {
  return {
    type: getIssueType(issue.category),
    title: issue.category,
    description: issue.description,
    element: issue.elementName,
    elementId: issue.elementId,
    pageName: issue.pageName,
    frameName: issue.frameName,
    suggestion: getSuggestion(issue.category, spacingValue)
  };
}

function getIssueType(category: string): string {
  switch (category) {
    case 'Autolayout spacing': return 'spacing';
    case 'Text style missing': return 'text-style';
    case 'No autolayout': return 'autolayout';
    default: return 'autolayout'; // Group other issues under autolayout
  }
}

function getSuggestion(category: string, spacingValue: number): string {
  switch (category) {
    case 'Autolayout spacing': return `Use multiples of ${spacingValue}px for consistent spacing`;
    case 'Text style missing': return 'Link to a text style from your design system';
    case 'No autolayout': return 'Enable autolayout for better responsive design';
    case 'Color style missing': return 'Link to a color style from your design system';
    case 'Pixel alignment': return 'Ensure x, y, width, and height are whole numbers';
    case 'Detached instance': return 'Reconnect to the main component';
    default: return 'Review and fix this design issue';
  }
}

function getNearestSectionName(node: SceneNode): string | null {
  let p: BaseNode | null = node;
  while (p) {
    if (p.type === 'SECTION') {
      return (p as any).name || null;
    }
    p = (p as any).parent || null;
  }
  return null;
}

async function goToElement(elementId: string): Promise<void> {
  try {
    // Validate elementId
    if (!elementId || typeof elementId !== 'string') {
      figma.notify('Invalid element ID');
      return;
    }

    // getNodeByIdAsync works in dynamic-page access
    const node = (figma as any).getNodeByIdAsync 
      ? await (figma as any).getNodeByIdAsync(elementId) 
      : figma.getNodeById(elementId);
    
    if (!node) {
      figma.notify('Element not found');
      figma.ui.postMessage({ type: 'element-not-found' });
      return;
    }

    // Switch to the correct page if necessary
    let p: BaseNode | null = node as any;
    while (p && p.type !== 'PAGE') {
      p = (p as any).parent || null;
    }
    if (p && p.type === 'PAGE') {
      // Use async version for dynamic page access
      if (typeof (figma as any).setCurrentPageAsync === 'function') {
        await (figma as any).setCurrentPageAsync(p as PageNode);
      } else {
        figma.currentPage = p as PageNode;
      }
    }

    // Ensure node is a SceneNode before selecting
    if ('id' in node && node.id) {
      figma.currentPage.selection = [node as SceneNode];
      await figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
      figma.ui.postMessage({ type: 'element-focused' });
    } else {
      figma.notify('Cannot select this element');
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    figma.notify(`Navigation error: ${message}`);
    figma.ui.postMessage({ type: 'element-not-found' });
  }
} 