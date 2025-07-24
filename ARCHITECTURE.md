# Groq Desktop Architecture

## Overview

Groq Desktop is an Electron-based desktop application that provides a chat interface with AI models, featuring tool execution capabilities through the Model Context Protocol (MCP).

## Directory Structure

```
groq-desktop-beta/
├── electron/                 # Main process code
│   ├── main.js              # Electron main entry point
│   ├── preload.js           # Preload script for renderer access
│   ├── chatHandler.js       # Chat streaming and API logic
│   ├── toolHandler.js       # Tool execution handling
│   ├── sessionManager.js    # Chat session persistence
│   ├── messageUtils.js      # Message processing utilities
│   └── mcp/                 # MCP integration
│       └── mcpManager.js    # MCP server management
│
├── src/
│   └── renderer/            # Renderer process (React app)
│       ├── App.jsx          # Main application component
│       ├── main.jsx         # React entry point
│       ├── context/         # React contexts
│       │   └── ChatContext.jsx
│       ├── hooks/           # Custom React hooks
│       │   ├── useChatFlow.js
│       │   ├── useModelSelection.js
│       │   ├── useMcpServers.js
│       │   ├── useToolApproval.js
│       │   └── useUIState.js
│       ├── services/        # Business logic services
│       │   └── ChatFlowStateMachine.js
│       ├── utils/           # Utility functions
│       │   └── toolApproval.js
│       ├── components/      # React components
│       │   ├── MessageList.jsx
│       │   ├── ChatInput.jsx
│       │   ├── ToolsPanel.jsx
│       │   ├── SessionHistory.jsx
│       │   └── settings/    # Settings components
│       └── pages/           # Page components
│           └── ProjectSelector.jsx
│
├── shared/                  # Shared code
│   └── models.js           # Model configurations
│
└── styles/                  # CSS styles
    └── main.css            # Main stylesheet
```

## Architecture Patterns

### 1. Electron IPC Communication

The application uses Electron's IPC (Inter-Process Communication) for secure communication between main and renderer processes:

```javascript
// Renderer → Main
window.electron.sendMessage(data)

// Main → Renderer  
event.sender.send('response', data)
```

### 2. State Management

#### Chat Context
- Manages global chat state (messages, sessions)
- Provides hooks for accessing chat functionality
- Handles session persistence

#### Local Component State
- UI-specific state managed locally in components
- Custom hooks for reusable stateful logic

### 3. Chat Flow State Machine

The chat execution flow is managed by a state machine with the following states:

```
IDLE → STREAMING → PROCESSING_TOOLS → AWAITING_APPROVAL → EXECUTING_TOOL → COMPLETED
                                    ↘                   ↗
                                      → TOOL_DENIED → 
```

This ensures predictable handling of complex tool execution flows.

### 4. Custom Hooks Architecture

**useChatFlow**
- Orchestrates the entire chat conversation flow
- Manages streaming, tool execution, and approvals
- Uses the ChatFlowStateMachine for state management

**useModelSelection**
- Handles AI model selection and configuration
- Persists user preferences
- Manages model capabilities (vision, context size)

**useMcpServers**
- Manages MCP server connections
- Tracks available tools
- Handles server status updates

**useToolApproval**
- Manages tool execution approval state
- Handles user approval preferences
- Integrates with localStorage for persistence

### 5. MCP Integration

The Model Context Protocol integration allows:
- Dynamic tool discovery
- Secure tool execution
- Server lifecycle management
- OAuth authentication support

```javascript
// MCP Server Configuration
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "env": { "PATH": "..." }
    }
  }
}
```

### 6. Session Management

Sessions are stored as JSONL files:
- Each project has its own session directory
- Messages saved incrementally for reliability
- Tool results linked to tool calls via IDs

## Data Flow

1. **User Input** → ChatInput component
2. **Message Processing** → Chat context & hooks
3. **API Request** → Main process via IPC
4. **Streaming Response** → Event-based updates
5. **Tool Execution** → Approval flow → MCP servers
6. **Session Storage** → JSONL files

## Security Considerations

1. **Context Isolation**: Enabled for all windows
2. **Preload Scripts**: Limited API exposure
3. **Tool Approval**: User consent for tool execution
4. **No Remote Code**: All tools run locally
5. **Secure Storage**: User data in app directory

## Performance Optimizations

1. **Streaming Responses**: Real-time UI updates
2. **Message Pruning**: Context window management
3. **Lazy Loading**: Components loaded on demand
4. **Debounced Updates**: Reduced re-renders
5. **Efficient State Updates**: Immutable updates

## Future Enhancements

1. **Plugin System**: Extensible tool ecosystem
2. **Multi-User Support**: Shared sessions
3. **Cloud Sync**: Session backup/restore
4. **Enhanced Security**: Sandboxed tool execution
5. **Performance Monitoring**: Built-in analytics