# Electron Main Process Documentation

## Overview
This directory contains the Electron main process code that manages the desktop application lifecycle, window management, IPC communication, and integration with AI providers and MCP servers.

## File Structure

### Core Files
- `main.js` - Application entry point, window creation, IPC setup
- `preload.js` - Context bridge for secure renderer-main communication

### Managers
- `authManager.js` - API key management and validation
- `chatHandler.js` - AI provider integration (Groq, OpenAI, OpenRouter)
- `configManager.js` - Application configuration and persistence
- `mcpManager.js` - MCP server lifecycle and communication
- `sessionManager.js` - Chat session save/restore functionality
- `settingsManager.js` - User settings management
- `windowManager.js` - Window state and lifecycle management

### Utilities
- `commandResolver.js` - Cross-platform command resolution
- `messageUtils.js` - Message formatting and processing
- `toolHandler.js` - MCP tool execution handling
- `utils.js` - General utility functions

### Scripts Directory
Platform-specific script runners for MCP servers:
- `run-node.{sh,cmd,ps1}` - Node.js server execution
- `run-npx.{sh,cmd,ps1}` - NPX command execution
- `run-docker.{sh,cmd,ps1}` - Docker container execution
- `run-deno.{sh,cmd,ps1}` - Deno runtime execution
- `run-uvx.{sh,cmd,ps1}` - Python UV execution

## Key Responsibilities

### Window Management (`main.js`, `windowManager.js`)
- Creates and manages the main application window
- Handles window state persistence (size, position)
- Manages application menu and shortcuts
- Controls window lifecycle events

### IPC Communication Patterns

#### Chat Operations
```javascript
// Renderer → Main
ipcMain.handle('chat:send', async (event, { message, settings, tools }) => {
  // Process chat message with AI provider
})

// Main → Renderer (streaming)
mainWindow.webContents.send('chat:stream', { chunk, messageId })
```

#### Settings Management
```javascript
ipcMain.handle('settings:get', async () => {
  // Return current settings
})

ipcMain.handle('settings:update', async (event, newSettings) => {
  // Update and persist settings
})
```

#### MCP Server Control
```javascript
ipcMain.handle('mcp:start', async (event, serverConfig) => {
  // Start MCP server
})

ipcMain.handle('mcp:stop', async (event, serverId) => {
  // Stop MCP server
})
```

### AI Provider Integration (`chatHandler.js`)

Handles communication with different AI providers:

1. **Groq**: Direct SDK integration
2. **OpenAI**: OpenAI SDK with streaming support
3. **OpenRouter**: Custom HTTP implementation

Key methods:
- `initializeProviders()` - Set up provider clients
- `handleChatMessage()` - Route messages to appropriate provider
- `streamResponse()` - Handle streaming responses

### MCP Server Management (`mcpManager.js`)

Manages Model Context Protocol servers:

1. **Server Lifecycle**
   - Start/stop servers based on configuration
   - Monitor server health
   - Handle server crashes and restarts

2. **Tool Discovery**
   - Query available tools from servers
   - Cache tool definitions
   - Validate tool parameters

3. **Tool Execution**
   - Route tool calls to appropriate servers
   - Handle tool approval workflow
   - Return tool results to AI

### Session Management (`sessionManager.js`)

Handles chat session persistence:
- Save chat history to disk
- Restore previous sessions
- Manage session metadata
- Clean up old sessions

### Settings Architecture (`settingsManager.js`)

Three-tier settings hierarchy:
1. **Global Settings** - Application-wide defaults
2. **Project Settings** - Per-project overrides
3. **Session Settings** - Runtime modifications

## Security Considerations

### API Key Storage
- Uses Electron's secure storage mechanisms
- Keys never exposed to renderer process directly
- Validation before provider initialization

### IPC Security
- All IPC handlers validate input
- Context isolation enabled
- No remote module usage
- Sanitized data passed to renderer

### MCP Tool Execution
- Tool approval required before execution
- Sandboxed execution environment
- Command injection prevention
- Output sanitization

## Error Handling

### Provider Errors
- Graceful fallback for API failures
- Rate limit handling
- Timeout management
- User-friendly error messages

### MCP Server Errors
- Automatic restart attempts
- Error logging and reporting
- Graceful degradation
- User notification system

## Development Tips

### Adding New IPC Handlers
1. Define handler in `main.js`
2. Add corresponding invoke in `preload.js`
3. Document in this file
4. Add error handling

### Debugging Main Process
```bash
# Run with debug output
DEBUG=* pnpm dev:electron

# Use Chrome DevTools
electron --inspect=5858 .
```

### Testing MCP Servers
1. Check server logs in Tools Panel
2. Verify tool discovery
3. Test tool execution with approval
4. Monitor server lifecycle events

## Common Issues & Solutions

### Issue: MCP Server Won't Start
- Check command path resolution
- Verify script permissions
- Check server dependencies
- Review server logs

### Issue: API Provider Timeout
- Check API key validity
- Verify network connectivity
- Review rate limits
- Check provider status

### Issue: Settings Not Persisting
- Check file permissions
- Verify storage path
- Clear corrupted cache
- Check disk space