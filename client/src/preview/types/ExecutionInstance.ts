// filepath: /workspaces/DTaaS/client/src/preview/types/ExecutionInstance.ts
import { JobLog } from 'preview/components/asset/StartStopButton';

export interface ExecutionInstance {
  id: string; // Unique identifier for this execution
  pipelineId: number | null; // GitLab pipeline ID
  startTime: number; // Timestamp when execution started
  completedTime?: number; // Timestamp when execution completed/failed/canceled
  jobLogs: JobLog[]; // Logs for this execution
  status: 'running' | 'completed' | 'failed' | 'canceled';
  name: string; // Display name for this execution (e.g., timestamp-based)
}
