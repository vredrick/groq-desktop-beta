// Helper function to parse args string into array
export const parseArgsString = (argsStr) => {
  if (!argsStr) return [];
  let args = [];
  const trimmedArgsStr = argsStr.trim();
  let current = '';
  let inQuotes = false;
  let quoteChar = null;

  for (let i = 0; i < trimmedArgsStr.length; i++) {
    const char = trimmedArgsStr[i];

    if ((char === '"' || char === "'") && (quoteChar === null || quoteChar === char)) {
      if (inQuotes) {
        // Ending quote
        inQuotes = false;
        quoteChar = null;
      } else {
        // Starting quote
        inQuotes = true;
        quoteChar = char;
      }
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        args.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    args.push(current);
  }
  return args;
};

export const parseJsonInput = (jsonInput) => {
  try {
    if (!jsonInput.trim()) {
      throw new Error("JSON input is empty");
    }
    
    const parsedJson = JSON.parse(jsonInput);
    
    // Check if it's a valid MCP server config
    if (typeof parsedJson !== 'object') {
      throw new Error("JSON must be an object");
    }
    
    // Create a normalized server entry
    const serverEntry = {};
    
    // Check for transport type in JSON (optional, default to stdio if missing)
    const transport = parsedJson.transport === 'sse' ? 'sse' : 'stdio';
    serverEntry.transport = transport;

    if (transport === 'stdio') {
      if ('command' in parsedJson) {
        serverEntry.command = parsedJson.command;
      } else {
        throw new Error("Stdio server config must include 'command' field");
      }

      // Handle args field for stdio
      if ('args' in parsedJson) {
        if (Array.isArray(parsedJson.args)) {
          serverEntry.args = parsedJson.args;
        } else {
          throw new Error("'args' must be an array for stdio config");
        }
      } else {
        serverEntry.args = [];
      }

      // Handle env field for stdio
      if ('env' in parsedJson) {
        if (typeof parsedJson.env === 'object' && parsedJson.env !== null) {
          serverEntry.env = parsedJson.env;
        } else {
          throw new Error("'env' must be an object for stdio config");
        }
      } else {
        serverEntry.env = {};
      }
      // Ensure url field is not present or empty for stdio
      serverEntry.url = '';

    } else { // transport === 'sse'
      if ('url' in parsedJson && typeof parsedJson.url === 'string' && parsedJson.url.trim() !== '') {
        serverEntry.url = parsedJson.url;
      } else {
        throw new Error("SSE server config must include a non-empty 'url' field");
      }
      // Ensure stdio fields are not present or empty for sse
      serverEntry.command = '';
      serverEntry.args = [];
      serverEntry.env = {};
    }

    return { success: true, data: serverEntry };
  } catch (error) {
    return { success: false, error: error.message };
  }
};