import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ToolCall from './ToolCall';

function Message({ message, children, onToolCallExecute, allMessages, isLastMessage, onRemoveMessage }) {
  const { role, tool_calls, reasoning, isStreaming } = message;
  const [showReasoning, setShowReasoning] = useState(false);
  const isUser = role === 'user';
  const hasReasoning = reasoning && !isUser;
  const isStreamingMessage = isStreaming === true;

  // Find tool results for this message's tool calls in the messages array
  const findToolResult = (toolCallId) => {
    if (!allMessages) return null;
    
    // Look for a tool message that matches this tool call ID
    const toolMessage = allMessages.find(
      msg => msg.role === 'tool' && msg.tool_call_id === toolCallId
    );
    
    return toolMessage ? toolMessage.content : null;
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} relative group`}>
      <div 
        className={`rounded-lg px-4 py-2 max-w-[80%] ${
          isUser 
            ? 'bg-user-message-bg text-white'
            : isStreamingMessage 
              ? 'streaming-message'
              : ''
        }`}
      >
        {isLastMessage && onRemoveMessage && (
          <button 
            onClick={onRemoveMessage}
            className={`absolute ${isUser ? 'right-0 translate-x-1/2' : 'left-0 -translate-x-1/2'} top-0 -translate-y-1/2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 z-10 shadow-md`}
            title="Remove message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {isStreamingMessage && (
          <div className="streaming-indicator mb-1">
            <span className="dot-1"></span>
            <span className="dot-2"></span>
            <span className="dot-3"></span>
          </div>
        )}
        <div className={`message-content-wrapper ${isUser ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
          {children}
        </div>
        
        {tool_calls && tool_calls.map((toolCall, index) => (
          <ToolCall 
            key={toolCall.id || index} 
            toolCall={toolCall} 
            toolResult={findToolResult(toolCall.id)}
          />
        ))}

        {hasReasoning && (
          <div className="mt-3 border-t border-gray-300 dark:border-gray-600 pt-2">
            <button 
              onClick={() => setShowReasoning(!showReasoning)}
              className="flex items-center text-sm px-3 py-1 rounded-md bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors duration-200"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`h-4 w-4 mr-1 transition-transform duration-200 ${showReasoning ? 'rotate-90' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {showReasoning ? 'Hide reasoning' : 'Show reasoning'}
            </button>
            
            {showReasoning && (
              <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-sm border border-gray-300 dark:border-gray-600">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {reasoning}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Message; 