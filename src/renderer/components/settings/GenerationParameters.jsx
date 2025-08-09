import React from 'react';

function GenerationParameters({ temperature, topP, toolOutputLimit, handleNumberChange, provider, model, reasoningEffort, textVerbosity, handleChange }) {
  // Check if this is a GPT-5 model
  const isGPT5 = provider === 'openai' && model && model.includes('gpt-5');
  
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 text-text-primary">Generation Parameters</h3>
      
      <div className="space-y-3">
        {isGPT5 ? (
          <>
            {/* GPT-5 specific parameters */}
            <div>
              <label htmlFor="reasoning_effort" className="block text-xs font-medium text-text-secondary mb-1">
                Reasoning Effort: {reasoningEffort || 'medium'}
              </label>
              <select
                id="reasoning_effort"
                name="reasoning_effort"
                value={reasoningEffort || 'medium'}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              >
                <option value="minimal">Minimal</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <p className="text-xs text-text-tertiary mt-1">
                Controls the computational effort for reasoning tasks.
              </p>
            </div>
            
            <div>
              <label htmlFor="text_verbosity" className="block text-xs font-medium text-text-secondary mb-1">
                Text Verbosity: {textVerbosity || 'medium'}
              </label>
              <select
                id="text_verbosity"
                name="text_verbosity"
                value={textVerbosity || 'medium'}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <p className="text-xs text-text-tertiary mt-1">
                Controls the length and detail of responses.
              </p>
            </div>
            
            <div className="bg-surface-secondary rounded border border-border-primary p-3">
              <p className="text-xs text-text-tertiary">
                GPT-5 models use default temperature and top_p values. The reasoning effort and verbosity parameters control the model's behavior instead.
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Standard temperature and top_p for other models */}
            <div>
              <label htmlFor="temperature" className="block text-xs font-medium text-text-secondary mb-1">
                Temperature: {temperature}
              </label>
              <div className="flex items-center">
                <span className="mr-2 text-xs text-text-tertiary">0</span>
                <input
                  type="range"
                  id="temperature"
                  name="temperature"
                  min="0"
                  max="1"
                  step="0.01"
                  value={temperature}
                  onChange={handleNumberChange}
                  className="w-full"
                />
                <span className="ml-2 text-xs text-text-tertiary">1</span>
              </div>
              <p className="text-xs text-text-tertiary mt-1">
                Lower values make responses more deterministic, higher values more creative.
              </p>
            </div>
            
            <div>
              <label htmlFor="top_p" className="block text-xs font-medium text-text-secondary mb-1">
                Top P: {topP}
              </label>
              <div className="flex items-center">
                <span className="mr-2 text-xs text-text-tertiary">0</span>
                <input
                  type="range"
                  id="top_p"
                  name="top_p"
                  min="0"
                  max="1"
                  step="0.01"
                  value={topP}
                  onChange={handleNumberChange}
                  className="w-full"
                />
                <span className="ml-2 text-xs text-text-tertiary">1</span>
              </div>
              <p className="text-xs text-text-tertiary mt-1">
                Controls diversity by limiting tokens to the most likely ones.
              </p>
            </div>
          </>
        )}

        <div>
          <label htmlFor="toolOutputLimit" className="block text-xs text-text-secondary mb-1">
            Tool Output Limit: {toolOutputLimit} chars
          </label>
          <div className="flex items-center">
            <span className="mr-2 text-xs text-text-tertiary">1k</span>
            <input
              type="range"
              id="toolOutputLimit"
              name="toolOutputLimit"
              min="1000"
              max="50000"
              step="1000"
              value={toolOutputLimit}
              onChange={handleNumberChange}
              className="w-full"
            />
            <span className="ml-2 text-xs text-text-tertiary">50k</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GenerationParameters;