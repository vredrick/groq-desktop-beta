# Groq Desktop API Documentation

This document provides comprehensive API documentation for all the main modules, hooks, services, and interfaces in Groq Desktop.

## Table of Contents

1. [Main Process IPC Channels](#main-process-ipc-channels)
2. [React Hooks](#react-hooks)
3. [Context Providers](#context-providers)
4. [Services](#services)
5. [Utility Functions](#utility-functions)
6. [MCP Integration](#mcp-integration)
7. [Session Management](#session-management)

## Main Process IPC Channels

### Exposed API (`preload.js`)

The main process exposes the following APIs to the renderer process through the preload script:

#### Settings Management

```javascript
// Get current application settings
window.electron.getSettings() -> Promise<Settings>

// Save application settings
window.electron.saveSettings(settings: Settings) -> Promise<void>

// Get settings file path
window.electron.getSettingsPath() -> Promise<string>

// Get configuration directory path
window.electron.getConfigDir() -> Promise<string>

// Open configuration directory in file manager
window.electron.openConfigDirectory() -> Promise<void>

// Reload settings from disk
window.electron.reloadSettings() -> Promise<void>

// Listen for settings changes
window.electron.onSettingsChanged(callback: (settings: Settings) => void) -> Function
```

**Settings Object Structure:**
```typescript
interface Settings {
  provider: 'groq' | 'openai' | 'openrouter' | 'custom';
  model: string;
  GROQ_API_KEY?: string;
  OPENAI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  customCompletionUrl?: string;
  temperature?: number;
  top_p?: number;
  customSystemPrompt?: string;
  reasoning_effort?: 'minimal' | 'low' | 'medium' | 'high';
  text_verbosity?: 'low' | 'medium' | 'high';
  mcpServers?: Record<string, McpServerConfig>;
  disabledMcpServers?: string[];
  openRouterCustomModels?: string[];
}
```

#### Chat Streaming API

```javascript
// Start a chat stream with messages and model
window.electron.startChatStream(messages: Message[], model?: string) -> StreamHandler

// StreamHandler interface
interface StreamHandler {
  onStart: (callback: (data: { id: string, role: string }) => void) -> Function;
  onContent: (callback: (data: { content: string }) => void) -> Function;
  onToolCalls: (callback: (data: { tool_calls: ToolCall[] }) => void) -> Function;
  onComplete: (callback: (data: CompletionData) => void) -> Function;
  onError: (callback: (data: { error: string }) => void) -> Function;
  cleanup: () => void;
}
```

**Message Object Structure:**
```typescript
interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ContentPart[];
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  reasoning?: string;
  isStreaming?: boolean; // UI-only property
}

interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

interface CompletionData {
  content: string;
  role: 'assistant';
  tool_calls?: ToolCall[];
  reasoning?: string;
  finish_reason: string;
}
```

#### Tool Execution

```javascript
// Execute a tool call
window.electron.executeToolCall(toolCall: ToolCall) -> Promise<ToolResult>

interface ToolResult {
  result?: any;
  error?: string;
}
```

#### Model Configuration

```javascript
// Get model configurations for a provider
window.electron.getModelConfigs(provider?: string) -> Promise<ModelConfigs>

interface ModelConfigs {
  [modelId: string]: {
    context: number;
    vision_supported: boolean;
    display_name?: string;
    api_type?: string;
  };
}
```

#### MCP Server Management

```javascript
// Connect to an MCP server
window.electron.connectMcpServer(serverConfig: McpServerConfig) -> Promise<McpResult>

// Disconnect from an MCP server
window.electron.disconnectMcpServer(serverId: string) -> Promise<McpResult>

// Get available MCP tools
window.electron.getMcpTools() -> Promise<{ tools: McpTool[] }>

// Listen for MCP server status changes
window.electron.onMcpServerStatusChanged(callback: (status: McpStatus) => void) -> Function

// Get MCP server logs
window.electron.getMcpServerLogs(serverId: string) -> Promise<{ logs: string[] }>

// Listen for MCP log updates
window.electron.onMcpLogUpdate(callback: (serverId: string, logChunk: string) => void) -> Function

// Start MCP authentication flow
window.electron.startMcpAuthFlow(authParams: AuthParams) -> Promise<AuthResult>

// Listen for MCP auth reconnection completion
window.electron.onMcpAuthReconnectComplete(callback: (data: AuthReconnectData) => void) -> Function
```

**MCP Types:**
```typescript
interface McpServerConfig {
  id: string;
  transport?: 'stdio' | 'sse' | 'streamableHttp';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  scriptPath?: string; // Legacy
}

interface McpTool {
  name: string;
  description: string;
  input_schema: Record<string, any>;
  serverId: string;
}

interface McpResult {
  success: boolean;
  error?: string;
  requiresAuth?: boolean;
  tools?: McpTool[];
  allTools?: McpTool[];
  serverId?: string;
}

interface McpStatus {
  tools: McpTool[];
  connectedServers: string[];
}
```

#### Session Management

```javascript
// Select working directory
window.electron.selectWorkingDirectory() -> Promise<DirectoryResult>

// Get current directory
window.electron.getCurrentDirectory() -> Promise<string | null>

// Set working directory programmatically
window.electron.setWorkingDirectory(directory: string) -> Promise<DirectoryResult>

// Create new session
window.electron.createNewSession() -> Promise<SessionResult>

// Get current session
window.electron.getCurrentSession() -> Promise<SessionResult>

// Save message to session
window.electron.saveMessage(message: Message) -> Promise<SessionResult>

// Save tool call to session
window.electron.saveToolCall(toolCall: ToolCall) -> Promise<SessionResult>

// Save tool result to session
window.electron.saveToolResult(toolName: string, result: any, toolCallId: string) -> Promise<SessionResult>

// Load session from file
window.electron.loadSession(sessionFile: string) -> Promise<LoadSessionResult>

// List sessions for current project
window.electron.listSessions() -> Promise<SessionListResult>

// Delete session
window.electron.deleteSession(sessionFile: string) -> Promise<SessionResult>

// Export session as markdown
window.electron.exportSession(sessionFile: string) -> Promise<ExportResult>

// Get recent projects
window.electron.getRecentProjects() -> Promise<Project[]>

// Get Groq projects directory
window.electron.getGroqProjectsDir() -> Promise<string>
```

**Session Types:**
```typescript
interface DirectoryResult {
  success: boolean;
  directory?: string;
  message?: string;
}

interface SessionResult {
  success: boolean;
  sessionFile?: string;
  message?: string;
}

interface LoadSessionResult {
  success: boolean;
  messages?: SessionItem[];
  message?: string;
}

interface SessionListResult {
  success: boolean;
  sessions?: SessionInfo[];
  message?: string;
}

interface ExportResult {
  success: boolean;
  markdown?: string;
  message?: string;
}

interface Project {
  name: string;
  path: string;
  fullPath: string;
  sanitizedPath: string;
  sessionCount: number;
  lastModified: string;
}

interface SessionInfo {
  file: string;
  path: string;
  created: Date;
  modified: Date;
  size: number;
  preview: string;
  messageCount: number;
}
```

## React Hooks

### `useChatFlow(selectedModel: string)`

Main hook for orchestrating chat conversations with streaming and tool execution.

**Parameters:**
- `selectedModel`: The AI model to use for completions

**Returns:**
```typescript
interface ChatFlowHook {
  loading: boolean;
  pendingApprovalCall: ToolCall | null;
  sendMessage: (content: string | ContentPart[]) => Promise<void>;
  handleToolApproval: (choice: 'once' | 'always' | 'deny' | 'yolo', toolCall: ToolCall) => Promise<void>;
  stopStream: () => void;
  executeToolCall: (toolCall: ToolCall) => Promise<ToolResult>;
}
```

**Usage:**
```javascript
const { loading, pendingApprovalCall, sendMessage, handleToolApproval, stopStream } = useChatFlow(selectedModel);

// Send a message
await sendMessage("Hello, how are you?");

// Handle tool approval
await handleToolApproval('once', toolCall);

// Stop current stream
stopStream();
```

### `useModelSelection()`

Hook for managing AI model selection and configuration.

**Returns:**
```typescript
interface ModelSelectionHook {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  models: string[];
  visionSupported: boolean;
  modelConfigs: ModelConfigs;
}
```

**Usage:**
```javascript
const { selectedModel, setSelectedModel, models, visionSupported } = useModelSelection();

// Change model
setSelectedModel('gpt-5');

// Check if current model supports vision
if (visionSupported) {
  // Enable image upload
}
```

### `useMcpServers()`

Hook for managing MCP server connections and tools.

**Returns:**
```typescript
interface McpServersHook {
  mcpTools: McpTool[];
  mcpServersStatus: { loading: boolean; message: string };
  disconnectMcpServer: (serverId: string) => Promise<boolean>;
  reconnectMcpServer: (serverId: string) => Promise<McpResult>;
  refreshMcpTools: () => Promise<void>;
  updateServerStatus: (tools: McpTool[], settings: Settings) => void;
}
```

**Usage:**
```javascript
const { mcpTools, mcpServersStatus, disconnectMcpServer, reconnectMcpServer } = useMcpServers();

// Disconnect from a server
await disconnectMcpServer('filesystem');

// Reconnect to a server
const result = await reconnectMcpServer('filesystem');
```

### `useToolApproval()`

Hook for managing tool execution approvals.

**Returns:**
```typescript
interface ToolApprovalHook {
  pendingApprovalCall: ToolCall | null;
  pausedChatState: any | null;
  checkToolApproval: (toolName: string) => 'always' | 'yolo' | 'prompt';
  updateToolApproval: (toolName: string, status: string) => void;
  requestToolApproval: (toolCall: ToolCall, chatState: any) => void;
  clearPendingApproval: () => void;
  clearPausedState: () => void;
  setPausedChatState: (state: any) => void;
}
```

### `useUIState()`

Hook for managing UI state like sidebar visibility and modal states.

**Returns:**
```typescript
interface UIStateHook {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  activeModal: string | null;
  setActiveModal: (modal: string | null) => void;
  // Additional UI state properties
}
```

### `useSettingsManager()`

Hook for managing application settings with validation and persistence.

**Returns:**
```typescript
interface SettingsManagerHook {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  isValid: boolean;
  errors: ValidationError[];
  loading: boolean;
}
```

### `useChatExecution()`

Hook for handling chat execution flow and state management.

### `useMCPServerManager()`

Hook for advanced MCP server management with connection lifecycle.

## Context Providers

### `ChatProvider`

Provides global chat state and session management.

**Context Value:**
```typescript
interface ChatContextValue {
  messages: Message[];
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  workingDirectory: string | null;
  setWorkingDirectory: (dir: string | null) => void;
  currentSessionFile: string | null;
  sessionMetadata: SessionMetadata | null;
  isLoadingSession: boolean;
  // Session methods
  saveMessageToSession: (message: Message) => Promise<void>;
  saveToolResultToSession: (toolName: string, result: any, toolCallId: string) => Promise<void>;
  loadSessionFromFile: (sessionFile: string) => Promise<void>;
  startNewSession: () => Promise<void>;
  selectWorkingDirectory: () => Promise<DirectoryResult>;
  listSessions: () => Promise<SessionInfo[]>;
  deleteSession: (sessionFile: string) => Promise<SessionResult>;
  exportSession: (sessionFile: string) => Promise<ExportResult>;
}
```

**Usage:**
```javascript
import { ChatProvider, useChat } from '../context/ChatContext';

// Wrap app with provider
<ChatProvider>
  <App />
</ChatProvider>

// Use in component
const { messages, setMessages, workingDirectory, saveMessageToSession } = useChat();
```

## Services

### `ChatFlowStateMachine`

State machine for managing complex chat flows with tool execution.

**States:**
- `IDLE`: No active chat
- `STREAMING`: Receiving AI response
- `PROCESSING_TOOLS`: Processing tool calls
- `AWAITING_APPROVAL`: Waiting for user approval
- `EXECUTING_TOOL`: Executing approved tool
- `COMPLETED`: Chat turn completed
- `ERROR`: Error state

**Events:**
- `SEND_MESSAGE`: Start new chat turn
- `STREAM_COMPLETE`: AI response complete
- `TOOL_APPROVED`: User approved tool
- `TOOL_DENIED`: User denied tool
- `TOOL_EXECUTED`: Tool execution complete
- `ALL_TOOLS_PROCESSED`: All tools in queue processed
- `STOP`: Stop current operation

**Usage:**
```javascript
import { ChatFlowStateMachine, ChatFlowEvents } from '../services/ChatFlowStateMachine';

const stateMachine = new ChatFlowStateMachine({
  onStartStreaming: async (context) => { /* ... */ },
  onAwaitingApproval: (context) => { /* ... */ },
  onExecuteTool: async (context) => { /* ... */ },
  onCompleted: (context) => { /* ... */ },
  onError: (context) => { /* ... */ }
});

// Transition states
stateMachine.transition(ChatFlowEvents.SEND_MESSAGE, { messages, selectedModel });
```

## Utility Functions

### Tool Approval Utilities (`toolApproval.js`)

```javascript
// Get approval status for a tool
getToolApprovalStatus(toolName: string) -> 'always' | 'yolo' | 'prompt'

// Set approval status for a tool
setToolApprovalStatus(toolName: string, status: string) -> void
```

**Status Values:**
- `'always'`: Always approve this tool
- `'yolo'`: Approve all tools automatically
- `'prompt'`: Always prompt user (default)
- `'once'`: Approve once (doesn't persist)
- `'deny'`: Deny this execution (doesn't persist)

### Validation Utilities (`validation.js`)

```javascript
// Validate settings object
validateSettings(settings: Settings) -> ValidationResult

// Validate API key format
validateApiKey(key: string, provider: string) -> boolean

// Validate URL format
validateUrl(url: string) -> boolean
```

### MCP Helper Utilities (`mcpHelpers.js`)

```javascript
// Format MCP server configuration
formatServerConfig(config: McpServerConfig) -> McpServerConfig

// Parse tool schema
parseToolSchema(schema: any) -> ToolSchema

// Validate server connection details
validateServerConnection(config: McpServerConfig) -> ValidationResult
```

## MCP Integration

### MCP Manager (`mcpManager.js`)

Core module for managing MCP server connections.

**Key Functions:**
```javascript
// Initialize MCP handlers
initializeMcpHandlers(ipcMain, app, mainWindow, loadSettings, resolveCommandPath) -> void

// Connect to configured servers
connectConfiguredMcpServers() -> Promise<void>

// Get current MCP state
getMcpState() -> { mcpClients: Record<string, Client>, discoveredTools: McpTool[] }

// Retry connection after authentication
retryConnectionAfterAuth(serverId: string) -> Promise<void>
```

**Transport Types:**
- `'stdio'`: Standard input/output transport for local processes
- `'sse'`: Server-sent events transport for HTTP endpoints
- `'streamableHttp'`: Streaming HTTP transport

**Authentication:**
The MCP manager supports OAuth2-based authentication for HTTP transports. When a server requires authentication, it will:

1. Detect auth requirement from connection error
2. Store pending connection details
3. Initiate OAuth flow via `authManager`
4. Retry connection with obtained tokens

### Tool Handler (`toolHandler.js`)

Handles execution of MCP tools.

**Key Functions:**
```javascript
// Execute a tool call
handleExecuteToolCall(event, toolCall, discoveredTools, mcpClients, settings) -> Promise<ToolResult>
```

The tool handler:
- Validates tool calls against discovered tools
- Routes execution to appropriate MCP client
- Handles errors and timeouts
- Returns structured results

## Session Management

### Session Manager (`sessionManager.js`)

Manages persistent chat sessions stored as JSONL files.

**Key Functions:**
```javascript
// Project management
getGroqProjectsDir() -> string
getProjectSessionDir(workingDir: string) -> string

// Session lifecycle
createNewSession(projectDir: string) -> string
getCurrentSession(projectDir: string) -> string
loadSession(sessionFile: string) -> SessionItem[]

// Data persistence
saveMessage(sessionFile: string, message: Message) -> boolean
saveToolCall(sessionFile: string, toolCall: ToolCall) -> boolean
saveToolResult(sessionFile: string, toolName: string, result: any, toolCallId: string) -> boolean

// Session management
listSessions(projectDir: string) -> SessionInfo[]
deleteSession(sessionFile: string) -> boolean
exportSessionAsMarkdown(sessionFile: string) -> string

// Project discovery
getRecentProjects() -> Project[]
```

**Session Storage Format:**
Sessions are stored as JSONL (JSON Lines) files where each line contains:

```typescript
interface SessionItem {
  timestamp: string;
  type: 'message' | 'tool_call' | 'tool_result';
  // For messages
  role?: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | ContentPart[];
  tool_calls?: ToolCall[];
  reasoning?: string;
  // For tool calls
  id?: string;
  name?: string;
  arguments?: string;
  // For tool results
  tool?: string;
  result?: any;
  tool_call_id?: string;
}
```

**Project Structure:**
```
~/.groq/projects/
├── project-name-sanitized/
│   ├── .project-metadata.json
│   ├── session-2024-01-01T10-00-00-000Z.jsonl
│   └── session-2024-01-01T11-30-00-000Z.jsonl
└── another-project/
    ├── .project-metadata.json
    └── session-2024-01-01T14-00-00-000Z.jsonl
```

## Error Handling

### Common Error Types

```typescript
interface ApiError {
  message: string;
  code?: string | number;
  details?: any;
}

interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

interface AuthorizationRequiredError extends Error {
  name: 'AuthorizationRequiredError';
  serverId?: string;
}
```

### Error Response Format

All API responses follow a consistent error format:

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
  code?: string | number;
}
```

## Type Definitions Summary

For complete type definitions, refer to the individual module files. Key interfaces include:

- `Settings`: Application configuration
- `Message`: Chat message structure
- `ToolCall`: Tool execution request
- `McpServerConfig`: MCP server configuration
- `McpTool`: MCP tool definition
- `SessionItem`: Session storage item
- `Project`: Project information
- `ChatFlowStates` & `ChatFlowEvents`: State machine definitions

All APIs use TypeScript-style interfaces for documentation purposes, though the actual implementation uses JavaScript with JSDoc comments.