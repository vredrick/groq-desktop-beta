import React from 'react';

function CustomSystemPrompt({ customSystemPrompt, handleChange }) {
  return (
    <div>
      <h3 className="text-sm font-medium mb-1 text-text-primary">Custom System Prompt</h3>
      <textarea
        id="custom-system-prompt"
        name="customSystemPrompt"
        value={customSystemPrompt || ''}
        onChange={handleChange}
        rows={2}
        className="w-full px-2 py-1.5 bg-bg-tertiary border border-border-primary rounded text-text-primary placeholder-text-tertiary text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        placeholder="Optional: Enter your custom system prompt..."
      />
    </div>
  );
}

export default CustomSystemPrompt;