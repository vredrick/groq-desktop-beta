// Settings constants
export const PROVIDERS = {
  GROQ: 'groq',
  OPENROUTER: 'openrouter',
  CUSTOM: 'custom'
};

export const TRANSPORT_TYPES = {
  STDIO: 'stdio',
  SSE: 'sse',
  STREAMABLE_HTTP: 'streamableHttp'
};

export const DEBOUNCE_DELAY = 800;
export const STATUS_MESSAGE_TIMEOUT = 2000;

export const TEMPERATURE_RANGE = {
  MIN: 0,
  MAX: 1,
  STEP: 0.01
};

export const TOP_P_RANGE = {
  MIN: 0,
  MAX: 1,
  STEP: 0.01
};

export const TOOL_OUTPUT_LIMIT_RANGE = {
  MIN: 1000,
  MAX: 50000,
  STEP: 1000
};

export const SENSITIVE_KEYS = ['key', 'token', 'secret'];
export const MAX_VISIBLE_VALUE_LENGTH = 30;