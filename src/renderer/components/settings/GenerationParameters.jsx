import React from 'react';

function GenerationParameters({ temperature, topP, toolOutputLimit, handleNumberChange }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 text-text-primary">Generation Parameters</h3>
      
      <div className="space-y-3">
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