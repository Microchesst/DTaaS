// filepath: /workspaces/DTaaS/client/src/preview/store/pipelineStatusMiddleware.ts
import { Middleware, AnyAction } from 'redux';
import { RootState } from 'store/store';
import { ExecutionInstance } from 'preview/types/ExecutionInstance';
import { checkParentPipelineStatus } from 'preview/route/digitaltwins/execute/pipelineChecks';

// Keep track of pipelines currently being checked to avoid duplicate checks
const ongoingPipelineChecks = new Set<string>();

// Type guard to check if an action has the expected payload structure
function isPipelineCheckAction(action: unknown): action is AnyAction & {
  payload: {
    digitalTwinName: string;
    executionId: string;
    pipelineId: number;
  };
} {
  if (!action || typeof action !== 'object' || action === null) {
    return false;
  }

  const typedAction = action as Record<string, unknown>;

  return (
    'type' in typedAction &&
    typedAction.type === 'digitalTwin/checkPipelineStatus' &&
    'payload' in typedAction &&
    typedAction.payload !== null &&
    typeof typedAction.payload === 'object' &&
    typedAction.payload !== null &&
    'digitalTwinName' in (typedAction.payload as object) &&
    'executionId' in (typedAction.payload as object) &&
    'pipelineId' in (typedAction.payload as object)
  );
}

/**
 * Middleware to handle pipeline status checks
 * This centralizes the logic for checking running pipeline statuses
 */
export const pipelineStatusMiddleware: Middleware =
  ({ dispatch, getState }) =>
  (next) =>
  (action) => {
    const result = next(action);

    // Handle pipeline status check requests
    if (isPipelineCheckAction(action)) {
      const { digitalTwinName, executionId, pipelineId } = action.payload;

      // Create a unique key for this pipeline check
      const checkKey = `${digitalTwinName}:${executionId}:${pipelineId}`;

      // Only start a new check if this pipeline isn't already being checked
      if (!ongoingPipelineChecks.has(checkKey)) {
        ongoingPipelineChecks.add(checkKey);

        const state = getState() as RootState;
        const digitalTwin = state.digitalTwin.digitalTwin[digitalTwinName];

        if (digitalTwin && pipelineId) {
          // We have a valid digital twin and pipeline ID, start checking the status
          const startTime = Date.now();

          // Start checking the status
          checkParentPipelineStatus({
            digitalTwin,
            executionId,
            dispatch,
            startTime,
          });

          // Set up a timeout to remove the checkKey eventually if the check doesn't complete
          setTimeout(
            () => {
              ongoingPipelineChecks.delete(checkKey);
            },
            60 * 60 * 1000,
          ); // 1 hour timeout as a safety measure
        } else {
          // If the check can't proceed, remove the key
          ongoingPipelineChecks.delete(checkKey);
        }
      }
    }

    // Check all running executions when explicitly requested
    if (
      typeof action === 'object' &&
      action !== null &&
      'type' in action &&
      action.type === 'digitalTwin/checkAllRunningExecutions'
    ) {
      const state = getState() as RootState;

      // Loop through all digital twins and find running executions
      Object.entries(state.digitalTwin.digitalTwin).forEach(([dtName, dt]) => {
        if (dt.executions && dt.executions.length > 0) {
          // Filter to get only running executions with pipeline IDs
          const runningExecutions = dt.executions.filter(
            (exec: ExecutionInstance) =>
              exec.status === 'running' && exec.pipelineId !== null,
          );

          // For each running execution, check its status
          runningExecutions.forEach((exec: ExecutionInstance) => {
            if (exec.pipelineId) {
              dispatch({
                type: 'digitalTwin/checkPipelineStatus',
                payload: {
                  digitalTwinName: dtName,
                  executionId: exec.id,
                  pipelineId: exec.pipelineId,
                },
              });
            }
          });
        }
      });
    }

    return result;
  };
