const OPENROUTER_MODELS = {
  // Moonshot AI
  "moonshotai/kimi-k2": {
    context: 262144,
    vision_supported: true,
    display_name: "Kimi K2"
  },
  
  // Google Gemini
  "google/gemini-2.5-flash": {
    context: 1048576,
    vision_supported: true,
    display_name: "Gemini 2.5 Flash"
  },
  "google/gemini-2.5-pro": {
    context: 1048576,
    vision_supported: true,
    display_name: "Gemini 2.5 Pro"
  },
  
  // Anthropic Claude
  "anthropic/claude-sonnet-4": {
    context: 200000,
    vision_supported: true,
    display_name: "Claude Sonnet 4"
  },
  "anthropic/claude-3.7-sonnet": {
    context: 200000,
    vision_supported: true,
    display_name: "Claude 3.7 Sonnet"
  },
  "anthropic/claude-opus-4": {
    context: 200000,
    vision_supported: true,
    display_name: "Claude Opus 4"
  },
  
  // OpenAI
  "openai/gpt-4.1": {
    context: 128000,
    vision_supported: true,
    display_name: "GPT-4.1"
  },
  
  // Default fallback for custom models
  default: {
    context: 32768,
    vision_supported: false,
    display_name: "Custom Model"
  }
};

module.exports = { OPENROUTER_MODELS };