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
    const hasLegacySettings = fs.existsSync(CONFIG_PATHS.legacySettingsFile);
    const hasNewSettings = fs.existsSync(CONFIG_PATHS.settingsFile);
    return hasLegacySettings && !hasNewSettings;
}

// Migrate settings from old location to new
function migrateSettings() {
    console.log('Starting configuration migration...');
    
    try {
        // Ensure directories exist
        ensureDirectories();
        
        // Migrate settings.json
        if (fs.existsSync(CONFIG_PATHS.legacySettingsFile) && !fs.existsSync(CONFIG_PATHS.settingsFile)) {
            const legacySettings = JSON.parse(fs.readFileSync(CONFIG_PATHS.legacySettingsFile, 'utf8'));
            
            // Extract MCP servers to separate file
            const mcpServers = legacySettings.mcpServers || {};
            const disabledMcpServers = legacySettings.disabledMcpServers || [];
            
            // Create main settings without MCP servers
            const mainSettings = { ...legacySettings };
            delete mainSettings.mcpServers;
            delete mainSettings.disabledMcpServers;
            
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
            
            // Create backup of legacy file
            const backupPath = CONFIG_PATHS.legacySettingsFile + '.backup';
            fs.copyFileSync(CONFIG_PATHS.legacySettingsFile, backupPath);
            console.log(`Created backup: ${backupPath}`);
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
            return settings;
        } catch (error) {
            console.error('Error reading settings from new location:', error);
        }
    }
    
    // Fall back to legacy location
    if (fs.existsSync(CONFIG_PATHS.legacySettingsFile)) {
        try {
            const legacySettings = JSON.parse(fs.readFileSync(CONFIG_PATHS.legacySettingsFile, 'utf8'));
            // Remove MCP-related fields as they should be in separate file
            delete legacySettings.mcpServers;
            delete legacySettings.disabledMcpServers;
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
}

module.exports = {
    CONFIG_PATHS,
    initialize,
    ensureDirectories,
    needsMigration,
    migrateSettings,
    loadSettings,
    loadMcpServers,
    saveSettings,
    saveMcpServers
};