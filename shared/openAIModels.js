const OPENAI_MODELS = {
  // GPT-5 Series (uses Chat Completions API)
  "gpt-5": {
    context: 400000,  // 400k total context (272k input + 128k reasoning/output)
    vision_supported: true,
    display_name: "GPT-5",
    api_type: "chat"  // Uses standard Chat Completions API
  },
  "gpt-5-mini": {
    context: 400000,  // 400k total context (272k input + 128k reasoning/output)
    vision_supported: true,
    display_name: "GPT-5 Mini",
    api_type: "chat"
  },
  "gpt-5-nano": {
    context: 400000,  // 400k total context (272k input + 128k reasoning/output)
    vision_supported: true,
    display_name: "GPT-5 Nano",
    api_type: "chat"
  },
  "gpt-5-chat-latest": {
    context: 400000,  // 400k total context (272k input + 128k reasoning/output)
    vision_supported: true,
    display_name: "GPT-5 Chat Latest",
    api_type: "chat"  // Chat-tuned variant
  },
  
  // Default fallback (for GPT-5 family)
  default: {
    context: 400000,
    vision_supported: true,
    display_name: "GPT-5 Custom",
    api_type: "chat"
  }
};

module.exports = { OPENAI_MODELS };