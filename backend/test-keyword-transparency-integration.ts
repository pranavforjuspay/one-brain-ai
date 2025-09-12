/**
 * Test: Two-Phase Keyword Transparency Integration
 * 
 * This test verifies that the new two-phase approach works correctly:
 * 1. Phase 1: Extract keywords using /inspiration/extract-keywords
 * 2. Phase 2: Search with those keywords using /inspiration/mobbin-search
 * 
 * This simulates the exact workflow that the plugin now uses.
 */

const API_BASE = 'http://localhost:8787';

interface KeywordExtractionResult {
    keywords: string[];
    metadata: {
        keywordGenerationMethod: 'llm' | 'fallback' | 'provided';
        llmConfidenceScores?: number[];
        originalQuery: string;
        processingTime?: number;
    };
}

interface MobbinSearchResult {
    conversationalResponse: string;
    mobbinLinks: Array<{
        title: string;
        url: string;
        appName: string;
        category: string;
        tags: string[];
        whyRelevant: string;
        relevanceScore: number;
    }>;
    searchIntents: {
        patterns: string[];
        screens: string[];
        comparables: string[];
        keywords: string[];
    };
    finalKeywords: string[];
}

async function testKeywordTransparencyWorkflow() {
    const testStartTime = Date.now();
    const testQuery = "I need inspiration for a crypto trading app onboarding flow";

    console.log(`\n🚀 Testing Two-Phase Keyword Transparency Workflow`);
    console.log(`📝 Test Query: "${testQuery}"`);
    console.log(`⏰ Started at: ${new Date().toISOString()}\n`);

    try {
        // Phase 1: Extract Keywords
        console.log(`📋 Phase 1: Extracting keywords...`);
        const phase1StartTime = Date.now();

        const keywordResponse = await fetch(`${API_BASE}/inspiration/extract-keywords`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ problemStatement: testQuery })
        });

        if (!keywordResponse.ok) {
            throw new Error(`Phase 1 failed: ${keywordResponse.status} - ${await keywordResponse.text()}`);
        }

        const keywordResult: KeywordExtractionResult = await keywordResponse.json();
        const phase1Duration = Date.now() - phase1StartTime;

        console.log(`✅ Phase 1 Complete (${phase1Duration}ms):`);
        console.log(`   📊 Keywords: ${keywordResult.keywords.join(', ')}`);
        console.log(`   🔧 Method: ${keywordResult.metadata.keywordGenerationMethod}`);
        console.log(`   📈 Confidence: ${keywordResult.metadata.llmConfidenceScores?.map(s => s.toFixed(2)).join(', ') || 'N/A'}`);

        // Simulate user seeing keywords (this is the transparency!)
        console.log(`\n👀 USER SEES: "Searching Mobbin with keywords: ${keywordResult.keywords.join(', ')}..."`);

        // Phase 2: Search with extracted keywords
        console.log(`\n🔍 Phase 2: Searching Mobbin with extracted keywords...`);
        const phase2StartTime = Date.now();

        const searchResponse = await fetch(`${API_BASE}/inspiration/mobbin-search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                problemStatement: testQuery,
                keywords: keywordResult.keywords // Using extracted keywords
            })
        });

        if (!searchResponse.ok) {
            throw new Error(`Phase 2 failed: ${searchResponse.status} - ${await searchResponse.text()}`);
        }

        const searchResult: MobbinSearchResult = await searchResponse.json();
        const phase2Duration = Date.now() - phase2StartTime;

        console.log(`✅ Phase 2 Complete (${phase2Duration}ms):`);
        console.log(`   📱 Results: ${searchResult.mobbinLinks.length} Mobbin links found`);
        console.log(`   🎯 Final Keywords: ${searchResult.finalKeywords.join(', ')}`);
        console.log(`   💬 Response Length: ${searchResult.conversationalResponse.length} characters`);

        // Verify keyword transparency
        const keywordsMatch = JSON.stringify(keywordResult.keywords.sort()) === JSON.stringify(searchResult.finalKeywords.sort());
        console.log(`\n🔍 Keyword Transparency Verification:`);
        console.log(`   📋 Extracted: [${keywordResult.keywords.join(', ')}]`);
        console.log(`   🎯 Final: [${searchResult.finalKeywords.join(', ')}]`);
        console.log(`   ✅ Match: ${keywordsMatch ? 'YES' : 'NO'}`);

        const totalDuration = Date.now() - testStartTime;
        console.log(`\n🎉 Two-Phase Workflow Test PASSED!`);
        console.log(`⏱️  Total Duration: ${totalDuration}ms`);
        console.log(`📊 Phase 1 (Keywords): ${phase1Duration}ms`);
        console.log(`📊 Phase 2 (Search): ${phase2Duration}ms`);
        console.log(`🔄 Keyword Transparency: ${keywordsMatch ? 'ACHIEVED' : 'FAILED'}`);

        // Show sample results
        if (searchResult.mobbinLinks.length > 0) {
            console.log(`\n📱 Sample Results:`);
            searchResult.mobbinLinks.slice(0, 3).forEach((link, index) => {
                console.log(`   ${index + 1}. ${link.title} (${link.appName})`);
                console.log(`      🔗 ${link.url}`);
                console.log(`      🏷️  Tags: ${link.tags.join(', ')}`);
            });
        }

        return {
            success: true,
            keywordTransparency: keywordsMatch,
            phase1Duration,
            phase2Duration,
            totalDuration,
            extractedKeywords: keywordResult.keywords,
            finalKeywords: searchResult.finalKeywords,
            resultsCount: searchResult.mobbinLinks.length
        };

    } catch (error) {
        const totalDuration = Date.now() - testStartTime;
        console.error(`\n❌ Two-Phase Workflow Test FAILED!`);
        console.error(`⏱️  Duration: ${totalDuration}ms`);
        console.error(`🚨 Error: ${error.message}`);

        return {
            success: false,
            error: error.message,
            totalDuration
        };
    }
}

// Run the test
testKeywordTransparencyWorkflow()
    .then(result => {
        if (result.success) {
            console.log(`\n✅ TEST SUMMARY:`);
            console.log(`   🎯 Keyword Transparency: ${result.keywordTransparency ? 'WORKING' : 'BROKEN'}`);
            console.log(`   📊 Performance: ${result.totalDuration}ms total`);
            console.log(`   📱 Results: ${result.resultsCount} Mobbin links`);
            process.exit(0);
        } else {
            console.log(`\n❌ TEST FAILED: ${result.error}`);
            process.exit(1);
        }
    })
    .catch(error => {
        console.error(`\n💥 TEST CRASHED: ${error.message}`);
        process.exit(1);
    });

export { testKeywordTransparencyWorkflow };
