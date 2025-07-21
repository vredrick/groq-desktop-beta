import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import ToolsPanel from './components/ToolsPanel';
import ToolApprovalModal from './components/ToolApprovalModal';
import SessionHistory from './components/SessionHistory';
import { useChat } from './context/ChatContext'; // Import useChat hook
// Import shared model definitions - REMOVED
// import { MODEL_CONTEXT_SIZES } from '../../shared/models';


// LocalStorage keys
const TOOL_APPROVAL_PREFIX = 'tool_approval_';
const YOLO_MODE_KEY = 'tool_approval_yolo_mode';

// --- LocalStorage Helper Functions ---
const getToolApprovalStatus = (toolName) => {
  try {
    const yoloMode = localStorage.getItem(YOLO_MODE_KEY);
    if (yoloMode === 'true') {
      return 'yolo';
    }
    const toolStatus = localStorage.getItem(`${TOOL_APPROVAL_PREFIX}${toolName}`);
    if (toolStatus === 'always') {
      return 'always';
    }
    // Default: prompt the user
    return 'prompt';
  } catch (error) {
    console.error("Error reading tool approval status from localStorage:", error);
    return 'prompt'; // Fail safe: prompt user if localStorage fails
  }
};

const setToolApprovalStatus = (toolName, status) => {
  try {
    if (status === 'yolo') {
      localStorage.setItem(YOLO_MODE_KEY, 'true');
      // Optionally clear specific tool settings when YOLO is enabled?
      // Object.keys(localStorage).forEach(key => {
      //   if (key.startsWith(TOOL_APPROVAL_PREFIX)) {
      //     localStorage.removeItem(key);
      //   }
      // });
    } else if (status === 'always') {
      localStorage.setItem(`${TOOL_APPROVAL_PREFIX}${toolName}`, 'always');
      // Ensure YOLO mode is off if a specific tool is set to always
      localStorage.removeItem(YOLO_MODE_KEY);
    } else if (status === 'once') {
      // 'once' doesn't change persistent storage, just allows current execution
      // Ensure YOLO mode is off if 'once' is chosen for a specific tool
      localStorage.removeItem(YOLO_MODE_KEY);
    } else if (status === 'deny') {
       // 'deny' also doesn't change persistent storage by default.
       // Could potentially add a 'never' status if needed.
       // Ensure YOLO mode is off if 'deny' is chosen
       localStorage.removeItem(YOLO_MODE_KEY);
    }
  } catch (error) {
    console.error("Error writing tool approval status to localStorage:", error);
  }
};
// --- End LocalStorage Helper Functions ---


function App() {
  const navigate = useNavigate();
  // const [messages, setMessages] = useState([]); // Remove local state
  const { 
    messages, 
    setMessages,
    saveMessageToSession,
    saveToolCallToSession, 
    saveToolResultToSession,
    workingDirectory 
  } = useChat(); // Use context state
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [mcpTools, setMcpTools] = useState([]);
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(false);
  const [isSessionHistoryOpen, setIsSessionHistoryOpen] = useState(false);
  const [mcpServersStatus, setMcpServersStatus] = useState({ loading: false, message: "" });
  const messagesEndRef = useRef(null);
  // Store the list of models from capabilities keys
  // const models = Object.keys(MODEL_CONTEXT_SIZES).filter(key => key !== 'default'); // Old way
  const [modelConfigs, setModelConfigs] = useState({}); // State for model configurations
  const [models, setModels] = useState([]); // State for model list

  // State for current model's vision capability
  const [visionSupported, setVisionSupported] = useState(false);
  // Add state to track if initial model/settings load is complete
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // --- State for Tool Approval Flow ---
  const [pendingApprovalCall, setPendingApprovalCall] = useState(null); // Holds the tool call object needing approval
  const [pausedChatState, setPausedChatState] = useState(null); // Holds { currentMessages, finalAssistantMessage, accumulatedResponses }
  // --- End Tool Approval State ---

  const handleRemoveLastMessage = () => {
    setMessages(prev => {
      if (prev.length === 0) return prev;
      // Create a copy without the last message
      return prev.slice(0, prev.length - 1);
    });
  };
  
  // Models list derived from capabilities keys
  // const models = Object.keys(MODEL_CAPABILITIES).filter(key => key !== 'default');

  // Function to update the server status display - moved outside useEffect
  const updateServerStatus = (tools, settings) => {
    try {
      // Get number of configured servers
      if (settings && settings.mcpServers) {
        const configuredCount = Object.keys(settings.mcpServers).length;
        
        // Get unique server IDs from the tools
        const connectedServerIds = new Set();
        if (Array.isArray(tools)) {
          tools.forEach(tool => {
            if (tool && tool.serverId) {
              connectedServerIds.add(tool.serverId);
            }
          });
        }
        const connectedCount = connectedServerIds.size;
        const toolCount = Array.isArray(tools) ? tools.length : 0;
        
        if (configuredCount > 0) {
          if (connectedCount === configuredCount) {
            setMcpServersStatus({ 
              loading: false, 
              message: `${toolCount} tools, ${connectedCount}/${configuredCount} MCP servers connected` 
            });
          } else if (connectedCount > 0) {
            setMcpServersStatus({ 
              loading: false, 
              message: `${toolCount} tools, ${connectedCount}/${configuredCount} MCP servers connected` 
            });
          } else {
            setMcpServersStatus({ 
              loading: false, 
              message: `${toolCount} tools, No MCP servers connected (${configuredCount} configured)` 
            });
          }
        } else {
          setMcpServersStatus({ loading: false, message: `${toolCount} tools, No MCP servers configured` });
        }
      } else {
        const toolCount = Array.isArray(tools) ? tools.length : 0;
        setMcpServersStatus({ loading: false, message: `${toolCount} tools available` });
      }
    } catch (error) {
      console.error('Error updating server status:', error);
      setMcpServersStatus({ loading: false, message: "Error updating server status" });
    }
  };

  // Check if a project is selected, redirect to project selector if not
  useEffect(() => {
    if (!workingDirectory) {
      navigate('/projects');
    }
  }, [workingDirectory, navigate]);

  // Load settings, MCP tools, and model configs when component mounts
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Set loading status
        setMcpServersStatus({ loading: true, message: "Connecting to MCP servers..." });

        // Load model configurations first
        const configs = await window.electron.getModelConfigs(); // Await configs
        setModelConfigs(configs);
        const availableModels = Object.keys(configs).filter(key => key !== 'default');
        setModels(availableModels); // Set models list

        // THEN Load settings
        const settings = await window.electron.getSettings(); // Await settings
        let effectiveModel = availableModels.length > 0 ? availableModels[0] : 'default'; // Default fallback if no models or no setting

        if (settings && settings.model) {
            // Ensure the saved model is still valid against the loaded configs
            if (configs[settings.model]) {
                effectiveModel = settings.model; // Use saved model if valid
            } else {
                // If saved model is invalid, keep the default fallback (first available model)
                console.warn(`Saved model "${settings.model}" not found in loaded configs. Falling back to ${effectiveModel}.`);
            }
        } else if (availableModels.length > 0) {
             // If no model saved in settings, but models are available, use the first one
             effectiveModel = availableModels[0];
        }
        // If no model in settings and no available models, effectiveModel remains 'default'

        setSelectedModel(effectiveModel); // Set the final selected model state


        // Initial load of MCP tools (can happen after model/settings)
        const mcpToolsResult = await window.electron.getMcpTools();
        // Use the already loaded settings object here for initial status update
        if (mcpToolsResult && mcpToolsResult.tools) {
          setMcpTools(mcpToolsResult.tools);
          updateServerStatus(mcpToolsResult.tools, settings); // Pass loaded settings
        } else {
           // Handle case where no tools are found initially, but update status
           updateServerStatus([], settings);
        }

        // Set up event listener for MCP server status changes
        const removeListener = window.electron.onMcpServerStatusChanged((data) => {
          if (data && data.tools !== undefined) { // Check if tools property exists
            setMcpTools(data.tools);
            // Fetch latest settings again when status changes, as they might have been updated
            window.electron.getSettings().then(currentSettings => {
               updateServerStatus(data.tools, currentSettings);
            }).catch(err => {
                console.error("Error fetching settings for status update:", err);
                // Fallback to updating status without settings info
                updateServerStatus(data.tools, null);
            });
          }
        });

        // Clean up the event listener when component unmounts
        return () => {
          if (removeListener) removeListener();
        };
      } catch (error) {
        console.error('Error loading initial data:', error);
        setMcpServersStatus({ loading: false, message: "Error loading initial data" });
      } finally {
          // Mark initial load as complete regardless of success/failure
          setInitialLoadComplete(true);
      }
    };

    loadInitialData();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Save model selection to settings when it changes, ONLY after initial load
  useEffect(() => {
    // Prevent saving during initial setup before models/settings are loaded/validated
    if (!initialLoadComplete) {
        return;
    }

    // Also ensure models list isn't empty and selectedModel is valid
    if (models.length === 0 || !selectedModel) {
        console.warn("Skipping model save: Models not loaded or no model selected.");
        return;
    }

    const saveModelSelection = async () => {
      try {
        console.log(`Attempting to save selected model: ${selectedModel}`); // Debug log
        const settings = await window.electron.getSettings();
        // Check if the model actually changed before saving
        if (settings.model !== selectedModel) {
            console.log(`Saving new model selection: ${selectedModel}`);
            await window.electron.saveSettings({ ...settings, model: selectedModel });
        } else {
            // console.log("Model selection hasn't changed, skipping save."); // Optional: Log skips
        }
      } catch (error) {
        console.error('Error saving model selection:', error);
      }
    };

    saveModelSelection();
    // Depend on initialLoadComplete as well to trigger after load finishes
  }, [selectedModel, initialLoadComplete, models]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const executeToolCall = async (toolCall) => {
    try {
      // Save the tool call to session
      await saveToolCallToSession(toolCall);
      
      const response = await window.electron.executeToolCall(toolCall);
      
      // Save the tool result to session
      await saveToolResultToSession(toolCall.function.name, response.error || response.result || '');
      
      // Return the tool response message in the correct format
      return {
        role: 'tool',
        content: response.error ? JSON.stringify({ error: response.error }) : (response.result || ''),
        tool_call_id: toolCall.id
      };
    } catch (error) {
      console.error('Error executing tool call:', error);
      // Save the error as a tool result
      await saveToolResultToSession(toolCall.function.name, error.message);
      
      return { 
        role: 'tool', 
        content: JSON.stringify({ error: error.message }),
        tool_call_id: toolCall.id
      };
    }
  };

  // Refactored processToolCalls to handle sequential checking and pausing
  const processToolCalls = async (assistantMessage, currentMessagesBeforeAssistant) => {
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      return { status: 'completed', toolResponseMessages: [] };
    }

    const toolResponseMessages = [];
    let needsPause = false;

    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name;
      const approvalStatus = getToolApprovalStatus(toolName);

      if (approvalStatus === 'always' || approvalStatus === 'yolo') {
        console.log(`Tool '${toolName}' automatically approved (${approvalStatus}). Executing...`);
        try {
          const resultMsg = await executeToolCall(toolCall);
          toolResponseMessages.push(resultMsg);
          // Update UI immediately for executed tool calls
          setMessages(prev => [...prev, resultMsg]);
        } catch (error) {
           console.error(`Error executing automatically approved tool call '${toolName}':`, error);
           const errorMsg = {
               role: 'tool',
               content: JSON.stringify({ error: `Error executing tool '${toolName}': ${error.message}` }),
               tool_call_id: toolCall.id
           };
           toolResponseMessages.push(errorMsg);
           setMessages(prev => [...prev, errorMsg]); // Show error in UI
        }
      } else { // status === 'prompt'
        console.log(`Tool '${toolName}' requires user approval.`);
        setPendingApprovalCall(toolCall);
        setPausedChatState({
          currentMessages: currentMessagesBeforeAssistant, // History before this assistant message
          finalAssistantMessage: assistantMessage,
          accumulatedResponses: toolResponseMessages // Responses gathered *before* this pause
        });
        needsPause = true;
        break; // Stop processing further tools for this turn
      }
    }

    if (needsPause) {
      return { status: 'paused', toolResponseMessages };
    } else {
      return { status: 'completed', toolResponseMessages };
    }
  };

  // Update vision support when selectedModel or modelConfigs changes
  useEffect(() => {
    if (modelConfigs && selectedModel && modelConfigs[selectedModel]) {
      const capabilities = modelConfigs[selectedModel] || modelConfigs['default'];
      setVisionSupported(capabilities.vision_supported);
    } else {
      // Handle case where configs aren't loaded yet or model is invalid
      setVisionSupported(false);
    }
  }, [selectedModel, modelConfigs]);

  // Core function to execute a chat turn (fetch response, handle tools)
  // Refactored from the main loop of handleSendMessage
  const executeChatTurn = async (turnMessages) => {
    let currentTurnStatus = 'processing'; // processing, completed, paused, error
    let turnAssistantMessage = null;
    let turnToolResponses = [];

    try {
        // Create a streaming assistant message placeholder
        const assistantPlaceholder = {
            role: 'assistant',
            content: '',
            isStreaming: true
        };
        setMessages(prev => [...prev, assistantPlaceholder]);

        // Start streaming chat
        const streamHandler = window.electron.startChatStream(turnMessages, selectedModel);

        // Collect the final message data
        let finalAssistantData = {
            role: 'assistant',
            content: '',
            tool_calls: undefined,
            reasoning: undefined
        };

        // Setup event handlers for streaming
        streamHandler.onStart(() => { /* Placeholder exists */ });

        streamHandler.onContent(({ content }) => {
            finalAssistantData.content += content;
            setMessages(prev => {
                const newMessages = [...prev];
                const idx = newMessages.findIndex(msg => msg.role === 'assistant' && msg.isStreaming);
                if (idx !== -1) {
                    newMessages[idx] = { ...newMessages[idx], content: finalAssistantData.content };
                }
                return newMessages;
            });
        });

        streamHandler.onToolCalls(({ tool_calls }) => {
            finalAssistantData.tool_calls = tool_calls;
            setMessages(prev => {
                 const newMessages = [...prev];
                 const idx = newMessages.findIndex(msg => msg.role === 'assistant' && msg.isStreaming);
                 if (idx !== -1) {
                     newMessages[idx] = { ...newMessages[idx], tool_calls: finalAssistantData.tool_calls };
                 }
                 return newMessages;
            });
        });

        // Handle stream completion
        await new Promise((resolve, reject) => {
            streamHandler.onComplete((data) => {
                finalAssistantData = {
                    role: 'assistant',
                    content: data.content || '',
                    tool_calls: data.tool_calls,
                    reasoning: data.reasoning,
                    isStreaming: false
                };
                turnAssistantMessage = finalAssistantData; // Store the completed message

                setMessages(prev => {
                    const newMessages = [...prev];
                    const idx = newMessages.findIndex(msg => msg.role === 'assistant' && msg.isStreaming);
                    if (idx !== -1) {
                        newMessages[idx] = finalAssistantData; // Replace placeholder
                    } else {
                         // Should not happen if placeholder logic is correct
                         console.warn("Streaming placeholder not found for replacement.");
                         newMessages.push(finalAssistantData);
                    }
                    return newMessages;
                });
                
                // Save the complete assistant message to session
                saveMessageToSession(finalAssistantData);
                
                resolve();
            });

            streamHandler.onError(({ error }) => {
                console.error('Stream error:', error);
                // Replace placeholder with error
                setMessages(prev => {
                   const newMessages = [...prev];
                   const idx = newMessages.findIndex(msg => msg.role === 'assistant' && msg.isStreaming);
                   const errorMsg = { role: 'assistant', content: `Stream Error: ${error}`, isStreaming: false };
                   if (idx !== -1) {
                       newMessages[idx] = errorMsg;
                   } else {
                       newMessages.push(errorMsg);
                   }
                   return newMessages;
                });
                reject(new Error(error));
            });
        });

        // Clean up stream handlers
        streamHandler.cleanup();

        // Check and process tool calls if any
        if (turnAssistantMessage && turnAssistantMessage.tool_calls?.length > 0) {
            // IMPORTANT: Pass the messages *before* this assistant message was added
            const { status: toolProcessingStatus, toolResponseMessages } = await processToolCalls(
                turnAssistantMessage,
                turnMessages // Pass the input messages for this turn
            );

            turnToolResponses = toolResponseMessages; // Store responses from this turn

            if (toolProcessingStatus === 'paused') {
                currentTurnStatus = 'paused'; // Signal pause to the caller
            } else if (toolProcessingStatus === 'completed') {
                 // If tools completed, the caller might loop
                 currentTurnStatus = 'completed_with_tools';
            } else { // Handle potential errors from processToolCalls if added
                currentTurnStatus = 'error';
            }
        } else {
             // No tools, this turn is complete
             currentTurnStatus = 'completed_no_tools';
        }

    } catch (error) {
      console.error('Error in executeChatTurn:', error);
      // Ensure placeholder is replaced or an error message is added
       setMessages(prev => {
           const newMessages = [...prev];
           const idx = newMessages.findIndex(msg => msg.role === 'assistant' && msg.isStreaming);
           const errorMsg = { role: 'assistant', content: `Error: ${error.message}`, isStreaming: false };
            if (idx !== -1) {
                newMessages[idx] = errorMsg;
            } else {
                // If streaming never started, add the error message
                newMessages.push(errorMsg);
            }
           return newMessages;
       });
      currentTurnStatus = 'error';
    }

    // Return the outcome of the turn
    return {
        status: currentTurnStatus, // 'completed_no_tools', 'completed_with_tools', 'paused', 'error'
        assistantMessage: turnAssistantMessage,
        toolResponseMessages: turnToolResponses,
    };
  };

  // Handle sending message (text or structured content with images)
  const handleSendMessage = async (content) => {
    // Check if content is structured (array) or just text (string)
    const isStructuredContent = Array.isArray(content);
    const hasContent = isStructuredContent ? content.some(part => (part.type === 'text' && part.text.trim()) || part.type === 'image_url') : content.trim();

    if (!hasContent) return;

    // Format the user message based on content type
    const userMessage = {
      role: 'user',
      content: content // Assumes ChatInput now sends the correct structured format
    };
    // Add user message optimistically BEFORE the API call
    const initialMessages = [...messages, userMessage];
    setMessages(initialMessages);
    
    // Save user message to session
    saveMessageToSession(userMessage);

    setLoading(true);

    let currentApiMessages = initialMessages; // Start with messages including the new user one
    let conversationStatus = 'processing'; // Start the conversation flow

    try {
        while (conversationStatus === 'processing' || conversationStatus === 'completed_with_tools') {
            const { status, assistantMessage, toolResponseMessages } = await executeChatTurn(currentApiMessages);

            conversationStatus = status; // Update status for loop condition

            if (status === 'paused') {
                 // Pause initiated by executeChatTurn/processToolCalls
                 // Loading state remains true, waiting for modal interaction
                 break; // Exit the loop
            } else if (status === 'error') {
                 // Error occurred, stop the loop
                 break;
            } else if (status === 'completed_with_tools') {
                 // Prepare messages for the next turn ONLY if tools were completed
                 if (assistantMessage && toolResponseMessages.length > 0) {
                     // Format tool responses for the API
                     const formattedToolResponses = toolResponseMessages.map(msg => ({
                         role: 'tool',
                         content: msg.content, // Ensure this is a string
                         tool_call_id: msg.tool_call_id
                     }));
                     // Append assistant message and tool responses for the next API call
                     currentApiMessages = [
                         ...currentApiMessages,
                         { // Assistant message that included the tool calls
                            role: assistantMessage.role,
                            content: assistantMessage.content,
                            tool_calls: assistantMessage.tool_calls
                         },
                         ...formattedToolResponses
                     ];
                     // Loop continues as conversationStatus is 'completed_with_tools'
                 } else {
                     // Should not happen if status is completed_with_tools, but safety break
                     console.warn("Status 'completed_with_tools' but no assistant message or tool responses found.");
                     conversationStatus = 'error'; // Treat as error
                     break;
                 }
            } else if (status === 'completed_no_tools') {
                 // Conversation turn finished without tools, stop the loop
                 break;
            }
        } // End while loop

    } catch (error) {
        // Catch errors originating directly in handleSendMessage loop (unlikely with refactor)
        console.error('Error in handleSendMessage conversation flow:', error);
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
        conversationStatus = 'error'; // Ensure loading state is handled
    } finally {
        // Only set loading false if the conversation is not paused
        if (conversationStatus !== 'paused') {
            setLoading(false);
        }
    }
  };

  // --- Placeholder for resuming chat after modal interaction ---
  const resumeChatFlow = async (handledToolResponse) => {
     if (!pausedChatState) {
         console.error("Attempted to resume chat flow without paused state.");
         setLoading(false); // Ensure loading indicator stops
         return;
     }

     const { currentMessages, finalAssistantMessage, accumulatedResponses } = pausedChatState;
     setPausedChatState(null); // Clear the paused state

     const allResponsesForTurn = [...accumulatedResponses, handledToolResponse];

     // Find the index of the tool that caused the pause
     const pausedToolIndex = finalAssistantMessage.tool_calls.findIndex(
         tc => tc.id === handledToolResponse.tool_call_id // Match based on ID
     );

     if (pausedToolIndex === -1) {
          console.error("Could not find the paused tool call in the original message.");
          setLoading(false);
          return; // Cannot proceed
     }

     const remainingTools = finalAssistantMessage.tool_calls.slice(pausedToolIndex + 1);
     let needsPauseAgain = false;

     // Process remaining tools
     for (const nextToolCall of remainingTools) {
        const toolName = nextToolCall.function.name;
        const approvalStatus = getToolApprovalStatus(toolName);

        if (approvalStatus === 'always' || approvalStatus === 'yolo') {
            console.log(`Resuming: Tool '${toolName}' automatically approved (${approvalStatus}). Executing...`);
            try {
                const resultMsg = await executeToolCall(nextToolCall);
                allResponsesForTurn.push(resultMsg);
                setMessages(prev => [...prev, resultMsg]); // Update UI immediately
            } catch (error) {
                console.error(`Resuming: Error executing tool call '${toolName}':`, error);
                const errorMsg = { role: 'tool', content: JSON.stringify({ error: `Error executing tool '${toolName}': ${error.message}` }), tool_call_id: nextToolCall.id };
                allResponsesForTurn.push(errorMsg);
                setMessages(prev => [...prev, errorMsg]);
            }
        } else { // Needs prompt again
            console.log(`Resuming: Tool '${toolName}' requires user approval.`);
            setPendingApprovalCall(nextToolCall);
            // Save state again, including the responses gathered *during* this resume attempt
            setPausedChatState({
                currentMessages: currentMessages, // Original messages before assistant response
                finalAssistantMessage: finalAssistantMessage,
                accumulatedResponses: allResponsesForTurn // All responses UP TO this new pause
            });
            needsPauseAgain = true;
            break; // Stop processing remaining tools
        }
     }

     if (needsPauseAgain) {
        // Loading state remains true, waiting for the next modal interaction
        console.log("Chat flow paused again for the next tool.");
     } else {
        // All remaining tools were processed. Prepare for the next API call.
        console.log("All tools for the turn processed. Continuing conversation.");
        setLoading(true); // Show loading for the next API call

        const nextApiMessages = [
            ...currentMessages, // History BEFORE the assistant message with tools
            { // The assistant message itself
                role: finalAssistantMessage.role,
                content: finalAssistantMessage.content,
                tool_calls: finalAssistantMessage.tool_calls,
            },
            // Map ALL tool responses for the completed turn
            ...allResponsesForTurn.map(msg => ({
                role: 'tool',
                content: msg.content,
                tool_call_id: msg.tool_call_id
            }))
        ];

        // Continue the conversation loop by executing the next turn
        // This recursively calls the main logic, effectively continuing the loop
        // Pass the fully prepared message list for the *next* API call
        // We need to handle the loading state correctly after this returns
        try {
             // Start the next turn
             const { status: nextTurnStatus } = await executeChatTurn(nextApiMessages);
             // If the *next* turn also pauses, loading state remains true
             if (nextTurnStatus !== 'paused') {
                 setLoading(false);
             }
        } catch (error) {
            console.error("Error during resumed chat turn:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: `Error after resuming: ${error.message}` }]);
            setLoading(false); // Stop loading on error
        }
     }
  };

  // --- Placeholder for handling modal choice ---
  const handleToolApproval = async (choice, toolCall) => {
     if (!toolCall || !toolCall.id) {
         console.error("handleToolApproval called with invalid toolCall:", toolCall);
         return;
     }
     console.log(`User choice for tool '${toolCall.function.name}': ${choice}`);

     // Update localStorage based on choice
     setToolApprovalStatus(toolCall.function.name, choice);

     // Clear the pending call *before* executing/resuming
     setPendingApprovalCall(null);

     let handledToolResponse;

     if (choice === 'deny') {
         handledToolResponse = {
             role: 'tool',
             content: JSON.stringify({ error: 'Tool execution denied by user.' }),
             tool_call_id: toolCall.id
         };
         setMessages(prev => [...prev, handledToolResponse]); // Show denial in UI
         // Resume processing potential subsequent tools
         await resumeChatFlow(handledToolResponse);
     } else { // 'once', 'always', 'yolo' -> Execute the tool
         setLoading(true); // Show loading specifically for tool execution phase
         try {
             console.log(`Executing tool '${toolCall.function.name}' after user approval...`);
             handledToolResponse = await executeToolCall(toolCall);
             setMessages(prev => [...prev, handledToolResponse]); // Show result in UI
             // Resume processing potential subsequent tools
             await resumeChatFlow(handledToolResponse);
         } catch (error) {
             console.error(`Error executing approved tool call '${toolCall.function.name}':`, error);
             handledToolResponse = {
                 role: 'tool',
                 content: JSON.stringify({ error: `Error executing tool '${toolCall.function.name}' after approval: ${error.message}` }),
                 tool_call_id: toolCall.id
             };
             setMessages(prev => [...prev, handledToolResponse]); // Show error in UI
              // Still try to resume processing subsequent tools even if this one failed
             await resumeChatFlow(handledToolResponse);
         } finally {
              // Loading state will be handled by resumeChatFlow or set to false if it errors/completes fully
              // setLoading(false); // Don't set false here, resumeChatFlow handles it
         }
     }
  };

  // Disconnect from an MCP server
  const disconnectMcpServer = async (serverId) => {
    try {
      const result = await window.electron.disconnectMcpServer(serverId);
      if (result && result.success) {
        if (result.allTools) {
          setMcpTools(result.allTools);
        } else {
          // If we don't get allTools back, just filter out the tools from this server
          setMcpTools(prev => prev.filter(tool => tool.serverId !== serverId));
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error disconnecting from MCP server:', error);
      return false;
    }
  };
  
  // Reconnect to an MCP server
  const reconnectMcpServer = async (serverId) => {
    try {
      // Get server configuration from settings
      const settings = await window.electron.getSettings();
      if (!settings.mcpServers || !settings.mcpServers[serverId]) {
        console.error(`Server configuration not found for ${serverId}`);
        return false;
      }
      
      // Get the full configuration object for the server
      const serverConfig = settings.mcpServers[serverId];

      // Connect to the server
      const result = await window.electron.connectMcpServer({
        ...serverConfig, // Spread the loaded config (includes transport, url/command, args, env)
        id: serverId      // Ensure ID is explicitly included
      });

      // --- Update tools state ONLY on success ---
      if (result && result.success) {
        // Update tools based on the result
        if (result.allTools) {
          setMcpTools(result.allTools);
        } else if (result.tools) {
          // Fallback logic if allTools isn't provided but tools is
          setMcpTools(prev => {
            const filteredTools = prev.filter(tool => tool.serverId !== serverId);
            return [...filteredTools, ...(result.tools || [])];
          });
        }
        // Do NOT return true here, let the full result propagate
      }

      // Return the result object regardless of success/failure/requiresAuth
      // ToolsPanel will handle the requiresAuth flag
      return result;
    } catch (error) {
      console.error('Error reconnecting to MCP server:', error);
      // Return an error structure consistent with what ToolsPanel might expect
      return { success: false, error: error.message || 'An unknown error occurred', requiresAuth: false }; 
    }
  };

  // Add this function to explicitly refresh MCP tools
  const refreshMcpTools = async () => {
    try {
      setMcpServersStatus({ loading: true, message: "Refreshing MCP connections..." });
      
      // Get latest settings
      const settings = await window.electron.getSettings();
      
      // Manually fetch the current tools
      const mcpToolsResult = await window.electron.getMcpTools();
      
      if (mcpToolsResult && mcpToolsResult.tools) {
        setMcpTools(mcpToolsResult.tools);
        updateServerStatus(mcpToolsResult.tools, settings);
      } else {
        console.warn("No MCP tools available");
        setMcpServersStatus({ loading: false, message: "No MCP tools available" });
      }
    } catch (error) {
      console.error('Error refreshing MCP tools:', error);
      setMcpServersStatus({ loading: false, message: "Error refreshing MCP tools" });
    }
  };
  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      <header className="bg-bg-secondary border-b border-border-primary">
        <div className="max-w-7xl mx-auto py-3 px-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-text-primary">
              groq<span className="text-primary">desktop</span>
            </h1>
            {workingDirectory && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">•</span>
                <span className="text-gray-400">{workingDirectory.split('/').pop() || 'Project'}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSessionHistoryOpen(true)}
              className="btn btn-primary text-sm"
              title="Chat History"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History
            </button>
            <Link to="/settings" className="btn btn-primary text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Link>
          </div>
        </div>
      </header>
      
      <main className="flex-1 overflow-hidden flex flex-col bg-bg-primary relative">
        <div className="flex-1 overflow-y-auto px-4 pb-24">
          <div className="max-w-3xl mx-auto">
            <MessageList 
              messages={messages} 
              onToolCallExecute={executeToolCall} 
              onRemoveLastMessage={handleRemoveLastMessage} 
            />
            <div ref={messagesEndRef} />
          </div>
        </div>
        

        <ChatInput
          onSendMessage={handleSendMessage}
          loading={loading}
          visionSupported={visionSupported}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          models={models}
          onOpenTools={() => {
            setIsToolsPanelOpen(!isToolsPanelOpen);
            if (!isToolsPanelOpen) {
              refreshMcpTools();
            }
          }}
          isToolsOpen={isToolsPanelOpen}
        />
      </main>

      {isToolsPanelOpen && (
        <ToolsPanel
          tools={mcpTools}
          onClose={() => setIsToolsPanelOpen(false)}
          onDisconnectServer={disconnectMcpServer}
          onReconnectServer={reconnectMcpServer}
        />
      )}

      {/* --- Tool Approval Modal --- */}
      {pendingApprovalCall && (
        <ToolApprovalModal
          toolCall={pendingApprovalCall}
          onApprove={handleToolApproval}
        />
      )}
      {/* --- End Tool Approval Modal --- */}
      
      <SessionHistory 
        isOpen={isSessionHistoryOpen}
        onClose={() => setIsSessionHistoryOpen(false)}
      />
    </div>
  );
}

export default App; 