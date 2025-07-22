import React from 'react';
import { useChat } from '../context/ChatContext';

const DirectorySelector = () => {
  const { 
    workingDirectory, 
    selectWorkingDirectory, 
    startNewSession,
    currentSessionFile 
  } = useChat();

  const handleSelectDirectory = async () => {
    await selectWorkingDirectory();
  };

  const handleNewSession = async () => {
    await startNewSession();
  };

  // Extract just the directory name for display
  const directoryName = workingDirectory ? workingDirectory.split('/').pop() || workingDirectory : null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex-1 flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">Project:</span>
        {workingDirectory ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white" title={workingDirectory}>
              {directoryName}
            </span>
            <button
              onClick={handleSelectDirectory}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Change
            </button>
          </div>
        ) : (
          <button
            onClick={handleSelectDirectory}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Select Directory
          </button>
        )}
      </div>
      
      {workingDirectory && (
        <button
          onClick={handleNewSession}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
        >
          New Chat
        </button>
      )}
    </div>
  );
};

export default DirectorySelector;