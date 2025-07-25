const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * Configuration Manager for Groq Desktop
 * Centralizes all configuration paths and provides migration utilities
 */

// Base directory for all Groq configuration
function getGroqBaseDir() {
    return path.join(app.getPath('home'), '.groq');
}

// Configuration paths
const CONFIG_PATHS = {
    // New paths in ~/.groq
    baseDir: getGroqBaseDir(),
    configDir: path.join(getGroqBaseDir(), 'config'),
    settingsFile: path.join(getGroqBaseDir(), 'config', 'settings.json'),
    mcpServersFile: path.join(getGroqBaseDir(), 'config', 'mcp-servers.json'),
    modelsFile: path.join(getGroqBaseDir(), 'config', 'models.json'),
    logsDir: path.join(getGroqBaseDir(), 'logs'),
    projectsDir: path.join(getGroqBaseDir(), 'projects'),
    
    // Legacy paths (for migration)
    legacySettingsFile: path.join(app.getPath('userData'), 'settings.json'),
    legacyLogsDir: app.getPath('logs')
};

// Ensure all necessary directories exist
function ensureDirectories() {
    const dirs = [
        CONFIG_PATHS.baseDir,
        CONFIG_PATHS.configDir,
        CONFIG_PATHS.logsDir,
        CONFIG_PATHS.projectsDir
    ];
    
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Created directory: ${dir}`);
        }
    });
}

// Check if migration is needed
function needsMigration() {
    // Check for legacy settings migration
    const hasLegacySettings = fs.existsSync(CONFIG_PATHS.legacySettingsFile);
    const hasNewSettings = fs.existsSync(CONFIG_PATHS.settingsFile);
    
    // Check if we need to separate models config
    const hasModelsFile = fs.existsSync(CONFIG_PATHS.modelsFile);
    
    // Need migration if:
    // 1. Have legacy settings but no new settings OR
    // 2. Have settings file but no models file (need to separate configs)
    return (hasLegacySettings && !hasNewSettings) || (hasNewSettings && !hasModelsFile);
}

// Migrate settings from old location to new
function migrateSettings() {
    console.log('Starting configuration migration...');
    
    try {
        // Ensure directories exist
        ensureDirectories();
        
        // Case 1: Migrate from legacy location
        if (fs.existsSync(CONFIG_PATHS.legacySettingsFile) && !fs.existsSync(CONFIG_PATHS.settingsFile)) {
            const legacySettings = JSON.parse(fs.readFileSync(CONFIG_PATHS.legacySettingsFile, 'utf8'));
            
            // Extract MCP servers to separate file
            const mcpServers = legacySettings.mcpServers || {};
            const disabledMcpServers = legacySettings.disabledMcpServers || [];
            
            // Extract model configs to separate file
            const modelsConfig = {
                provider: legacySettings.provider || 'groq',
                model: legacySettings.model || 'llama-3.3-70b-versatile',
                temperature: legacySettings.temperature ?? 0.7,
                top_p: legacySettings.top_p ?? 0.95,
                openRouterCustomModels: legacySettings.openRouterCustomModels || []
            };
            
            // Create main settings without MCP servers and model configs
            const mainSettings = { ...legacySettings };
            delete mainSettings.mcpServers;
            delete mainSettings.disabledMcpServers;
            delete mainSettings.provider;
            delete mainSettings.model;
            delete mainSettings.temperature;
            delete mainSettings.top_p;
            delete mainSettings.openRouterCustomModels;
            
            // Save main settings
            fs.writeFileSync(CONFIG_PATHS.settingsFile, JSON.stringify(mainSettings, null, 2));
            console.log(`Migrated settings to: ${CONFIG_PATHS.settingsFile}`);
            
            // Save MCP servers separately
            const mcpConfig = {
                servers: mcpServers,
                disabledServers: disabledMcpServers
            };
            fs.writeFileSync(CONFIG_PATHS.mcpServersFile, JSON.stringify(mcpConfig, null, 2));
            console.log(`Migrated MCP servers to: ${CONFIG_PATHS.mcpServersFile}`);
            
            // Save models config separately
            fs.writeFileSync(CONFIG_PATHS.modelsFile, JSON.stringify(modelsConfig, null, 2));
            console.log(`Migrated models config to: ${CONFIG_PATHS.modelsFile}`);
            
            // Create backup of legacy file
            const backupPath = CONFIG_PATHS.legacySettingsFile + '.backup';
            fs.copyFileSync(CONFIG_PATHS.legacySettingsFile, backupPath);
            console.log(`Created backup: ${backupPath}`);
        }
        
        // Case 2: Separate models from existing settings
        if (fs.existsSync(CONFIG_PATHS.settingsFile) && !fs.existsSync(CONFIG_PATHS.modelsFile)) {
            console.log('Separating models config from settings...');
            const currentSettings = JSON.parse(fs.readFileSync(CONFIG_PATHS.settingsFile, 'utf8'));
            
            // Extract model configs
            const modelsConfig = {
                provider: currentSettings.provider || 'groq',
                model: currentSettings.model || 'llama-3.3-70b-versatile',
                temperature: currentSettings.temperature ?? 0.7,
                top_p: currentSettings.top_p ?? 0.95,
                openRouterCustomModels: currentSettings.openRouterCustomModels || []
            };
            
            // Remove model fields from main settings
            delete currentSettings.provider;
            delete currentSettings.model;
            delete currentSettings.temperature;
            delete currentSettings.top_p;
            delete currentSettings.openRouterCustomModels;
            
            // Save updated settings without model configs
            fs.writeFileSync(CONFIG_PATHS.settingsFile, JSON.stringify(currentSettings, null, 2));
            console.log('Updated settings file (removed model configs)');
            
            // Save models config
            fs.writeFileSync(CONFIG_PATHS.modelsFile, JSON.stringify(modelsConfig, null, 2));
            console.log(`Created models config: ${CONFIG_PATHS.modelsFile}`);
        }
        
        // Create migration complete marker
        const migrationMarker = path.join(CONFIG_PATHS.configDir, '.migration-complete');
        fs.writeFileSync(migrationMarker, new Date().toISOString());
        
        console.log('Migration completed successfully');
        return true;
    } catch (error) {
        console.error('Migration failed:', error);
        return false;
    }
}

// Load settings from the appropriate location
function loadSettings() {
    // First check new location
    if (fs.existsSync(CONFIG_PATHS.settingsFile)) {
        try {
            const settings = JSON.parse(fs.readFileSync(CONFIG_PATHS.settingsFile, 'utf8'));
            // Remove any model-related fields that might still be there
            delete settings.provider;
            delete settings.model;
            delete settings.temperature;
            delete settings.top_p;
            delete settings.openRouterCustomModels;
            return settings;
        } catch (error) {
            console.error('Error reading settings from new location:', error);
        }
    }
    
    // Fall back to legacy location
    if (fs.existsSync(CONFIG_PATHS.legacySettingsFile)) {
        try {
            const legacySettings = JSON.parse(fs.readFileSync(CONFIG_PATHS.legacySettingsFile, 'utf8'));
            // Remove MCP-related and model-related fields as they should be in separate files
            delete legacySettings.mcpServers;
            delete legacySettings.disabledMcpServers;
            delete legacySettings.provider;
            delete legacySettings.model;
            delete legacySettings.temperature;
            delete legacySettings.top_p;
            delete legacySettings.openRouterCustomModels;
            return legacySettings;
        } catch (error) {
            console.error('Error reading legacy settings:', error);
        }
    }
    
    return null;
}

// Load MCP server configuration
function loadMcpServers() {
    // First check new MCP servers file
    if (fs.existsSync(CONFIG_PATHS.mcpServersFile)) {
        try {
            const mcpConfig = JSON.parse(fs.readFileSync(CONFIG_PATHS.mcpServersFile, 'utf8'));
            return {
                mcpServers: mcpConfig.servers || {},
                disabledMcpServers: mcpConfig.disabledServers || []
            };
        } catch (error) {
            console.error('Error reading MCP servers:', error);
        }
    }
    
    // Fall back to legacy settings file
    if (fs.existsSync(CONFIG_PATHS.legacySettingsFile)) {
        try {
            const legacySettings = JSON.parse(fs.readFileSync(CONFIG_PATHS.legacySettingsFile, 'utf8'));
            return {
                mcpServers: legacySettings.mcpServers || {},
                disabledMcpServers: legacySettings.disabledMcpServers || []
            };
        } catch (error) {
            console.error('Error reading legacy MCP servers:', error);
        }
    }
    
    return {
        mcpServers: {},
        disabledMcpServers: []
    };
}

// Save settings to new location
function saveSettings(settings) {
    ensureDirectories();
    fs.writeFileSync(CONFIG_PATHS.settingsFile, JSON.stringify(settings, null, 2));
}

// Save MCP server configuration
function saveMcpServers(mcpServers, disabledMcpServers) {
    ensureDirectories();
    const mcpConfig = {
        servers: mcpServers || {},
        disabledServers: disabledMcpServers || []
    };
    fs.writeFileSync(CONFIG_PATHS.mcpServersFile, JSON.stringify(mcpConfig, null, 2));
}

// Load models configuration
function loadModels() {
    // First check new models file
    if (fs.existsSync(CONFIG_PATHS.modelsFile)) {
        try {
            const modelsConfig = JSON.parse(fs.readFileSync(CONFIG_PATHS.modelsFile, 'utf8'));
            return modelsConfig;
        } catch (error) {
            console.error('Error reading models config:', error);
        }
    }
    
    // Fall back to legacy settings file for model-related configs
    if (fs.existsSync(CONFIG_PATHS.settingsFile)) {
        try {
            const settings = JSON.parse(fs.readFileSync(CONFIG_PATHS.settingsFile, 'utf8'));
            // Extract model-related fields
            const modelsConfig = {
                provider: settings.provider || 'groq',
                model: settings.model || 'llama-3.3-70b-versatile',
                temperature: settings.temperature ?? 0.7,
                top_p: settings.top_p ?? 0.95,
                openRouterCustomModels: settings.openRouterCustomModels || []
            };
            return modelsConfig;
        } catch (error) {
            console.error('Error extracting models from settings:', error);
        }
    }
    
    // Return defaults if nothing found
    return {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        top_p: 0.95,
        openRouterCustomModels: []
    };
}

// Save models configuration
function saveModels(modelsConfig) {
    ensureDirectories();
    fs.writeFileSync(CONFIG_PATHS.modelsFile, JSON.stringify(modelsConfig, null, 2));
}

// Initialize configuration system
function initialize() {
    ensureDirectories();
    
    // Check and perform migration if needed
    if (needsMigration()) {
        console.log('Configuration migration needed...');
        migrateSettings();
    }
    
    console.log('Configuration Manager initialized');
    console.log('Config directory:', CONFIG_PATHS.configDir);
    console.log('Settings file:', CONFIG_PATHS.settingsFile);
    console.log('MCP servers file:', CONFIG_PATHS.mcpServersFile);
    console.log('Models file:', CONFIG_PATHS.modelsFile);
}

module.exports = {
    CONFIG_PATHS,
    initialize,
    ensureDirectories,
    needsMigration,
    migrateSettings,
    loadSettings,
    loadMcpServers,
    loadModels,
    saveSettings,
    saveMcpServers,
    saveModels
};