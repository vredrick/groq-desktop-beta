import React from 'react';

function ConfigurationLocations({ settingsPath, configDir }) {
  if (!settingsPath && !configDir) return null;

  return (
    <div className="mt-3 p-2 rounded bg-surface-primary border border-border-primary">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-text-primary font-semibold mb-1 text-xs">Configuration Locations</h3>
          <div className="space-y-0.5 text-xs">
            {configDir && (
              <p className="text-text-secondary">
                Config: <span className="font-mono text-text-primary">{configDir}</span>
              </p>
            )}
            {settingsPath && (
              <p className="text-text-secondary">
                Settings: <span className="font-mono text-text-primary">{settingsPath}</span>
              </p>
            )}
            <p className="text-text-tertiary">
              MCP servers: <span className="font-mono text-text-secondary">{configDir}/mcp-servers.json</span>
            </p>
          </div>
        </div>
        {configDir && (
          <button
            onClick={() => window.electron.openConfigDirectory()}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded transition-colors"
            title="Open config directory"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default ConfigurationLocations;