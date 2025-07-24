import React from 'react';

function BottomSections({ handleResetToolApprovals, settings }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
      <ToolCallPermissions handleResetToolApprovals={handleResetToolApprovals} />
      <CurrentConfiguration settings={settings} />
    </div>
  );
}

function ToolCallPermissions({ handleResetToolApprovals }) {
  return (
    <div className="bg-surface-secondary rounded border border-border-primary p-3">
      <h3 className="text-sm font-semibold mb-1 text-text-primary">Tool Call Permissions</h3>
      <p className="text-xs text-text-secondary mb-2">
        Reset all saved permissions for tool calls.
      </p>
      <button
        onClick={handleResetToolApprovals}
        className="px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-xs"
      >
        Reset Tool Approvals
      </button>
    </div>
  );
}

function CurrentConfiguration({ settings }) {
  return (
    <div className="bg-surface-secondary rounded border border-border-primary p-3">
      <h3 className="text-sm font-semibold mb-1 text-text-primary">Current Configuration</h3>
      <pre 
        className="p-2 rounded overflow-auto text-text-secondary bg-bg-tertiary border border-border-primary text-xs max-h-24" 
      >
        {JSON.stringify(settings, null, 2)}
      </pre>
    </div>
  );
}

export default BottomSections;