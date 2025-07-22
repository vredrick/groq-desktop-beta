import React, { useState, useRef, useEffect } from 'react';

function ChatInput({ onSendMessage, loading = false, visionSupported = false, selectedModel, onModelChange, models = [], onOpenTools, isToolsOpen = false }) {
  const [message, setMessage] = useState('');
  const [images, setImages] = useState([]); // State for selected images
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null); // Ref for file input
  const prevLoadingRef = useRef(loading);

  // Function to handle image selection
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const remainingSlots = 5 - images.length;

    if (files.length > remainingSlots) {
      alert(`You can only add ${remainingSlots > 0 ? remainingSlots : 'no more'} images (max 5).`);
      // Optionally, only take the allowed number of files
      // files = files.slice(0, remainingSlots);
    }

    const imagePromises = files.slice(0, remainingSlots).map(file => {
      return new Promise((resolve, reject) => {
        // Basic validation (optional: check file type, size)
        if (!file.type.startsWith('image/')) {
          console.warn(`Skipping non-image file: ${file.name}`);
          return resolve(null); // Resolve with null to filter out later
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          // Store base64 string and file name/type for display
          resolve({ 
            base64: reader.result, // Includes data:image/jpeg;base64,... prefix
            name: file.name,
            type: file.type 
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises)
      .then(newImages => {
        const validImages = newImages.filter(img => img !== null);
        setImages(prev => [...prev, ...validImages]);
        // Reset file input value to allow selecting the same file again
        if (fileInputRef.current) fileInputRef.current.value = '';
      })
      .catch(error => {
        console.error("Error reading image files:", error);
        alert("Error processing images.");
        if (fileInputRef.current) fileInputRef.current.value = '';
      });
  };

  // Function to remove an image
  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Focus the textarea after component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Focus the textarea when loading changes from true to false (completion finished)
  useEffect(() => {
    // Check if loading just changed from true to false
    if (prevLoadingRef.current && !loading) {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
    // Update the ref with current loading state
    prevLoadingRef.current = loading;
  }, [loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const textContent = message.trim();
    const hasText = textContent.length > 0;
    const hasImages = images.length > 0;

    if ((hasText || hasImages) && !loading) {
      let contentToSend;
      if (hasImages) {
        // Format content as array with text and image parts
        contentToSend = [
          // Add text part only if there is text
          ...(hasText ? [{ type: 'text', text: textContent }] : []),
          // Add image parts
          ...images.map(img => ({
            type: 'image_url',
            image_url: { url: img.base64 } // Send base64 data URL
          }))
        ];
      } else {
        // If no images, send only the text string
        contentToSend = [{ type: 'text', text: textContent }]; // Send as array even for text only
      }

      onSendMessage(contentToSend);
      setMessage('');
      setImages([]); // Clear images after sending
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="chat-input-container">
      <form onSubmit={handleSubmit} className="chat-input-form">
        {/* Image Previews Area */}
        {images.length > 0 && (
          <div className="attached-images-preview">
            {images.map((img, index) => (
              <div key={index} className="image-preview-item">
                <img 
                  src={img.base64} 
                  alt={`Preview ${index + 1}`} 
                  className="image-preview"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="image-remove-button"
                  aria-label={`Remove image ${index + 1}`}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="input-field-wrapper">
          {/* Text Area */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reply to Groq..."
            className="chat-input-field"
            rows={1}
            disabled={loading}
          />
          
          {/* Bottom controls */}
          <div className="input-controls">
            {/* Left side actions */}
            <div className="left-controls">
              {/* Attachment Button */}
              {visionSupported && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="control-button"
                  title="Attach files"
                  disabled={loading || images.length >= 5}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M2 12h20" />
                  </svg>
                </button>
              )}
              {/* Tools/MCP Button */}
              <button
                type="button"
                className={`control-button ${isToolsOpen ? 'active' : ''}`}
                title="Tools and integrations"
                disabled={loading}
                onClick={onOpenTools}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                disabled={loading || images.length >= 5}
              />
            </div>

            {/* Right side actions */}
            <div className="right-controls">
              {/* Model Selector */}
              {models.length > 0 && (
                <div className="model-selector-wrapper">
                  <select
                    value={selectedModel}
                    onChange={(e) => onModelChange(e.target.value)}
                    className="model-selector-dropdown"
                    disabled={loading}
                  >
                    {models.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  <svg className="model-selector-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              )}
              
              {/* Send Button */}
              <button
                type="submit"
                className="send-button"
                disabled={loading || (!message.trim() && images.length === 0)}
                title="Send message"
              >
                {loading ? (
                  <div className="loading-spinner w-4 h-4"></div>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default ChatInput; 