import { createContext, useState, useContext, useEffect, useCallback } from 'react';

// Create the context
const ChatContext = createContext();

// Create a provider component
export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [workingDirectory, setWorkingDirectory] = useState(null);
  const [currentSessionFile, setCurrentSessionFile] = useState(null);
  const [sessionMetadata, setSessionMetadata] = useState(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  
  // Check for existing working directory on mount
  useEffect(() => {
    const checkExistingDirectory = async () => {
      try {
        const currentDir = await window.electron.getCurrentDirectory();
        if (currentDir) {
          setWorkingDirectory(currentDir);
        }
      } catch (error) {
        console.error('Error checking existing directory:', error);
      }
    };
    checkExistingDirectory();
  }, []);

  // Initialize session when working directory changes
  useEffect(() => {
    if (workingDirectory) {
      initializeSession();
    }
  }, [workingDirectory]);

  // Initialize session - load or create
  const initializeSession = async () => {
    try {
      // Get or create current session for the working directory
      const sessionResult = await window.electron.getCurrentSession();
      if (sessionResult.success) {
        setCurrentSessionFile(sessionResult.sessionFile);
        // Load existing messages from session
        await loadSessionFromFile(sessionResult.sessionFile);
      }
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  };

  // Save message to session file
  const saveMessageToSession = useCallback(async (message) => {
    if (!workingDirectory || !currentSessionFile) return;
    
    try {
      // Clean up message before saving (remove UI-specific properties)
      const cleanMessage = {
        role: message.role,
        content: message.content,
        ...(message.tool_calls && { tool_calls: message.tool_calls }),
        ...(message.tool_call_id && { tool_call_id: message.tool_call_id }),
        ...(message.reasoning && { reasoning: message.reasoning })
      };
      
      // Don't save streaming placeholders
      if (message.isStreaming) {
        return;
      }
      
      console.log('Saving message to session:', cleanMessage);
      await window.electron.saveMessage(cleanMessage);
    } catch (error) {
      console.error('Error saving message to session:', error);
    }
  }, [workingDirectory, currentSessionFile]);

  // Tool calls are now saved as part of assistant messages, not separately
  // Removed saveToolCallToSession to prevent duplicate saving

  // Save tool result to session
  const saveToolResultToSession = useCallback(async (toolName, result, toolCallId) => {
    if (!workingDirectory || !currentSessionFile) return;
    
    try {
      await window.electron.saveToolResult(toolName, result, toolCallId);
    } catch (error) {
      console.error('Error saving tool result to session:', error);
    }
  }, [workingDirectory, currentSessionFile]);

  // Load session from file
  const loadSessionFromFile = async (sessionFile) => {
    setIsLoadingSession(true);
    try {
      const result = await window.electron.loadSession(sessionFile);
      if (result.success) {
        // Convert session data to messages format
        const loadedMessages = [];
        const toolCallsMap = new Map(); // Map tool call IDs to tool calls
        const toolResultsMap = new Map(); // Map tool call IDs to results
        
        // First pass: collect all tool results
        console.log('Loading session with', result.messages.length, 'entries');
        const orphanedToolResults = []; // Store tool results without IDs
        
        for (const item of result.messages) {
          if (item.type === 'tool_result') {
            console.log('Found tool result:', { 
              tool: item.tool, 
              tool_call_id: item.tool_call_id,
              resultLength: item.result?.length 
            });
            
            if (item.tool_call_id) {
              toolResultsMap.set(item.tool_call_id, item);
            } else {
              console.warn('Tool result without tool_call_id - will try to match by position');
              orphanedToolResults.push(item);
            }
          }
        }
        console.log('Tool results collected:', toolResultsMap.size, 'orphaned:', orphanedToolResults.length);
        
        // Second pass: reconstruct messages
        for (const item of result.messages) {
          if (item.type === 'message') {
            const message = {
              role: item.role,
              content: item.content,
              ...(item.tool_calls && { tool_calls: item.tool_calls }),
              ...(item.reasoning && { reasoning: item.reasoning })
            };
            
            // Add the message
            loadedMessages.push(message);
            
            // If this is an assistant message with tool calls, add the corresponding tool results
            if (item.role === 'assistant' && item.tool_calls && item.tool_calls.length > 0) {
              console.log(`Assistant message has ${item.tool_calls.length} tool calls:`, 
                item.tool_calls.map(tc => ({ id: tc.id, name: tc.function?.name }))
              );
              
              for (let i = 0; i < item.tool_calls.length; i++) {
                const toolCall = item.tool_calls[i];
                const toolResult = toolResultsMap.get(toolCall.id);
                
                if (toolResult) {
                  console.log(`Found tool result for ${toolCall.id}`);
                  loadedMessages.push({
                    role: 'tool',
                    content: toolResult.result,
                    tool_call_id: toolCall.id
                  });
                } else if (orphanedToolResults.length > 0) {
                  // Try to match orphaned tool results by position
                  console.warn(`No tool result found for tool call ${toolCall.id} (${toolCall.function?.name}), attempting to match by position`);
                  const orphanedResult = orphanedToolResults.shift(); // Take the first orphaned result
                  if (orphanedResult) {
                    console.log(`Matched orphaned tool result to tool call ${toolCall.id}`);
                    loadedMessages.push({
                      role: 'tool',
                      content: orphanedResult.result,
                      tool_call_id: toolCall.id // Assign the ID from the tool call
                    });
                  }
                } else {
                  console.warn(`No tool result found for tool call ${toolCall.id} (${toolCall.function?.name})`);
                }
              }
            }
          }
        }
        
        console.log('Loaded messages from session:', loadedMessages);
        setMessages(loadedMessages);
        setCurrentSessionFile(sessionFile);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setIsLoadingSession(false);
    }
  };

  // Start a new session
  const startNewSession = async () => {
    if (!workingDirectory) {
      console.error('No working directory selected');
      return;
    }
    
    try {
      const result = await window.electron.createNewSession();
      if (result.success) {
        setCurrentSessionFile(result.sessionFile);
        setMessages([]);
        setSessionMetadata({
          created: new Date(),
          messageCount: 0
        });
      }
    } catch (error) {
      console.error('Error creating new session:', error);
    }
  };

  // Select working directory
  const selectWorkingDirectory = async () => {
    try {
      const result = await window.electron.selectWorkingDirectory();
      if (result.success) {
        setWorkingDirectory(result.directory);
        // Get or create session for new directory
        const sessionResult = await window.electron.getCurrentSession();
        if (sessionResult.success) {
          setCurrentSessionFile(sessionResult.sessionFile);
          await loadSessionFromFile(sessionResult.sessionFile);
        }
      }
      return result;
    } catch (error) {
      console.error('Error selecting working directory:', error);
      return { success: false, message: error.message };
    }
  };

  // Get list of sessions for current project
  const listSessions = async () => {
    if (!workingDirectory) return [];
    
    try {
      const result = await window.electron.listSessions();
      if (result.success) {
        return result.sessions;
      }
    } catch (error) {
      console.error('Error listing sessions:', error);
    }
    return [];
  };

  // Delete a session
  const deleteSession = async (sessionFile) => {
    try {
      const result = await window.electron.deleteSession(sessionFile);
      if (result.success && sessionFile === currentSessionFile) {
        // If we deleted the current session, create a new one
        await startNewSession();
      }
      return result;
    } catch (error) {
      console.error('Error deleting session:', error);
      return { success: false, message: error.message };
    }
  };

  // Export session as markdown
  const exportSession = async (sessionFile) => {
    try {
      const result = await window.electron.exportSession(sessionFile);
      return result;
    } catch (error) {
      console.error('Error exporting session:', error);
      return { success: false, message: error.message };
    }
  };

  // Enhanced setMessages that also saves to session
  const setMessagesWithSave = useCallback((newMessages) => {
    setMessages((prevMessages) => {
      const updated = typeof newMessages === 'function' ? newMessages(prevMessages) : newMessages;
      
      // Don't save during state updates, let the component handle saving explicitly
      return updated;
    });
  }, []);

  // Provide the state and setter to children
  const value = {
    messages,
    setMessages: setMessagesWithSave,
    workingDirectory,
    setWorkingDirectory,
    currentSessionFile,
    sessionMetadata,
    isLoadingSession,
    // Session methods
    saveMessageToSession,
    saveToolResultToSession,
    loadSessionFromFile,
    startNewSession,
    selectWorkingDirectory,
    listSessions,
    deleteSession,
    exportSession,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// Create a custom hook for easy context consumption
export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}; 