import React from 'react';
import ApiKeyInput from '../ApiKeyInput';

function GroqProviderSettings({ apiKey, showApiKey, setShowApiKey, handleChange }) {
  return (
    <div>
      <label htmlFor="api-key" className="block text-sm font-medium text-text-secondary mb-2">
        Groq API Key
      </label>
      <ApiKeyInput
        id="api-key"
        name="GROQ_API_KEY"
        value={apiKey || ''}
        showApiKey={showApiKey}
        setShowApiKey={setShowApiKey}
        onChange={handleChange}
        placeholder="Enter your GROQ API key"
      />
    </div>
  );
}

export default GroqProviderSettings;