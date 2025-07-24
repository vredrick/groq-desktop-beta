const Groq = require('groq-sdk');
const OpenAI = require('openai');
const { pruneMessageHistory } = require('./messageUtils'); // Import pruning logic
const { OPENROUTER_MODELS } = require('../shared/openRouterModels.js');

/**
 * Determines the optimal tool_choice parameter based on model and context
 */
function getOptimalToolChoice(model, messages) {
    const modelLower = model.toLowerCase();
    const lastMessage = messages[messages.length - 1];
    const lastUserMessage = lastMessage?.role === 'user' ? lastMessage.content : '';
    
    // Keywords that strongly indicate tool usage
    const toolKeywords = ['check', 'find', 'search', 'get', 'list', 'show', 'tell me', 'what is', 'calculate', 'analyze'];
    const hasToolIntent = toolKeywords.some(keyword => 
        typeof lastUserMessage === 'string' && lastUserMessage.toLowerCase().includes(keyword)
    );
    
    // Models that work better with explicit tool choice
    if (modelLower.includes('kimi') || modelLower.includes('moonshot')) {
        // For these models, use 'required' when there's clear tool intent
        return hasToolIntent ? 'required' : 'auto';
    }
    
    // Most models work well with 'auto'
    return 'auto';
}

/**
 * Simplifies tool schemas for models that struggle with complex schemas
 */
function simplifyToolsForModel(tools, model) {
    const modelLower = model.toLowerCase();
    
    // Models that need simplified schemas
    if (modelLower.includes('kimi') || modelLower.includes('moonshot')) {
        return tools.map(tool => ({
            type: "function",
            function: {
                name: tool.function.name,
                description: tool.function.description,
                // Simplify parameters to just required fields
                parameters: {
                    type: "object",
                    properties: tool.function.parameters.properties || {},
                    required: tool.function.parameters.required || []
                }
            }
        }));
    }
    
    return tools;
}

/**
 * Gets optimal temperature for tool usage based on model
 */
function getOptimalTemperature(model, hasTools, userTemp) {
    // If user has set a specific temperature, respect it
    if (userTemp !== undefined && userTemp !== null) {
        return userTemp;
    }
    
    const modelLower = model.toLowerCase();
    
    // Models that perform better with lower temperature for tools
    if (hasTools && (modelLower.includes('kimi') || modelLower.includes('moonshot'))) {
        return 0.3; // Lower temperature for more consistent tool usage
    }
    
    // Default temperature
    return 0.7;
}

/**
 * Extracts tool calls from text output when models output them as plain text
 * This is a fallback for models with poor native tool support
 */
function extractToolCallsFromText(text, availableTools) {
    const toolCalls = [];
    
    // Common patterns models use to indicate tool calls
    const patterns = [
        // Pattern 1: function_name(arg1="value1", arg2="value2")
        /(\w+)\s*\(\s*([^)]+)\s*\)/g,
        // Pattern 2: JSON-like: {"function": "name", "arguments": {...}}
        /\{"function":\s*"(\w+)",\s*"arguments":\s*(\{[^}]+\})\}/g,
        // Pattern 3: Markdown code blocks with function calls
        /```(?:json|function|tool)?\s*\n*(\w+)\s*\(([^)]+)\)\s*\n*```/g
    ];
    
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const funcName = match[1];
            const argsStr = match[2];
            
            // Check if this is a known tool
            const tool = availableTools.find(t => t.function.name === funcName);
            if (tool) {
                try {
                    // Try to parse arguments
                    let args = {};
                    
                    // If it looks like JSON, parse it
                    if (argsStr.trim().startsWith('{')) {
                        args = JSON.parse(argsStr);
                    } else {
                        // Parse key=value pairs
                        const argPairs = argsStr.match(/(\w+)\s*=\s*"([^"]+)"/g) || [];
                        argPairs.forEach(pair => {
                            const [key, value] = pair.split('=').map(s => s.trim().replace(/"/g, ''));
                            args[key] = value;
                        });
                    }
                    
                    toolCalls.push({
                        id: `tool_${Date.now()}_${toolCalls.length}`,
                        type: 'function',
                        function: {
                            name: funcName,
                            arguments: JSON.stringify(args)
                        }
                    });
                    
                    console.log(`[ChatHandler] Extracted tool call from text: ${funcName}`, args);
                } catch (e) {
                    console.warn(`[ChatHandler] Failed to parse tool arguments for ${funcName}:`, e);
                }
            }
        }
    }
    
    return toolCalls;
}

/**
 * Handles the 'chat-stream' IPC event for streaming chat completions.
 *
 * @param {Electron.IpcMainEvent} event - The IPC event object.
 * @param {Array<object>} messages - The array of message objects for the chat history.
 * @param {string} model - The specific model requested for this completion.
 * @param {object} settings - The current application settings.
 * @param {object} modelContextSizes - Object containing context window sizes for models.
 * @param {Array<object>} discoveredTools - List of available MCP tools.
 */
async function handleChatStream(event, messages, model, settings, modelContextSizes, discoveredTools) {
    console.log(`Handling chat-stream request. Model: ${model || 'using settings'}, Messages: ${messages?.length}`);

    try {
        // Validate API Key based on provider
        if (settings.provider === 'openrouter') {
            if (!settings.OPENROUTER_API_KEY || settings.OPENROUTER_API_KEY === "<replace me>") {
                event.sender.send('chat-stream-error', { error: "OpenRouter API key not configured. Please add your OpenRouter API key in settings." });
                return;
            }
        } else {
            if (!settings.GROQ_API_KEY || settings.GROQ_API_KEY === "<replace me>") {
                event.sender.send('chat-stream-error', { error: "API key not configured. Please add your API key in settings." });
                return;
            }
        }

        // Determine model to use: prioritise argument, then settings, then fallback
        const modelToUse = model || settings.model || "llama-3.3-70b-versatile";
        
        // Get model info based on provider
        let modelInfo;
        if (settings.provider === 'openrouter') {
            // Check OpenRouter models first, then custom models
            modelInfo = OPENROUTER_MODELS[modelToUse] || OPENROUTER_MODELS['default'];
            
            // Check if it's a custom model
            if (settings.openRouterCustomModels && settings.openRouterCustomModels.includes(modelToUse)) {
                modelInfo = OPENROUTER_MODELS['default'];
            }
        } else {
            modelInfo = modelContextSizes[modelToUse] || modelContextSizes['default'] || { context: 8192, vision_supported: false };
        }
        console.log(`Using model: ${modelToUse} (Context: ${modelInfo.context}, Vision: ${modelInfo.vision_supported})`);

        // Check for vision support if images are present
        const hasImages = messages.some(msg =>
            msg.role === 'user' &&
            Array.isArray(msg.content) &&
            msg.content.some(part => part.type === 'image_url')
        );

        if (hasImages && !modelInfo.vision_supported) {
            console.warn(`Attempting to use images with non-vision model: ${modelToUse}`);
            event.sender.send('chat-stream-error', { error: `The selected model (${modelToUse}) does not support image inputs. Please select a vision-capable model.` });
            return;
        }

        // Initialize SDK based on provider
        let client;
        
        if (settings.provider === 'openrouter') {
            // Use OpenAI SDK for OpenRouter
            client = new OpenAI({ 
                apiKey: settings.OPENROUTER_API_KEY,
                baseURL: 'https://openrouter.ai/api/v1',
                defaultHeaders: {
                    'HTTP-Referer': 'https://groq-desktop.app',
                    'X-Title': 'Groq Desktop'
                }
            });
        } else if (settings.provider === 'custom' && settings.customCompletionUrl && settings.customCompletionUrl.trim()) {
            let customUrl = settings.customCompletionUrl.trim();
            
            // Clean up common trailing paths that users might accidentally include
            // since the SDK will automatically append /openai/v1/chat/completions
            customUrl = customUrl.replace(/\/openai\/v1\/chat\/completions\/?$/, '');
            customUrl = customUrl.replace(/\/openai\/v1\/?$/, '');
            customUrl = customUrl.replace(/\/chat\/completions\/?$/, '');
            customUrl = customUrl.replace(/\/$/, ''); // Remove trailing slash
            
            // Force IPv4 for localhost to avoid IPv6 connection issues
            customUrl = customUrl.replace(/^http:\/\/localhost:/i, 'http://127.0.0.1:');
            customUrl = customUrl.replace(/^https:\/\/localhost:/i, 'https://127.0.0.1:');
            
            // Use Groq SDK for custom URLs
            client = new Groq({
                apiKey: settings.GROQ_API_KEY,
                baseURL: customUrl
            });
            console.log(`Using custom completion URL: ${customUrl}`);
        } else {
            // Default Groq provider
            client = new Groq({ apiKey: settings.GROQ_API_KEY });
        }

        // Prepare tools for the API call
        console.log(`[ChatHandler] Raw discoveredTools:`, discoveredTools ? discoveredTools.length : 'undefined', discoveredTools);
        let tools = (discoveredTools || []).map(tool => ({
            type: "function",
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.input_schema || {} // Ensure parameters is an object
            }
        }));
        
        // Apply model-specific tool simplifications
        tools = simplifyToolsForModel(tools, modelToUse);
        
        console.log(`[ChatHandler] Prepared ${tools.length} tools for the API call. Tool names:`, tools.map(t => t.function.name));

        // Clean and prepare messages for the API
        // 1. Remove internal fields like 'reasoning', 'isStreaming'
        // 2. Ensure correct content format (user: array, assistant: string, tool: string)
        const cleanedMessages = messages.map(msg => {
            // Create a clean copy, then delete unwanted properties
            const cleanMsg = { ...msg };
            delete cleanMsg.reasoning;
            delete cleanMsg.isStreaming;
            let finalMsg = { ...cleanMsg };

            // Ensure user message content is an array of parts
            if (finalMsg.role === 'user') {
                if (typeof finalMsg.content === 'string') {
                    finalMsg.content = [{ type: 'text', text: finalMsg.content }];
                } else if (!Array.isArray(finalMsg.content)) {
                    // Handle unexpected format - log and default to empty text
                    console.warn('Unexpected user message content format, defaulting:', finalMsg.content);
                    finalMsg.content = [{ type: 'text', text: '' }];
                }
                // Ensure all parts have a type
                finalMsg.content = finalMsg.content.map(part => ({ type: part.type || 'text', ...part }));
            }

            // Ensure assistant message content is a string
            if (finalMsg.role === 'assistant' && typeof finalMsg.content !== 'string') {
                 if (Array.isArray(finalMsg.content)) {
                     // Extract text from parts if it's an array
                     const textContent = finalMsg.content.filter(p => p.type === 'text').map(p => p.text).join('');
                     finalMsg.content = textContent;
                 } else {
                     // Attempt to stringify other non-string formats, log warning
                     console.warn('Unexpected assistant message content format, attempting stringify:', finalMsg.content);
                     try {
                         finalMsg.content = JSON.stringify(finalMsg.content);
                     } catch { finalMsg.content = '[Non-string content]'; }
                 }
            }

            // Ensure tool message content is stringified if not already
            if (finalMsg.role === 'tool') {
                console.log(`[ChatHandler] Processing tool message:`, {
                    tool_call_id: finalMsg.tool_call_id,
                    contentType: typeof finalMsg.content,
                    contentLength: finalMsg.content?.length,
                    contentPreview: typeof finalMsg.content === 'string' ? finalMsg.content.substring(0, 100) : finalMsg.content
                });
                
                if (typeof finalMsg.content !== 'string') {
                    try {
                        finalMsg.content = JSON.stringify(finalMsg.content);
                    } catch (e) {
                        console.warn("Could not stringify tool content:", finalMsg.content, "Error:", e);
                        finalMsg.content = "[Error stringifying tool content]";
                    }
                }
                
                // For models that struggle with tool results, enhance the content
                const modelLower = modelToUse.toLowerCase();
                if (modelLower.includes('kimi') || modelLower.includes('moonshot')) {
                    // Find the corresponding tool call to get the function name
                    const toolCallId = finalMsg.tool_call_id;
                    const previousMessages = cleanedMessages.slice(0, cleanedMessages.indexOf(msg));
                    const assistantMsgWithToolCall = previousMessages.reverse().find(m => 
                        m.role === 'assistant' && 
                        m.tool_calls?.some(tc => tc.id === toolCallId)
                    );
                    
                    if (assistantMsgWithToolCall) {
                        const toolCall = assistantMsgWithToolCall.tool_calls.find(tc => tc.id === toolCallId);
                        if (toolCall) {
                            // Prepend context to help the model understand this is a tool result
                            const toolName = toolCall.function.name;
                            finalMsg.content = `[Tool: ${toolName} returned the following result]\n${finalMsg.content}`;
                            console.log(`[ChatHandler] Enhanced tool result context for ${modelToUse}`);
                        }
                    }
                }
            }
            return finalMsg;
        });

        // Prune message history (includes image filtering logic)
        let prunedMessages = pruneMessageHistory(cleanedMessages, modelToUse, modelContextSizes);
        console.log(`History pruned: ${cleanedMessages.length} -> ${prunedMessages.length} messages.`);
        
        // For models that need extra tool hints, enhance the last user message
        if (tools.length > 0 && prunedMessages.length > 0) {
            const modelLower = modelToUse.toLowerCase();
            const lastMsgIndex = prunedMessages.length - 1;
            const lastMsg = prunedMessages[lastMsgIndex];
            
            if (lastMsg.role === 'user' && (modelLower.includes('kimi') || modelLower.includes('moonshot'))) {
                // Check if the message might benefit from tool hints
                const userContent = typeof lastMsg.content === 'string' ? lastMsg.content : 
                                   Array.isArray(lastMsg.content) ? lastMsg.content.find(p => p.type === 'text')?.text || '' : '';
                
                const toolKeywords = ['check', 'find', 'search', 'get', 'list', 'show', 'analyze', 'calculate'];
                const mightNeedTools = toolKeywords.some(kw => userContent.toLowerCase().includes(kw));
                
                if (mightNeedTools) {
                    // Find relevant tools based on the request
                    const relevantTools = tools.filter(tool => {
                        const toolName = tool.function.name.toLowerCase();
                        const toolDesc = tool.function.description.toLowerCase();
                        return toolKeywords.some(kw => 
                            userContent.toLowerCase().includes(kw) && 
                            (toolName.includes(kw) || toolDesc.includes(kw))
                        );
                    });
                    
                    if (relevantTools.length > 0) {
                        // Add a subtle hint about available tools
                        const toolHint = `\\n\\n[Note: You have access to tools including: ${relevantTools.map(t => t.function.name).join(', ')}. Use them if relevant.]`;
                        
                        if (typeof lastMsg.content === 'string') {
                            prunedMessages[lastMsgIndex] = { ...lastMsg, content: lastMsg.content + toolHint };
                        } else if (Array.isArray(lastMsg.content)) {
                            const textPartIndex = lastMsg.content.findIndex(p => p.type === 'text');
                            if (textPartIndex >= 0) {
                                const newContent = [...lastMsg.content];
                                newContent[textPartIndex] = {
                                    ...newContent[textPartIndex],
                                    text: newContent[textPartIndex].text + toolHint
                                };
                                prunedMessages[lastMsgIndex] = { ...lastMsg, content: newContent };
                            }
                        }
                        console.log(`Added tool hints for ${modelToUse}: ${relevantTools.map(t => t.function.name).join(', ')}`);
                    }
                }
            }
        }

        // Construct the system prompt with model-specific optimizations
        let systemPrompt = "";
        
        // Model-specific system prompts for better tool usage
        const modelLower = modelToUse.toLowerCase();
        if (modelLower.includes('kimi') || modelLower.includes('moonshot')) {
            // Moonshot/Kimi models need explicit tool instructions
            systemPrompt = `You are a helpful assistant with access to tools/functions. When a user asks you to perform an action that matches available tools, you MUST use the appropriate tool by calling it in the proper format.

Available tools will be provided in the tools parameter. Always check if a user request matches any available tool and use it when appropriate.

IMPORTANT: 
1. When you need to use a tool, respond with the proper function call format, not just a description of what you would do.
2. After calling a tool, you will receive the result in a message marked with [Tool: toolname returned the following result].
3. Always use the tool results to provide a complete answer to the user. Don't ask for confirmation after receiving tool results - use them to answer the user's question directly.`;
        } else if (modelLower.includes('gemini')) {
            // Gemini models prefer concise tool instructions
            systemPrompt = "You are a helpful assistant. Use the provided tools when they match the user's request. Respond with proper function calls when using tools.";
        } else if (modelLower.includes('claude')) {
            // Claude models work well with standard instructions
            systemPrompt = "You are a helpful assistant capable of using tools. Use tools when they are relevant to the user's request. Format responses using Markdown.";
        } else {
            // Default prompt
            systemPrompt = "You are a helpful assistant capable of using tools. Use tools only when necessary and relevant to the user's request. Format responses using Markdown.";
        }
        
        if (settings.customSystemPrompt && settings.customSystemPrompt.trim()) {
            systemPrompt += `\n\n${settings.customSystemPrompt.trim()}`;
            console.log("Appending custom system prompt.");
        }

        // Prepare API parameters with model-specific optimizations
        const chatCompletionParams = {
            messages: [
                { role: "system", content: systemPrompt }, // Use the constructed system prompt
                ...prunedMessages // Use the pruned history
            ],
            model: modelToUse,
            temperature: getOptimalTemperature(modelToUse, tools.length > 0, settings.temperature),
            top_p: settings.top_p ?? 0.95,
            ...(tools.length > 0 && { 
                tools: tools, 
                tool_choice: getOptimalToolChoice(modelToUse, messages)
            }),
            stream: true
        };
        
        // Debug: Log full conversation context including tool messages
        console.log(`[ChatHandler] Full conversation context:`, chatCompletionParams.messages.map(m => ({
            role: m.role,
            content: m.role === 'tool' ? `[Tool result for ${m.tool_call_id}]: ${m.content?.substring(0, 100)}...` : 
                    typeof m.content === 'string' ? m.content.substring(0, 100) + '...' : '[Complex content]',
            tool_calls: m.tool_calls?.map(tc => ({ name: tc.function.name, id: tc.id }))
        })));
        
        // Debug logging for tools
        console.log(`[ChatHandler] Tools in API params:`, {
            toolsIncluded: tools.length > 0,
            toolCount: tools.length,
            provider: settings.provider,
            model: modelToUse,
            toolsInParams: chatCompletionParams.tools ? chatCompletionParams.tools.length : 0
        });

        // Add reasoning format if supported (adjust keywords as needed)
        // if (modelToUse.includes("qwq") || modelToUse.includes("r1")) {
        //     chatCompletionParams.reasoning_format = "parsed";
        // }

        // --- Streaming and Retry Logic --- (Moved inside try block)
        let retryCount = 0;
        const MAX_TOOL_USE_RETRIES = 3; // Slightly reduced retries

        while (retryCount <= MAX_TOOL_USE_RETRIES) {
            try {
                let accumulatedContent = "";
                let accumulatedToolCalls = [];
                let accumulatedReasoning = null; // Store reasoning if applicable
                let isFirstChunk = true;
                let streamId = null;

                console.log(`Attempting ${settings.provider} completion (attempt ${retryCount + 1}/${MAX_TOOL_USE_RETRIES + 1})...`);
                console.log(`[ChatHandler] Sending params to API:`, JSON.stringify({
                    model: chatCompletionParams.model,
                    hasTools: !!chatCompletionParams.tools,
                    toolCount: chatCompletionParams.tools?.length,
                    toolChoice: chatCompletionParams.tool_choice,
                    messageCount: chatCompletionParams.messages.length
                }, null, 2));
                const stream = await client.chat.completions.create(chatCompletionParams);

                for await (const chunk of stream) {
                    if (!chunk.choices || !chunk.choices.length || !chunk.choices[0]) continue;

                    const choice = chunk.choices[0];
                    const delta = choice.delta;

                    if (isFirstChunk) {
                        streamId = chunk.id; // Capture stream ID
                        event.sender.send('chat-stream-start', {
                            id: streamId,
                            role: delta?.role || "assistant"
                        });
                        isFirstChunk = false;
                    }

                    // Accumulate content
                    if (delta?.content) {
                        accumulatedContent += delta.content;
                        event.sender.send('chat-stream-content', { content: delta.content });
                    }

                     // Accumulate reasoning (example)
                    // if (delta?.reasoning) { ... }

                    // Accumulate and process tool calls
                    if (delta?.tool_calls && delta.tool_calls.length > 0) {
                        for (const toolCallDelta of delta.tool_calls) {
                            let existingCall = accumulatedToolCalls.find(tc => tc.index === toolCallDelta.index);

                            if (!existingCall) {
                                // Start of a new tool call
                                accumulatedToolCalls.push({
                                    index: toolCallDelta.index,
                                    id: toolCallDelta.id || `tool_${Date.now()}_${toolCallDelta.index}`, // Generate ID if missing
                                    type: toolCallDelta.type || 'function',
                                    function: {
                                        name: toolCallDelta.function?.name || "",
                                        arguments: toolCallDelta.function?.arguments || ""
                                    }
                                });
                            } else {
                                // Append to existing tool call arguments
                                if (toolCallDelta.function?.arguments) {
                                    existingCall.function.arguments += toolCallDelta.function.arguments;
                                }
                                // Update name if provided incrementally (less common)
                                if (toolCallDelta.function?.name) {
                                    existingCall.function.name = toolCallDelta.function.name;
                                }
                                // Update id if provided later
                                if (toolCallDelta.id) {
                                    existingCall.id = toolCallDelta.id;
                                }
                            }
                        }
                        // Send update with potentially partial tool calls
                        event.sender.send('chat-stream-tool-calls', { tool_calls: accumulatedToolCalls });
                    }

                    // Handle stream completion
                    if (choice.finish_reason) {
                        console.log(`Stream completed. Reason: ${choice.finish_reason}, ID: ${streamId}`);
                        
                        // Check if the model output tool calls as text (fallback for models with poor tool support)
                        if (accumulatedToolCalls.length === 0 && accumulatedContent && tools.length > 0) {
                            const extractedToolCalls = extractToolCallsFromText(accumulatedContent, tools);
                            if (extractedToolCalls.length > 0) {
                                console.log(`[ChatHandler] Extracted ${extractedToolCalls.length} tool calls from text output`);
                                accumulatedToolCalls = extractedToolCalls;
                                // Clear the content since it was actually tool calls
                                accumulatedContent = "";
                            }
                        }
                        
                        event.sender.send('chat-stream-complete', {
                            content: accumulatedContent,
                            role: "assistant",
                            tool_calls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
                            reasoning: accumulatedReasoning, // Send accumulated reasoning
                            finish_reason: choice.finish_reason
                        });
                        return; // Exit function successfully after completion
                    }
                }
                // If loop finishes without finish_reason, check if we got any content
                if (accumulatedContent || accumulatedToolCalls.length > 0) {
                    console.warn("Stream ended without finish_reason, but content was received. Treating as successful completion.");
                    
                    // Check for text-based tool calls as fallback
                    if (accumulatedToolCalls.length === 0 && accumulatedContent && tools.length > 0) {
                        const extractedToolCalls = extractToolCallsFromText(accumulatedContent, tools);
                        if (extractedToolCalls.length > 0) {
                            console.log(`[ChatHandler] Extracted ${extractedToolCalls.length} tool calls from incomplete stream text`);
                            accumulatedToolCalls = extractedToolCalls;
                            accumulatedContent = "";
                        }
                    }
                    
                    event.sender.send('chat-stream-complete', {
                        content: accumulatedContent,
                        role: "assistant",
                        tool_calls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
                        reasoning: accumulatedReasoning,
                        finish_reason: 'stop' // Default to 'stop' for incomplete streams
                    });
                    return;
                } else {
                    console.warn("Stream ended unexpectedly without any content.");
                    event.sender.send('chat-stream-error', { error: "Stream ended without receiving any content." });
                    return;
                }

            } catch (error) {
                // Check for tool_use_failed specifically
                const isToolUseFailedError =
                    error?.error?.code === 'tool_use_failed' ||
                    (error?.message && error.message.includes('tool_use_failed'));

                if (isToolUseFailedError && retryCount < MAX_TOOL_USE_RETRIES) {
                    retryCount++;
                    console.warn(`Tool use failed error encountered. Retrying (${retryCount}/${MAX_TOOL_USE_RETRIES})...`);
                    // Optional: Add a small delay before retrying?
                    // await new Promise(resolve => setTimeout(resolve, 500));
                    continue; // Go to the next iteration of the while loop
                }

                // Handle other errors or exhausted retries
                console.error('Error during Groq stream processing:', error);
                // Provide more context in the error message sent to the client
                const errorMessage = error instanceof Error ? error.message : String(error);
                event.sender.send('chat-stream-error', {
                     error: `Failed to get chat completion: ${errorMessage}`,
                     details: error // Send the full error object if needed for frontend debugging
                });
                return; // Exit function after sending error
            }
        }

         // If retries are exhausted for tool_use_failed
         if (retryCount > MAX_TOOL_USE_RETRIES) {
             console.error(`Max retries (${MAX_TOOL_USE_RETRIES}) exceeded for tool_use_failed error.`);
             event.sender.send('chat-stream-error', { error: `The model repeatedly failed to use tools correctly after ${MAX_TOOL_USE_RETRIES + 1} attempts. Please try rephrasing your request.` });
         }

    } catch (outerError) {
        // Catch errors during setup (e.g., SDK init, message prep)
        console.error('Error setting up chat completion stream:', outerError);
        event.sender.send('chat-stream-error', { error: `Setup error: ${outerError.message}` });
    }
}

module.exports = {
    handleChatStream
}; 