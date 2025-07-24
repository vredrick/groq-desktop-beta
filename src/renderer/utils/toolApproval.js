// LocalStorage keys
const TOOL_APPROVAL_PREFIX = 'tool_approval_';
const YOLO_MODE_KEY = 'tool_approval_yolo_mode';

// Get the approval status for a specific tool
export const getToolApprovalStatus = (toolName) => {
  try {
    const yoloMode = localStorage.getItem(YOLO_MODE_KEY);
    if (yoloMode === 'true') {
      return 'yolo';
    }
    const toolStatus = localStorage.getItem(`${TOOL_APPROVAL_PREFIX}${toolName}`);
    if (toolStatus === 'always') {
      return 'always';
    }
    // Default: prompt the user
    return 'prompt';
  } catch (error) {
    console.error("Error reading tool approval status from localStorage:", error);
    return 'prompt'; // Fail safe: prompt user if localStorage fails
  }
};

// Set the approval status for a specific tool
export const setToolApprovalStatus = (toolName, status) => {
  try {
    if (status === 'yolo') {
      localStorage.setItem(YOLO_MODE_KEY, 'true');
      // Optionally clear specific tool settings when YOLO is enabled
      // Object.keys(localStorage).forEach(key => {
      //   if (key.startsWith(TOOL_APPROVAL_PREFIX)) {
      //     localStorage.removeItem(key);
      //   }
      // });
    } else if (status === 'always') {
      localStorage.setItem(`${TOOL_APPROVAL_PREFIX}${toolName}`, 'always');
      // Ensure YOLO mode is off if a specific tool is set to always
      localStorage.removeItem(YOLO_MODE_KEY);
    } else if (status === 'once') {
      // 'once' doesn't change persistent storage, just allows current execution
      // Ensure YOLO mode is off if 'once' is chosen for a specific tool
      localStorage.removeItem(YOLO_MODE_KEY);
    } else if (status === 'deny') {
      // 'deny' also doesn't change persistent storage by default.
      // Could potentially add a 'never' status if needed.
      // Ensure YOLO mode is off if 'deny' is chosen
      localStorage.removeItem(YOLO_MODE_KEY);
    }
  } catch (error) {
    console.error("Error writing tool approval status to localStorage:", error);
  }
};