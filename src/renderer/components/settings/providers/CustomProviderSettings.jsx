import React from 'react';
import ApiKeyInput from '../ApiKeyInput';

function CustomProviderSettings({ customCompletionUrl, apiKey, showApiKey, setShowApiKey, handleChange }) {
  return (
    <div>
      <label htmlFor="custom-completion-url" className="block text-sm font-medium text-text-secondary mb-2">
        Custom Completion URL
      </label>
      <input
        type="text"
        id="custom-completion-url"
        name="customCompletionUrl"
        value={customCompletionUrl || ''}
        onChange={handleChange}
        className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        placeholder="e.g., http://127.0.0.1:8000/api or http://localhost:8000/api"
      />
      <div className="mt-4">
        <label htmlFor="custom-api-key" className="block text-sm font-medium text-text-secondary mb-2">
          API Key for Custom Provider
        </label>
        <ApiKeyInput
          id="custom-api-key"
          name="GROQ_API_KEY"
          value={apiKey || ''}
          showApiKey={showApiKey}
          setShowApiKey={setShowApiKey}
          onChange={handleChange}
          placeholder="Enter your API key"
        />
      </div>
      <p className="text-xs text-text-tertiary mt-1">
        Override the default Groq API base URL. The SDK will automatically append /openai/v1/chat/completions to your URL. Leave empty to use the default Groq API.
      </p>
    </div>
  );
}

export default CustomProviderSettings;