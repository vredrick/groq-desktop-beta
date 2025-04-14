import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import ToolsPanel from './components/ToolsPanel';
// Import shared model definitions - REMOVED
// import { MODEL_CONTEXT_SIZES } from '../../shared/models';


function App() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [mcpTools, setMcpTools] = useState([]);
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(false);
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
      const response = await window.electron.executeToolCall(toolCall);
      
      // Return the tool response message in the correct format
      return {
        role: 'tool',
        content: response.error ? JSON.stringify({ error: response.error }) : (response.result || ''),
        tool_call_id: toolCall.id
      };
    } catch (error) {
      console.error('Error executing tool call:', error);
      return { 
        role: 'tool', 
        content: JSON.stringify({ error: error.message }),
        tool_call_id: toolCall.id
      };
    }
  };

  const processToolCalls = async (assistantMessage) => {
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      return [];
    }
    
    try {
      // Execute all tool calls in parallel and collect their response messages
      const toolResponseMessages = await Promise.all(
        assistantMessage.tool_calls.map(toolCall => executeToolCall(toolCall))
      );
      
      return toolResponseMessages;
    } catch (error) {
      console.error('Error processing tool calls:', error);
      return [];
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

  // Handle sending message (text or structured content with images)
  const handleSendMessage = async (content) => {
    // Check if content is structured (array) or just text (string)
    const isStructuredContent = Array.isArray(content);
    const hasContent = isStructuredContent ? content.some(part => (part.type === 'text' && part.text.trim()) || part.type === 'image_url') : content.trim();

    if (!hasContent) return;

    // Format the user message based on content type
    const userMessage = {
      role: 'user',
      // Content is either the direct structured array or needs to be formatted
      content: content // Assumes ChatInput now sends the correct structured format
    };
    setMessages(prev => [...prev, userMessage]);

    // Set loading state
    setLoading(true);
    
    try {
      // Get the updated messages array including the new user message
      const updatedMessages = [...messages, userMessage];
      
      // Format all messages for API - no need to filter reasoning since main.js will handle it
      const messageHistory = updatedMessages;
      
      let currentMessages = messageHistory;
      let hasToolCalls = false;
      
      do {
        try {
          // Create a streaming assistant message placeholder
          const assistantMessage = { 
            role: 'assistant', 
            content: '',
            isStreaming: true
          };
          
          // Add the empty assistant message that will be updated as we stream
          setMessages(prev => [...prev, assistantMessage]);
          
          // Start streaming chat
          const streamHandler = window.electron.startChatStream(currentMessages, selectedModel);
          
          // Collect the final message data
          let finalAssistantMessage = {
            role: 'assistant',
            content: '',
            tool_calls: undefined,
            reasoning: undefined
          };
          
          // Setup event handlers for streaming
          streamHandler.onStart(() => {
            // Message started streaming, already created the placeholder
          });
          
          streamHandler.onContent(({ content }) => {
            // Update content as it streams in
            finalAssistantMessage.content += content;
            
            // Update the message in state
            setMessages(prev => {
              const newMessages = [...prev];
              // Find the last assistant message which is the streaming one
              const lastAssistantIndex = newMessages.findIndex(
                msg => msg.role === 'assistant' && msg.isStreaming
              );
              
              if (lastAssistantIndex !== -1) {
                newMessages[lastAssistantIndex] = {
                  ...newMessages[lastAssistantIndex],
                  content: finalAssistantMessage.content
                };
              }
              return newMessages;
            });
          });
          
          streamHandler.onToolCalls(({ tool_calls }) => {
            // Update the tool calls
            finalAssistantMessage.tool_calls = tool_calls;
            
            // Update the message in state to show tool calls in progress
            setMessages(prev => {
              const newMessages = [...prev];
              const lastAssistantIndex = newMessages.findIndex(
                msg => msg.role === 'assistant' && msg.isStreaming
              );
              
              if (lastAssistantIndex !== -1) {
                newMessages[lastAssistantIndex] = {
                  ...newMessages[lastAssistantIndex],
                  tool_calls: finalAssistantMessage.tool_calls
                };
              }
              return newMessages;
            });
          });
          
          // Handle stream completion
          await new Promise((resolve, reject) => {
            streamHandler.onComplete((data) => {
              // Update the final message with all data
              finalAssistantMessage = {
                role: 'assistant',
                content: data.content || '',
                tool_calls: data.tool_calls,
                reasoning: data.reasoning
              };
              
              // Replace the streaming message with the final version
              setMessages(prev => {
                const newMessages = [...prev];
                const lastAssistantIndex = newMessages.findIndex(
                  msg => msg.role === 'assistant' && msg.isStreaming
                );
                
                if (lastAssistantIndex !== -1) {
                  newMessages[lastAssistantIndex] = finalAssistantMessage;
                }
                return newMessages;
              });
              
              resolve();
            });
            
            streamHandler.onError(({ error }) => {
              console.error('Stream error:', error);
              reject(new Error(error));
            });
          });
          
          // Clean up stream handlers
          streamHandler.cleanup();
          
          // Check if there are tool calls to process
          hasToolCalls = finalAssistantMessage.tool_calls && finalAssistantMessage.tool_calls.length > 0;
          
          if (hasToolCalls) {
            // Process all tool calls and collect tool response messages
            const toolResponseMessages = await processToolCalls(finalAssistantMessage);
            
            // Add all tool response messages to the state
            setMessages(prev => [...prev, ...toolResponseMessages]);
            
            // Update current messages for the next API call if needed - ensure tool messages are included as separate messages
            currentMessages = [
              ...currentMessages,
              { // The assistant message that might contain tool calls
                role: finalAssistantMessage.role,
                content: finalAssistantMessage.content, // Ensure this is a string
                tool_calls: finalAssistantMessage.tool_calls
              },
              // Map tool responses to the correct format
              ...toolResponseMessages.map(msg => ({
                role: 'tool',
                content: msg.content, // Ensure this is a string
                tool_call_id: msg.tool_call_id
              }))
            ];
          }
        } catch (error) {
          console.error('Error in streaming chat:', error);
          setMessages(prev => {
            const newMessages = [...prev];
            // Find the streaming message to replace with an error
            const streamingMsgIndex = newMessages.findIndex(
              msg => msg.role === 'assistant' && msg.isStreaming
            );
            
            if (streamingMsgIndex !== -1) {
              // Replace the streaming message with an error message
              newMessages[streamingMsgIndex] = {
                role: 'assistant',
                content: `Error: ${error.message}`,
                isStreaming: false
              };
            } else {
              // Add a new error message if we can't find the streaming one
              newMessages.push({
                role: 'assistant',
                content: `Error: ${error.message}`
              });
            }
            return newMessages;
          });
          // Stop the loop
          hasToolCalls = false;
        }
      } while (hasToolCalls);
      
    } catch (error) {
      console.error('Error in conversation flow:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
    } finally {
      setLoading(false);
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
      
      // Connect to the server
      const result = await window.electron.connectMcpServer({
        id: serverId,
        command: settings.mcpServers[serverId].command,
        args: settings.mcpServers[serverId].args || [],
        env: settings.mcpServers[serverId].env || {}
      });
      
      if (result && result.success) {
        // Make sure allTools exists before updating state
        if (result.allTools) {
          setMcpTools(result.allTools);
        } else if (result.tools) {
          // If allTools is missing but we have tools, use those
          setMcpTools(prev => {
            // Filter out tools from the same serverId and add new ones
            const filteredTools = prev.filter(tool => tool.serverId !== serverId);
            return [...filteredTools, ...(result.tools || [])];
          });
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error reconnecting to MCP server:', error);
      return false;
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
    <div className="flex flex-col h-screen">
      <header className="bg-user-message-bg shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl text-white">
            groq<span className="text-primary">desktop</span>
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <label htmlFor="model-select" className="mr-3 text-gray-300 font-medium">Model:</label>
              <select
                id="model-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="border border-gray-500 rounded-md bg-transparent text-white"
              >
                {models.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
            <Link to="/settings" className="btn btn-primary">Settings</Link>
          </div>
        </div>
      </header>
      
      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-2">
          <MessageList 
            messages={messages} 
            onToolCallExecute={executeToolCall} 
            onRemoveLastMessage={handleRemoveLastMessage} 
          />
          <div ref={messagesEndRef} />
        </div>
        
        <div className="bg-user-message-bg p-2">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="tools-container">
                  <div 
                    className="tools-button"
                    onClick={() => {
                      setIsToolsPanelOpen(!isToolsPanelOpen);
                      // Force refresh of MCP tools when opening panel
                      if (!isToolsPanelOpen) {
                        refreshMcpTools();
                      }
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  {mcpServersStatus.loading && (
                    <div className="status-indicator loading">
                      <div className="loading-spinner"></div>
                      <span>{mcpServersStatus.message}</span>
                    </div>
                  )}
                  {!mcpServersStatus.loading && (
                    <div className="status-indicator">
                      <span>{mcpServersStatus.message || "No tools available"}</span>
                      <button 
                        className="refresh-button" 
                        onClick={refreshMcpTools}
                        title="Refresh MCP tools"
                      >
                        <span>↻</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <ChatInput
              onSendMessage={handleSendMessage}
              loading={loading}
              visionSupported={visionSupported}
            />
          </div>
        </div>
      </main>

      {isToolsPanelOpen && (
        <ToolsPanel
          tools={mcpTools}
          onClose={() => setIsToolsPanelOpen(false)}
          onDisconnectServer={disconnectMcpServer}
          onReconnectServer={reconnectMcpServer}
        />
      )}
    </div>
  );
}

export default App; 