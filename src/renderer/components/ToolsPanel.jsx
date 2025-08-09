// React
import React, { useState, useEffect, useRef } from 'react';

// React Router
import { useNavigate } from 'react-router-dom';

function ToolsPanel({ tools = [], onClose, onDisconnectServer, onReconnectServer }) {
  const [configuredServers, setConfiguredServers] = useState([]);
  const [serverStatuses, setServerStatuses] = useState({});
  const [expandedServers, setExpandedServers] = useState({});
  const [disabledTools, setDisabledTools] = useState({});
  const [actionInProgress, setActionInProgress] = useState(null);
  const navigate = useNavigate();
  const panelRef = useRef(null);

  useEffect(() => {
    const loadConfiguredServers = async () => {
      try {
        const settings = await window.electron.getSettings();
        if (settings && settings.mcpServers) {
          const servers = Object.entries(settings.mcpServers)
            .filter(([id, config]) => config.enabled !== false) // Only show enabled servers
            .map(([id, config]) => {
              let transportType = 'stdio';
              if (config.transport === 'sse') {
                  transportType = 'sse';
              } else if (config.transport === 'streamableHttp') {
                  transportType = 'streamableHttp';
              }

              return {
                id,
                command: transportType === 'stdio' ? config.command : undefined,
                args: transportType === 'stdio' ? (config.args || []) : [],
                url: (transportType === 'sse' || transportType === 'streamableHttp') ? config.url : undefined,
                transport: transportType
              };
            });
          setConfiguredServers(servers);

          // Determine which servers are currently connected
          const statuses = {};
          servers.forEach(server => {
            const hasToolsFromServer = tools.some(tool => tool.serverId === server.id);
            statuses[server.id] = hasToolsFromServer ? 'connected' : 'disconnected';
          });
          setServerStatuses(statuses);
        }
      } catch (error) {
        console.error('Error loading configured servers:', error);
      }
    };
    
    loadConfiguredServers();
  }, [tools]);

  // Add event listeners for ESC key and click outside
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && onClose) {
        onClose();
      }
    };

    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        // Check if click is on the tools button itself
        const isToolsButton = event.target.closest('.control-button');
        if (!isToolsButton) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleToggleConnection = async (server) => {
    const isConnected = serverStatuses[server.id] === 'connected';
    
    setActionInProgress(server.id);
    try {
      if (isConnected) {
        const success = await onDisconnectServer(server.id);
        if (success) {
          setServerStatuses(prev => ({ ...prev, [server.id]: 'disconnected' }));
        }
      } else {
        const result = await onReconnectServer(server.id);
        if (result && result.success) {
          setServerStatuses(prev => ({ ...prev, [server.id]: 'connected' }));
        }
      }
    } catch (error) {
      console.error(`Error toggling connection for ${server.id}:`, error);
    } finally {
      setActionInProgress(null);
    }
  };

  const toggleServerExpand = (serverId) => {
    setExpandedServers(prev => ({
      ...prev,
      [serverId]: !prev[serverId]
    }));
  };

  const toggleToolDisabled = (toolName) => {
    setDisabledTools(prev => ({
      ...prev,
      [toolName]: !prev[toolName]
    }));
  };

  const toggleAllTools = () => {
    const allTools = tools.map(t => t.name);
    const allDisabled = allTools.every(name => disabledTools[name]);
    
    if (allDisabled) {
      // Enable all
      setDisabledTools({});
    } else {
      // Disable all
      const newDisabled = {};
      allTools.forEach(name => {
        newDisabled[name] = true;
      });
      setDisabledTools(newDisabled);
    }
  };

  // Group tools by server
  const toolsByServer = (tools || []).reduce((acc, tool) => {
    const serverId = tool.serverId || 'unknown';
    if (!acc[serverId]) {
      acc[serverId] = [];
    }
    acc[serverId].push(tool);
    return acc;
  }, {});

  const getServerIcon = (serverId) => {
    // Map server IDs to letters (no emojis)
    const iconMap = {
      'Context7': 'C',
      'Notes': 'N',
      'Chrome': 'C',
      'n8n-mcp': 'N',
      'bmad': 'B',
      'claude-mcp': 'C',
      'desktop-commander': 'D',
      'browsermcp': 'B',
      'mcp-server-firecrawl': 'M',
      'shopify-dev-mcp': 'S',
      'XcodeBuildMCP': 'X'
    };
    
    const icon = iconMap[serverId] || serverId.charAt(0).toUpperCase();
    return <span className="server-icon-letter">{icon}</span>;
  };

  return (
    <div className="tools-panel-overlay">
      <div className="tools-panel-minimal" ref={panelRef}>
        <div className="tools-panel-header">
          <span className="text-text-secondary text-xs font-medium uppercase tracking-wide">Tools</span>
        </div>
        
        <div className="tools-panel-content">
          {tools.length > 0 && (
            <div className="disable-all-section">
              <button onClick={toggleAllTools} className="disable-all-button">
                <span className="server-icon-letter">R</span>
                <span className="flex-1 text-left">Disable all tools</span>
                <div className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={!tools.every(t => disabledTools[t.name])}
                    onChange={toggleAllTools}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="toggle-slider"></span>
                </div>
              </button>
            </div>
          )}

          {configuredServers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-tertiary text-sm">No MCP servers configured</p>
              <p className="text-text-tertiary text-xs mt-1">Add servers in Settings</p>
            </div>
          ) : (
            <div className="servers-list">
              {configuredServers.map(server => {
                const isConnected = serverStatuses[server.id] === 'connected';
                const isExpanded = expandedServers[server.id];
                const serverTools = toolsByServer[server.id] || [];
                
                return (
                  <div key={server.id} className="server-section">
                    <button
                      onClick={() => toggleServerExpand(server.id)}
                      className="server-header-button"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <span className="server-icon">{getServerIcon(server.id)}</span>
                        <span className="server-name">{server.id}</span>
                        {!isConnected && (
                          <span className="server-status-text">Disabled</span>
                        )}
                        {isConnected && serverTools.length > 0 && (
                          <span className="server-tool-count">{serverTools.length}</span>
                        )}
                      </div>
                      <svg 
                        className={`chevron-icon w-3 h-3 ${isExpanded ? 'expanded' : ''}`} 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <path d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    {isExpanded && (
                      <div className="server-tools-list">
                        {!isConnected ? (
                          <div className="disconnected-message">
                            <p className="text-xs text-text-tertiary mb-2">Server is disconnected</p>
                            <button
                              onClick={() => handleToggleConnection(server)}
                              disabled={actionInProgress === server.id}
                              className="connect-button"
                            >
                              {actionInProgress === server.id ? 'Connecting...' : 'Connect'}
                            </button>
                          </div>
                        ) : serverTools.length === 0 ? (
                          <p className="text-xs text-text-tertiary p-3">No tools available</p>
                        ) : (
                          serverTools.map(tool => (
                            <div key={tool.name} className="tool-item">
                              <button
                                onClick={() => toggleToolDisabled(tool.name)}
                                className="tool-toggle-button"
                              >
                                <span className="tool-icon">{tool.name.charAt(0).toUpperCase()}</span>
                                <span className="tool-name">{tool.name}</span>
                                <div className="toggle-switch">
                                  <input 
                                    type="checkbox" 
                                    checked={!disabledTools[tool.name]}
                                    onChange={() => toggleToolDisabled(tool.name)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <span className="toggle-slider"></span>
                                </div>
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          <div className="tools-panel-footer">
            <button 
              onClick={(e) => {
                e.preventDefault();
                onClose();
                navigate('/settings', { state: { activeTab: 'mcp' } });
              }}
              className="add-connectors-link"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14m-7-7h14" />
              </svg>
              Add MCP Server
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ToolsPanel;