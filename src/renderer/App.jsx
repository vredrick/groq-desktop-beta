import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import ToolsPanel from './components/ToolsPanel';

function App() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [mcpTools, setMcpTools] = useState([]);
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(false);
  const [mcpServersStatus, setMcpServersStatus] = useState({ loading: false, message: "" });
  const messagesEndRef = useRef(null);
  
  const models = [
    'llama-3.3-70b-versatile',
    'llama-3.3-70b-specdec',
    'qwen-qwq-32b',
    'qwen-2.5-32b',
    'deepseek-r1-distill-llama-70b',
    'deepseek-r1-distill-llama-70b-specdec'
  ];

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

  // Load settings and MCP tools when component mounts
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Set loading status
        setMcpServersStatus({ loading: true, message: "Connecting to MCP servers..." });
        
        // Load settings
        const settings = await window.electron.getSettings();
        if (settings && settings.model) {
          setSelectedModel(settings.model);
        }
        
        // Initial load of MCP tools
        const mcpToolsResult = await window.electron.getMcpTools();
        if (mcpToolsResult && mcpToolsResult.tools) {
          setMcpTools(mcpToolsResult.tools);
          updateServerStatus(mcpToolsResult.tools, settings);
        }
        
        // Set up event listener for MCP server status changes
        const removeListener = window.electron.onMcpServerStatusChanged((data) => {
          if (data.tools) {
            setMcpTools(data.tools);
            updateServerStatus(data.tools, settings);
          }
        });
        
        // Clean up the event listener when component unmounts
        return () => {
          if (removeListener) removeListener();
        };
      } catch (error) {
        console.error('Error loading settings:', error);
        setMcpServersStatus({ loading: false, message: "Error loading settings" });
      }
    };
    
    loadSettings();
  }, []);

  // Save model selection to settings when it changes
  useEffect(() => {
    const saveModelSelection = async () => {
      try {
        const settings = await window.electron.getSettings();
        await window.electron.saveSettings({ ...settings, model: selectedModel });
      } catch (error) {
        console.error('Error saving model selection:', error);
      }
    };
    
    saveModelSelection();
  }, [selectedModel]);

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

  const handleSendMessage = async (content) => {
    if (!content.trim()) return;
    
    // Add user message
    const userMessage = { role: 'user', content };
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
              {
                role: finalAssistantMessage.role,
                content: finalAssistantMessage.content,
                tool_calls: finalAssistantMessage.tool_calls
              },
              ...toolResponseMessages.map(msg => ({
                role: 'tool',
                content: msg.content, 
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
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Groq Desktop</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <label htmlFor="model-select" className="mr-3 text-gray-700 dark:text-gray-300 font-medium">Model:</label>
              <select
                id="model-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="border border-gray-300 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
        <div className="flex-1 overflow-y-auto p-4">
          <MessageList messages={messages} onToolCallExecute={executeToolCall} />
          <div ref={messagesEndRef} />
        </div>
        
        <div className="border-t dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
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

            <ChatInput onSendMessage={handleSendMessage} loading={loading} />
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