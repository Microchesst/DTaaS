// filepath: /workspaces/DTaaS/client/src/preview/route/digitaltwins/execute/pipelineChecks.ts
import { useDispatch } from 'react-redux';
import DigitalTwin, { formatName } from 'preview/util/digitalTwin';
import {
  updatePipelineStateOnCompletion,
  updateExecutionStateOnCompletion,
} from 'preview/route/digitaltwins/execute/pipelineUtils';
import { showSnackbar } from 'preview/store/snackbar.slice';
import { MAX_EXECUTION_TIME } from 'model/backend/gitlab/constants';
import { updateExecutionStatus } from 'preview/store/digitalTwin.slice';
import { fetchJobLogs } from './fetchJobLogs';

interface PipelineStatusParams {
  digitalTwin: DigitalTwin;
  executionId?: string;
  dispatch: ReturnType<typeof useDispatch>;
}

export const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const hasTimedOut = (startTime: number) =>
  Date.now() - startTime > MAX_EXECUTION_TIME;

export const handleTimeout = (
  digitalTwin: DigitalTwin,
  executionId: string | undefined,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  // Update execution status if we have an executionId
  if (executionId) {
    dispatch(
      updateExecutionStatus({
        assetName: digitalTwin.DTName,
        executionId,
        status: 'failed',
      }),
    );
  }

  dispatch(
    showSnackbar({
      message: `Execution timed out for ${formatName(digitalTwin.DTName)}`,
      severity: 'error',
    }),
  );
};

export const startPipelineStatusCheck = (params: PipelineStatusParams) => {
  const startTime = Date.now();
  checkParentPipelineStatus({ ...params, startTime });
};

export const checkParentPipelineStatus = async ({
  digitalTwin,
  executionId,
  dispatch,
  startTime,
}: PipelineStatusParams & {
  startTime: number;
}) => {
  // Find the execution to check
  let pipelineId: number | null = null;

  // Find the execution to check
  let execution = null;
  if (executionId) {
    execution = digitalTwin.executions?.find((e) => e.id === executionId);
    pipelineId = execution?.pipelineId || null;
  }

  // Fallback to the current pipelineId if no execution found
  if (!pipelineId) {
    pipelineId = digitalTwin.pipelineId;
  }

  if (!pipelineId) {
    // No pipeline ID found for execution
    return;
  }

  try {
    const pipelineStatus = await digitalTwin.gitlabInstance.getPipelineStatus(
      digitalTwin.gitlabInstance.projectId!,
      pipelineId,
    );

    if (pipelineStatus === 'success') {
      await checkChildPipelineStatus({
        digitalTwin,
        executionId,
        dispatch,
        startTime,
        parentPipelineId: pipelineId,
      });
    } else if (pipelineStatus === 'failed' || pipelineStatus === 'canceled') {
      // Passing the whole digitalTwin instance
      const jobLogs = await fetchJobLogs(digitalTwin, pipelineId);

      if (executionId) {
        // Update the specific execution
        updateExecutionStateOnCompletion(
          digitalTwin,
          executionId,
          jobLogs,
          pipelineStatus === 'canceled' ? 'canceled' : 'failed',
          dispatch,
        );

        // Show appropriate message
        dispatch(
          showSnackbar({
            message:
              pipelineStatus === 'canceled'
                ? `Execution was canceled for ${formatName(digitalTwin.DTName)}`
                : `Execution failed for ${formatName(digitalTwin.DTName)}`,
            severity: pipelineStatus === 'canceled' ? 'warning' : 'error',
          }),
        );
      }

      // For backward compatibility
      updatePipelineStateOnCompletion(
        digitalTwin,
        jobLogs,
        dispatch,
        executionId,
      );
    } else if (hasTimedOut(startTime)) {
      handleTimeout(digitalTwin, executionId, dispatch);
    } else {
      // Still running, schedule another check in a few seconds
      await delay(5000);
      checkParentPipelineStatus({
        digitalTwin,
        executionId,
        dispatch,
        startTime,
      });
    }
  } catch (error) {
    // Log the error but continue with retry
    // eslint-disable-next-line no-console
    console.error('Error checking pipeline status:', error);

    // If we can't check the status, let's schedule another attempt
    // Only if we haven't timed out yet
    if (!hasTimedOut(startTime)) {
      await delay(10000); // Longer delay on error
      checkParentPipelineStatus({
        digitalTwin,
        executionId,
        dispatch,
        startTime,
      });
    } else {
      handleTimeout(digitalTwin, executionId, dispatch);
    }
  }
};

export const handlePipelineCompletion = async (
  pipelineId: number,
  digitalTwin: DigitalTwin,
  executionId: string | undefined,
  dispatch: ReturnType<typeof useDispatch>,
  pipelineStatus: 'success' | 'failed',
) => {
  const jobLogs = await fetchJobLogs(digitalTwin, pipelineId);
  const status = pipelineStatus === 'success' ? 'completed' : 'failed';

  // Find the execution that matches the executionId or the pipelineId
  let execution = null;
  let targetExecutionId = executionId;

  if (targetExecutionId) {
    execution = digitalTwin.executions?.find((e) => e.id === targetExecutionId);
  }

  if (!execution && digitalTwin.executions?.length > 0) {
    // Try to find by pipeline ID if we couldn't find by executionId
    execution = digitalTwin.executions.find((e) => e.pipelineId === pipelineId);
    // If found by pipelineId, use that execution's ID
    if (execution) {
      targetExecutionId = execution.id;
    }
  }

  if (targetExecutionId) {
    // Update the specific execution with completion time
    dispatch(
      updateExecutionStatus({
        assetName: digitalTwin.DTName,
        executionId: targetExecutionId,
        status,
      }),
    );

    // Update job logs
    updateExecutionStateOnCompletion(
      digitalTwin,
      targetExecutionId,
      jobLogs,
      status,
      dispatch,
    );
  }

  // For backward compatibility
  updatePipelineStateOnCompletion(
    digitalTwin,
    jobLogs,
    dispatch,
    targetExecutionId,
  );

  if (pipelineStatus === 'failed') {
    dispatch(
      showSnackbar({
        message: `Execution failed for ${formatName(digitalTwin.DTName)}`,
        severity: 'error',
      }),
    );
  } else {
    dispatch(
      showSnackbar({
        message: `Execution completed successfully for ${formatName(
          digitalTwin.DTName,
        )}`,
        severity: 'success',
      }),
    );
  }
};

export const checkChildPipelineStatus = async ({
  digitalTwin,
  executionId,
  dispatch,
  startTime,
  parentPipelineId,
}: PipelineStatusParams & {
  startTime: number;
  parentPipelineId: number;
}) => {
  const pipelineId = parentPipelineId + 1;

  try {
    const pipelineStatus = await digitalTwin.gitlabInstance.getPipelineStatus(
      digitalTwin.gitlabInstance.projectId!,
      pipelineId,
    );

    if (pipelineStatus === 'success' || pipelineStatus === 'failed') {
      await handlePipelineCompletion(
        pipelineId,
        digitalTwin,
        executionId,
        dispatch,
        pipelineStatus,
      );
    } else if (hasTimedOut(startTime)) {
      handleTimeout(digitalTwin, executionId, dispatch);
    } else {
      await delay(5000);
      await checkChildPipelineStatus({
        digitalTwin,
        executionId,
        dispatch,
        startTime,
        parentPipelineId,
      });
    }
  } catch (error) {
    // Log the error but continue with retry
    // eslint-disable-next-line no-console
    console.error('Error checking child pipeline status:', error);

    // If we can't check the status, let's schedule another attempt
    // Only if we haven't timed out yet
    if (!hasTimedOut(startTime)) {
      await delay(10000); // Longer delay on error
      checkChildPipelineStatus({
        digitalTwin,
        executionId,
        dispatch,
        startTime,
        parentPipelineId,
      });
    } else {
      handleTimeout(digitalTwin, executionId, dispatch);
    }
  }
};
