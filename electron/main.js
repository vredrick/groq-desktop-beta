const { app } = require('electron');
const fs   = require('fs');
const path = require('path');

// Create ~/Library/Logs/Groq Desktop if it does not exist
app.setAppLogsPath();
const logFile = path.join(app.getPath('logs'), 'main.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Mirror every console.* call to the file
['log', 'info', 'warn', 'error'].forEach(fn => {
  const orig = console[fn].bind(console);
  console[fn] = (...args) => {
    orig(...args);
    logStream.write(args.map(String).join(' ') + '\n');
  };
});

console.log('Groq Desktop started, logging to', logFile);

// Import necessary Electron modules
const { BrowserWindow, ipcMain, screen, shell, dialog } = require('electron');

// Import shared models
const { MODEL_CONTEXT_SIZES } = require('../shared/models.js');

// Import handlers
const chatHandler = require('./chatHandler');
const toolHandler = require('./toolHandler');

// Import new manager modules
const { initializeSettingsHandlers, loadSettings } = require('./settingsManager');
const { initializeCommandResolver, resolveCommandPath } = require('./commandResolver');
const mcpManager = require('./mcpManager');
const { initializeWindowManager } = require('./windowManager');
const authManager = require('./authManager');
const sessionManager = require('./sessionManager');

// Global variable to hold the main window instance
let mainWindow;

// Variable to hold loaded model context sizes
let modelContextSizes = {};

// Variable to hold current working directory
let currentWorkingDirectory = null;

// App initialization sequence
app.whenReady().then(async () => {
  console.log("App Ready. Initializing...");

  // Initialize command resolver first (might be needed by others)
  initializeCommandResolver(app);

  // Load model context sizes from the JS module
  try {
    modelContextSizes = MODEL_CONTEXT_SIZES;
    console.log('Successfully loaded shared model definitions.');
  } catch (error) {
    console.error('Failed to load shared model definitions:', error);
    modelContextSizes = { 'default': { context: 8192, vision_supported: false } }; // Fallback
  }

  // Initialize window manager and get the main window instance
  mainWindow = initializeWindowManager(app, screen, shell, BrowserWindow);
  if (!mainWindow) {
      console.error("Fatal: Main window could not be created. Exiting.");
      app.quit();
      return;
  }

  // Initialize settings handlers (needs app)
  initializeSettingsHandlers(ipcMain, app);

  // Initialize MCP handlers (use module object)
  mcpManager.initializeMcpHandlers(ipcMain, app, mainWindow, loadSettings, resolveCommandPath);

  // Initialize Auth Manager (check will now work)
  console.log("[Main Init] Initializing Auth Manager...");
  if (mcpManager && typeof mcpManager.retryConnectionAfterAuth === 'function') {
      authManager.initialize(mcpManager.retryConnectionAfterAuth);
  } else {
       console.error("[Main] CRITICAL: mcpManager or retryConnectionAfterAuth not available for AuthManager initialization!");
  }

  // --- Register Core App IPC Handlers --- //
  // Chat completion (use module object)
  ipcMain.on('chat-stream', async (event, messages, model) => {
    const currentSettings = loadSettings();
    const { discoveredTools } = mcpManager.getMcpState(); // Use module object
    chatHandler.handleChatStream(event, messages, model, currentSettings, modelContextSizes, discoveredTools);
  });

  // Tool execution (use module object)
  console.log("[Main Init] Registering execute-tool-call...");
  ipcMain.handle('execute-tool-call', async (event, toolCall) => {
    const currentSettings = loadSettings();
    const { discoveredTools, mcpClients } = mcpManager.getMcpState(); // Use module object
    return toolHandler.handleExecuteToolCall(event, toolCall, discoveredTools, mcpClients, currentSettings);
  });

  // Handler for getting model configurations
  ipcMain.handle('get-model-configs', async () => {
      // Return a copy to prevent accidental modification
      return JSON.parse(JSON.stringify(modelContextSizes));
  });

  // --- Auth IPC Handler ---
  ipcMain.handle('start-mcp-auth-flow', async (event, { serverId, serverUrl }) => {
      if (!serverId || !serverUrl) {
          throw new Error("Missing serverId or serverUrl for start-mcp-auth-flow");
      }
      try {
          console.log(`[Main] Handling start-mcp-auth-flow for ${serverId}`);
          const result = await authManager.initiateAuthFlow(serverId, serverUrl);
          return result;
      } catch (error) {
          console.error(`[Main] Error handling start-mcp-auth-flow for ${serverId}:`, error);
          throw error;
      }
  });

  // --- Session Management IPC Handlers ---
  // Select working directory
  ipcMain.handle('select-working-directory', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Select Working Directory for Chat Sessions'
      });
      
      if (!result.canceled && result.filePaths.length > 0) {
        currentWorkingDirectory = result.filePaths[0];
        console.log(`Working directory set to: ${currentWorkingDirectory}`);
        return { success: true, directory: currentWorkingDirectory };
      }
      return { success: false, message: 'No directory selected' };
    } catch (error) {
      console.error('Error selecting working directory:', error);
      return { success: false, message: error.message };
    }
  });

  // Get current working directory
  ipcMain.handle('get-current-directory', async () => {
    return currentWorkingDirectory;
  });

  // Set working directory programmatically
  ipcMain.handle('set-working-directory', async (event, directory) => {
    currentWorkingDirectory = directory;
    console.log(`Working directory set to: ${currentWorkingDirectory}`);
    return { success: true, directory: currentWorkingDirectory };
  });

  // Create new session
  ipcMain.handle('create-new-session', async () => {
    if (!currentWorkingDirectory) {
      return { success: false, message: 'No working directory selected' };
    }
    
    try {
      const projectDir = sessionManager.getProjectSessionDir(currentWorkingDirectory);
      const sessionFile = sessionManager.createNewSession(projectDir);
      console.log(`Created new session: ${sessionFile}`);
      return { success: true, sessionFile };
    } catch (error) {
      console.error('Error creating new session:', error);
      return { success: false, message: error.message };
    }
  });

  // Get current session
  ipcMain.handle('get-current-session', async () => {
    if (!currentWorkingDirectory) {
      return { success: false, message: 'No working directory selected' };
    }
    
    try {
      const projectDir = sessionManager.getProjectSessionDir(currentWorkingDirectory);
      const sessionFile = sessionManager.getCurrentSession(projectDir);
      return { success: true, sessionFile };
    } catch (error) {
      console.error('Error getting current session:', error);
      return { success: false, message: error.message };
    }
  });

  // Save message to session
  ipcMain.handle('save-message', async (event, message) => {
    if (!currentWorkingDirectory) {
      return { success: false, message: 'No working directory selected' };
    }
    
    try {
      const projectDir = sessionManager.getProjectSessionDir(currentWorkingDirectory);
      const sessionFile = sessionManager.getCurrentSession(projectDir);
      const saved = sessionManager.saveMessage(sessionFile, message);
      return { success: saved };
    } catch (error) {
      console.error('Error saving message:', error);
      return { success: false, message: error.message };
    }
  });

  // Save tool call to session
  ipcMain.handle('save-tool-call', async (event, toolCall) => {
    if (!currentWorkingDirectory) {
      return { success: false, message: 'No working directory selected' };
    }
    
    try {
      const projectDir = sessionManager.getProjectSessionDir(currentWorkingDirectory);
      const sessionFile = sessionManager.getCurrentSession(projectDir);
      const saved = sessionManager.saveToolCall(sessionFile, toolCall);
      return { success: saved };
    } catch (error) {
      console.error('Error saving tool call:', error);
      return { success: false, message: error.message };
    }
  });

  // Save tool result to session
  ipcMain.handle('save-tool-result', async (event, toolName, result) => {
    if (!currentWorkingDirectory) {
      return { success: false, message: 'No working directory selected' };
    }
    
    try {
      const projectDir = sessionManager.getProjectSessionDir(currentWorkingDirectory);
      const sessionFile = sessionManager.getCurrentSession(projectDir);
      const saved = sessionManager.saveToolResult(sessionFile, toolName, result);
      return { success: saved };
    } catch (error) {
      console.error('Error saving tool result:', error);
      return { success: false, message: error.message };
    }
  });

  // Load session from file
  ipcMain.handle('load-session', async (event, sessionFile) => {
    try {
      const messages = sessionManager.loadSession(sessionFile);
      return { success: true, messages };
    } catch (error) {
      console.error('Error loading session:', error);
      return { success: false, message: error.message };
    }
  });

  // List sessions for current project
  ipcMain.handle('list-sessions', async () => {
    if (!currentWorkingDirectory) {
      return { success: false, message: 'No working directory selected' };
    }
    
    try {
      const projectDir = sessionManager.getProjectSessionDir(currentWorkingDirectory);
      const sessions = sessionManager.listSessions(projectDir);
      return { success: true, sessions };
    } catch (error) {
      console.error('Error listing sessions:', error);
      return { success: false, message: error.message };
    }
  });

  // Delete session
  ipcMain.handle('delete-session', async (event, sessionFile) => {
    try {
      const deleted = sessionManager.deleteSession(sessionFile);
      return { success: deleted };
    } catch (error) {
      console.error('Error deleting session:', error);
      return { success: false, message: error.message };
    }
  });

  // Export session as markdown
  ipcMain.handle('export-session', async (event, sessionFile) => {
    try {
      const markdown = sessionManager.exportSessionAsMarkdown(sessionFile);
      if (markdown) {
        return { success: true, markdown };
      }
      return { success: false, message: 'Failed to export session' };
    } catch (error) {
      console.error('Error exporting session:', error);
      return { success: false, message: error.message };
    }
  });

  // Get recent projects
  ipcMain.handle('get-recent-projects', async () => {
    try {
      const projects = sessionManager.getRecentProjects();
      return projects;
    } catch (error) {
      console.error('Error getting recent projects:', error);
      return [];
    }
  });

  // Get Groq projects directory path
  ipcMain.handle('get-groq-projects-dir', async () => {
    return sessionManager.getGroqProjectsDir();
  });

  // --- Post-initialization Tasks --- //
  setTimeout(() => {
      mcpManager.connectConfiguredMcpServers(); // Use module object
  }, 1000);

  console.log("Initialization complete.");
});

// Note: App lifecycle events (window-all-closed, activate) are now handled by windowManager.js

// Keep any essential top-level error handling or logging if needed
process.on('uncaughtException', (error) => {
    console.error('Unhandled Exception:', error);
    // Optionally: Log to file, show dialog, etc.
});