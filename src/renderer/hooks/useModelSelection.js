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
        // Load model configurations first
        const configs = await window.electron.getModelConfigs();
        setModelConfigs(configs);
        const availableModels = Object.keys(configs).filter(key => key !== 'default');
        setModels(availableModels);

        // Load settings
        const settings = await window.electron.getSettings();
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
        setInitialLoadComplete(true);
      } catch (error) {
        console.error('Error loading model data:', error);
        setInitialLoadComplete(true);
      }
    };

    loadModelData();
  }, []);

  // Listen for settings changes to reload models when provider changes
  useEffect(() => {
    const unsubscribe = window.electron.onSettingsChanged(async (settings) => {
      // Reload models when provider changes
      const configs = await window.electron.getModelConfigs();
      setModelConfigs(configs);
      const availableModels = Object.keys(configs).filter(key => key !== 'default');
      setModels(availableModels);
      
      // Select appropriate model for the new provider
      let effectiveModel = availableModels.length > 0 ? availableModels[0] : 'default';
      if (settings.model && configs[settings.model]) {
        effectiveModel = settings.model;
      }
      setSelectedModel(effectiveModel);
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

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
        console.log(`Attempting to save selected model: ${selectedModel}`);
        const settings = await window.electron.getSettings();
        // Check if the model actually changed before saving
        if (settings.model !== selectedModel) {
          console.log(`Saving new model selection: ${selectedModel}`);
          await window.electron.saveSettings({ ...settings, model: selectedModel });
        }
      } catch (error) {
        console.error('Error saving model selection:', error);
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