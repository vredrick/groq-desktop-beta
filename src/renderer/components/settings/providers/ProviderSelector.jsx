import React from 'react';

function ProviderSelector({ provider, handleChange }) {
  return (
    <div>
      <label htmlFor="provider" className="block text-sm font-medium text-text-secondary mb-2">
        Provider
      </label>
      <select
        id="provider"
        name="provider"
        value={provider || 'groq'}
        onChange={handleChange}
        className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
      >
        <option value="groq">Groq</option>
        <option value="openai">OpenAI</option>
        <option value="openrouter">OpenRouter</option>
        <option value="custom">Custom</option>
      </select>
    </div>
  );
}

export default ProviderSelector;