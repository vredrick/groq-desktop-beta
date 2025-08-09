# React Hooks Documentation

## Overview
Custom React hooks that encapsulate business logic, state management, and side effects. These hooks promote code reuse and separation of concerns throughout the application.

## Core Hooks

### useChatFlow.js
Main hook for managing chat interactions and message flow.

**Usage:**
```javascript
const {
  messages,
  isStreaming,
  sendMessage,
  clearMessages,
  retryMessage,
  deleteMessage
} = useChatFlow()
```

**Returns:**
- `messages: Message[]` - Chat history
- `isStreaming: boolean` - Streaming state
- `sendMessage: (content: string) => Promise<void>` - Send message
- `clearMessages: () => void` - Clear history
- `retryMessage: (id: string) => void` - Retry failed message
- `deleteMessage: (id: string) => void` - Remove message

**Internal Logic:**
1. Manages message queue
2. Handles streaming responses
3. Error recovery
4. Message persistence
5. Tool execution coordination

### useMcpServers.js
Manages MCP server lifecycle and tool discovery.

**Usage:**
```javascript
const {
  servers,
  availableTools,
  startServer,
  stopServer,
  restartServer,
  getServerLogs
} = useMcpServers()
```

**Returns:**
- `servers: MCPServer[]` - Active servers
- `availableTools: Tool[]` - Discovered tools
- `startServer: (config: ServerConfig) => Promise<void>` - Start server
- `stopServer: (id: string) => Promise<void>` - Stop server
- `restartServer: (id: string) => Promise<void>` - Restart server
- `getServerLogs: (id: string) => LogEntry[]` - Get logs

**Features:**
- Server health monitoring
- Automatic reconnection
- Tool caching
- Error handling
- Log aggregation

### useModelSelection.js
Handles AI model selection and provider switching.

**Usage:**
```javascript
const {
  selectedModel,
  selectedProvider,
  availableModels,
  selectModel,
  selectProvider,
  getModelCapabilities
} = useModelSelection()
```

**Returns:**
- `selectedModel: string` - Current model ID
- `selectedProvider: string` - Current provider
- `availableModels: Model[]` - Available models
- `selectModel: (modelId: string) => void` - Change model
- `selectProvider: (provider: string) => void` - Change provider
- `getModelCapabilities: (modelId: string) => Capabilities` - Get capabilities

**Logic:**
- Provider-model compatibility
- Settings synchronization
- Model availability checking
- Capability detection

### useToolApproval.js
Manages tool execution approval workflow.

**Usage:**
```javascript
const {
  pendingApproval,
  approveToolExecution,
  rejectToolExecution,
  setAutoApprove,
  approvalHistory
} = useToolApproval()
```

**Returns:**
- `pendingApproval: ToolRequest | null` - Pending request
- `approveToolExecution: () => void` - Approve execution
- `rejectToolExecution: () => void` - Reject execution
- `setAutoApprove: (toolId: string, auto: boolean) => void` - Auto-approve
- `approvalHistory: ApprovalEntry[]` - Past decisions

**Features:**
- Timeout handling
- Auto-approval rules
- Security checks
- Decision persistence

### useSettingsManager.js
Centralized settings management hook.

**Usage:**
```javascript
const {
  settings,
  updateSettings,
  resetSettings,
  exportSettings,
  importSettings,
  isLoading
} = useSettingsManager()
```

**Returns:**
- `settings: Settings` - Current settings
- `updateSettings: (partial: Partial<Settings>) => Promise<void>` - Update
- `resetSettings: () => Promise<void>` - Reset to defaults
- `exportSettings: () => string` - Export JSON
- `importSettings: (json: string) => Promise<void>` - Import JSON
- `isLoading: boolean` - Loading state

**Features:**
- Debounced updates
- Validation
- Migration support
- Backup/restore

### useUIState.js
Manages UI-specific state and interactions.

**Usage:**
```javascript
const {
  isSidebarOpen,
  isSettingsOpen,
  activeTab,
  toggleSidebar,
  openSettings,
  closeSettings,
  setActiveTab
} = useUIState()
```

**Returns:**
- `isSidebarOpen: boolean` - Sidebar visibility
- `isSettingsOpen: boolean` - Settings modal state
- `activeTab: string` - Active tab ID
- `toggleSidebar: () => void` - Toggle sidebar
- `openSettings: (tab?: string) => void` - Open settings
- `closeSettings: () => void` - Close settings
- `setActiveTab: (tab: string) => void` - Change tab

### useChatExecution.js
Handles chat message execution and response processing.

**Usage:**
```javascript
const {
  executeMessage,
  cancelExecution,
  executionState,
  streamBuffer,
  error
} = useChatExecution()
```

**Returns:**
- `executeMessage: (message: Message) => Promise<Response>` - Execute
- `cancelExecution: () => void` - Cancel current
- `executionState: 'idle' | 'executing' | 'streaming'` - State
- `streamBuffer: string` - Current stream buffer
- `error: Error | null` - Execution error

**Internal Flow:**
1. Message preparation
2. Tool discovery
3. API request
4. Stream processing
5. Response assembly

### useMCPServerManager.js
Advanced MCP server management capabilities.

**Usage:**
```javascript
const {
  installServer,
  uninstallServer,
  updateServer,
  validateServerConfig,
  getServerMetadata
} = useMCPServerManager()
```

**Returns:**
- `installServer: (url: string) => Promise<void>` - Install
- `uninstallServer: (id: string) => Promise<void>` - Uninstall
- `updateServer: (id: string) => Promise<void>` - Update
- `validateServerConfig: (config: Config) => ValidationResult` - Validate
- `getServerMetadata: (id: string) => Metadata` - Get metadata

## Hook Patterns

### State Management Pattern
```javascript
const useCustomHook = (initialValue) => {
  const [state, setState] = useState(initialValue)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const updateState = useCallback(async (newValue) => {
    setLoading(true)
    setError(null)
    try {
      const result = await someAsyncOperation(newValue)
      setState(result)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])
  
  return { state, updateState, loading, error }
}
```

### Effect Management Pattern
```javascript
const useEventListener = (eventName, handler) => {
  const savedHandler = useRef()
  
  useEffect(() => {
    savedHandler.current = handler
  }, [handler])
  
  useEffect(() => {
    const eventListener = (event) => savedHandler.current(event)
    window.addEventListener(eventName, eventListener)
    
    return () => {
      window.removeEventListener(eventName, eventListener)
    }
  }, [eventName])
}
```

### IPC Communication Pattern
```javascript
const useIPCChannel = (channel) => {
  const [data, setData] = useState(null)
  
  useEffect(() => {
    const handler = (newData) => setData(newData)
    const unsubscribe = window.api[channel].on(handler)
    
    return unsubscribe
  }, [channel])
  
  const send = useCallback((message) => {
    return window.api[channel].send(message)
  }, [channel])
  
  return { data, send }
}
```

### Debouncing Pattern
```javascript
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value)
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    
    return () => clearTimeout(handler)
  }, [value, delay])
  
  return debouncedValue
}
```

## Performance Optimization

### Memoization
```javascript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(dependency)
}, [dependency])

const stableCallback = useCallback(() => {
  doSomething(value)
}, [value])
```

### Lazy Initialization
```javascript
const [state, setState] = useState(() => {
  // Expensive initial state calculation
  return calculateInitialState()
})
```

### Cleanup
```javascript
useEffect(() => {
  const subscription = subscribe()
  
  return () => {
    subscription.unsubscribe()
  }
}, [])
```

## Testing Hooks

### Hook Testing Pattern
```javascript
import { renderHook, act } from '@testing-library/react-hooks'

describe('useCustomHook', () => {
  it('updates state correctly', () => {
    const { result } = renderHook(() => useCustomHook())
    
    act(() => {
      result.current.updateState('new value')
    })
    
    expect(result.current.state).toBe('new value')
  })
})
```

### Mocking IPC
```javascript
beforeEach(() => {
  window.api = {
    chat: {
      send: jest.fn(),
      onStream: jest.fn()
    }
  }
})
```

## Common Patterns

### Fetch Data Pattern
```javascript
const useFetch = (url) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(url)
        const data = await response.json()
        setData(data)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [url])
  
  return { data, loading, error }
}
```

### Local Storage Pattern
```javascript
const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      return initialValue
    }
  })
  
  const setValue = (value) => {
    try {
      setStoredValue(value)
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(error)
    }
  }
  
  return [storedValue, setValue]
}
```

## Best Practices

### Do's
- Keep hooks focused on single responsibility
- Use descriptive names (useXxx pattern)
- Return consistent API shapes
- Handle cleanup in effects
- Memoize expensive computations
- Document complex logic

### Don'ts
- Don't call hooks conditionally
- Avoid side effects in render
- Don't mutate state directly
- Avoid unnecessary dependencies
- Don't forget cleanup functions

## Troubleshooting

### Issue: Infinite Loop
- Check effect dependencies
- Verify state update logic
- Use useCallback for functions

### Issue: Stale Closure
- Use functional state updates
- Check dependency arrays
- Consider useRef for latest values

### Issue: Memory Leak
- Add cleanup functions
- Cancel async operations
- Remove event listeners