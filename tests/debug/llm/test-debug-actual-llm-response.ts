import { FastifyInstance } from 'fastify';
import { LLMKeywordServiceV2 } from './src/scraping/ai/LLMKeywordServiceV2.js';

/**
 * Debug test to see the actual LLM response format
 */

// Mock Fastify app for testing
const mockApp = {
    log: {
        info: (obj: any, msg?: string) => console.log(`[INFO] ${msg || ''}`, obj),
        error: (obj: any, msg?: string) => console.error(`[ERROR] ${msg || ''}`, obj),
        warn: (obj: any, msg?: string) => console.warn(`[WARN] ${msg || ''}`, obj)
    }
} as FastifyInstance;

async function debugActualResponse() {
    console.log(`[${new Date().toISOString()}] [DEBUG_RESPONSE] STARTING_LLM_RESPONSE_DEBUG`);

    const testQuery = "I need to design a mobile banking app with biometric login";

    try {
        const llmService = new LLMKeywordServiceV2(mockApp);

        // Access the private method to get raw LLM response
        const systemPrompt = `SYSTEM: You are an advanced design search expert who generates COMPREHENSIVE, INTELLIGENT keyword strategies for Mobbin UI/UX inspiration discovery.

ENHANCED GOAL
Generate 2-10 strategic keywords with smart allocation to maximize design research value. Focus on PRIMARY intent while expanding coverage through intelligent competitor discovery and functional breadth.

STRICT OUTPUT FORMAT
Return ONLY this JSON (no prose, no extra keys):
{
  "keywords": [
    {
      "term": "<singleword>", 
      "confidence": <0.50-1.00>, 
      "type": "<app|feature|pattern|industry>",
      "thumbnailAllocation": <3-15>,
      "reasoning": "<brief explanation>",
      "isCompetitor": <true|false>,
      "parentApp": "<app_name_if_competitor>"
    },
    ...
  ]
}`;

        // Call the API directly to see raw response
        console.log(`[${new Date().toISOString()}] [DEBUG_RESPONSE] CALLING_ANTHROPIC_API_DIRECTLY`);

        // Use reflection to access private method
        const callAnthropicAPI = (llmService as any).callAnthropicAPI.bind(llmService);
        const rawResponse = await callAnthropicAPI(systemPrompt, testQuery);

        console.log(`[${new Date().toISOString()}] [DEBUG_RESPONSE] RAW_RESPONSE_STRUCTURE:`, {
            hasContent: !!rawResponse.content,
            contentLength: rawResponse.content?.length,
            contentType: rawResponse.content?.[0]?.type
        });

        if (rawResponse.content && rawResponse.content[0] && rawResponse.content[0].text) {
            const responseText = rawResponse.content[0].text;
            console.log(`[${new Date().toISOString()}] [DEBUG_RESPONSE] ACTUAL_RESPONSE_TEXT:`);
            console.log('='.repeat(80));
            console.log(responseText);
            console.log('='.repeat(80));

            // Test our current parsing logic
            console.log(`[${new Date().toISOString()}] [DEBUG_RESPONSE] TESTING_CURRENT_PARSING_LOGIC:`);

            let jsonText = responseText;
            const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch) {
                jsonText = codeBlockMatch[1].trim();
                console.log(`[${new Date().toISOString()}] [DEBUG_RESPONSE] EXTRACTED_FROM_CODE_BLOCK:`);
                console.log('-'.repeat(40));
                console.log(jsonText);
                console.log('-'.repeat(40));
            } else {
                console.log(`[${new Date().toISOString()}] [DEBUG_RESPONSE] NO_CODE_BLOCK_FOUND`);
            }

            // Try to parse the JSON
            try {
                const parsed = JSON.parse(jsonText);
                console.log(`[${new Date().toISOString()}] [DEBUG_RESPONSE] ✅ JSON_PARSING_SUCCESS:`, {
                    hasKeywords: !!parsed.keywords,
                    keywordCount: parsed.keywords?.length
                });
            } catch (parseError) {
                console.error(`[${new Date().toISOString()}] [DEBUG_RESPONSE] ❌ JSON_PARSING_FAILED:`, {
                    error: parseError.message,
                    jsonTextPreview: jsonText.substring(0, 100) + '...'
                });

                // Try alternative parsing strategies
                console.log(`[${new Date().toISOString()}] [DEBUG_RESPONSE] TRYING_ALTERNATIVE_PARSING_STRATEGIES:`);

                // Strategy 1: Remove all markdown formatting
                const cleanText = responseText.replace(/```[^`]*```/g, '').replace(/```/g, '').trim();
                console.log(`[${new Date().toISOString()}] [DEBUG_RESPONSE] STRATEGY_1_CLEAN_TEXT:`);
                console.log(cleanText.substring(0, 200) + '...');

                // Strategy 2: Find JSON object pattern
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    console.log(`[${new Date().toISOString()}] [DEBUG_RESPONSE] STRATEGY_2_JSON_MATCH:`);
                    console.log(jsonMatch[0].substring(0, 200) + '...');
                }
            }
        }

    } catch (error) {
        console.error(`[${new Date().toISOString()}] [DEBUG_RESPONSE] DEBUG_FAILED:`, error.message);
    }
}

// Run the debug test
debugActualResponse().catch(error => {
    console.error(`[${new Date().toISOString()}] [DEBUG_RESPONSE] DEBUG_CRASHED:`, error);
    process.exit(1);
});
