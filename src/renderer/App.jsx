import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import ToolsPanel from './components/ToolsPanel';
import ToolApprovalModal from './components/ToolApprovalModal';
import SessionHistory from './components/SessionHistory';
import { useChat } from './context/ChatContext';
import { useChatFlow } from './hooks/useChatFlow';
import { useMcpServers } from './hooks/useMcpServers';
import { useModelSelection } from './hooks/useModelSelection';

function App() {
  const navigate = useNavigate();
  const { messages, setMessages, workingDirectory } = useChat();
  const messagesEndRef = useRef(null);
  
  // UI state
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(false);
  const [isSessionHistoryOpen, setIsSessionHistoryOpen] = useState(true);
  
  // Model selection
  const {
    selectedModel,
    setSelectedModel,
    models,
    visionSupported
  } = useModelSelection();
  
  // MCP servers
  const {
    mcpTools,
    mcpServersStatus,
    disconnectMcpServer,
    reconnectMcpServer,
    refreshMcpTools
  } = useMcpServers();
  
  // Chat flow management
  const {
    loading,
    pendingApprovalCall,
    sendMessage,
    handleToolApproval,
    stopStream,
    executeToolCall
  } = useChatFlow(selectedModel);

  // Check if a project is selected
  useEffect(() => {
    if (!workingDirectory) {
      navigate('/projects');
    }
  }, [workingDirectory, navigate]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle removing last message
  const handleRemoveLastMessage = () => {
    setMessages(prev => {
      if (prev.length === 0) return prev;
      return prev.slice(0, prev.length - 1);
    });
  };

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {/* Header */}
      <header className="bg-bg-secondary border-b border-border-primary">
        <div className="mx-auto py-2 px-4 flex items-center gap-3">
          <button
            onClick={() => setIsSessionHistoryOpen(!isSessionHistoryOpen)}
            className="p-1 hover:bg-surface-hover rounded transition-colors"
            title="Toggle sidebar"
          >
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <rect x="2" y="4" width="16" height="2" rx="1" />
              <rect x="2" y="9" width="16" height="2" rx="1" />
              <rect x="2" y="14" width="16" height="2" rx="1" />
            </svg>
          </button>
          <h1 className="text-lg font-medium text-text-primary">
            groq<span className="text-primary">desktop</span>
          </h1>
          {workingDirectory && (
            <>
              <span className="text-gray-600 text-sm">|</span>
              <span className="text-gray-400 text-sm">
                {workingDirectory.split('/').pop() || 'Project'}
              </span>
            </>
          )}
        </div>
      </header>
      
      {/* Main container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <SessionHistory 
          isOpen={isSessionHistoryOpen}
          onClose={() => setIsSessionHistoryOpen(false)}
        />
        
        {/* Main content area */}
        <main className="flex-1 overflow-hidden flex flex-col bg-bg-primary relative">
          <div className="flex-1 overflow-y-auto px-4 pb-32">
            <div className="max-w-3xl mx-auto py-4">
              <MessageList 
                messages={messages} 
                onToolCallExecute={executeToolCall} 
                onRemoveLastMessage={handleRemoveLastMessage} 
              />
              <div ref={messagesEndRef} />
            </div>
          </div>
          
          <ChatInput
            onSendMessage={sendMessage}
            loading={loading}
            visionSupported={visionSupported}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            models={models}
            onOpenTools={() => {
              setIsToolsPanelOpen(!isToolsPanelOpen);
              if (!isToolsPanelOpen) {
                refreshMcpTools();
              }
            }}
            isToolsOpen={isToolsPanelOpen}
            onStop={stopStream}
          />
        </main>
      </div>

      {/* Tools Panel */}
      {isToolsPanelOpen && (
        <ToolsPanel
          tools={mcpTools}
          onClose={() => setIsToolsPanelOpen(false)}
          onDisconnectServer={disconnectMcpServer}
          onReconnectServer={reconnectMcpServer}
        />
      )}

      {/* Tool Approval Modal */}
      {pendingApprovalCall && (
        <ToolApprovalModal
          toolCall={pendingApprovalCall}
          onApprove={handleToolApproval}
        />
      )}
    </div>
  );
}

export default App;