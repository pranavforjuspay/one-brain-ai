import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const MODEL = process.env.ONE_BRAIN_MODEL || 'claude-sonnet-4';
const LOCATION = process.env.VERTEX_LOCATION || 'us-east5';
const PROJECT = process.env.VERTEX_PROJECT || 'dev-ai-epsilon';

/**
 * Test basic LLM connectivity to Vertex AI
 */
async function testLLMConnectivity() {
    console.log(`[${new Date().toISOString()}] [LLM_CONNECTIVITY_TEST] TEST_START`);

    console.log(`[${new Date().toISOString()}] [LLM_CONNECTIVITY_TEST] CONFIGURATION:`, {
        model: MODEL,
        location: LOCATION,
        project: PROJECT,
        endpoint: `${LOCATION}-aiplatform.googleapis.com`
    });

    try {
        // Step 1: Test Google Cloud authentication
        console.log(`[${new Date().toISOString()}] [LLM_CONNECTIVITY_TEST] STEP_1: Testing GCP authentication`);

        let accessToken: string;
        try {
            const { stdout } = await execAsync('gcloud auth print-access-token');
            accessToken = stdout.trim();
            console.log(`[${new Date().toISOString()}] [LLM_CONNECTIVITY_TEST] GCP_AUTH_SUCCESS:`, {
                tokenLength: accessToken.length,
                tokenPrefix: accessToken.substring(0, 20) + '...'
            });
        } catch (authError) {
            console.error(`[${new Date().toISOString()}] [LLM_CONNECTIVITY_TEST] GCP_AUTH_FAILED:`, {
                error: authError.message,
                suggestion: 'Run: gcloud auth login'
            });
            return { success: false, error: 'GCP authentication failed', step: 'auth' };
        }

        // Step 2: Test basic Vertex AI API call
        console.log(`[${new Date().toISOString()}] [LLM_CONNECTIVITY_TEST] STEP_2: Testing Vertex AI API call`);

        const endpoint = `${LOCATION}-aiplatform.googleapis.com`;
        const url = `https://${endpoint}/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/anthropic/models/${MODEL}:rawPredict`;

        const requestBody = {
            anthropic_version: "vertex-2023-10-16",
            stream: false,
            max_tokens: 100,
            temperature: 0.1,
            top_p: 1.0,
            system: "You are a helpful assistant. Respond with valid JSON only.",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Say hello in JSON format with a 'message' field."
                        }
                    ]
                }
            ]
        };

        console.log(`[${new Date().toISOString()}] [LLM_CONNECTIVITY_TEST] API_REQUEST:`, {
            url,
            model: MODEL,
            requestBodySize: JSON.stringify(requestBody).length,
            maxTokens: requestBody.max_tokens
        });

        const startTime = Date.now();
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify(requestBody)
        });

        const duration = Date.now() - startTime;

        console.log(`[${new Date().toISOString()}] [LLM_CONNECTIVITY_TEST] API_RESPONSE:`, {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            duration: `${duration}ms`,
            contentType: response.headers.get('content-type')
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[${new Date().toISOString()}] [LLM_CONNECTIVITY_TEST] API_ERROR:`, {
                status: response.status,
                statusText: response.statusText,
                errorBody: errorText
            });
            return {
                success: false,
                error: `Vertex AI API error: ${response.status} - ${errorText}`,
                step: 'api_call'
            };
        }

        // Step 3: Parse and analyze the response
        console.log(`[${new Date().toISOString()}] [LLM_CONNECTIVITY_TEST] STEP_3: Parsing response`);

        const result = await response.json();

        console.log(`[${new Date().toISOString()}] [LLM_CONNECTIVITY_TEST] RAW_RESPONSE:`, {
            responseKeys: Object.keys(result),
            hasContent: !!result.content,
            contentLength: result.content?.length || 0,
            hasUsage: !!result.usage,
            inputTokens: result.usage?.input_tokens,
            outputTokens: result.usage?.output_tokens
        });

        // Extract the actual text content
        if (result.content && result.content.length > 0 && result.content[0].type === 'text') {
            const responseText = result.content[0].text.trim();

            console.log(`[${new Date().toISOString()}] [LLM_CONNECTIVITY_TEST] RESPONSE_TEXT:`, {
                responseLength: responseText.length,
                responsePreview: responseText.substring(0, 200),
                fullResponse: responseText
            });

            // Try to parse as JSON to see if it's valid
            try {
                const parsedResponse = JSON.parse(responseText);
                console.log(`[${new Date().toISOString()}] [LLM_CONNECTIVITY_TEST] JSON_PARSE_SUCCESS:`, {
                    parsedKeys: Object.keys(parsedResponse),
                    message: parsedResponse.message
                });
            } catch (jsonError) {
                console.log(`[${new Date().toISOString()}] [LLM_CONNECTIVITY_TEST] JSON_PARSE_FAILED:`, {
                    error: jsonError.message,
                    responseText: responseText.substring(0, 100) + '...'
                });

                // Check if it's markdown-wrapped JSON
                const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (codeBlockMatch) {
                    console.log(`[${new Date().toISOString()}] [LLM_CONNECTIVITY_TEST] MARKDOWN_JSON_DETECTED:`, {
                        extractedJson: codeBlockMatch[1].trim()
                    });

                    try {
                        const parsedMarkdownJson = JSON.parse(codeBlockMatch[1].trim());
                        console.log(`[${new Date().toISOString()}] [LLM_CONNECTIVITY_TEST] MARKDOWN_JSON_PARSE_SUCCESS:`, {
                            parsedKeys: Object.keys(parsedMarkdownJson),
                            message: parsedMarkdownJson.message
                        });
                    } catch (markdownJsonError) {
                        console.log(`[${new Date().toISOString()}] [LLM_CONNECTIVITY_TEST] MARKDOWN_JSON_PARSE_FAILED:`, {
                            error: markdownJsonError.message
                        });
                    }
                }
            }

            console.log(`[${new Date().toISOString()}] [LLM_CONNECTIVITY_TEST] SUCCESS: LLM is working!`);
            return {
                success: true,
                responseText,
                duration,
                tokenUsage: result.usage,
                model: MODEL,
                project: PROJECT,
                location: LOCATION
            };

        } else {
            console.error(`[${new Date().toISOString()}] [LLM_CONNECTIVITY_TEST] INVALID_RESPONSE_FORMAT:`, {
                result
            });
            return {
                success: false,
                error: 'Invalid response format from Claude',
                step: 'response_parsing'
            };
        }

    } catch (error) {
        console.error(`[${new Date().toISOString()}] [LLM_CONNECTIVITY_TEST] UNEXPECTED_ERROR:`, {
            error: error.message,
            stack: error.stack
        });
        return {
            success: false,
            error: error.message,
            step: 'unexpected_error'
        };
    }
}

// Run the test
testLLMConnectivity()
    .then(result => {
        console.log(`[${new Date().toISOString()}] [LLM_CONNECTIVITY_TEST] FINAL_RESULT:`, result);

        if (result.success) {
            console.log(`✅ SUCCESS: LLM connectivity is working!`);
            console.log(`   - Model: ${result.model}`);
            console.log(`   - Project: ${result.project}`);
            console.log(`   - Location: ${result.location}`);
            console.log(`   - Response time: ${result.duration}ms`);
            console.log(`   - Token usage: ${result.tokenUsage?.input_tokens} input, ${result.tokenUsage?.output_tokens} output`);
            console.log(`   - Response preview: ${result.responseText?.substring(0, 100)}...`);
        } else {
            console.log(`❌ FAILED: LLM connectivity issue`);
            console.log(`   - Step: ${result.step}`);
            console.log(`   - Error: ${result.error}`);

            if (result.step === 'auth') {
                console.log(`   - Solution: Run 'gcloud auth login' and try again`);
            } else if (result.step === 'api_call') {
                console.log(`   - Solution: Check GCP project permissions and Vertex AI API access`);
            }
        }

        process.exit(0);
    })
    .catch(error => {
        console.error(`❌ CRITICAL ERROR:`, error);
        process.exit(1);
    });
