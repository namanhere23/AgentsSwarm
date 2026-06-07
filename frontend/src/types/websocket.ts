// STUB — Implemented by: workstream/0-architect
export type WebSocketEventType =
  | 'TASK_STARTED'
  | 'TASK_COMPLETED'
  | 'AGENT_THOUGHT'
  | 'APPROVAL_REQUESTED'
  | 'APPROVAL_GRANTED'
  | 'APPROVAL_REJECTED'
  | 'SWARM_STARTED'
  | 'SWARM_COMPLETED'
  | 'BRIEFING_READY';

export interface WebSocketEvent {
  type: WebSocketEventType;
  swarm_run_id: string;
  data: Record<string, unknown>;
}

export interface ApprovalRequestedData {
  approval_request_id: string;
  tool_name: string;
  proposed_payload: Record<string, unknown>;
  risk_level: 'low' | 'medium' | 'high';
}
