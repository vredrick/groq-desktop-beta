# Groq Desktop Project Guide

## Project Overview
Groq Desktop is an Electron-based desktop application that provides a chat interface for various AI models including Groq, OpenAI, and OpenRouter. The application supports Model Context Protocol (MCP) servers for extended functionality and tool integration.

## Tech Stack
- **Frontend**: React 19 + Vite + TailwindCSS
- **Backend**: Electron 27 (Node.js)
- **State Management**: React Context API
- **AI SDKs**: Groq SDK, OpenAI SDK, Custom OpenRouter integration
- **MCP Support**: @modelcontextprotocol/sdk for tool extensions

## Project Structure

### Core Directories
- `/electron/` - Electron main process code [See: electron/CLAUDE.md](./electron/CLAUDE.md)
- `/src/renderer/` - React frontend application [See: src/renderer/CLAUDE.md](./src/renderer/CLAUDE.md)
- `/shared/` - Shared utilities and models [See: shared/CLAUDE.md](./shared/CLAUDE.md)

### Configuration Files
- `package.json` - Project dependencies and scripts
- `electron-builder.yml` - Electron build configuration
- `vite.config.cjs` - Vite bundler configuration
- `tailwind.config.cjs` - TailwindCSS configuration

## Key Features
1. **Multi-Provider AI Support**: Groq, OpenAI, OpenRouter
2. **MCP Server Integration**: Tool execution with approval workflows
3. **Session Management**: Save/restore chat sessions
4. **Project-Based Configuration**: Per-project AI settings
5. **Custom System Prompts**: User-defined AI behavior
6. **Tool Approval System**: Security layer for tool execution

## Development Commands
```bash
# Install dependencies
pnpm install

# Run development mode
pnpm dev

# Build for production
pnpm dist

# Platform-specific builds
pnpm dist:mac
pnpm dist:win
pnpm dist:linux
```

## Architecture Patterns

### IPC Communication
The app uses Electron's IPC (Inter-Process Communication) for:
- Chat message handling: `chat:send`, `chat:stream`, `chat:response`
- Settings management: `settings:get`, `settings:update`
- MCP server control: `mcp:*` events
- Session operations: `session:*` events

### State Flow
1. User input → ChatContext → IPC to main process
2. Main process → AI Provider/MCP Server
3. Response → IPC to renderer → UI update

### Security Considerations
- Tool approval required for MCP tool execution
- API keys stored securely in Electron's storage
- Sandboxed renderer process with contextBridge

## Important Files to Know

### Main Process
- `electron/main.js` - Entry point, window management
- `electron/chatHandler.js` - AI provider integration
- `electron/mcpManager.js` - MCP server lifecycle
- `electron/settingsManager.js` - Configuration persistence

### Renderer Process
- `src/renderer/App.jsx` - Main application component
- `src/renderer/context/ChatContext.jsx` - Global chat state
- `src/renderer/hooks/useChatFlow.js` - Chat interaction logic
- `src/renderer/components/ToolsPanel.jsx` - MCP tools UI

## Common Tasks

### Adding a New AI Provider
1. Add provider configuration in `shared/models.js`
2. Implement provider handler in `electron/chatHandler.js`
3. Create provider settings component in `src/renderer/components/settings/providers/`
4. Update `ProviderSelector.jsx` to include new provider

### Adding MCP Server Support
1. Define server config in settings
2. Update `electron/mcpManager.js` for server lifecycle
3. Tool approval handled automatically via `ToolApprovalModal`

### Modifying Chat UI
1. Components in `src/renderer/components/`
2. Styles use TailwindCSS + custom design tokens
3. Message rendering via `MessageList.jsx` and `Message.jsx`

## Testing & Debugging
- Electron DevTools available in development mode
- Console logs visible in both main and renderer processes
- MCP server logs accessible via Tools Panel

## Build & Distribution
- Uses electron-builder for packaging
- Supports Mac (DMG), Windows (NSIS), Linux (AppImage)
- Code signing configuration in `electron-builder.yml`

## Sub-Directory Guides
For detailed information about specific parts of the codebase:
- [Electron Main Process](./electron/CLAUDE.md)
- [React Frontend](./src/renderer/CLAUDE.md)
- [Components Library](./src/renderer/components/CLAUDE.md)
- [React Hooks](./src/renderer/hooks/CLAUDE.md)
- [Shared Utilities](./shared/CLAUDE.md)