# React Frontend Documentation

## Overview
The renderer directory contains the React-based frontend application that provides the user interface for the Groq Desktop application. It handles chat interactions, settings management, and MCP tool visualization.

## Directory Structure

### Core Directories
- `/components/` - Reusable UI components [See: components/CLAUDE.md](./components/CLAUDE.md)
- `/hooks/` - Custom React hooks [See: hooks/CLAUDE.md](./hooks/CLAUDE.md)
- `/context/` - React Context providers
- `/pages/` - Page-level components
- `/services/` - Business logic and state machines
- `/utils/` - Utility functions
- `/styles/` - CSS and design tokens
- `/constants/` - Application constants

### Entry Points
- `main.jsx` - Application bootstrap and routing
- `App.jsx` - Main application component
- `index.css` - Global styles and Tailwind imports

## Application Architecture

### State Management
Uses React Context API for global state:

```javascript
// ChatContext provides:
- messages: Chat message history
- settings: Current AI settings
- isStreaming: Response streaming state
- sendMessage: Function to send messages
- clearMessages: Reset chat history
```

### Component Hierarchy
```
App.jsx
├── ProjectSelector.jsx (if no project selected)
├── Settings.jsx (settings route)
└── Main Chat Interface
    ├── ModelDropdown.jsx
    ├── MessageList.jsx
    │   └── Message.jsx
    │       └── MarkdownRenderer.jsx
    ├── ChatInput.jsx
    ├── ToolsPanel.jsx
    └── ToolApprovalModal.jsx
```

## Key Components

### App.jsx
Main application container that:
- Manages routing between chat and settings
- Handles project selection
- Coordinates global state
- Manages tool approval workflow

### ChatContext.jsx
Global state provider that manages:
- Chat message history
- Current conversation state
- Settings synchronization
- IPC communication with main process

### MessageList.jsx
Displays chat messages with:
- Auto-scrolling behavior
- Message grouping
- Streaming support
- Tool call visualization

### ChatInput.jsx
User input component with:
- Multi-line text support
- File attachment handling
- Keyboard shortcuts (Enter to send)
- Input validation

### ToolsPanel.jsx
MCP tools management panel:
- Server status display
- Available tools listing
- Server logs viewer
- Start/stop controls

## React Hooks

### Core Hooks

#### useChatFlow.js
Main chat interaction logic:
- Message sending
- Response handling
- Stream processing
- Error management

#### useMcpServers.js
MCP server management:
- Server lifecycle control
- Tool discovery
- Status monitoring
- Log aggregation

#### useModelSelection.js
AI model selection:
- Provider switching
- Model listing
- Settings synchronization

#### useToolApproval.js
Tool execution approval:
- Approval UI state
- User decision handling
- Timeout management

## Styling System

### Design Tokens (`styles/design-tokens.css`)
CSS variables for consistent theming:
```css
--color-primary: Theme primary color
--color-background: Background colors
--color-text: Text colors
--spacing-*: Spacing scale
--radius-*: Border radius scale
```

### TailwindCSS Integration
- Utility-first CSS framework
- Custom configuration in `tailwind.config.cjs`
- Component-specific styles in JSX

## IPC Communication

### Message Patterns
```javascript
// Send message to AI
window.api.chat.send({ 
  message, 
  settings, 
  tools 
})

// Receive streaming response
window.api.chat.onStream((data) => {
  // Update UI with chunk
})

// Settings operations
const settings = await window.api.settings.get()
await window.api.settings.update(newSettings)
```

### Event Listeners
```javascript
// MCP server events
window.api.mcp.onServerStarted()
window.api.mcp.onServerStopped()
window.api.mcp.onToolsDiscovered()

// Session events
window.api.session.onRestored()
window.api.session.onSaved()
```

## Routing

### Route Structure
- `/` - Main chat interface
- `/settings` - Settings page
- `/settings/:tab` - Specific settings tab

### Navigation
```javascript
// Programmatic navigation
navigate('/settings/models')

// Link components
<Link to="/settings">Settings</Link>
```

## State Machines

### ChatFlowStateMachine.js
Manages chat interaction states:
- `idle` - Waiting for input
- `sending` - Sending message
- `receiving` - Receiving response
- `toolApproval` - Awaiting tool approval
- `error` - Error state

## Performance Optimizations

### Memoization
- Heavy components use `React.memo`
- Expensive computations use `useMemo`
- Callbacks wrapped in `useCallback`

### Lazy Loading
- Code splitting for routes
- Dynamic imports for heavy components
- Virtualization for long message lists

### Debouncing
- Settings updates debounced
- Search inputs throttled
- Resize handlers optimized

## Testing Considerations

### Component Testing
- Isolated component tests
- Mock IPC communication
- Snapshot testing for UI

### Integration Testing
- Full app flow testing
- IPC communication testing
- State management verification

## Common Patterns

### Error Handling
```javascript
try {
  const result = await window.api.someOperation()
  // Handle success
} catch (error) {
  console.error('Operation failed:', error)
  // Show user-friendly error
}
```

### Loading States
```javascript
const [isLoading, setIsLoading] = useState(false)

const handleAction = async () => {
  setIsLoading(true)
  try {
    await performAction()
  } finally {
    setIsLoading(false)
  }
}
```

### Form Management
```javascript
const [formData, setFormData] = useState(initialData)

const handleChange = (field) => (value) => {
  setFormData(prev => ({ ...prev, [field]: value }))
}

const handleSubmit = async (e) => {
  e.preventDefault()
  await saveFormData(formData)
}
```

## Development Tips

### Hot Module Replacement
- Vite provides HMR in development
- State preserved during updates
- Fast refresh for React components

### DevTools
```javascript
// React DevTools available
// Redux DevTools for state debugging
// Network tab for API monitoring
```

### Debugging
```javascript
// Console logging
console.log('Debug info:', data)

// Breakpoints in DevTools
debugger

// React DevTools component inspection
```

## Common Issues

### Issue: State Not Updating
- Check React batching
- Verify state immutability
- Use functional updates

### Issue: Memory Leaks
- Clean up event listeners
- Cancel async operations
- Clear timeouts/intervals

### Issue: Performance Problems
- Profile with React DevTools
- Check unnecessary re-renders
- Optimize expensive operations