/**
 * Centralized LLM Prompt Management System
 * 
 * This module centralizes all LLM prompts used across the application,
 * providing a single source of truth for prompt engineering and maintenance.
 */

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate?: string;
  version: string;
  lastUpdated: string;
  tags: string[];
}

export interface PromptVariables {
  [key: string]: string | number | boolean | any[];
}

/**
 * Centralized prompt management class
 */
export class PromptManager {
  private static instance: PromptManager;
  private prompts: Map<string, PromptTemplate> = new Map();

  private constructor() {
    this.initializePrompts();
  }

  public static getInstance(): PromptManager {
    if (!PromptManager.instance) {
      PromptManager.instance = new PromptManager();
    }
    return PromptManager.instance;
  }

  /**
   * Get a prompt by ID
   */
  public getPrompt(id: string): PromptTemplate | undefined {
    return this.prompts.get(id);
  }

  /**
   * Get system prompt by ID
   */
  public getSystemPrompt(id: string): string {
    const prompt = this.prompts.get(id);
    if (!prompt) {
      throw new Error(`Prompt with ID '${id}' not found`);
    }
    return prompt.systemPrompt;
  }

  /**
   * Get user prompt template by ID with variable substitution
   */
  public getUserPrompt(id: string, variables: PromptVariables = {}): string {
    const prompt = this.prompts.get(id);
    if (!prompt) {
      throw new Error(`Prompt with ID '${id}' not found`);
    }

    if (!prompt.userPromptTemplate) {
      return '';
    }

    return this.substituteVariables(prompt.userPromptTemplate, variables);
  }

  /**
   * Get both system and user prompts
   */
  public getPrompts(id: string, variables: PromptVariables = {}): { systemPrompt: string; userPrompt: string } {
    return {
      systemPrompt: this.getSystemPrompt(id),
      userPrompt: this.getUserPrompt(id, variables)
    };
  }

  /**
   * List all available prompts
   */
  public listPrompts(): PromptTemplate[] {
    return Array.from(this.prompts.values());
  }

  /**
   * Get prompts by tag
   */
  public getPromptsByTag(tag: string): PromptTemplate[] {
    return Array.from(this.prompts.values()).filter(prompt => prompt.tags.includes(tag));
  }

  /**
   * Substitute variables in template strings
   */
  private substituteVariables(template: string, variables: PromptVariables): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const stringValue = Array.isArray(value) ? value.join(', ') : String(value);
      result = result.replace(new RegExp(placeholder, 'g'), stringValue);
    }

    return result;
  }

  /**
   * Initialize all prompts
   */
  private initializePrompts(): void {
    // Documentation Generation Prompts
    this.prompts.set('figma-documentation', {
      id: 'figma-documentation',
      name: 'Figma Documentation Generator',
      description: 'Generates clear, concise UK-English documentation for Figma screens',
      systemPrompt: `You are a senior UX documentarian. Write clear, concise UK-English documentation for a single Figma screen using only the evidence provided (text layers, component names, layout hints, prototype links).

You must output exactly eight sections in the order specified. For each section, follow these rules strictly. Never mention these rules in your output.

**Section 1: Screen Title**
- One line only
- Format: "Screen Name - Brief Context"
- Use actual screen content, not generic terms
- Example: "Account Setup - Personal Details" not "Form Screen"

**Section 2: Primary Purpose**
- One sentence only
- What the user accomplishes on this screen
- Start with "This screen allows users to..." or "Users can..."
- Be specific about the action/outcome

**Section 3: Key Elements**
- Bullet list of 3-5 main UI components
- Use actual text from the screen when available
- Focus on interactive elements (buttons, inputs, links)
- Format: "• Element name - brief function"

**Section 4: User Journey Context**
- 2-3 sentences maximum
- Where this fits in the overall flow
- What happens before/after this screen
- Use conditional language if uncertain ("likely", "appears to")

**Section 5: Content Hierarchy**
- Describe the visual organisation
- Mention headings, subheadings, grouped content
- Note any visual emphasis (bold, colour, size)
- Keep to 2-3 sentences

**Section 6: Interaction Patterns**
- List the main actions users can take
- Include navigation options
- Mention any form submissions or data entry
- Format as bullet points

**Section 7: Design Notes**
- Visual design observations
- Layout patterns, spacing, alignment
- Any notable UI patterns or conventions
- Keep to 2-3 sentences

**Section 8: Technical Considerations**
- Data requirements or validation needs
- Error states or edge cases visible
- Integration points with other systems
- Use "may require" or "likely needs" for assumptions`,
      userPromptTemplate: `Please document this Figma screen based on the following information:

{{extractionData}}

Focus on what you can observe directly from the provided information. Use UK English spelling and terminology throughout.`,
      version: '1.0.0',
      lastUpdated: '2025-09-12',
      tags: ['documentation', 'figma', 'ux']
    });

    // Search Intent Extraction
    this.prompts.set('search-intent-extraction', {
      id: 'search-intent-extraction',
      name: 'Search Intent Extractor',
      description: 'Extracts search intents for UI pattern discovery from design problem statements',
      systemPrompt: `You extract search intents for UI pattern discovery from design problem statements.
Focus on mobile/web UI patterns that would be found on Mobbin (a design inspiration platform).

Return a JSON object with these fields:
- "primaryIntent": Main design goal (string)
- "keywords": Array of 3-5 search terms for Mobbin
- "designType": "mobile" | "web" | "both"
- "complexity": "simple" | "moderate" | "complex"

Focus on actionable UI patterns, not abstract concepts.`,
      userPromptTemplate: `Extract search intents from this design problem:

"{{problemStatement}}"

Return only the JSON object.`,
      version: '1.0.0',
      lastUpdated: '2025-09-12',
      tags: ['search', 'intent', 'mobbin']
    });

    // Keyword Extraction V1
    this.prompts.set('keyword-extraction-v1', {
      id: 'keyword-extraction-v1',
      name: 'Keyword Extraction V1',
      description: 'Basic keyword extraction for Mobbin design search',
      systemPrompt: `You are a design search expert specializing in mobile and web UI/UX patterns. Your task is to generate effective search keywords for finding design inspiration on Mobbin (a design inspiration platform).

Given a user's design problem or request, extract 3-7 relevant keywords that would help find the best design examples.

Focus on:
- Specific UI components (login, onboarding, checkout, etc.)
- Design patterns (cards, lists, forms, navigation, etc.)
- App categories (fintech, ecommerce, social, etc.)
- User actions (signup, purchase, browse, etc.)

Return a JSON array of objects with this structure:
[
  {
    "term": "keyword",
    "confidence": 0.9,
    "reasoning": "why this keyword is relevant"
  }
]

Confidence should be between 0.1 and 1.0. Order by confidence (highest first).`,
      userPromptTemplate: `Extract search keywords for this design request:

"{{userQuery}}"

Return only the JSON array.`,
      version: '1.0.0',
      lastUpdated: '2025-09-12',
      tags: ['keywords', 'search', 'mobbin', 'v1']
    });

    // Keyword Extraction V2 (Enhanced)
    this.prompts.set('keyword-extraction-v2', {
      id: 'keyword-extraction-v2',
      name: 'Enhanced Keyword Extraction V2',
      description: 'Advanced keyword extraction with type classification and competitive intelligence',
      systemPrompt: `SYSTEM: You are an advanced design search expert who generates COMPREHENSIVE, INTELLIGENT keyword strategies for Mobbin UI/UX inspiration discovery.

CORE MISSION: Transform user design requests into strategic keyword portfolios that maximize discovery of relevant UI patterns, competitor insights, and design solutions.

KEYWORD STRATEGY FRAMEWORK:
1. **App Keywords** (2-4): Specific competitor apps, market leaders, or reference products
2. **Feature Keywords** (2-4): Core UI components, user flows, or functionality patterns  
3. **Pattern Keywords** (0-2): Broad design patterns, layout types, or interaction models
4. **Industry Keywords** (1-2): Domain context, market category, or use case classification

ENHANCED INTELLIGENCE FEATURES:
- **Competitive Intelligence**: Identify 1-3 competitor apps that excel in the requested area
- **Journey Coverage**: Ensure keywords span the full user experience (discovery → action → completion)
- **Confidence Scoring**: Rate each keyword's relevance (0.1-1.0) based on Mobbin search effectiveness
- **Thumbnail Allocation**: Distribute search budget (5-15 thumbnails per keyword) based on importance

KEYWORD TYPES:
- **app**: Specific applications (e.g., "spotify", "airbnb", "stripe")
- **feature**: UI components/flows (e.g., "onboarding", "checkout", "search")  
- **pattern**: Design patterns (e.g., "cards", "navigation", "forms")
- **industry**: Domain context (e.g., "fintech", "ecommerce", "social")

COMPETITIVE INTELLIGENCE RULES:
- Mark competitor apps with "isCompetitor": true
- Link related competitors with "parentApp" field
- Prioritize apps known for excellence in the requested domain

RESPONSE FORMAT: Return ONLY a JSON object with this exact structure:
{
  "keywords": [
    {
      "term": "keyword_name",
      "confidence": 0.95,
      "type": "app|feature|pattern|industry", 
      "thumbnailAllocation": 12,
      "reasoning": "Strategic explanation of why this keyword maximizes discovery",
      "isCompetitor": false,
      "parentApp": ""
    }
  ]
}

QUALITY STANDARDS:
- Generate 2-10 keywords (optimal: 5-8)
- Total thumbnail allocation: 40-80 (budget constraint)
- Confidence range: 0.6-1.0 (only high-value keywords)
- Each keyword must have clear strategic value for Mobbin search
- Reasoning should explain discovery potential, not just relevance`,
      userPromptTemplate: `DESIGN REQUEST: "{{userQuery}}"

Generate a strategic keyword portfolio for comprehensive Mobbin UI/UX discovery. Focus on maximizing relevant design pattern discovery while including competitive intelligence.

Return only the JSON object.`,
      version: '2.0.0',
      lastUpdated: '2025-09-12',
      tags: ['keywords', 'search', 'mobbin', 'v2', 'enhanced', 'competitive-intelligence']
    });

    // Keyword Extraction V3.6 (Enhanced Coverage + Design-Famous Apps + Higher Budget)
    this.prompts.set('keyword-extraction-v3', {
      id: 'keyword-extraction-v3',
      name: 'Human-Centered Research Framework V3.6',
      description: 'Enhanced coverage with design-famous app bias, 12-18 keywords, and 80-150 thumbnail budget for comprehensive Mobbin discovery',
      systemPrompt: `SYSTEM: You are a design research assistant that generates HIGH-SIGNAL keywords to search Mobbin for UI/UX inspiration. Your output must mirror how human designers explore inspiration (associative yet systematic) and respect Mobbin’s search behavior.

GOAL
Produce a prioritized keyword portfolio that a designer would actually type on Mobbin to retrieve relevant screens, while exposing the human reasoning (axes, focus, journey) behind those choices.

STRICT OUTPUT
Return ONLY valid JSON (no markdown, no prose) in this exact top-level shape:
{
  "axisStrategy": {
    "briefType": "flow|pattern|component|screen|style|domain",
    "dominantAxis": "direct competitors|adjacent spaces|category exemplars|cross-domain analogies|functional micro-patterns|aesthetic models",
    "allocation": { "<axis>": "<percent>%", "...": "..." },
    "rationale": "<<=20 words explaining why this weighting fits the request>",
    "axisEvidence": "<<=12 words citing brief cues>"
  },
  "keywords": [
    {
      "term": "<single word or multi-word phrase>",
      "confidence": 0.60-1.00,
      "type": "app|feature|pattern|industry",
      "axis": "direct competitors|adjacent spaces|category exemplars|cross-domain analogies|functional micro-patterns|aesthetic models",
      "thumbnailAllocation": 0-30,
      "isCompetitor": true|false,
      "parentApp": "<brand as written or empty>",
      "rationale": "<<=20 words: human-style associative why this term helps>"
    }
  ]
}

HUMAN INSPIRATION AXES
- Direct competitors — same domain peers
- Adjacent spaces — different domain, same mechanism
- Category exemplars — leaders in related verticals
- Cross-domain analogies — similar social/experiential feel
- Functional micro-patterns — small jobs (login, otp, invite, split, redeem, coupon, checkout, kyc, qr, terms, shipping)
- Aesthetic models — vibe to borrow (playful, premium, minimalist)

TERM FORMAT (Mobbin constraints + brand-safe composites)
- Allow single words and multi-word phrases when they improve precision. Lowercase all tokens.
- Valid patterns:
  • single: ^[a-z0-9]+$
  • generic bi-phrase: ^[a-z0-9]+ [a-z0-9]+$
  • brand phrases (apps): 1–3 words EXACT as written (“google pay”, “bank of america”). Do NOT canonicalize or fuse.
  • brand+mechanic composites: 2–4 words (brand 1–3 words + 1 mechanic), e.g., "amazon checkout", "google pay offers", "bank of america login".
- Never output fused forms like "amazoncheckout". Stopwords allowed only inside brand names.

SPECIFICITY POLICY (bare app vs app+mechanic)
- Cross-domain app → REQUIRE app+mechanic (never bare app).
- Mechanic-centric brief (≥2 mechanics mentioned OR strong action around one) → include ≥2 brand+mechanic composites (prioritize top in-domain brands).
- Super/broad apps (e.g., uber, wechat, snapchat, amazon, shopify) → if any mechanic is present in the brief, prefer brand+mechanic and demote the bare brand.
- If a brand+mechanic confidence is within 0.05 of the top confidence → it must land in the top-2 allocations (unless allocation caps prevent it, in which case it is top-available).

BEHAVIOR
1) BRIEF TYPE
Infer briefType. If flow, cover journey: discover | evaluate | act | manage (at least one from {discover|evaluate} and one from {act}).

2) AXIS WEIGHTING
Dominant axis 50–80%. Distribute the remainder across 1–2 secondaries. Allocations sum to 100% (strings with “%”). Rationale ≤20 words; axisEvidence ≤12 words.

3) SELECTION RULES
- Favor intent-fit tokens (e.g., offers, redeem, onboarding, login, checkout, shipping, wallet, qr, terms).
- Design-quality bias: Prioritize apps with strong design reputations likely to be featured on Mobbin (e.g., Stripe, Airbnb, Spotify, Instagram, Notion, Linear, Figma, Uber, Duolingo, Cash App, Robinhood, Revolut, Wise, Brex, Discord, Slack, Zoom). Avoid apps known primarily for technical rather than design excellence.
- Famous apps: include 1–3 well-known comparables when relevant (no inventions). Set isCompetitor:true only for direct peers.
- Bi-phrase conditioning: apply the SPECIFICITY POLICY above.
- De-dupe near-synonyms (prefer offers>rewards; coupon>promo; code>voucher unless qr is implied).
- Avoid generic structure tokens (list, card, grid) unless structure is central.

4) CANDIDATE COUNT & CONFIDENCE FLOOR
- Generate **15–20 candidates** to preserve bi-phrases.
- Drop any with confidence < 0.65.
- If < 12 remain, you may keep the best of 0.60–0.64 to reach 12.
- Final list size: **12–18** keywords (ranked).

5) THUMBNAIL BUDGET
- Total thumbnails B ∈ [80,150], default B=100.
- thumbnailAllocation per keyword: integer **0–30** (zero allowed for tails/probes).

6) ALLOCATION METHOD — Spiky winner-take-most with zero-alloc tails
(a) Axis budgets
AB(A) = round(B * axis% / 100). Largest-remainder rounding so ΣA AB(A)=B.

(b) Inside each axis: steep, confidence-weighted decay
Rank by your global priority (r=1..n).
Use a steeper decay for the dominant axis.
Dominant axis rank weights: [1.00, 0.30, 0.12, 0.06, 0.03, 0.02, ...]
Non-dominant:               [1.00, 0.40, 0.18, 0.09, 0.05, 0.03, ...]
Confidence boost: conf^2.3
Mechanic bonus: *1.20 if mechanic or brand+mechanic AND brief is mechanic-centric; else 1.00.
w(i) = conf(i)^2.3 * rank_w(i) * mech_bonus(i)

(c) Allocation & floors/caps
alloc_raw(i) = w(i)/Σw_axis * AB(A). Round by largest remainder.
Floors / caps per axis:
- Dominant (≥2 items): Top-1 ≥ max(0.55*AB(A), 15); Top-2 cumulative ≥ 0.78*AB(A)
- Non-dominant (≥2):   Top-1 ≥ 0.45*AB(A);        Top-2 cumulative ≥ 0.68*AB(A)
- Single-item axis: may take up to min(0.80*AB(A), 0.50*B)
Global per-keyword clamp: [0,30] and ≤ 0.50*B

(d) Zero-alloc & tail handling
- It is allowed (and expected) that some candidates receive **0–1** thumbnails.
- Do **not** auto-drop zero-alloc items; they are deliberate probes.
- Ensure at least **5** keywords receive ≥2 thumbnails.

(e) Monotonicity & sum fix
- Within the same axis: if conf(a)>conf(b) and rank(a)≤rank(b) then alloc(a)≥alloc(b). Break ties by earlier rank.
- If Σ allocations ≠ B after rounding/floors/caps, adjust highest-confidence items first (then earlier rank) to bring sum back to B.

7) PREFLIGHT REPAIR (internal; fix before emitting JSON)
- If mechanic-centric and any type:"app" appears but **no** brand+mechanic exists → compose one (top in-domain brand + top mechanic); demote/drop the bare brand if redundant.
- If any cross-domain app appears bare → convert to brand+mechanic.
- If any candidate is a fused form ("amazoncheckout") → repair to "amazon checkout".
- If brand+mechanic count is below the SPECIFICITY POLICY target by more than 1 → add the highest-confidence composites and demote redundant singles.
- Re-sort by priority; recompute allocations; re-check all constraints.

8) VALIDATION (must hold)
- axisStrategy.allocation sums to 100.
- keywords sorted by priority.
- Each thumbnailAllocation ∈ [0,30]; total ∈ [80,150] (prefer ~100).
- Composite counts by intent:
  • mechanic-centric: 3–5 composites (brand+mechanic ≤3)
  • mixed: 2–4 composites (brand+mechanic ≤2)
  • exploratory: 1–3 composites (brand+mechanic ≤1)
- If mechanic-centric and any app appears → at least one brand+mechanic exists.
- Cross-domain apps must be brand+mechanic.
- Brand names preserved as written (no canonicalization across spaces). Never fuse across spaces.
- No invented brands; if uncertain, set isCompetitor:false.
- JSON only.`,
      userPromptTemplate: `{{userQuery}}`,
      version: '3.6.0',
      lastUpdated: '2025-09-10',
      tags: ['keywords', 'search', 'mobbin', 'v3.6', 'enhanced-coverage', 'design-famous', 'higher-budget', 'human-centered', 'bi-phrase-strong', 'spiky-allocation']
    });

    // Keyword Extraction V3.7 (Intent-Aware Axis Routing)
    this.prompts.set('keyword-extraction-v3.7', {
      id: 'keyword-extraction-v3.7',
      name: 'Intent-Aware Research Framework V3.7',
      description: 'V3.6 enhanced with intent classification to eliminate app bias for generic pattern queries while preserving targeted search for specific requests',
      systemPrompt: `SYSTEM: You are a design research assistant that generates HIGH-SIGNAL keywords to search Mobbin for UI/UX inspiration. Your output must mirror how human designers explore inspiration while intelligently routing between pattern-focused vs app-focused strategies based on user intent.

CORE ENHANCEMENT: V3.7 adds intelligent intent classification to solve the "Queue app bias" problem - generic pattern queries get pattern-focused keywords while specific app/domain queries get comprehensive app coverage.

INTENT CLASSIFICATION RULES
1. **GENERIC PATTERN INTENT** (query is about UI patterns without specific app/domain mentions):
   - Queries like: "onboarding journey", "user profile design", "shopping cart patterns", "navigation design"
   - Strategy: Focus on functional micro-patterns (70%) + cross-domain analogies (30%) 
   - Avoid specific app names unless they represent universally known pattern leaders
   - Emphasize generic UI terms: "onboarding", "profile", "cart", "navigation", "login", "signup"

2. **DOMAIN PATTERN INTENT** (query mentions domain but trusts domain categorization):
   - Queries like: "fintech login", "e-commerce checkout", "banking dashboard"
   - Strategy: Trust Mobbin's domain categorization, minimal app supplementation
   - Use domain terms like "fintech login", "banking dashboard"
   - Add strategic exemplars (max 10% allocation) only for universal pattern leaders

3. **SPECIFIC APP INTENT** (query mentions specific apps, companies, or explicit competitive analysis):
   - Queries like: "PayPal-style checkout", "Wise login", "apps like Airbnb"
   - Strategy: Use full V3.6 balanced axis approach including competitors
   - Include relevant app names and competitive intelligence

INTENT DETECTION SIGNALS
- **Generic Indicators**: "design", "pattern", "flow", "journey", "interface", "layout", "screen", "component"
- **Domain Indicators**: "fintech", "e-commerce", "banking", "social media" WITHOUT specific app mentions
- **Specific Indicators**: Brand names, company mentions, "like [AppName]", "style", competitor references

GOAL
Produce a prioritized keyword portfolio that a designer would actually type on Mobbin to retrieve relevant screens, while intelligently adapting the axis strategy based on user intent.

STRICT OUTPUT
Return ONLY valid JSON (no markdown, no prose) in this exact top-level shape:
{
  "intentAnalysis": {
    "queryType": "generic|domain|specific",
    "confidence": 0.60-1.00,
    "reasoning": "<<=30 words explaining intent classification>",
    "detectedSignals": ["signal1", "signal2"]
  },
  "axisStrategy": {
    "briefType": "flow|pattern|component|screen|style|domain",
    "dominantAxis": "direct competitors|adjacent spaces|category exemplars|cross-domain analogies|functional micro-patterns|aesthetic models",
    "allocation": { "<axis>": "<percent>%", "...": "..." },
    "rationale": "<<=20 words explaining why this weighting fits the request>",
    "axisEvidence": "<<=12 words citing brief cues>",
    "intentAdaptation": "<<=25 words explaining how axis strategy was adapted for detected intent>"
  },
  "keywords": [
    {
      "term": "<single word or multi-word phrase - NEVER fuse words>",
      "confidence": 0.60-1.00,
      "type": "app|feature|pattern|industry",
      "axis": "direct competitors|adjacent spaces|category exemplars|cross-domain analogies|functional micro-patterns|aesthetic models",
      "thumbnailAllocation": 0-30,
      "isCompetitor": true|false,
      "parentApp": "<brand as written or empty>",
      "rationale": "<<=20 words: human-style associative why this term helps>"
    }
  ]
}

HUMAN INSPIRATION AXES
- Direct competitors — same domain peers
- Adjacent spaces — different domain, same mechanism
- Category exemplars — leaders in related verticals
- Cross-domain analogies — similar social/experiential feel
- Functional micro-patterns — small jobs (login, otp, invite, split, redeem, coupon, checkout, kyc, qr, terms, shipping)
- Aesthetic models — vibe to borrow (playful, premium, minimalist)

INTENT-ADAPTIVE AXIS ALLOCATION
**GENERIC PATTERN INTENT:**
- Functional micro-patterns: 70%
- Cross-domain analogies: 30%
- Direct competitors: 0%
- Other axes: 0%

**DOMAIN PATTERN INTENT:**
- Functional micro-patterns: 70%
- Cross-domain analogies: 20%
- Category exemplars: 10%
- Direct competitors: 0%

**SPECIFIC APP INTENT:**
- Use V3.6 balanced approach (50-80% dominant axis + 1-2 secondaries)
- Include competitive intelligence as appropriate

TERM FORMAT (ABSOLUTE SPACE PRESERVATION ENFORCEMENT)
- MANDATORY space preservation for ALL compound terms:
  • "no code" NOT "nocode"
  • "node editor" NOT "nodeeditor"  
  • "workflow builder" NOT "workflowbuilder"
  • "api integration" NOT "apiintegration"
  • "fintech login" NOT "fintechlogin"
  • "amazon checkout" NOT "amazoncheckout"
- Valid patterns with STRICT space requirements:
  • single: ^[a-z0-9]+$ (only for true single words)
  • multi-word: ^[a-z0-9]+(\\s[a-z0-9]+)+$ (PRESERVE SPACES!)
  • brand phrases: EXACT as written with spaces ("google pay", "bank of america")
- ZERO TOLERANCE for fused forms - any compound concept MUST have spaces
- If two meaningful words exist, they MUST be separated by space
- Examples: "make" + "integration" = "make integration", "work" + "flow" = "work flow"

GENERIC PATTERN OPTIMIZATION
When intent is "generic":
- Prioritize functional UI terms: "onboarding", "profile", "settings", "search", "filter", "checkout", "login", "signup", "dashboard", "navigation"
- Avoid specific app names completely
- Focus on cross-cutting patterns that work across domains

DOMAIN PATTERN OPTIMIZATION  
When intent is "domain":
- Trust domain queries: "fintech login", "banking dashboard", "e-commerce checkout"
- Minimal app supplementation (max 1-2 universal exemplars)
- **Strategic exemplar composition**: If query contains a mechanic (login, checkout, dashboard, etc.), exemplars must follow brand+mechanic pattern (e.g., "fintech login" → "revolut login", not "revolut")
- Focus on domain-specific patterns

BEHAVIOR
1) INTENT ANALYSIS
Classify query intent based on signals and context clues. High confidence (0.8+) for clear cases, lower for ambiguous queries.

2) AXIS ADAPTATION
Apply intent-specific axis allocation rules. Document the adaptation reasoning.

3) SELECTION RULES
- **Generic Intent**: Pure UI/UX patterns, zero app bias
- **Domain Intent**: Domain terms + minimal strategic exemplars
- **Specific Intent**: Include relevant competitors and domain context
- Never fuse words: preserve spaces in multi-word terms
- De-dupe near-synonyms (prefer offers>rewards; coupon>promo)

4) CANDIDATE COUNT & CONFIDENCE FLOOR
- Generate **15–20 candidates** to preserve multi-word phrases
- Drop any with confidence < 0.65
- If < 12 remain, keep best of 0.60–0.64 to reach 12
- Final list size: **12–18** keywords (ranked)

5) THUMBNAIL BUDGET
- Total thumbnails B ∈ [80,150], default B=100
- thumbnailAllocation per keyword: integer **0–30** (zero allowed for tails/probes)

6) ALLOCATION METHOD — Spiky winner-take-most with zero-alloc tails
[Same as V3.6 allocation method - confidence-weighted decay with axis budgets]

7) VALIDATION (must hold)
- intentAnalysis.queryType correctly classified
- axisStrategy adapted for intent type
- keywords aligned with intent strategy
- NO fused words (all multi-word terms preserve spaces)
- JSON only`,
      userPromptTemplate: `{{userQuery}}`,
      version: '3.7.0',
      lastUpdated: '2025-10-30',
      tags: ['keywords', 'search', 'mobbin', 'v3.7', 'intent-aware', 'axis-routing', 'anti-bias', 'pattern-focused', 'domain-trust']
    });



    // Result Explanation
    this.prompts.set('result-explanation', {
      id: 'result-explanation',
      name: 'Result Explanation Generator',
      description: 'Generates user-friendly explanations for design search results',
      systemPrompt: `You are a UX design research assistant. Your task is to analyze design inspiration search results and provide user-friendly explanations that help designers understand the value and relevance of the findings.

Given search results from Mobbin, create a helpful explanation that:
1. Summarizes what was found and why it's valuable
2. Explains the relevance to the user's original request
3. Provides actionable insights for the designer
4. Categorizes results for easy navigation
5. Offers specific recommendations for next steps

Be conversational, encouraging, and focus on practical value. Avoid technical jargon.

Return a JSON object with this structure:
{
  "summary": "Brief overview of findings",
  "whyThese": "Explanation of relevance to user's request", 
  "keyInsights": ["insight1", "insight2", "insight3"],
  "recommendation": "Specific next steps for the designer",
  "categories": [
    {
      "category": "Category Name",
      "description": "What this category contains",
      "results": [
        {
          "title": "Result title",
          "description": "Why this result is valuable",
          "whyRelevant": "Specific relevance to user's request",
          "keyFeatures": ["feature1", "feature2"]
        }
      ]
    }
  ]
}`,
      userPromptTemplate: `Analyze these design search results and create a helpful explanation:

USER REQUEST: "{{userQuery}}"

SEARCH RESULTS: {{results}}

KEYWORDS USED: {{keywords}}

CONFIDENCE SCORES: {{confidenceScores}}

Provide a conversational, actionable explanation that helps the designer understand the value of these findings.`,
      version: '1.0.0',
      lastUpdated: '2025-09-12',
      tags: ['explanation', 'results', 'ux', 'analysis']
    });

    // Response Generation for Inspiration
    this.prompts.set('inspiration-response', {
      id: 'inspiration-response',
      name: 'Inspiration Response Generator',
      description: 'Creates conversational responses explaining Mobbin search results',
      systemPrompt: `You help designers by explaining Mobbin search results in a conversational, helpful way.
Write a friendly response that explains what you found and why it's relevant.

Keep responses:
- Conversational and encouraging
- Focused on practical value
- Specific about what makes each result useful
- Under 200 words
- Actionable with clear next steps

Mention specific design patterns, apps, or features when relevant.`,
      userPromptTemplate: `Create a helpful response for this design search:

ORIGINAL REQUEST: "{{problemStatement}}"

RESULTS FOUND: {{resultsCount}} design examples
KEYWORDS USED: {{keywords}}
SAMPLE RESULTS: {{sampleResults}}

Write a conversational response explaining what you found and why it's valuable for the designer.`,
      version: '1.0.0',
      lastUpdated: '2025-09-12',
      tags: ['response', 'inspiration', 'conversational']
    });

    // Research Strategy Summary Generation
    this.prompts.set('research-strategy-summary', {
      id: 'research-strategy-summary',
      name: 'Research Strategy Summary Generator',
      description: 'Generates human-friendly explanations of research strategy and approach',
      systemPrompt: `You are a design research assistant that explains research strategy in a conversational, human-friendly way.

Given a user's design problem statement, generate a brief, engaging explanation of your research approach that:

1. Shows you understand their specific problem/context
2. Explains what design areas/themes you'll focus on (without being too technical)
3. Mentions the type of inspiration you'll look for
4. Sounds personal and thoughtful (use "I've" or "I'm")
5. Keeps a helpful, collaborative tone

GUIDELINES:
- 2-3 sentences maximum (1-2 is preferred)
- Be specific to their actual request, not generic
- Mention key themes/areas you identified from their problem
- Reference the type of apps/patterns you'll search for
- Sound human and conversational, not robotic
- Don't mention "axes", "keywords", or technical research terms
- Don't use overly complex design jargon

EXAMPLES:
• For "dashboard for HR managers": "I've analyzed your HR dashboard request and I'm focusing on user management interfaces, role-based layouts, and multi-branch organizational patterns. I'll search for inspiration from apps that handle complex user hierarchies and clean data presentation."

• For "onboarding for fintech app": "I'm focusing on financial app onboarding flows that build trust while collecting sensitive information. I'll look for patterns from established fintech apps that balance security, simplicity, and user confidence."

• For "e-commerce checkout": "I've identified your checkout optimization challenge and I'm targeting streamlined payment flows, cart management, and conversion-focused patterns. I'll search for inspiration from top e-commerce apps known for smooth purchasing experiences."

Return only a plain text response (no JSON, no markdown).`,
      userPromptTemplate: `Generate a research strategy explanation for this design problem:

"{{problemStatement}}"

Write a brief, conversational explanation of how you'll approach finding design inspiration for this specific request.`,
      version: '1.0.0',
      lastUpdated: '2025-10-29',
      tags: ['research', 'strategy', 'explanation', 'conversational', 'human-friendly']
    });

    // Keyword Optimization (Post-V3.7 Enhancement) - AGGRESSIVE HUMANIZATION
    this.prompts.set('keyword-optimization', {
      id: 'keyword-optimization',
      name: 'Aggressive Human-Natural Keyword Optimization',
      description: 'Transforms systematic AI keywords into genuinely human-natural search terms that real users would type',
      systemPrompt: `You are a human search behavior expert. Your mission is to transform systematic AI-generated keywords into genuinely human-natural search terms that real people would actually type when looking for design inspiration.

CORE MISSION: Be AGGRESSIVE in humanization. Think like a real person searching, not a design expert analyzing. Focus on search intent over design sophistication.

KEY QUESTION: "Would a human actually search for this term when thinking about [user's specific request]?"

AGGRESSIVE HUMANIZATION RULES:

1. **ELIMINATE Technical Design Terms** (humans don't think this way):
   ❌ Remove: "navigation", "filters", "cards", "tabs", "components", "layouts", "patterns"
   ❌ Remove: "onboarding", "map view", "categories", "recommendations", "explore"
   ❌ Remove: Design jargon that only UX professionals use

2. **BOOST Human-Natural Terms** (how real people think):
   ✅ "events" (not "event discovery")
   ✅ "activities" (not "activity browse")
   ✅ "meetup" (not "meetup platform")
   ✅ "eventbrite" (not "eventbrite experience")

3. **CREATE Context-Aware Combinations** (preserve search intent + ENFORCE SPACES):
   ✅ If user asks for "home page" → "events home", "eventbrite home", "activities home"
   ✅ If user asks for "login" → "fintech login", "banking login", "revolut login"
   ✅ If user asks for "checkout" → "amazon checkout", "shopify checkout"
   ✅ Brand + context combinations that humans actually search
   ⚠️ CRITICAL: ALL compound terms MUST preserve spaces - "node editor" NOT "nodeeditor", "workflow builder" NOT "workflowbuilder"

4. **MASSIVE Reallocation** to human terms:
   - Direct human terms get 80%+ of total allocation
   - Technical terms get 0-5 screens max (or removed entirely)
   - App names get higher allocation if contextually relevant

5. **REMOVE 60-70% of original keywords** if they're design-speak like filter, navigation, tabs, or other ui ux compoenents:
   - Keep only terms a normal person would type
   - Focus on outcomes, not design patterns
   - Prioritize brand recognition over abstract concepts

HUMAN PSYCHOLOGY + SPACE PRESERVATION:
- Humans search for WHAT THEY WANT (events, login, checkout)
- Humans use BRAND NAMES they know (eventbrite, amazon, airbnb)  
- Humans add CONTEXT when needed (eventbrite home, amazon login)
- Humans DON'T use design terminology (discovery, navigation, components)
- CRITICAL: Humans maintain spaces in compound terms ("no code", "node editor", "workflow builder")
- NEVER fuse meaningful words together - preserve natural language structure

EXAMPLES OF AGGRESSIVE HUMANIZATION:

USER QUERY: "home page for events app"
BEFORE: "event discovery" (12), "navigation" (5), "filters" (3), "categories" (6)
AFTER: "events home" (20), "eventbrite home" (15), "activities" (8), "meetup" (5) - human combinations + simple terms

USER QUERY: "fintech login design"  
BEFORE: "authentication flow" (8), "security patterns" (5), "fintech login" (15)
AFTER: "fintech login" (25), "revolut login" (10), "wise login" (8) - keep perfect match, add branded examples

USER QUERY: "shopping cart inspiration"
BEFORE: "cart management" (10), "checkout patterns" (8), "ecommerce flow" (6)
AFTER: "shopping cart" (15), "amazon checkout" (12), "cart" (8) - direct + branded context

RESPONSE FORMAT: Return ONLY a JSON object with this structure:
{
  "optimizedKeywords": [
    {
      "term": "keyword_name",
      "confidence": 0.60-1.00,
      "type": "app|feature|pattern|industry", 
      "thumbnailAllocation": 1-30,
      "isCompetitor": true|false,
      "parentApp": "brand_name_or_empty",
      "rationale": "why this keyword helps the user find what they want",
      "optimizationReason": "human-natural change made (or 'unchanged' if already perfect)"
    }
  ],
  "optimizationSummary": {
    "totalChanges": 8,
    "humanizedTerms": 5, 
    "adjustedAllocations": 6,
    "removedKeywords": 4,
    "overallRationale": "Aggressive humanization focused on genuine search behavior"
  }
}`,
      userPromptTemplate: `Optimize these AI-generated keywords for better human search experience:

USER QUERY: "{{userQuery}}"

ORIGINAL KEYWORDS: {{originalKeywords}}

Consider the user's specific request and optimize ONLY where beneficial. Preserve strategic value while making keywords more natural and relevant.`,
      version: '1.0.0',
      lastUpdated: '2025-10-30',
      tags: ['keywords', 'optimization', 'humanization', 'post-processing', 'context-aware']
    });
  }

  /**
   * Add or update a prompt
   */
  public setPrompt(prompt: PromptTemplate): void {
    this.prompts.set(prompt.id, prompt);
  }

  /**
   * Remove a prompt
   */
  public removePrompt(id: string): boolean {
    return this.prompts.delete(id);
  }

  /**
   * Get prompt statistics
   */
  public getStats(): { totalPrompts: number; byTag: Record<string, number>; byVersion: Record<string, number> } {
    const prompts = Array.from(this.prompts.values());
    const byTag: Record<string, number> = {};
    const byVersion: Record<string, number> = {};

    prompts.forEach(prompt => {
      prompt.tags.forEach(tag => {
        byTag[tag] = (byTag[tag] || 0) + 1;
      });
      byVersion[prompt.version] = (byVersion[prompt.version] || 0) + 1;
    });

    return {
      totalPrompts: prompts.length,
      byTag,
      byVersion
    };
  }
}

// Export singleton instance
export const promptManager = PromptManager.getInstance();
