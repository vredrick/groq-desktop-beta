# Shared Utilities Documentation

## Overview
The shared directory contains utilities, constants, and model definitions that are used across both the Electron main process and the React renderer process. This ensures consistency and prevents code duplication.

## File Structure

### Model Definitions
- `models.js` - Legacy model configurations
- `openAIModels.js` - OpenAI model definitions and capabilities
- `openRouterModels.js` - OpenRouter model catalog and pricing

## Key Files

### openAIModels.js
Defines available OpenAI GPT-5 family models with their capabilities:

```javascript
export const OPENAI_MODELS = {
  "gpt-5": {
    context: 400000,  // 400k total context
    vision_supported: true,
    display_name: "GPT-5",
    api_type: "chat"
  },
  "gpt-5-mini": {
    context: 400000,
    vision_supported: true,
    display_name: "GPT-5 Mini",
    api_type: "chat"
  },
  "gpt-5-nano": {
    context: 400000,
    vision_supported: true,
    display_name: "GPT-5 Nano",
    api_type: "chat"
  },
  // ... more models
}
```

Key features:
- GPT-5 family models (gpt-5, gpt-5-mini, gpt-5-nano, gpt-5-chat-latest)
- 400k context window (272k input + 128k reasoning/output)
- Vision support across all models
- Chat Completions API integration
- Model display names

### openRouterModels.js
Comprehensive catalog of OpenRouter-available models:

```javascript
export const OPENROUTER_MODELS = [
  {
    provider: 'anthropic',
    models: [
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        contextWindow: 200000,
        pricing: { input: 0.015, output: 0.075 }
      }
    ]
  },
  // ... more providers
]
```

Features:
- Multi-provider support
- Model categorization
- Performance tiers
- Cost optimization data
- Rate limit information

## Model Selection Logic

### Provider Detection
```javascript
function getProviderForModel(modelId) {
  // Determine which provider to use based on model ID
  if (modelId.startsWith('gpt-5')) return 'openai'  // GPT-5 family
  if (modelId.includes('llama')) return 'groq'
  return 'openrouter' // Fallback
}
```

### Capability Checking
```javascript
function supportsVision(modelId) {
  const model = findModel(modelId)
  return model?.capabilities?.includes('vision')
}

function supportsFunctions(modelId) {
  const model = findModel(modelId)
  return model?.capabilities?.includes('functions')
}
```

### Context Window Management
```javascript
function getMaxTokens(modelId) {
  const model = findModel(modelId)
  return model?.contextWindow || 4096 // Default fallback
}

function calculateAvailableTokens(modelId, promptTokens) {
  const maxTokens = getMaxTokens(modelId)
  return maxTokens - promptTokens - RESPONSE_BUFFER
}
```

## Shared Constants

### API Endpoints
```javascript
export const API_ENDPOINTS = {
  OPENAI: 'https://api.openai.com/v1',
  GROQ: 'https://api.groq.com/openai/v1',
  OPENROUTER: 'https://openrouter.ai/api/v1'
}
```

### Default Settings
```javascript
export const DEFAULT_SETTINGS = {
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0
}
```

### Error Codes
```javascript
export const ERROR_CODES = {
  INVALID_API_KEY: 'INVALID_API_KEY',
  RATE_LIMIT: 'RATE_LIMIT',
  CONTEXT_OVERFLOW: 'CONTEXT_OVERFLOW',
  NETWORK_ERROR: 'NETWORK_ERROR'
}
```

## Utility Functions

### Validation
```javascript
export function validateApiKey(key, provider) {
  // Provider-specific API key validation
  switch(provider) {
    case 'openai':
      return /^sk-[a-zA-Z0-9]{48}$/.test(key)
    case 'groq':
      return /^gsk_[a-zA-Z0-9]{52}$/.test(key)
    default:
      return key?.length > 0
  }
}
```

### Formatting
```javascript
export function formatModelName(modelId) {
  // Convert model IDs to user-friendly names
  return modelId
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

export function formatTokenCount(tokens) {
  if (tokens < 1000) return tokens.toString()
  if (tokens < 1000000) return `${(tokens/1000).toFixed(1)}K`
  return `${(tokens/1000000).toFixed(2)}M`
}
```

### Cost Calculation
```javascript
export function calculateCost(model, inputTokens, outputTokens) {
  const pricing = getModelPricing(model)
  const inputCost = (inputTokens / 1000) * pricing.input
  const outputCost = (outputTokens / 1000) * pricing.output
  return { inputCost, outputCost, total: inputCost + outputCost }
}
```

## Type Definitions

### Model Interface
```javascript
interface Model {
  id: string           // Unique model identifier
  name: string         // Display name
  provider: string     // Provider name
  contextWindow: number // Max context size
  capabilities: string[] // Feature list
  pricing: {
    input: number      // $ per 1K input tokens
    output: number     // $ per 1K output tokens
  }
  deprecated?: boolean // Deprecation flag
  replacement?: string // Suggested alternative
}
```

### Settings Interface
```javascript
interface ModelSettings {
  provider: string
  model: string
  apiKey: string
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
  systemPrompt?: string
}
```

## Cross-Process Communication

### Data Serialization
Shared utilities ensure consistent data serialization between processes:

```javascript
export function serializeForIPC(data) {
  // Prepare data for IPC transfer
  return JSON.stringify(data, (key, value) => {
    if (value instanceof Error) {
      return { error: true, message: value.message }
    }
    return value
  })
}

export function deserializeFromIPC(data) {
  // Restore data from IPC transfer
  return JSON.parse(data, (key, value) => {
    if (value?.error) {
      return new Error(value.message)
    }
    return value
  })
}
```

## Best Practices

### Adding New Models
1. Add model definition to appropriate file
2. Include all required fields
3. Verify capability flags
4. Test with actual API
5. Update documentation

### Modifying Shared Code
1. Consider both process contexts
2. Maintain backward compatibility
3. Update type definitions
4. Test in both environments
5. Document breaking changes

### Performance Considerations
- Keep shared modules lightweight
- Avoid process-specific dependencies
- Use lazy loading where appropriate
- Cache expensive computations
- Minimize memory footprint

## Common Issues

### Issue: Module Not Found
- Check import paths
- Verify module exports
- Ensure webpack/vite configuration

### Issue: Type Mismatches
- Sync type definitions
- Validate at boundaries
- Use runtime type checking

### Issue: Cross-Process Incompatibility
- Check for browser/node APIs
- Use appropriate polyfills
- Implement fallbacks