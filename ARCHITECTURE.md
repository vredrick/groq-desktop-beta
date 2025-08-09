# Groq Desktop Architecture

## Overview

Groq Desktop is an Electron-based desktop application that provides a chat interface with AI models, featuring tool execution capabilities through the Model Context Protocol (MCP). The application supports multiple AI providers (Groq, OpenAI, OpenRouter, Custom), streaming responses, tool approval workflows, and persistent session management.

## Directory Structure

```
groq-desktop-beta/
├── electron/                     # Main process code (Node.js)
│   ├── main.js                  # Electron main entry point & IPC handlers
│   ├── preload.js               # Preload script for secure IPC exposure
│   ├── chatHandler.js           # Chat streaming & API integration
│   ├── toolHandler.js           # Tool execution handling
│   ├── mcpManager.js            # MCP server lifecycle management
│   ├── sessionManager.js        # Session persistence (JSONL format)
│   ├── settingsManager.js       # Application configuration management
│   ├── configManager.js         # Config file I/O operations
│   ├── commandResolver.js       # Cross-platform command resolution
│   ├── authManager.js           # OAuth2 authentication for MCP
│   ├── windowManager.js         # Electron window lifecycle
│   ├── messageUtils.js          # Message processing utilities
│   └── utils.js                 # General utilities
│
├── src/
│   └── renderer/                # Renderer process (React SPA)
│       ├── App.jsx              # Main application component
│       ├── main.jsx             # React entry point
│       ├── index.css            # Global styles
│       │
│       ├── context/             # React Context Providers
│       │   └── ChatContext.jsx  # Global chat state management
│       │
│       ├── hooks/               # Custom React hooks
│       │   ├── useChatFlow.js           # Chat orchestration & streaming
│       │   ├── useChatExecution.js      # Chat execution utilities
│       │   ├── useModelSelection.js     # AI model selection logic
│       │   ├── useMcpServers.js         # MCP server management
│       │   ├── useMCPServerManager.js   # Advanced MCP operations
│       │   ├── useSettingsManager.js    # Settings validation & persistence
│       │   ├── useToolApproval.js       # Tool approval workflow
│       │   └── useUIState.js            # UI state management
│       │
│       ├── services/            # Business logic services
│       │   └── ChatFlowStateMachine.js  # Chat flow state management
│       │
│       ├── utils/               # Utility functions
│       │   ├── toolApproval.js          # Tool approval localStorage
│       │   ├── validation.js            # Input validation utilities
│       │   └── mcpHelpers.js            # MCP-specific helpers
│       │
│       ├── constants/           # Application constants
│       │   └── settings.js              # Settings-related constants
│       │
│       ├── components/          # React components
│       │   ├── ChatInput.jsx            # Message input with file support
│       │   ├── MessageList.jsx          # Chat message display
│       │   ├── Message.jsx              # Individual message component
│       │   ├── ToolCall.jsx             # Tool call display
│       │   ├── ToolApprovalModal.jsx    # Tool approval dialog
│       │   ├── ToolsPanel.jsx           # MCP tools sidebar
│       │   ├── SessionHistory.jsx       # Session management UI
│       │   ├── DirectorySelector.jsx    # Working directory selection
│       │   ├── LogViewerModal.jsx       # MCP server log viewer
│       │   ├── MarkdownRenderer.jsx     # Markdown content renderer
│       │   └── settings/                # Settings UI components
│       │       ├── AIModelsTab.jsx              # Model configuration
│       │       ├── MCPServersTab.jsx            # MCP server management
│       │       ├── GenerationParameters.jsx     # AI generation settings
│       │       ├── CustomSystemPrompt.jsx       # System prompt editor
│       │       ├── ConfigurationLocations.jsx   # Config file locations
│       │       ├── BottomSections.jsx           # Settings footer
│       │       ├── StatusMessage.jsx            # Status notifications
│       │       ├── Tabs.jsx                     # Settings tab navigation
│       │       ├── providers/                   # Provider-specific settings
│       │       │   ├── ProviderSelector.jsx
│       │       │   ├── GroqProviderSettings.jsx
│       │       │   ├── OpenAIProviderSettings.jsx
│       │       │   ├── OpenRouterProviderSettings.jsx
│       │       │   └── CustomProviderSettings.jsx
│       │       └── mcp/                        # MCP configuration UI
│       │           ├── MCPFormView.jsx
│       │           ├── MCPJsonView.jsx
│       │           ├── MCPServerForm.jsx
│       │           └── MCPServerList.jsx
│       │
│       ├── pages/               # Page-level components
│       │   ├── Settings.jsx             # Settings page
│       │   └── ProjectSelector.jsx      # Project selection page
│       │
│       └── styles/              # Component-specific styles
│           └── design-tokens.css        # CSS custom properties
│
├── shared/                      # Code shared between main & renderer
│   ├── models.js               # Groq model configurations
│   ├── openAIModels.js         # OpenAI model configurations
│   └── openRouterModels.js     # OpenRouter model configurations
│
└── public/                      # Static assets
    └── icon.png                # Application icon
```

## Architecture Patterns

### 1. Electron IPC Communication

The application uses Electron's IPC (Inter-Process Communication) for secure communication between main and renderer processes. The `preload.js` script exposes a controlled API through `contextBridge`:

```javascript
// Secure API exposure through preload
contextBridge.exposeInMainWorld('electron', {
  // Settings management
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // Streaming chat API
  startChatStream: (messages, model) => {
    ipcRenderer.send('chat-stream', messages, model);
    return {
      onContent: (callback) => ipcRenderer.on('chat-stream-content', callback),
      onComplete: (callback) => ipcRenderer.on('chat-stream-complete', callback),
      cleanup: () => /* remove listeners */
    };
  }
});
```

**Key IPC Channels:**
- **Settings**: `get-settings`, `save-settings`, `settings-changed`
- **Chat**: `chat-stream`, `chat-stream-*` events, `execute-tool-call`
- **MCP**: `connect-mcp-server`, `disconnect-mcp-server`, `get-mcp-tools`
- **Sessions**: `create-new-session`, `save-message`, `load-session`
- **Auth**: `start-mcp-auth-flow`, `mcp-auth-reconnect-complete`

### 2. State Management Architecture

#### ChatContext (Global State)
- **Purpose**: Manages global chat state and session persistence
- **Scope**: Messages, working directory, session metadata
- **Persistence**: Auto-saves to JSONL session files
- **Usage**: Available throughout the component tree

#### Local Component State
- **Purpose**: UI-specific state (modal visibility, form inputs)
- **Scope**: Component-local using `useState` and `useEffect`
- **Patterns**: Custom hooks for reusable stateful logic

#### Settings State
- **Purpose**: Application configuration management
- **Scope**: Global settings with provider-specific configurations
- **Persistence**: JSON file in user config directory
- **Validation**: Real-time validation with error reporting

### 3. Chat Flow State Machine

The chat execution flow is managed by a deterministic state machine that handles complex tool execution workflows:

```
IDLE ──(SEND_MESSAGE)──→ STREAMING
  ↑                          │
  │                         │(STREAM_COMPLETE)
  │                          ↓
  └──(STOP)───────── PROCESSING_TOOLS
                            │ ↑
                  (tool?)   │ │ (process next tool)
                            ↓ │
                    ┌─ AWAITING_APPROVAL
                    │       │ │
            (auto)  │       │ │ (TOOL_APPROVED)
                    │       ↓ │
                    └→ EXECUTING_TOOL ──(TOOL_EXECUTED)──┘
                            │
                   (ALL_TOOLS_PROCESSED)
                            │
                            ↓
                       COMPLETED ──(CONTINUE_CONVERSATION)──→ STREAMING
```

**State Descriptions:**
- **IDLE**: No active chat operation
- **STREAMING**: Receiving AI response via streaming
- **PROCESSING_TOOLS**: Processing tool calls from AI response
- **AWAITING_APPROVAL**: Waiting for user tool approval
- **EXECUTING_TOOL**: Executing approved tool via MCP
- **COMPLETED**: Turn completed, ready for next message

**Events & Transitions:**
- Tool approval can be automatic ("always", "yolo") or require user confirmation
- Multiple tools in a single turn are processed sequentially
- Error handling transitions back to IDLE or ERROR state
- State machine context carries messages, tools, and execution state

### 4. Custom Hooks Architecture

The application uses a comprehensive set of custom hooks for state management and business logic:

**useChatFlow(selectedModel)**
- **Purpose**: Orchestrates complete chat conversation flow
- **Responsibilities**: 
  - Manages ChatFlowStateMachine lifecycle
  - Handles streaming responses from AI providers
  - Coordinates tool execution and approval workflows
  - Integrates with session persistence
- **Key Methods**: `sendMessage()`, `handleToolApproval()`, `stopStream()`

**useModelSelection()**
- **Purpose**: AI model selection and configuration management
- **Responsibilities**:
  - Loads available models based on current provider
  - Persists model selection to settings
  - Provides model capabilities (vision support, context size)
  - Handles provider switching and model validation
- **State**: `selectedModel`, `models[]`, `visionSupported`, `modelConfigs`

**useMcpServers()**
- **Purpose**: MCP server connection and tool management
- **Responsibilities**:
  - Maintains real-time connection status
  - Provides unified tools list from all servers
  - Handles server connect/disconnect operations
  - Updates UI with connection status and tool counts
- **Methods**: `disconnectMcpServer()`, `reconnectMcpServer()`, `refreshMcpTools()`

**useToolApproval()**
- **Purpose**: Tool execution approval workflow
- **Responsibilities**:
  - Manages pending tool approvals
  - Persists approval preferences (always, yolo, prompt)
  - Integrates with localStorage for preference storage
- **States**: `pendingApprovalCall`, `pausedChatState`

**useSettingsManager()**
- **Purpose**: Application settings with validation
- **Responsibilities**:
  - Real-time settings validation
  - Error reporting and user feedback
  - Atomic settings updates
  - Provider-specific configuration handling

**useUIState()**
- **Purpose**: Application UI state management
- **Responsibilities**:
  - Sidebar collapse/expand state
  - Modal visibility management
  - Navigation state
  - Responsive layout adjustments

### 5. MCP Integration Architecture

The Model Context Protocol (MCP) integration provides a robust, extensible tool system:

#### Transport Layers
**Stdio Transport (Local Processes)**
```javascript
{
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem"],
  "env": { "PATH": "/usr/local/bin:/usr/bin" }
}
```

**SSE Transport (HTTP Endpoints)**
```javascript
{
  "transport": "sse",
  "url": "https://api.example.com/mcp"
}
```

**StreamableHTTP Transport (HTTP Streaming)**
```javascript
{
  "transport": "streamableHttp", 
  "url": "https://api.example.com/mcp-stream"
}
```

#### Server Lifecycle Management
1. **Connection**: Auto-connect configured servers on startup
2. **Discovery**: List available tools via `listTools()` 
3. **Health Monitoring**: Periodic health checks with automatic reconnection
4. **Error Handling**: Graceful degradation and error reporting
5. **Authentication**: OAuth2 flow for HTTP transports
6. **Logging**: Comprehensive server logs with real-time streaming

#### Tool Execution Flow
```
AI Response → Tool Calls → Approval Check → MCP Execution → Results → Continue Chat
                ↓
        User Approval Modal (if needed)
                ↓
        localStorage Preference Storage
```

#### Authentication System
- **OAuth2 Support**: For HTTP-based MCP servers
- **Token Management**: Secure token storage and refresh
- **Auth Flow**: Browser-based authorization with callback handling
- **Retry Logic**: Automatic reconnection with fresh tokens

### 6. Session Management System

#### Storage Architecture
**Project-based Organization**
```
~/.groq/projects/
├── my-project-name/
│   ├── .project-metadata.json       # Project info
│   ├── session-2024-01-01T10-00-00-000Z.jsonl
│   └── session-2024-01-01T14-30-15-123Z.jsonl
└── another-project/
    ├── .project-metadata.json
    └── session-2024-01-01T16-45-00-456Z.jsonl
```

**JSONL Format (JSON Lines)**
```jsonl
{"timestamp":"2024-01-01T10:00:00.000Z","type":"message","role":"user","content":"Hello"}
{"timestamp":"2024-01-01T10:00:01.000Z","type":"message","role":"assistant","content":"Hi there!","tool_calls":[...]}
{"timestamp":"2024-01-01T10:00:02.000Z","type":"tool_result","tool":"filesystem","result":"...","tool_call_id":"call_123"}
```

#### Session Features
- **Incremental Saving**: Messages saved immediately for reliability
- **Tool Call Linking**: Tool results linked via `tool_call_id`
- **Session Recovery**: Load previous sessions with full conversation history
- **Export to Markdown**: Human-readable session exports
- **Project Management**: Group sessions by working directory

#### Data Persistence Strategy
1. **Messages**: Saved immediately after each turn
2. **Tool Calls**: Saved as part of assistant message
3. **Tool Results**: Saved separately with linking IDs
4. **Session Metadata**: Timestamps, message counts, previews
5. **Project Metadata**: Original paths, names, creation dates

## Component Hierarchy

```
App.jsx
├── ProjectSelector.jsx              # Project selection screen
│   ├── DirectorySelector.jsx       # Working directory picker
│   └── SessionHistory.jsx          # Session list & management
│
├── ChatInterface (main app)
│   ├── ToolsPanel.jsx              # MCP servers & tools sidebar
│   │   ├── MCPServerList.jsx       # Server connection status
│   │   └── ToolList.jsx            # Available tools display
│   │
│   ├── MessageList.jsx             # Chat conversation
│   │   ├── Message.jsx             # Individual messages
│   │   │   ├── MarkdownRenderer.jsx
│   │   │   └── ToolCall.jsx        # Tool call display
│   │   └── ToolApprovalModal.jsx   # Tool approval dialog
│   │
│   └── ChatInput.jsx               # Message input with file upload
│       ├── FileUpload.jsx          # Image/file handling
│       └── ModelSelector.jsx       # Quick model switching
│
└── Settings.jsx                    # Settings modal
    ├── Tabs.jsx                    # Tab navigation
    ├── AIModelsTab.jsx             # Provider & model config
    ├── MCPServersTab.jsx           # MCP server management
    └── GenerationParameters.jsx    # AI generation settings
```

## Data Flow Diagrams

### Complete Chat Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│             │    │             │    │             │
│ User Input  │───→│ ChatInput   │───→│ useChatFlow │
│             │    │ Component   │    │ Hook        │
└─────────────┘    └─────────────┘    └─────┬───────┘
                                             │
┌─────────────┐    ┌─────────────┐    ┌─────▼───────┐
│             │    │             │    │             │
│ Session     │◄───│ ChatContext │◄───│ State       │
│ Storage     │    │ Provider    │    │ Machine     │
└─────────────┘    └─────────────┘    └─────┬───────┘
                                             │
┌─────────────┐    ┌─────────────┐    ┌─────▼───────┐
│             │    │             │    │             │
│ AI Provider │◄───│ chatHandler │◄───│ IPC Call    │
│ APIs        │    │ (main.js)   │    │             │
└─────┬───────┘    └─────────────┘    └─────────────┘
      │
┌─────▼───────┐    ┌─────────────┐    ┌─────────────┐
│             │    │             │    │             │
│ Streaming   │───→│ Event       │───→│ UI Updates  │
│ Response    │    │ Handlers    │    │ (React)     │
└─────┬───────┘    └─────────────┘    └─────────────┘
      │
┌─────▼───────┐    ┌─────────────┐    ┌─────────────┐
│             │    │             │    │             │
│ Tool Calls  │───→│ Approval    │───→│ MCP         │
│ Detected    │    │ Flow        │    │ Execution   │
└─────────────┘    └─────────────┘    └─────┬───────┘
                                             │
                   ┌─────────────┐    ┌─────▼───────┐
                   │             │    │             │
                   │ Continue    │◄───│ Tool        │
                   │ Chat        │    │ Results     │
                   └─────────────┘    └─────────────┘
```

### MCP Integration Flow
```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│              │    │              │    │              │
│ App Startup  │───→│ Load MCP     │───→│ Connect      │
│              │    │ Config       │    │ Servers      │
└──────────────┘    └──────────────┘    └──────┬───────┘
                                               │
┌──────────────┐    ┌──────────────┐    ┌──────▼───────┐
│              │    │              │    │              │
│ Tool         │◄───│ Discover     │◄───│ Server       │
│ Registry     │    │ Tools        │    │ Connected    │
└──────┬───────┘    └──────────────┘    └──────────────┘
       │
┌──────▼───────┐    ┌──────────────┐    ┌──────────────┐
│              │    │              │    │              │
│ AI Model     │───→│ Tool Call    │───→│ User         │
│ Uses Tools   │    │ Generated    │    │ Approval     │
└──────────────┘    └──────────────┘    └──────┬───────┘
                                               │
┌──────────────┐    ┌──────────────┐    ┌──────▼───────┐
│              │    │              │    │              │
│ Return       │◄───│ Execute      │◄───│ Approved     │
│ Results      │    │ via MCP      │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
```

## Tool Approval Flow

The application implements a sophisticated tool approval system to balance security and usability:

### Approval Levels
1. **Always Approve**: Permanently approve specific tools
2. **YOLO Mode**: Approve all tools automatically
3. **Prompt Each Time**: Ask for approval on each use (default)
4. **One-Time Approval**: Approve once for current session
5. **Deny**: Reject tool execution

### Approval Persistence
```javascript
// localStorage-based preference storage
localStorage.setItem('tool_approval_filesystem', 'always');
localStorage.setItem('tool_approval_yolo_mode', 'true');
```

### Security Model
- **Default Deny**: All tools require explicit approval initially  
- **Granular Control**: Per-tool approval settings
- **User Context**: Tool descriptions and parameters shown for informed decisions
- **Session Scope**: Temporary approvals don't persist across sessions
- **Override Capability**: Users can always revoke "always" permissions

## Security Architecture

### Process Isolation
```
┌─────────────────────────────┐  ┌─────────────────────────────┐
│        Main Process         │  │      Renderer Process       │
│       (Node.js Full)        │  │     (Browser Sandbox)       │
│                             │  │                             │
│ ▪ File System Access        │  │ ▪ No Direct File Access     │
│ ▪ Network Requests          │  │ ▪ No Network Requests       │
│ ▪ Child Process Spawning    │  │ ▪ No Process Spawning       │
│ ▪ MCP Server Connections    │◄─┤ ▪ Limited via preload.js   │
│ ▪ Settings Management       │  │ ▪ UI Rendering Only         │
└─────────────────────────────┘  └─────────────────────────────┘
```

### API Surface Limitation
- **Preload Script**: Only exposes necessary IPC channels
- **No eval()**: No dynamic code execution in renderer
- **Context Isolation**: Prevents access to Electron internals
- **CSP Headers**: Content Security Policy enforcement

### Data Protection
- **Local Storage**: All data stored locally in user directory
- **No Cloud Dependencies**: Can operate fully offline
- **Session Encryption**: Consider encrypting sensitive session data
- **API Key Security**: Keys stored in OS-secure locations

### Tool Execution Security
- **User Approval**: Required for all tool executions
- **Parameter Validation**: Tool inputs validated before execution
- **Error Handling**: Safe error reporting without exposing internals
- **Process Isolation**: MCP servers run in separate processes

## Performance Architecture

### Streaming & Real-time Updates
```javascript
// Event-driven UI updates for smooth UX
streamHandler.onContent(({ content }) => {
  setMessages(prev => {
    const newMessages = [...prev];
    const idx = newMessages.findIndex(msg => msg.isStreaming);
    if (idx !== -1) {
      newMessages[idx] = { ...newMessages[idx], content: content };
    }
    return newMessages;
  });
});
```

### Memory Management
- **Message History Pruning**: Automatic context window management
- **Component Unmounting**: Proper cleanup of event listeners
- **MCP Connection Pooling**: Efficient server connection reuse
- **Lazy Loading**: Settings and tools loaded on demand

### Optimization Strategies
1. **Debounced Settings**: Prevent excessive saves during typing
2. **Virtualized Lists**: Handle large message histories efficiently  
3. **Memoized Components**: Prevent unnecessary re-renders
4. **Efficient State Updates**: Immutable update patterns
5. **Connection Health Checks**: Proactive MCP server monitoring

## Error Handling & Resilience

### Error Categories
1. **Network Errors**: API connectivity issues
2. **Authentication Errors**: Invalid or expired credentials
3. **MCP Errors**: Server connection or tool execution failures
4. **Validation Errors**: Invalid user inputs or configurations
5. **System Errors**: File system or permission issues

### Recovery Strategies
- **Automatic Retry**: With exponential backoff for transient failures
- **Graceful Degradation**: Continue functioning with reduced capabilities
- **User Feedback**: Clear error messages with actionable guidance
- **State Recovery**: Restore from valid previous state on corruption
- **Logging**: Comprehensive error logging for debugging

### Fault Tolerance
- **MCP Server Health**: Automatic reconnection on failure
- **Stream Interruption**: Clean handling of network disruptions
- **Settings Corruption**: Fallback to default configuration
- **Session Recovery**: Restore partial sessions from JSONL files

## Development & Extension Guide

### Adding New AI Providers
1. Add provider configuration to `shared/models.js`
2. Update settings schema in `settingsManager.js`
3. Extend `chatHandler.js` with provider-specific logic
4. Add UI components in `settings/providers/`
5. Update provider selector and validation

### Adding New MCP Transports
1. Install MCP SDK transport package
2. Extend `mcpManager.js` connection logic
3. Add transport-specific configuration schema
4. Update UI forms in `settings/mcp/`
5. Add transport validation and error handling

### Custom Hook Development
```javascript
// Template for new hooks
export const useCustomFeature = () => {
  const [state, setState] = useState(initialState);
  
  useEffect(() => {
    // Setup and cleanup
    return () => cleanup();
  }, [dependencies]);
  
  return {
    state,
    actions: {
      doSomething: () => setState(newState)
    }
  };
};
```

### Component Architecture Guidelines
- **Single Responsibility**: Components should have one clear purpose
- **Props Interface**: Use TypeScript-style JSDoc for props
- **Error Boundaries**: Wrap complex components in error boundaries
- **Accessibility**: Include ARIA labels and keyboard navigation
- **Testing**: Write unit tests for complex logic

## Future Enhancements

### Planned Features
1. **Plugin System**: Extensible MCP server marketplace
2. **Multi-User Support**: Shared sessions and collaboration
3. **Cloud Sync**: Optional session backup and sync across devices
4. **Enhanced Security**: Sandboxed tool execution environments
5. **AI Model Fine-tuning**: Custom model training interface
6. **Advanced Analytics**: Usage metrics and performance monitoring
7. **Mobile Companion**: Mobile app for session viewing
8. **API Access**: REST API for external integrations

### Architecture Evolution
- **Modular Architecture**: Move toward plugin-based architecture
- **Service Workers**: Offline functionality and caching
- **Multi-Window Support**: Separate windows for different conversations
- **Database Migration**: Move from JSONL to SQLite for complex queries
- **Real-time Collaboration**: WebSocket-based session sharing

## API Reference

For comprehensive API documentation, see [API.md](./API.md) which covers:
- Complete IPC channel documentation
- Hook interfaces and usage examples
- Context provider APIs
- Utility function references
- Type definitions and data structures
- Error handling patterns