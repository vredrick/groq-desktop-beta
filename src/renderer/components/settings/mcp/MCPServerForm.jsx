import React from 'react';
import MCPFormView from './MCPFormView';
import MCPJsonView from './MCPJsonView';
import { parseArgsString } from '../../../utils/mcpHelpers';

function MCPServerForm({
  newMcpServer,
  setNewMcpServer,
  useJsonInput,
  setUseJsonInput,
  jsonInput,
  setJsonInput,
  jsonError,
  setJsonError,
  editingServerId,
  handleSaveMcpServer,
  cancelEditing,
  newEnvVar,
  setNewEnvVar
}) {
  const handleNewMcpServerChange = (e) => {
    const { name, value } = e.target;
    setNewMcpServer(prev => ({ ...prev, [name]: value }));
  };

  const handleTransportChange = (e) => {
    const transportType = e.target.value;
    setNewMcpServer(prev => ({
      ...prev,
      transport: transportType,
      command: transportType === 'sse' ? '' : prev.command,
      args: transportType === 'sse' ? '' : prev.args,
      env: transportType === 'sse' ? {} : prev.env,
      url: transportType === 'stdio' ? '' : prev.url
    }));
    setJsonInput('');
    setJsonError(null);
  };

  const switchToFormView = () => {
    if (!useJsonInput) return;

    try {
      const parsedJson = JSON.parse(jsonInput || '{}');
      if (typeof parsedJson !== 'object' || parsedJson === null) {
        throw new Error("JSON must be an object.");
      }
      
      const command = parsedJson.command || '';
      const args = Array.isArray(parsedJson.args) ? parsedJson.args : [];
      const env = typeof parsedJson.env === 'object' && parsedJson.env !== null ? parsedJson.env : {};
      const argsString = args.join(' ');

      setNewMcpServer(prev => ({ ...prev, command, args: argsString, env }));
      setJsonError(null);
      setUseJsonInput(false);
    } catch (error) {
      console.error("Error parsing JSON to switch to form view:", error);
      setJsonError(`Invalid JSON: ${error.message}. Cannot switch to form view.`);
    }
  };

  const switchToJsonView = () => {
    if (useJsonInput) return;

    try {
      let serverConfig = {};
      if (newMcpServer.transport === 'stdio') {
        const argsArray = parseArgsString(newMcpServer.args);
        serverConfig = {
          transport: 'stdio',
          command: newMcpServer.command,
          args: argsArray,
          env: newMcpServer.env
        };
      } else {
        serverConfig = {
          transport: newMcpServer.transport,
          url: newMcpServer.url
        };
        delete serverConfig.command;
        delete serverConfig.args;
        delete serverConfig.env;
      }

      const jsonString = JSON.stringify(serverConfig, null, 2);
      setJsonInput(jsonString);
      setJsonError(null);
      setUseJsonInput(true);
    } catch (error) {
      console.error("Error converting form state to JSON:", error);
      setJsonError(`Internal error: Failed to generate JSON. ${error.message}`);
    }
  };

  return (
    <div id="mcp-form" className="bg-bg-tertiary border border-border-primary rounded p-2">
      <h4 className="font-medium text-xs text-text-secondary mb-2">
        {editingServerId ? `Editing: ${editingServerId}` : 'Add New Server'}
      </h4>
      
      <div className="mb-2 flex">
        <button
          type="button"
          className={`px-3 py-1 text-xs rounded-l transition-colors ${!useJsonInput ? 'bg-primary text-white' : 'bg-surface-secondary text-text-secondary hover:bg-surface-hover'}`}
          onClick={switchToFormView}
        >
          Form
        </button>
        <button
          type="button"
          className={`px-3 py-1 text-xs rounded-r transition-colors ${useJsonInput ? 'bg-primary text-white' : 'bg-surface-secondary text-text-secondary hover:bg-surface-hover'}`}
          onClick={switchToJsonView}
        >
          JSON
        </button>
      </div>
      
      <form onSubmit={handleSaveMcpServer}>
        <div className="mb-2">
          <label htmlFor="server-id" className="block text-xs font-medium text-gray-300 mb-1">
            Server ID: {editingServerId && "(Cannot change ID during edit)"}
          </label>
          <input
            type="text"
            id="server-id"
            name="id"
            value={newMcpServer.id}
            onChange={handleNewMcpServerChange}
            className="w-full px-2 py-1 bg-bg-primary border border-border-primary rounded text-text-primary placeholder-text-tertiary text-xs disabled:bg-surface-primary disabled:cursor-not-allowed focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            placeholder="e.g., filesystem"
            required
            disabled={!!editingServerId}
          />
        </div>

        <div className="mb-2">
          <label htmlFor="server-transport" className="block text-xs font-medium text-gray-300 mb-1">
            Transport Type:
          </label>
          <select
            id="server-transport"
            name="transport"
            value={newMcpServer.transport}
            onChange={handleTransportChange}
            disabled={useJsonInput}
            className="w-full px-2 py-1 border border-gray-500 rounded bg-transparent text-white placeholder-gray-400 text-xs focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-800"
          >
            <option value="stdio">Standard I/O (stdio)</option>
            <option value="sse">Server-Sent Events (SSE)</option>
            <option value="streamableHttp">Streamable HTTP</option>
          </select>
        </div>

        {!useJsonInput ? (
          <MCPFormView
            newMcpServer={newMcpServer}
            handleNewMcpServerChange={handleNewMcpServerChange}
            newEnvVar={newEnvVar}
            setNewEnvVar={setNewEnvVar}
            setNewMcpServer={setNewMcpServer}
            setUseJsonInput={setUseJsonInput}
            setJsonError={setJsonError}
          />
        ) : (
          <MCPJsonView
            jsonInput={jsonInput}
            setJsonInput={setJsonInput}
            jsonError={jsonError}
          />
        )}
        
        <div className="flex space-x-2 mt-2">
          <button
            type="submit"
            className="flex-1 py-1 bg-primary hover:bg-primary-hover text-white rounded transition-colors text-xs"
          >
            {editingServerId ? 'Update Server' : 'Add Server'}
          </button>
          {editingServerId && (
            <button
              type="button"
              onClick={cancelEditing}
              className="flex-1 py-1 bg-surface-secondary hover:bg-surface-hover text-text-primary rounded transition-colors text-xs"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default MCPServerForm;