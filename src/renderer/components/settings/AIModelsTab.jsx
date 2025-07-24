import React from 'react';
import ProviderSelector from './providers/ProviderSelector';
import GroqProviderSettings from './providers/GroqProviderSettings';
import OpenRouterProviderSettings from './providers/OpenRouterProviderSettings';
import CustomProviderSettings from './providers/CustomProviderSettings';
import GenerationParameters from './GenerationParameters';
import CustomSystemPrompt from './CustomSystemPrompt';

function AIModelsTab({ settings, handleChange, handleNumberChange, showApiKey, setShowApiKey, showOpenRouterApiKey, setShowOpenRouterApiKey, newCustomModel, setNewCustomModel }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
      {/* Left Panel - Provider Settings */}
      <div className="space-y-4 overflow-y-auto pr-2">
        <ProviderSelector 
          provider={settings.provider}
          handleChange={handleChange}
        />
        
        {settings.provider === 'groq' && (
          <GroqProviderSettings 
            apiKey={settings.GROQ_API_KEY} 
            showApiKey={showApiKey}
            setShowApiKey={setShowApiKey}
            handleChange={handleChange}
          />
        )}
        
        {settings.provider === 'openrouter' && (
          <OpenRouterProviderSettings
            apiKey={settings.OPENROUTER_API_KEY}
            showApiKey={showOpenRouterApiKey}
            setShowApiKey={setShowOpenRouterApiKey}
            customModels={settings.openRouterCustomModels}
            newCustomModel={newCustomModel}
            setNewCustomModel={setNewCustomModel}
            handleChange={handleChange}
          />
        )}

        {settings.provider === 'custom' && (
          <CustomProviderSettings
            customCompletionUrl={settings.customCompletionUrl}
            apiKey={settings.GROQ_API_KEY}
            showApiKey={showApiKey}
            setShowApiKey={setShowApiKey}
            handleChange={handleChange}
          />
        )}
      </div>

      {/* Right Panel - Generation Settings */}
      <div className="space-y-4 overflow-y-auto pl-2">
        <GenerationParameters 
          temperature={settings.temperature}
          topP={settings.top_p}
          toolOutputLimit={settings.toolOutputLimit}
          handleNumberChange={handleNumberChange}
        />

        <CustomSystemPrompt 
          customSystemPrompt={settings.customSystemPrompt}
          handleChange={handleChange}
        />
      </div>
    </div>
  );
}

export default AIModelsTab;