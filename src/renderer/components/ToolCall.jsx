import React, { useState, useEffect } from 'react';

function ToolCall({ toolCall, toolResult, onExecute }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (toolResult) {
      try {
        // Tool result might be a JSON string with error
        const parsedResult = JSON.parse(toolResult);
        if (parsedResult.error) {
          setError(parsedResult.error);
        } else {
          setResult(toolResult);
        }
      } catch (e) {
        // If not JSON or can't be parsed, use as is
        setResult(toolResult);
      }
    }
  }, [toolResult]);

  const handleExecute = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (onExecute) {
        // We get a message object back but we only want to extract content
        await onExecute(toolCall);
        // Tool result will be updated via props
      } else {
        const response = await window.electron.executeToolCall(toolCall);
        if (response.error) {
          setError(response.error);
        } else {
          setResult(response.result);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to execute tool call');
    } finally {
      setIsLoading(false);
    }
  };

  // Format function name to be more readable
  const formatFunctionName = (name) => {
    if (!name) return '';
    
    const words = name.split('_');
    
    // Capitalize only the first word
    const firstWord = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    const restWords = words.slice(1);
    
    return [firstWord, ...restWords].join(' ');
  };

  if (!toolCall) return null;

  const { function: func } = toolCall;
  const functionName = func.name;
  const formattedName = formatFunctionName(functionName);
  const args = JSON.parse(func.arguments);

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 mt-3 bg-gray-100 dark:bg-gray-800 shadow-sm">
      <div 
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="font-medium flex items-center">
          <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2.5 py-0.5 rounded-full mr-2">
            Tool
          </span>
          <span>{formattedName}</span>
        </div>
        <button className="text-gray-500 ml-2 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-5 w-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
          <div className="mb-3">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Arguments:</div>
            <pre className="bg-gray-200 dark:bg-gray-700 p-2.5 rounded-md text-sm overflow-x-auto">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>

          {!result && !isLoading && !error && (
            <button 
              onClick={handleExecute}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Execute
            </button>
          )}

          {isLoading && (
            <div className="text-sm flex items-center text-gray-600 dark:text-gray-400">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Executing...
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <div className="font-medium mb-1">Error:</div>
              {error}
            </div>
          )}

          {result && (
            <div className="mt-3">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Result:</div>
              <pre className="bg-gray-200 dark:bg-gray-700 p-2.5 rounded-md text-sm overflow-x-auto">
                {result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ToolCall; 