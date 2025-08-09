// React hooks
import { useCallback, useRef, useState } from 'react';

// Local context and services
import { useChat } from '../context/ChatContext';
import { ChatFlowStateMachine, ChatFlowStates, ChatFlowEvents } from '../services/ChatFlowStateMachine';

// Utilities
import { setToolApprovalStatus } from '../utils/toolApproval';

export const useChatFlow = (selectedModel) => {
  const { messages, setMessages, saveMessageToSession, saveToolResultToSession } = useChat();
  const [loading, setLoading] = useState(false);
  const [pendingApprovalCall, setPendingApprovalCall] = useState(null);
  const [pausedChatState, setPausedChatState] = useState(null);
  const currentStreamHandlerRef = useRef(null);
  const stateMachineRef = useRef(null);

  // Initialize state machine with callbacks
  if (!stateMachineRef.current) {
    stateMachineRef.current = new ChatFlowStateMachine({
      onStartStreaming: async (context) => {
        const { messages: turnMessages, selectedModel } = context;
        await startStreaming(turnMessages, selectedModel);
      },
      onAwaitingApproval: (context) => {
        const { tool } = context;
        setPendingApprovalCall(tool);
        setPausedChatState(context.pausedState);
      },
      onExecuteTool: async (context) => {
        const { tool } = context;
        const result = await executeToolCall(tool);
        stateMachineRef.current.handleToolResult(result);
      },
      onCompleted: (context) => {
        // Use the latest state machine context (contains assistantMessage/messages)
        const ctx = stateMachineRef.current?.currentContext || {};
        const processedTools = ctx.processedTools || context.processedTools || [];
        const hadToolCalls = Array.isArray(ctx.assistantMessage?.tool_calls) && ctx.assistantMessage.tool_calls.length > 0;

        if (hadToolCalls && processedTools.length > 0) {
          // Continue exactly once with tool results
          const nextMessages = buildNextTurnMessages({ ...ctx, processedTools });
          stateMachineRef.current.transition(ChatFlowEvents.CONTINUE_CONVERSATION, {
            messages: nextMessages
          });
        } else {
          // No follow-up needed; finalize turn
          setLoading(false);
          if (stateMachineRef.current?.currentContext) {
            // Clear any stale tool state to avoid accidental re-entry
            stateMachineRef.current.currentContext.processedTools = [];
            stateMachineRef.current.currentContext.toolQueue = [];
          }
          // Reset state machine to IDLE
          stateMachineRef.current.reset();
        }
      },
      onError: (context) => {
        setLoading(false);
        console.error('Chat flow error:', context.error);
        // Reset state machine to IDLE after error
        stateMachineRef.current.reset();
      }
    });
  }

  const executeToolCall = async (toolCall) => {
    try {
      if (!toolCall.id) {
        throw new Error('Tool call must have an ID');
      }
      
      const response = await window.electron.executeToolCall(toolCall);
      
      // Save the tool result to session
      await saveToolResultToSession(
        toolCall.function.name, 
        response.error || response.result || '', 
        toolCall.id
      );
      
      const toolResult = {
        role: 'tool',
        content: response.error ? JSON.stringify({ error: response.error }) : (response.result || ''),
        tool_call_id: toolCall.id
      };
      
      // Update UI immediately
      setMessages(prev => [...prev, toolResult]);
      
      return toolResult;
    } catch (error) {
      console.error('Error executing tool call:', error);
      await saveToolResultToSession(toolCall.function.name, error.message, toolCall.id);
      
      const errorResult = { 
        role: 'tool', 
        content: JSON.stringify({ error: error.message }),
        tool_call_id: toolCall.id
      };
      
      setMessages(prev => [...prev, errorResult]);
      return errorResult;
    }
  };

  const startStreaming = async (turnMessages, selectedModel) => {
    const assistantPlaceholder = {
      role: 'assistant',
      content: '',
      isStreaming: true
    };
    setMessages(prev => [...prev, assistantPlaceholder]);

    const streamHandler = window.electron.startChatStream(turnMessages, selectedModel);
    currentStreamHandlerRef.current = streamHandler;

    let finalAssistantData = {
      role: 'assistant',
      content: '',
      tool_calls: undefined,
      reasoning: undefined
    };

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

    return new Promise((resolve, reject) => {
      streamHandler.onComplete((data) => {
        finalAssistantData = {
          role: 'assistant',
          content: data.content || '',
          tool_calls: data.tool_calls,
          reasoning: data.reasoning,
          isStreaming: false
        };

        setMessages(prev => {
          const newMessages = [...prev];
          const idx = newMessages.findIndex(msg => msg.role === 'assistant' && msg.isStreaming);
          if (idx !== -1) {
            newMessages[idx] = finalAssistantData;
          }
          return newMessages;
        });
        
        saveMessageToSession(finalAssistantData);
        streamHandler.cleanup();
        currentStreamHandlerRef.current = null;

        // Check if we have tool calls
        if (data.tool_calls?.length > 0) {
          stateMachineRef.current.currentContext = {
            ...stateMachineRef.current.currentContext,
            toolQueue: data.tool_calls,
            assistantMessage: finalAssistantData,
            messages: turnMessages
          };
          stateMachineRef.current.transition(ChatFlowEvents.STREAM_COMPLETE);
        } else {
          // No tool calls, so we can complete immediately
          stateMachineRef.current.currentContext = {
            ...stateMachineRef.current.currentContext,
            assistantMessage: finalAssistantData,
            messages: turnMessages
          };
          stateMachineRef.current.transition(ChatFlowEvents.STREAM_COMPLETE);
          // Transition immediately to completed since there are no tools to process
          stateMachineRef.current.transition(ChatFlowEvents.ALL_TOOLS_PROCESSED);
        }
        
        resolve(finalAssistantData);
      });

      streamHandler.onError(({ error }) => {
        console.error('Stream error:', error);
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
        streamHandler.cleanup();
        currentStreamHandlerRef.current = null;
        stateMachineRef.current.transition(ChatFlowEvents.STREAM_ERROR, { error });
        reject(new Error(error));
      });
    });
  };

  const buildNextTurnMessages = (context) => {
    const { messages: previousMessages, assistantMessage, processedTools = [] } = context;
    
    const formattedToolResponses = processedTools
      .filter(pt => pt.result)
      .map(pt => ({
        role: 'tool',
        content: pt.result.content,
        tool_call_id: pt.result.tool_call_id
      }));

    return [
      ...previousMessages,
      {
        role: assistantMessage.role,
        content: assistantMessage.content,
        tool_calls: assistantMessage.tool_calls
      },
      ...formattedToolResponses
    ];
  };

  const sendMessage = useCallback(async (content) => {
    const hasContent = Array.isArray(content) 
      ? content.some(part => (part.type === 'text' && part.text.trim()) || part.type === 'image_url')
      : content.trim();

    if (!hasContent) return;

    const userMessage = {
      role: 'user',
      content: content
    };
    
    const initialMessages = [...messages, userMessage];
    setMessages(initialMessages);
    saveMessageToSession(userMessage);
    setLoading(true);

    stateMachineRef.current.transition(ChatFlowEvents.SEND_MESSAGE, {
      messages: initialMessages,
      selectedModel: selectedModel
    });
  }, [messages, saveMessageToSession, selectedModel]);

  const handleToolApproval = useCallback(async (choice, toolCall) => {
    if (!toolCall || !toolCall.id) {
      console.error("handleToolApproval called with invalid toolCall:", toolCall);
      return;
    }

    // Update localStorage based on choice
    setToolApprovalStatus(toolCall.function.name, choice);
    
    // Clear the pending approval
    setPendingApprovalCall(null);

    if (choice === 'deny') {
      stateMachineRef.current.handleToolApproval(false, toolCall);
    } else {
      setLoading(true);
      stateMachineRef.current.handleToolApproval(true, toolCall);
    }
  }, []);

  const stopStream = useCallback(() => {
    if (currentStreamHandlerRef.current) {
      console.log('Stopping current stream...');
      currentStreamHandlerRef.current.cleanup();
      currentStreamHandlerRef.current = null;
    }

    // Always clear loading, even if no active stream handler (e.g., stuck states)
    setLoading(false);

    // If a streaming placeholder exists, mark it stopped
    setMessages(prev => {
      const newMessages = [...prev];
      const idx = newMessages.findIndex(msg => msg.role === 'assistant' && msg.isStreaming);
      if (idx !== -1) {
        newMessages[idx] = { 
          ...newMessages[idx], 
          content: (newMessages[idx].content || '') + ' [Stopped]',
          isStreaming: false 
        };
      }
      return newMessages;
    });

    stateMachineRef.current.transition(ChatFlowEvents.STOP);
  }, [setMessages]);

  return {
    loading,
    pendingApprovalCall,
    sendMessage,
    handleToolApproval,
    stopStream,
    executeToolCall
  };
};
