import React, { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

function ToolCall({ toolCall, toolResult }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setResult(null);
    setError(null);

    if (toolResult) {
      try {
        const parsedResult = JSON.parse(toolResult);
        if (parsedResult.error) {
          setError(parsedResult.error);
        } else {
          setResult(JSON.stringify(parsedResult, null, 2));
        }
      } catch (e) {
        setResult(toolResult);
      }
    }
  }, [toolResult]);

  const formatFunctionName = (name) => {
    if (!name) return '';
    
    const words = name.split('_');
    
    const firstWord = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    const restWords = words.slice(1);
    
    return [firstWord, ...restWords].join(' ');
  };

  if (!toolCall) return null;

  const { function: func } = toolCall;
  const functionName = func.name;
  const formattedName = formatFunctionName(functionName);
  let args = {};
  try {
    args = JSON.parse(func.arguments || '{}');
  } catch (e) {
    console.error("Failed to parse tool call arguments:", func.arguments, e);
    args = { parse_error: "Could not parse arguments", original_arguments: func.arguments };
  }

  const isPending = toolResult === null || toolResult === undefined;

  return (
    <div className="tool-execution-block">
      <div 
        className="tool-execution-header group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 flex-1">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`chevron-icon w-4 h-4 ${isExpanded ? 'rotated' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-primary text-xs font-semibold tracking-wide uppercase">Tool</span>
          <span className="text-text-primary font-medium">{formattedName}</span>
          {isPending && !isExpanded && (
            <div className="flex items-center gap-2 text-text-tertiary text-xs">
              <div className="loading-spinner w-3 h-3"></div>
              <span>Executing...</span>
            </div>
          )}
        </div>
        <div className="text-text-tertiary text-xs">
          {result && !error && (
            <span className="text-success">{result.length.toLocaleString()} chars</span>
          )}
          {error && <span className="text-error">Error</span>}
        </div>
      </div>

      {isExpanded && (
        <div className="tool-execution-content">
          <div className="space-y-4">
            {/* Request Section */}
            <div>
              <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">Request</div>
              <div className="bg-code-bg border border-code-border rounded-lg p-3">
                <div className="text-xs text-text-secondary mb-1 font-mono">{`{}`}</div>
                <div className="rounded-md text-sm overflow-x-auto">
                  <SyntaxHighlighter 
                    language="json" 
                    style={vscDarkPlus}
                    customStyle={{
                      borderRadius: '0.375rem', 
                      margin: 0,
                      padding: '0.75rem',
                      fontSize: '0.75rem',
                      backgroundColor: 'transparent',
                      border: 'none'
                    }}
                    wrapLongLines={true}
                  >
                    {JSON.stringify(args, null, 2)}
                  </SyntaxHighlighter>
                </div>
              </div>
            </div>

            {/* Response Section */}
            <div>
              <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">Response</div>
              <div className="bg-code-bg border border-code-border rounded-lg p-3">
                {isPending && (
                  <div className="flex items-center gap-2 text-text-tertiary text-sm">
                    <div className="loading-spinner w-4 h-4"></div>
                    <span>Executing tool...</span>
                  </div>
                )}

                {error && (
                  <div className="text-error text-sm">
                    <div className="font-medium mb-1">Error</div>
                    <pre className="whitespace-pre-wrap break-words font-mono text-xs bg-error/10 p-2 rounded-md border border-error/20">
                      {error}
                    </pre>
                  </div>
                )}

                {result && !error && (
                  <div>
                    <div className="text-xs text-text-secondary mb-1 font-mono">
                      Result ({result.length.toLocaleString()} characters)
                    </div>
                    <div className="rounded-md text-sm overflow-x-auto">
                      <SyntaxHighlighter 
                        language="json" 
                        style={vscDarkPlus}
                        customStyle={{
                          borderRadius: '0.375rem', 
                          margin: 0,
                          padding: '0.75rem',
                          fontSize: '0.75rem',
                          backgroundColor: 'transparent',
                          border: 'none'
                        }}
                        wrapLongLines={true}
                      >
                        {result}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                )}

                {!isPending && !result && !error && (
                  <div className="text-text-tertiary text-sm italic">
                    No result received from client-side tool execution.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ToolCall; 