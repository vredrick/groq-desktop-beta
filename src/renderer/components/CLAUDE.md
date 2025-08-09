# Components Library Documentation

## Overview
This directory contains all React components used in the Groq Desktop application. Components are organized by functionality and follow a consistent pattern for props, styling, and behavior.

## Component Categories

### Core Chat Components

#### ChatInput.jsx
Primary user input component for chat messages.

**Props:**
- `onSend: (message: string) => void` - Message send handler
- `disabled: boolean` - Disable input during streaming
- `placeholder: string` - Input placeholder text

**Features:**
- Multi-line text input with auto-resize
- Keyboard shortcuts (Cmd/Ctrl+Enter for new line)
- File attachment support
- Character count display

#### MessageList.jsx
Container for displaying chat messages.

**Props:**
- `messages: Message[]` - Array of chat messages
- `isStreaming: boolean` - Show streaming indicator
- `onRetry: (messageId: string) => void` - Retry failed message

**Features:**
- Auto-scroll to bottom
- Message grouping by sender
- Smooth scroll animations
- Virtual scrolling for performance

#### Message.jsx
Individual message display component.

**Props:**
- `message: Message` - Message data
- `isStreaming: boolean` - Show streaming state
- `onEdit: (id: string, content: string) => void` - Edit handler
- `onDelete: (id: string) => void` - Delete handler

**Features:**
- Markdown rendering
- Code syntax highlighting
- Copy message functionality
- Timestamp display

### UI Components

#### MarkdownRenderer.jsx
Renders markdown content with syntax highlighting.

**Props:**
- `content: string` - Markdown content
- `className: string` - Additional CSS classes

**Features:**
- GitHub-flavored markdown support
- Code block syntax highlighting
- Table rendering
- Link handling

#### ModelDropdown.jsx
AI model selection dropdown.

**Props:**
- `selectedModel: string` - Current model ID
- `onModelChange: (modelId: string) => void` - Change handler
- `provider: string` - Current provider

**Features:**
- Grouped by provider
- Model capabilities display
- Search/filter functionality
- Recently used models

#### DirectorySelector.jsx
File/directory selection component.

**Props:**
- `value: string` - Current path
- `onChange: (path: string) => void` - Path change handler
- `type: 'file' | 'directory'` - Selection type

**Features:**
- Native file dialog integration
- Path validation
- Recent locations
- Drag-and-drop support

### MCP Components

#### ToolsPanel.jsx
MCP server and tools management panel.

**Props:**
- `servers: MCPServer[]` - Active servers
- `onServerToggle: (id: string) => void` - Start/stop server
- `onToolExecute: (tool: Tool) => void` - Execute tool

**Features:**
- Server status indicators
- Tool discovery display
- Server logs viewer
- Quick actions menu

#### ToolCall.jsx
Individual tool execution display.

**Props:**
- `tool: Tool` - Tool information
- `result: any` - Execution result
- `status: 'pending' | 'approved' | 'executed'` - Tool status

**Features:**
- Parameter display
- Result formatting
- Execution timeline
- Error display

#### ToolApprovalModal.jsx
Modal for approving tool execution.

**Props:**
- `tool: Tool` - Tool requesting approval
- `onApprove: () => void` - Approval handler
- `onReject: () => void` - Rejection handler
- `timeout: number` - Auto-reject timeout

**Features:**
- Tool details display
- Risk assessment
- Timeout countdown
- Remember decision option

### Settings Components

#### Settings Directory Structure
```
settings/
├── AIModelsTab.jsx - Model configuration
├── CustomSystemPrompt.jsx - System prompt editor
├── GenerationParameters.jsx - Generation settings
├── MCPServersTab.jsx - MCP server management
├── providers/ - Provider-specific settings
│   ├── GroqProviderSettings.jsx
│   ├── OpenAIProviderSettings.jsx
│   ├── OpenRouterProviderSettings.jsx
│   └── ProviderSelector.jsx
└── mcp/ - MCP configuration components
    ├── MCPServerForm.jsx
    └── MCPServerList.jsx
```

### Modal Components

#### LogViewerModal.jsx
Displays server logs and debug information.

**Props:**
- `logs: LogEntry[]` - Log entries
- `isOpen: boolean` - Modal visibility
- `onClose: () => void` - Close handler

**Features:**
- Log level filtering
- Search functionality
- Export logs
- Auto-refresh

#### SessionHistory.jsx
Browse and restore previous chat sessions.

**Props:**
- `sessions: Session[]` - Available sessions
- `onRestore: (sessionId: string) => void` - Restore handler
- `onDelete: (sessionId: string) => void` - Delete handler

**Features:**
- Session preview
- Search/filter
- Bulk operations
- Export/import

## Component Patterns

### Props Interface Pattern
```javascript
interface ComponentProps {
  // Required props
  data: DataType
  onAction: (param: Type) => void
  
  // Optional props
  className?: string
  disabled?: boolean
  loading?: boolean
}
```

### State Management Pattern
```javascript
const Component = ({ initialValue, onChange }) => {
  const [localState, setLocalState] = useState(initialValue)
  
  const handleChange = (newValue) => {
    setLocalState(newValue)
    onChange?.(newValue)
  }
  
  return (...)
}
```

### Error Boundary Pattern
```javascript
const SafeComponent = withErrorBoundary(Component, {
  fallback: <ErrorFallback />,
  onError: (error) => console.error(error)
})
```

## Styling Guidelines

### TailwindCSS Classes
```javascript
// Consistent spacing
className="px-4 py-2"

// Responsive design
className="w-full md:w-1/2 lg:w-1/3"

// Dark mode support
className="bg-white dark:bg-gray-800"

// State variants
className="hover:bg-gray-100 focus:ring-2 disabled:opacity-50"
```

### Component-Specific Styles
```javascript
// Use CSS modules for complex styles
import styles from './Component.module.css'

// Or inline styles for dynamic values
style={{ maxHeight: `${maxHeight}px` }}
```

## Accessibility

### ARIA Attributes
```javascript
<button
  aria-label="Send message"
  aria-disabled={disabled}
  role="button"
>
```

### Keyboard Navigation
```javascript
const handleKeyDown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSubmit()
  }
}
```

### Focus Management
```javascript
useEffect(() => {
  if (isOpen) {
    inputRef.current?.focus()
  }
}, [isOpen])
```

## Performance Optimization

### Memoization
```javascript
const MemoizedComponent = React.memo(Component, (prevProps, nextProps) => {
  return prevProps.id === nextProps.id
})
```

### Lazy Loading
```javascript
const HeavyComponent = React.lazy(() => import('./HeavyComponent'))

<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

### Virtualization
```javascript
// For long lists
import { FixedSizeList } from 'react-window'

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={50}
>
  {Row}
</FixedSizeList>
```

## Testing Components

### Unit Testing
```javascript
describe('Component', () => {
  it('renders correctly', () => {
    render(<Component {...props} />)
    expect(screen.getByText('Expected')).toBeInTheDocument()
  })
  
  it('handles user interaction', () => {
    const handleClick = jest.fn()
    render(<Component onClick={handleClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalled()
  })
})
```

### Integration Testing
```javascript
it('integrates with context', () => {
  render(
    <ChatContext.Provider value={mockContext}>
      <Component />
    </ChatContext.Provider>
  )
  // Test component with context
})
```

## Common Issues & Solutions

### Issue: Component Re-rendering Too Often
- Use React.memo for pure components
- Optimize dependency arrays in hooks
- Move static data outside component

### Issue: Memory Leaks
- Clean up event listeners
- Cancel async operations in cleanup
- Clear timers and intervals

### Issue: Prop Drilling
- Use Context API for deep prop passing
- Consider component composition
- Extract container components