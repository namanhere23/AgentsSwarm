// STUB-FILL — Implemented by: workstream/2c-crew-registry-ingestion
export interface TaskTrace {
  id: string;
  agent: string;
  thought: string;
  action: string;
  observation: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface SwarmRun {
  swarm_run_id: string;
  crew_id: string;
  objective: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  created_at: string;
  completed_at: string | null;
  task_count: number;
  tasks_completed: number;
  output_summary: string | null;
  briefing_url: string | null;
}
