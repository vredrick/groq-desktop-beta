import { useState, useRef } from 'react';
import { useChat } from '../context/ChatContext';

export const useChatExecution = () => {
  const [loading, setLoading] = useState(false);
  const currentStreamHandlerRef = useRef(null);
  const { saveMessageToSession, saveToolResultToSession } = useChat();

  const executeToolCall = async (toolCall) => {
    try {
      // Validate tool call has an ID
      if (!toolCall.id) {
        console.error('Tool call missing ID:', toolCall);
        throw new Error('Tool call must have an ID');
      }
      
      const response = await window.electron.executeToolCall(toolCall);
      
      // Save the tool result to session with the tool call ID
      console.log('Saving tool result with ID:', toolCall.id);
      await saveToolResultToSession(toolCall.function.name, response.error || response.result || '', toolCall.id);
      
      // Return the tool response message in the correct format
      return {
        role: 'tool',
        content: response.error ? JSON.stringify({ error: response.error }) : (response.result || ''),
        tool_call_id: toolCall.id
      };
    } catch (error) {
      console.error('Error executing tool call:', error);
      // Save the error as a tool result
      await saveToolResultToSession(toolCall.function.name, error.message, toolCall.id);
      
      return { 
        role: 'tool', 
        content: JSON.stringify({ error: error.message }),
        tool_call_id: toolCall.id
      };
    }
  };

  const stopStream = () => {
    if (currentStreamHandlerRef.current) {
      console.log('Stopping current stream...');
      // Clean up the stream
      currentStreamHandlerRef.current.cleanup();
      currentStreamHandlerRef.current = null;
      
      // Set loading to false
      setLoading(false);
    }
  };

  return {
    loading,
    setLoading,
    currentStreamHandlerRef,
    executeToolCall,
    stopStream,
    saveMessageToSession
  };
};