import React, { useState, useRef, useEffect } from 'react';

function ModelDropdown({ selectedModel, onModelChange, models = [], modelConfigs = {}, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ bottom: 0, right: 0 });
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens and calculate position
  useEffect(() => {
    if (isOpen) {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
      
      // Calculate dropdown position based on trigger button
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setDropdownPosition({
          bottom: window.innerHeight - rect.top + 8,
          right: window.innerWidth - rect.right
        });
      }
    }
  }, [isOpen]);

  // Filter models based on search term
  const filteredModels = models.filter(model => {
    const displayName = modelConfigs[model]?.display_name || model;
    return displayName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleModelSelect = (model) => {
    onModelChange(model);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedDisplayName = modelConfigs[selectedModel]?.display_name || selectedModel;

  return (
    <div className="model-dropdown-container" ref={dropdownRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`model-dropdown-trigger ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className="model-dropdown-label">{selectedDisplayName}</span>
        <svg 
          className={`model-dropdown-chevron ${isOpen ? 'open' : ''}`} 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="model-dropdown-menu"
          style={{
            bottom: `${dropdownPosition.bottom}px`,
            right: `${dropdownPosition.right}px`
          }}
        >
          <div className="model-dropdown-search">
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search models..."
              className="model-dropdown-search-input"
            />
          </div>
          <div className="model-dropdown-list">
            {filteredModels.length > 0 ? (
              filteredModels.map((model, index) => {
                const displayName = modelConfigs[model]?.display_name || model;
                const isSelected = model === selectedModel;
                
                return (
                  <button
                    key={`${model}-${index}`}
                    className={`model-dropdown-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleModelSelect(model)}
                  >
                    <span className="model-dropdown-item-name">{displayName}</span>
                    {isSelected && (
                      <svg 
                        className="model-dropdown-check" 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="model-dropdown-empty">No models found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ModelDropdown;