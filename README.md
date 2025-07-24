# Groq Desktop

[![Latest macOS Build](https://img.shields.io/github/v/release/groq/groq-desktop-beta?include_prereleases&label=latest%20macOS%20.dmg%20build)](https://github.com/groq/groq-desktop-beta/releases/latest)

Groq Desktop features MCP server support for all function calling capable models hosted on Groq. Now available for Windows, macOS, and Linux!

> **Note for macOS Users**: After installing on macOS, you may need to run this command to open the app:
> ```sh
> xattr -c /Applications/Groq\ Desktop.app
> ```

<img width="450" alt="Screenshot 2025-04-14 at 11 53 18 PM" src="https://github.com/user-attachments/assets/300abf8c-8b7f-4ef8-a5f9-174f93e39506" /><img width="450" alt="Screenshot 2025-04-14 at 11 53 35 PM" src="https://github.com/user-attachments/assets/61641680-5b3d-4ca9-8da4-8e84779f97bb" />

## Unofficial Homebrew Installation (macOS)

You can install the latest release using [Homebrew](https://brew.sh/) via an unofficial tap:

```sh
brew tap ricklamers/groq-desktop-unofficial
brew install --cask groq-desktop
# Allow the app to run
xattr -c /Applications/Groq\ Desktop.app
```

## Features

- Chat interface with image support for vision-capable models
- Local MCP (Model Context Protocol) server integration
- Tool execution with user approval workflow
- Session persistence and history
- Multiple AI provider support (Groq, OpenRouter, Custom)
- Customizable system prompts and generation parameters

## Prerequisites

- Node.js (v18+)
- pnpm package manager

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   pnpm install
   ```
3. Start the development server:
   ```
   pnpm dev
   ```

## Building for Production

To build the application for production:

```
pnpm dist
```

This will create installable packages in the `release` directory for your current platform.

### Building for Specific Platforms

```bash
# Build for all supported platforms
pnpm dist

# Build for macOS only
pnpm dist:mac

# Build for Windows only
pnpm dist:win

# Build for Linux only
pnpm dist:linux
```

### Testing Cross-Platform Support

This app now supports Windows, macOS, and Linux. Here's how to test cross-platform functionality:

#### Running Cross-Platform Tests

We've added several test scripts to verify platform support:

```bash
# Run all platform tests (including Docker test for Linux)
pnpm test:platforms

# Run basic path handling test only
pnpm test:paths

# If on Windows, run the PowerShell test script
.\test-windows.ps1
```

The testing scripts will check:
- Platform detection
- Script file resolution
- Environment variable handling
- Path separators
- Command resolution

## Configuration

In the settings page, add your Groq API key:

```json
{
  "GROQ_API_KEY": "your-api-key-here"
}
```

You can obtain a Groq API key by signing up at [https://console.groq.com](https://console.groq.com).

## Architecture

The application follows a modular architecture with clear separation of concerns:

- **Main Process** (`electron/`): Handles API communication, tool execution, and session management
- **Renderer Process** (`src/renderer/`): React-based UI with custom hooks for state management
- **State Machine**: Complex chat flows managed by `ChatFlowStateMachine` for predictable behavior
- **MCP Integration**: Dynamic tool discovery and execution through Model Context Protocol

For detailed architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Recent Updates

### Refactored Architecture (Latest)
- Reduced main App.jsx from ~1000 to ~160 lines through modular design
- Implemented state machine pattern for chat flow management
- Created custom hooks for different concerns (chat flow, model selection, MCP servers)
- Improved session loading to handle orphaned tool results
- Fixed tool result persistence with proper tool_call_id tracking

### Key Components
- `useChatFlow`: Orchestrates chat conversations and tool execution
- `useModelSelection`: Manages AI model selection and capabilities
- `useMcpServers`: Handles MCP server connections and tool discovery
- `ChatFlowStateMachine`: Ensures predictable state transitions during chat

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 
