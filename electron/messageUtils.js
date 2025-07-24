/**
 * Prunes message history to stay under 50% of model's context window
 * Always keeps the first two messages (if available) and the last message
 * Handles image filtering based on specified rules.
 * @param {Array} messages - Complete message history (should be cleaned format)
 * @param {String} model - Selected model name
 * @param {object} modelContextSizes - Object containing context window sizes for models.
 * @returns {Array} - Pruned message history array
 */
function pruneMessageHistory(messages, model, modelContextSizes) {
  // Handle edge cases: empty array, single message, or just two messages
  if (!messages || !Array.isArray(messages) || messages.length <= 2) {
    return messages ? [...messages] : [];
  }

  // Get context window size for the selected model, default if unknown
  const modelInfo = modelContextSizes[model] || modelContextSizes['default'] || { context: 8192 }; // Ensure default
  const contextWindow = modelInfo.context;
  
  // Use more of the context window for models with large contexts
  let contextUsageRatio = 0.5; // Default to 50%
  if (contextWindow >= 100000) {
    contextUsageRatio = 0.8; // Use 80% for models with 100k+ context
  } else if (contextWindow >= 32000) {
    contextUsageRatio = 0.7; // Use 70% for models with 32k+ context
  }
  
  const targetTokenCount = Math.floor(contextWindow * contextUsageRatio);

  // Create a copy to avoid modifying the original array
  let prunedMessages = [...messages];

  // --- Image Pruning Logic --- (Assumes cleaned message format)
  let totalImageCount = 0;
  let lastUserMessageWithImagesIndex = -1;

  prunedMessages.forEach((msg, index) => {
    if (msg.role === 'user' && Array.isArray(msg.content)) {
      const imageParts = msg.content.filter(part => part.type === 'image_url');
      if (imageParts.length > 0) {
        totalImageCount += imageParts.length;
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

        // If only text parts remain, keep the message with only text parts
        if (textParts.length > 0) {
            // If there was only one text part originally, simplify back to string content? No, keep array structure.
            // console.log(`Removing images from message ${index}, keeping text parts.`);
             return { ...msg, content: textParts };
        } else {
            // If the message becomes empty after removing images, filter it out later?
            // For now, let's keep it but mark content as empty text array
            // console.log(`Message ${index} becomes empty after image removal.`);
            return { ...msg, content: [{ type: 'text', text: '' }] }; // Represent as empty text
        }
      }
      return msg;
    });
    // Optional: Filter out messages that became effectively empty?
    // prunedMessages = prunedMessages.filter(msg => !(msg.role === 'user' && Array.isArray(msg.content) && msg.content.length === 1 && msg.content[0].type === 'text' && msg.content[0].text === ''));
  }
  // --- End Image Pruning Logic ---

  // Recalculate tokens after potential image pruning
  let currentTotalTokens = prunedMessages.reduce((sum, msg) => sum + estimateTokenCount(msg), 0);

  // If we're already under the target, no text-based pruning needed
  if (currentTotalTokens <= targetTokenCount) {
    console.log(`Token count (${currentTotalTokens}) is within target (${targetTokenCount}) after image pruning. No text pruning needed.`);
    return prunedMessages;
  }

  console.log(`Token count (${currentTotalTokens}) exceeds target (${targetTokenCount}). Starting text pruning...`);

  // Keep track of text-based pruned messages
  let messagesPrunedCount = 0;

  // Smart pruning: Keep system message, keep last user message and its responses
  // Find the last user message
  let lastUserIndex = -1;
  for (let i = prunedMessages.length - 1; i >= 0; i--) {
    if (prunedMessages[i].role === 'user') {
      lastUserIndex = i;
      break;
    }
  }

  // Keep messages that are critical for context
  const messagesToKeep = new Set([0]); // Always keep system message
  
  // Keep the last user message and all messages after it
  if (lastUserIndex >= 0) {
    for (let i = lastUserIndex; i < prunedMessages.length; i++) {
      messagesToKeep.add(i);
    }
  }

  // For tool messages, try to keep the corresponding assistant message with tool_calls
  prunedMessages.forEach((msg, idx) => {
    if (msg.role === 'tool' && msg.tool_call_id) {
      // Find the assistant message that made this tool call
      for (let i = idx - 1; i >= 0; i--) {
        const prevMsg = prunedMessages[i];
        if (prevMsg.role === 'assistant' && prevMsg.tool_calls?.some(tc => tc.id === msg.tool_call_id)) {
          messagesToKeep.add(i); // Keep the assistant message that called this tool
          break;
        }
      }
    }
  });

  // Build list of removable messages (oldest first, excluding protected messages)
  const removableIndices = [];
  for (let i = 1; i < prunedMessages.length; i++) { // Skip system message at index 0
    if (!messagesToKeep.has(i)) {
      removableIndices.push(i);
    }
  }

  // Remove messages starting from oldest until we're under target
  while (removableIndices.length > 0 && currentTotalTokens > targetTokenCount) {
    const indexToRemove = removableIndices.shift();
    const messageToRemove = prunedMessages[indexToRemove];
    const tokensForMessage = estimateTokenCount(messageToRemove);
    
    // Mark for removal (we'll remove in reverse order later to maintain indices)
    messageToRemove._markedForRemoval = true;
    currentTotalTokens -= tokensForMessage;
    messagesPrunedCount++;
  }

  // Remove marked messages
  prunedMessages = prunedMessages.filter(msg => !msg._markedForRemoval);

  // If we're still over the limit, truncate large tool results
  if (currentTotalTokens > targetTokenCount) {
    console.log(`Still over token limit after pruning. Truncating large tool results...`);
    prunedMessages = prunedMessages.map(msg => {
      if (msg.role === 'tool' && msg.content) {
        const contentLength = msg.content.length;
        const maxLength = 10000; // Max characters for tool results
        
        if (contentLength > maxLength) {
          console.log(`Truncating tool result from ${contentLength} to ${maxLength} characters`);
          return {
            ...msg,
            content: msg.content.substring(0, maxLength) + "\n\n[Tool result truncated due to length. Original length: " + contentLength + " characters]"
          };
        }
      }
      return msg;
    });
    
    // Recalculate tokens after truncation
    currentTotalTokens = prunedMessages.reduce((sum, msg) => sum + estimateTokenCount(msg), 0);
  }

  if (messagesPrunedCount > 0) {
    console.log(`Pruned ${messagesPrunedCount} messages based on token count. Final tokens: ${currentTotalTokens} (target: ${targetTokenCount})`);
  }

  return prunedMessages;
}

/**
 * Estimates token count for a single message (ignoring image tokens).
 * @param {Object} message - Message object with role and content.
 * @returns {Number} - Estimated token count.
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
  // NOTE: Ignoring non-text/image parts if the array format is extended.

  // Basic approximation: characters / 4
  if (textContent) {
    // Add tokens based on character count (e.g., simple approximation)
    tokenCount += Math.ceil(textContent.length / 4);
  }

  // Account for tool calls in assistant messages
  if (message.role === 'assistant' && message.tool_calls && Array.isArray(message.tool_calls)) {
    message.tool_calls.forEach(toolCall => {
      // Estimate tokens for the JSON representation of the tool call
      try {
          const serializedToolCall = JSON.stringify(toolCall);
          tokenCount += Math.ceil(serializedToolCall.length / 4);
      } catch (e) {
          console.warn("Error serializing tool call for token estimation:", e);
          tokenCount += 50; // Add arbitrary penalty if serialization fails
      }
    });
  }

  // Account for tool results in tool messages
  if (message.role === 'tool') {
      // Estimate tokens for the (potentially stringified) content of the tool result
      const contentString = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
      tokenCount += Math.ceil(contentString.length / 4);
      // Add a small overhead for the tool role/id itself
      tokenCount += 10; // Rough estimate for tool_call_id, role etc.
  }

  // Add a small base token count per message for metadata (role, etc.)
  tokenCount += 5; // Arbitrary small number

  // NOTE: Image token cost is currently ignored in this estimation.
  // A more accurate approach would require model-specific tokenization or heuristics.

  return tokenCount;
}

module.exports = {
    pruneMessageHistory,
    estimateTokenCount
}; 