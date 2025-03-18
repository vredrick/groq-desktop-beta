import React from 'react';
import Message from './Message';

function MessageList({ messages = [], onToolCallExecute }) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <p className="text-center max-w-md">
          Send a message to start a conversation with Groq
        </p>
      </div>
    );
  }

  // Filter out tool messages as they're displayed as part of tool calls in assistant messages
  const displayMessages = messages.filter(message => message.role !== 'tool');

  return (
    <div className="space-y-4">
      {displayMessages.map((message, index) => (
        <Message 
          key={index} 
          message={message} 
          onToolCallExecute={onToolCallExecute}
          allMessages={messages} // Still pass all messages including tools for result lookup
        />
      ))}
    </div>
  );
}

export default MessageList; 