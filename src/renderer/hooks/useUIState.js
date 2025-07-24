import { useState, useCallback } from 'react';

export const useUIState = () => {
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(false);
  const [isSessionHistoryOpen, setIsSessionHistoryOpen] = useState(true);

  const toggleToolsPanel = useCallback(() => {
    setIsToolsPanelOpen(prev => !prev);
  }, []);

  const toggleSessionHistory = useCallback(() => {
    setIsSessionHistoryOpen(prev => !prev);
  }, []);

  const openToolsPanel = useCallback(() => {
    setIsToolsPanelOpen(true);
  }, []);

  const closeToolsPanel = useCallback(() => {
    setIsToolsPanelOpen(false);
  }, []);

  return {
    isToolsPanelOpen,
    isSessionHistoryOpen,
    toggleToolsPanel,
    toggleSessionHistory,
    openToolsPanel,
    closeToolsPanel,
    setIsSessionHistoryOpen
  };
};