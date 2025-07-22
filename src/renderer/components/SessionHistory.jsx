import React, { useState, useEffect } from 'react';
import { useChat } from '../context/ChatContext';

const SessionHistory = ({ isOpen, onClose }) => {
  const { 
    workingDirectory,
    currentSessionFile,
    listSessions,
    loadSessionFromFile,
    deleteSession,
    startNewSession
  } = useChat();
  
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load sessions when panel opens or working directory changes
  useEffect(() => {
    if (isOpen && workingDirectory) {
      loadSessions();
    }
  }, [isOpen, workingDirectory]);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const sessionList = await listSessions();
      setSessions(sessionList);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSession = async (sessionFile) => {
    await loadSessionFromFile(sessionFile);
    onClose();
  };

  const handleDeleteSession = async (sessionFile, e) => {
    e.stopPropagation();
    if (window.confirm('Delete this conversation?')) {
      const result = await deleteSession(sessionFile);
      if (result.success) {
        await loadSessions();
      }
    }
  };

  const handleNewChat = async () => {
    await startNewSession();
    onClose();
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    
    // Less than 1 hour
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `${mins}m ago`;
    }
    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }
    // Less than 7 days
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days}d ago`;
    }
    
    // Otherwise show date
    return d.toLocaleDateString();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-gray-900 transform transition-transform duration-200 ease-in-out z-50 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-800">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New chat
            </button>
          </div>

          {/* Navigation sections */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-2 py-4">
              <div className="px-2 py-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Chats</span>
              </div>
              
              {/* Sessions list */}
              <div className="mt-2 space-y-1">
                {!workingDirectory ? (
                  <div className="px-3 py-8 text-center text-sm text-gray-500">
                    No project selected
                  </div>
                ) : isLoading ? (
                  <div className="px-3 py-8 text-center text-sm text-gray-500">
                    Loading...
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-gray-500">
                    No conversations yet
                  </div>
                ) : (
                  sessions.map((session) => (
                    <div
                      key={session.file}
                      onClick={() => handleLoadSession(session.path)}
                      className={`group relative px-3 py-2 rounded cursor-pointer transition-colors ${
                        session.path === currentSessionFile
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">
                            {session.preview || 'New conversation'}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {formatDate(session.modified)}
                          </div>
                        </div>
                        
                        {/* Delete button */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleDeleteSession(session.path, e)}
                            className="p-1 hover:bg-gray-700 rounded"
                            title="Delete"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SessionHistory;