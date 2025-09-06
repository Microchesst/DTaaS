// filepath: /workspaces/DTaaS/client/src/preview/route/digitaltwins/execute/pipelineUtils.ts
import DigitalTwin, { formatName } from 'preview/util/digitalTwin';
import {
  setJobLogs,
  setPipelineCompleted,
  setPipelineLoading,
  setExecutionLogs,
  updateExecutionStatus,
} from 'preview/store/digitalTwin.slice';
import { useDispatch } from 'react-redux';
import { showSnackbar } from 'preview/store/snackbar.slice';

/**
 * Start a pipeline execution and show relevant notifications
 */
export const startPipeline = async (
  digitalTwin: DigitalTwin,
  dispatch: ReturnType<typeof useDispatch>,
): Promise<number | null> => {
  const pipelineId = await digitalTwin.execute();
  const executionStatusMessage =
    digitalTwin.lastExecutionStatus === 'success'
      ? `Execution started successfully for ${formatName(digitalTwin.DTName)}. Wait until completion for the logs...`
      : `Execution ${digitalTwin.lastExecutionStatus} for ${formatName(digitalTwin.DTName)}`;

  dispatch(
    showSnackbar({
      message: executionStatusMessage,
      severity:
        digitalTwin.lastExecutionStatus === 'success' ? 'success' : 'error',
    }),
  );

  return pipelineId;
};

/**
 * Update pipeline state in Redux store
 */
export const updatePipelineState = (
  digitalTwin: DigitalTwin,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  dispatch(
    setPipelineCompleted({
      assetName: digitalTwin.DTName,
      pipelineCompleted: false,
    }),
  );
  dispatch(
    setPipelineLoading({
      assetName: digitalTwin.DTName,
      pipelineLoading: true,
    }),
  );
};

/**
 * Update execution state when completed
 */
export const updateExecutionStateOnCompletion = (
  digitalTwin: DigitalTwin,
  executionId: string,
  jobLogs: { jobName: string; log: string }[],
  status: 'completed' | 'failed' | 'canceled',
  dispatch: ReturnType<typeof useDispatch>,
) => {
  // Update the execution with status, logs, and completion time
  dispatch(
    updateExecutionStatus({
      assetName: digitalTwin.DTName,
      executionId,
      status,
    }),
  );

  dispatch(
    setExecutionLogs({
      assetName: digitalTwin.DTName,
      executionId,
      jobLogs,
    }),
  );

  // Determine message severity based on status
  let severity: 'success' | 'warning' | 'error';
  if (status === 'completed') {
    severity = 'success';
  } else if (status === 'canceled') {
    severity = 'warning';
  } else {
    severity = 'error';
  }

  // Show a completion notification
  dispatch(
    showSnackbar({
      message: `Execution ${status} for ${formatName(digitalTwin.DTName)} (ID: ${executionId.substring(0, 8)})`,
      severity,
    }),
  );
};

/**
 * Update pipeline state in Redux store when pipeline is completed
 */
export const updatePipelineStateOnCompletion = (
  digitalTwin: DigitalTwin,
  jobLogs: { jobName: string; log: string }[],
  dispatch: ReturnType<typeof useDispatch>,
  executionId?: string,
) => {
  // For backward compatibility and for the current execution
  // This updates the global state for the digital twin
  dispatch(setJobLogs({ assetName: digitalTwin.DTName, jobLogs }));

  // If we have an executionId and it matches the current one,
  // or if we don't have specific execution tracking,
  // update the global pipeline state
  if (!executionId || executionId === digitalTwin.currentExecutionId) {
    dispatch(
      setPipelineCompleted({
        assetName: digitalTwin.DTName,
        pipelineCompleted: true,
      }),
    );

    dispatch(
      setPipelineLoading({
        assetName: digitalTwin.DTName,
        pipelineLoading: false,
      }),
    );
  }
};
