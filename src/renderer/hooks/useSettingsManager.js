import { useState, useEffect, useRef } from 'react';

const DEFAULT_SETTINGS = {
  GROQ_API_KEY: '',
  OPENROUTER_API_KEY: '',
  provider: 'groq',
  temperature: 0.7,
  top_p: 0.95,
  mcpServers: {},
  disabledMcpServers: [],
  customSystemPrompt: '',
  customCompletionUrl: '',
  toolOutputLimit: 8000,
  openRouterCustomModels: []
};

export function useSettingsManager() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saveStatus, setSaveStatus] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [settingsPath, setSettingsPath] = useState('');
  const [configDir, setConfigDir] = useState('');
  
  const statusTimeoutRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    loadSettings();
    loadPaths();

    return () => {
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const loadSettings = async () => {
    try {
      const settingsData = await window.electron.getSettings();
      if (!settingsData.disabledMcpServers) {
        settingsData.disabledMcpServers = [];
      }
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading settings:', error);
      setSettings(DEFAULT_SETTINGS);
    }
  };

  const loadPaths = async () => {
    try {
      const [path, dir] = await Promise.all([
        window.electron.getSettingsPath(),
        window.electron.getConfigDir()
      ]);
      setSettingsPath(path);
      setConfigDir(dir);
    } catch (error) {
      console.error('Error getting paths:', error);
    }
  };

  const saveSettings = (updatedSettings) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setIsSaving(true);
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const settingsToSave = {
          ...updatedSettings,
          disabledMcpServers: updatedSettings.disabledMcpServers || []
        };
        const result = await window.electron.saveSettings(settingsToSave);
        if (result.success) {
          setSaveStatus({ type: 'success', message: 'Settings saved' });
          
          if (statusTimeoutRef.current) {
            clearTimeout(statusTimeoutRef.current);
          }
          statusTimeoutRef.current = setTimeout(() => {
            setSaveStatus(null);
          }, 2000);
        } else {
          setSaveStatus({ type: 'error', message: `Failed to save: ${result.error}` });
        }
      } catch (error) {
        console.error('Error saving settings:', error);
        setSaveStatus({ type: 'error', message: `Error: ${error.message}` });
      } finally {
        setIsSaving(false);
      }
    }, 800);
  };

  const updateSettings = (newSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const reloadSettingsFromDisk = async () => {
    try {
      setSaveStatus({ type: 'info', message: 'Reloading settings...' });
      const result = await window.electron.reloadSettings();
      
      if (result.success) {
        setSettings(result.settings);
        setSaveStatus({ type: 'success', message: 'Settings reloaded' });
      } else {
        setSaveStatus({ type: 'error', message: `Failed to reload: ${result.error}` });
      }
      
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
      statusTimeoutRef.current = setTimeout(() => {
        setSaveStatus(null);
      }, 2000);
    } catch (error) {
      console.error('Error reloading settings:', error);
      setSaveStatus({ type: 'error', message: `Error: ${error.message}` });
    }
  };

  const resetToolApprovals = () => {
    setIsSaving(true);
    setSaveStatus({ type: 'info', message: 'Resetting approvals...' });

    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('tool_approval_') || key === 'tool_approval_yolo_mode')) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`Removed tool approval key: ${key}`);
      });

      setSaveStatus({ type: 'success', message: 'Tool call approvals reset' });
    } catch (error) {
      console.error('Error resetting tool approvals:', error);
      setSaveStatus({ type: 'error', message: `Error resetting: ${error.message}` });
    } finally {
      setIsSaving(false);
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
      statusTimeoutRef.current = setTimeout(() => {
        setSaveStatus(null);
      }, 2000);
    }
  };

  return {
    settings,
    updateSettings,
    saveStatus,
    isSaving,
    settingsPath,
    configDir,
    reloadSettingsFromDisk,
    resetToolApprovals
  };
}