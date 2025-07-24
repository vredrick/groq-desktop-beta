import React from 'react';

function MCPFormView({ newMcpServer, handleNewMcpServerChange, newEnvVar, setNewEnvVar, setNewMcpServer, setUseJsonInput, setJsonError }) {
  const handleEnvVarChange = (e) => {
    const { name, value } = e.target;
    setNewEnvVar(prev => ({ ...prev, [name]: value }));
  };

  const addEnvVar = () => {
    if (!newEnvVar.key) return;
    
    setNewMcpServer(prev => ({
      ...prev,
      env: {
        ...prev.env,
        [newEnvVar.key]: newEnvVar.value
      }
    }));
    
    setNewEnvVar({ key: '', value: '' });
  };

  const removeEnvVar = (key) => {
    setNewMcpServer(prev => {
      const updatedEnv = { ...prev.env };
      delete updatedEnv[key];
      return { ...prev, env: updatedEnv };
    });
    setUseJsonInput(false);
    setJsonError(null);
  };

  if (newMcpServer.transport === 'stdio') {
    return (
      <>
        <div className="mb-2">
          <label htmlFor="server-command" className="block text-xs font-medium text-gray-300 mb-1">
            Command:
          </label>
          <input
            type="text"
            id="server-command"
            name="command"
            value={newMcpServer.command}
            onChange={handleNewMcpServerChange}
            className="w-full px-2 py-1 border border-gray-500 rounded bg-transparent text-white placeholder-gray-400 text-xs"
            placeholder="e.g., npx"
            required
          />
        </div>

        <div className="mb-2">
          <label htmlFor="server-args" className="block text-xs font-medium text-gray-300 mb-1">
            Arguments (space separated, use quotes for args with spaces):
          </label>
          <input
            type="text"
            id="server-args"
            name="args"
            value={newMcpServer.args}
            onChange={handleNewMcpServerChange}
            className="w-full px-2 py-1 border border-gray-500 rounded bg-transparent text-white placeholder-gray-400 text-xs"
            placeholder="e.g., -y @modelcontextprotocol/server-filesystem /path/to/dir"
          />
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-300">
              Environment Variables:
            </label>
          </div>

          {Object.keys(newMcpServer.env).length > 0 && (
            <div className="mb-3 border border-gray-700 rounded-md overflow-hidden">
              {Object.entries(newMcpServer.env).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center p-2 border-b border-gray-700 last:border-b-0 bg-custom-dark-bg">
                  <div className="flex-1 font-mono text-sm">
                    <span className="text-gray-300">{key}=</span>
                    <span className="text-gray-400">{value}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEnvVar(key)}
                    className="text-red-400 hover:text-red-300 text-xs py-1 px-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex space-x-2">
            <input
              type="text"
              value={newEnvVar.key}
              onChange={handleEnvVarChange}
              name="key"
              placeholder="KEY"
              className="flex-1 px-3 py-2 border border-gray-500 rounded-md bg-transparent text-white placeholder-gray-400 text-sm"
            />
            <input
              type="text"
              value={newEnvVar.value}
              onChange={handleEnvVarChange}
              name="value"
              placeholder="VALUE"
              className="flex-1 px-3 py-2 border border-gray-500 rounded-md bg-transparent text-white placeholder-gray-400 text-sm"
            />
            <button
              type="button"
              onClick={addEnvVar}
              disabled={!newEnvVar.key}
              className="px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>
      </>
    );
  }

  if (newMcpServer.transport === 'sse') {
    return (
      <div className="mb-3">
        <label htmlFor="server-url-sse" className="block text-sm font-medium text-gray-300 mb-1">
          SSE URL:
        </label>
        <input
          type="url"
          id="server-url-sse"
          name="url"
          value={newMcpServer.url}
          onChange={handleNewMcpServerChange}
          className="w-full px-3 py-2 border border-gray-500 rounded-md bg-transparent text-white placeholder-gray-400 text-sm"
          placeholder="e.g., http://localhost:8000/sse"
          required
        />
        <p className="text-xs text-text-tertiary mt-1">
          Enter the full URL for the Server-Sent Events endpoint.
        </p>
      </div>
    );
  }

  if (newMcpServer.transport === 'streamableHttp') {
    return (
      <div className="mb-3">
        <label htmlFor="server-url-http" className="block text-sm font-medium text-gray-300 mb-1">
          Streamable HTTP URL:
        </label>
        <input
          type="url"
          id="server-url-http"
          name="url"
          value={newMcpServer.url}
          onChange={handleNewMcpServerChange}
          className="w-full px-3 py-2 border border-gray-500 rounded-md bg-transparent text-white placeholder-gray-400 text-sm"
          placeholder="e.g., http://localhost:8080/mcp"
          required
        />
        <p className="text-xs text-text-tertiary mt-1">
          Enter the full URL for the Streamable HTTP endpoint.
        </p>
      </div>
    );
  }

  return null;
}

export default MCPFormView;