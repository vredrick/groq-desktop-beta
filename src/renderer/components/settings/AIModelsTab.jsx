// React
import React from 'react';

// Provider components
import CustomProviderSettings from './providers/CustomProviderSettings';
import GroqProviderSettings from './providers/GroqProviderSettings';
import OpenAIProviderSettings from './providers/OpenAIProviderSettings';
import OpenRouterProviderSettings from './providers/OpenRouterProviderSettings';
import ProviderSelector from './providers/ProviderSelector';

// Settings components
import CustomSystemPrompt from './CustomSystemPrompt';
import GenerationParameters from './GenerationParameters';

function AIModelsTab({ settings, handleChange, handleNumberChange, showApiKey, setShowApiKey, showOpenRouterApiKey, setShowOpenRouterApiKey, newCustomModel, setNewCustomModel }) {
  return (
    <div className="h-full flex flex-col">
      {/* Configuration Note */}
      <div className="bg-surface-secondary rounded border border-border-primary p-2 mb-4">
        <p className="text-xs text-text-secondary">
          Model configurations are stored separately in <span className="font-mono">models.json</span>
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
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
        
        {settings.provider === 'openai' && (
          <OpenAIProviderSettings 
            apiKey={settings.OPENAI_API_KEY} 
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
            provider={settings.provider}
            model={settings.model}
            reasoningEffort={settings.reasoning_effort}
            textVerbosity={settings.text_verbosity}
            handleChange={handleChange}
          />

          <CustomSystemPrompt 
            customSystemPrompt={settings.customSystemPrompt}
            handleChange={handleChange}
          />
        </div>
      </div>
    </div>
  );
}

export default AIModelsTab;