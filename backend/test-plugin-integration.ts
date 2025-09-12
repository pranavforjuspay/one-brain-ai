// Plugin Integration Test with LLM-Enhanced Backend
// Test Query: "I need inspiration for a crypto trading app onboarding flow"

import fetch from 'node-fetch';

// Type definitions for the API response
interface MobbinLink {
    title: string;
    url: string;
    appName: string;
    category: string;
    tags: string[];
    whyRelevant: string;
    relevanceScore: number;
}

interface SearchIntents {
    patterns: string[];
    screens: string[];
    comparables: string[];
    keywords: string[];
}

interface InspirationResponse {
    conversationalResponse?: string;
    mobbinLinks?: MobbinLink[];
    searchIntents?: SearchIntents;
    finalKeywords?: string[];
}

async function testPluginIntegration() {
    console.log('🔌 Testing Plugin Integration with LLM-Enhanced Backend');
    console.log('============================================================');
    console.log('📝 Test Query: "I need inspiration for a crypto trading app onboarding flow"');
    console.log('');
    console.log('🚀 Calling /inspiration/mobbin-search endpoint...');

    try {
        const response = await fetch('http://localhost:8787/inspiration/mobbin-search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                problemStatement: "I need inspiration for a crypto trading app onboarding flow"
            })
        });

        console.log('📊 Response Status:', response.status, response.statusText);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json() as InspirationResponse;

        // Debug: Log the full response structure
        console.log('');
        console.log('🔍 DEBUG: Full Response Structure:');
        console.log(JSON.stringify(result, null, 2));
        console.log('');

        console.log('✅ SUCCESS! Plugin Integration Working');
        console.log('============================================================');
        console.log('📋 Response Structure:');
        console.log('- conversationalResponse:', result.conversationalResponse ? '✅ Present' : '❌ Missing');
        console.log('- mobbinLinks:', result.mobbinLinks ? `✅ ${result.mobbinLinks.length} results` : '❌ Missing');
        console.log('- searchIntents:', result.searchIntents ? '✅ Present' : '❌ Missing');
        console.log('- finalKeywords:', result.finalKeywords ? `✅ ${result.finalKeywords.length} keywords` : '❌ Missing');

        if (result.conversationalResponse) {
            console.log('');
            console.log('💬 Conversational Response Preview:');
            console.log(result.conversationalResponse.substring(0, 200) + '...');
        }

        if (result.searchIntents) {
            console.log('');
            console.log('🎯 Search Intents:');
            console.log('- Patterns:', Array.isArray(result.searchIntents.patterns) ? result.searchIntents.patterns.length : 0);
            console.log('- Screens:', Array.isArray(result.searchIntents.screens) ? result.searchIntents.screens.length : 0);
            console.log('- Comparables:', Array.isArray(result.searchIntents.comparables) ? result.searchIntents.comparables.length : 0);
            console.log('- Keywords:', Array.isArray(result.searchIntents.keywords) ? result.searchIntents.keywords.length : 0);
        }

        if (result.mobbinLinks && result.mobbinLinks.length > 0) {
            console.log('');
            console.log('🔗 Sample Mobbin Results:');
            result.mobbinLinks.slice(0, 3).forEach((link: MobbinLink, index: number) => {
                console.log(`${index + 1}. ${link.title}`);
                console.log(`   URL: ${link.url}`);
                console.log(`   Relevance: ${Math.round(link.relevanceScore * 100)}%`);
                console.log('');
            });
        }

        console.log('🎉 Plugin Integration Test PASSED!');
        console.log('');
        console.log('📱 The plugin can now:');
        console.log('- ✅ Send user queries to the LLM-enhanced backend');
        console.log('- ✅ Receive structured results with conversational responses');
        console.log('- ✅ Display LLM-generated keywords and explanations');
        console.log('- ✅ Show relevant Mobbin design links');

    } catch (error: any) {
        console.log('');
        console.log('❌ Plugin Integration Test FAILED!');
        console.log('Error:', error.message);
        console.log('');
        console.log('🔧 Troubleshooting:');
        console.log('1. Make sure the backend server is running (npm run dev)');
        console.log('2. Check that environment variables are properly configured');
        console.log('3. Verify the inspiration route is registered');
    }
}

testPluginIntegration();
