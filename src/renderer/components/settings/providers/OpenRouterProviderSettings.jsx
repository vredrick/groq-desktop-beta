import React from 'react';
import ApiKeyInput from '../ApiKeyInput';

function OpenRouterProviderSettings({ apiKey, showApiKey, setShowApiKey, customModels, newCustomModel, setNewCustomModel, handleChange }) {
  const handleAddModel = () => {
    if (newCustomModel.trim()) {
      const updatedModels = [...(customModels || []), newCustomModel.trim()];
      handleChange({ target: { name: 'openRouterCustomModels', value: updatedModels } });
      setNewCustomModel('');
    }
  };

  const handleRemoveModel = (index) => {
    const updatedModels = customModels.filter((_, i) => i !== index);
    handleChange({ target: { name: 'openRouterCustomModels', value: updatedModels } });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddModel();
    }
  };

  return (
    <>
      <div className="mb-4">
        <label htmlFor="openrouter-api-key" className="block text-sm font-medium text-text-secondary mb-2">
          OpenRouter API Key
        </label>
        <ApiKeyInput
          id="openrouter-api-key"
          name="OPENROUTER_API_KEY"
          value={apiKey || ''}
          showApiKey={showApiKey}
          setShowApiKey={setShowApiKey}
          onChange={handleChange}
          placeholder="Enter your OpenRouter API key"
        />
      </div>
      
      <div className="mb-4">
        <label htmlFor="custom-models" className="block text-sm font-medium text-text-secondary mb-2">
          Custom OpenRouter Models
        </label>
        <div className="space-y-2">
          {(customModels || []).map((model, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={model}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-500 rounded-md bg-transparent text-white"
              />
              <button
                type="button"
                onClick={() => handleRemoveModel(index)}
                className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          ))}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newCustomModel}
              onChange={(e) => setNewCustomModel(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              placeholder="e.g., openai/gpt-4-turbo"
            />
            <button
              type="button"
              onClick={handleAddModel}
              className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              Add
            </button>
          </div>
        </div>
        <p className="text-xs text-text-tertiary mt-2">
          Copy model names from OpenRouter (e.g., openai/gpt-4-turbo, anthropic/claude-3-opus)
        </p>
      </div>
    </>
  );
}

export default OpenRouterProviderSettings;