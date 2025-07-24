// Validation utilities for settings

export const validateUrl = (url) => {
  if (!url || !url.trim()) {
    return { isValid: false, error: 'URL is required' };
  }
  
  try {
    new URL(url);
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Invalid URL format' };
  }
};

export const validateApiKey = (key, fieldName = 'API Key') => {
  if (!key || !key.trim()) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  if (key.length < 10) {
    return { isValid: false, error: `${fieldName} seems too short` };
  }
  
  return { isValid: true };
};

export const validateServerId = (id) => {
  if (!id || !id.trim()) {
    return { isValid: false, error: 'Server ID is required' };
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return { isValid: false, error: 'Server ID can only contain letters, numbers, hyphens, and underscores' };
  }
  
  return { isValid: true };
};

export const validateCommand = (command) => {
  if (!command || !command.trim()) {
    return { isValid: false, error: 'Command is required' };
  }
  
  return { isValid: true };
};

export const validateTemperature = (temp) => {
  const value = parseFloat(temp);
  if (isNaN(value) || value < 0 || value > 1) {
    return { isValid: false, error: 'Temperature must be between 0 and 1' };
  }
  return { isValid: true };
};

export const validateTopP = (topP) => {
  const value = parseFloat(topP);
  if (isNaN(value) || value < 0 || value > 1) {
    return { isValid: false, error: 'Top P must be between 0 and 1' };
  }
  return { isValid: true };
};

export const validateToolOutputLimit = (limit) => {
  const value = parseInt(limit);
  if (isNaN(value) || value < 1000 || value > 50000) {
    return { isValid: false, error: 'Tool output limit must be between 1000 and 50000' };
  }
  return { isValid: true };
};