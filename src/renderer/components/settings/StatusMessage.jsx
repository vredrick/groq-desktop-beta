import React from 'react';

function StatusMessage({ isSaving, saveStatus }) {
  const getStatusMessage = () => {
    if (isSaving) return 'Saving...';
    return saveStatus?.message || '';
  };

  const getStatusClasses = () => {
    if (saveStatus?.type === 'error') {
      return 'bg-red-900/20 border border-red-500/50 text-red-300';
    }
    if (saveStatus?.type === 'info') {
      return 'bg-blue-900/20 border border-blue-500/50 text-blue-300';
    }
    return 'bg-green-900/20 border border-green-500/50 text-green-300';
  };

  if (!isSaving && !saveStatus) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 min-h-6 pointer-events-none">
      <div
        className={`px-4 py-2 rounded-lg text-sm shadow-lg transition-opacity duration-300 pointer-events-auto ${getStatusClasses()}`}
      >
        {getStatusMessage()}
      </div>
    </div>
  );
}

export default StatusMessage;