import { FastifyInstance } from 'fastify';
import fastify from 'fastify';
import { LLMKeywordServiceV2 } from './src/scraping/ai/LLMKeywordServiceV2.js';

/**
 * Debug the exact LLM response to understand the parsing issue
 */
async function debugLLMResponse() {
    console.log(`[${new Date().toISOString()}] [DEBUG_LLM] TEST_START`);

    // Create a minimal Fastify app for testing
    const app: FastifyInstance = fastify({ logger: false });

    try {
        // Initialize the LLMKeywordServiceV2
        const llmService = new LLMKeywordServiceV2(app);

        // Test with the user's exact query
        const userQuery = "I am designing a offers app for visa card holders. Users will open this app and see offers on their visa cards and then redeem them. So offers will be simple coupon codes which can be redeemed on partner website etc.";

        console.log(`[${new Date().toISOString()}] [DEBUG_LLM] CALLING_LLM_DIRECTLY`);

        // Call the private method directly to see the raw response
        try {
            const rawResult = await (llmService as any).callAnthropicAPI(
                "You are a helpful assistant. Return only valid JSON with a 'test' field.",
                "Return JSON: {\"test\": \"hello world\"}"
            );

            console.log(`[${new Date().toISOString()}] [DEBUG_LLM] RAW_API_RESPONSE:`, {
                responseKeys: Object.keys(rawResult),
                hasContent: !!rawResult.content,
                contentLength: rawResult.content?.length || 0,
                contentType: rawResult.content?.[0]?.type,
                fullResponse: JSON.stringify(rawResult, null, 2)
            });

            if (rawResult.content && rawResult.content[0] && rawResult.content[0].text) {
                const responseText = rawResult.content[0].text;
                console.log(`[${new Date().toISOString()}] [DEBUG_LLM] RESPONSE_TEXT_ANALYSIS:`, {
                    responseLength: responseText.length,
                    startsWithBacktick: responseText.startsWith('`'),
                    containsCodeBlock: responseText.includes('```'),
                    fullText: responseText,
                    firstChars: responseText.substring(0, 20),
                    lastChars: responseText.substring(responseText.length - 20)
                });

                // Test our markdown parsing logic
                const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (codeBlockMatch) {
                    console.log(`[${new Date().toISOString()}] [DEBUG_LLM] MARKDOWN_PARSING:`, {
                        foundMatch: true,
                        extractedJson: codeBlockMatch[1].trim(),
                        matchGroups: codeBlockMatch.length
                    });

                    try {
                        const parsed = JSON.parse(codeBlockMatch[1].trim());
                        console.log(`[${new Date().toISOString()}] [DEBUG_LLM] MARKDOWN_JSON_PARSE_SUCCESS:`, parsed);
                    } catch (parseError) {
                        console.log(`[${new Date().toISOString()}] [DEBUG_LLM] MARKDOWN_JSON_PARSE_FAILED:`, {
                            error: parseError.message,
                            jsonText: codeBlockMatch[1].trim()
                        });
                    }
                } else {
                    console.log(`[${new Date().toISOString()}] [DEBUG_LLM] NO_MARKDOWN_DETECTED`);

                    // Try direct JSON parse
                    try {
                        const parsed = JSON.parse(responseText);
                        console.log(`[${new Date().toISOString()}] [DEBUG_LLM] DIRECT_JSON_PARSE_SUCCESS:`, parsed);
                    } catch (parseError) {
                        console.log(`[${new Date().toISOString()}] [DEBUG_LLM] DIRECT_JSON_PARSE_FAILED:`, {
                            error: parseError.message,
                            responseText: responseText.substring(0, 100) + '...'
                        });
                    }
                }
            }

        } catch (apiError) {
            console.error(`[${new Date().toISOString()}] [DEBUG_LLM] API_CALL_FAILED:`, {
                error: apiError.message,
                stack: apiError.stack
            });
        }

        console.log(`[${new Date().toISOString()}] [DEBUG_LLM] TEST_COMPLETE`);

        return { success: true };

    } catch (error) {
        console.error(`[${new Date().toISOString()}] [DEBUG_LLM] TEST_FAILED:`, {
            error: error.message,
            stack: error.stack
        });

        return { success: false, error: error.message };
    } finally {
        await app.close();
    }
}

// Run the debug test
debugLLMResponse()
    .then(result => {
        console.log(`[${new Date().toISOString()}] [DEBUG_LLM] FINAL_RESULT:`, result);
        process.exit(0);
    })
    .catch(error => {
        console.error(`❌ CRITICAL ERROR:`, error);
        process.exit(1);
    });
