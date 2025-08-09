// React hooks
import { useState, useEffect } from 'react';

export const useMcpServers = () => {
  const [mcpTools, setMcpTools] = useState([]);
  const [mcpServersStatus, setMcpServersStatus] = useState({ loading: false, message: "" });

  // Function to update the server status display
  const updateServerStatus = (tools, settings) => {
    try {
      // Get number of configured servers
      if (settings && settings.mcpServers) {
        const configuredCount = Object.keys(settings.mcpServers).length;
        
        // Get unique server IDs from the tools
        const connectedServerIds = new Set();
        if (Array.isArray(tools)) {
          tools.forEach(tool => {
            if (tool && tool.serverId) {
              connectedServerIds.add(tool.serverId);
            }
          });
        }
        const connectedCount = connectedServerIds.size;
        const toolCount = Array.isArray(tools) ? tools.length : 0;
        
        if (configuredCount > 0) {
          if (connectedCount === configuredCount) {
            setMcpServersStatus({ 
              loading: false, 
              message: `${toolCount} tools, ${connectedCount}/${configuredCount} MCP servers connected` 
            });
          } else if (connectedCount > 0) {
            setMcpServersStatus({ 
              loading: false, 
              message: `${toolCount} tools, ${connectedCount}/${configuredCount} MCP servers connected` 
            });
          } else {
            setMcpServersStatus({ 
              loading: false, 
              message: `${toolCount} tools, No MCP servers connected (${configuredCount} configured)` 
            });
          }
        } else {
          setMcpServersStatus({ loading: false, message: `${toolCount} tools, No MCP servers configured` });
        }
      } else {
        const toolCount = Array.isArray(tools) ? tools.length : 0;
        setMcpServersStatus({ loading: false, message: `${toolCount} tools available` });
      }
    } catch (error) {
      console.error('Error updating server status:', error);
      setMcpServersStatus({ loading: false, message: "Error updating server status" });
    }
  };

  // Load MCP tools and set up event listener
  useEffect(() => {
    const loadMcpTools = async () => {
      try {
        setMcpServersStatus({ loading: true, message: "Connecting to MCP servers..." });

        // Load settings
        const settings = await window.electron.getSettings();

        // Initial load of MCP tools
        const mcpToolsResult = await window.electron.getMcpTools();
        if (mcpToolsResult && mcpToolsResult.tools) {
          setMcpTools(mcpToolsResult.tools);
          updateServerStatus(mcpToolsResult.tools, settings);
        } else {
          updateServerStatus([], settings);
        }

        // Set up event listener for MCP server status changes
        const removeListener = window.electron.onMcpServerStatusChanged((data) => {
          if (data && data.tools !== undefined) {
            setMcpTools(data.tools);
            // Fetch latest settings again when status changes
            window.electron.getSettings().then(currentSettings => {
              updateServerStatus(data.tools, currentSettings);
            }).catch(err => {
              console.error("Error fetching settings for status update:", err);
              updateServerStatus(data.tools, null);
            });
          }
        });

        return () => {
          if (removeListener) removeListener();
        };
      } catch (error) {
        console.error('Error loading MCP tools:', error);
        setMcpServersStatus({ loading: false, message: "Error loading MCP tools" });
      }
    };

    loadMcpTools();
  }, []);

  // Disconnect from an MCP server
  const disconnectMcpServer = async (serverId) => {
    try {
      const result = await window.electron.disconnectMcpServer(serverId);
      if (result && result.success) {
        if (result.allTools) {
          setMcpTools(result.allTools);
        } else {
          // If we don't get allTools back, just filter out the tools from this server
          setMcpTools(prev => prev.filter(tool => tool.serverId !== serverId));
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error disconnecting from MCP server:', error);
      return false;
    }
  };
  
  // Reconnect to an MCP server
  const reconnectMcpServer = async (serverId) => {
    try {
      // Get server configuration from settings
      const settings = await window.electron.getSettings();
      if (!settings.mcpServers || !settings.mcpServers[serverId]) {
        console.error(`Server configuration not found for ${serverId}`);
        return false;
      }
      
      // Get the full configuration object for the server
      const serverConfig = settings.mcpServers[serverId];

      // Connect to the server
      const result = await window.electron.connectMcpServer({
        ...serverConfig, // Spread the loaded config
        id: serverId    // Ensure ID is explicitly included
      });

      // Update tools state ONLY on success
      if (result && result.success) {
        // Update tools based on the result
        if (result.allTools) {
          setMcpTools(result.allTools);
        } else if (result.tools) {
          // Fallback logic if allTools isn't provided but tools is
          setMcpTools(prev => {
            const filteredTools = prev.filter(tool => tool.serverId !== serverId);
            return [...filteredTools, ...(result.tools || [])];
          });
        }
      }

      // Return the result object regardless of success/failure/requiresAuth
      return result;
    } catch (error) {
      console.error('Error reconnecting to MCP server:', error);
      return { success: false, error: error.message || 'An unknown error occurred', requiresAuth: false }; 
    }
  };

  // Refresh MCP tools
  const refreshMcpTools = async () => {
    try {
      setMcpServersStatus({ loading: true, message: "Refreshing MCP connections..." });
      
      // Get latest settings
      const settings = await window.electron.getSettings();
      
      // Manually fetch the current tools
      const mcpToolsResult = await window.electron.getMcpTools();
      
      if (mcpToolsResult && mcpToolsResult.tools) {
        setMcpTools(mcpToolsResult.tools);
        updateServerStatus(mcpToolsResult.tools, settings);
      } else {
        console.warn("No MCP tools available");
        setMcpServersStatus({ loading: false, message: "No MCP tools available" });
      }
    } catch (error) {
      console.error('Error refreshing MCP tools:', error);
      setMcpServersStatus({ loading: false, message: "Error refreshing MCP tools" });
    }
  };

  return {
    mcpTools,
    mcpServersStatus,
    disconnectMcpServer,
    reconnectMcpServer,
    refreshMcpTools,
    updateServerStatus
  };
};