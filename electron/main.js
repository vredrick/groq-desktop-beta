const { app, BrowserWindow, ipcMain, screen, shell } = require('electron');
const path = require('path');
const fs = require('fs');
// Import MCP client
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
// Import shared models
const { MODEL_CONTEXT_SIZES } = require('../shared/models.js');

let mainWindow;
// Store MCP client instances
let mcpClients = {};
// Store discovered tools
let discoveredTools = [];
// Variable to hold loaded model context sizes
let modelContextSizes = {};

// Determine if the app is packaged
const isPackaged = app.isPackaged;

// Helper function to get the correct base path for scripts
function getScriptsBasePath() {
  return isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'electron', 'scripts')
    : path.join(__dirname, 'scripts'); // Development path
}

/**
 * Prunes message history to stay under 50% of model's context window
 * Always keeps the first two messages (if available) and the last message
 * Handles image filtering based on specified rules.
 * @param {Array} messages - Complete message history
 * @param {String} model - Selected model name
 * @returns {Array} - Pruned message history array
 */
function pruneMessageHistory(messages, model) {
  // Handle edge cases: empty array, single message, or just two messages
  if (!messages || !Array.isArray(messages) || messages.length <= 2) {
    return messages ? [...messages] : [];
  }

  // Get context window size for the selected model, default if unknown
  const modelInfo = modelContextSizes[model] || modelContextSizes['default'];
  const contextWindow = modelInfo.context;
  const targetTokenCount = Math.floor(contextWindow * 0.5); // Use 50% of context window

  // Create a copy to avoid modifying the original array
  let prunedMessages = [...messages];

  // --- Image Pruning Logic ---
  let totalImageCount = 0;
  let lastUserMessageWithImagesIndex = -1;
  const userMessagesWithImagesIndices = [];

  prunedMessages.forEach((msg, index) => {
    if (msg.role === 'user' && Array.isArray(msg.content)) {
      const imageParts = msg.content.filter(part => part.type === 'image_url');
      if (imageParts.length > 0) {
        totalImageCount += imageParts.length;
        userMessagesWithImagesIndices.push(index);
        lastUserMessageWithImagesIndex = index; // Keep track of the latest one
      }
    }
  });

  // If total images exceed 5, keep only images from the last user message that had them
  if (totalImageCount > 5 && lastUserMessageWithImagesIndex !== -1) {
    console.log(`Total image count (${totalImageCount}) exceeds 5. Keeping images only from the last user message (index ${lastUserMessageWithImagesIndex}).`);
    prunedMessages = prunedMessages.map((msg, index) => {
      if (msg.role === 'user' && Array.isArray(msg.content) && index !== lastUserMessageWithImagesIndex) {
        // Filter out image_url parts from older user messages
        const textParts = msg.content.filter(part => part.type === 'text');
        // Calculate image parts for *this* message
        const currentImageParts = msg.content.filter(part => part.type === 'image_url');

        // If only text parts remain, keep the message, otherwise might simplify structure
        if (textParts.length > 0) {
            // If there was only one text part originally, simplify back to string content
            if (textParts.length === 1 && msg.content.length === currentImageParts.length + 1) {
                 return { ...msg, content: textParts[0].text };
            } else {
                 return { ...msg, content: textParts };
            }
        } else {
            // If message becomes empty after removing images, consider removing it?
            // For now, let's keep it but with potentially empty content array if no text
             return { ...msg, content: [] }; // Or filter out this message entirely later?
        }
      }
      return msg;
    });
  }
  // --- End Image Pruning Logic ---

  // Calculate total tokens for all messages (ignoring image tokens for now)
  let totalTokens = prunedMessages.reduce((sum, msg) => sum + estimateTokenCount(msg), 0);

  // If we're already under the target, no text-based pruning needed
  if (totalTokens <= targetTokenCount) {
    return prunedMessages;
  }

  // Keep track of text-based pruned messages
  let messagesPruned = 0;

  // Start pruning from index 2 (third message) and continue until we're under the target
  // or we only have the first two and last messages left
  while (prunedMessages.length > 3 && totalTokens > targetTokenCount) {
    // Always preserve first two messages (indices 0 and 1) and the last message
    // So we remove from index 2
    const tokensForMessage = estimateTokenCount(prunedMessages[2]);
    prunedMessages.splice(2, 1);
    totalTokens -= tokensForMessage;
    messagesPruned++;
  }

  if (messagesPruned > 0) {
    console.log(`Pruned ${messagesPruned} messages based on token count to stay under ${targetTokenCount} tokens for model ${model}`);
  }

  return prunedMessages;
}

/**
 * Estimates token count for a message (ignoring image tokens for now)
 * @param {Object} message - Message object with role and content
 * @returns {Number} - Estimated token count
 */
function estimateTokenCount(message) {
  if (!message) return 0;

  let tokenCount = 0;
  let textContent = '';

  // Handle different content structures (string or array)
  if (typeof message.content === 'string') {
    textContent = message.content;
  } else if (Array.isArray(message.content)) {
    // Sum text content length from text parts
    textContent = message.content
      .filter(part => part.type === 'text')
      .map(part => part.text)
      .join('\n'); // Join text parts for length calculation
  }

  // Use text content length divided by 4 as a rough approximation for token count
  if (textContent) {
    tokenCount += Math.ceil(textContent.length / 4);
  }

  // For assistant messages, also account for tool calls
  if (message.role === 'assistant' && message.tool_calls && message.tool_calls.length > 0) {
    // Add tokens for each tool call's serialized JSON
    message.tool_calls.forEach(toolCall => {
      // Serialize the tool call to estimate its token count
      const serializedToolCall = JSON.stringify(toolCall);
      tokenCount += Math.ceil(serializedToolCall.length / 4);
    });
  }

  // For tool messages, estimate based on stringified content
  if (message.role === 'tool' && message.content) {
     const serializedContent = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
     tokenCount += Math.ceil(serializedContent.length / 4);
  }

  // NOTE: Image token cost is currently ignored in this estimation.

  return tokenCount;
}

function createWindow() {
  const { height, width } = screen.getPrimaryDisplay().workAreaSize;
  
  mainWindow = new BrowserWindow({
    width: Math.min(1400, width),
    height: height,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // In production, use the built app
  // In development, use the dev server
  const startUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, '../dist/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Open DevTools during development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
  
  // Handle external links to open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Check if the URL is external (not our app)
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
  
  // Handle clicked links in the app
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Check if the URL is external (not our app)
    if (url.startsWith('http:') || url.startsWith('https:') && 
        url !== startUrl && !url.startsWith('http://localhost:5173')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

app.whenReady().then(async () => {
  // Load model context sizes from the JS module
  try {
    // The require statement at the top already loaded it. Assign it here.
    modelContextSizes = MODEL_CONTEXT_SIZES;
    console.log('Successfully loaded shared model definitions from models.js.');
  } catch (error) {
    console.error('Failed to load shared model definitions from models.js:', error);
    // Use a minimal fallback if loading fails
    modelContextSizes = { 'default': { context: 8192, vision_supported: false } };
  }

  createWindow();
  
  // Log settings path for debugging
  const userDataPath = app.getPath('userData');
  const settingsPath = path.join(userDataPath, 'settings.json');
  console.log('Settings file location:', settingsPath);
  
  
  connectConfiguredMcpServers();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handler for getting settings
ipcMain.handle('get-settings', async () => {
  const userDataPath = app.getPath('userData');
  const settingsPath = path.join(userDataPath, 'settings.json');
  
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(data);
      // Ensure required fields exist if loading older settings
      if (!settings.model) {
        settings.model = "llama-3.3-70b-versatile";
      }
      if (settings.temperature === undefined) {
        settings.temperature = 0.7;
      }
      if (settings.top_p === undefined) {
        settings.top_p = 0.95;
      }
      // Add mcpServers configuration if missing
      if (!settings.mcpServers) {
        settings.mcpServers = {};
      }
      // Add disabledMcpServers array if missing
      if (!settings.disabledMcpServers) {
        settings.disabledMcpServers = [];
      }
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      return settings;
    } else {
      // Default settings
      const defaultSettings = { 
        GROQ_API_KEY: "<replace me>",
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        top_p: 0.95,
        mcpServers: {},
        disabledMcpServers: []
      };
      fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
      return defaultSettings;
    }
  } catch (error) {
    console.error('Error reading settings:', error);
    return { 
      GROQ_API_KEY: "<replace me>",
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      top_p: 0.95,
      mcpServers: {},
      disabledMcpServers: []
    };
  }
});

// Handler for getting settings file path
ipcMain.handle('get-settings-path', async () => {
  const userDataPath = app.getPath('userData');
  const settingsPath = path.join(userDataPath, 'settings.json');
  return settingsPath;
});

// Handler for reloading settings from disk
ipcMain.handle('reload-settings', async () => {
  const userDataPath = app.getPath('userData');
  const settingsPath = path.join(userDataPath, 'settings.json');
  
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(data);
      // Ensure required fields exist if loading older settings
      if (!settings.model) {
        settings.model = "llama-3.3-70b-versatile";
      }
      if (settings.temperature === undefined) {
        settings.temperature = 0.7;
      }
      if (settings.top_p === undefined) {
        settings.top_p = 0.95;
      }
      // Add mcpServers configuration if missing
      if (!settings.mcpServers) {
        settings.mcpServers = {};
      }
      // Add disabledMcpServers array if missing
      if (!settings.disabledMcpServers) {
        settings.disabledMcpServers = [];
      }
      return { success: true, settings };
    } else {
      return { success: false, error: "Settings file not found" };
    }
  } catch (error) {
    console.error('Error reloading settings:', error);
    return { success: false, error: error.message };
  }
});

// Handler for saving settings
ipcMain.handle('save-settings', async (event, settings) => {
  const userDataPath = app.getPath('userData');
  const settingsPath = path.join(userDataPath, 'settings.json');
  
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error saving settings:', error);
    return { success: false, error: error.message };
  }
});

// Add sleep utility function
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

// Chat completion with streaming
ipcMain.on('chat-stream', async (event, messages, model) => {
  try {
    const userDataPath = app.getPath('userData');
    const settingsPath = path.join(userDataPath, 'settings.json');
    
    let settings = { 
      GROQ_API_KEY: "", 
      model: "llama-3.3-70b-versatile", // Default model
      temperature: 0.7,
      top_p: 0.95,
      mcpServers: {},
      disabledMcpServers: []
    };
    if (fs.existsSync(settingsPath)) {
      const loadedSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      // Merge defaults with loaded settings
      settings = { ...settings, ...loadedSettings };
    }
    
    if (!settings.GROQ_API_KEY || settings.GROQ_API_KEY === "<replace me>") {
      event.sender.send('chat-stream-error', { error: "API key not configured. Please add your GROQ API key in settings." });
      return;
    }
    
    // Use the provided model if available, otherwise use the one from settings
    const modelToUse = model || settings.model || "llama-3.3-70b-versatile"; // Fallback needed
    const modelInfo = modelContextSizes[modelToUse] || modelContextSizes['default'];

    // Check if the model supports vision if images are present
    const hasImages = messages.some(msg => 
      msg.role === 'user' && 
      Array.isArray(msg.content) && 
      msg.content.some(part => part.type === 'image_url')
    );

    if (hasImages && !modelInfo.vision_supported) {
       event.sender.send('chat-stream-error', { error: `The selected model (${modelToUse}) does not support image inputs. Please select a vision-capable model.` });
       return;
    }
    
    const Groq = require('groq-sdk');
    const groq = new Groq({ apiKey: settings.GROQ_API_KEY });
    
    // Define tools for JavaScript evaluation
    const tools = [];

    // Add MCP tools to the tools list
    if (discoveredTools.length > 0) {
      discoveredTools.forEach(tool => {
        tools.push({
          type: "function",
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.input_schema
          }
        });
      });
    }
    
    // Clean message objects to remove only the reasoning field
    const cleanedMessages = messages.map(msg => {
      // Use object destructuring to remove only the reasoning field
      const { reasoning, ...cleanMsg } = msg;

      // Ensure user message content is in the correct array format if it's just text
      if (cleanMsg.role === 'user' && typeof cleanMsg.content === 'string') {
        return { ...cleanMsg, content: [{ type: 'text', text: cleanMsg.content }] };
      }
      // Ensure assistant message content is string if it was accidentally structured
      if (cleanMsg.role === 'assistant' && Array.isArray(cleanMsg.content)) {
         const textContent = cleanMsg.content.filter(p => p.type === 'text').map(p => p.text).join('');
         return { ...cleanMsg, content: textContent };
      }
      // Ensure tool message content is stringified if not already
       if (cleanMsg.role === 'tool' && typeof cleanMsg.content !== 'string') {
         try {
            return { ...cleanMsg, content: JSON.stringify(cleanMsg.content) };
         } catch(e) {
            console.warn("Could not stringify tool content:", cleanMsg.content);
            return { ...cleanMsg, content: "[Error stringifying tool content]" };
         }
       }


      return cleanMsg;
    });

    // Prune message history (includes image filtering logic)
    const prunedMessages = pruneMessageHistory(cleanedMessages, modelToUse);

    // Format messages for the API, ensuring correct structure
    const apiMessages = prunedMessages.map(msg => {
        // Remove isStreaming flag if present
        const { isStreaming, ...apiMsg } = msg;
        return apiMsg;
    });


    const chatCompletionParams = {
      messages: [{role: "system", content: "You are a helpful assistant that can use tools to help the user. Only use tools when asked for and only when applicable. Your response is always rendered as markdown so make sure to escape any characters if necessary."}, ...apiMessages],
      model: modelToUse,
      temperature: settings.temperature,
      top_p: settings.top_p,
      // Only include tools if they exist
      ...(tools.length > 0 && { tools: tools, tool_choice: "auto" }),
      stream: true // Enable streaming
    };

    // Only include reasoning_format for models that support it
    if (modelToUse.includes("qwq") || modelToUse.includes("r1")) {
      chatCompletionParams.reasoning_format = "parsed";
    }

    // Retry logic for tool_use_failed errors
    let retryCount = 0;
    const MAX_TOOL_USE_RETRIES = 4;

    while (retryCount <= MAX_TOOL_USE_RETRIES) {
      try {
        // Initialize stream response objects to accumulate content and tool calls
        let accumulatedContent = "";
        let accumulatedToolCalls = [];
        let accumulatedReasoning = null;
        let isFirstChunk = true;

        // Create the completion with streaming
        const stream = await groq.chat.completions.create(chatCompletionParams);

        // Process each chunk as it arrives
        for await (const chunk of stream) {
          // Skip chunks with no delta content
          if (!chunk.choices || !chunk.choices.length || !chunk.choices[0]) continue;
          
          const choice = chunk.choices[0];
          const delta = choice.delta;

          // Extract data from the delta
          if (isFirstChunk) {
            // Send start message to client
            event.sender.send('chat-stream-start', { 
              id: chunk.id,
              role: delta.role || "assistant" 
            });
            isFirstChunk = false;
          }

          // Accumulate content if present
          if (delta.content) {
            accumulatedContent += delta.content;
            event.sender.send('chat-stream-content', { content: delta.content });
          }

          // Accumulate reasoning if present (for models that support it)
          if (delta.reasoning) {
            if (!accumulatedReasoning) {
              accumulatedReasoning = delta.reasoning;
            } else {
              // Merge reasoning based on structure
              if (typeof delta.reasoning === 'string') {
                accumulatedReasoning += delta.reasoning;
              } else if (typeof delta.reasoning === 'object') {
                accumulatedReasoning = { ...accumulatedReasoning, ...delta.reasoning };
              }
            }
          }

          // Handle tool calls if present
          if (delta.tool_calls && delta.tool_calls.length > 0) {
            // For tool calls, we need to accumulate them and send the complete call
            // when we receive the full chunk
            for (const toolCallDelta of delta.tool_calls) {
              let existingCall = accumulatedToolCalls.find(tc => tc.id === toolCallDelta.id);
              
              if (!existingCall) {
                // New tool call
                accumulatedToolCalls.push({
                  id: toolCallDelta.id,
                  type: toolCallDelta.type,
                  function: {
                    name: toolCallDelta.function?.name || "",
                    arguments: toolCallDelta.function?.arguments || ""
                  },
                  index: toolCallDelta.index
                });
              } else {
                // Update existing tool call
                if (toolCallDelta.function) {
                  if (toolCallDelta.function.name) {
                    existingCall.function.name = toolCallDelta.function.name;
                  }
                  if (toolCallDelta.function.arguments) {
                    existingCall.function.arguments += toolCallDelta.function.arguments;
                  }
                }
              }
            }
            
            // Send tool call update (not final yet)
            event.sender.send('chat-stream-tool-calls', { 
              tool_calls: accumulatedToolCalls
            });
          }

          // Check if we're done
          if (choice.finish_reason) {
            // Send the completion message
            event.sender.send('chat-stream-complete', {
              content: accumulatedContent,
              role: "assistant",
              tool_calls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
              reasoning: accumulatedReasoning,
              finish_reason: choice.finish_reason
            });
            break;
          }
        }
        
        // If we get here without an error, we're done
        return;
        
      } catch (error) {
        // Check if this is a tool_use_failed error
        const isToolUseFailedError = 
          error?.error?.code === 'tool_use_failed' || 
          (error?.message && error.message.includes('tool_use_failed'));
        
        if (isToolUseFailedError && retryCount < MAX_TOOL_USE_RETRIES) {
          // Increment retry count
          retryCount++;
          console.log(`Tool use failed error, retrying (${retryCount}/${MAX_TOOL_USE_RETRIES})...`);
          
          // Continue to next retry iteration immediately
          continue;
        }
        
        // For other errors or if we've exhausted retries, report the error
        console.error('Error in stream processing:', error);
        event.sender.send('chat-stream-error', { error: error.message });
        return;
      }
    }
  } catch (error) {
    console.error('Error setting up chat completion stream:', error);
    event.sender.send('chat-stream-error', { error: error.message });
  }
});

// Handler for executing tool calls
ipcMain.handle('execute-tool-call', async (event, toolCall) => {
  try {
    // Check if it's an MCP tool call
    const mcpTool = discoveredTools.find(t => t.name === toolCall.function.name);
    
    if (mcpTool) {
      // Find the specific client that provides this tool
      const clientId = mcpTool.serverId;
      const client = mcpClients[clientId];
      
      if (!client) {
        console.error(`Client not found for tool ${mcpTool.name} (server ID: ${clientId})`);
        return {
          error: `The server providing the tool "${mcpTool.name}" is not connected`,
          tool_call_id: toolCall.id
        };
      }
      
      try {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await client.callTool({
          name: mcpTool.name,
          arguments: args
        });
        
        return {
          result: limitContentLength(JSON.stringify(result.content)),
          tool_call_id: toolCall.id
        };
      } catch (err) {
        console.error(`Error executing MCP tool call: ${err.message}`);
        return {
          error: limitContentLength(`Error executing MCP tool: ${err.message}`),
          tool_call_id: toolCall.id
        };
      }
    }
    
    return { 
      error: `Unknown tool: ${toolCall.function.name}`, 
      tool_call_id: toolCall.id 
    };
  } catch (error) {
    console.error('Error executing tool call:', error);
    return { 
      error: limitContentLength(error.message),
      tool_call_id: toolCall.id
    };
  }
});

function limitContentLength(content, maxLength = 8000) {
  if (!content) return content;
  
  if (content.length <= maxLength) return content;
  
  // Truncate and add indicator
  return content.substring(0, maxLength - 3) + '...';
}

// Add this helper function
function resolveCommandPath(command) {
  // If not a simple command name, return as is (likely already a path)
  if (command.includes('/') || command.includes('\\')) {
    return command;
  }
  
  // Special handling for known commands
  if (command === 'npx') {
    // Use our shell script instead of direct npx
    const scriptBasePath = getScriptsBasePath(); // Use helper
    const npxScriptPath = path.join(scriptBasePath, 'run-npx.sh');
    if (fs.existsSync(npxScriptPath)) {
      console.log(`Using npx script: ${npxScriptPath}`);
      return npxScriptPath;
    }
    
    try {
      // Try to find npx in common locations (fallback)
      const possibleNpxPaths = [
        '/usr/local/bin/npx',
        '/usr/bin/npx',
        `${process.env.HOME}/.nvm/current/bin/npx`,
        `${process.env.HOME}/.nvm/versions/node/v16/bin/npx`,
        `${process.env.HOME}/.nvm/versions/node/v18/bin/npx`,
        `${process.env.HOME}/.nvm/versions/node/v20/bin/npx`,
        `${process.env.HOME}/.nvm/versions/node/v21/bin/npx`,
        `${process.env.HOME}/.nvm/versions/node/v22/bin/npx`,
        `${process.env.HOME}/.nvm/versions/node/v23/bin/npx`
      ];
      
      for (const npxPath of possibleNpxPaths) {
        if (fs.existsSync(npxPath)) {
          console.log(`Found npx at ${npxPath}`);
          return npxPath;
        }
      }
      
      // If we didn't find it in known locations, try using which
      const { execSync } = require('child_process');
      try {
        const npxPath = execSync('which npx').toString().trim();
        if (npxPath && fs.existsSync(npxPath)) {
          console.log(`Found npx using 'which' at ${npxPath}`);
          return npxPath;
        }
      } catch (whichError) {
        console.error('Error finding npx path:', whichError.message);
      }
    } catch (pathError) {
      console.error('Error searching for npx:', pathError.message);
    }
  }
  
  if (command === 'uvx') {
    // Use our shell script instead of direct uvx
    const scriptBasePath = getScriptsBasePath(); // Use helper
    const uvxScriptPath = path.join(scriptBasePath, 'run-uvx.sh');
    if (fs.existsSync(uvxScriptPath)) {
      console.log(`Using uvx script: ${uvxScriptPath}`);
      return uvxScriptPath;
    }
    
    try {
      // Check for uvx in common locations (fallback)
      const possibleUvxPaths = [
        '/opt/homebrew/bin/uvx',
        '/usr/local/bin/uvx',
        '/usr/bin/uvx'
      ];
      
      for (const uvxPath of possibleUvxPaths) {
        if (fs.existsSync(uvxPath)) {
          console.log(`Found uvx at ${uvxPath}`);
          return uvxPath;
        }
      }
      
      // If we didn't find it in known locations, try using which
      const { execSync } = require('child_process');
      try {
        const uvxPath = execSync('which uvx').toString().trim();
        if (uvxPath && fs.existsSync(uvxPath)) {
          console.log(`Found uvx using 'which' at ${uvxPath}`);
          return uvxPath;
        }
      } catch (whichError) {
        console.error('Error finding uvx path:', whichError.message);
      }
    } catch (pathError) {
      console.error('Error searching for uvx:', pathError.message);
    }
  }

  if (command === 'docker') {
    // Use our shell script instead of direct docker
    const scriptBasePath = getScriptsBasePath(); // Use helper
    const dockerScriptPath = path.join(scriptBasePath, 'run-docker.sh');
    if (fs.existsSync(dockerScriptPath)) {
      console.log(`Using docker script: ${dockerScriptPath}`);
      return dockerScriptPath;
    }
    // Fallback logic (optional, could just rely on the script)
    console.warn('run-docker.sh not found, attempting fallback...');
  }

  if (command === 'node') {
    // Use our shell script instead of direct node
    const scriptBasePath = getScriptsBasePath(); // Use helper
    const nodeScriptPath = path.join(scriptBasePath, 'run-node.sh');
    if (fs.existsSync(nodeScriptPath)) {
      console.log(`Using node script: ${nodeScriptPath}`);
      return nodeScriptPath;
    }
    // Fallback logic (optional, could just rely on the script)
    console.warn('run-node.sh not found, attempting fallback...');
  }
  
  // For other commands, try to use which
  try {
    const { execSync } = require('child_process');
    const commandPath = execSync(`which ${command}`).toString().trim();
    if (commandPath && fs.existsSync(commandPath)) {
      console.log(`Resolved ${command} to ${commandPath}`);
      return commandPath;
    }
  } catch (error) {
    // Silently fail and return original command
  }
  
  // Return original if not found
  return command;
}

// Handler for connecting to an MCP server
ipcMain.handle('connect-mcp-server', async (event, serverConfig) => {
  try {
    const { id, scriptPath, command, args, env } = serverConfig;
    
    // Remove from disabled list if it's there
    const userDataPath = app.getPath('userData');
    const settingsPath = path.join(userDataPath, 'settings.json');
    
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(data);
      
      // Initialize the disabled list if it doesn't exist
      if (!settings.disabledMcpServers) {
        settings.disabledMcpServers = [];
      }
      
      // Remove server ID from disabled list if it's there
      const index = settings.disabledMcpServers.indexOf(id);
      if (index !== -1) {
        settings.disabledMcpServers.splice(index, 1);
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        console.log(`Removed server ${id} from disabled list`);
      }
    }
    
    // If command and args are provided directly, use them
    if (command) {
      const resolvedCommand = resolveCommandPath(command);
      
      const result = await connectMcpServerProcess(id, { 
        command: resolvedCommand, 
        args: args || [],
        env: env || {} 
      });
      return { 
        success: true, 
        tools: result.tools || [],
        allTools: discoveredTools
      };
    }
    
    // Otherwise use script path
    if (!scriptPath) {
      return { 
        success: false, 
        error: "Either scriptPath or command must be provided",
        tools: [],
        allTools: discoveredTools
      };
    }
    
    // Check if server script exists
    if (!fs.existsSync(scriptPath)) {
      return { 
        success: false, 
        error: `Server script not found: ${scriptPath}`,
        tools: [],
        allTools: discoveredTools
      };
    }
    
    // Determine script type and appropriate command
    const isJs = scriptPath.endsWith('.js');
    const isPy = scriptPath.endsWith('.py');
    
    if (!isJs && !isPy) {
      return { 
        success: false, 
        error: "Server script must be a .js or .py file",
        tools: [],
        allTools: discoveredTools
      };
    }
    
    const scriptCommand = isPy
      ? process.platform === "win32" ? "python" : "python3"
      : process.execPath;
      
    const result = await connectMcpServerProcess(id, {
      command: scriptCommand,
      args: [scriptPath],
      env: env || {}
    });
    
    return { 
      success: true, 
      tools: result.tools || [],
      allTools: discoveredTools
    };
  } catch (error) {
    console.error('Error connecting to MCP server:', error);
    return { 
      success: false, 
      error: error.message,
      tools: [],
      allTools: discoveredTools
    };
  }
});

// Handler for disconnecting from an MCP server
ipcMain.handle('disconnect-mcp-server', async (event, serverId) => {
  try {
    // Add server to disabled list
    const userDataPath = app.getPath('userData');
    const settingsPath = path.join(userDataPath, 'settings.json');
    
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(data);
      
      // Initialize the disabled list if it doesn't exist
      if (!settings.disabledMcpServers) {
        settings.disabledMcpServers = [];
      }
      
      // Add server ID to disabled list if not already there
      if (!settings.disabledMcpServers.includes(serverId)) {
        settings.disabledMcpServers.push(serverId);
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        console.log(`Added server ${serverId} to disabled list`);
      }
    }
    
    if (mcpClients[serverId]) {
      // Clear the health check interval if it exists
      if (mcpClients[serverId].healthCheckInterval) {
        clearInterval(mcpClients[serverId].healthCheckInterval);
        console.log(`Cleared health check interval for server ${serverId}`);
      }
      
      await mcpClients[serverId].close();
      delete mcpClients[serverId];
      
      // Remove tools from this server
      discoveredTools = discoveredTools.filter(t => t.serverId !== serverId);
      
      // Notify renderer about the change
      notifyMcpServerStatus();
      
      return { success: true, allTools: discoveredTools };
    }
    
    return { success: true, message: "No client to disconnect", allTools: discoveredTools };
  } catch (error) {
    console.error('Error disconnecting from MCP server:', error);
    return { success: false, error: error.message, allTools: discoveredTools };
  }
});

// Handler for getting all discovered tools
ipcMain.handle('get-mcp-tools', async () => {
  return { tools: discoveredTools };
});

// Function to connect to all configured MCP servers from settings
async function connectConfiguredMcpServers() {
  try {
    const userDataPath = app.getPath('userData');
    const settingsPath = path.join(userDataPath, 'settings.json');
    
    if (!fs.existsSync(settingsPath)) {
      console.log('No settings file found, skipping MCP server connections');
      return;
    }
    
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    
    if (!settings.mcpServers || Object.keys(settings.mcpServers).length === 0) {
      console.log('No MCP servers configured, skipping connections');
      return;
    }
    
    // Initialize the disabled list if it doesn't exist
    if (!settings.disabledMcpServers) {
      settings.disabledMcpServers = [];
    }
    
    const disabledServers = settings.disabledMcpServers || [];
    const serverCount = Object.keys(settings.mcpServers).length;
    const disabledCount = disabledServers.length;
    
    console.log(`Found ${serverCount} configured MCP servers (${disabledCount} disabled), connecting to enabled servers...`);
    
    // Track successful and failed connections
    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    
    for (const [serverId, serverConfig] of Object.entries(settings.mcpServers)) {
      // Skip servers that are in the disabled list
      if (disabledServers.includes(serverId)) {
        console.log(`Skipping disabled MCP server: ${serverId}`);
        skippedCount++;
        continue;
      }
      
      try {
        console.log(`Connecting to MCP server: ${serverId}`);
        
        // Make sure we have command and args
        const normalizedConfig = {
          command: resolveCommandPath(serverConfig.command),
          args: serverConfig.args || [],
          env: serverConfig.env || {}
        };
        
        await connectMcpServerProcess(serverId, normalizedConfig);
        console.log(`Successfully connected to MCP server: ${serverId}`);
        successCount++;
      } catch (error) {
        console.error(`Failed to connect to MCP server ${serverId}:`, error);
        failCount++;
      }
    }
    
    console.log(`MCP server connection summary: ${successCount} succeeded, ${failCount} failed, ${skippedCount} skipped (disabled)`);
  } catch (error) {
    console.error('Error connecting to configured MCP servers:', error);
  }
}

// Add this function near the other tool-related functions
function notifyMcpServerStatus() {
  if (mainWindow) {
    mainWindow.webContents.send('mcp-server-status-changed', {
      tools: discoveredTools,
      connectedServers: Object.keys(mcpClients)
    });
  }
}

// Function to connect to an MCP server using process configuration
async function connectMcpServerProcess(serverId, serverConfig) {
  // Clean up existing client if any
  if (mcpClients[serverId]) {
    console.log(`Cleaning up existing client for server ${serverId}`);
    await mcpClients[serverId].close();
    delete mcpClients[serverId];
    
    // Remove tools from this server
    discoveredTools = discoveredTools.filter(t => t.serverId !== serverId);
    
    // Notify renderer about the change
    notifyMcpServerStatus();
  }
  
  if (!serverConfig.command) {
    throw new Error(`Missing command for MCP server ${serverId}`);
  }
  
  // Determine if this is a uvx-based server
  const isUvx = serverConfig.command.endsWith('uvx') || 
                serverConfig.command === 'uvx' ||
                path.basename(serverConfig.command) === 'uvx';
  
  let lastError = null;
  
  // Create client once outside the retry loop
  const client = new Client({ 
    name: "groq-desktop", 
    version: "1.0.0",
    // Add capabilities to allow for more robust connection verification
    capabilities: {
      tools: true,
      prompts: true,
      resources: true
    }
  });
  
  // Configure transport with proper options
  const transportOptions = {
    command: serverConfig.command,
    args: serverConfig.args || [],
    env: { ...process.env, ...serverConfig.env } || {},
    // Add startup timeout - especially important for Python-based servers
    connectTimeout: isUvx ? 5000 : 3000  // Increased timeout: 5 seconds for uvx, 3 seconds for others
  };
  
  // Connection details are available in debug mode
  
  // Environment variables are available in debug logs if needed
  
  // Create transport once
  const transport = new StdioClientTransport(transportOptions);
  
  try {
    console.log(`Connecting MCP client for server ${serverId}`);
    
    // Track connection and initialization state
    const connectionState = {
      connected: false,
      initialized: false,
      healthy: false
    };
    
    // Connect to the server first
    await client.connect(transport);
    connectionState.connected = true;
    mcpClients[serverId] = client;
    console.log(`Initial connection to ${serverId} established`);
    
    // Implement exponential backoff for tool listing
    const maxRetries = 12; // More retries than before
    const initialDelay = 500; // Start with 500ms
    let retryCount = 0;
    let toolsResult = null;
    
    while (retryCount < maxRetries) {
      try {
        // Calculate exponential backoff delay
        const delay = Math.min(initialDelay * Math.pow(1.5, retryCount), 10000); // Cap at 10 seconds
        
        if (retryCount > 0) {
          console.log(`Waiting ${delay}ms before retry ${retryCount+1}/${maxRetries} for ${serverId}...`);
          await sleep(delay);
        }
        
        console.log(`Listing tools for server ${serverId} (attempt ${retryCount+1}/${maxRetries})...`);
        toolsResult = await client.listTools();
        
        // If we get here, server is ready and we have tools
        connectionState.initialized = true;
        connectionState.healthy = true;
        console.log(`Server ${serverId} successfully initialized and tools listed`);
        break;
      } catch (error) {
        console.error(`Error listing tools (attempt ${retryCount+1}/${maxRetries}):`, error.message);
        lastError = error;
        retryCount++;
        
        // Check if the error indicates a connection problem vs. just not being ready
        if (error.message.includes('connection') || error.message.includes('transport')) {
          console.error(`Connection error detected, server ${serverId} may be down`);
          // If we've had several connection errors, fail faster
          if (retryCount >= 3) {
            throw new Error(`Server ${serverId} connection failed after ${retryCount} attempts: ${error.message}`);
          }
        }
      }
    }
    
    // If we've exhausted retries without success
    if (retryCount >= maxRetries) {
      throw lastError || new Error(`Failed to list tools from server ${serverId} after ${maxRetries} attempts`);
    }
    
    if (!toolsResult || !toolsResult.tools || !Array.isArray(toolsResult.tools)) {
      console.warn(`No tools returned from server ${serverId}`);
      return {
        success: true,
        tools: []
      };
    }
    
    const serverTools = toolsResult.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
      serverId: serverId  // Make sure server ID is set correctly
    }));
    
    console.log(`Discovered ${serverTools.length} tools from server ${serverId}`);
    
    // Add to discovered tools
    discoveredTools = [...discoveredTools.filter(t => t.serverId !== serverId), ...serverTools];
    
    // Set up a health check interval
    setupServerHealthCheck(client, serverId);
    
    // Notify renderer about the new tools
    notifyMcpServerStatus();
    
    return {
      success: true,
      tools: serverTools
    };
  } catch (error) {
    console.error(`Error connecting to MCP server ${serverId}:`, error);
    
    // Clean up failed client
    if (mcpClients[serverId]) {
      try {
        await mcpClients[serverId].close();
      } catch (closeError) {
        console.error(`Error closing failed client: ${closeError.message}`);
      }
      delete mcpClients[serverId];
    }
    
    // Notify renderer about the failed connection
    notifyMcpServerStatus();
    
    // If we got here, connection or tool listing failed
    throw error || new Error(`Failed to connect to MCP server ${serverId}`);
  }
}

// Add helper function to refresh server tools
async function refreshServerTools(client, serverId) {
  try {
    const toolsResult = await client.listTools();
    
    if (!toolsResult || !toolsResult.tools || !Array.isArray(toolsResult.tools)) {
      console.warn(`No tools returned from server ${serverId} during refresh`);
      return;
    }
    
    const serverTools = toolsResult.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
      serverId: serverId
    }));
    
    console.log(`Refreshed ${serverTools.length} tools from server ${serverId}`);
    
    // Update discovered tools
    discoveredTools = [...discoveredTools.filter(t => t.serverId !== serverId), ...serverTools];
    
    // Notify renderer about the updated tools
    notifyMcpServerStatus();
  } catch (error) {
    console.error(`Error refreshing tools for server ${serverId}:`, error);
    throw error;
  }
}

// Add function to set up periodic health check for a server
function setupServerHealthCheck(client, serverId) {
  // Store health check interval so we can clear it if needed
  const healthCheckInterval = setInterval(async () => {
    try {
      // Use a lightweight operation to check server health
      await client.listTools();
      // Only log on failure, not on success
    } catch (error) {
      console.error(`Health check failed for server ${serverId}:`, error);
      
      // If health check fails, try to recover the connection
      try {
        console.log(`Attempting to recover connection to server ${serverId}...`);
        await refreshServerTools(client, serverId);
      } catch (recoveryError) {
        console.error(`Recovery failed for server ${serverId}, marking as disconnected:`, recoveryError);
        
        // Clear health check interval
        clearInterval(healthCheckInterval);
        
        // Clean up failed client
        if (mcpClients[serverId]) {
          try {
            await mcpClients[serverId].close();
          } catch (closeError) {
            console.error(`Error closing unhealthy client: ${closeError.message}`);
          }
          delete mcpClients[serverId];
        }
        
        // Remove tools from this server
        discoveredTools = discoveredTools.filter(t => t.serverId !== serverId);
        
        // Notify renderer about the disconnection
        notifyMcpServerStatus();
      }
    }
  }, 60000); // Check health every 60 seconds
  
  // Store the interval so we can clear it when disconnecting
  client.healthCheckInterval = healthCheckInterval;
}

// Handler for getting model configurations
ipcMain.handle('get-model-configs', async () => {
  return modelContextSizes; // Return the already loaded configurations
});