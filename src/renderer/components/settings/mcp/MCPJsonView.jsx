import React from 'react';

function MCPJsonView({ jsonInput, setJsonInput, jsonError }) {
  const handleJsonInputChange = (e) => {
    setJsonInput(e.target.value);
  };

  const placeholderText = `{
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "..."],
  "env": { ... }
}

// OR

{
  "transport": "sse",
  "url": "http://localhost:8000/sse"
}

// OR

{
  "transport": "streamableHttp",
  "url": "http://localhost:8080/mcp"
}`;

  return (
    <div className="mb-4">
      <label htmlFor="json-input" className="block text-sm font-medium text-gray-300 mb-1">
        Server Configuration JSON:
      </label>
      <textarea
        id="json-input"
        value={jsonInput}
        onChange={handleJsonInputChange}
        className="w-full px-3 py-2 border border-gray-500 rounded-md bg-transparent text-white placeholder-gray-400 text-sm font-mono"
        placeholder={placeholderText}
        rows={10}
      />
      {jsonError && (
        <p className="mt-1 text-sm text-red-400">{jsonError}</p>
      )}
    </div>
  );
}

export default MCPJsonView;