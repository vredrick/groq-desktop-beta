// React hooks
import { useState, useEffect } from 'react';

// React Router
import { Link, useLocation } from 'react-router-dom';

// Local hooks
import { useMCPServerManager } from '../hooks/useMCPServerManager';
import { useSettingsManager } from '../hooks/useSettingsManager';

// Settings components
import AIModelsTab from '../components/settings/AIModelsTab';
import BottomSections from '../components/settings/BottomSections';
import ConfigurationLocations from '../components/settings/ConfigurationLocations';
import MCPServersTab from '../components/settings/MCPServersTab';
import StatusMessage from '../components/settings/StatusMessage';
import Tabs from '../components/settings/Tabs';

const TABS = [
  { id: 'models', label: 'AI Models' },
  { id: 'mcp', label: 'MCP Servers' },
  { id: 'advanced', label: 'Advanced' }
];

function Settings() {
  const location = useLocation();
  const {
    settings,
    updateSettings,
    saveStatus,
    isSaving,
    settingsPath,
    configDir,
    reloadSettingsFromDisk,
    resetToolApprovals
  } = useSettingsManager();

  const mcpManager = useMCPServerManager(settings, updateSettings, () => {
    // Save status is handled by useSettingsManager hook
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [showOpenRouterApiKey, setShowOpenRouterApiKey] = useState(false);
  const [newCustomModel, setNewCustomModel] = useState('');
  const [activeTab, setActiveTab] = useState('models');

  useEffect(() => {
    // Set active tab if provided in location state
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  const handleChange = async (e) => {
    const { name, value } = e.target;
    const updatedSettings = { ...settings, [name]: value };
    
    // If provider changed, ensure we reset the model to a valid one for the new provider
    if (name === 'provider') {
      // Get the models for the new provider
      const configs = await window.electron.getModelConfigs(value);
      const availableModels = Object.keys(configs).filter(key => key !== 'default');
      
      // Select appropriate default model for the provider
      let defaultModel = availableModels.length > 0 ? availableModels[0] : 'default';
      if (value === 'openai' && availableModels.includes('gpt-5-mini')) {
        defaultModel = 'gpt-5-mini';
      } else if (value === 'groq' && availableModels.includes('llama-3.3-70b-versatile')) {
        defaultModel = 'llama-3.3-70b-versatile';
      }
      
      updatedSettings.model = defaultModel;
      console.log('Provider changed to:', value, 'Setting model to:', defaultModel);
    }
    
    updateSettings(updatedSettings);
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const updatedSettings = { ...settings, [name]: parseFloat(value) };
    updateSettings(updatedSettings);
  };

  return (
    <div className="min-h-screen bg-bg-primary p-4 flex flex-col">
      <div className="mx-auto max-w-6xl w-full flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-xl font-bold text-text-primary">Configuration</h1>
          <div className="flex space-x-3">
            <button
              onClick={reloadSettingsFromDisk}
              className="px-3 py-1.5 text-sm bg-surface-secondary text-text-primary rounded hover:bg-surface-hover transition-colors"
            >
              Reload From Disk
            </button>
            <Link to="/" className="px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary-hover transition-colors">
              Back to Chat
            </Link>
          </div>
        </div>

        <StatusMessage isSaving={isSaving} saveStatus={saveStatus} />
        
        <div className="bg-surface-primary rounded-lg border border-border-primary flex-1 flex flex-col">
          <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
          
          <div className="flex-1 overflow-hidden">
            {activeTab === 'models' && (
              <div className="p-4 h-full">
                <AIModelsTab
                  settings={settings}
                  handleChange={handleChange}
                  handleNumberChange={handleNumberChange}
                  showApiKey={showApiKey}
                  setShowApiKey={setShowApiKey}
                  showOpenRouterApiKey={showOpenRouterApiKey}
                  setShowOpenRouterApiKey={setShowOpenRouterApiKey}
                  newCustomModel={newCustomModel}
                  setNewCustomModel={setNewCustomModel}
                />
              </div>
            )}

            {activeTab === 'mcp' && (
              <div className="p-4 h-full">
                <MCPServersTab
                  settings={settings}
                  {...mcpManager}
                />
              </div>
            )}

            {activeTab === 'advanced' && (
              <div className="p-4 h-full">
                <BottomSections
                  handleResetToolApprovals={resetToolApprovals}
                  settings={settings}
                />
              </div>
            )}
          </div>
        </div>

        <ConfigurationLocations settingsPath={settingsPath} configDir={configDir} />
      </div>
    </div>
  );
}

export default Settings;