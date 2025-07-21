import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

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

  // Save tool call to session
  const saveToolCallToSession = useCallback(async (toolCall) => {
    if (!workingDirectory || !currentSessionFile) return;
    
    try {
      await window.electron.saveToolCall(toolCall);
    } catch (error) {
      console.error('Error saving tool call to session:', error);
    }
  }, [workingDirectory, currentSessionFile]);

  // Save tool result to session
  const saveToolResultToSession = useCallback(async (toolName, result) => {
    if (!workingDirectory || !currentSessionFile) return;
    
    try {
      await window.electron.saveToolResult(toolName, result);
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
        let pendingToolCalls = [];
        
        for (const item of result.messages) {
          if (item.type === 'message') {
            // Regular message (user or assistant)
            loadedMessages.push({
              role: item.role,
              content: item.content,
              ...(item.tool_calls && { tool_calls: item.tool_calls }),
              ...(item.reasoning && { reasoning: item.reasoning })
            });
          } else if (item.type === 'tool_call') {
            // Store tool call for later processing
            pendingToolCalls.push(item);
          } else if (item.type === 'tool_result') {
            // Match tool result with its call
            const matchingCall = pendingToolCalls.find(tc => tc.name === item.tool);
            if (matchingCall) {
              // Add tool result as a message
              loadedMessages.push({
                role: 'tool',
                content: item.result,
                tool_call_id: matchingCall.id || `tool_${Date.now()}`
              });
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
    saveToolCallToSession,
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