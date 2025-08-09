# Groq Desktop

[![Latest macOS Build](https://img.shields.io/github/v/release/groq/groq-desktop-beta?include_prereleases&label=latest%20macOS%20.dmg%20build)](https://github.com/groq/groq-desktop-beta/releases/latest)

**A powerful desktop application for AI-assisted development and productivity**, featuring advanced Model Context Protocol (MCP) integration, multi-provider AI support, and comprehensive project management capabilities. Available for Windows, macOS, and Linux.

> **Note for macOS Users**: After installing on macOS, you may need to run this command to open the app:
> ```sh
> xattr -c /Applications/Groq\ Desktop.app
> ```

<img width="450" alt="Screenshot 2025-04-14 at 11 53 18 PM" src="https://github.com/user-attachments/assets/300abf8c-8b7f-4ef8-a5f9-174f93e39506" /><img width="450" alt="Screenshot 2025-04-14 at 11 53 35 PM" src="https://github.com/user-attachments/assets/61641680-5b3d-4ca9-8da4-8e84779f97bb" />

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [AI Providers & Models](#ai-providers--models)
- [MCP Server Integration](#mcp-server-integration)
- [Project & Session Management](#project--session-management)
- [Tool Approval System](#tool-approval-system)
- [Configuration](#configuration)
- [Development](#development)
- [Building & Distribution](#building--distribution)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

## Features

### Core Functionality
- **Multi-Provider AI Support**: Groq, OpenAI (including GPT-5), OpenRouter, and custom providers
- **Advanced Model Selection**: Support for latest models including GPT-5, Claude Sonnet 4, Gemini 2.5, and Groq's latest models
- **Vision-Capable Models**: Image analysis and processing with supported models
- **Streaming Responses**: Real-time AI responses with typing indicators
- **Message Management**: Edit, delete, and manage conversation history

### Model Context Protocol (MCP) Integration
- **Dynamic Tool Discovery**: Automatic detection and integration of MCP servers
- **Multiple Transport Types**: Support for stdio, SSE, and HTTP-based MCP servers
- **Server Management**: Connect, disconnect, and monitor MCP server health
- **OAuth Authentication**: Secure authentication flow for cloud-based MCP servers
- **Tool Execution Logging**: Comprehensive logging and monitoring of tool usage

### Project & Session Management
- **Project-Based Organization**: Organize conversations by development projects
- **Session Persistence**: Automatic saving and restoration of chat sessions
- **Session Export**: Export conversations to Markdown format
- **Recent Projects**: Quick access to recently worked on projects
- **Session History**: Browse and restore previous conversations

### Security & User Control
- **Tool Approval System**: Granular control over tool execution
- **Approval Modes**: Once, always, YOLO mode, or deny specific tools
- **Secure Execution**: Sandboxed tool execution environment
- **Privacy First**: All data stored locally, no cloud dependencies required

### Cross-Platform Support
- **Windows**: Full support with native installers (NSIS, portable)
- **macOS**: DMG installer with Apple Silicon and Intel support
- **Linux**: AppImage, DEB, and RPM packages
- **Consistent Experience**: Unified interface across all platforms

## Installation

### Official Releases

Download the latest release for your platform from the [releases page](https://github.com/groq/groq-desktop-beta/releases/latest).

### Homebrew (macOS - Unofficial)

```sh
brew tap ricklamers/groq-desktop-unofficial
brew install --cask groq-desktop
# Allow the app to run
xattr -c /Applications/Groq\ Desktop.app
```

### System Requirements

- **Node.js**: v16.0.0 or higher (for development)
- **Operating System**:
  - macOS 10.15 or later
  - Windows 10 or later
  - Linux (Ubuntu 18.04+, Fedora 30+, or equivalent)

## Quick Start

1. **First Launch**: Select or create a project directory
2. **Configure AI Provider**: Go to Settings → AI Models and add your API key
3. **Start Chatting**: Begin a conversation with your selected AI model
4. **Add Tools** (Optional): Configure MCP servers in Settings → MCP Servers
5. **Approve Tools**: Use the tool approval system to control tool execution

## AI Providers & Models

### Supported Providers

#### Groq
- **Latest Models**: llama-3.3-70b-versatile, qwen-qwq-32b, deepseek-r1-distill-llama-70b
- **Vision Models**: meta-llama/llama-4-scout-17b-16e-instruct, meta-llama/llama-4-maverick-17b-128e-instruct
- **High-Speed Inference**: Optimized for fast response times
- **Free Tier Available**: Generous free usage limits

#### OpenAI
- **GPT-5 Family**: gpt-5, gpt-5-mini, gpt-5-nano, gpt-5-chat-latest
- **Large Context**: 400k token context window
- **Vision Support**: Advanced image understanding capabilities
- **Function Calling**: Full support for tool execution

#### OpenRouter
- **Model Aggregation**: Access to models from multiple providers
- **Latest Models**: Claude Sonnet 4, GPT-5, Gemini 2.5, Kimi K2
- **Custom Models**: Add any model available on OpenRouter
- **BYOK Support**: Bring Your Own Key for premium models

#### Custom Providers
- **Flexible Configuration**: Connect to any OpenAI-compatible API
- **Custom Endpoints**: Support for self-hosted or enterprise APIs
- **Authentication Options**: API key and custom header support

## MCP Server Integration

The Model Context Protocol enables powerful tool integration for enhanced AI capabilities.

### Supported MCP Transports

```javascript
// Stdio Transport (Local Tools)
{
  "filesystem": {
    "transport": "stdio",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem"],
    "env": { "PATH": "/usr/local/bin:/usr/bin:/bin" }
  }
}

// SSE Transport (Server-Sent Events)
{
  "cloud-service": {
    "transport": "sse",
    "url": "https://api.example.com/mcp/sse"
  }
}

// HTTP Transport (Streamable HTTP)
{
  "web-api": {
    "transport": "streamableHttp", 
    "url": "https://api.example.com/mcp/stream"
  }
}
```

### Popular MCP Servers

- **@modelcontextprotocol/server-filesystem**: File system operations
- **@modelcontextprotocol/server-brave-search**: Web search capabilities
- **@modelcontextprotocol/server-sqlite**: Database operations
- **@modelcontextprotocol/server-github**: GitHub integration
- **@modelcontextprotocol/server-slack**: Slack workspace access

### Server Management

- **Health Monitoring**: Automatic health checks and reconnection
- **Log Streaming**: Real-time server output and error logs
- **Authentication**: OAuth flow for secure server connections
- **Enable/Disable**: Easily toggle servers without removing configuration

## Project & Session Management

### Project Structure

```
~/.groq/projects/
├── my-project/
│   ├── .project-metadata.json
│   ├── session-2025-01-15T10-30-00-000Z.jsonl
│   ├── session-2025-01-15T14-20-15-000Z.jsonl
│   └── ...
└── another-project/
    ├── .project-metadata.json
    └── session-files...
```

### Session Format (JSONL)

Each line in a session file represents a timestamped event:

```jsonl
{"timestamp":"2025-01-15T10:30:00.000Z","type":"message","role":"user","content":"Hello, world!"}
{"timestamp":"2025-01-15T10:30:01.000Z","type":"message","role":"assistant","content":"Hello! How can I help you today?"}
{"timestamp":"2025-01-15T10:30:15.000Z","type":"tool_call","id":"call_123","name":"filesystem_read","arguments":"{\"path\":\"/home/user/file.txt\"}"}
{"timestamp":"2025-01-15T10:30:16.000Z","type":"tool_result","tool":"filesystem_read","result":"File contents here...","tool_call_id":"call_123"}
```

### Session Operations

- **Auto-save**: Messages and tool results saved automatically
- **Export**: Export sessions to readable Markdown format
- **Import**: Load previous sessions with full context restoration
- **Delete**: Remove unwanted sessions with confirmation

## Tool Approval System

Groq Desktop provides granular control over AI tool execution for security and user control.

### Approval Modes

- **Allow Once**: Execute the tool for this specific request only
- **Always Allow This Tool**: Auto-approve future executions of this specific tool
- **YOLO Mode**: Auto-approve all tool executions (use with caution)
- **Deny**: Block the tool execution and continue conversation

### Security Features

- **Sandboxed Execution**: Tools run in isolated environments
- **User Consent**: Explicit approval required for each new tool type
- **Audit Trail**: Complete logging of all tool executions
- **Revokable Permissions**: Reset tool approvals in settings

## Configuration

### Settings Location

Configuration files are stored in:
- **Windows**: `%APPDATA%/groq-desktop-app/`
- **macOS**: `~/Library/Application Support/groq-desktop-app/`
- **Linux**: `~/.config/groq-desktop-app/`

### Configuration Files

#### `settings.json`
```json
{
  "provider": "groq",
  "model": "llama-3.3-70b-versatile",
  "GROQ_API_KEY": "your-groq-api-key",
  "OPENAI_API_KEY": "your-openai-key",
  "OPENROUTER_API_KEY": "your-openrouter-key",
  "temperature": 0.7,
  "max_tokens": 2048,
  "systemPrompt": "You are a helpful AI assistant...",
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "env": {}
    }
  },
  "disabledMcpServers": [],
  "toolApprovals": {},
  "openRouterCustomModels": ["custom/model-name"]
}
```

#### `mcp-servers.json`
```json
{
  "mcpServers": {
    "server-id": {
      "transport": "stdio|sse|streamableHttp",
      "command": "/path/to/command",
      "args": ["arg1", "arg2"],
      "env": {"VAR": "value"},
      "url": "https://server-url"
    }
  },
  "disabledMcpServers": ["disabled-server-id"]
}
```

### Environment Variables

- `GROQ_API_KEY`: Your Groq API key
- `OPENAI_API_KEY`: Your OpenAI API key  
- `OPENROUTER_API_KEY`: Your OpenRouter API key
- `CUSTOM_API_URL`: Custom API endpoint URL
- `CUSTOM_API_KEY`: Custom API authentication key

## Development

### Prerequisites

- **Node.js**: v16.0.0 or higher
- **pnpm**: v8.0.0 or higher (recommended package manager)

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/groq/groq-desktop-beta.git
   cd groq-desktop-beta
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Start development server**:
   ```bash
   pnpm dev
   ```

### Development Scripts

```bash
# Start development with hot reload
pnpm dev

# Start Vite dev server only
pnpm dev:vite

# Start Electron in development mode
pnpm dev:electron

# Build for production
pnpm build

# Run linting
pnpm lint

# Run tests
pnpm test:platforms
pnpm test:paths
```

### Project Structure

```
groq-desktop-beta/
├── electron/              # Electron main process
│   ├── main.js           # Application entry point
│   ├── chatHandler.js    # AI chat handling
│   ├── mcpManager.js     # MCP integration
│   ├── sessionManager.js # Session persistence  
│   └── scripts/          # Cross-platform scripts
├── src/renderer/         # React application
│   ├── components/       # UI components
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Page components
│   ├── context/         # React contexts
│   └── services/        # Business logic
├── shared/              # Shared utilities
└── public/              # Static assets
```

## Building & Distribution

### Production Builds

```bash
# Build for current platform
pnpm dist

# Build for specific platforms
pnpm dist:mac     # macOS
pnpm dist:win     # Windows  
pnpm dist:linux   # Linux
```

### Cross-Platform Testing

```bash
# Test platform detection
pnpm test:paths

# Full cross-platform test suite
pnpm test:platforms

# Windows-specific tests (run on Windows)
./test-windows.ps1
```

### Build Outputs

- **Windows**: `release/*.exe` (installer), `release/*-win.zip` (portable)
- **macOS**: `release/*.dmg` (disk image)
- **Linux**: `release/*.AppImage`, `release/*.deb`, `release/*.rpm`

### Distribution Targets

#### Windows
- **NSIS Installer**: Full installation with shortcuts and uninstaller
- **Portable**: Standalone executable, no installation required

#### macOS
- **Universal Binary**: Runs on both Intel and Apple Silicon Macs
- **DMG**: Drag-and-drop installation
- **Notarization Ready**: Code signing and notarization support

#### Linux
- **AppImage**: Universal Linux binary
- **DEB Package**: Debian/Ubuntu package manager
- **RPM Package**: Red Hat/Fedora package manager

## Architecture

Groq Desktop follows a modern Electron architecture with clear separation of concerns. For detailed information, see [ARCHITECTURE.md](./ARCHITECTURE.md).

### Key Components

- **Main Process**: Handles AI API calls, MCP integration, and system interactions
- **Renderer Process**: React-based UI with modern state management
- **IPC Communication**: Secure Inter-Process Communication between main and renderer
- **MCP Integration**: Full Model Context Protocol support with multiple transports
- **Session Management**: JSONL-based persistence with project organization

### State Management

- **Chat Context**: Global chat state with React Context
- **Custom Hooks**: Reusable stateful logic (useChatFlow, useModelSelection, etc.)
- **State Machine**: Chat flow managed by finite state machine
- **Local Storage**: Settings and preferences persistence

## Contributing

We welcome contributions to Groq Desktop! Please read our contributing guidelines:

### Development Process

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Make** your changes with proper tests
4. **Commit** your changes (`git commit -m 'Add amazing feature'`)
5. **Push** to the branch (`git push origin feature/amazing-feature`)
6. **Open** a Pull Request

### Code Style

- **ESLint**: Follow the configured linting rules
- **Prettier**: Use for code formatting
- **TypeScript**: Gradual migration to TypeScript welcome
- **Conventional Commits**: Use conventional commit messages

### Testing

- Ensure cross-platform compatibility
- Add tests for new features
- Run the full test suite: `pnpm test:platforms`
- Test MCP server integration

### Reporting Issues

Please use GitHub Issues to report bugs or request features:
- **Bug reports**: Include steps to reproduce, expected vs actual behavior
- **Feature requests**: Describe the use case and proposed solution
- **MCP integration**: Include server configuration and logs

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Made with ❤️ by Groq** - Empowering developers with fast, reliable AI tools.