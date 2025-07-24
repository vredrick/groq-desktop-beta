import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';

const SessionHistory = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
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
      {/* Sidebar */}
      <div className={`bg-bg-tertiary transition-all duration-200 ease-in-out overflow-hidden flex-shrink-0 border-r border-border-primary ${isOpen ? 'w-64' : 'w-0'}`}>
        <div className="flex flex-col h-full">
          {/* Header with New Chat button */}
          <div className="p-3">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center gap-2 px-3 py-2 bg-surface-primary hover:bg-surface-hover rounded-lg text-sm text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New chat
            </button>
          </div>

          {/* Navigation sections */}
          <div className="flex-1 overflow-y-auto">
            {/* Main navigation */}
            <nav className="px-2 py-2 space-y-1">
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-surface-hover rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chats
              </button>
              <button 
                onClick={() => navigate('/projects')}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-surface-hover rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Projects
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-surface-hover rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Artifacts
              </button>
            </nav>
            
            {/* Recents section */}
            <div className="px-2 py-4">
              <div className="px-3 py-1 mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Recents</span>
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
                      className={`group relative px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        session.path === currentSessionFile
                          ? 'bg-surface-secondary text-white'
                          : 'text-gray-300 hover:bg-surface-hover hover:text-white'
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
                            className="p-1 hover:bg-surface-tertiary rounded"
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
          
          {/* Bottom section with settings */}
          <div className="p-3 border-t border-border-primary">
            <Link
              to="/settings"
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-surface-hover rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default SessionHistory;