import { getToolApprovalStatus } from '../utils/toolApproval';

// Chat flow states
export const ChatFlowStates = {
  IDLE: 'IDLE',
  STREAMING: 'STREAMING',
  PROCESSING_TOOLS: 'PROCESSING_TOOLS',
  AWAITING_APPROVAL: 'AWAITING_APPROVAL',
  EXECUTING_TOOL: 'EXECUTING_TOOL',
  COMPLETED: 'COMPLETED',
  ERROR: 'ERROR'
};

// Events that trigger state transitions
export const ChatFlowEvents = {
  SEND_MESSAGE: 'SEND_MESSAGE',
  STREAM_START: 'STREAM_START',
  STREAM_COMPLETE: 'STREAM_COMPLETE',
  STREAM_ERROR: 'STREAM_ERROR',
  TOOLS_FOUND: 'TOOLS_FOUND',
  TOOL_AUTO_APPROVED: 'TOOL_AUTO_APPROVED',
  TOOL_NEEDS_APPROVAL: 'TOOL_NEEDS_APPROVAL',
  TOOL_APPROVED: 'TOOL_APPROVED',
  TOOL_DENIED: 'TOOL_DENIED',
  TOOL_EXECUTED: 'TOOL_EXECUTED',
  TOOL_ERROR: 'TOOL_ERROR',
  ALL_TOOLS_PROCESSED: 'ALL_TOOLS_PROCESSED',
  CONTINUE_CONVERSATION: 'CONTINUE_CONVERSATION',
  STOP: 'STOP'
};

export class ChatFlowStateMachine {
  constructor(callbacks) {
    this.state = ChatFlowStates.IDLE;
    this.callbacks = callbacks;
    this.currentContext = null;
  }

  // Get current state
  getState() {
    return this.state;
  }

  // Transition to a new state based on an event
  transition(event, context = {}) {
    const oldState = this.state;
    const newState = this.getNextState(event);
    
    if (newState !== oldState) {
      console.log(`ChatFlow: ${oldState} -> ${newState} (${event})`);
      this.state = newState;
      this.currentContext = { ...this.currentContext, ...context };
      
      // Execute state entry actions
      this.onStateEntry(newState, context);
    }
    
    return newState;
  }

  // Determine next state based on current state and event
  getNextState(event) {
    const transitions = {
      [ChatFlowStates.IDLE]: {
        [ChatFlowEvents.SEND_MESSAGE]: ChatFlowStates.STREAMING,
        [ChatFlowEvents.STOP]: ChatFlowStates.IDLE
      },
      [ChatFlowStates.STREAMING]: {
        [ChatFlowEvents.STREAM_COMPLETE]: ChatFlowStates.PROCESSING_TOOLS,
        [ChatFlowEvents.STREAM_ERROR]: ChatFlowStates.ERROR,
        [ChatFlowEvents.STOP]: ChatFlowStates.IDLE
      },
      [ChatFlowStates.PROCESSING_TOOLS]: {
        [ChatFlowEvents.TOOL_AUTO_APPROVED]: ChatFlowStates.EXECUTING_TOOL,
        [ChatFlowEvents.TOOL_NEEDS_APPROVAL]: ChatFlowStates.AWAITING_APPROVAL,
        [ChatFlowEvents.ALL_TOOLS_PROCESSED]: ChatFlowStates.COMPLETED,
        [ChatFlowEvents.CONTINUE_CONVERSATION]: ChatFlowStates.STREAMING
      },
      [ChatFlowStates.AWAITING_APPROVAL]: {
        [ChatFlowEvents.TOOL_APPROVED]: ChatFlowStates.EXECUTING_TOOL,
        [ChatFlowEvents.TOOL_DENIED]: ChatFlowStates.PROCESSING_TOOLS,
        [ChatFlowEvents.STOP]: ChatFlowStates.IDLE
      },
      [ChatFlowStates.EXECUTING_TOOL]: {
        [ChatFlowEvents.TOOL_EXECUTED]: ChatFlowStates.PROCESSING_TOOLS,
        [ChatFlowEvents.TOOL_ERROR]: ChatFlowStates.PROCESSING_TOOLS
      },
      [ChatFlowStates.COMPLETED]: {
        [ChatFlowEvents.CONTINUE_CONVERSATION]: ChatFlowStates.STREAMING,
        [ChatFlowEvents.SEND_MESSAGE]: ChatFlowStates.STREAMING
      },
      [ChatFlowStates.ERROR]: {
        [ChatFlowEvents.SEND_MESSAGE]: ChatFlowStates.STREAMING
      }
    };

    const stateTransitions = transitions[this.state];
    return stateTransitions?.[event] || this.state;
  }

  // Execute actions when entering a new state
  onStateEntry(state, context) {
    switch (state) {
      case ChatFlowStates.STREAMING:
        this.callbacks.onStartStreaming?.(context);
        break;
      case ChatFlowStates.PROCESSING_TOOLS:
        this.processNextTool(context);
        break;
      case ChatFlowStates.AWAITING_APPROVAL:
        this.callbacks.onAwaitingApproval?.(context);
        break;
      case ChatFlowStates.EXECUTING_TOOL:
        this.callbacks.onExecuteTool?.(context);
        break;
      case ChatFlowStates.COMPLETED:
        this.callbacks.onCompleted?.(context);
        break;
      case ChatFlowStates.ERROR:
        this.callbacks.onError?.(context);
        break;
    }
  }

  // Process the next tool in the queue
  processNextTool(context) {
    const { toolQueue = [], processedTools = [] } = this.currentContext;
    
    if (toolQueue.length === 0) {
      // All tools processed
      this.transition(ChatFlowEvents.ALL_TOOLS_PROCESSED, { processedTools });
      return;
    }

    const nextTool = toolQueue[0];
    const remainingTools = toolQueue.slice(1);
    const approvalStatus = getToolApprovalStatus(nextTool.function.name);

    this.currentContext = {
      ...this.currentContext,
      currentTool: nextTool,
      toolQueue: remainingTools
    };

    if (approvalStatus === 'always' || approvalStatus === 'yolo') {
      this.transition(ChatFlowEvents.TOOL_AUTO_APPROVED, { tool: nextTool });
    } else {
      this.transition(ChatFlowEvents.TOOL_NEEDS_APPROVAL, { tool: nextTool });
    }
  }

  // Handle tool execution result
  handleToolResult(result, error = null) {
    const { currentTool, processedTools = [] } = this.currentContext;
    
    this.currentContext.processedTools = [
      ...processedTools,
      { tool: currentTool, result, error }
    ];

    if (error) {
      this.transition(ChatFlowEvents.TOOL_ERROR, { error });
    } else {
      this.transition(ChatFlowEvents.TOOL_EXECUTED, { result });
    }
  }

  // Handle tool approval/denial
  handleToolApproval(approved, tool) {
    if (approved) {
      this.transition(ChatFlowEvents.TOOL_APPROVED, { tool });
    } else {
      // Add denied tool to processed list
      const { processedTools = [] } = this.currentContext;
      this.currentContext.processedTools = [
        ...processedTools,
        { 
          tool, 
          result: { 
            role: 'tool', 
            content: JSON.stringify({ error: 'Tool execution denied by user.' }),
            tool_call_id: tool.id
          },
          error: null 
        }
      ];
      this.transition(ChatFlowEvents.TOOL_DENIED, { tool });
    }
  }

  // Reset state machine
  reset() {
    this.state = ChatFlowStates.IDLE;
    this.currentContext = null;
  }
}