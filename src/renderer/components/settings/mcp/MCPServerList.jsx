import React from 'react';

function MCPServerList({ mcpServers, startEditing, removeMcpServer, toggleMcpServerEnabled }) {
  const serverEntries = Object.entries(mcpServers);
  
  if (serverEntries.length === 0) {
    return (
      <div className="mb-2 p-2 bg-bg-tertiary rounded text-center text-text-tertiary text-xs">
        No MCP servers configured
      </div>
    );
  }

  return (
    <div>
      <div className="max-h-96 overflow-y-auto border border-border-primary rounded">
        {serverEntries.map(([id, config]) => (
          <MCPServerItem
            key={id}
            id={id}
            config={config}
            startEditing={startEditing}
            removeMcpServer={removeMcpServer}
            toggleMcpServerEnabled={toggleMcpServerEnabled}
          />
        ))}
      </div>
    </div>
  );
}

function MCPServerItem({ id, config, startEditing, removeMcpServer, toggleMcpServerEnabled }) {
  const renderConfig = () => {
    if (config.transport === 'sse') {
      return <div><span className="font-mono break-all">Type: SSE | URL: {config.url}</span></div>;
    }
    
    if (config.transport === 'streamableHttp') {
      return <div><span className="font-mono break-all">Type: Streamable HTTP | URL: {config.url}</span></div>;
    }
    
    // stdio transport
    return (
      <>
        <div><span className="font-mono break-all">Type: Stdio | $ {config.command} {(config.args || []).join(' ')}</span></div>
        {config.env && Object.keys(config.env).length > 0 && (
          <div className="mt-1">
            <span className="text-xs text-text-tertiary">Environment variables:</span>
            <div className="pl-2 mt-1">
              {Object.entries(config.env).map(([key, value]) => (
                <div key={key} className="text-xs font-mono break-all">
                  <span className="text-gray-300">{key}=</span>
                  <span className="text-gray-400">
                    {maskSensitiveValue(key, value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  const maskSensitiveValue = (key, value) => {
    const sensitiveKeys = ['key', 'token', 'secret'];
    const isSensitive = sensitiveKeys.some(k => key.toLowerCase().includes(k));
    
    if (isSensitive) {
      return '********';
    }
    
    if (typeof value === 'string' && value.length > 30) {
      return `${value.substring(0, 27)}...`;
    }
    
    return value;
  };

  const isEnabled = config.enabled !== false;

  return (
    <div className={`p-2 border-b border-border-primary last:border-b-0 bg-bg-tertiary ${!isEnabled ? 'opacity-60' : ''}`}>
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          <div className="font-medium text-text-primary text-sm break-all">{id}</div>
          <button
            onClick={() => toggleMcpServerEnabled(id)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              isEnabled ? 'bg-green-600' : 'bg-gray-600'
            }`}
            title={isEnabled ? 'Disable server' : 'Enable server'}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                isEnabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
        <div className="flex space-x-1 flex-shrink-0 ml-2">
          <button
            onClick={() => startEditing(id)}
            className="text-blue-400 hover:text-blue-300 text-xs py-0.5 px-1.5 bg-blue-900/30 hover:bg-blue-900/50 rounded transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => removeMcpServer(id)}
            className="text-red-400 hover:text-red-300 text-xs py-0.5 px-1.5 bg-red-900/30 hover:bg-red-900/50 rounded transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
      
      <div className="text-xs text-text-tertiary">
        {renderConfig()}
      </div>
    </div>
  );
}

export default MCPServerList;