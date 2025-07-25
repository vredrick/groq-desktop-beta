import React from 'react';
import MCPServerList from './mcp/MCPServerList';
import MCPServerForm from './mcp/MCPServerForm';

function MCPServersTab({ 
  settings, 
  newMcpServer, 
  setNewMcpServer,
  useJsonInput,
  setUseJsonInput,
  jsonInput,
  setJsonInput,
  jsonError,
  setJsonError,
  editingServerId,
  setEditingServerId,
  handleSaveMcpServer,
  removeMcpServer,
  startEditing,
  cancelEditing,
  newEnvVar,
  setNewEnvVar,
  toggleMcpServerEnabled
}) {
  return (
    <div className="h-full flex flex-col">
      {/* Configuration Note */}
      <div className="bg-surface-secondary rounded border border-border-primary p-2 mb-4">
        <p className="text-xs text-text-secondary">
          MCP server configurations are stored separately in <span className="font-mono">mcp-servers.json</span>
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Left Panel - Server Form */}
        <div className="overflow-y-auto">
          <h3 className="text-sm font-semibold mb-2 text-text-primary">Server Configuration</h3>
          <MCPServerForm
            newMcpServer={newMcpServer}
            setNewMcpServer={setNewMcpServer}
            useJsonInput={useJsonInput}
            setUseJsonInput={setUseJsonInput}
            jsonInput={jsonInput}
            setJsonInput={setJsonInput}
            jsonError={jsonError}
            setJsonError={setJsonError}
            editingServerId={editingServerId}
            handleSaveMcpServer={handleSaveMcpServer}
            cancelEditing={cancelEditing}
            newEnvVar={newEnvVar}
            setNewEnvVar={setNewEnvVar}
          />
        </div>

        {/* Right Panel - Server List */}
        <div className="overflow-y-auto">
          <h3 className="text-sm font-semibold mb-2 text-text-primary">Configured Servers</h3>
          <MCPServerList
            mcpServers={settings.mcpServers || {}}
            startEditing={startEditing}
            removeMcpServer={removeMcpServer}
            toggleMcpServerEnabled={toggleMcpServerEnabled}
          />
        </div>
      </div>
    </div>
  );
}

export default MCPServersTab;