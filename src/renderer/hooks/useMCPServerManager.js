import { useState } from 'react';
import { parseArgsString, parseJsonInput } from '../utils/mcpHelpers';

const DEFAULT_MCP_SERVER = {
  id: '',
  transport: 'stdio',
  command: '',
  args: '',
  env: {},
  url: ''
};

export function useMCPServerManager(settings, updateSettings, setSaveStatus) {
  const [newMcpServer, setNewMcpServer] = useState(DEFAULT_MCP_SERVER);
  const [useJsonInput, setUseJsonInput] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState(null);
  const [newEnvVar, setNewEnvVar] = useState({ key: '', value: '' });
  const [editingServerId, setEditingServerId] = useState(null);

  const handleSaveMcpServer = (e) => {
    e.preventDefault();
    
    let serverConfig;
    
    if (useJsonInput) {
      const result = parseJsonInput(jsonInput);
      if (!result.success) {
        setJsonError(result.error);
        return;
      }
      
      if (!newMcpServer.id.trim()) {
        setJsonError("Server ID is required");
        return;
      }
      
      serverConfig = result.data;
    } else {
      if (!newMcpServer.id) {
        setSaveStatus({ type: 'error', message: 'Server ID is required' });
        return;
      }

      if (newMcpServer.transport === 'stdio') {
        if (!newMcpServer.command) {
          setSaveStatus({ type: 'error', message: 'Command is required for stdio transport' });
          return;
        }
        const args = parseArgsString(newMcpServer.args);
        serverConfig = {
          transport: 'stdio',
          command: newMcpServer.command,
          args,
          env: newMcpServer.env
        };
      } else {
        if (!newMcpServer.url || !newMcpServer.url.trim()) {
          setSaveStatus({ type: 'error', message: 'URL is required for SSE or Streamable HTTP transport' });
          return;
        }
        try {
          new URL(newMcpServer.url);
        } catch (urlError) {
          setSaveStatus({ type: 'error', message: `Invalid URL: ${urlError.message}` });
          return;
        }
        serverConfig = {
          transport: newMcpServer.transport,
          url: newMcpServer.url
        };
      }
    }

    const updatedSettings = {
      ...settings,
      mcpServers: {
        ...settings.mcpServers,
        [newMcpServer.id]: {
          ...serverConfig,
          enabled: serverConfig.enabled !== undefined ? serverConfig.enabled : true
        }
      }
    };

    updateSettings(updatedSettings);
    
    // Reset form
    setNewMcpServer(DEFAULT_MCP_SERVER);
    setJsonInput('');
    setJsonError(null);
    setEditingServerId(null);
  };

  const removeMcpServer = (serverId) => {
    const updatedMcpServers = { ...settings.mcpServers };
    delete updatedMcpServers[serverId];
    
    const updatedSettings = {
      ...settings,
      mcpServers: updatedMcpServers
    };
    
    updateSettings(updatedSettings);

    if (editingServerId === serverId) {
      cancelEditing();
    }
  };

  const startEditing = (serverId) => {
    const serverToEdit = settings.mcpServers[serverId];
    if (!serverToEdit) return;

    setEditingServerId(serverId);

    let transport = serverToEdit.transport || 'stdio';
    let command = '', argsArray = [], envObject = {}, argsString = '', url = '';
    
    if (transport === 'stdio') {
      command = serverToEdit.command || '';
      argsArray = Array.isArray(serverToEdit.args) ? serverToEdit.args : [];
      envObject = typeof serverToEdit.env === 'object' && serverToEdit.env !== null ? serverToEdit.env : {};
      argsString = argsArray.join(' ');
    } else {
      url = serverToEdit.url || '';
      command = '';
      argsString = '';
      envObject = {};
    }

    setNewMcpServer({
      id: serverId,
      transport: transport,
      command: command,
      args: argsString,
      env: envObject,
      url: url
    });

    try {
      let jsonConfig;
      if (transport === 'stdio') {
        jsonConfig = { transport: 'stdio', command, args: argsArray, env: envObject };
      } else {
        jsonConfig = { transport: transport, url };
      }
      const jsonString = JSON.stringify(jsonConfig, null, 2);
      setJsonInput(jsonString);
    } catch (error) {
      console.error("Failed to stringify server config for JSON input:", error);
      setJsonInput('');
    }

    setUseJsonInput(false);
    setJsonError(null);
  };

  const cancelEditing = () => {
    setEditingServerId(null);
    setNewMcpServer(DEFAULT_MCP_SERVER);
    setJsonInput('');
    setJsonError(null);
  };

  const toggleMcpServerEnabled = (serverId) => {
    const server = settings.mcpServers[serverId];
    if (!server) return;

    const updatedSettings = {
      ...settings,
      mcpServers: {
        ...settings.mcpServers,
        [serverId]: {
          ...server,
          enabled: !server.enabled
        }
      }
    };

    updateSettings(updatedSettings);
  };

  return {
    newMcpServer,
    setNewMcpServer,
    useJsonInput,
    setUseJsonInput,
    jsonInput,
    setJsonInput,
    jsonError,
    setJsonError,
    newEnvVar,
    setNewEnvVar,
    editingServerId,
    setEditingServerId,
    handleSaveMcpServer,
    removeMcpServer,
    startEditing,
    cancelEditing,
    toggleMcpServerEnabled
  };
}