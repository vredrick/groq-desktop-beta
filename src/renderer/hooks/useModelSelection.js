// React hooks
import { useState, useEffect } from 'react';

export const useModelSelection = () => {
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [modelConfigs, setModelConfigs] = useState({});
  const [models, setModels] = useState([]);
  const [visionSupported, setVisionSupported] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Load model configurations and initial model selection
  useEffect(() => {
    const loadModelData = async () => {
      try {
        // Load settings first to get the provider
        const settings = await window.electron.getSettings();
        
        // Load model configurations for the current provider
        const configs = await window.electron.getModelConfigs(settings?.provider);
        console.log(`[useModelSelection] Raw configs received:`, configs);
        setModelConfigs(configs);
        const availableModels = Object.keys(configs).filter(key => key !== 'default');
        setModels(availableModels);
        
        console.log(`[useModelSelection] Loaded models for provider ${settings?.provider}:`, availableModels);
        console.log(`[useModelSelection] Full model list:`, Object.keys(configs));
        let effectiveModel = availableModels.length > 0 ? availableModels[0] : 'default';

        if (settings && settings.model) {
          // Ensure the saved model is still valid against the loaded configs
          if (configs[settings.model]) {
            effectiveModel = settings.model;
          } else {
            console.warn(`Saved model "${settings.model}" not found in loaded configs. Falling back to ${effectiveModel}.`);
          }
        } else if (availableModels.length > 0) {
          effectiveModel = availableModels[0];
        }

        setSelectedModel(effectiveModel);
        setCurrentProvider(settings?.provider || 'groq');
        setInitialLoadComplete(true);
      } catch (error) {
        console.error('Error loading model data:', error);
        setInitialLoadComplete(true);
      }
    };

    loadModelData();
  }, []);

  // Track current provider to detect changes
  const [currentProvider, setCurrentProvider] = useState(null);
  
  // Listen for settings changes to reload models when provider changes
  useEffect(() => {
    const unsubscribe = window.electron.onSettingsChanged(async (settings) => {
      console.log('[useModelSelection] Settings changed event received');
      console.log('[useModelSelection] Settings provider:', settings.provider);
      console.log('[useModelSelection] Settings model:', settings.model);
      console.log('[useModelSelection] Current provider:', currentProvider);
      
      // Only reload models if provider actually changed
      if (currentProvider !== null && settings.provider !== currentProvider) {
        console.log('[useModelSelection] Provider changed from', currentProvider, 'to', settings.provider);
        
        // Reload models when provider changes - pass the provider explicitly
        const configs = await window.electron.getModelConfigs(settings.provider);
        console.log(`[useModelSelection] Provider changed - raw configs:`, configs);
        setModelConfigs(configs);
        const availableModels = Object.keys(configs).filter(key => key !== 'default');
        setModels(availableModels);
        
        console.log(`[useModelSelection] Provider changed - loaded ${availableModels.length} models for ${settings.provider}:`, availableModels);
        
        // When switching providers, try to use the saved model or default to first available
        let effectiveModel = availableModels.length > 0 ? availableModels[0] : 'default';
        
        if (settings.model && configs[settings.model]) {
          // Use the saved model if it exists for this provider
          effectiveModel = settings.model;
        }
        
        setSelectedModel(effectiveModel);
        console.log('[useModelSelection] Provider changed - set model to:', effectiveModel);
      }
      
      // Update current provider
      setCurrentProvider(settings.provider);
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentProvider]);

  // Save model selection to settings when it changes
  useEffect(() => {
    // Prevent saving during initial setup
    if (!initialLoadComplete) {
      return;
    }

    // Also ensure models list isn't empty and selectedModel is valid
    if (models.length === 0 || !selectedModel) {
      console.warn("Skipping model save: Models not loaded or no model selected.");
      return;
    }

    const saveModelSelection = async () => {
      try {
        console.log(`[useModelSelection] Attempting to save selected model: ${selectedModel}`);
        const settings = await window.electron.getSettings();
        console.log(`[useModelSelection] Current settings model: ${settings.model}`);
        // Check if the model actually changed before saving
        if (settings.model !== selectedModel) {
          console.log(`[useModelSelection] Model changed - saving new selection: ${selectedModel}`);
          const newSettings = { ...settings, model: selectedModel };
          console.log(`[useModelSelection] New settings to save:`, newSettings);
          await window.electron.saveSettings(newSettings);
          console.log(`[useModelSelection] Model saved successfully`);
        } else {
          console.log(`[useModelSelection] Model unchanged, skipping save`);
        }
      } catch (error) {
        console.error('[useModelSelection] Error saving model selection:', error);
      }
    };

    saveModelSelection();
  }, [selectedModel, initialLoadComplete, models]);

  // Update vision support when selectedModel or modelConfigs changes
  useEffect(() => {
    if (modelConfigs && selectedModel && modelConfigs[selectedModel]) {
      const capabilities = modelConfigs[selectedModel] || modelConfigs['default'];
      setVisionSupported(capabilities.vision_supported);
    } else {
      setVisionSupported(false);
    }
  }, [selectedModel, modelConfigs]);

  return {
    selectedModel,
    setSelectedModel,
    models,
    visionSupported,
    modelConfigs
  };
};