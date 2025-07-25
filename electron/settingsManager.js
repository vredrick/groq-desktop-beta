const fs = require('fs');
const path = require('path');
const configManager = require('./configManager');

let appInstance; // To store app instance for userData path

// Helper function to load settings with defaults and validation
function loadSettings() {
    const defaultSettings = {
        GROQ_API_KEY: "<replace me>",
        OPENROUTER_API_KEY: "<replace me>",
        customSystemPrompt: '',
        customCompletionUrl: '',
        toolOutputLimit: 8000
    };
    
    const defaultModels = {
        provider: "groq",
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        top_p: 0.95,
        openRouterCustomModels: []
    };

    try {
        // Load main settings from config manager
        const mainSettings = configManager.loadSettings();
        
        // Load MCP servers from separate file
        const { mcpServers, disabledMcpServers } = configManager.loadMcpServers();
        
        // Load models config from separate file
        const modelsConfig = configManager.loadModels();
        
        if (mainSettings) {
            // Merge all settings together
            const settings = {
                ...defaultSettings,
                ...mainSettings,
                ...defaultModels,
                ...modelsConfig,
                mcpServers,
                disabledMcpServers
            };
            
            // Ensure all required fields have values
            settings.GROQ_API_KEY = settings.GROQ_API_KEY || defaultSettings.GROQ_API_KEY;
            settings.OPENROUTER_API_KEY = settings.OPENROUTER_API_KEY || defaultSettings.OPENROUTER_API_KEY;
            settings.customSystemPrompt = settings.customSystemPrompt || defaultSettings.customSystemPrompt;
            settings.customCompletionUrl = settings.customCompletionUrl || defaultSettings.customCompletionUrl;
            settings.toolOutputLimit = settings.toolOutputLimit ?? defaultSettings.toolOutputLimit;
            settings.provider = settings.provider || defaultModels.provider;
            settings.model = settings.model || defaultModels.model;
            settings.temperature = settings.temperature ?? defaultModels.temperature;
            settings.top_p = settings.top_p ?? defaultModels.top_p;
            settings.openRouterCustomModels = settings.openRouterCustomModels || defaultModels.openRouterCustomModels;
            
            return settings;
        } else {
            // No settings found, create with defaults
            configManager.saveSettings(defaultSettings);
            configManager.saveMcpServers({}, []);
            configManager.saveModels(defaultModels);
            console.log('Settings files created with defaults in ~/.groq/config/');
            return {
                ...defaultSettings,
                ...defaultModels,
                mcpServers: {},
                disabledMcpServers: []
            };
        }
    } catch (error) {
        console.error('Error reading or parsing settings:', error);
        // Return defaults with empty MCP config in case of error
        return {
            ...defaultSettings,
            ...defaultModels,
            mcpServers: {},
            disabledMcpServers: []
        };
    }
}

function initializeSettingsHandlers(ipcMain, app) {
    appInstance = app; // Store app instance
    
    // Initialize config manager
    configManager.initialize();

    // Log settings paths on initialization
    console.log('SettingsManager Initialized.');
    console.log('Main settings:', configManager.CONFIG_PATHS.settingsFile);
    console.log('MCP servers:', configManager.CONFIG_PATHS.mcpServersFile);

    // Handler for getting settings
    ipcMain.handle('get-settings', async () => {
      return loadSettings();
    });

    // Handler for getting settings file path
    ipcMain.handle('get-settings-path', async () => {
      return configManager.CONFIG_PATHS.settingsFile;
    });
    
    // Handler for getting config directory path
    ipcMain.handle('get-config-dir', async () => {
      return configManager.CONFIG_PATHS.configDir;
    });
    
    // Handler for opening config directory
    ipcMain.handle('open-config-directory', async () => {
      const { shell } = require('electron');
      const configDir = configManager.CONFIG_PATHS.configDir;
      try {
        await shell.openPath(configDir);
        return { success: true };
      } catch (error) {
        console.error('Error opening config directory:', error);
        return { success: false, error: error.message };
      }
    });

    // Handler for reloading settings from disk
    ipcMain.handle('reload-settings', async () => {
      try {
        const settings = loadSettings(); // Reload and validate
        return { success: true, settings };
      } catch (error) {
         console.error('Error reloading settings via handler:', error);
         return { success: false, error: error.message };
      }
    });

    // Handler for saving settings
    ipcMain.handle('save-settings', async (event, settings) => {
      try {
        // Basic validation before saving
        if (!settings || typeof settings !== 'object') {
            throw new Error("Invalid settings object provided.");
        }
        
        // Extract MCP-related settings
        const { mcpServers, disabledMcpServers, ...restSettings } = settings;
        
        // Extract model-related settings
        const { 
            provider, 
            model, 
            temperature, 
            top_p, 
            openRouterCustomModels,
            ...mainSettings 
        } = restSettings;
        
        // Create models config object
        const modelsConfig = {
            provider,
            model,
            temperature,
            top_p,
            openRouterCustomModels
        };
        
        // Save all three configs separately
        configManager.saveSettings(mainSettings);
        configManager.saveMcpServers(mcpServers, disabledMcpServers);
        configManager.saveModels(modelsConfig);
        
        // Notify all windows about settings change
        const { BrowserWindow } = require('electron');
        BrowserWindow.getAllWindows().forEach(window => {
            window.webContents.send('settings-changed', settings);
        });
        
        return { success: true };
      } catch (error) {
        console.error('Error saving settings:', error);
        return { success: false, error: error.message };
      }
    });
}

module.exports = {
    loadSettings,
    initializeSettingsHandlers
}; 