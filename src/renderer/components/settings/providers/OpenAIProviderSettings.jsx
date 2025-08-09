import React from 'react';

function OpenAIProviderSettings({ apiKey, showApiKey, setShowApiKey, handleChange }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-text-secondary">OpenAI Configuration</h3>
      
      <div>
        <label htmlFor="OPENAI_API_KEY" className="block text-sm font-medium text-text-secondary mb-2">
          OpenAI API Key
        </label>
        <div className="relative">
          <input
            type={showApiKey ? "text" : "password"}
            id="OPENAI_API_KEY"
            name="OPENAI_API_KEY"
            value={apiKey || ''}
            onChange={handleChange}
            placeholder="sk-..."
            className="w-full px-3 py-2 pr-10 bg-bg-tertiary border border-border-primary rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute inset-y-0 right-0 px-3 flex items-center text-text-tertiary hover:text-text-secondary"
          >
            {showApiKey ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        <p className="mt-1 text-xs text-text-tertiary">
          Your OpenAI API key for direct access to GPT models. Get one at{' '}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover">
            platform.openai.com
          </a>
        </p>
      </div>
      
      <div className="bg-surface-secondary rounded border border-border-primary p-3">
        <h4 className="text-xs font-medium text-text-secondary mb-2">GPT-5 Notes</h4>
        <ul className="text-xs text-text-tertiary space-y-1">
          <li>• Advanced reasoning capabilities with enhanced performance</li>
          <li>• Models available: gpt-5, gpt-5-mini, gpt-5-nano, gpt-5-chat-latest</li>
          <li>• Supports MCP tools and function calling</li>
          <li>• 400k total context (272k input + 128k reasoning/output) with vision support</li>
          <li>• Note: GPT-5 models use default temperature/top_p values (custom values not supported)</li>
        </ul>
      </div>
    </div>
  );
}

export default OpenAIProviderSettings;