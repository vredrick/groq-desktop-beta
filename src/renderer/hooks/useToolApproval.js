import { useState } from 'react';
import { getToolApprovalStatus, setToolApprovalStatus } from '../utils/toolApproval';

export const useToolApproval = () => {
  const [pendingApprovalCall, setPendingApprovalCall] = useState(null);
  const [pausedChatState, setPausedChatState] = useState(null);

  const checkToolApproval = (toolName) => {
    return getToolApprovalStatus(toolName);
  };

  const updateToolApproval = (toolName, status) => {
    setToolApprovalStatus(toolName, status);
  };

  const requestToolApproval = (toolCall, chatState) => {
    setPendingApprovalCall(toolCall);
    setPausedChatState(chatState);
  };

  const clearPendingApproval = () => {
    setPendingApprovalCall(null);
  };

  const clearPausedState = () => {
    setPausedChatState(null);
  };

  return {
    pendingApprovalCall,
    pausedChatState,
    checkToolApproval,
    updateToolApproval,
    requestToolApproval,
    clearPendingApproval,
    clearPausedState,
    setPausedChatState
  };
};