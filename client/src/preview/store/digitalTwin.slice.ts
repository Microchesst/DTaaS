import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import DigitalTwin from 'preview/util/digitalTwin';
import { JobLog } from 'preview/components/asset/StartStopButton';
import { RootState } from 'store/store';

// Interface for execution instances
export interface ExecutionInstance {
  id: string; // Unique identifier for this execution
  pipelineId: number | null; // GitLab pipeline ID
  startTime: number; // Timestamp when execution started
  jobLogs: JobLog[]; // Logs for this execution
  status: 'running' | 'completed' | 'failed' | 'canceled';
  name: string; // Display name for this execution (e.g., timestamp-based)
}

interface DigitalTwinState {
  [key: string]: DigitalTwin;
}

interface DigitalTwinSliceState {
  digitalTwin: DigitalTwinState;
  shouldFetchDigitalTwins: boolean;
}

const initialState: DigitalTwinSliceState = {
  digitalTwin: {},
  shouldFetchDigitalTwins: true,
};

const digitalTwinSlice = createSlice({
  name: 'digitalTwin',
  initialState,
  reducers: {
    setDigitalTwin: (
      state,
      action: PayloadAction<{ assetName: string; digitalTwin: DigitalTwin }>,
    ) => {
      state.digitalTwin[action.payload.assetName] = action.payload.digitalTwin;
    },
    setJobLogs: (
      state,
      action: PayloadAction<{ assetName: string; jobLogs: JobLog[] }>,
    ) => {
      const digitalTwin = state.digitalTwin[action.payload.assetName];
      if (digitalTwin) {
        digitalTwin.jobLogs = action.payload.jobLogs;
      }
    },
    setPipelineCompleted: (
      state,
      action: PayloadAction<{ assetName: string; pipelineCompleted: boolean }>,
    ) => {
      const digitalTwin = state.digitalTwin[action.payload.assetName];
      if (digitalTwin) {
        digitalTwin.pipelineCompleted = action.payload.pipelineCompleted;
      }
    },
    setPipelineLoading: (
      state,
      action: PayloadAction<{ assetName: string; pipelineLoading: boolean }>,
    ) => {
      const digitalTwin = state.digitalTwin[action.payload.assetName];
      if (digitalTwin) {
        digitalTwin.pipelineLoading = action.payload.pipelineLoading;
      }
    },
    updateDescription: (
      state,
      action: PayloadAction<{ assetName: string; description: string }>,
    ) => {
      const digitalTwin = state.digitalTwin[action.payload.assetName];
      if (digitalTwin) {
        digitalTwin.description = action.payload.description;
      }
    },
    setShouldFetchDigitalTwins: (state, action: PayloadAction<boolean>) => {
      state.shouldFetchDigitalTwins = action.payload;
    },
    // New reducers for executions
    addExecution: (
      state,
      action: PayloadAction<{
        assetName: string;
        execution: ExecutionInstance;
      }>,
    ) => {
      const digitalTwin = state.digitalTwin[action.payload.assetName];
      if (digitalTwin) {
        if (!digitalTwin.executions) {
          digitalTwin.executions = [];
        }

        // Check if an execution with this ID already exists
        const existingIndex = digitalTwin.executions.findIndex(
          (exe) => exe.id === action.payload.execution.id,
        );

        if (existingIndex >= 0) {
          // Replace the existing execution with the updated one
          digitalTwin.executions[existingIndex] = action.payload.execution;
        } else {
          // Add as a new execution
          digitalTwin.executions.push(action.payload.execution);
        }

        digitalTwin.currentExecutionId = action.payload.execution.id;
      }
    },
    updateExecutionStatus: (
      state,
      action: PayloadAction<{
        assetName: string;
        executionId: string;
        status: 'running' | 'completed' | 'failed' | 'canceled';
        pipelineId?: number | null;
      }>,
    ) => {
      const digitalTwin = state.digitalTwin[action.payload.assetName];
      if (digitalTwin && digitalTwin.executions) {
        const execution = digitalTwin.executions.find(
          (e) => e.id === action.payload.executionId,
        );
        if (execution) {
          execution.status = action.payload.status;

          // Update pipelineId if provided
          if (action.payload.pipelineId !== undefined) {
            execution.pipelineId = action.payload.pipelineId;
          }

          // Update timestamp for completed, failed, or canceled executions
          if (
            action.payload.status === 'completed' ||
            action.payload.status === 'failed' ||
            action.payload.status === 'canceled'
          ) {
            // Add completedTime using type assertion
            (execution as unknown as { completedTime: number }).completedTime =
              Date.now();
          }
        } else if (action.payload.executionId && action.payload.pipelineId) {
          // If we can't find the execution but have a valid executionId, we should
          // consider creating a new execution record
          const newExecution: ExecutionInstance = {
            id: action.payload.executionId,
            pipelineId: action.payload.pipelineId,
            startTime: Date.now(),
            jobLogs: [],
            status: action.payload.status,
            name: `Execution ${new Date().toLocaleString()}`,
          };

          if (!digitalTwin.executions) {
            digitalTwin.executions = [];
          }

          digitalTwin.executions.push(newExecution);
          digitalTwin.currentExecutionId = action.payload.executionId;
        }
      }
    },
    setExecutionLogs: (
      state,
      action: PayloadAction<{
        assetName: string;
        executionId: string;
        jobLogs: JobLog[];
      }>,
    ) => {
      const digitalTwin = state.digitalTwin[action.payload.assetName];
      if (digitalTwin && digitalTwin.executions) {
        const execution = digitalTwin.executions.find(
          (e) => e.id === action.payload.executionId,
        );
        if (execution) {
          execution.jobLogs = action.payload.jobLogs;
        }
      }
    },
    setCurrentExecution: (
      state,
      action: PayloadAction<{
        assetName: string;
        executionId: string;
      }>,
    ) => {
      const digitalTwin = state.digitalTwin[action.payload.assetName];
      if (digitalTwin) {
        digitalTwin.currentExecutionId = action.payload.executionId;
      }
    },
    removeExecution: (
      state,
      action: PayloadAction<{
        assetName: string;
        executionId: string;
      }>,
    ) => {
      const digitalTwin = state.digitalTwin[action.payload.assetName];
      if (digitalTwin && digitalTwin.executions) {
        digitalTwin.executions = digitalTwin.executions.filter(
          (e) => e.id !== action.payload.executionId,
        );
        if (digitalTwin.currentExecutionId === action.payload.executionId) {
          digitalTwin.currentExecutionId =
            digitalTwin.executions.length > 0
              ? digitalTwin.executions[0].id
              : null;
        }
      }
    },
  },
});

export const selectDigitalTwinByName = (name: string) => (state: RootState) =>
  state.digitalTwin.digitalTwin[name];

export const selectShouldFetchDigitalTwins = (state: RootState) =>
  state.digitalTwin.shouldFetchDigitalTwins;

export const {
  setDigitalTwin,
  setJobLogs,
  setPipelineCompleted,
  setPipelineLoading,
  updateDescription,
  setShouldFetchDigitalTwins,
  addExecution,
  updateExecutionStatus,
  setExecutionLogs,
  setCurrentExecution,
  removeExecution,
} = digitalTwinSlice.actions;

export default digitalTwinSlice.reducer;
