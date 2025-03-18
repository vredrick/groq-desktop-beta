import React, { useState, useRef, useEffect } from 'react';

function ChatInput({ onSendMessage, loading = false }) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);
  const prevLoadingRef = useRef(loading);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Focus the textarea after component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Focus the textarea when loading changes from true to false (completion finished)
  useEffect(() => {
    // Check if loading just changed from true to false
    if (prevLoadingRef.current && !loading) {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
    // Update the ref with current loading state
    prevLoadingRef.current = loading;
  }, [loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !loading) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-2">
      <div className="flex-1 flex">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="w-full block py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none overflow-hidden max-h-[200px]"
          rows={1}
          disabled={loading}
        />
      </div>
      <button
        type="submit"
        className="py-2 px-4 bg-primary hover:bg-primary/90 text-white rounded transition-colors"
        disabled={loading || !message.trim()}
      >
        {loading ? (
          <span>Sending...</span>
        ) : (
          <span>Send</span>
        )}
      </button>
    </form>
  );
}

export default ChatInput; 