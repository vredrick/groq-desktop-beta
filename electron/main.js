// Import necessary Electron modules
const { app, BrowserWindow, ipcMain, screen, shell } = require('electron');

// Import shared models
const { MODEL_CONTEXT_SIZES } = require('../shared/models.js');

// Import handlers
const chatHandler = require('./chatHandler');
const toolHandler = require('./toolHandler');

// Import new manager modules
const { initializeSettingsHandlers, loadSettings } = require('./settingsManager');
const { initializeCommandResolver, resolveCommandPath } = require('./commandResolver');
const { initializeMcpHandlers, connectConfiguredMcpServers, getMcpState } = require('./mcpManager');
const { initializeWindowManager } = require('./windowManager');

// Global variable to hold the main window instance
let mainWindow;

// Variable to hold loaded model context sizes
let modelContextSizes = {};


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

  // Initialize MCP handlers (needs app, mainWindow, settings/command functions)
  initializeMcpHandlers(ipcMain, app, mainWindow, loadSettings, resolveCommandPath);

  // --- Register Core App IPC Handlers --- //

  // Chat completion with streaming - uses chatHandler
  ipcMain.on('chat-stream', async (event, messages, model) => {
    const currentSettings = loadSettings(); // Get current settings from settingsManager
    const { discoveredTools } = getMcpState(); // Get current tools from mcpManager
    chatHandler.handleChatStream(event, messages, model, currentSettings, modelContextSizes, discoveredTools);
  });

  // Handler for executing tool calls - uses toolHandler
  ipcMain.handle('execute-tool-call', async (event, toolCall) => {
    const { discoveredTools, mcpClients } = getMcpState(); // Get current state from mcpManager
    return toolHandler.handleExecuteToolCall(event, toolCall, discoveredTools, mcpClients);
  });

  // Handler for getting model configurations
  ipcMain.handle('get-model-configs', async () => {
      // Return a copy to prevent accidental modification
      return JSON.parse(JSON.stringify(modelContextSizes));
  });

  // --- Post-initialization Tasks --- //

  // Attempt to connect to configured MCP servers after setup
  // Wrap in a small timeout to ensure renderer is likely ready for status updates
  setTimeout(() => {
      connectConfiguredMcpServers(); // Call the function from mcpManager
  }, 1000); // 1 second delay

  console.log("Initialization complete.");
});

// Note: App lifecycle events (window-all-closed, activate) are now handled by windowManager.js

// Keep any essential top-level error handling or logging if needed
process.on('uncaughtException', (error) => {
    console.error('Unhandled Exception:', error);
    // Optionally: Log to file, show dialog, etc.
});