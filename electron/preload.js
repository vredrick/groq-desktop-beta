const { ipcRenderer, contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getSettingsPath: () => ipcRenderer.invoke('get-settings-path'),
  reloadSettings: () => ipcRenderer.invoke('reload-settings'),
  sendChatMessage: (messages, model) => ipcRenderer.invoke('chat-completion', messages, model),
  executeToolCall: (toolCall) => ipcRenderer.invoke('execute-tool-call', toolCall),
  
  // MCP related functions
  connectMcpServer: (serverConfig) => ipcRenderer.invoke('connect-mcp-server', serverConfig),
  disconnectMcpServer: (serverId) => ipcRenderer.invoke('disconnect-mcp-server', serverId),
  getMcpTools: () => ipcRenderer.invoke('get-mcp-tools'),
  
  // Add event listener for MCP server status changes
  onMcpServerStatusChanged: (callback) => {
    // Remove any existing listeners to avoid duplicates
    ipcRenderer.removeAllListeners('mcp-server-status-changed');
    
    // Add the new listener
    ipcRenderer.on('mcp-server-status-changed', (event, data) => {
      callback(data);
    });
    
    // Return a function to remove the listener
    return () => {
      ipcRenderer.removeAllListeners('mcp-server-status-changed');
    };
  }
}); 