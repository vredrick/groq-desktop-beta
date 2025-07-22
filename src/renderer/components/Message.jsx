import React, { useState } from 'react';
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

  const messageClasses = `flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`;
  // Updated styling for messages
  const bubbleStyle = isUser 
    ? 'bg-surface-secondary border border-border-primary' 
    : ''; // No background/border for assistant
  const bubbleClasses = `relative px-4 py-3 rounded-xl max-w-3xl ${bubbleStyle} group`;
  const wrapperClasses = `message-content-wrapper text-text-primary break-words`;

  const toggleReasoning = () => setShowReasoning(!showReasoning);

  return (
    <div className={messageClasses}>
      <div className={bubbleClasses}>
        {isLastMessage && onRemoveMessage && (
          <button 
            onClick={onRemoveMessage}
            className={`absolute ${isUser ? 'right-2' : 'left-2'} -top-2 bg-error text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-error/80 hover:scale-110 z-10`}
            title="Remove message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {isStreamingMessage && (
          <div className="streaming-indicator">
            <span className="dot-1"></span>
            <span className="dot-2"></span>
            <span className="dot-3"></span>
          </div>
        )}
        <div className={wrapperClasses}>
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
          <div className="reasoning-section">
            <button 
              onClick={toggleReasoning}
              className="reasoning-toggle"
            >
              {showReasoning ? 'Hide reasoning' : 'Show reasoning'}
            </button>
            
            {showReasoning && (
              <div className="reasoning-content">
                <pre className="whitespace-pre-wrap break-words font-mono text-xs">{reasoning}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Message; 